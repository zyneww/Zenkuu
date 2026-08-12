import { and, count, desc, eq, max, sql } from 'drizzle-orm'

import { getDb } from './client'
import { watchlistItems, type NewWatchlistItem, type WatchlistItem } from './schema'

/**
 * Opérations de watchlist.
 *
 * Chaque fonction renvoie un résultat qui distingue explicitement « la base n'est
 * pas configurée » d'une liste vide. Confondre les deux afficherait « aucun actif
 * suivi » à un utilisateur dont la liste existe peut-être mais est inaccessible —
 * un mensonge par omission que le §5 interdit au même titre qu'un chiffre inventé.
 *
 * ── LISTES MULTIPLES ──────────────────────────────────────────────────────────
 *
 * Une liste n'existe pas en tant qu'objet : elle est l'ensemble des lignes qui
 * portent le même `listName`. Conséquence directe et voulue — une liste vidée de
 * tous ses actifs DISPARAÎT. C'est cohérent avec ce qu'elle est (une étiquette) et
 * cela évite la corbeille de listes vides que produit le modèle inverse.
 */
export type WatchlistResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string }

const UNAVAILABLE = 'Base de données non configurée'

/**
 * Nom de la liste par défaut.
 *
 * Il doit correspondre au `default()` de la colonne dans `schema.ts` : les lignes
 * insérées avant l'arrivée des listes multiples portent cette valeur, et une
 * divergence les rendrait invisibles dans l'interface sans qu'aucune requête échoue.
 */
export const DEFAULT_WATCHLIST = 'Ma liste'

/** Longueur maximale d'un nom de liste — le champ de saisie applique la même borne. */
export const WATCHLIST_NAME_MAX = 40

/**
 * Normalise un nom de liste saisi par l'utilisateur.
 *
 * Les espaces de tête et de queue sont retirés, et un nom vide retombe sur la liste
 * par défaut. Sans cette normalisation, « Crypto » et « Crypto » (avec une espace
 * finale) seraient deux listes distinctes à l'écran — un défaut que l'utilisateur
 * ne peut ni voir ni corriger.
 */
export function normalizeListName(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().slice(0, WATCHLIST_NAME_MAX)
  return trimmed === '' ? DEFAULT_WATCHLIST : trimmed
}

export interface WatchlistSummary {
  name: string
  items: number
  /** Date d'ajout la plus récente — sert à ordonner les listes par activité. */
  updatedAt: Date | null
}

/**
 * Contenu d'une liste, ou de TOUTES les listes si `listName` est omis.
 *
 * L'omission n'est pas un raccourci de confort : la page de suivi affiche l'ensemble
 * groupé, et le contrôle du plafond gratuit compte l'ensemble. Les faire passer par
 * autant de requêtes qu'il y a de listes n'apporterait rien.
 */
export async function listWatchlist(
  userId: string,
  listName?: string,
): Promise<WatchlistResult<WatchlistItem[]>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const scope = listName
    ? and(eq(watchlistItems.userId, userId), eq(watchlistItems.listName, listName))
    : eq(watchlistItems.userId, userId)

  const rows = await db
    .select()
    .from(watchlistItems)
    .where(scope)
    .orderBy(desc(watchlistItems.createdAt))

  return { ok: true, data: rows }
}

/**
 * Les listes d'un utilisateur, avec leur taille.
 *
 * Agrégation faite en BASE et non en JavaScript. La différence compte dès qu'une
 * liste dépasse quelques dizaines de lignes : compter côté application impose de
 * rapatrier chaque ligne pour n'en garder que le nombre.
 */
export async function listWatchlistNames(
  userId: string,
): Promise<WatchlistResult<WatchlistSummary[]>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select({
      name: watchlistItems.listName,
      items: count(watchlistItems.id),
      updatedAt: max(watchlistItems.createdAt),
    })
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, userId))
    .groupBy(watchlistItems.listName)
    .orderBy(desc(max(watchlistItems.createdAt)))

  return {
    ok: true,
    data: rows.map((row) => ({
      name: row.name,
      items: Number(row.items),
      // `max()` sur une colonne d'horodatage revient en nombre brut : Drizzle
      // n'applique son mode `timestamp` qu'aux colonnes lues directement.
      updatedAt: row.updatedAt ? new Date(Number(row.updatedAt) * 1000) : null,
    })),
  }
}

/** Nombre total d'actifs suivis, toutes listes confondues — sert au plafond gratuit. */
export async function countWatchlist(userId: string): Promise<WatchlistResult<number>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select({ total: count(watchlistItems.id) })
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, userId))

  return { ok: true, data: Number(rows[0]?.total ?? 0) }
}

export async function addToWatchlist(
  item: NewWatchlistItem,
): Promise<WatchlistResult<{ added: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  // `onConflictDoNothing` s'appuie sur l'index unique du schéma : un double clic sur
  // « suivre » est absorbé par la base au lieu de lever une erreur de contrainte que
  // l'interface devrait rattraper.
  const inserted = await db
    .insert(watchlistItems)
    .values({ ...item, listName: normalizeListName(item.listName) })
    .onConflictDoNothing()
    .returning({ id: watchlistItems.id })

  return { ok: true, data: { added: inserted.length > 0 } }
}

export async function removeFromWatchlist(
  userId: string,
  assetClass: string,
  assetId: string,
  listName?: string,
): Promise<WatchlistResult<{ removed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  // Sans nom de liste, l'actif est retiré de TOUTES les listes. C'est le
  // comportement attendu de l'étoile d'un tableau, qui ne sait pas dans laquelle il
  // se trouve — et le seul qui garantisse que l'étoile s'éteigne vraiment.
  const deleted = await db
    .delete(watchlistItems)
    .where(
      and(
        eq(watchlistItems.userId, userId),
        eq(watchlistItems.assetClass, assetClass),
        eq(watchlistItems.assetId, assetId),
        ...(listName ? [eq(watchlistItems.listName, listName)] : []),
      ),
    )
    .returning({ id: watchlistItems.id })

  return { ok: true, data: { removed: deleted.length > 0 } }
}

/** L'actif est-il suivi ? Dans la liste indiquée, ou dans n'importe laquelle. */
export async function isInWatchlist(
  userId: string,
  assetClass: string,
  assetId: string,
  listName?: string,
): Promise<boolean> {
  const db = getDb()
  if (!db) return false

  const rows = await db
    .select({ id: watchlistItems.id })
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.userId, userId),
        eq(watchlistItems.assetClass, assetClass),
        eq(watchlistItems.assetId, assetId),
        ...(listName ? [eq(watchlistItems.listName, listName)] : []),
      ),
    )
    .limit(1)

  return rows.length > 0
}

/**
 * Renomme une liste.
 *
 * UPDATE de masse assumé (cf. le commentaire du schéma). Le conflit possible — la
 * cible existe déjà et contient les mêmes actifs — est traité comme une FUSION :
 * les doublons sont écartés avant le renommage, ce qui évite de violer l'index
 * unique et donne le résultat qu'attend l'utilisateur (une seule liste, sans
 * doublon) plutôt qu'une erreur qu'il ne saurait pas résoudre.
 */
export async function renameWatchlist(
  userId: string,
  from: string,
  to: string,
): Promise<WatchlistResult<{ moved: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const target = normalizeListName(to)
  if (target === from) return { ok: true, data: { moved: 0 } }

  await db.delete(watchlistItems).where(
    and(
      eq(watchlistItems.userId, userId),
      eq(watchlistItems.listName, from),
      sql`(${watchlistItems.assetClass}, ${watchlistItems.assetId}) IN (
        SELECT asset_class, asset_id FROM watchlist_items
        WHERE user_id = ${userId} AND list_name = ${target}
      )`,
    ),
  )

  const moved = await db
    .update(watchlistItems)
    .set({ listName: target })
    .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.listName, from)))
    .returning({ id: watchlistItems.id })

  return { ok: true, data: { moved: moved.length } }
}

/** Supprime une liste entière — c'est-à-dire toutes les lignes qui la composent. */
export async function deleteWatchlist(
  userId: string,
  listName: string,
): Promise<WatchlistResult<{ removed: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const deleted = await db
    .delete(watchlistItems)
    .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.listName, listName)))
    .returning({ id: watchlistItems.id })

  return { ok: true, data: { removed: deleted.length } }
}
