'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

import {
  CODE_MAX_ATTEMPTS,
  DB_ENABLED,
  claimAnonymousData,
  consumeLoginCode,
  countRecentCodes,
  createSession,
  deleteAccount,
  deleteAccountSessions,
  deleteSession,
  hashToken,
  normalizeEmail,
  renameAccount,
  storeLoginCode,
  upsertAccount,
} from '@zenkuu/db'

import { MAILER_ENABLED, loginCodeEmail, sendMail } from '@/lib/mailer'
import {
  ACCOUNTS_ENABLED,
  IDENTITY_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  currentAccount,
  encodeIdentity,
} from '@/lib/session'
import { readVisitorId } from '@/lib/visitor'

/**
 * Connexion sans mot de passe — actions serveur.
 *
 * ── LE PARCOURS TIENT EN DEUX GESTES ──────────────────────────────────────────
 *
 *   1. On saisit une adresse. Un code à six chiffres part par courriel.
 *   2. On recopie le code. La session s'ouvre.
 *
 * Il n'y a pas d'étape « créer un compte » : la même adresse suit le même chemin
 * qu'elle soit connue ou non (voir `upsertAccount`). Deux formulaires distincts
 * obligeraient le visiteur à savoir lequel le concerne, et rendraient surtout
 * l'existence d'un compte observable depuis l'extérieur.
 *
 * ── CE QUI PROTÈGE CE PARCOURS ────────────────────────────────────────────────
 *
 * Trois mesures, et aucune n'est décorative :
 *
 *   · La RÉPONSE EST LA MÊME que l'adresse existe ou non. Sans cela, le formulaire
 *     devient un oracle qui dit qui est inscrit sur le site.
 *   · Le nombre de codes envoyés à une adresse est PLAFONNÉ par heure. C'est la boîte
 *     aux lettres du destinataire qu'on protège, pas notre crédit d'envoi.
 *   · Le nombre d'essais par code est plafonné, et le code brûle au-delà. Six chiffres
 *     font un million de combinaisons : sans ce compteur, elles se parcourent.
 */

export type AuthResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'unavailable'
        | 'invalid-email'
        | 'too-many'
        | 'send-failed'
        | 'code-missing'
        | 'code-expired'
        | 'code-exhausted'
        | 'code-wrong'
        | 'signed-out'
        | 'error'
      /** Essais restants — renseigné pour `code-wrong` seulement. */
      left?: number
    }

/** Même motif permissif que pour les alertes : on écarte l'absurde, on ne prouve rien. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

/** Validité d'un code. Assez pour aller chercher un courriel, trop court pour traîner. */
const CODE_TTL_MINUTES = 15

/** Codes envoyés à une même adresse par heure. */
const CODES_PER_HOUR = 5

/**
 * Code à six chiffres, tiré d'une source CRYPTOGRAPHIQUE.
 *
 * `Math.random()` serait ici une vraie faille et pas un détail de pureté : sa suite
 * est prédictible depuis quelques valeurs observées, et un attaquant qui demande deux
 * codes pour lui-même pourrait deviner celui d'un tiers.
 *
 * Le modulo introduit un biais négligeable et parfaitement borné : 2³² n'est pas
 * divisible par 10⁶, si bien que les 967 296 premières valeurs sortent une fois de
 * plus que les autres sur 4 295 tirages. L'écart est de l'ordre de 0,02 % — sans
 * portée face à un plafond de cinq essais.
 */
function makeCode(): string {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return String((buffer[0] ?? 0) % 1_000_000).padStart(6, '0')
}

/**
 * Étape 1 — envoi du code.
 *
 * Le résultat ne dit JAMAIS si l'adresse est connue. Il ne distingue que des pannes
 * de notre côté, que l'utilisateur peut comprendre et sur lesquelles il peut agir.
 */
export async function requestLoginCode(rawEmail: string): Promise<AuthResult> {
  if (!ACCOUNTS_ENABLED) return { ok: false, reason: 'unavailable' }

  const email = normalizeEmail(rawEmail)
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, reason: 'invalid-email' }

  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recent = await countRecentCodes(email, hourAgo)
    if (!recent.ok) return { ok: false, reason: 'unavailable' }
    if (recent.data >= CODES_PER_HOUR) return { ok: false, reason: 'too-many' }

    const code = makeCode()
    const stored = await storeLoginCode({
      email,
      codeHash: await hashToken(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    })
    if (!stored.ok) return { ok: false, reason: 'unavailable' }

    /* L'envoi vient APRÈS l'enregistrement. Dans l'autre ordre, un code peut arriver
       dans une boîte sans exister en base : l'utilisateur le recopie et se voit
       répondre qu'il est invalide, ce qui est la panne la plus déroutante possible. */
    const sent = await sendMail({
      to: email,
      ...loginCodeEmail({ code, minutes: CODE_TTL_MINUTES }),
    })
    if (!sent.ok) return { ok: false, reason: 'send-failed' }

    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Étape 2 — vérification du code et ouverture de la session.
 */
export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<AuthResult> {
  if (!ACCOUNTS_ENABLED) return { ok: false, reason: 'unavailable' }

  const email = normalizeEmail(rawEmail)
  if (!EMAIL.test(email)) return { ok: false, reason: 'invalid-email' }

  /* Les espaces et tirets que les gestionnaires de mot de passe insèrent parfois sont
     retirés avant comparaison : refuser « 123 456 » alors que le code est bon serait
     un échec incompréhensible pour celui qui le lit à l'écran. */
  const code = rawCode.replace(/[\s-]/g, '')
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'code-wrong', left: CODE_MAX_ATTEMPTS }

  try {
    const checked = await consumeLoginCode(email, await hashToken(code))
    if (!checked.ok) return { ok: false, reason: 'unavailable' }

    switch (checked.data.status) {
      case 'missing':
        return { ok: false, reason: 'code-missing' }
      case 'expired':
        return { ok: false, reason: 'code-expired' }
      case 'exhausted':
        return { ok: false, reason: 'code-exhausted' }
      case 'mismatch':
        return { ok: false, reason: 'code-wrong', left: checked.data.left }
      case 'ok':
        break
    }

    const account = await upsertAccount(email)
    if (!account.ok) return { ok: false, reason: 'unavailable' }

    /*
     * Ce que le visiteur avait rassemblé ANONYMEMENT le suit dans son compte.
     * L'échec de cette étape n'annule pas la connexion : la liste anonyme reste alors
     * accessible en se déconnectant, ce qui est récupérable, là où refuser la session
     * ne le serait pas.
     */
    const visitor = await readVisitorId()
    if (visitor) await claimAnonymousData(visitor, account.data.id)

    const token = crypto.randomUUID() + crypto.randomUUID()
    const opened = await createSession({
      tokenHash: await hashToken(token),
      accountId: account.data.id,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    })
    if (!opened.ok) return { ok: false, reason: 'unavailable' }

    const jar = await cookies()
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })

    /* Le cookie d'AFFICHAGE, lisible par la page — voir `IDENTITY_COOKIE`. Il ne
       porte aucun pouvoir : le fabriquer à la main ne fait qu'écrire un autre nom
       dans son propre en-tête, puisque toute lecture de données passe par le jeton
       `httpOnly` ci-dessus. */
    jar.set(IDENTITY_COOKIE, encodeIdentity(account.data.handle, account.data.email), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })

    /* La page entière est revalidée : l'en-tête, la liste de suivi et les alertes
       affichent tous quelque chose de différent une fois connecté. */
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export async function signOut(): Promise<AuthResult> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value

  /* Le cookie est effacé MÊME si la ligne de session est introuvable : sans cela, un
     jeton périmé resterait dans le navigateur et l'en-tête continuerait d'interroger
     la base à chaque page pour une réponse toujours nulle. */
  jar.delete(SESSION_COOKIE)
  jar.delete(IDENTITY_COOKIE)

  if (token && DB_ENABLED) {
    try {
      await deleteSession(await hashToken(token))
    } catch {
      // Le cookie est parti : la session est fermée du point de vue du visiteur. La
      // ligne résiduelle expirera d'elle-même, et la purge planifiée l'effacera.
    }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Ferme toutes les sessions du compte — utile après un poste partagé. */
export async function signOutEverywhere(): Promise<AuthResult> {
  const account = await currentAccount()
  if (!account) return { ok: false, reason: 'signed-out' }

  try {
    await deleteAccountSessions(account.id)
  } catch {
    return { ok: false, reason: 'error' }
  }

  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(IDENTITY_COOKIE)
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Longueur du pseudonyme — au-delà, l'en-tête et le menu tronquent. */
const HANDLE_MAX = 32

export async function updateHandle(raw: string): Promise<AuthResult> {
  const account = await currentAccount()
  if (!account) return { ok: false, reason: 'signed-out' }

  const handle = raw.trim().slice(0, HANDLE_MAX)
  if (handle === '') return { ok: false, reason: 'invalid-email' }

  try {
    const renamed = await renameAccount(account.id, handle)
    if (!renamed.ok) return { ok: false, reason: 'unavailable' }
  } catch {
    return { ok: false, reason: 'error' }
  }

  /* Le cookie d'affichage est RÉÉCRIT : c'est lui que l'en-tête lit, et l'oublier
     laisserait l'ancienne initiale dans l'avatar jusqu'à la prochaine connexion. */
  const jar = await cookies()
  jar.set(IDENTITY_COOKIE, encodeIdentity(handle, account.email), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })

  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * Suppression du compte et de tout ce qu'il contient.
 *
 * Irréversible et immédiate, sans période de grâce : ce que le site détient tient en
 * une adresse, un pseudonyme, une liste d'actifs et des seuils d'alerte. Conserver
 * trente jours « au cas où » des données que personne ne réclame serait moins
 * protecteur, pas plus.
 */
export async function deleteCurrentAccount(): Promise<AuthResult> {
  const account = await currentAccount()
  if (!account) return { ok: false, reason: 'signed-out' }

  try {
    const removed = await deleteAccount(account.id)
    if (!removed.ok) return { ok: false, reason: 'unavailable' }
  } catch {
    return { ok: false, reason: 'error' }
  }

  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(IDENTITY_COOKIE)
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Le service d'envoi manque-t-il ? Lu par l'interface pour expliquer une absence. */
export async function accountsAvailable(): Promise<{ db: boolean; mailer: boolean }> {
  return { db: DB_ENABLED, mailer: MAILER_ENABLED }
}
