/**
 * @zenith/data — couche d'accès aux données de marché.
 *
 * Les pages n'importent QUE depuis ce point d'entrée. Aucun composant ne doit
 * importer un module `providers/*` directement : c'est ce qui garantit qu'un
 * changement de fournisseur reste confiné à `packages/data` (§4).
 */

export { CACHE_TTL_SECONDS, cache, cached, createMemoryCache } from './cache'
export type { CacheStore } from './cache'

export { getAvailability, getDeclaredProvider, getProvider } from './registry'
export type { AssetClassAvailability } from './registry'

export {
  MOVERS_UNIVERSE_SIZE,
  getAsset,
  getAssetHistory,
  getCategories,
  getCryptoGlobalStats,
  getCryptoOverview,
  getCryptoRanking,
  getForexRates,
  getNews,
  getPeers,
  getRanking,
  getSentiment,
  getTopNarratives,
  getTrendingCrypto,
} from './queries'
export type {
  CryptoOverview,
  DataResult,
  DataSource,
  RankingParams,
} from './queries'

export { YAHOO_UNIVERSE, findUniverseEntry, toSlug } from './providers/yahoo-universe'

export { ASSET_CLASSES, ProviderError } from './types'
export type {
  AssetClass,
  AssetDetail,
  GlobalMarketStats,
  ListAssetsParams,
  MarketAsset,
  MarketCategory,
  MarketDataProvider,
  NewsItem,
  PriceHistory,
  SentimentIndex,
  SortDirection,
  SortField,
  TrendingAsset,
} from './types'
