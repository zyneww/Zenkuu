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
  MOVERS_PERIODS,
  MOVERS_UNIVERSES,
  CATEGORY_RANKING_FLOOR_USD,
  MOVERS_UNIVERSE_SIZE,
  SUPPORTED_CURRENCIES,
  getMoversUniverse,
  rankMovers,
  getExchangeRates,
  getAsset,
  getAssetHistory,
  getAssetTickers,
  getAssetOhlc,
  getCategories,
  getCategoryAssets,
  getCryptoGlobalStats,
  getCryptoOverview,
  getCryptoRanking,
  getForexRates,
  getNews,
  getNewListings,
  getPeers,
  getRanking,
  getSpotExchanges,
  getDerivatives,
  getSentiment,
  getSentimentHistory,
  getTopNarratives,
  getTrendingCrypto,
  getTrendingCryptoAssets,
} from './queries'
export type {
  CryptoOverview,
  DataResult,
  MoversPeriod,
  MoversUniverse,
  DataSource,
  ExchangeRates,
  RankingParams,
  SupportedCurrency,
} from './queries'

export {
  MIN_POINTS_FOR_CHART,
  getMarketCapSeries,
  getMarketCapSeriesState,
} from './market-cap-series'
export type { MarketCapPoint, MarketCapSeriesState } from './market-cap-series'

export { MIN_QUERY_LENGTH, searchAssets } from './search'
export type { SearchResponse } from './search'

export { YAHOO_UNIVERSE, findUniverseEntry, toSlug } from './providers/yahoo-universe'

export { NEWS_CATEGORY_LABELS } from './providers/news'
export type { NewsCategory } from './providers/news'

export { ASSET_CLASSES, ProviderError } from './types'
export type {
  AssetClass,
  AssetDetail,
  AssetTicker,
  Candle,
  GlobalMarketStats,
  ListAssetsParams,
  MarketAsset,
  MarketCategory,
  MarketDataProvider,
  NewListing,
  NewsItem,
  SpotExchange,
  OhlcHistory,
  PriceHistory,
  SearchResult,
  DerivativeMarket,
  SentimentIndex,
  SentimentPoint,
  SortDirection,
  SortField,
  TrendingAsset,
} from './types'
