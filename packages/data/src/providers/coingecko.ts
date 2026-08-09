/**
 * Adaptateur CoinGecko — crypto (§5, source de vérité).
 *
 * L'API publique répond sans clé, avec un quota serré. `COINGECKO_API_KEY` est donc
 * OPTIONNELLE : présente, elle part en en-tête et relève le quota ; absente, l'appel
 * fonctionne quand même. C'est la raison pour laquelle `isConfigured()` renvoie
 * toujours `true` ici, contrairement aux fournisseurs qui exigent une clé.
 */

import { createHttpClient } from '../http'
import type {
  AssetDetail,
  GlobalMarketStats,
  ListAssetsParams,
  MarketAsset,
  MarketCategory,
  MarketDataProvider,
  OhlcHistory,
  PriceHistory,
  SearchResult,
  TrendingAsset,
} from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'coingecko'
const DEFAULT_CURRENCY = 'eur'

const apiKey = process.env.COINGECKO_API_KEY?.trim()

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.coingecko.com/api/v3',
  // Budget MESURÉ, pas estimé : une salve de 40 requêtes sur `/ping` sans clé passe
  // 5 fois puis se fait refuser (429) dès la sixième. Le palier sans clé est donc
  // beaucoup plus serré que ne le laisse entendre la documentation du palier Demo
  // (30/min). On se cale sur cette observation.
  //
  // La conséquence pratique compte plus que le chiffre : c'est le NOMBRE D'APPELS
  // PAR PAGE qu'il faut tenir bas, pas la fenêtre qu'il faut ouvrir. Élargir le
  // quota au-delà de ce que la source accepte ne fait que déplacer l'attente vers
  // des 429 et des reprises. L'accueil est donc construit pour tenir en 6 appels.
  //
  // Avec une clé Demo (gratuite), le plafond documenté monte à 30/min : on s'y cale
  // avec une marge, ce qui rend confortable l'indexation de milliers de fiches (§9).
  maxRequestsPerWindow: apiKey ? 25 : 8,
  minIntervalMs: apiKey ? 150 : 400,
  headers: apiKey ? { 'x-cg-demo-api-key': apiKey } : {},
})

/** Réponse brute de `/coins/markets` — telle que renvoyée par l'API. */
interface CoinGeckoMarket {
  id: string
  symbol: string
  name: string
  image: string | null
  current_price: number | null
  market_cap: number | null
  market_cap_rank: number | null
  total_volume: number | null
  price_change_percentage_1h_in_currency?: number | null
  price_change_percentage_24h_in_currency?: number | null
  price_change_percentage_7d_in_currency?: number | null
  price_change_percentage_14d_in_currency?: number | null
  price_change_percentage_30d_in_currency?: number | null
  price_change_percentage_1y_in_currency?: number | null
  price_change_percentage_24h?: number | null
  circulating_supply: number | null
  total_supply: number | null
  max_supply: number | null
  ath: number | null
  ath_date: string | null
  atl: number | null
  atl_date: string | null
  last_updated: string | null
  sparkline_in_7d?: { price: number[] } | null
}

interface CoinGeckoGlobal {
  data: {
    active_cryptocurrencies: number
    total_market_cap: Record<string, number>
    total_volume: Record<string, number>
    market_cap_percentage: Record<string, number>
    market_cap_change_percentage_24h_usd: number
    updated_at: number
  }
}

interface CoinGeckoTrending {
  coins: {
    item: {
      id: string
      symbol?: string
      name: string
      thumb?: string
      small?: string
      market_cap_rank?: number
      /** Variation publiée par devise — c'est ce qui rend le second appel inutile. */
      data?: { price_change_percentage_24h?: Record<string, number> }
    }
  }[]
}

/** Réponse de `/coins/{id}` — seuls les champs réellement consommés sont typés. */
interface CoinGeckoCoin {
  id: string
  symbol: string
  name: string
  image?: { large?: string }
  description?: { fr?: string; en?: string }
  links?: { homepage?: string[] }
  categories?: (string | null)[]
  market_cap_rank?: number | null
  market_data?: {
    current_price?: Record<string, number>
    market_cap?: Record<string, number>
    total_volume?: Record<string, number>
    high_24h?: Record<string, number>
    low_24h?: Record<string, number>
    price_change_percentage_24h?: number | null
    price_change_percentage_7d?: number | null
    circulating_supply?: number | null
    total_supply?: number | null
    max_supply?: number | null
    ath?: Record<string, number>
    ath_date?: Record<string, string>
    atl?: Record<string, number>
    atl_date?: Record<string, string>
    last_updated?: string
  }
}

interface CoinGeckoSearch {
  coins?: {
    id: string
    name: string
    symbol?: string
    market_cap_rank?: number | null
    thumb?: string
    large?: string
  }[]
}

interface CoinGeckoCategory {
  id: string
  name: string
  market_cap?: number | null
  market_cap_change_24h?: number | null
  volume_24h?: number | null
  top_3_coins?: string[]
}

/** `null` et `undefined` restent absents : le §5 interdit de les remplacer par 0. */
function optional(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function toMarketAsset(raw: CoinGeckoMarket, currency: string): MarketAsset {
  const price = optional(raw.current_price)
  if (price === undefined) {
    throw new ProviderError(PROVIDER_ID, `Prix absent pour « ${raw.id} »`)
  }

  const asset: MarketAsset = {
    id: raw.id,
    symbol: raw.symbol.toUpperCase(),
    name: raw.name,
    assetClass: 'crypto',
    price,
    currency: currency.toUpperCase(),
    lastUpdated: raw.last_updated ?? new Date().toISOString(),
  }

  if (raw.image) asset.image = raw.image

  const marketCap = optional(raw.market_cap)
  if (marketCap !== undefined) asset.marketCap = marketCap

  const volume = optional(raw.total_volume)
  if (volume !== undefined) asset.volume24h = volume

  const change1h = optional(raw.price_change_percentage_1h_in_currency)
  if (change1h !== undefined) asset.change1h = change1h

  const change24h = optional(
    raw.price_change_percentage_24h_in_currency ?? raw.price_change_percentage_24h,
  )
  if (change24h !== undefined) asset.change24h = change24h

  const change7d = optional(raw.price_change_percentage_7d_in_currency)
  if (change7d !== undefined) asset.change7d = change7d

  const change14d = optional(raw.price_change_percentage_14d_in_currency)
  if (change14d !== undefined) asset.change14d = change14d

  const change30d = optional(raw.price_change_percentage_30d_in_currency)
  if (change30d !== undefined) asset.change30d = change30d

  const change1y = optional(raw.price_change_percentage_1y_in_currency)
  if (change1y !== undefined) asset.change1y = change1y

  const sparkline = raw.sparkline_in_7d?.price
  if (Array.isArray(sparkline) && sparkline.length > 1) asset.sparkline7d = sparkline

  const circulating = optional(raw.circulating_supply)
  if (circulating !== undefined) asset.circulatingSupply = circulating

  const total = optional(raw.total_supply)
  if (total !== undefined) asset.totalSupply = total

  const max = optional(raw.max_supply)
  if (max !== undefined) asset.maxSupply = max

  const ath = optional(raw.ath)
  if (ath !== undefined) asset.ath = ath
  if (raw.ath_date) asset.athDate = raw.ath_date

  const atl = optional(raw.atl)
  if (atl !== undefined) asset.atl = atl
  if (raw.atl_date) asset.atlDate = raw.atl_date

  const rank = optional(raw.market_cap_rank)
  if (rank !== undefined) asset.rank = rank

  return asset
}

/**
 * Tris réellement supportés côté serveur par CoinGecko.
 *
 * Volontairement limité : trier une page de 50 lignes sur la variation 24 h ne
 * trierait que ces 50 lignes tout en ayant l'air d'un classement global. Les
 * colonnes de variation sont donc affichées mais non triables, et les plus fortes
 * hausses/baisses sont calculées explicitement sur un univers annoncé
 * (cf. `getTopMovers`).
 */
const SORT_MAP = {
  marketCap: { desc: 'market_cap_desc', asc: 'market_cap_asc' },
  volume24h: { desc: 'volume_desc', asc: 'volume_asc' },
} as const

export type SupportedSortField = keyof typeof SORT_MAP

export function isSupportedSort(field: string): field is SupportedSortField {
  return field in SORT_MAP
}

export const coinGeckoProvider: MarketDataProvider = {
  id: PROVIDER_ID,
  label: 'CoinGecko',
  assetClasses: ['crypto'],
  attributionUrl: 'https://www.coingecko.com',

  isConfigured: () => true,
  unavailableReason: () => null,

  async listAssets(params: ListAssetsParams = {}): Promise<MarketAsset[]> {
    const currency = (params.currency ?? DEFAULT_CURRENCY).toLowerCase()
    const sortField: SupportedSortField = isSupportedSort(params.sortBy ?? '')
      ? (params.sortBy as SupportedSortField)
      : 'marketCap'
    const direction = params.sortDirection === 'asc' ? 'asc' : 'desc'

    // Filtrage par identifiants : l'endpoint accepte une liste séparée par des
    // virgules. On la borne à 250 comme `per_page`, la limite de la source.
    const ids = params.ids?.slice(0, 250) ?? []

    const rows = await http.getJson<CoinGeckoMarket[]>('coins/markets', {
      vs_currency: currency,
      order: SORT_MAP[sortField][direction],
      // Une liste d'identifiants fixe déjà la taille du résultat : demander une
      // page plus petite qu'elle tronquerait la réponse en silence.
      per_page: ids.length > 0 ? ids.length : Math.min(Math.max(params.perPage ?? 50, 1), 250),
      page: ids.length > 0 ? 1 : Math.max(params.page ?? 1, 1),
      sparkline: params.withSparkline ?? false,
      // Fenêtres supplémentaires demandées DANS LE MÊME APPEL : l'endpoint les
      // renvoie comme champs additionnels, sans requête ni quota supplémentaires.
      // C'est ce qui rend le filtre de période des « mouvements » gratuit.
      price_change_percentage: '1h,24h,7d,14d,30d,1y',
      locale: 'fr',
      ...(ids.length > 0 ? { ids: ids.join(',') } : {}),
    })

    if (!Array.isArray(rows)) {
      throw new ProviderError(PROVIDER_ID, 'Format de classement inattendu')
    }

    return rows.map((row) => toMarketAsset(row, currency))
  },

  async getGlobalStats(currency = DEFAULT_CURRENCY): Promise<GlobalMarketStats> {
    const key = currency.toLowerCase()
    const { data } = await http.getJson<CoinGeckoGlobal>('global')

    const totalMarketCap = data.total_market_cap?.[key]
    const totalVolume = data.total_volume?.[key]

    if (totalMarketCap === undefined || totalVolume === undefined) {
      throw new ProviderError(PROVIDER_ID, `Devise « ${currency} » non couverte par la source`)
    }

    return {
      assetClass: 'crypto',
      totalMarketCap,
      totalVolume24h: totalVolume,
      // CoinGecko n'expose cette variation qu'en base USD. On la présente donc
      // comme une variation de marché, sans la rattacher à la devise affichée.
      marketCapChange24h: data.market_cap_change_percentage_24h_usd,
      dominance: data.market_cap_percentage ?? {},
      activeAssets: data.active_cryptocurrencies,
      currency: currency.toUpperCase(),
      lastUpdated: new Date(data.updated_at * 1000).toISOString(),
    }
  },

  async getTrending(currency = DEFAULT_CURRENCY): Promise<TrendingAsset[]> {
    // UN SEUL appel. La version précédente en faisait deux — le second uniquement
    // pour convertir les prix en euros — ce qui, à lui seul, faisait dépasser le
    // quota keyless de CoinGecko sur un rendu à froid de l'accueil. La variation
    // 24 h étant déjà publiée dans toutes les devises par cet endpoint, le second
    // appel n'apportait qu'un prix : on s'en passe (cf. `TrendingAsset`).
    const trending = await http.getJson<CoinGeckoTrending>('search/trending')
    const key = currency.toLowerCase()

    return (trending.coins ?? [])
      .map((entry) => entry.item)
      .filter((item) => item?.id && item.name)
      .slice(0, 8)
      .map((item) => {
        const asset: TrendingAsset = {
          id: item.id,
          symbol: (item.symbol ?? '').toUpperCase(),
          name: item.name,
          assetClass: 'crypto',
        }
        if (item.small || item.thumb) asset.image = item.small ?? item.thumb
        if (typeof item.market_cap_rank === 'number') asset.rank = item.market_cap_rank

        const change = item.data?.price_change_percentage_24h?.[key]
        if (typeof change === 'number' && Number.isFinite(change)) asset.change24h = change

        return asset
      })
  },

  async getAsset(id: string, _assetClass, currency = DEFAULT_CURRENCY): Promise<AssetDetail> {
    const key = currency.toLowerCase()
    const raw = await http.getJson<CoinGeckoCoin>(`coins/${encodeURIComponent(id)}`, {
      localization: 'true',
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false,
    })

    const market = raw.market_data
    const price = optional(market?.current_price?.[key])
    if (price === undefined) {
      throw new ProviderError(PROVIDER_ID, `Cours indisponible pour « ${id} » en ${currency}`)
    }

    const detail: AssetDetail = {
      id: raw.id,
      symbol: raw.symbol.toUpperCase(),
      name: raw.name,
      assetClass: 'crypto',
      price,
      currency: currency.toUpperCase(),
      lastUpdated: market?.last_updated ?? new Date().toISOString(),
    }

    if (raw.image?.large) detail.image = raw.image.large

    // CoinGecko traduit ses descriptions : on sert le français quand il existe, ce
    // qui évite un pavé anglais au milieu d'une page francophone.
    const description = raw.description?.fr?.trim() || raw.description?.en?.trim()
    if (description) detail.description = stripHtml(description)

    const homepage = raw.links?.homepage?.find((url) => url && url.startsWith('http'))
    if (homepage) detail.homepageUrl = homepage
    if (Array.isArray(raw.categories)) {
      detail.categories = raw.categories.filter((category): category is string => Boolean(category))
    }

    // Champs numériques optionnels : ils partagent tous le type `number | undefined`,
    // ce qui permet une affectation typée sans cast — et donc sans risque d'écrire
    // dans un champ qui n'attend pas un nombre.
    type NumericField =
      | 'marketCap'
      | 'volume24h'
      | 'high24h'
      | 'low24h'
      | 'change24h'
      | 'change7d'
      | 'circulatingSupply'
      | 'totalSupply'
      | 'maxSupply'
      | 'ath'
      | 'atl'
      | 'rank'

    const assign = (field: NumericField, value: number | undefined) => {
      if (value !== undefined) detail[field] = value
    }

    assign('marketCap', optional(market?.market_cap?.[key]))
    assign('volume24h', optional(market?.total_volume?.[key]))
    assign('high24h', optional(market?.high_24h?.[key]))
    assign('low24h', optional(market?.low_24h?.[key]))
    assign('change24h', optional(market?.price_change_percentage_24h))
    assign('change7d', optional(market?.price_change_percentage_7d))
    assign('circulatingSupply', optional(market?.circulating_supply))
    assign('totalSupply', optional(market?.total_supply))
    assign('maxSupply', optional(market?.max_supply))
    assign('ath', optional(market?.ath?.[key]))
    assign('atl', optional(market?.atl?.[key]))
    assign('rank', optional(raw.market_cap_rank))

    if (market?.ath_date?.[key]) detail.athDate = market.ath_date[key]
    if (market?.atl_date?.[key]) detail.atlDate = market.atl_date[key]

    return detail
  },

  async getHistory(
    id: string,
    days: number,
    _assetClass,
    currency = DEFAULT_CURRENCY,
  ): Promise<PriceHistory> {
    const payload = await http.getJson<{
      prices?: [number, number][]
      total_volumes?: [number, number][]
    }>(`coins/${encodeURIComponent(id)}/market_chart`, {
      vs_currency: currency.toLowerCase(),
      days,
      // CoinGecko choisit seul la granularité selon la fenêtre (5 min sous 1 jour,
      // horaire jusqu'à 90 jours, quotidienne au-delà). Forcer `interval` est
      // réservé aux offres payantes et provoque un 401 sur le palier gratuit.
    })

    // Les volumes arrivent dans CETTE réponse, horodatés comme les prix. Les indexer
    // plutôt que de les apparier par position : les deux tableaux ont la même
    // longueur en pratique, mais rien dans le contrat de l'API ne le garantit, et un
    // décalage d'un cran attribuerait silencieusement le volume au mauvais instant.
    const volumeAt = new Map<number, number>()
    for (const entry of payload.total_volumes ?? []) {
      if (Array.isArray(entry) && Number.isFinite(entry[1])) volumeAt.set(entry[0], entry[1])
    }

    const points = (payload.prices ?? [])
      .filter((entry) => Array.isArray(entry) && Number.isFinite(entry[1]))
      .map(([timestamp, price]) => {
        const volume = volumeAt.get(timestamp)
        return volume === undefined ? { timestamp, price } : { timestamp, price, volume }
      })

    if (points.length < 2) {
      throw new ProviderError(PROVIDER_ID, `Historique insuffisant pour « ${id} »`)
    }

    return { points, currency: currency.toUpperCase(), days }
  },

  /**
   * Bougies réelles, via l'endpoint `/ohlc` dédié.
   *
   * Appel SUPPLÉMENTAIRE, déclenché uniquement quand l'utilisateur bascule en
   * chandeliers — jamais au rendu initial de la fiche. Sur un quota mesuré à
   * ~5 requêtes/minute sans clé, faire porter ce coût au seul visiteur qui demande
   * la vue est la différence entre un module utilisable et un module qui déclenche
   * des 429 pour tout le monde.
   *
   * `days` n'est pas libre : CoinGecko n'accepte que 1, 7, 14, 30, 90, 180 et 365 sur
   * le palier gratuit, et répond 401 pour toute autre valeur. On aligne donc la
   * demande sur la fenêtre autorisée la plus proche par le haut.
   */
  async getOhlc(
    id: string,
    days: number,
    _assetClass,
    currency = DEFAULT_CURRENCY,
  ): Promise<OhlcHistory> {
    const allowed = [1, 7, 14, 30, 90, 180, 365]
    const window = allowed.find((value) => value >= days) ?? 365

    const payload = await http.getJson<[number, number, number, number, number][]>(
      `coins/${encodeURIComponent(id)}/ohlc`,
      { vs_currency: currency.toLowerCase(), days: window },
    )

    const candles = (Array.isArray(payload) ? payload : [])
      .filter((entry) => Array.isArray(entry) && entry.length >= 5 && entry.every(Number.isFinite))
      .map(([timestamp, open, high, low, close]) => ({ timestamp, open, high, low, close }))

    if (candles.length < 2) {
      throw new ProviderError(PROVIDER_ID, `Bougies indisponibles pour « ${id} »`)
    }

    // Granularité imposée par la source, pas choisie : 30 min jusqu'à 2 jours, 4 h
    // jusqu'à 30 jours, 4 jours au-delà. L'annoncer évite que l'axe laisse croire à
    // une précision que la donnée n'a pas.
    const intervalMinutes = window <= 2 ? 30 : window <= 30 ? 240 : 5_760

    return { candles, currency: currency.toUpperCase(), days: window, intervalMinutes }
  },

  async search(query: string, limit = 8): Promise<SearchResult[]> {
    const payload = await http.getJson<CoinGeckoSearch>('search', { query })

    return (payload.coins ?? [])
      .filter((coin) => coin.id && coin.name)
      .slice(0, limit)
      .map((coin) => {
        const result: SearchResult = {
          id: coin.id,
          name: coin.name,
          symbol: (coin.symbol ?? '').toUpperCase(),
          assetClass: 'crypto',
        }
        if (coin.thumb || coin.large) result.image = coin.large ?? coin.thumb
        if (typeof coin.market_cap_rank === 'number') result.rank = coin.market_cap_rank
        return result
      })
  },

  async getCategories(currency = DEFAULT_CURRENCY): Promise<MarketCategory[]> {
    const rows = await http.getJson<CoinGeckoCategory[]>('coins/categories', {
      order: 'market_cap_desc',
    })

    if (!Array.isArray(rows)) {
      throw new ProviderError(PROVIDER_ID, 'Format de catégories inattendu')
    }

    // L'endpoint ne cote qu'en dollars : on l'indique au lieu de convertir nous-mêmes.
    void currency

    return rows
      .filter((row) => row.id && row.name)
      .map((row) => {
        const category: MarketCategory = { id: row.id, name: row.name }
        const marketCap = optional(row.market_cap)
        if (marketCap !== undefined) category.marketCap = marketCap
        const change = optional(row.market_cap_change_24h)
        if (change !== undefined) category.marketCapChange24h = change
        const volume = optional(row.volume_24h)
        if (volume !== undefined) category.volume24h = volume
        if (Array.isArray(row.top_3_coins)) category.topAssets = row.top_3_coins.slice(0, 3)
        return category
      })
  },
}

/**
 * Retire le HTML des descriptions.
 *
 * CoinGecko livre ces textes en HTML (liens, `<br>`). Les injecter tels quels
 * ouvrirait une porte XSS sur du contenu tiers ; les afficher échappés donnerait des
 * balises visibles. On extrait donc le texte, et l'on conserve les sauts de ligne
 * portés par les `<br>` et les fins de paragraphe.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
