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
  AssetTicker,
  GlobalMarketStats,
  MarketAsset,
  MarketCategory,
  NewsItem,
  OhlcHistory,
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
 * Tailles d'univers proposées au filtre des « mouvements ».
 *
 * PLAFOND DE LA SOURCE : CoinGecko limite `per_page` à 250. Au-delà, il faut
 * enchaîner les pages — 500 coûte deux appels, 1 000 en coûterait quatre, sur un
 * quota mesuré à cinq par minute. On s'arrête donc à 500, et « toutes les
 * cryptomonnaies » n'est pas proposé : l'univers complet dépasse quinze mille
 * jetons, soit une soixantaine d'appels par affichage. Annoncer une option
 * irréalisable serait pire que de ne pas l'offrir (§5).
 */
export const MOVERS_UNIVERSES = [100, 250, 500] as const
export type MoversUniverse = (typeof MOVERS_UNIVERSES)[number]

/** Fenêtres de variation exploitables — celles que la source publie réellement. */
export const MOVERS_PERIODS = ['1h', '24h', '7d', '14d', '30d', '1y'] as const
export type MoversPeriod = (typeof MOVERS_PERIODS)[number]

/** Champs de variation exploitables — sous-ensemble strict de `MarketAsset`. */
export type ChangeField =
  | 'change1h'
  | 'change24h'
  | 'change7d'
  | 'change14d'
  | 'change30d'
  | 'change1y'

const PERIOD_FIELD: Record<MoversPeriod, ChangeField> = {
  '1h': 'change1h',
  '24h': 'change24h',
  '7d': 'change7d',
  '14d': 'change14d',
  '30d': 'change30d',
  '1y': 'change1y',
}

/**
 * Univers de calcul des plus fortes hausses et baisses.
 *
 * Renvoie la LISTE BRUTE, triée par capitalisation ; le classement par variation est
 * fait par l'appelant, qui connaît la période choisie. Séparer les deux évite une
 * clé de cache par combinaison période × univers, alors que la donnée sous-jacente
 * est strictement la même.
 */
export function getMoversUniverse(
  universe: MoversUniverse = 100,
  currency = 'eur',
): Promise<DataResult<MarketAsset[]>> {
  return run('crypto', `crypto:movers:${universe}:${currency}`, async (provider) => {
    const pageSize = Math.min(universe, 250)
    const pages = Math.ceil(universe / pageSize)

    const batches: MarketAsset[] = []
    for (let page = 1; page <= pages; page += 1) {
      // Séquentiel et non parallèle : le limiteur de débit du client HTTP espace
      // déjà les appels, et les lancer d'un coup ne ferait qu'avancer l'instant du
      // 429 sans rien gagner.
      const batch = await provider.listAssets({
        assetClass: 'crypto',
        page,
        perPage: pageSize,
        sortBy: 'marketCap',
        sortDirection: 'desc',
        currency,
      })
      batches.push(...batch)
      if (batch.length < pageSize) break
    }

    return batches.slice(0, universe)
  })
}

/** Classe un univers par variation sur la période demandée. */
export function rankMovers(
  assets: MarketAsset[],
  period: MoversPeriod,
  limit = 15,
): { gainers: MarketAsset[]; losers: MarketAsset[]; field: ChangeField } {
  const field = PERIOD_FIELD[period]

  // Un actif sans variation sur CETTE période est écarté, pas traité comme 0 % :
  // l'absence de donnée n'est pas une stabilité.
  const usable = assets.filter((asset) => typeof asset[field] === 'number')
  const sorted = [...usable].sort(
    (a, b) => (b[field] as number) - (a[field] as number),
  )

  // Découpage PAR SIGNE et non aux seules extrémités. Trancher `slice(0, limit)` et
  // `slice(-limit)` d'un univers plus petit que `2 × limit` fait se rejoindre les
  // deux listes au milieu : « plus fortes baisses » se remplit alors d'actifs en
  // HAUSSE, ceux qui montent le moins. Le défaut ne se voit que les jours où le
  // marché va dans un seul sens, ce qui le rend d'autant plus pernicieux.
  //
  // Conséquence assumée : une liste plus courte quand peu d'actifs baissent. C'est
  // l'information à ne pas masquer par une longueur fixe.
  return {
    gainers: sorted.filter((asset) => (asset[field] as number) > 0).slice(0, limit),
    losers: sorted
      .filter((asset) => (asset[field] as number) < 0)
      .slice(-limit)
      .reverse(),
    field,
  }
}

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

/**
 * Tendances ENRICHIES : les mêmes actifs, avec prix, capitalisation et courbe.
 *
 * L'endpoint des tendances ne publie qu'un nom, un rang et une variation — d'où la
 * pauvreté assumée de `TrendingAsset`. Pour afficher ces actifs dans le même tableau
 * que les autres vues, on recharge donc la liste par identifiants via `listAssets`.
 *
 * C'est UN appel réseau de plus, et il est assumé : la vue n'est chargée que si le
 * lecteur ouvre l'onglet, et le résultat est mis en cache comme les autres. La
 * solution sans appel — croiser les tendances avec les 250 premières
 * capitalisations déjà chargées — a été écartée parce qu'un actif en tendance est
 * précisément, le plus souvent, une petite capitalisation absente de ce tableau :
 * l'onglet se serait vidé au moment où il devient intéressant.
 *
 * L'ORDRE des tendances est celui de la source, et il est reconstruit ici : c'est un
 * classement par popularité que `coins/markets` ignore et remplacerait par un tri
 * par capitalisation.
 */
export async function getTrendingCryptoAssets(
  currency = 'eur',
): Promise<DataResult<MarketAsset[]>> {
  const trending = await getTrendingCrypto(currency)
  if (!trending.ok) return trending
  if (trending.data.length === 0) return { ...trending, data: [] }

  const order = new Map(trending.data.map((asset, index) => [asset.id, index]))

  const enriched = await run(
    'crypto',
    `crypto:trending-assets:${currency}:${[...order.keys()].join(',')}`,
    (provider) =>
      provider.listAssets({
        assetClass: 'crypto',
        currency,
        ids: [...order.keys()],
        withSparkline: true,
      }),
    TRENDING_TTL_SECONDS,
  )

  if (!enriched.ok) return enriched

  // Un fournisseur qui ignore `ids` renverrait plus large : on refiltre ici plutôt
  // que de faire confiance à la source.
  const ordered = enriched.data
    .filter((asset) => order.has(asset.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  return { ...enriched, data: ordered }
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

    // Filtrage PAR SIGNE, comme `rankMovers` : sans lui, « plus fortes baisses » se
    // remplit d'actifs en hausse dès que l'univers est plus petit que `2 × limit`
    // ou que le marché monte partout. Corrigé ICI plutôt qu'au point d'affichage,
    // pour que tous les appelants en bénéficient — l'accueil comme /crypto.
    return {
      gainers: ranked.filter((asset) => (asset.change24h as number) > 0).slice(0, limit),
      losers: ranked
        .filter((asset) => (asset.change24h as number) < 0)
        .slice(-limit)
        .reverse(),
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

/**
 * Places de cotation d'un actif.
 *
 * TTL long (30 min) et volontairement plus généreux que celui du cours : la liste
 * des places qui négocient un actif, et leur poids relatif, bougent à l'échelle de
 * la journée — pas de la minute. C'est ce qui rend acceptable le seul appel réseau
 * supplémentaire de la fiche sur un quota mesuré à cinq requêtes par minute (§9).
 *
 * Un fournisseur sans `getTickers` — Yahoo pour les actions, la BCE pour les
 * devises — fait simplement disparaître la section, comme n'importe quelle autre
 * donnée absente.
 */
export function getAssetTickers(
  id: string,
  assetClass: AssetClass,
  currency = 'eur',
  limit = 10,
): Promise<DataResult<AssetTicker[]>> {
  return run(
    assetClass,
    `${assetClass}:tickers:${id}:${currency}:${limit}`,
    (provider) => {
      if (!provider.getTickers) {
        throw new ProviderError(provider.id, 'Places de cotation non publiées par la source')
      }
      return provider.getTickers(id, currency, limit)
    },
    1800,
  )
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

/**
 * Bougies OHLC — requête DISTINCTE de l'historique, et à la demande.
 *
 * Elle n'est jamais appelée au rendu de la fiche : seule la bascule vers la vue
 * chandeliers la déclenche. Chez CoinGecko elle consomme un appel supplémentaire
 * (endpoint `/ohlc` séparé), chez Yahoo elle réutilise la même réponse `chart`.
 *
 * Le `DataResult` renvoyé porte l'indisponibilité comme n'importe quelle autre
 * absence de donnée : un fournisseur sans `getOhlc` — la BCE, qui ne publie qu'un
 * taux de référence par jour ouvré — fait disparaître l'option du sélecteur au lieu
 * de produire des bougies reconstituées.
 */
export function getAssetOhlc(
  id: string,
  assetClass: AssetClass,
  days: number,
  currency = 'eur',
): Promise<DataResult<OhlcHistory>> {
  return run(assetClass, `${assetClass}:ohlc:${id}:${days}:${currency}`, (provider) => {
    if (!provider.getOhlc) {
      throw new ProviderError(provider.id, 'Bougies non supportées')
    }
    return provider.getOhlc(id, days, assetClass, currency)
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
  // Clé VERSIONNÉE. Le cache vit sur `globalThis` et survit au rechargement à chaud :
  // sans ce suffixe, un enregistrement antérieur à l'ajout de `topAssetIds` et
  // `description` continuerait d'être servi pendant sa demi-heure de validité, et les
  // nouveaux champs paraîtraient absents alors que le code les mappe. Toute évolution
  // de la forme de `MarketCategory` doit incrémenter ce numéro.
  return cached('crypto:categories:raw:v3', () => provider.getCategories!(), CATEGORIES_TTL_SECONDS)
}

/**
 * Secteurs de marché.
 *
 * `limit` est facultatif et n'est plus borné par défaut : la source publie ses
 * quelque 750 catégories dans UN SEUL appel, sans pagination. Les tronquer à douze
 * coûtait donc exactement le même appel réseau tout en privant la page de 98 % de
 * son contenu. Les appelants qui n'ont besoin que d'un aperçu passent leur propre
 * limite ; la page de secteurs, elle, les prend toutes.
 *
 * Le filtre exige une capitalisation STRICTEMENT POSITIVE, et pas seulement
 * définie. Mesuré sur la réponse : 349 catégories arrivent sans capitalisation et
 * 39 autres avec une capitalisation de zéro — des rubriques de taxonomie dont plus
 * aucun actif n'est valorisé. Le test `!== undefined` laissait passer les secondes,
 * qui remontaient ensuite en tête des baisses à « −100 % » sur une base nulle. Une
 * variation calculée sur zéro n'est pas une variation (§5).
 */
export function getCategories(limit?: number): Promise<DataResult<MarketCategory[]>> {
  return run(
    'crypto',
    // Versionnée comme la clé brute : le critère de filtrage est passé de
    // « capitalisation définie » à « capitalisation strictement positive », donc le
    // contenu associé à la clé n'a plus le même sens. Réutiliser l'ancienne clé
    // servirait des catégories à zéro pendant toute la durée de vie du cache.
    `crypto:categories:view:v2:${limit ?? 'all'}`,
    async (provider) => {
      const categories = await fetchCategories(provider)
      const rated = categories.filter((category) => (category.marketCap ?? 0) > 0)
      return limit === undefined ? rated : rated.slice(0, limit)
    },
    CATEGORIES_TTL_SECONDS,
  )
}

/**
 * Plancher de capitalisation des CLASSEMENTS par variation.
 *
 * Dix millions de dollars. Il ne filtre pas le tableau — un annuaire doit être
 * complet — mais uniquement les palmarès « plus fortes hausses / baisses », qui sont
 * une affirmation éditoriale et non une liste.
 *
 * La raison est arithmétique : sur une base de quelques milliers de dollars, un seul
 * échange déplace le pourcentage de plusieurs dizaines de points. Sans plancher, la
 * tête du classement était occupée par « Printr Launchpad » (65 000 $, +52 %) et
 * « Kumbaya Launchpad » (54 000 $, +49 %) — du bruit présenté comme un fait de
 * marché. Au-dessus du plancher, 286 des 361 secteurs subsistent et la tête devient
 * lisible : « Arcade Games » (1,3 Md$, +34 %).
 */
export const CATEGORY_RANKING_FLOOR_USD = 10_000_000

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
