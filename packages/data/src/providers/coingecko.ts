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
  AssetTicker,
  DerivativeMarket,
  GlobalMarketStats,
  ListAssetsParams,
  MarketAsset,
  MarketCategory,
  MarketDataProvider,
  OhlcHistory,
  PriceHistory,
  SearchResult,
  SpotExchange,
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
  links?: {
    homepage?: string[]
    blockchain_site?: string[]
    whitepaper?: string
    repos_url?: { github?: string[] }
    subreddit_url?: string
    twitter_screen_name?: string
    telegram_channel_identifier?: string
    official_forum_url?: string[]
  }
  /** Adresses de contrat par chaîne : { ethereum: '0x7fc6…', 'polygon-pos': '0x…' }. */
  platforms?: Record<string, string | null>
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
    /* Fenêtres longues : déjà dans la réponse, simplement jamais lues jusqu'ici. */
    price_change_percentage_1h_in_currency?: Record<string, number>
    price_change_percentage_14d?: number | null
    price_change_percentage_30d?: number | null
    price_change_percentage_1y?: number | null
    fully_diluted_valuation?: Record<string, number>
    total_value_locked?: Record<string, number> | null
    ath_change_percentage?: Record<string, number>
    atl_change_percentage?: Record<string, number>
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

/**
 * Réponse de `/derivatives`.
 *
 * Les nombres arrivent tantôt en `number`, tantôt en CHAÎNE (`"64992.8"`) selon le
 * champ — c'est le format réel de la source, pas une hypothèse défensive. D'où le
 * type union et la conversion explicite plus bas.
 */
interface CoinGeckoDerivative {
  market?: string
  symbol?: string
  index_id?: string
  price?: string | number | null
  price_percentage_change_24h?: number | null
  contract_type?: string
  index?: number | null
  basis?: number | null
  spread?: number | null
  funding_rate?: number | null
  open_interest?: number | null
  volume_24h?: number | null
  expired_at?: string | null
}

/** Réponse de `/coins/{id}/tickers` — les places où l'actif se négocie. */
interface CoinGeckoTickers {
  tickers?: {
    base?: string
    target?: string
    market?: { name?: string; identifier?: string }
    volume?: number | null
    converted_last?: Record<string, number>
    converted_volume?: Record<string, number>
    bid_ask_spread_percentage?: number | null
    /**
     * Profondeur du carnet à ±2 % — montant qu'il faudrait exécuter pour déplacer le
     * cours de deux pour cent. Renvoyée uniquement si `depth=true` est demandé, et
     * disponible sur le palier gratuit (vérifié).
     */
    cost_to_move_up_usd?: number | null
    cost_to_move_down_usd?: number | null
    /** Note de confiance de la place POUR CETTE PAIRE : `green`, `yellow` ou `red`. */
    trust_score?: string | null
    trade_url?: string | null
    last_traded_at?: string | null
    /** Cotation périmée ou aberrante selon la source — on ne les affiche pas. */
    is_stale?: boolean
    is_anomaly?: boolean
  }[]
}

/** Réponse brute de `/exchanges`. */
interface CoinGeckoExchange {
  id?: string
  name?: string
  image?: string
  country?: string | null
  url?: string
  year_established?: number | null
  trust_score?: number | null
  trust_score_rank?: number | null
  trade_volume_24h_btc?: number | null
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
  /** Identifiants des trois actifs, alignés sur `top_3_coins`. */
  top_3_coins_id?: string[]
  /** Définition du secteur, rédigée par la source. */
  content?: string | null
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
      // Restriction à un secteur. L'endpoint applique le filtre AVANT la pagination :
      // la page 1 d'une catégorie contient donc bien ses plus grandes
      // capitalisations, et non les lignes de la page 1 globale qui s'y trouveraient.
      ...(params.category ? { category: params.category } : {}),
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

    /* ── Liens, contrats et prix mondiaux ─────────────────────────────────────
       Tout ce qui suit était DÉJÀ dans la réponse et simplement jeté faute d'être
       typé : aucun appel réseau supplémentaire, uniquement du mappage. La source
       renvoie beaucoup de chaînes vides et de `null` dans ces tableaux — d'où le
       filtrage systématique, qui évite d'afficher un lien mort. */

    const links = raw.links
    const httpUrls = (values: (string | undefined)[] | undefined) =>
      (values ?? []).filter((url): url is string => Boolean(url?.startsWith('http')))

    const explorers = httpUrls(links?.blockchain_site)
    if (explorers.length > 0) detail.explorerUrls = explorers.slice(0, 6)

    if (links?.whitepaper?.startsWith('http')) detail.whitepaperUrl = links.whitepaper

    const github = httpUrls(links?.repos_url?.github)[0]
    if (github) detail.sourceCodeUrl = github

    // Les réseaux communautaires arrivent en trois formats distincts : URL complète
    // (Reddit), identifiant nu (Twitter, Telegram) ou tableau (forum officiel). On
    // reconstruit l'URL plutôt que d'afficher un identifiant brut, illisible.
    const community: Record<string, string> = {}
    if (links?.subreddit_url?.startsWith('http')) community['Reddit'] = links.subreddit_url
    if (links?.twitter_screen_name) community['X'] = `https://x.com/${links.twitter_screen_name}`
    if (links?.telegram_channel_identifier) {
      community['Telegram'] = `https://t.me/${links.telegram_channel_identifier}`
    }
    const forum = httpUrls(links?.official_forum_url)[0]
    if (forum) community['Forum'] = forum
    if (Object.keys(community).length > 0) detail.communityUrls = community

    // `platforms` contient souvent une clé vide pour les actifs sans contrat (les
    // chaînes natives comme Bitcoin) : elle est écartée, sinon la fiche technique
    // afficherait une ligne sans nom de chaîne.
    if (raw.platforms) {
      const contracts: Record<string, string> = {}
      for (const [chain, address] of Object.entries(raw.platforms)) {
        if (chain && address) contracts[chain] = address
      }
      if (Object.keys(contracts).length > 0) detail.contracts = contracts
    }

    // Cotations RÉELLES par devise, et non des conversions maison : la source
    // publie le prix devise par devise, ce qui vaut mieux qu'un produit par un taux.
    if (market?.current_price) {
      const prices: Record<string, number> = {}
      for (const [code, value] of Object.entries(market.current_price)) {
        if (typeof value === 'number' && Number.isFinite(value)) prices[code] = value
      }
      if (Object.keys(prices).length > 0) detail.pricesByCurrency = prices
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
      | 'change1h'
      | 'change14d'
      | 'change30d'
      | 'change1y'
      | 'fdv'
      | 'tvl'
      | 'athChangePercent'
      | 'atlChangePercent'

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

    // Fenêtres longues et repères étendus, tous présents dans la même réponse.
    // Seule la variation 1 h est publiée par devise ; les autres sont globales.
    assign('change1h', optional(market?.price_change_percentage_1h_in_currency?.[key]))
    assign('change14d', optional(market?.price_change_percentage_14d))
    assign('change30d', optional(market?.price_change_percentage_30d))
    assign('change1y', optional(market?.price_change_percentage_1y))

    // FDV reprise telle quelle, JAMAIS recalculée en `prix × offre totale` : la
    // source applique ses propres règles sur les jetons verrouillés ou brûlés, et
    // un produit maison divergerait du chiffre publié partout ailleurs (§5).
    assign('fdv', optional(market?.fully_diluted_valuation?.[key]))
    // La TVL n'existe que pour les protocoles de finance décentralisée : `null`
    // pour tous les autres, et le module disparaît alors de la fiche.
    assign('tvl', optional(market?.total_value_locked?.[key]))
    assign('athChangePercent', optional(market?.ath_change_percentage?.[key]))
    assign('atlChangePercent', optional(market?.atl_change_percentage?.[key]))

    if (market?.ath_date?.[key]) detail.athDate = market.ath_date[key]
    if (market?.atl_date?.[key]) detail.atlDate = market.atl_date[key]

    return detail
  },

  /**
   * Places de cotation d'un actif.
   *
   * Deux filtres appliqués AVANT tout affichage, et ils ne sont pas cosmétiques :
   * la source marque elle-même les cotations périmées (`is_stale`) et aberrantes
   * (`is_anomaly`). Les laisser passer afficherait un prix faux à côté de prix
   * justes, ce qui est pire que de ne rien afficher — un lecteur n'a aucun moyen
   * de distinguer les deux (§5).
   *
   * On lit `converted_last` plutôt que `last` : `last` est libellé dans la devise
   * de cotation de la paire (souvent USDT), et le mélanger à des prix en euros dans
   * une même colonne produirait un tableau incomparable.
   *
   * LIMITE DE LA SOURCE, vérifiée sur l'API : cet endpoint ne convertit QUE vers
   * `btc`, `eth` et `usd` — jamais vers l'euro, contrairement au reste de l'API.
   * Demander « eur » ne renvoyait donc aucune ligne exploitable et vidait la
   * section entière en silence. On se rabat sur le dollar et on le DÉCLARE dans
   * `currency`, de sorte que l'affichage sache qu'il montre des dollars et puisse
   * l'écrire. Convertir nous-mêmes vers l'euro empilerait le cours et un taux de
   * change horodatés différemment (§5).
   */
  async getTickers(
    id: string,
    currency = DEFAULT_CURRENCY,
    limit = 10,
  ): Promise<AssetTicker[]> {
    const payload = await http.getJson<CoinGeckoTickers>(
      `coins/${encodeURIComponent(id)}/tickers`,
      {
        // Trié par volume : les premières places sont les plus liquides, donc les
        // plus représentatives du prix réel.
        order: 'volume_desc',
        // `depth=true` ajoute la profondeur du carnet à ±2 % SANS coût
        // supplémentaire : c'est le même appel, avec deux champs de plus. Vérifié
        // disponible sur le palier gratuit.
        depth: true,
      },
    )

    if (!Array.isArray(payload.tickers)) {
      throw new ProviderError(PROVIDER_ID, 'Format des places de cotation inattendu')
    }

    // Devise résolue sur ce que la réponse contient RÉELLEMENT, et non sur ce qui a
    // été demandé : on inspecte la première ligne plutôt que de coder « usd » en
    // dur, pour que l'ajout éventuel de l'euro par la source soit pris tout seul.
    const requested = currency.toLowerCase()
    const available = payload.tickers.find((row) => row.converted_last)?.converted_last ?? {}
    const key = available[requested] !== undefined ? requested : 'usd'

    const rows: AssetTicker[] = []

    for (const raw of payload.tickers) {
      if (raw.is_stale || raw.is_anomaly) continue

      const price = optional(raw.converted_last?.[key])
      const exchange = raw.market?.name?.trim()
      if (price === undefined || !exchange || !raw.base || !raw.target) continue

      const ticker: AssetTicker = {
        exchange,
        base: raw.base,
        target: raw.target,
        price,
        currency: key.toUpperCase(),
      }

      const volume = optional(raw.converted_volume?.[key])
      if (volume !== undefined) ticker.volume24h = volume

      const spread = optional(raw.bid_ask_spread_percentage)
      if (spread !== undefined) ticker.spreadPercent = spread

      const depthUp = optional(raw.cost_to_move_up_usd)
      if (depthUp !== undefined) ticker.depthUpUsd = depthUp
      const depthDown = optional(raw.cost_to_move_down_usd)
      if (depthDown !== undefined) ticker.depthDownUsd = depthDown

      // Liste blanche plutôt que transtypage : la source pourrait introduire une
      // quatrième valeur, qui traverserait sinon jusqu'à l'interface sans style.
      if (raw.trust_score === 'green' || raw.trust_score === 'yellow' || raw.trust_score === 'red') {
        ticker.trust = raw.trust_score
      }

      if (raw.trade_url?.startsWith('http')) ticker.tradeUrl = raw.trade_url
      if (raw.last_traded_at) ticker.lastTraded = raw.last_traded_at

      rows.push(ticker)
      if (rows.length >= limit) break
    }

    // Part de volume calculée sur les lignes RETENUES, et l'interface l'écrit :
    // rapportée au volume total de l'actif, une part calculée sur dix places
    // donnerait des pourcentages qui ne somment pas à 100 sans explication.
    const total = rows.reduce((sum, row) => sum + (row.volume24h ?? 0), 0)
    if (total > 0) {
      for (const row of rows) {
        if (row.volume24h !== undefined) row.volumePercent = (row.volume24h / total) * 100
      }
    }

    return rows
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
      market_caps?: [number, number][]
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

    // `market_caps` voyage dans la MÊME réponse et était jusqu'ici jeté. C'est ce qui
    // rend possible une courbe de capitalisation sur un an sans le moindre appel
    // supplémentaire — et c'est une mesure publiée, pas un produit `prix × offre`,
    // lequel divergerait du chiffre officiel dès qu'un jeton est brûlé ou verrouillé.
    const marketCapAt = new Map<number, number>()
    for (const entry of payload.market_caps ?? []) {
      if (Array.isArray(entry) && Number.isFinite(entry[1])) marketCapAt.set(entry[0], entry[1])
    }

    const points = (payload.prices ?? [])
      .filter((entry) => Array.isArray(entry) && Number.isFinite(entry[1]))
      .map(([timestamp, price]) => {
        const point: PriceHistory['points'][number] = { timestamp, price }
        const volume = volumeAt.get(timestamp)
        if (volume !== undefined) point.volume = volume
        const marketCap = marketCapAt.get(timestamp)
        if (marketCap !== undefined) point.marketCap = marketCap
        return point
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

  /**
   * Marchés de produits dérivés — intérêt ouvert, financement, base.
   *
   * L'endpoint renvoie plus de 24 000 lignes (tous contrats de toutes les places) en
   * un seul appel : il est donc BORNÉ ici, après tri par intérêt ouvert. Renvoyer
   * l'intégralité ferait transiter plusieurs mégaoctets jusqu'au navigateur pour un
   * tableau qui en affiche quelques dizaines.
   *
   * Deux filtres appliqués avant tout :
   *  · les contrats EXPIRÉS sont écartés — leur prix est figé et n'informe plus ;
   *  · les lignes sans intérêt ouvert le sont aussi, puisque c'est le critère de
   *    classement : sans lui, la ligne ne peut pas être située.
   */
  async getDerivatives(limit = 60): Promise<DerivativeMarket[]> {
    const rows = await http.getJson<CoinGeckoDerivative[]>('derivatives')

    if (!Array.isArray(rows)) {
      throw new ProviderError(PROVIDER_ID, 'Format des dérivés inattendu')
    }

    // `price` arrive en chaîne sur cet endpoint, contrairement au reste de l'API.
    const numeric = (value: string | number | null | undefined): number | undefined => {
      if (value === null || value === undefined) return undefined
      const parsed = typeof value === 'string' ? Number(value) : value
      return Number.isFinite(parsed) ? parsed : undefined
    }

    const markets: DerivativeMarket[] = []

    for (const row of rows) {
      if (row.expired_at) continue

      const price = numeric(row.price)
      const openInterest = optional(row.open_interest)
      if (price === undefined || openInterest === undefined || !row.market || !row.symbol) continue

      const market: DerivativeMarket = {
        market: row.market,
        symbol: row.symbol,
        price,
        openInterest,
      }

      if (row.index_id) market.indexId = row.index_id
      if (row.contract_type) market.contractType = row.contract_type

      const change = optional(row.price_percentage_change_24h)
      if (change !== undefined) market.change24h = change
      const volume = optional(row.volume_24h)
      if (volume !== undefined) market.volume24h = volume
      const funding = optional(row.funding_rate)
      if (funding !== undefined) market.fundingRate = funding
      const basis = optional(row.basis)
      if (basis !== undefined) market.basis = basis
      const spread = optional(row.spread)
      if (spread !== undefined) market.spread = spread

      markets.push(market)
    }

    return markets.sort((a, b) => (b.openInterest ?? 0) - (a.openInterest ?? 0)).slice(0, limit)
  },

  /**
   * Places de marché au comptant.
   *
   * L'endpoint classe déjà les places par note de confiance décroissante — une note
   * composite maison (liquidité réelle, qualité du carnet, échelle de l'activité,
   * conformité) destinée à ne pas mettre sur un pied d'égalité un volume vérifié et
   * un volume déclaré. On la reprend TELLE QUELLE, attribuée : la recalculer
   * supposerait des données de carnet d'ordres qu'aucune source gratuite ne publie.
   *
   * `trade_volume_24h_btc` est libellé en bitcoin, pas en devise. On ne le convertit
   * pas : appliquer un cours choisi par nous transformerait la mesure en estimation.
   */
  async getExchanges(limit = 50): Promise<SpotExchange[]> {
    const rows = await http.getJson<CoinGeckoExchange[]>('exchanges', {
      // Plafond de l'endpoint, comme partout ailleurs dans cette API.
      per_page: Math.min(Math.max(limit, 1), 250),
      page: 1,
    })

    if (!Array.isArray(rows)) {
      throw new ProviderError(PROVIDER_ID, 'Format des places de marché inattendu')
    }

    const exchanges: SpotExchange[] = []

    for (const row of rows) {
      const volume = optional(row.trade_volume_24h_btc)
      // Sans volume, la ligne ne peut être ni classée ni comparée : elle est écartée
      // plutôt que ramenée à zéro, ce qui la placerait en bas comme une place inactive.
      if (!row.id || !row.name || volume === undefined) continue

      const exchange: SpotExchange = { id: row.id, name: row.name, volume24hBtc: volume }

      if (row.image) exchange.image = row.image
      if (row.country) exchange.country = row.country
      if (row.url) exchange.url = row.url

      const year = optional(row.year_established)
      if (year !== undefined) exchange.yearEstablished = year
      const score = optional(row.trust_score)
      if (score !== undefined) exchange.trustScore = score
      const rank = optional(row.trust_score_rank)
      if (rank !== undefined) exchange.trustRank = rank

      exchanges.push(exchange)
    }

    return exchanges.slice(0, limit)
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
        if (Array.isArray(row.top_3_coins_id)) {
          category.topAssetIds = row.top_3_coins_id.slice(0, 3)
        }
        // La source livre parfois une chaîne vide plutôt que d'omettre le champ :
        // `trim()` évite de créer une description qui n'afficherait rien.
        const description = row.content?.trim()
        if (description) category.description = description
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
