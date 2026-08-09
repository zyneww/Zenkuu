/**
 * API orientée usage, consommée par les pages.
 *
 * Chaque fonction renvoie un `DataResult` plutôt que de lever une exception : une
 * source indisponible est un cas NORMAL sur un site multi-sources (§5), pas un
 * incident. Le type force l'appelant à traiter l'absence, ce qui rend
 * structurellement impossible l'affichage d'un chiffre non sourcé.
 */

import { CACHE_TTL_SECONDS, cached } from './cache'
import { recordMarketCap } from './market-cap-series'
import { fetchExchangeRates } from './providers/frankfurter'
import { NEWS_SOURCES, fetchNews } from './providers/news'
import { SENTIMENT_SOURCE, fetchSentiment } from './providers/sentiment'
import { getDeclaredProvider, getProvider } from './registry'
import type {
  AssetClass,
  AssetDetail,
  GlobalMarketStats,
  MarketAsset,
  MarketCategory,
  NewsItem,
  PriceHistory,
  SentimentIndex,
  SortDirection,
  TrendingAsset,
} from './types'
import { ProviderError } from './types'

export interface DataSource {
  label: string
  attributionUrl: string
}

export type DataResult<T> =
  | { ok: true; data: T; source: DataSource }
  | { ok: false; kind: 'unconfigured' | 'error'; reason: string; source: DataSource | null }

/**
 * Univers sur lequel sont calculées les plus fortes hausses et baisses.
 *
 * Ramené de 250 à 100 : cet unique appel sert désormais AUSSI le tableau de
 * l'accueil, ce qui suppose d'y inclure les courbes 7 jours. À 250 actifs, la
 * réponse dépassait deux mégaoctets. À 100, elle reste raisonnable et couvre
 * largement le marché significatif — le libellé affiché reprend de toute façon la
 * taille réelle, jamais une valeur codée en dur.
 */
export const MOVERS_UNIVERSE_SIZE = 100

/**
 * Durées de vie ÉTALÉES selon la vitesse réelle de chaque donnée.
 *
 * Tout mettre à 5 minutes ferait expirer l'ensemble du cache au même instant : à
 * chaque régénération, l'accueil relancerait ses huit appels d'un coup, alors que le
 * palier gratuit de CoinGecko n'en tolère qu'une poignée par minute (mesuré).
 * En décalant, seules les données réellement périssables sont redemandées à chaque
 * cycle — les agrégats lents, eux, tiennent plusieurs cycles.
 */
const NEWS_TTL_SECONDS = 180

/** L'indice Fear & Greed n'est publié qu'une fois par jour. */
const SENTIMENT_TTL_SECONDS = 1_800

/** Les capitalisations sectorielles ne se réorganisent pas en cinq minutes. */
const CATEGORIES_TTL_SECONDS = 1_800

/** Le palmarès des tendances est stable à l'échelle de la dizaine de minutes. */
const TRENDING_TTL_SECONDS = 600

/** La BCE ne publie qu'un taux par jour ouvré : le redemander plus souvent est vain. */
const FX_TTL_SECONDS = 3_600

function describe(assetClass: AssetClass): DataSource | null {
  const provider = getDeclaredProvider(assetClass)
  return provider ? { label: provider.label, attributionUrl: provider.attributionUrl } : null
}

/**
 * Exécute une requête fournisseur en convertissant tout échec en `DataResult`.
 *
 * Le message d'erreur technique n'est jamais renvoyé tel quel à l'interface : il
 * part dans les logs serveur, et l'utilisateur reçoit une phrase compréhensible.
 */
async function run<T>(
  assetClass: AssetClass,
  cacheKey: string,
  fetcher: (provider: NonNullable<ReturnType<typeof getProvider>>) => Promise<T>,
  ttlSeconds: number = CACHE_TTL_SECONDS,
): Promise<DataResult<T>> {
  const source = describe(assetClass)
  const provider = getProvider(assetClass)

  if (!provider) {
    const declared = getDeclaredProvider(assetClass)
    return {
      ok: false,
      kind: 'unconfigured',
      reason: declared?.unavailableReason() ?? 'Aucune source configurée pour cette classe d’actif',
      source,
    }
  }

  try {
    const data = await cached(cacheKey, () => fetcher(provider), ttlSeconds)
    return {
      ok: true,
      data,
      source: { label: provider.label, attributionUrl: provider.attributionUrl },
    }
  } catch (error) {
    const detail = error instanceof ProviderError ? error.message : String(error)
    console.error(`[zenith:data] ${cacheKey} — ${detail}`)

    return {
      ok: false,
      kind: 'error',
      reason:
        error instanceof ProviderError && error.status === 429
          ? `Quota ${provider.label} temporairement atteint. Les données reviendront d’elles-mêmes.`
          : `Données ${provider.label} momentanément indisponibles.`,
      source,
    }
  }
}

/** Variante pour les sources qui ne dépendent d'aucune classe d'actif (actus, sentiment). */
async function runStandalone<T>(
  cacheKey: string,
  source: DataSource,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<DataResult<T>> {
  try {
    return { ok: true, data: await cached(cacheKey, fetcher, ttlSeconds), source }
  } catch (error) {
    console.error(`[zenith:data] ${cacheKey} — ${String(error)}`)
    return { ok: false, kind: 'error', reason: `Source ${source.label} indisponible.`, source }
  }
}

/* ── Statistiques globales ─────────────────────────────────────────────────── */

export async function getCryptoGlobalStats(
  currency = 'eur',
): Promise<DataResult<GlobalMarketStats>> {
  const result = await run('crypto', `crypto:global:${currency}`, (provider) => {
    if (!provider.getGlobalStats) {
      throw new ProviderError(provider.id, 'Statistiques globales non supportées')
    }
    return provider.getGlobalStats(currency)
  })

  // Chaque lecture réussie alimente notre propre série historique — seule façon
  // d'obtenir une courbe de capitalisation globale sans source payante.
  // L'enregistrement est volontairement placé ICI plutôt que dans l'adaptateur :
  // il doit capter aussi les lectures servies par le cache, sinon la série se
  // limiterait aux rares instants où le cache expire.
  if (result.ok) {
    recordMarketCap(result.data.currency, result.data.totalMarketCap)
  }

  return result
}

/* ── Classements ───────────────────────────────────────────────────────────── */

export interface RankingParams {
  assetClass?: AssetClass
  page?: number
  perPage?: number
  sortBy?: 'marketCap' | 'volume24h' | 'change24h'
  sortDirection?: SortDirection
  currency?: string
}

export function getRanking(params: RankingParams = {}): Promise<DataResult<MarketAsset[]>> {
  const {
    assetClass = 'crypto',
    page = 1,
    perPage = 50,
    sortBy = 'marketCap',
    sortDirection = 'desc',
    currency = 'eur',
  } = params

  return run(
    assetClass,
    `${assetClass}:ranking:${currency}:${sortBy}:${sortDirection}:${page}:${perPage}`,
    (provider) =>
      provider.listAssets({
        assetClass,
        page,
        perPage,
        sortBy,
        sortDirection,
        currency,
        withSparkline: true,
      }),
  )
}

/** Raccourci historique, conservé pour la page crypto. */
export function getCryptoRanking(
  params: Omit<RankingParams, 'assetClass'> = {},
): Promise<DataResult<MarketAsset[]>> {
  return getRanking({ ...params, assetClass: 'crypto' })
}

export function getTrendingCrypto(currency = 'eur'): Promise<DataResult<TrendingAsset[]>> {
  return run(
    'crypto',
    `crypto:trending:${currency}`,
    (provider) => {
      if (!provider.getTrending) throw new ProviderError(provider.id, 'Tendances non supportées')
      return provider.getTrending(currency)
    },
    TRENDING_TTL_SECONDS,
  )
}

export interface CryptoOverview {
  gainers: MarketAsset[]
  losers: MarketAsset[]
  /** Les dix premières capitalisations, courbes comprises — alimente le tableau d'accueil. */
  topByMarketCap: MarketAsset[]
  /** Taille réelle de l'univers analysé — affichée à l'utilisateur, jamais implicite. */
  universeSize: number
}

/**
 * Vue d'ensemble du marché crypto : plus fortes hausses, baisses, top capitalisations.
 *
 * Les trois dérivent d'UN seul appel. C'est délibéré : chaque requête évitée est du
 * quota gratuit préservé (§9), et l'univers est de toute façon le même.
 *
 * CoinGecko ne sait pas trier par variation côté serveur. On classe donc nous-mêmes
 * les `MOVERS_UNIVERSE_SIZE` premières capitalisations. Ce n'est pas « les plus
 * fortes hausses du marché » mais « parmi les 250 plus grandes capitalisations » —
 * et l'interface l'écrit noir sur blanc, parce qu'une variation de +900 % sur un
 * jeton illiquide n'a pas le même sens qu'un classement filtré.
 */
export function getCryptoOverview(
  currency = 'eur',
  limit = 5,
): Promise<DataResult<CryptoOverview>> {
  return run('crypto', `crypto:overview:${currency}:${limit}`, async (provider) => {
    const universe = await provider.listAssets({
      assetClass: 'crypto',
      page: 1,
      perPage: MOVERS_UNIVERSE_SIZE,
      sortBy: 'marketCap',
      sortDirection: 'desc',
      currency,
      // Courbes incluses : ce même appel alimente le tableau de l'accueil, ce qui
      // supprime une requête entière sur un budget qui n'en autorise qu'une poignée.
      withSparkline: true,
    })

    const ranked = universe
      .filter((asset) => typeof asset.change24h === 'number')
      .sort((a, b) => (b.change24h as number) - (a.change24h as number))

    return {
      gainers: ranked.slice(0, limit),
      losers: ranked.slice(-limit).reverse(),
      topByMarketCap: universe.slice(0, 10),
      universeSize: universe.length,
    }
  })
}

/**
 * Actifs comparables pour une fiche.
 *
 * Pour la crypto, on dérive de l'aperçu déjà mis en cache par l'accueil : la colonne
 * « comparables » ne coûte alors AUCUN appel réseau. Ailleurs, l'univers Yahoo est
 * de toute façon récupéré en entier pour le classement, donc également partagé.
 */
export async function getPeers(
  assetClass: AssetClass,
  excludeId: string,
  limit = 6,
): Promise<DataResult<MarketAsset[]>> {
  if (assetClass === 'crypto') {
    const overview = await getCryptoOverview('eur', 5)
    if (!overview.ok) return overview
    return {
      ok: true,
      source: overview.source,
      data: overview.data.topByMarketCap.filter((asset) => asset.id !== excludeId).slice(0, limit),
    }
  }

  const ranking = await getRanking({ assetClass, perPage: 20, currency: 'eur' })
  if (!ranking.ok) return ranking
  return {
    ok: true,
    source: ranking.source,
    data: ranking.data.filter((asset) => asset.id !== excludeId).slice(0, limit),
  }
}

export function getForexRates(): Promise<DataResult<MarketAsset[]>> {
  return run('forex', 'forex:majors:eur', (provider) => provider.listAssets())
}

/* ── Fiches actif ──────────────────────────────────────────────────────────── */

export function getAsset(
  id: string,
  assetClass: AssetClass,
  currency = 'eur',
): Promise<DataResult<AssetDetail>> {
  return run(assetClass, `${assetClass}:asset:${id}:${currency}`, (provider) => {
    if (!provider.getAsset) {
      throw new ProviderError(provider.id, 'Fiche détaillée non supportée')
    }
    return provider.getAsset(id, assetClass, currency)
  })
}

export function getAssetHistory(
  id: string,
  assetClass: AssetClass,
  days: number,
  currency = 'eur',
): Promise<DataResult<PriceHistory>> {
  return run(assetClass, `${assetClass}:history:${id}:${days}:${currency}`, (provider) => {
    if (!provider.getHistory) {
      throw new ProviderError(provider.id, 'Historique non supporté')
    }
    return provider.getHistory(id, days, assetClass, currency)
  })
}

/* ── Secteurs, actualités, sentiment ───────────────────────────────────────── */

/**
 * Liste brute des catégories, mise en cache SOUS UNE SEULE CLÉ.
 *
 * Point important : `getCategories` et `getTopNarratives` exploitent le même
 * endpoint, mais avec des filtres et des limites différents. Les mettre en cache
 * chacun sous sa propre clé déclencherait DEUX téléchargements du même document de
 * 340 Ko — la déduplication ne peut pas les rapprocher, puisqu'elle travaille sur la
 * clé. On mutualise donc la récupération ici, et chaque requête publique se contente
 * de dériver sa vue à partir de ce résultat commun.
 */
function fetchCategories(
  provider: NonNullable<ReturnType<typeof getProvider>>,
): Promise<MarketCategory[]> {
  if (!provider.getCategories) {
    throw new ProviderError(provider.id, 'Catégories non supportées')
  }
  return cached('crypto:categories:raw', () => provider.getCategories!(), CATEGORIES_TTL_SECONDS)
}

export function getCategories(limit = 12): Promise<DataResult<MarketCategory[]>> {
  return run(
    'crypto',
    `crypto:categories:view:${limit}`,
    async (provider) => {
      const categories = await fetchCategories(provider)
      return categories.filter((category) => category.marketCap !== undefined).slice(0, limit)
    },
    CATEGORIES_TTL_SECONDS,
  )
}

/**
 * Catégories triées par variation 24 h — les « narratifs du jour ».
 *
 * On écarte les secteurs de moins d'un milliard de capitalisation : sur les tout
 * petits paniers, une variation de +40 % ne raconte rien du marché, seulement le
 * mouvement d'un jeton isolé.
 */
export function getTopNarratives(limit = 6): Promise<DataResult<MarketCategory[]>> {
  return run(
    'crypto',
    `crypto:narratives:${limit}`,
    async (provider) => {
    // Même source que `getCategories` — un seul téléchargement pour les deux vues.
    const categories = await fetchCategories(provider)

    return categories
      .filter(
        (category) =>
          category.marketCapChange24h !== undefined && (category.marketCap ?? 0) > 1_000_000_000,
      )
      .sort(
        (a, b) => Math.abs(b.marketCapChange24h as number) - Math.abs(a.marketCapChange24h as number),
      )
      .slice(0, limit)
    },
    CATEGORIES_TTL_SECONDS,
  )
}

export function getNews(limit = 8): Promise<DataResult<NewsItem[]>> {
  return runStandalone(
    `news:${limit}`,
    { label: NEWS_SOURCES, attributionUrl: 'https://cointelegraph.com' },
    () => fetchNews(limit),
    NEWS_TTL_SECONDS,
  )
}

/** Devises proposées par le sélecteur des fiches actif. */
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export interface ExchangeRates {
  base: string
  /** Date de publication du taux — affichée, car un taux BCE date du jour ouvré précédent. */
  date: string
  rates: Record<string, number>
}

export function getExchangeRates(): Promise<DataResult<ExchangeRates>> {
  return runStandalone(
    'fx:rates:eur',
    { label: 'Frankfurter (BCE)', attributionUrl: 'https://frankfurter.dev' },
    () => fetchExchangeRates([...SUPPORTED_CURRENCIES]),
    FX_TTL_SECONDS,
  )
}

export function getSentiment(): Promise<DataResult<SentimentIndex>> {
  return runStandalone('sentiment:fng', SENTIMENT_SOURCE, fetchSentiment, SENTIMENT_TTL_SECONDS)
}
