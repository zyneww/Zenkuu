import { and, eq, gt, lt, sql } from 'drizzle-orm'

import { getDb } from './client'
import { accounts, loginCodes, savedScreens, sessions, watchlistItems } from './schema'
import type { Account } from './schema'
import type { WatchlistResult } from './watchlist'

/**
 * Comptes, codes de connexion et sessions — accès base.
 *
 * ── CE FICHIER REMPLACE UN FOURNISSEUR TIERS ──────────────────────────────────
 *
 * L'identité du site était déléguée. Elle est désormais tenue ici, et le périmètre
 * est volontairement minuscule : une adresse, un pseudonyme, un code à usage unique,
 * une session. Pas de mot de passe, pas de connexion par réseau social, pas de
 * réinitialisation — il n'y a rien à réinitialiser.
 *
 * Le type de résultat est celui de la liste de suivi : les deux distinguent « base
 * non configurée » d'un ensemble vide, et inventer un second type pour la même
 * distinction obligerait chaque appelant à traiter deux formes du même cas.
 */

const UNAVAILABLE = 'Base de données non configurée'

/**
 * Condensat SHA-256 en hexadécimal.
 *
 * `crypto.subtle` et non un module Node : ce code s'exécute aussi bien dans un
 * environnement d'exécution périphérique que sur Node, et l'API Web est la seule
 * disponible des deux côtés.
 */
export async function hashToken(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Normalisation d'adresse — la casse ne distingue pas deux comptes. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/* ── Comptes ──────────────────────────────────────────────────────────────── */

export async function findAccountByEmail(email: string): Promise<WatchlistResult<Account | null>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, normalizeEmail(email)))
    .limit(1)

  return { ok: true, data: rows[0] ?? null }
}

export async function findAccountById(id: string): Promise<WatchlistResult<Account | null>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
  return { ok: true, data: rows[0] ?? null }
}

/**
 * Trouve le compte de cette adresse, ou le crée.
 *
 * ── IL N'Y A PAS D'ÉTAPE D'INSCRIPTION, ET C'EST DÉLIBÉRÉ ─────────────────────
 *
 * Deux formulaires — « se connecter » et « créer un compte » — obligent le visiteur à
 * savoir lequel le concerne, alors que le site le sait déjà. Pire : ils rendent
 * l'existence d'un compte OBSERVABLE, puisque l'un des deux échoue. Ici, la même
 * adresse suit le même chemin qu'elle soit connue ou non, et le code par courriel
 * fait office de vérification dans les deux cas.
 */
export async function upsertAccount(
  email: string,
  now: Date = new Date(),
): Promise<WatchlistResult<Account>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const normalized = normalizeEmail(email)

  const existing = await db.select().from(accounts).where(eq(accounts.email, normalized)).limit(1)
  const found = existing[0]
  if (found) {
    await db.update(accounts).set({ lastSeenAt: now }).where(eq(accounts.id, found.id))
    return { ok: true, data: { ...found, lastSeenAt: now } }
  }

  const created: Account = {
    id: crypto.randomUUID(),
    email: normalized,
    handle: defaultHandle(normalized),
    /* ⚠️ UN COMPTE NAÎT SANS MOT DE PASSE, ET C'EST L'ÉTAT NORMAL. Cette fonction sert
       le parcours par CODE : l'adresse suffit à créer le compte. Le mot de passe est
       posé plus tard, depuis les réglages, par qui le veut. Le mettre ici obligerait à
       en demander un pour recevoir un code, ce qui ferait de l'inscription un
       formulaire là où c'est aujourd'hui une adresse. */
    passwordHash: null,
    passwordAttempts: 0,
    passwordLockedUntil: null,
    createdAt: now,
    lastSeenAt: now,
  }

  await db.insert(accounts).values(created)
  return { ok: true, data: created }
}

/**
 * Pseudonyme proposé au premier accès : la partie locale de l'adresse, nettoyée.
 *
 * `marie.dupont+zenkuu@…` donne « marie.dupont ». L'étiquette après `+` est retirée :
 * c'est un artefact de filtrage de boîte aux lettres, pas un nom que quiconque
 * souhaite voir affiché.
 */
function defaultHandle(email: string): string {
  const local = email.split('@')[0] ?? 'zenkuu'
  const cleaned = local.split('+')[0] ?? local
  return cleaned.slice(0, 32) || 'zenkuu'
}

export async function renameAccount(
  id: string,
  handle: string,
): Promise<WatchlistResult<{ renamed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const updated = await db
    .update(accounts)
    .set({ handle })
    .where(eq(accounts.id, id))
    .returning({ id: accounts.id })

  return { ok: true, data: { renamed: updated.length > 0 } }
}

/**
 * Suppression d'un compte ET de tout ce qui s'y rattache.
 *
 * L'ordre importe : les données d'abord, le compte ensuite. Interrompue au milieu, la
 * séquence laisse un compte vide — état réparable d'un second appel — plutôt que des
 * lignes orphelines rattachées à un identifiant qui n'existe plus, invisibles et
 * inaccessibles pour toujours.
 */
export async function deleteAccount(id: string): Promise<WatchlistResult<{ removed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  await db.delete(watchlistItems).where(eq(watchlistItems.userId, id))
  await db.delete(savedScreens).where(eq(savedScreens.userId, id))
  await db.delete(sessions).where(eq(sessions.accountId, id))

  const removed = await db.delete(accounts).where(eq(accounts.id, id)).returning({ id: accounts.id })

  return { ok: true, data: { removed: removed.length > 0 } }
}

/**
 * Rattache au compte les données créées ANONYMEMENT sur cet appareil.
 *
 * ── POURQUOI CETTE FONCTION EXISTE ────────────────────────────────────────────
 *
 * Le site laisse suivre des actifs et enregistrer des écrans SANS compte : un cookie
 * anonyme suffit (`apps/web/lib/visitor.ts`). Se connecter ensuite ferait
 * disparaître tout ce travail sous les yeux du visiteur, puisque la clé de rangement
 * change. C'est le défaut classique des sites qui ajoutent un compte après coup, et
 * il est vécu comme une perte de données — ce qu'il est.
 *
 * On réécrit donc la colonne. Les écrans sont repris tels quels ; la liste de suivi
 * demande une précaution particulière, décrite plus bas.
 *
 * ⚠️ CETTE FONCTION A TRANSFÉRÉ DES ALERTES DE PRIX, ET C'EST CE QU'ELLE COMPTAIT.
 * Le compteur `moved` valait le nombre d'alertes reprises ; les alertes ayant été
 * supprimées du produit, il compte désormais les LIGNES DE SUIVI transférées — la seule
 * donnée anonyme dont la reprise soit visible pour le visiteur.
 */
export async function claimAnonymousData(
  visitorId: string,
  accountId: string,
): Promise<WatchlistResult<{ moved: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }
  if (visitorId === accountId) return { ok: true, data: { moved: 0 } }

  /*
   * ⚠️ La liste de suivi porte une contrainte d'unicité sur
   * (user_id, list_name, asset_class, asset_id). Un visiteur qui suivait le bitcoin
   * anonymement ET depuis son compte violerait cette contrainte au moment du
   * transfert, et la requête entière échouerait — emportant les alertes avec elle.
   *
   * `OR IGNORE` laisse simplement tomber les lignes en double : l'actif est déjà
   * suivi côté compte, la ligne anonyme n'apporte rien. Les orphelines sont
   * supprimées juste après.
   */
  /* Comptées AVANT le transfert : une fois la colonne réécrite, plus rien ne
     distingue ces lignes de celles que le compte possédait déjà. */
  const claimed = await db
    .select({ id: watchlistItems.id })
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, visitorId))

  await db.run(
    sql`UPDATE OR IGNORE ${watchlistItems} SET ${sql.raw('user_id')} = ${accountId} WHERE ${sql.raw('user_id')} = ${visitorId}`,
  )
  await db.delete(watchlistItems).where(eq(watchlistItems.userId, visitorId))

  await db.run(
    sql`UPDATE OR IGNORE ${savedScreens} SET ${sql.raw('user_id')} = ${accountId} WHERE ${sql.raw('user_id')} = ${visitorId}`,
  )
  await db.delete(savedScreens).where(eq(savedScreens.userId, visitorId))

  return { ok: true, data: { moved: claimed.length } }
}

/* ── Codes de connexion ───────────────────────────────────────────────────── */

/**
 * Enregistre un code, après avoir effacé les précédents de la même adresse.
 *
 * Un seul code valide à la fois par adresse : demander un nouveau code doit invalider
 * l'ancien, sans quoi une salve de demandes multiplierait les clés ouvrant la même
 * porte.
 */
export async function storeLoginCode(input: {
  email: string
  codeHash: string
  expiresAt: Date
}): Promise<WatchlistResult<{ stored: true }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const email = normalizeEmail(input.email)

  await db.delete(loginCodes).where(eq(loginCodes.email, email))
  await db.insert(loginCodes).values({ email, codeHash: input.codeHash, expiresAt: input.expiresAt })

  return { ok: true, data: { stored: true } }
}

/**
 * Combien de codes ont été demandés pour cette adresse depuis `since` ?
 *
 * Sert le plafond d'envoi. Il porte sur l'ADRESSE et non sur l'adresse IP : c'est la
 * boîte aux lettres du destinataire qu'on protège du harcèlement, et elle ne dépend
 * pas de l'endroit d'où part la demande.
 */
export async function countRecentCodes(
  email: string,
  since: Date,
): Promise<WatchlistResult<number>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select({ id: loginCodes.id })
    .from(loginCodes)
    .where(and(eq(loginCodes.email, normalizeEmail(email)), gt(loginCodes.createdAt, since)))

  return { ok: true, data: rows.length }
}

export type CodeCheck =
  | { status: 'ok' }
  | { status: 'missing' }
  | { status: 'expired' }
  | { status: 'exhausted' }
  | { status: 'mismatch'; left: number }

/** Essais autorisés avant qu'un code ne soit brûlé. */
export const CODE_MAX_ATTEMPTS = 5

/**
 * Vérifie un code et le CONSOMME en cas de succès.
 *
 * Consommation immédiate et non différée : entre la vérification et la création de la
 * session, un second appel avec le même code réussirait aussi. La fenêtre est étroite
 * — quelques millisecondes — et sans intérêt pour un attaquant qui possède déjà le
 * code, mais la refermer ne coûte qu'une requête déjà nécessaire.
 */
export async function consumeLoginCode(
  email: string,
  codeHash: string,
  now: Date = new Date(),
): Promise<WatchlistResult<CodeCheck>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const normalized = normalizeEmail(email)
  const rows = await db.select().from(loginCodes).where(eq(loginCodes.email, normalized)).limit(1)
  const row = rows[0]

  if (!row) return { ok: true, data: { status: 'missing' } }

  if (row.expiresAt.getTime() <= now.getTime()) {
    await db.delete(loginCodes).where(eq(loginCodes.id, row.id))
    return { ok: true, data: { status: 'expired' } }
  }

  if (row.attempts >= CODE_MAX_ATTEMPTS) {
    await db.delete(loginCodes).where(eq(loginCodes.id, row.id))
    return { ok: true, data: { status: 'exhausted' } }
  }

  if (row.codeHash !== codeHash) {
    const attempts = row.attempts + 1
    await db.update(loginCodes).set({ attempts }).where(eq(loginCodes.id, row.id))
    return { ok: true, data: { status: 'mismatch', left: CODE_MAX_ATTEMPTS - attempts } }
  }

  await db.delete(loginCodes).where(eq(loginCodes.id, row.id))
  return { ok: true, data: { status: 'ok' } }
}

/* ── Mots de passe ────────────────────────────────────────────────────────── */

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PLAFOND D'ESSAIS, ET POURQUOI IL NE FERME PAS LE COMPTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Dix essais, puis quinze minutes de refus. Les deux valeurs sont un compromis, et
 * elles sont écrites ici plutôt que devinées à l'appel :
 *
 *   · DIX plutôt que trois. Une faute de frappe sur une phrase de passe longue est
 *     banale, et trois essais transforment une maladresse en incident. Dix laissent
 *     respirer sans rien offrir : à ce rythme, essayer un dictionnaire de mille mots
 *     demande vingt-cinq heures.
 *
 *   · QUINZE MINUTES plutôt qu'un verrou définitif. Un verrou qui ne se lève pas seul
 *     est un outil de nuisance : n'importe qui connaissant une adresse pourrait fermer
 *     ce compte à son titulaire en se trompant dix fois.
 *
 * ⚠️ LE VERROU NE FERME QUE LA PORTE DU MOT DE PASSE. La connexion par code à usage
 * unique reste ouverte pendant toute sa durée, et une connexion réussie par ce chemin
 * remet le compteur à zéro. Quelqu'un qui prouve son identité par courriel n'a pas à
 * rester puni des essais qu'un tiers a faits sur son compte.
 */
export const PASSWORD_MAX_ATTEMPTS = 10
export const PASSWORD_LOCK_MINUTES = 15

/** Pose ou remplace le condensat. Le compteur d'essais repart de zéro avec lui. */
export async function setAccountPassword(
  id: string,
  passwordHash: string,
): Promise<WatchlistResult<{ set: true }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  try {
    await db
      .update(accounts)
      .set({ passwordHash, passwordAttempts: 0, passwordLockedUntil: null })
      .where(eq(accounts.id, id))
    return { ok: true, data: { set: true } }
  } catch (error) {
    return { ok: false, reason: (error as Error).message }
  }
}

/** Retire le mot de passe. Le compte reste joignable par code — c'est le point. */
export async function clearAccountPassword(
  id: string,
): Promise<WatchlistResult<{ cleared: true }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  try {
    await db
      .update(accounts)
      .set({ passwordHash: null, passwordAttempts: 0, passwordLockedUntil: null })
      .where(eq(accounts.id, id))
    return { ok: true, data: { cleared: true } }
  } catch (error) {
    return { ok: false, reason: (error as Error).message }
  }
}

/**
 * Enregistre un essai infructueux, et pose le verrou au dixième.
 *
 * Rend le nombre d'essais RESTANTS, que l'appelant peut choisir de montrer ou non.
 * ⚠️ Il ne doit PAS l'être avant que le compte ne soit connu et le mot de passe posé :
 * un décompte affiché sur une adresse inconnue dirait qu'elle existe.
 */
export async function recordPasswordFailure(
  id: string,
  now: Date = new Date(),
): Promise<WatchlistResult<{ left: number; locked: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  try {
    const [row] = await db
      .select({ attempts: accounts.passwordAttempts })
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)

    const attempts = (row?.attempts ?? 0) + 1
    const locked = attempts >= PASSWORD_MAX_ATTEMPTS

    await db
      .update(accounts)
      .set({
        passwordAttempts: attempts,
        /* Le verrou est posé à l'instant du dixième essai, jamais avant : une date
           calculée d'avance se périmerait entre deux tentatives espacées. */
        passwordLockedUntil: locked
          ? new Date(now.getTime() + PASSWORD_LOCK_MINUTES * 60_000)
          : null,
      })
      .where(eq(accounts.id, id))

    return { ok: true, data: { left: Math.max(0, PASSWORD_MAX_ATTEMPTS - attempts), locked } }
  } catch (error) {
    return { ok: false, reason: (error as Error).message }
  }
}

/** Remet le compteur à zéro. Appelé par TOUTE connexion réussie, quel qu'en soit le chemin. */
export async function clearPasswordFailures(
  id: string,
): Promise<WatchlistResult<{ cleared: true }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  try {
    await db
      .update(accounts)
      .set({ passwordAttempts: 0, passwordLockedUntil: null })
      .where(eq(accounts.id, id))
    return { ok: true, data: { cleared: true } }
  } catch (error) {
    return { ok: false, reason: (error as Error).message }
  }
}

/* ── Sessions ─────────────────────────────────────────────────────────────── */

export async function createSession(input: {
  tokenHash: string
  accountId: string
  expiresAt: Date
}): Promise<WatchlistResult<{ created: true }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  await db.insert(sessions).values(input)
  return { ok: true, data: { created: true } }
}

/**
 * Compte rattaché à une session, ou `null`.
 *
 * Une jointure et non deux requêtes : c'est la lecture la plus fréquente du site
 * connecté — elle a lieu à chaque rendu de l'en-tête, c'est-à-dire sur chaque page.
 */
export async function findSessionAccount(
  tokenHash: string,
  now: Date = new Date(),
): Promise<WatchlistResult<Account | null>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select({ account: accounts })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1)

  return { ok: true, data: rows[0]?.account ?? null }
}

export async function deleteSession(tokenHash: string): Promise<WatchlistResult<{ closed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const closed = await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .returning({ tokenHash: sessions.tokenHash })

  return { ok: true, data: { closed: closed.length > 0 } }
}

/** Ferme TOUTES les sessions d'un compte — « se déconnecter partout ». */
export async function deleteAccountSessions(
  accountId: string,
): Promise<WatchlistResult<{ closed: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const closed = await db
    .delete(sessions)
    .where(eq(sessions.accountId, accountId))
    .returning({ tokenHash: sessions.tokenHash })

  return { ok: true, data: { closed: closed.length } }
}

/**
 * Ménage des sessions et des codes périmés.
 *
 * Appelé par la tâche planifiée. Sans lui, la table des sessions ne fait que croître :
 * une session expirée n'est plus lue par `findSessionAccount`, mais elle reste stockée
 * et facturée.
 */
export async function purgeExpiredAuth(
  now: Date = new Date(),
): Promise<WatchlistResult<{ sessions: number; codes: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const staleSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ tokenHash: sessions.tokenHash })

  const staleCodes = await db
    .delete(loginCodes)
    .where(lt(loginCodes.expiresAt, now))
    .returning({ id: loginCodes.id })

  return { ok: true, data: { sessions: staleSessions.length, codes: staleCodes.length } }
}
