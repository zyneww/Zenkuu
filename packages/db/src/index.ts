/**
 * @zenith/db — persistance relationnelle (Turso / libSQL + Drizzle).
 *
 * Comme pour `@zenith/data`, les applications n'importent QUE depuis ce point
 * d'entrée : un changement d'hébergeur de base reste ainsi confiné à ce paquet (§4).
 */

export { DB_ENABLED, dbUnavailableReason, getDb, schema } from './client'

export {
  addToWatchlist,
  isInWatchlist,
  listWatchlist,
  removeFromWatchlist,
} from './watchlist'
export type { WatchlistResult } from './watchlist'

export { userPreferences, watchlistItems } from './schema'
export type { NewWatchlistItem, UserPreferences, WatchlistItem } from './schema'
