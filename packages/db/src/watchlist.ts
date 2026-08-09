import { and, desc, eq } from 'drizzle-orm'

import { getDb } from './client'
import { watchlistItems, type NewWatchlistItem, type WatchlistItem } from './schema'

/**
 * Opérations de watchlist.
 *
 * Chaque fonction renvoie un résultat qui distingue explicitement « la base n'est
 * pas configurée » d'une liste vide. Confondre les deux afficherait « aucun actif
 * suivi » à un utilisateur dont la liste existe peut-être mais est inaccessible —
 * un mensonge par omission que le §5 interdit au même titre qu'un chiffre inventé.
 */
export type WatchlistResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string }

const UNAVAILABLE = 'Base de données non configurée'

export async function listWatchlist(userId: string): Promise<WatchlistResult<WatchlistItem[]>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, userId))
    .orderBy(desc(watchlistItems.createdAt))

  return { ok: true, data: rows }
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
    .values(item)
    .onConflictDoNothing()
    .returning({ id: watchlistItems.id })

  return { ok: true, data: { added: inserted.length > 0 } }
}

export async function removeFromWatchlist(
  userId: string,
  assetClass: string,
  assetId: string,
): Promise<WatchlistResult<{ removed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const deleted = await db
    .delete(watchlistItems)
    .where(
      and(
        eq(watchlistItems.userId, userId),
        eq(watchlistItems.assetClass, assetClass),
        eq(watchlistItems.assetId, assetId),
      ),
    )
    .returning({ id: watchlistItems.id })

  return { ok: true, data: { removed: deleted.length > 0 } }
}

export async function isInWatchlist(
  userId: string,
  assetClass: string,
  assetId: string,
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
      ),
    )
    .limit(1)

  return rows.length > 0
}
