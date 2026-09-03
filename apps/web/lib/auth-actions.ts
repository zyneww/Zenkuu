'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

import {
  CODE_MAX_ATTEMPTS,
  DB_ENABLED,
  claimAnonymousData,
  clearAccountPassword,
  clearPasswordFailures,
  consumeLoginCode,
  countRecentCodes,
  createSession,
  deleteAccount,
  deleteAccountSessions,
  deleteSession,
  findAccountByEmail,
  hashToken,
  normalizeEmail,
  recordPasswordFailure,
  renameAccount,
  setAccountPassword,
  storeLoginCode,
  upsertAccount,
} from '@zenkuu/db'

import { MAILER_ENABLED, loginCodeEmail, sendMail } from '@/lib/mailer'
import { hashPassword, judgePassword, needsRehash, verifyPassword } from '@/lib/password'
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
        /* ── Mot de passe ──────────────────────────────────────────────────
           ⚠️ `bad-credentials` NE DISTINGUE PAS « adresse inconnue » de « mot de
           passe faux », et surtout pas de « ce compte n'a pas de mot de passe ».
           Les trois répondent la même chose pour la raison écrite en tête : sans
           cela, le formulaire devient un oracle qui dit qui est inscrit ici. */
        | 'bad-credentials'
        | 'locked'
        | 'weak-password'
        | 'not-signed-in'
      /** Essais restants — renseigné pour `code-wrong` seulement. */
      left?: number
      /** Motif du refus de robustesse — renseigné pour `weak-password` seulement. */
      weakness?: 'trop-court' | 'trop-long' | 'trop-courant' | 'contient-adresse'
    }

/** Motif volontairement permissif : on écarte l'absurde, on ne prouve rien. */
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

    return await openSession(account.data)
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'OUVERTURE DE SESSION, EN UN SEUL ENDROIT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Ce bloc vivait DANS `verifyLoginCode`, seul chemin de connexion à l'époque. Il y en
 * a deux depuis que le mot de passe existe, et recopier ces quarante lignes aurait
 * garanti que les deux divergent — sur des sujets où diverger coûte cher : la durée du
 * cookie, son `httpOnly`, la reprise des données anonymes.
 *
 * ⚠️ TOUTE CONNEXION RÉUSSIE REMET LE COMPTEUR D'ESSAIS À ZÉRO, y compris celle par
 * code. C'est délibéré : quelqu'un qui prouve son identité par courriel n'a pas à
 * rester puni des essais qu'un tiers a faits sur son compte.
 */
async function openSession(account: { id: string; handle: string; email: string }): Promise<AuthResult> {
  /*
   * Ce que le visiteur avait rassemblé ANONYMEMENT le suit dans son compte.
   * L'échec de cette étape n'annule pas la connexion : la liste anonyme reste alors
   * accessible en se déconnectant, ce qui est récupérable, là où refuser la session
   * ne le serait pas.
   */
  const visitor = await readVisitorId()
  if (visitor) await claimAnonymousData(visitor, account.id)

  await clearPasswordFailures(account.id)

  const token = crypto.randomUUID() + crypto.randomUUID()
  const opened = await createSession({
    tokenHash: await hashToken(token),
    accountId: account.id,
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
  jar.set(IDENTITY_COOKIE, encodeIdentity(account.handle, account.email), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })

  /* La page entière est revalidée : l'en-tête, la liste de suivi et le tableau de bord
     affichent tous quelque chose de différent une fois connecté. */
  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CONNEXION PAR MOT DE PASSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── UN SEUL MOTIF D'ÉCHEC POUR TROIS CAUSES, ET C'EST LE POINT ─────────────
 *
 * `bad-credentials` couvre indistinctement :
 *
 *   · l'adresse est inconnue ;
 *   · l'adresse est connue mais n'a pas de mot de passe ;
 *   · l'adresse est connue, a un mot de passe, et ce n'est pas celui-là.
 *
 * Les distinguer donnerait à qui essaie une liste d'adresses inscrites sur le site,
 * et pire, la liste de celles qui n'ont pas encore de mot de passe — précisément les
 * comptes qu'il suffirait d'attaquer par le courriel. C'est la règle déjà tenue par
 * `requestLoginCode`, appliquée à l'autre porte.
 *
 * ⚠️ LE VERROU EST LE SEUL ÉTAT DISTINGUÉ, et il le faut : refuser sans le dire un
 * mot de passe correct pendant quinze minutes serait incompréhensible. Il ne révèle
 * rien de plus — pour l'atteindre, il a fallu dix essais sur cette adresse, donc
 * savoir déjà qu'on s'acharne dessus.
 *
 * ── LA DÉRIVATION A LIEU MÊME QUAND LE COMPTE N'EXISTE PAS ─────────────────
 *
 * Sans cela, une adresse inconnue répondrait en une milliseconde là où une adresse
 * connue demande la durée d'un PBKDF2 : la différence est mesurable au chronomètre et
 * rétablit exactement l'oracle qu'on vient d'éviter. On vérifie donc contre un
 * condensat FACTICE, dont le résultat est jeté.
 */
export async function signInWithPassword(
  rawEmail: string,
  password: string,
): Promise<AuthResult> {
  if (!ACCOUNTS_ENABLED) return { ok: false, reason: 'unavailable' }

  const email = normalizeEmail(rawEmail)
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, reason: 'invalid-email' }

  try {
    const found = await findAccountByEmail(email)
    if (!found.ok) return { ok: false, reason: 'unavailable' }
    const account = found.data

    if (!account || !account.passwordHash) {
      /* Voir la note : on paie le même temps que sur un compte réel. */
      await verifyPassword(password, LEURRE)
      return { ok: false, reason: 'bad-credentials' }
    }

    if (account.passwordLockedUntil && account.passwordLockedUntil > new Date()) {
      return { ok: false, reason: 'locked' }
    }

    if (!(await verifyPassword(password, account.passwordHash))) {
      const failure = await recordPasswordFailure(account.id)
      if (failure.ok && failure.data.locked) return { ok: false, reason: 'locked' }
      return { ok: false, reason: 'bad-credentials' }
    }

    /* Le rattrapage de dérivation : c'est le SEUL instant où le site détient le mot de
       passe en clair et peut donc le re-hacher au coût du jour. Sans lui, relever les
       itérations ne protégerait que les comptes créés ensuite. Son échec n'empêche pas
       la connexion — le condensat en place reste valide. */
    if (needsRehash(account.passwordHash)) {
      await setAccountPassword(account.id, await hashPassword(password))
    }

    return await openSession(account)
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Condensat FACTICE, dérivé d'une valeur qui n'est le mot de passe de personne.
 *
 * Il ne protège rien par lui-même : son unique rôle est de donner à `verifyPassword`
 * de quoi travailler le même temps que sur un vrai compte. Voir la note ci-dessus.
 */
const LEURRE =
  'pbkdf2$sha256$600000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

/**
 * Pose ou remplace le mot de passe du compte CONNECTÉ.
 *
 * ⚠️ IL N'Y A PAS DE PARCOURS « MOT DE PASSE OUBLIÉ » SÉPARÉ, ET C'EST DÉLIBÉRÉ. Le
 * site sait déjà prouver qu'on tient une adresse : le code à usage unique le fait.
 * « Oublié » renvoie donc à ce chemin — on se connecte par code, puis on pose un
 * nouveau mot de passe ici.
 *
 * Ce que cela évite : une seconde famille de jetons, sa table, sa durée de validité,
 * son gabarit de courriel, et le risque propre à tout lien de réinitialisation qui
 * traîne dans une boîte. Le code existant est plus court à vivre et déjà plafonné.
 */
export async function setOwnPassword(password: string): Promise<AuthResult> {
  if (!ACCOUNTS_ENABLED) return { ok: false, reason: 'unavailable' }

  const account = await currentAccount()
  if (!account) return { ok: false, reason: 'not-signed-in' }

  const verdict = judgePassword(password, account.email)
  if (!verdict.ok) return { ok: false, reason: 'weak-password', weakness: verdict.reason }

  try {
    const stored = await setAccountPassword(account.id, await hashPassword(password))
    if (!stored.ok) return { ok: false, reason: 'unavailable' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Retire le mot de passe du compte connecté.
 *
 * Le compte reste joignable par code — c'est ce qui rend ce geste sûr. Sans ce second
 * chemin, retirer son mot de passe reviendrait à se fermer la porte.
 */
export async function removeOwnPassword(): Promise<AuthResult> {
  if (!ACCOUNTS_ENABLED) return { ok: false, reason: 'unavailable' }

  const account = await currentAccount()
  if (!account) return { ok: false, reason: 'not-signed-in' }

  try {
    const cleared = await clearAccountPassword(account.id)
    return cleared.ok ? { ok: true } : { ok: false, reason: 'unavailable' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** Ce compte a-t-il un mot de passe ? Sert aux réglages, pour dire « poser » ou « changer ». */
export async function hasPassword(): Promise<boolean> {
  const account = await currentAccount()
  return Boolean(account?.passwordHash)
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
 * une adresse, un pseudonyme et une liste d'actifs suivis. Conserver
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
