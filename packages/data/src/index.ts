/**
 * @zenkuu/data — couche d'accès aux données de marché.
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
  CURRENCIES,
  CURRENCY_CODES,
  currencyDecimals,
  currencyName,
  currencySymbol,
  getCurrency,
  isSupportedCurrency,
} from './currencies'
export type { CurrencyGroup, CurrencyKind, CurrencyMeta } from './currencies'

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
  getAssetProfile,
  getForexRates,
  getMarketCapBasket,
  MARKET_CAP_BASKET,
  getNews,
  getNewListings,
  getNftCollections,
  getTreasuries,
  getPeers,
  getPool,
  getPoolsOnNetwork,
  getRanking,
  getTokenPools,
  getTrendingPools,
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
  MarketCapBasket,
  MarketCapBasketMember,
  MarketCapBasketPoint,
  MarketCapBucket,
  MoversPeriod,
  MoversUniverse,
  DataSource,
  ExchangeRates,
  RankingParams,
  RateOrigin,
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

export {
  YAHOO_UNIVERSE,
  findUniverseEntry,
  findUniverseEntryBySymbol,
  toSlug,
} from './providers/yahoo-universe'
export type { CommodityFamily, UniverseEntry } from './providers/yahoo-universe'

export { knownNetworks, networkFromPlatform } from './providers/geckoterminal'

export type { AssetProfile, FundHolding, SectorWeight } from './providers/yahoo-profile'

export { TREASURY_COINS, TRACKED_NFT_COLLECTIONS } from './providers/coingecko-extras'
export type { TreasuryCoin } from './providers/coingecko-extras'

export { NEWS_CATEGORY_LABELS, NEWS_LANG_LABELS } from './providers/news'
export type { NewsCategory, NewsLang } from './providers/news'

export { ASSET_CLASSES, ProviderError } from './types'
export type {
  AssetClass,
  AssetDetail,
  AssetTicker,
  Candle,
  DexPool,
  GlobalMarketStats,
  ListAssetsParams,
  MarketAsset,
  MarketCategory,
  MarketDataProvider,
  NewListing,
  NewsItem,
  NftCollection,
  TreasuryHolder,
  TreasuryReport,
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
