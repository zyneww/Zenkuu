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

/*
 * ⚠️ LES ALERTES DE PRIX ONT ÉTÉ SUPPRIMÉES DU PRODUIT.
 *
 * Ce bloc exportait `createAlert`, `listArmedAlerts`, `markAlertsTriggered` et leurs
 * voisines, servies par `./alerts`. Le module, la table `price_alerts`, la page
 * `/alertes`, la tâche planifiée et le gabarit de courriel sont partis avec.
 *
 * Ce qui reste et n'a rien à voir : la LISTE DE SUIVI (`./watchlist`), qui répond à
 * « garde un œil sur cet actif » sans rien envoyer. Les deux étaient souvent cités
 * ensemble dans les textes du site ; seule la seconde existe encore.
 */

export { SCREEN_NAME_MAX, deleteScreen, listScreens, saveScreen } from './screens'

export {
  CODE_MAX_ATTEMPTS,
  claimAnonymousData,
  consumeLoginCode,
  countRecentCodes,
  createSession,
  deleteAccount,
  deleteAccountSessions,
  deleteSession,
  findAccountById,
  findAccountByEmail,
  findSessionAccount,
  hashToken,
  normalizeEmail,
  purgeExpiredAuth,
  renameAccount,
  storeLoginCode,
  upsertAccount,
} from './accounts'
export type { CodeCheck } from './accounts'

export {
  NEWS_RETENTION_DAYS,
  archiveNews,
  canonicalUrl,
  listNewsBetween,
  newsArchiveReady,
  oldestNewsDate,
  purgeOldNews,
} from './news'

export {
  accounts,
  loginCodes,
  newsArticles,
  savedScreens,
  sessions,
  userPreferences,
  watchlistItems,
} from './schema'
export type {
  Account,
  LoginCode,
  NewAccount,
  NewNewsArticle,
  NewSavedScreen,
  NewWatchlistItem,
  NewsArticle,
  SavedScreen,
  Session,
  UserPreferences,
  WatchlistItem,
} from './schema'
