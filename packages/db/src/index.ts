/**
 * @zenkuu/db — persistance relationnelle (Turso / libSQL + Drizzle).
 *
 * Comme pour `@zenkuu/data`, les applications n'importent QUE depuis ce point
 * d'entrée : un changement d'hébergeur de base reste ainsi confiné à ce paquet (§4).
 */

export { DB_ENABLED, dbUnavailableReason, getDb, schema } from './client'

export {
  DEFAULT_WATCHLIST,
  WATCHLIST_NAME_MAX,
  addToWatchlist,
  countWatchlist,
  deleteWatchlist,
  isInWatchlist,
  listWatchlist,
  listWatchlistNames,
  normalizeListName,
  removeFromWatchlist,
  renameWatchlist,
} from './watchlist'
export type { WatchlistResult, WatchlistSummary } from './watchlist'

export {
  countActiveAlerts,
  createAlert,
  deleteAlert,
  isAlertDirection,
  listAlerts,
  listArmedAlerts,
  markAlertsTriggered,
  rearmAlert,
} from './alerts'
export type { AlertDirection } from './alerts'

export { SCREEN_NAME_MAX, deleteScreen, listScreens, saveScreen } from './screens'

export {
  NEWS_RETENTION_DAYS,
  archiveNews,
  canonicalUrl,
  listNewsBetween,
  newsArchiveReady,
  oldestNewsDate,
  purgeOldNews,
} from './news'

export { newsArticles, priceAlerts, savedScreens, userPreferences, watchlistItems } from './schema'
export type {
  NewNewsArticle,
  NewPriceAlert,
  NewSavedScreen,
  NewWatchlistItem,
  NewsArticle,
  PriceAlert,
  SavedScreen,
  UserPreferences,
  WatchlistItem,
} from './schema'
