/**
 * API orientée usage, consommée par les pages.
 *
 * Chaque fonction renvoie un `DataResult` plutôt que de lever une exception : une
 * source indisponible est un cas NORMAL sur un site multi-sources (§5), pas un
 * incident. Le type force l'appelant à traiter l'absence, ce qui rend
 * structurellement impossible l'affichage d'un chiffre non sourcé.
 */

import { CACHE_TTL_SECONDS, cache, cached } from './cache'
import { CURRENCY_CODES } from './currencies'
import { recordMarketCap } from './market-cap-series'
import { getBinanceHistoryBySymbol, getBinanceOhlcBySymbol } from './providers/binance'
import { fetchCoinGeckoRates } from './providers/coingecko'
import { COINPAPRIKA_SOURCE, fetchNewListings } from './providers/coinpaprika'
import {
  TRACKED_NFT_COLLECTIONS,
  fetchNftCollection,
  fetchTokenizedStocks,
  fetchTreasuries,
  tokensForStock,
  type TokenizedStock,
  type TreasuryCoin,
} from './providers/coingecko-extras'
import { fetchExchangeRates } from './providers/frankfurter'
import {
  fetchPool,
  fetchPoolUniverse,
  fetchTokenPools,
  fetchTrendingPools,
  networkFromPlatform,
} from './providers/geckoterminal'
import { NEWS_SOURCES, fetchNews, fetchSymbolNews } from './providers/news'
import {
  WORLDBANK_SOURCE,
  fetchMacroIndicator,
  type MacroObservation,
} from './providers/worldbank'
import { fetchAssetProfile, type AssetProfile } from './providers/yahoo-profile'
import {
  fetchBondFundScreen,
  fetchEtfScreen,
  fetchStockScreen,
  type YahooScreenRow,
} from './providers/yahoo-screener'
import { findUniverseEntry, findUniverseEntryBySymbol, toSlug } from './providers/yahoo-universe'
import {
  DEFILLAMA_SOURCE,
  fetchStablecoinHistory,
  type StablecoinPoint,
} from './providers/defillama'
import {
  SENTIMENT_SOURCE,
  fetchSentiment,
  fetchSentimentHistory,
} from './providers/sentiment'
import {
  YOUTUBE_SOURCE,
  fetchLessonVideos,
  hasYoutubeKey,
  type LessonVideo,
} from './providers/youtube'
import {
  getDeclaredProvider,
  getFallbackProviders,
  getProvider,
  type ProviderCapability,
} from './registry'
import type {
  AssetClass,
  AssetDetail,
  AssetTicker,
  DexPool,
  GlobalMarketStats,
  MarketAsset,
  MarketCategory,
  NewListing,
  NftCollection,
  TreasuryReport,
  NewsItem,
  SpotExchange,
  OhlcHistory,
  PriceHistory,
  DerivativeExchange,
  ExchangeProfile,
  DerivativeMarket,
  SentimentIndex,
  SentimentPoint,
  SortDirection,
  TrendingAsset,
} from './types'
import { ProviderError } from './types'

export interface DataSource {
  label: string
  attributionUrl: string
}

/**
 * Attribution de la source on-chain.
 *
 * Déclarée ici plutôt que dans le fournisseur, comme `NEWS_SOURCES` l'est dans le
 * sien : ce libellé est ce que le lecteur VOIT sous chaque tableau de pools, et le
 * §5 en fait une obligation. Le laisser au fournisseur reviendrait à le rendre
 * optionnel à l'appel.
 */
const GECKOTERMINAL_SOURCE: DataSource = {
  label: 'GeckoTerminal',
  attributionUrl: 'https://www.geckoterminal.com',
}

/**
 * `notFound` est un état À PART, distinct de `error`.
 *
 * « Cet actif n'existe pas » et « la source ne répond pas » appellent deux réactions
 * opposées : la première doit produire un 404 et sortir l'URL de l'index, la seconde
 * doit garder l'URL et inviter à revenir. Les confondre, c'est soit indexer des
 * milliers de pages d'actifs imaginaires, soit désindexer un catalogue entier le jour
 * d'une panne.
 */
export type DataResult<T> =
  | { ok: true; data: T; source: DataSource }
  | {
      ok: false
      kind: 'unconfigured' | 'error' | 'notFound'
      reason: string
      source: DataSource | null
    }

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
 * Lignes servies AVEC la page d'accueil, courbes comprises.
 *
 * ── POURQUOI 250, ET PAS PLUS ─────────────────────────────────────────────────
 *
 * C'est le plafond de `per_page` chez CoinGecko : au-delà il faut enchaîner les
 * appels, et le tableau d'accueil est rendu dans une page STATIQUE régénérée toutes
 * les trois minutes — chaque appel supplémentaire est prélevé sur un quota qui en
 * tolère cinq par minute pour l'ensemble du site.
 *
 * ── POURQUOI 250 EST DÉSORMAIS TENABLE, ALORS QUE 100 ÉTAIT LA LIMITE ────────
 *
 * L'ancienne note disait vrai : à 250 actifs, la réponse dépassait deux mégaoctets.
 * Le poids n'était pas dans les actifs mais dans leurs COURBES — 168 relevés horaires
 * chacune, sérialisés vers un composant client. `thinSparkline` les ramène à
 * `SPARKLINE_POINTS`, ce qui divise la charge par trois pour une vignette de 120 px
 * de large où la différence est invisible.
 *
 * Le reste du catalogue — la source en annonce plus de dix-neuf mille — n'est PAS
 * servi ici : il est atteint page par page par `getCryptoBoardPage`, appelé à la
 * demande depuis le navigateur quand le lecteur dépasse ces 250 lignes.
 */
export const BOARD_UNIVERSE_SIZE = 250

/**
 * Points conservés par courbe de tableau.
 *
 * CoinGecko en publie 168 (sept jours au pas horaire) pour une vignette large de
 * 120 px : un point tous les 0,7 pixel, dont le navigateur ne peut rien faire. En
 * garder un sur trois donne 56 points, soit un tous les deux pixels — au-delà de ce
 * que l'œil distingue à cette taille, et le tiers du poids sur le fil.
 *
 * ⚠️ L'ÉCHANTILLONNAGE GARDE TOUJOURS LE DERNIER POINT. Un pas régulier qui s'arrête
 * avant la fin couperait les dernières heures de la série — c'est-à-dire précisément
 * celles que le lecteur compare à la variation 24 h affichée juste à côté.
 */
const SPARKLINE_POINTS = 56

/**
 * Allège la courbe d'un actif, sans toucher au reste.
 *
 * Rend un OBJET NEUF plutôt que de modifier celui reçu : ces actifs finissent dans
 * le cache applicatif, et une fonction qui réduit en place ne serait pas idempotente
 * — la rejouer sur une entrée déjà allégée la réduirait encore.
 */
function thinSparkline(asset: MarketAsset): MarketAsset {
  const values = asset.sparkline7d
  if (!values || values.length <= SPARKLINE_POINTS) return asset

  const step = (values.length - 1) / (SPARKLINE_POINTS - 1)
  const kept: number[] = []
  for (let index = 0; index < SPARKLINE_POINTS; index += 1) {
    kept.push(values[Math.round(index * step)] as number)
  }

  return { ...asset, sparkline7d: kept }
}

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
  /**
   * Préfère `provider.fastTtlSeconds` à `ttlSeconds` quand le fournisseur en
   * déclare un. Réservé aux requêtes à faible cardinalité (classement,
   * statistiques globales) : c'est le fournisseur, pas cet appelant générique, qui
   * sait si sa source a la marge de quota pour aller plus vite (§4 — isolation par
   * adaptateur).
   */
  preferFast = false,
  /**
   * Méthode réellement appelée par `fetcher`, quand un SECOURS est souhaité.
   *
   * Omise, la requête garde le comportement historique : un échec produit un état
   * d'erreur. Renseignée, l'échec déclenche une tentative auprès des fournisseurs
   * qui couvrent la même classe et implémentent cette méthode (voir plus bas).
   */
  capability?: ProviderCapability,
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

  const effectiveTtl = preferFast && provider.fastTtlSeconds ? provider.fastTtlSeconds : ttlSeconds

  try {
    const data = await cached(cacheKey, () => fetcher(provider), effectiveTtl)
    return {
      ok: true,
      data,
      source: { label: provider.label, attributionUrl: provider.attributionUrl },
    }
  } catch (error) {
    const detail = error instanceof ProviderError ? error.message : String(error)

    /*
     * ── LE NIVEAU SUIT LA NATURE DE L'ÉCHEC ─────────────────────────────────
     *
     * Tout passait en ERREUR, y compris « cette source ne publie pas cette donnée ».
     * Chaque rendu de fiche d'action, d'ETF, de devise ou d'indice écrivait donc une
     * ligne rouge pour une absence permanente et attendue — Yahoo n'a pas de carnet
     * d'ordres, la BCE non plus, et cela ne changera pas.
     *
     * Une console où une ligne rouge paraît à chaque page est une console qu'on cesse
     * de lire. Le bruit ne gêne pas seulement : il cache. Voir `ProviderError.unsupported`
     * pour les trois natures d'échec et ce qui les distingue.
     */
    if (error instanceof ProviderError && error.unsupported) {
      console.debug(`[zenkuu:data] ${cacheKey} — ${detail}`)
    } else {
      console.error(`[zenkuu:data] ${cacheKey} — ${detail}`)
    }

    // Inexistence AVANT panne : un identifiant inconnu n'est pas un incident, et le
    // confondre avec une indisponibilité produit une page « revenez plus tard » pour
    // une ressource qui ne reviendra jamais.
    if (error instanceof ProviderError && error.notFound) {
      return {
        ok: false,
        kind: 'notFound',
        reason: `Cet identifiant n’existe pas chez ${provider.label}.`,
        source,
      }
    }

    /*
     * ── SECOURS AUPRÈS D'UNE AUTRE SOURCE ──────────────────────────────────────
     *
     * On n'arrive ici QUE si `cached` n'avait aucune valeur périmée à servir : son
     * propre filet s'est déjà appliqué en amont. Autrement dit, ce chemin est celui
     * d'une page FROIDE dont la source principale est muette — exactement le cas
     * du robot d'indexation qui ouvre des fiches en rafale et déclenche un 429.
     *
     * CLÉ DE CACHE DISTINCTE, et c'est important : mémoriser la réponse du secours
     * sous la clé du fournisseur principal ferait resservir plus tard de la donnée
     * Binance sous l'attribution CoinGecko. Chaque source garde donc son propre
     * filet, et l'attribution renvoyée suit la source qui a RÉELLEMENT répondu.
     */
    if (capability) {
      for (const fallback of getFallbackProviders(assetClass, capability)) {
        try {
          const data = await cached(
            `${cacheKey}:via-${fallback.id}`,
            () => fetcher(fallback),
            effectiveTtl,
          )

          console.warn(
            `[zenkuu:data] ${cacheKey} — ${provider.label} muet, servi par ${fallback.label}`,
          )

          return {
            ok: true,
            data,
            source: { label: fallback.label, attributionUrl: fallback.attributionUrl },
          }
        } catch (fallbackError) {
          // Un secours qui échoue à son tour ne doit pas masquer la panne d'origine :
          // on note, et on laisse la boucle tenter le suivant s'il y en a un.
          console.error(
            `[zenkuu:data] ${cacheKey} — secours ${fallback.label} en échec : ${String(fallbackError)}`,
          )
        }
      }
    }

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
    console.error(`[zenkuu:data] ${cacheKey} — ${String(error)}`)
    return { ok: false, kind: 'error', reason: `Source ${source.label} indisponible.`, source }
  }
}

/* ── Statistiques globales ─────────────────────────────────────────────────── */

export async function getCryptoGlobalStats(
  currency = 'eur',
): Promise<DataResult<GlobalMarketStats>> {
  const result = await run(
    'crypto',
    `crypto:global:${currency}`,
    (provider) => {
      if (!provider.getGlobalStats) {
        throw new ProviderError(provider.id, 'Statistiques globales non supportées', { unsupported: true })
      }
      return provider.getGlobalStats(currency)
    },
    CACHE_TTL_SECONDS,
    true,
  )

  // Chaque lecture réussie alimente notre propre série historique — seule façon
  // d'obtenir une courbe de capitalisation globale sans source payante.
  // L'enregistrement est volontairement placé ICI plutôt que dans l'adaptateur :
  // il doit capter aussi les lectures servies par le cache, sinon la série se
  // limiterait aux rares instants où le cache expire.
  if (result.ok) {
    // Le volume voyage dans la MÊME réponse : le relever au même instant garantit
    // que les deux courbes portent sur le même point de mesure, ce qu'un second
    // enregistrement ailleurs ne pourrait pas assurer.
    /* La dominance suit le même raisonnement, et pour la même raison : elle voyage
       dans cette réponse, et aucune source gratuite n'en publie l'historique. */
    recordMarketCap(
      result.data.currency,
      result.data.totalMarketCap,
      Date.now(),
      result.data.totalVolume24h,
      result.data.dominance?.['btc'],
    )
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
    CACHE_TTL_SECONDS,
    // Le classement crypto est LA page la plus visitée et la moins nombreuse en
    // clés de cache (quelques tris × devises) : c'est le cas idéal pour la
    // fraîcheur accélérée. Les autres classes d'actifs (Yahoo) gardent le TTL
    // standard — source non officielle, marge de quota différente (§9).
    assetClass === 'crypto',
    // Secours autorisé : c'est la requête la plus exposée du site, et la seule que
    // Binance sache servir en entier. Le classement de secours est plus court (les
    // actifs de la table de correspondance) et sans capitalisation — dégradé, mais
    // juste et attribué.
    'listAssets',
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
      if (!provider.getTrending) throw new ProviderError(provider.id, 'Tendances non supportées', { unsupported: true })
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
    const fetched = await provider.listAssets({
      assetClass: 'crypto',
      page: 1,
      perPage: BOARD_UNIVERSE_SIZE,
      sortBy: 'marketCap',
      sortDirection: 'desc',
      currency,
      // Courbes incluses : ce même appel alimente le tableau de l'accueil, ce qui
      // supprime une requête entière sur un budget qui n'en autorise qu'une poignée.
      withSparkline: true,
    })

    const universe = fetched.map(thinSparkline)

    /*
     * ── LES MOUVEMENTS RESTENT CALCULÉS SUR LES CENT PREMIÈRES ────────────────
     *
     * L'univers servi au tableau est passé de 100 à 250 lignes. Classer les hausses
     * et les baisses sur ces 250 changerait ce qu'affichent la rangée de repères et
     * les blocs du bas — sans que rien ne l'ait demandé, et en y faisant entrer des
     * capitalisations nettement plus petites, où une variation de +200 % sur un
     * carnet vide n'a pas le même sens.
     *
     * La tranche est donc reprise explicitement : le tableau s'élargit, les palmarès
     * gardent leur périmètre, et `MOVERS_UNIVERSE_SIZE` continue de dire ce qu'il dit.
     */
    const ranked = universe
      .slice(0, MOVERS_UNIVERSE_SIZE)
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
      /*
       * L'UNIVERS ENTIER, ET IL NE COÛTE RIEN DE PLUS EN RÉSEAU.
       *
       * `universe` compte `MOVERS_UNIVERSE_SIZE` actifs (100), courbes 7 jours
       * comprises : ils sont en mémoire, payés par l'appel juste au-dessus. En rendre
       * une partie revient à jeter des lignes déjà téléchargées.
       *
       * IL EN RENDAIT CINQUANTE, et la borne était le poids de la charge utile — ce
       * tableau est un composant CLIENT, chaque actif traverse la frontière serveur
       * avec sa courbe. Elle tombe parce que l'accueil affiche désormais le TOP 100
       * annoncé par son titre, paginé côté client : sans les cent lignes ici, sa
       * page 3 n'aurait rien à montrer.
       *
       * Ce qui est payé en plus est donc la sérialisation de cinquante lignes, une
       * fois toutes les trois minutes pour tout le monde — la page est statique. Le
       * réseau amont, lui, est identique au précédent : le même appel, le même quota.
       */
      topByMarketCap: universe,
      /*
       * ⚠️ LA TAILLE DES MOUVEMENTS, PAS CELLE DU TABLEAU — et les deux ont divergé.
       *
       * Ce champ n'est lu que par des PHRASES qui qualifient les palmarès : « Parmi
       * les N plus grandes capitalisations » sous les hausses et les baisses, et la
       * note de `/crypto`. Il doit donc valoir l'univers sur lequel ces classements
       * ont réellement été établis.
       *
       * Tant que le tableau et les palmarès partageaient le même univers, `length`
       * répondait. Le tableau est passé à 250 lignes, les palmarès sont restés à 100
       * (voir juste au-dessus) : rendre `length` ferait annoncer « parmi les 250 »
       * un classement calculé sur cent. Le `min` couvre le cas où la source en
       * renverrait moins que demandé — la phrase dit alors ce qui existe.
       */
      universeSize: Math.min(universe.length, MOVERS_UNIVERSE_SIZE),
    }
  })
}

/**
 * UNE PAGE QUELCONQUE DU CLASSEMENT CRYPTO, courbes comprises.
 *
 * ── CE QU'ELLE RÉSOUT ─────────────────────────────────────────────────────────
 *
 * `getCryptoOverview` sert les 250 premières capitalisations AVEC la page d'accueil,
 * et c'est le maximum qu'un seul appel autorise. La source en publie plus de dix-neuf
 * mille : sans cette fonction, le tableau de l'accueil s'arrêterait à sa dixième page
 * et le lecteur n'aurait aucun moyen d'atteindre la suivante depuis là.
 *
 * Elle est appelée par la route `/api/cotations`, elle-même appelée par le navigateur
 * quand le lecteur DEMANDE une page au-delà de ce qui a été servi. C'est ce qui permet
 * à l'accueil de rester STATIQUE — donc mise en cache une fois pour tous les visiteurs
 * — tout en donnant accès au catalogue entier. Lire le numéro de page dans l'URL de la
 * page aurait le même effet visible et coûterait ce cache, plus un appel amont par
 * visiteur et par page (voir `CryptoBoard`).
 *
 * ── LE CACHE EST INDEXÉ SUR LES TROIS PARAMÈTRES ─────────────────────────────
 *
 * Deux visiteurs qui demandent la page 12 à 25 lignes partagent donc une seule
 * réponse. Le sélecteur de lignes en ouvre une par cran, ce qui reste borné : trois
 * crans, et seules les pages réellement visitées sont peuplées.
 */
export function getCryptoBoardPage(
  page: number,
  perPage: number,
  currency = 'eur',
): Promise<DataResult<MarketAsset[]>> {
  /* Bornes appliquées ICI et non au point d'entrée seulement : cette fonction est
     exportée, et un appelant futur ne doit pas pouvoir demander mille lignes — la
     source refuserait, et la clé de cache serait déjà ouverte. */
  const safePage = Math.max(1, Math.floor(page))
  const safePerPage = Math.min(Math.max(Math.floor(perPage), 1), 250)

  return run('crypto', `crypto:board:${currency}:${safePage}:${safePerPage}`, async (provider) => {
    const batch = await provider.listAssets({
      assetClass: 'crypto',
      page: safePage,
      perPage: safePerPage,
      sortBy: 'marketCap',
      sortDirection: 'desc',
      currency,
      withSparkline: true,
    })

    return batch.map(thinSparkline)
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
      throw new ProviderError(provider.id, 'Fiche détaillée non supportée', { unsupported: true })
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
        throw new ProviderError(provider.id, 'Places de cotation non publiées par la source', { unsupported: true })
      }
      return provider.getTickers(id, currency, limit)
    },
    1800,
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PROFONDEUR MAXIMALE DE COINGECKO, ET CE QUI PREND LE RELAIS AU-DELÀ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE PLAFOND EST DUR, ET IL N'EST PAS UNE PANNE ────────────────────────────
 *
 * Le palier public de CoinGecko REFUSE toute fenêtre de plus de 365 jours :
 * « Public API users are limited to querying historical data within the past 365
 * days » (erreur 10012, relevée sur l'API le 24 août 2026). Une clé « demo »
 * n'y change rien — seuls les paliers payants ouvrent l'historique complet.
 *
 * Conséquence observée : le palier « MAX » de la fiche demandait 3 650 jours,
 * n'obtenait jamais rien, et le graphique affichait « Historique de cours
 * indisponible pour cet actif » sur TOUTES les cryptomonnaies, Bitcoin compris.
 * Ce n'était pas une indisponibilité passagère : c'était permanent.
 *
 * ── D'OÙ VIENT L'HISTOIRE LONGUE ────────────────────────────────────────────
 *
 * De Binance, qui sert ses bougies depuis la première cotation de la paire, sans
 * clé ni quota sérieux. Deux précautions, sans lesquelles ce serait une régression :
 *
 *   1. LE SYMBOLE N'EST JAMAIS DEVINÉ. Il est lu dans les COTATIONS que CoinGecko
 *      publie pour l'actif — la source qui fait autorité sur son identité. Deviner
 *      « HYPEUSDT » depuis un symbole d'actif afficherait tôt ou tard le cours
 *      d'une contrefaçon homonyme sous le nom d'un actif connu (§5).
 *   2. LA DEVISE EST RAMENÉE À CELLE QUI A ÉTÉ DEMANDÉE. Binance cote en USDT,
 *      l'appelant demande le plus souvent des euros, et le graphique suppose que
 *      ses points sont DÉJÀ dans la devise de la fiche — voir `usdToSeries` dans
 *      `AssetWorkspace`. Servir des dollars sous une étiquette « EUR » dessinerait
 *      un décrochage de cours qui n'a jamais eu lieu. Sans taux de change
 *      disponible, on renonce au chemin profond plutôt que de convertir au hasard.
 *
 * Quand rien de tout cela n'aboutit — actif absent de Binance, taux manquant — la
 * demande retombe sur les 365 jours que CoinGecko sert réellement. Une courbe d'un
 * an vaut mieux qu'un message d'erreur, et `days` renvoyé dit la vérité sur ce qui
 * est tracé.
 */
const COINGECKO_MAX_HISTORY_DAYS = 365

/** Devises de cotation assimilables au dollar — voir l'en-tête de `binance.ts`. */
const BINANCE_USD_QUOTES = ['USDT', 'FDUSD', 'USDC', 'BUSD']

/** L'histoire longue d'une paire ne bouge qu'à la marge : une heure de cache. */
const DEEP_HISTORY_TTL_SECONDS = 3600

/** La paire d'un actif ne change jamais : une journée de cache. */
const BINANCE_PAIR_TTL_SECONDS = 86_400

/**
 * Paire Binance d'un actif, telle que CoinGecko la déclare — ou `null`.
 *
 * `null` et non une exception : « cet actif ne se négocie pas sur Binance » est un
 * fait ordinaire, pas un incident. L'appelant retombe alors sur la fenêtre courte.
 */
async function resolveBinancePair(id: string): Promise<string | null> {
  return cached(
    `crypto:binance-pair:${id}`,
    async () => {
      const provider = getProvider('crypto')
      if (!provider?.getTickers) return null

      // 100 lignes et non 10 : les cotations sont triées par volume, et une paire
      // Binance secondaire (HYPE/FDUSD) peut se trouver au-delà des dix premières.
      const tickers = await provider.getTickers(id, 'usd', 100)

      const match = tickers.find(
        (ticker) =>
          ticker.exchangeId === 'binance' &&
          BINANCE_USD_QUOTES.includes(ticker.target?.toUpperCase() ?? ''),
      )

      if (!match?.base || !match.target) return null
      return `${match.base}${match.target}`.toUpperCase()
    },
    BINANCE_PAIR_TTL_SECONDS,
  )
}

/**
 * Histoire longue via Binance, déjà convertie — ou `null` si ce chemin n'aboutit pas.
 */
async function deepCryptoHistory(
  id: string,
  days: number,
  currency: string,
): Promise<DataResult<PriceHistory> | null> {
  try {
    const symbol = await resolveBinancePair(id)
    if (!symbol) return null

    const target = currency.toUpperCase()

    const data = await cached(
      `crypto:history-deep:${id}:${days}:${currency}`,
      async () => {
        const history = await getBinanceHistoryBySymbol(symbol, days)
        if (target === 'USD') return history

        const rates = await getExchangeRates()
        const toTarget = rates.ok ? rates.data.rates[target] : undefined
        const toUsd = rates.ok ? rates.data.rates.USD : undefined
        if (!toTarget || !toUsd) {
          throw new Error(`Taux ${target} indisponible pour l’historique profond`)
        }

        // Taux du JOUR appliqué à toute la série — même approximation que celle que
        // le graphique fait déjà sur le cours en direct (`usdToSeries`), et la seule
        // possible sans série de change historique.
        const factor = toTarget / toUsd
        return {
          ...history,
          currency: target,
          points: history.points.map((point) => ({
            ...point,
            price: point.price * factor,
            ...(point.volume === undefined ? {} : { volume: point.volume * factor }),
          })),
        }
      },
      DEEP_HISTORY_TTL_SECONDS,
    )

    return {
      ok: true,
      data,
      source: { label: 'Binance', attributionUrl: 'https://www.binance.com' },
    }
  } catch (error) {
    console.warn(
      `[zenkuu:data] crypto:history-deep:${id}:${days} — ${String(error)} ; repli sur ${COINGECKO_MAX_HISTORY_DAYS} j`,
    )
    return null
  }
}

/** Bougies longues via Binance — jumelle de `deepCryptoHistory`, mêmes garde-fous. */
async function deepCryptoOhlc(
  id: string,
  days: number,
  currency: string,
): Promise<DataResult<OhlcHistory> | null> {
  try {
    const symbol = await resolveBinancePair(id)
    if (!symbol) return null

    const target = currency.toUpperCase()

    const data = await cached(
      `crypto:ohlc-deep:${id}:${days}:${currency}`,
      async () => {
        const history = await getBinanceOhlcBySymbol(symbol, days)
        if (target === 'USD') return history

        const rates = await getExchangeRates()
        const toTarget = rates.ok ? rates.data.rates[target] : undefined
        const toUsd = rates.ok ? rates.data.rates.USD : undefined
        if (!toTarget || !toUsd) {
          throw new Error(`Taux ${target} indisponible pour les bougies profondes`)
        }

        const factor = toTarget / toUsd
        return {
          ...history,
          currency: target,
          candles: history.candles.map((candle) => ({
            timestamp: candle.timestamp,
            open: candle.open * factor,
            high: candle.high * factor,
            low: candle.low * factor,
            close: candle.close * factor,
          })),
        }
      },
      DEEP_HISTORY_TTL_SECONDS,
    )

    return {
      ok: true,
      data,
      source: { label: 'Binance', attributionUrl: 'https://www.binance.com' },
    }
  } catch (error) {
    console.warn(
      `[zenkuu:data] crypto:ohlc-deep:${id}:${days} — ${String(error)} ; repli sur ${COINGECKO_MAX_HISTORY_DAYS} j`,
    )
    return null
  }
}

export async function getAssetHistory(
  id: string,
  assetClass: AssetClass,
  days: number,
  currency = 'eur',
): Promise<DataResult<PriceHistory>> {
  if (assetClass === 'crypto' && days > COINGECKO_MAX_HISTORY_DAYS) {
    const deep = await deepCryptoHistory(id, days, currency)
    if (deep) return deep

    // Repli : la profondeur demandée n'existe pas, on sert la plus grande qui existe.
    days = COINGECKO_MAX_HISTORY_DAYS
  }

  return run(
    assetClass,
    `${assetClass}:history:${id}:${days}:${currency}`,
    (provider) => {
      if (!provider.getHistory) {
        throw new ProviderError(provider.id, 'Historique non supporté', { unsupported: true })
      }
      return provider.getHistory(id, days, assetClass, currency)
    },
    CACHE_TTL_SECONDS,
    false,
    // Le graphique d'une fiche froide est la seconde victime d'un 429 après le
    // classement. Binance rend une série de clôtures pour les actifs de sa table ;
    // hors table, il lève et l'état d'erreur d'origine reprend la main.
    'getHistory',
  )
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
export async function getAssetOhlc(
  id: string,
  assetClass: AssetClass,
  days: number,
  currency = 'eur',
): Promise<DataResult<OhlcHistory>> {
  /* Même plafond, même relais que pour la courbe — voir `COINGECKO_MAX_HISTORY_DAYS`.
     Sans cela, basculer en chandeliers sur « MAX » ramenait le message d'erreur que
     la courbe venait d'éviter. */
  if (assetClass === 'crypto' && days > COINGECKO_MAX_HISTORY_DAYS) {
    const deep = await deepCryptoOhlc(id, days, currency)
    if (deep) return deep
    days = COINGECKO_MAX_HISTORY_DAYS
  }

  return run(
    assetClass,
    `${assetClass}:ohlc:${id}:${days}:${currency}`,
    (provider) => {
      if (!provider.getOhlc) {
        throw new ProviderError(provider.id, 'Bougies non supportées', { unsupported: true })
      }
      return provider.getOhlc(id, days, assetClass, currency)
    },
    CACHE_TTL_SECONDS,
    false,
    'getOhlc',
  )
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
    throw new ProviderError(provider.id, 'Catégories non supportées', { unsupported: true })
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
/**
 * Les actifs qui COMPOSENT un secteur.
 *
 * C'est ce qui transforme une ligne de classement sectoriel en objet consultable :
 * sans cela, « IA » est un nom et un pourcentage, et le lecteur n'a aucun moyen de
 * savoir de quels jetons on parle.
 *
 * `categoryId` finit dans la clé de cache. Il vient d'un segment d'URL, donc de
 * l'extérieur : sans borne, chaque identifiant inventé ouvrirait une entrée de cache
 * et un appel réseau. La longueur est donc plafonnée, et le jeu de caractères réduit
 * à celui que la source emploie réellement pour ses identifiants.
 */
export function getCategoryAssets(
  categoryId: string,
  currency = 'eur',
  perPage = 50,
  page = 1,
): Promise<DataResult<MarketAsset[]>> {
  const safeId = categoryId.slice(0, 64).toLowerCase()

  if (!/^[a-z0-9-]+$/.test(safeId)) {
    return Promise.resolve({
      ok: false,
      kind: 'error',
      reason: 'Identifiant de secteur invalide.',
      source: describe('crypto'),
    })
  }

  const size = Math.min(Math.max(perPage, 1), 250)
  const index = Math.max(page, 1)

  return run(
    'crypto',
    `crypto:category:${safeId}:${currency}:${size}:${index}`,
    (provider) =>
      provider.listAssets({
        assetClass: 'crypto',
        category: safeId,
        currency,
        perPage: size,
        page: index,
        sortBy: 'marketCap',
        sortDirection: 'desc',
        withSparkline: true,
      }),
    CATEGORIES_TTL_SECONDS,
  )
}

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

/**
 * Taille du RÉSERVOIR mis en cache, indépendante de ce que demande l'appelant.
 *
 * ── POURQUOI L'AGRANDIR NE COÛTE AUCUNE REQUÊTE ──────────────────────────────
 *
 * C'est le point contre-intuitif de ce réglage, et il commande tout le reste :
 * `fetchNews` interroge TOUS les flux quel que soit le nombre demandé, puis tranche.
 * La limite ne réduit donc pas le trafic sortant — elle jette de la donnée déjà
 * téléchargée. Passer de 240 à 700 ne change pas le nombre d'appels : il reste de un
 * par flux et par collecte, mise en cache pour tout le site.
 *
 * ── ET POURQUOI IL FALLAIT L'AGRANDIR ────────────────────────────────────────
 *
 * 240, c'était huit articles pour chacun des vingt-neuf flux d'alors. La liste en
 * compte désormais quarante-deux, et les mêmes 240 seraient retombés à cinq par
 * source — soit MOINS de matière par flux qu'avant l'élargissement, ce qui aurait
 * annulé l'ajout.
 *
 * 700 ≈ dix-sept articles par flux, en tenant compte de ce que les flux servent
 * réellement (mesuré : de 10 à 94 articles selon l'éditeur, une vingtaine en médiane).
 * C'est la profondeur à partir de laquelle un actif hors des dix premières
 * capitalisations est nommé quelque part.
 *
 * ── CE QUE CELA COÛTE VRAIMENT ───────────────────────────────────────────────
 *
 * De la mémoire de cache : sept cents articles font environ 400 ko de JSON, gardés
 * trois minutes. Et rien de plus — les vignettes manquantes sont complétées APRÈS la
 * découpe, sur un lot borné, pas sur le réservoir entier.
 */
export const NEWS_POOL = 700

/**
 * Fil d'actualités agrégé.
 *
 * ── UNE SEULE CLÉ DE CACHE, QUELLE QUE SOIT LA LIMITE ─────────────────────────
 *
 * La clé valait `news:${limit}`. Elle produisait une entrée de cache PAR TAILLE
 * demandée — et comme `fetchNews` interroge de toute façon les vingt-neuf flux avant
 * de trancher, chaque taille déclenchait un balayage RSS complet. L'accueil en
 * demandait 6, la fiche d'actif 40, la page d'actualités davantage : trois balayages
 * de vingt-neuf requêtes sortantes chacun, pour exactement la même donnée.
 *
 * On met donc en cache le réservoir, une fois, et l'on tranche à la sortie. Le coût
 * réseau du site est divisé par le nombre de tailles distinctes, et ajouter un
 * appelant avec une nouvelle limite ne coûte plus rien.
 *
 * La découpe se fait APRÈS le cache et non dedans : `runStandalone` mémorise ce que
 * lui rend le producteur, et trancher à l'intérieur reviendrait à mémoriser la
 * découpe plutôt que le réservoir.
 */
export async function getNews(limit = 8): Promise<DataResult<NewsItem[]>> {
  const result = await runStandalone(
    'news',
    { label: NEWS_SOURCES, attributionUrl: 'https://cointelegraph.com' },
    () => fetchNews(NEWS_POOL),
    NEWS_TTL_SECONDS,
  )

  if (!result.ok) return result
  return { ...result, data: result.data.slice(0, limit) }
}

/**
 * Symbole Yahoo d'un actif, pour son flux d'actualités dédié.
 *
 * ── UNE CONVENTION PAR CLASSE, ET AUCUNE N'EST DEVINÉE ──────────────────────
 *
 * Yahoo nomme ses instruments selon des règles fixes, et notre univers écrit à la
 * main porte déjà le symbole EXACT pour tout ce qui n'est pas de la crypto — c'est
 * lui qui sert à interroger les cours. On le relit donc plutôt que de le reconstruire :
 * `^GSPC`, `GC=F` et `MC.PA` ne se déduisent d'aucune règle générale.
 *
 * La CRYPTO est le seul cas construit, et sa règle est stable et unique : Yahoo cote
 * chaque jeton contre le dollar, sous `BTC-USD`, `ETH-USD`, `HYPE-USD`. Notre univers
 * ne la couvre pas — les cryptoactifs viennent de CoinGecko, qui en publie des
 * milliers.
 *
 * ── UN SYMBOLE INCONNU REND `null`, ET C'EST UNE RÉPONSE ────────────────────
 *
 * L'appelant se contente alors du fil agrégé. Interroger Yahoo avec un symbole qu'il
 * ne connaît pas rendrait un flux vide au mieux, et les actualités d'un homonyme au
 * pire — ce dernier cas étant exactement le genre de faux que le §5 proscrit.
 */
function yahooNewsSymbol(assetClass: AssetClass, symbol: string): string | null {
  const clean = symbol.trim()
  if (!clean) return null

  if (assetClass === 'crypto') return `${clean.toUpperCase()}-USD`

  /* Le symbole peut arriver sous sa forme Yahoo (`^GSPC`) ou sous celle de nos URL
     (`gspc`). On essaie les deux clés, dans cet ordre : elles ne se confondent pas,
     et une seule fonction acceptant les deux formes masquerait une faute de frappe. */
  const direct = findUniverseEntryBySymbol(clean)
  if (direct) return direct.symbol

  return findUniverseEntry(toSlug(clean))?.entry.symbol ?? null
}

/**
 * Actualités NOMMANT un actif, demandées à la source plutôt que filtrées après coup.
 *
 * Voir `fetchSymbolNews` pour le raisonnement complet : le fil agrégé est un
 * échantillon généraliste, et aucune profondeur ne le rend spécifique. Celui-ci
 * demande l'actif.
 *
 * ── LA CLÉ DE CACHE PORTE LE SYMBOLE, ET C'EST NOUVEAU ──────────────────────
 *
 * `getNews` mémorise UN réservoir pour tout le site. Celui-ci mémorise une entrée par
 * actif consulté, ce qui est le prix de la pertinence — et reste borné par le nombre
 * de fiches réellement visitées, pas par la taille de l'univers.
 *
 * Le TTL est celui du fil agrégé : les deux listes s'affichent côte à côte, et deux
 * fraîcheurs différentes feraient apparaître un article dans l'une avant l'autre.
 */
export async function getAssetNews(
  assetClass: AssetClass,
  symbol: string,
): Promise<DataResult<NewsItem[]>> {
  const yahooSymbol = yahooNewsSymbol(assetClass, symbol)

  if (!yahooSymbol) {
    /* Pas d'échec : l'absence de correspondance est un résultat vide, pas une panne.
       La fiche affiche alors le seul fil agrégé, comme avant l'ajout de celui-ci.

       La source est citée même sur une liste vide — c'est le contrat du type, et
       l'affichage ne se sert de ce champ que s'il y a quelque chose à attribuer. */
    return {
      ok: true,
      data: [],
      source: { label: 'Yahoo Finance', attributionUrl: 'https://finance.yahoo.com' },
    }
  }

  return runStandalone(
    `news:asset:${yahooSymbol}`,
    { label: 'Yahoo Finance', attributionUrl: 'https://finance.yahoo.com' },
    () => fetchSymbolNews(yahooSymbol),
    NEWS_TTL_SECONDS,
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   ON-CHAIN — pools de liquidité (GeckoTerminal)
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * Une minute, et pas les trois du reste du site.
 *
 * Un pool de liquidité bouge à chaque bloc : sa réserve change dès qu'une
 * transaction passe, et la page de référence affiche des variations à cinq minutes.
 * Trois minutes de cache y afficheraient une variation « 5 min » vieille de trois —
 * autrement dit un chiffre faux, pas seulement tiède.
 *
 * Une minute reste tenable pour le quota : à vingt-quatre appels par minute, il
 * faudrait vingt-quatre pools DISTINCTS consultés dans la même minute pour saturer,
 * et les pools consultés se comptent sur les doigts d'une main.
 */
const POOLS_TTL_SECONDS = 60

/**
 * Pools d'un jeton, pour une plateforme CoinGecko donnée.
 *
 * Prend l'identifiant de chaîne de CoinGecko — celui que porte `AssetDetail.contracts`
 * — et non celui de GeckoTerminal : c'est le seul que l'appelant possède, et lui faire
 * traduire reviendrait à disperser la table de correspondance dans les pages.
 *
 * Une plateforme inconnue n'est PAS une erreur de la source mais une limite de notre
 * table. Le message le dit ainsi, pour qu'on ne cherche pas la panne du mauvais côté.
 */
export function getTokenPools(
  platform: string,
  tokenAddress: string,
): Promise<DataResult<DexPool[]>> {
  const network = networkFromPlatform(platform)

  if (!network) {
    return Promise.resolve({
      ok: false,
      /* `unconfigured` et non `error` : rien n'est en panne, il manque une ligne dans
         notre table de correspondance. Les deux états ne se traitent pas pareil — une
         erreur invite à réessayer, une lacune de configuration invite à l'écrire. */
      kind: 'unconfigured',
      reason: `La chaîne « ${platform} » n’est pas encore reliée à notre source on-chain.`,
      source: GECKOTERMINAL_SOURCE,
    })
  }

  return getPoolsOnNetwork(network, tokenAddress)
}

/**
 * Même chose, mais depuis l'identifiant de chaîne de GeckoTerminal.
 *
 * Séparée de `getTokenPools` plutôt que devinée par la forme de la chaîne reçue : les
 * deux nomenclatures se recoupent — `base`, `solana`, `celo` s'écrivent pareil des
 * deux côtés — et une fonction qui essaierait de reconnaître laquelle on lui passe se
 * tromperait précisément sur ces cas-là, en silence.
 *
 * Sert la fiche de pool, qui tient sa chaîne de l'URL et n'a jamais vu de plateforme
 * CoinGecko.
 */
export function getPoolsOnNetwork(
  network: string,
  tokenAddress: string,
): Promise<DataResult<DexPool[]>> {
  return runStandalone(
    `pools:${network}:${tokenAddress}`,
    GECKOTERMINAL_SOURCE,
    () => fetchTokenPools(network, tokenAddress),
    POOLS_TTL_SECONDS,
  )
}

/** Un pool précis — la fiche détaillée, par chaîne et adresse. */
export function getPool(network: string, address: string): Promise<DataResult<DexPool>> {
  return runStandalone(
    `pool:${network}:${address}`,
    GECKOTERMINAL_SOURCE,
    () => fetchPool(network, address),
    POOLS_TTL_SECONDS,
  )
}

/**
 * Pools en vue — toutes chaînes, ou une seule.
 *
 * Sans chaîne, l'API mêle les réseaux, et c'est l'intérêt : un jeton qui décolle sur
 * une chaîne secondaire n'apparaît dans AUCUN classement centralisé.
 */
export function getTrendingPools(network?: string): Promise<DataResult<DexPool[]>> {
  return runStandalone(
    `pools:trending:${network ?? 'all'}`,
    GECKOTERMINAL_SOURCE,
    () => fetchTrendingPools(network),
    POOLS_TTL_SECONDS,
  )
}

/**
 * Univers de pools pour le SCREENER — cinq pages, toutes chaînes.
 *
 * Distinct de `getTrendingPools`, qui sert un bandeau de vingt lignes. La borne à
 * cinq pages et le motif du dédoublonnage sont détaillés dans `fetchPoolUniverse` :
 * au-delà, un pool porte quelques dizaines de milliers de dollars de réserve, et un
 * filtre non borné remonterait d'abord ce bruit.
 */
export function getPoolUniverse(): Promise<DataResult<DexPool[]>> {
  return runStandalone(
    'pools:universe:v1',
    GECKOTERMINAL_SOURCE,
    fetchPoolUniverse,
    POOLS_TTL_SECONDS,
  )
}

/* ═════════════════════════════════════════════════════════════════════════════
   TRÉSORERIES D'ENTREPRISE ET COLLECTIONS NFT
   ═════════════════════════════════════════════════════════════════════════════ */

const EXTRAS_SOURCE: DataSource = {
  label: 'CoinGecko',
  attributionUrl: 'https://www.coingecko.com',
}

/**
 * Une heure, contre trois minutes pour les cotations.
 *
 * Une trésorerie d'entreprise bouge quand une société publie un achat — quelques fois
 * par mois. Un prix plancher NFT bouge davantage, mais ces pages sont consultées
 * rarement et partagent le quota CoinGecko avec tout le reste du site : rafraîchir
 * toutes les trois minutes dépenserait la marge de l'adaptateur principal pour une
 * précision que personne ne regarde.
 */
const EXTRAS_TTL_SECONDS = 3_600

/**
 * Les jetons qui répliquent une action, pour UNE action donnée.
 *
 * ⚠️ LE CACHE PORTE SUR LE CATALOGUE, PAS SUR L'ACTION. Un seul appel sert toutes les
 * fiches du site pendant une heure ; le rapprochement se fait ensuite en mémoire. Une
 * clé par action multiplierait les appels par le nombre de fiches consultées, pour la
 * même réponse à chaque fois.
 */
export async function getTokenizedStocks(
  symbol: string,
  name: string,
): Promise<DataResult<TokenizedStock[]>> {
  const all = await getAllTokenizedStocks()

  if (!all.ok) return all
  return { ...all, data: tokensForStock(all.data, symbol, name) }
}

/**
 * Le catalogue ENTIER des actions tokenisées — la page « Actifs du monde réel ».
 *
 * MÊME CLÉ DE CACHE que le filtrage par action : c'est le même appel, et la page
 * globale ne coûte donc rien de plus qu'une fiche d'action déjà consultée. Le
 * filtrage de `getTokenizedStocks` se fait en mémoire, après.
 */
export function getAllTokenizedStocks(): Promise<DataResult<TokenizedStock[]>> {
  return runStandalone(
    'tokenized-stocks',
    EXTRAS_SOURCE,
    fetchTokenizedStocks,
    EXTRAS_TTL_SECONDS,
  )
}

/** Sociétés cotées détenant l'actif à leur bilan. Registre DÉCLARATIF (voir le type). */
export function getTreasuries(coin: TreasuryCoin): Promise<DataResult<TreasuryReport>> {
  return runStandalone(
    `treasuries:${coin}`,
    EXTRAS_SOURCE,
    () => fetchTreasuries(coin),
    EXTRAS_TTL_SECONDS,
  )
}

/**
 * SÉLECTION de collections NFT — jamais un classement.
 *
 * ── UN APPEL PAR COLLECTION, ET C'EST LA CONTRAINTE QUI DICTE TOUT ──────────
 *
 * L'endpoint qui classe les collections est réservé à l'offre payante. Seule la fiche
 * d'une collection NOMMÉE est gratuite — d'où une liste arrêtée à la main, et un appel
 * par entrée.
 *
 * `Promise.allSettled` et non `Promise.all` : à dix appels derrière un limiteur à cinq
 * par minute, il est NORMAL qu'une ou deux échouent sur un cache froid. `all`
 * rejetterait alors la liste entière pour une collection manquante, et la page
 * n'afficherait rien là où elle peut en afficher huit.
 *
 * Chaque collection porte sa PROPRE clé de cache : celles qui ont répondu sont
 * conservées, et le rendu suivant ne redemande que les manquantes. Une clé unique pour
 * la liste entière ferait tout retomber à chaque échec partiel.
 */
export async function getNftCollections(): Promise<DataResult<NftCollection[]>> {
  const settled = await Promise.allSettled(
    TRACKED_NFT_COLLECTIONS.map((id) =>
      runStandalone(`nft:${id}`, EXTRAS_SOURCE, () => fetchNftCollection(id), EXTRAS_TTL_SECONDS),
    ),
  )

  const collections = settled
    .filter(
      (outcome): outcome is PromiseFulfilledResult<DataResult<NftCollection>> =>
        outcome.status === 'fulfilled',
    )
    .map((outcome) => outcome.value)
    .filter((result): result is Extract<typeof result, { ok: true }> => result.ok)
    .map((result) => result.data)

  if (collections.length === 0) {
    return {
      ok: false,
      kind: 'error',
      reason: 'Aucune collection n’a répondu. La source limite fortement les appels gratuits.',
      source: EXTRAS_SOURCE,
    }
  }

  /* Tri par capitalisation décroissante — un ordre, pas un classement : la sélection
     est arrêtée à la main, et l'affichage doit le dire. */
  collections.sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))

  return { ok: true, data: collections, source: EXTRAS_SOURCE }
}

/**
 * Devises proposées par le sélecteur.
 *
 * Ce n'était qu'une liste de cinq codes, et cette liste était la vraie limite du
 * sélecteur : la fenêtre de préférences n'affichait que ce qu'elle trouvait ici.
 * Elle est désormais dérivée du catalogue (`currencies.ts`), qui en porte 62.
 *
 * Le nom et le type sont conservés pour ne pas casser les appelants existants —
 * routes d'API qui filtrent les paramètres reçus, convertisseur, page « à propos ».
 */
export const SUPPORTED_CURRENCIES = CURRENCY_CODES
export type SupportedCurrency = string

/**
 * Provenance d'un taux, devise par devise.
 *
 * Portée ligne à ligne et non pour la table entière, parce que la table est
 * MIXTE : impossible d'écrire une attribution unique en pied de page sans mentir
 * sur la moitié des lignes (§5).
 */
export interface RateOrigin {
  source: 'ecb' | 'coingecko'
  /** Date de publication. Un fixing BCE date du jour ouvré précédent ; un cours de marché, de l'instant. */
  date: string
}

export interface ExchangeRates {
  base: string
  /**
   * Date de la table — celle du fixing BCE quand il est disponible.
   *
   * Conservée telle quelle pour les appelants qui l'affichent déjà. Elle ne décrit
   * plus toute la table depuis que CoinGecko en complète une partie : c'est
   * `origins` qui fait foi devise par devise.
   */
  date: string
  /** Valeur de 1 EUR dans chaque devise. */
  rates: Record<string, number>
  /** Provenance et fraîcheur, par code de devise. */
  origins: Record<string, RateOrigin>
}

/**
 * Table de change du site — deux sources, une seule table.
 *
 * ── POURQUOI DEUX SOURCES ─────────────────────────────────────────────────────
 *
 * La BCE est la référence à privilégier : taux officiel, daté, opposable. Mais elle
 * ne publie que 30 monnaies. Les 32 autres devises du catalogue — l'or, l'argent,
 * les 14 unités crypto, le dông, le naira, les DTS — n'y figurent tout simplement
 * pas. Se limiter à la BCE, c'était le sélecteur à cinq devises d'avant.
 *
 * La règle de composition tient en une phrase : LA BCE GAGNE PARTOUT OÙ ELLE PUBLIE,
 * CoinGecko ne comble que les trous. Un lecteur qui convertit en dollars obtient
 * donc toujours le fixing officiel, jamais un cours de marché relevé au hasard de
 * l'heure de la requête.
 *
 * ── CE QUE COÛTE LE MÉLANGE, ET POURQUOI IL EST ACCEPTABLE ────────────────────
 *
 * Convertir USD → BTC emprunte les deux sources : USD → EUR par la BCE, puis
 * EUR → BTC par CoinGecko. Le résultat est un taux croisé, légèrement différent de
 * ce qu'afficherait une place cotant directement la paire. L'écart est de l'ordre
 * du dixième de pour cent sur les monnaies majeures — négligeable devant l'écart
 * entre deux plateformes crypto au même instant, et sans commune mesure avec
 * l'alternative, qui serait de ne pas proposer la conversion.
 *
 * Ce qui n'est PAS acceptable, en revanche, serait de le taire : `origins` remonte
 * la provenance de chaque devise jusqu'à l'interface, qui l'affiche.
 *
 * ── DÉGRADATION ───────────────────────────────────────────────────────────────
 *
 * Les deux sources sont interrogées en parallèle et échouent indépendamment.
 * Une seule qui répond suffit à rendre la table utilisable ; le sélecteur n'affiche
 * alors que les devises réellement convertibles, au lieu d'en proposer qui
 * renverraient un montant inchangé sans le signaler.
 */
export function getExchangeRates(): Promise<DataResult<ExchangeRates>> {
  return runStandalone(
    'fx:rates:merged',
    { label: 'Frankfurter (BCE) et CoinGecko', attributionUrl: 'https://frankfurter.dev' },
    async () => {
      // `allSettled` et non `all` : une source en panne ne doit pas emporter l'autre.
      // Avec `all`, une indisponibilité de Frankfurter — qui est un service bénévole,
      // et qui a été mesuré à plus de vingt secondes de latence — supprimerait aussi
      // l'or et le bitcoin de la table, sans aucun rapport de cause à effet.
      const [ecb, cg] = await Promise.allSettled([
        fetchExchangeRates([...CURRENCY_CODES]),
        fetchCoinGeckoRates(),
      ])

      const rates: Record<string, number> = {}
      const origins: Record<string, RateOrigin> = {}

      // 1. CoinGecko d'abord : il pose le socle large, y compris les devises que la
      //    BCE ignore. Ses valeurs sont cotées en bitcoin, on les ramène en euro par
      //    le pivot — value[X] / value[EUR] donne bien « combien de X vaut 1 EUR ».
      if (cg.status === 'fulfilled') {
        const { perBtc } = cg.value
        const eurPerBtc = perBtc.EUR
        const stamp = new Date().toISOString().slice(0, 10)

        for (const code of CURRENCY_CODES) {
          const value = perBtc[code]
          if (value === undefined || eurPerBtc === undefined) continue
          rates[code] = value / eurPerBtc
          origins[code] = { source: 'coingecko', date: stamp }
        }
      }

      // 2. La BCE écrase ensuite ce qu'elle couvre. L'ordre est le cœur de la règle :
      //    inverser ces deux blocs donnerait la préséance au cours de marché, ce qui
      //    est exactement ce qu'on veut éviter sur les monnaies.
      if (ecb.status === 'fulfilled') {
        for (const [code, value] of Object.entries(ecb.value.rates)) {
          if (!Number.isFinite(value) || value <= 0) continue
          rates[code] = value
          origins[code] = { source: 'ecb', date: ecb.value.date }
        }
      }

      if (Object.keys(rates).length === 0) {
        throw new Error('Aucune source de change disponible')
      }

      // L'euro vaut l'euro. Écrit explicitement plutôt que laissé aux sources : la
      // BCE l'omet (c'est sa base) et une division par elle-même chez CoinGecko
      // donnerait 1 à l'arrondi près, pas 1 exactement.
      rates.EUR = 1
      origins.EUR = { source: 'ecb', date: ecb.status === 'fulfilled' ? ecb.value.date : '' }

      return {
        base: 'EUR',
        date: ecb.status === 'fulfilled' ? ecb.value.date : new Date().toISOString().slice(0, 10),
        rates,
        origins,
      } satisfies ExchangeRates
    },
    FX_TTL_SECONDS,
  )
}

export function getSentiment(): Promise<DataResult<SentimentIndex>> {
  return runStandalone('sentiment:fng', SENTIMENT_SOURCE, fetchSentiment, SENTIMENT_TTL_SECONDS)
}

/**
 * Capitalisation des stablecoins, jour par jour depuis 2017.
 *
 * La SEULE des quatre courbes longues de la référence que nos sources publient
 * réellement — voir l'en-tête de `providers/defillama.ts` pour ce qui n'y figure pas
 * et pourquoi. TTL d'une heure : la série ne bouge qu'une fois par jour et pèse près
 * de trois mille points.
 */
export function getStablecoinHistory(): Promise<DataResult<StablecoinPoint[]>> {
  return runStandalone(
    'defillama:stablecoins',
    DEFILLAMA_SOURCE,
    fetchStablecoinHistory,
    3_600,
  )
}

/**
 * Vidéos illustrant une fiche pédagogique.
 *
 * TTL de 24 HEURES, et c'est le plus long du fichier. Ce n'est pas de la donnée de
 * marché : le corpus YouTube sur « lire un graphique en chandeliers » ne change pas
 * d'une heure à l'autre, et le quota gratuit se compte en unités par jour — chaque
 * recherche en coûte cent (voir l'en-tête de `providers/youtube.ts`). Rafraîchir plus
 * vite dépenserait le quota pour rendre le même résultat.
 *
 * `unconfigured` sans clé, et non `error` : rien n'est en panne, la source n'est
 * simplement pas branchée. La page omet alors la section entière plutôt que d'afficher
 * un cadre vide — c'est la règle du §5, la même que pour les alertes sans Resend.
 */
const LESSON_VIDEO_TTL_SECONDS = 24 * 3_600

export function getLessonVideos(
  query: string,
  limit = 3,
): Promise<DataResult<LessonVideo[]>> {
  if (!hasYoutubeKey()) {
    return Promise.resolve({
      ok: false,
      kind: 'unconfigured',
      reason: 'Aucune clé YouTube configurée — les vidéos ne sont pas proposées.',
      source: YOUTUBE_SOURCE,
    })
  }

  return runStandalone(
    `youtube:lesson:${query}:${limit}`,
    YOUTUBE_SOURCE,
    () => fetchLessonVideos(query, limit),
    LESSON_VIDEO_TTL_SECONDS,
  )
}

/**
 * Historique de l'indice de sentiment.
 *
 * Aucune source supplémentaire : c'est le même endpoint que `getSentiment`, appelé
 * avec un `limit` plus large. L'indice n'étant publié qu'une fois par jour, un TTL
 * de 30 minutes est déjà généreux.
 */
export function getSentimentHistory(days = 365): Promise<DataResult<SentimentPoint[]>> {
  return runStandalone(
    `sentiment:fng:history:${days}`,
    SENTIMENT_SOURCE,
    () => fetchSentimentHistory(days),
    SENTIMENT_TTL_SECONDS,
  )
}

/**
 * Marchés de dérivés.
 *
 * TTL de 10 minutes : l'intérêt ouvert et les taux de financement bougent plus
 * lentement qu'un cours, et l'endpoint renvoie plus de 24 000 lignes — un appel de
 * plus est coûteux sur un quota mesuré à cinq requêtes par minute.
 */
export function getDerivatives(limit = 60): Promise<DataResult<DerivativeMarket[]>> {
  return run(
    'crypto',
    `crypto:derivatives:${limit}`,
    (provider) => {
      if (!provider.getDerivatives) {
        throw new ProviderError(provider.id, 'Dérivés non publiés par la source')
      }
      return provider.getDerivatives(limit)
    },
    600,
  )
}

/**
 * Places de marché au comptant, classées par note de confiance.
 *
 * TTL d'une heure : le palmarès des places est l'une des données les plus lentes du
 * site — une plateforme ne change ni de pays ni d'année de création, et son volume
 * quotidien ne se réordonne pas en cinq minutes.
 */
export function getSpotExchanges(limit = 50): Promise<DataResult<SpotExchange[]>> {
  return run(
    'crypto',
    `crypto:exchanges:${limit}`,
    (provider) => {
      if (!provider.getExchanges) {
        throw new ProviderError(provider.id, 'Places de marché non publiées par la source', { unsupported: true })
      }
      return provider.getExchanges(limit)
    },
    3_600,
  )
}

/**
 * Fiche d'une place — comptant ou dérivés.
 *
 * ── UNE HEURE, ET C'EST LE PROFIL QUI COMMANDE, PAS LES PAIRES ──────────────
 *
 * La réponse mêle deux natures de donnée : l'identité de la place — pays, année,
 * réseaux, note de confiance — qui ne bouge pas d'un mois à l'autre, et jusqu'à cent
 * paires cotées, qui bougent à la minute.
 *
 * Le TTL suit la première. Un lecteur qui veut le cours d'une paire ne le cherche pas
 * dans une fiche de place : il ouvre la fiche de l'actif, qui a son propre cycle
 * beaucoup plus court. Ce que cette page apporte, c'est le CONTEXTE — sur quelle
 * plateforme, avec quelle profondeur, depuis quelle année — et une heure y est un pas
 * généreux plutôt qu'un compromis.
 *
 * `null` traverse le cache comme une valeur : une place inexistante doit rester
 * inexistante pendant l'heure, sinon chaque robot qui explore une URL fantaisiste
 * relancerait deux appels vers la source.
 */
export async function getExchangeProfile(
  id: string,
): Promise<DataResult<ExchangeProfile | null>> {
  /*
   * ── LA NATURE EST DÉDUITE D'UNE LISTE DÉJÀ EN CACHE ───────────────────────
   *
   * Comptant et dérivés vivent sur deux endpoints, et l'identifiant seul ne dit pas
   * lequel interroger. Le provider sait se rabattre de l'un sur l'autre, mais ce repli
   * coûte DEUX appels sur un quota de cinq par minute : mesuré à 121 secondes pour la
   * fiche de Binance Futures, la source répondant 429 au second.
   *
   * `getDerivativeExchanges` porte la réponse et ne coûte rien : sa clé de cache ne
   * dépend d'aucune place, elle est déjà chaude pour `/perpetuels`, et son TTL de dix
   * minutes couvre largement la navigation d'un lecteur qui clique une ligne.
   *
   * Une source en panne laisse `kind` indéterminé, et le provider reprend alors son
   * repli en deux appels. C'est le comportement voulu : plus lent, mais la fiche
   * s'affiche — là où trancher au hasard donnerait un 404 sur une place qui existe.
   */
  const derivatives = await getDerivativeExchanges(100)
  const kind = derivatives.ok
    ? derivatives.data.some((entry) => entry.id === id)
      ? ('derivatives' as const)
      : ('spot' as const)
    : undefined

  return run(
    'crypto',
    `crypto:exchange:${id}`,
    (provider) => {
      if (!provider.getExchangeProfile) {
        throw new ProviderError(provider.id, 'Fiche de place non publiée par la source', { unsupported: true })
      }
      return provider.getExchangeProfile(id, kind)
    },
    3_600,
  )
}

/**
 * Places de produits dérivés, classées par intérêt ouvert.
 *
 * TTL de dix minutes et non d'une heure comme les places au comptant : l'intérêt
 * ouvert est une POSITION, pas une caractéristique. Il se déplace au cours de la
 * journée, et c'est même la grandeur qui bouge en premier lors d'un retournement —
 * la garder une heure ferait lire un état du marché déjà passé.
 *
 * Le pas reste aligné sur `getDerivatives`, qui interroge la même famille d'endpoints
 * et dont les chiffres se lisent souvent côte à côte.
 */
export function getDerivativeExchanges(
  limit = 100,
): Promise<DataResult<DerivativeExchange[]>> {
  return run(
    'crypto',
    `crypto:derivative-exchanges:${limit}`,
    (provider) => {
      if (!provider.getDerivativeExchanges) {
        throw new ProviderError(provider.id, 'Places de dérivés non publiées par la source', { unsupported: true })
      }
      return provider.getDerivativeExchanges(limit)
    },
    600,
  )
}

/**
 * Actifs référencés le plus récemment.
 *
 * Seule requête du site à ne PAS passer par le registre : sa source répond à une
 * question que le fournisseur crypto principal ne couvre pas gratuitement (voir
 * l'en-tête de `providers/coinpaprika`). `runStandalone` existe exactement pour ces
 * sources hors registre.
 *
 * TTL de 30 minutes : une cotation n'apparaît que quelques fois par jour, et la
 * réponse complète pèse près de deux mégaoctets — la redemander toutes les cinq
 * minutes serait payer cher une liste qui n'a pas bougé.
 */
export function getNewListings(limit = 100): Promise<DataResult<NewListing[]>> {
  return runStandalone(
    `crypto:new-listings:${limit}`,
    COINPAPRIKA_SOURCE,
    () => fetchNewListings(limit),
    1_800,
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   PROFIL D'UNE VALEUR BOURSIÈRE — frais, composition, ratios
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * Six heures.
 *
 * Ce que ce profil porte ne bouge pas à l'échelle de la journée : des frais de gestion
 * changent une fois par an, une composition de fonds une fois par trimestre, un secteur
 * jamais. Les seuls champs mobiles — ratio cours/bénéfice, capitalisation — suivent le
 * cours, qui est déjà servi ailleurs et rafraîchi toutes les trois minutes.
 *
 * C'est aussi ce qui rend l'appel supportable : l'endpoint exige une poignée de main en
 * deux temps, et six heures de cache la ramènent à quatre par jour et par titre.
 */
const PROFILE_TTL_SECONDS = 6 * 3_600

/**
 * Version de la FORME du profil mis en cache.
 *
 * À INCRÉMENTER dès qu'un champ est ajouté à `AssetProfile`, et le défaut qu'elle
 * corrige vaut d'être décrit : un profil resté six heures en cache a la forme d'AVANT
 * le changement. Le code neuf lit alors des champs qui n'y sont pas, et la fiche
 * affiche une absence là où la source publie quelque chose — sans erreur, sans trace,
 * pendant une demi-journée après chaque déploiement.
 *
 * Verser la version dans la CLÉ rend l'ancienne entrée inatteignable au lieu de la
 * supprimer : elle expire d'elle-même, et un retour en arrière du code retrouve la
 * sienne intacte.
 */
/* v3 : quatre modules de plus dans la réponse — valorisation d'entreprise et marges,
   résultats trimestriels, dividende, répartition du capital. Une entrée `v2` en cache
   ne les porte pas, et sans ce changement de version la fiche afficherait des sections
   vides jusqu'à l'expiration naturelle. Voir `modulesFor` dans `yahoo-profile.ts`. */
const PROFILE_SHAPE = 'v3'

/**
 * Profil d'un actif boursier, ou un échec explicite.
 *
 * ── RÉSERVÉ AUX CLASSES QUE YAHOO DÉCRIT ──────────────────────────────────────
 *
 * Actions, ETF et indices. Les matières premières n'ont ni frais, ni composition, ni
 * ratios : appeler pour elles dépenserait un aller-retour pour se voir répondre un
 * objet vide. La crypto et le forex passent par d'autres fournisseurs, qui ne
 * connaissent pas cet endpoint.
 *
 * Les indices ont été AJOUTÉS après coup, et le motif de leur exclusion était exact
 * mais trop large : ils n'ont effectivement ni frais ni composition, mais le module
 * `price` leur donne une place de cotation — ce qui était précisément la ligne
 * manquante de la fiche la plus pauvre du site.
 *
 * ── L'IDENTIFIANT D'URL N'EST PAS LE SYMBOLE ──────────────────────────────────
 *
 * Les routes portent `iwda-as`, Yahoo attend `IWDA.AS`. La traduction passe par la
 * table de l'univers, seule source de cette correspondance — la refaire ici à coups de
 * remplacements donnerait un symbole faux pour tout titre dont le suffixe n'est pas un
 * point.
 */
export async function getAssetProfile(
  id: string,
  assetClass: AssetClass,
): Promise<DataResult<AssetProfile | null>> {
  const source = describe(assetClass)

  /*
   * TROIS CLASSES ET NON PLUS DEUX — les indices rejoignent les actions et les ETF.
   *
   * Le refus portait sur ce que `quoteSummary` publie réellement : ni frais, ni
   * composition, ni ratios pour un indice. C'était exact, mais la conclusion était
   * trop large. Le module `price` donne la PLACE DE COTATION et le type d'instrument
   * pour tout symbole, y compris un indice — et c'est précisément ce qui manquait à
   * une fiche d'indice, qui était la plus pauvre du site.
   *
   * Les matières premières et les paires de devises restent écartées : leurs symboles
   * Yahoo (`GC=F`, `EURUSD=X`) ne portent pas de profil, et l'appel ne rendrait que
   * des champs vides au prix d'une requête.
   */
  if (assetClass !== 'stock' && assetClass !== 'etf' && assetClass !== 'index') {
    return {
      ok: false,
      kind: 'unconfigured',
      reason: 'Profil détaillé publié seulement pour les actions, les ETF et les indices.',
      source,
    }
  }

  const resolved = findUniverseEntry(id)
  if (!resolved) {
    return {
      ok: false,
      kind: 'notFound',
      reason: 'Symbole inconnu de notre univers boursier.',
      source,
    }
  }

  try {
    const data = await cached(
      `${assetClass}:profile:${PROFILE_SHAPE}:${resolved.entry.symbol}`,
      () => fetchAssetProfile(resolved.entry.symbol, assetClass),
      PROFILE_TTL_SECONDS,
    )
    return {
      ok: true,
      data,
      source: source ?? { label: 'Yahoo Finance', attributionUrl: 'https://finance.yahoo.com' },
    }
  } catch (error) {
    const detail = error instanceof ProviderError ? error.message : String(error)
    console.error(`[zenkuu:data] ${assetClass}:profile:${resolved.entry.symbol} — ${detail}`)
    /*
     * Un profil manquant n'est PAS une panne de la fiche : le cours, le graphique et
     * l'historique viennent d'un autre endpoint et fonctionnent. On rend donc un
     * échec que l'appelant traduit en sections absentes, jamais en page d'erreur.
     */
    return { ok: false, kind: 'error', reason: detail, source }
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   SCREENERS BOURSIERS — actions, ETF, fonds obligataires
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * Quinze minutes.
 *
 * ── PLUS LONG QUE LE PAS DU SITE, ET DÉLIBÉRÉMENT ────────────────────────────
 *
 * Le pas commun est de trois minutes, réglé sur des cours crypto qui bougent la nuit.
 * Ces écrans-ci coûtent SIX à HUIT requêtes chacun sur un endpoint non officiel, et ce
 * qu'ils portent ne se lit pas à la minute : un PER, une capitalisation, un rendement
 * de dividende sont des grandeurs de séance. Un rafraîchissement toutes les trois
 * minutes multiplierait le trafic sortant par cinq pour un tableau identique.
 *
 * Le cours affiché est donc daté à quinze minutes près, ce que la note de source dit.
 */
const SCREEN_TTL_SECONDS = 15 * 60

const YAHOO_SCREEN_SOURCE: DataSource = {
  label: 'Yahoo Finance',
  attributionUrl: 'https://finance.yahoo.com',
}

/**
 * Population d'ACTIONS pour le screener — six écrans prédéfinis, dédoublonnés.
 *
 * Voir `yahoo-screener.ts` pour le choix des écrans : chacun est biaisé par
 * construction, et c'est leur union qui approche un balayage.
 */
export function getStockScreen(): Promise<DataResult<YahooScreenRow[]>> {
  return runStandalone(
    /* `v2` : les conventions de pourcentage de Yahoo ont été relevées champ par champ,
       et deux d'entre elles étaient traitées à l'envers — voir `toPercent`. Une entrée
       `v1` en cache porte encore les valeurs fausses, et sans ce changement de version
       le tableau les servirait jusqu'à leur expiration naturelle. */
    'screen:stocks:v2',
    YAHOO_SCREEN_SOURCE,
    fetchStockScreen,
    SCREEN_TTL_SECONDS,
  )
}

/** Population d'ETF pour le screener — sélection américaine, ce que la page annonce. */
export function getEtfScreen(): Promise<DataResult<YahooScreenRow[]>> {
  return runStandalone('screen:etf:v2', YAHOO_SCREEN_SOURCE, fetchEtfScreen, SCREEN_TTL_SECONDS)
}

/**
 * Population de FONDS OBLIGATAIRES — et ce ne sont pas des obligations.
 *
 * Aucune source gratuite ne publie de cotation d'obligation individuelle. Ce que cet
 * écran recense, ce sont des fonds INVESTIS en obligations : une exposition au marché
 * obligataire, avec ses frais et son encours propres. L'onglet le dit en toutes
 * lettres et affiche des colonnes de fonds, pas de titre.
 */
export function getBondFundScreen(): Promise<DataResult<YahooScreenRow[]>> {
  return runStandalone(
    'screen:bonds:v2',
    YAHOO_SCREEN_SOURCE,
    fetchBondFundScreen,
    SCREEN_TTL_SECONDS,
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   PANIER DE CAPITALISATIONS — l'agrégat long que la source ne publie pas
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * ── LE PROBLÈME QUE CE MODULE RÉSOUT ──────────────────────────────────────────
 *
 * La page de référence ouvre sur une courbe de la capitalisation MONDIALE sur dix
 * ans, et en tire trois autres : dominance de Bitcoin, capitalisation des stablecoins,
 * capitalisation hors Bitcoin. Aucune de ces séries n'est accessible gratuitement —
 * `/global/market_cap_chart` répond 401 hors abonnement.
 *
 * Ce que la source publie gratuitement, en revanche, c'est la capitalisation
 * historique de N'IMPORTE QUEL actif pris un par un, dans la même réponse que son
 * cours. Une somme de capitalisations réellement publiées n'est pas une estimation :
 * c'est une addition de mesures, au même titre qu'un rapport de deux nombres publiés.
 *
 * ── MAIS UNE SOMME A UNE COMPOSITION, ET C'EST TOUT LE PIÈGE ──────────────────
 *
 * Deux façons de se tromper, et le panier est conçu contre les deux.
 *
 * D'abord le PANIER IMPLICITE. Une courbe intitulée « capitalisation » que le lecteur
 * prendrait pour le marché entier serait un mensonge par omission — neuf actifs ne
 * sont pas dix-huit mille. Le panier est donc nommé partout où sa somme s'affiche, et
 * `members` remonte jusqu'à l'interface pour qu'elle puisse le lister.
 *
 * Ensuite le PANIER DYNAMIQUE. Prendre « les neuf premières capitalisations du jour »
 * serait plus à jour et bien pire : le jour où un actif entre dans le classement, la
 * somme saute d'un cran sans qu'aucune capitalisation n'ait bougé, et la courbe montre
 * un mouvement de marché qui n'est qu'un changement de composition. La liste est donc
 * FIGÉE et écrite ici.
 *
 * Le prix de ce choix est qu'elle vieillit : un actif qui deviendrait majeur n'y
 * figurerait pas tant que personne ne l'ajoute. C'est un défaut visible et corrigible,
 * là où le saut de composition serait invisible et indétectable.
 *
 * ── POURQUOI CES NEUF ─────────────────────────────────────────────────────────
 *
 * Bitcoin et Ethereum parce qu'ils font l'essentiel du marché et que leurs séries sont
 * DÉJÀ chargées par la page des graphiques : ces deux-là ne coûtent rien.
 *
 * Quatre stablecoins parce que leur capitalisation cumulée est l'un des rares
 * indicateurs de flux entrant dans le secteur, et parce que la référence lui consacre
 * un graphique entier.
 *
 * Trois grandes alternatives pour que la somme et la répartition ne se réduisent pas à
 * « Bitcoin contre des dollars ».
 *
 * Neuf et pas trente : chaque membre coûte un appel sur un palier gratuit mesuré à
 * quelques requêtes par minute. Trente membres, c'est dix minutes d'attente au premier
 * chargement pour une précision que la courbe ne montrerait pas.
 */
export const MARKET_CAP_BASKET = [
  { id: 'bitcoin', bucket: 'bitcoin' },
  { id: 'ethereum', bucket: 'ethereum' },
  { id: 'tether', bucket: 'stablecoin' },
  { id: 'usd-coin', bucket: 'stablecoin' },
  { id: 'dai', bucket: 'stablecoin' },
  { id: 'ethena-usde', bucket: 'stablecoin' },
  { id: 'ripple', bucket: 'other' },
  { id: 'binancecoin', bucket: 'other' },
  { id: 'solana', bucket: 'other' },
] as const satisfies readonly { id: string; bucket: MarketCapBucket }[]

/**
 * Regroupement de lecture d'un membre.
 *
 * Il ne décrit pas une propriété de l'actif mais le RÔLE qu'il joue dans les courbes
 * dérivées : « stablecoin » alimente la courbe des stablecoins, « bitcoin » alimente
 * la part de Bitcoin et son complément. Un même actif pourrait changer de rôle sans
 * changer de nature — c'est pourquoi ce champ vit ici et non dans `MarketAsset`.
 */
export type MarketCapBucket = 'bitcoin' | 'ethereum' | 'stablecoin' | 'other'

export interface MarketCapBasketMember {
  id: string
  bucket: MarketCapBucket
  /** Capitalisation la plus récente du panier, dans la devise demandée. */
  latest: number
}

export interface MarketCapBasketPoint {
  timestamp: number
  /** Capitalisation par identifiant. Tous les membres retenus y figurent. */
  byId: Record<string, number>
  total: number
}

export interface MarketCapBasket {
  members: MarketCapBasketMember[]
  points: MarketCapBasketPoint[]
  days: number
  currency: string
  /**
   * Membres écartés faute de série exploitable, et pourquoi.
   *
   * REMONTÉ JUSQU'À L'INTERFACE plutôt que journalisé en silence : si un stablecoin
   * disparaît du panier, la courbe des stablecoins baisse d'un cran et le lecteur
   * doit pouvoir savoir que c'est une lacune de données et non une sortie de capitaux.
   */
  dropped: { id: string; reason: string }[]
}

/** Six heures : une série de relevés QUOTIDIENS ne bouge que d'un point par jour. */
const BASKET_TTL_SECONDS = 6 * 3_600

/**
 * Durée de vie d'un panier INCOMPLET — dix minutes, pas six heures.
 *
 * ── POURQUOI DEUX DURÉES ──────────────────────────────────────────────────────
 *
 * Un membre manque presque toujours pour une raison passagère : la source a refusé
 * l'appel faute de quota, ou le fournisseur de secours a rendu une série de clôtures
 * sans capitalisation. Rien dans ces deux cas ne dit que la donnée n'existe pas — elle
 * reviendra au prochain essai.
 *
 * Mettre un tel relevé en cache six heures serait le pire des deux mondes : la page
 * s'affiche vite, et affiche une somme amputée pendant tout l'après-midi. Un panier
 * complet obtenu en trente secondes vaut mieux qu'un panier à six membres obtenu en
 * cinq — d'autant que le second se FIGE, et que rien ne le rafraîchira.
 *
 * Dix minutes suffisent à absorber une rafale de visites sans figer le manque.
 */
const BASKET_PARTIAL_TTL_SECONDS = 600

/** Un jour en millisecondes, pour ramener chaque relevé à son jour UTC. */
const BASKET_DAY_MS = 86_400_000

/**
 * Somme des capitalisations du panier, alignée jour par jour.
 *
 * ── L'ALIGNEMENT EST LE CŒUR DE LA FONCTION ───────────────────────────────────
 *
 * Les neuf séries arrivent séparément et ne portent pas les mêmes horodatages : la
 * source échantillonne autour de minuit UTC, à quelques minutes près, et un relevé
 * peut manquer. Additionner les valeurs « à la même position dans le tableau » serait
 * faux dès la première absence — on additionnerait le lundi de l'un avec le mardi de
 * l'autre, et l'erreur se propagerait sur tout le reste de la courbe.
 *
 * Chaque relevé est donc rangé sous son JOUR UTC, et seuls les jours où TOUS les
 * membres retenus ont une valeur entrent dans la somme. Un jour incomplet est écarté
 * plutôt que complété : sommer huit membres sur neuf ferait un creux qui se lirait
 * comme une chute de marché.
 *
 * ── ET UN MEMBRE TROP JEUNE EST ÉCARTÉ, PAS INTERPOLÉ ─────────────────────────
 *
 * Un actif dont la série est plus courte que la fenêtre demandée réduirait
 * l'intersection à sa propre longueur, et amputerait la courbe entière. Il sort donc
 * du panier, et son nom part avec la raison dans `dropped`.
 */
export async function getMarketCapBasket(
  currency = 'eur',
  days = 365,
): Promise<DataResult<MarketCapBasket>> {
  const source = describe('crypto')

  /*
   * ── LE CACHE EST POSÉ SUR L'AGRÉGAT, PAS SUR SES MEMBRES ──────────────────
   *
   * Chaque membre passe par `getAssetHistory`, mis en cache trois minutes comme tout
   * le reste du site. Trois minutes conviennent au graphique d'une fiche, qu'on
   * regarde en direct ; elles sont absurdes ici, où le résultat coûte neuf appels et
   * ne bouge que d'un point par jour. Sans ce cache-ci, une visite toutes les cinq
   * minutes redemanderait les neuf séries.
   *
   * Le cache par actif reste utile en dessous : il est ce qui rend Bitcoin et Ethereum
   * gratuits pour ce panier, puisque la page des graphiques les a déjà demandés, et
   * c'est lui qui déduplique les appels concurrents.
   *
   * ── ET IL EST ÉCRIT À LA MAIN, PARCE QUE SA DURÉE DÉPEND DU RÉSULTAT ──────
   *
   * `cached` fixe sa durée AVANT de connaître ce qu'il mémorise. Ici la bonne durée
   * dépend précisément de ce qu'on vient d'obtenir : six heures pour un panier
   * complet, dix minutes pour un panier amputé — voir `BASKET_PARTIAL_TTL_SECONDS`.
   * D'où la lecture et l'écriture explicites, qui restent trois lignes.
   */
  const key = `crypto:basket:${currency}:${days}`

  try {
    const hit = await cache.get<MarketCapBasket>(key)
    if (hit) {
      return {
        ok: true,
        data: hit,
        source: source ?? { label: 'CoinGecko', attributionUrl: 'https://www.coingecko.com' },
      }
    }

    const data = await buildMarketCapBasket(currency, days)
    await cache.set(
      key,
      data,
      data.dropped.length === 0 ? BASKET_TTL_SECONDS : BASKET_PARTIAL_TTL_SECONDS,
    )

    return {
      ok: true,
      data,
      source: source ?? { label: 'CoinGecko', attributionUrl: 'https://www.coingecko.com' },
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`[zenkuu:data] crypto:basket:${currency}:${days} — ${detail}`)
    return { ok: false, kind: 'error', reason: detail, source }
  }
}

/**
 * Construction du panier — lève en cas d'échec, le cache s'occupe du reste.
 *
 * Séparée de la fonction publique pour que `cached` mémorise la DONNÉE et non le
 * `DataResult` : mettre en cache un état d'échec le figerait pour six heures, et une
 * panne passagère de la source condamnerait la page pour l'après-midi.
 */
async function buildMarketCapBasket(currency: string, days: number): Promise<MarketCapBasket> {
  /*
   * Les neuf séries partent ENSEMBLE. Chacune passe par `getAssetHistory`, donc par le
   * cache par actif : Bitcoin et Ethereum sont déjà servis à la page des graphiques et
   * ne coûtent rien de plus, et deux visites successives du site ne rechargent rien.
   */
  const results = await Promise.all(
    MARKET_CAP_BASKET.map(async (entry) => ({
      entry,
      history: await getAssetHistory(entry.id, 'crypto', days, currency),
    })),
  )

  const dropped: { id: string; reason: string }[] = []

  /** Relevés par membre, indexés par jour UTC. */
  const byMember = new Map<string, Map<number, number>>()

  for (const { entry, history } of results) {
    if (!history.ok) {
      dropped.push({ id: entry.id, reason: 'série indisponible chez la source' })
      continue
    }

    const daily = new Map<number, number>()
    for (const point of history.data.points) {
      // `marketCap` est OPTIONNEL — voir `PriceHistory`. Un point qui ne le porte pas
      // n'est pas un point à zéro : il ne compte simplement pas.
      if (point.marketCap === undefined || !Number.isFinite(point.marketCap)) continue
      daily.set(Math.floor(point.timestamp / BASKET_DAY_MS), point.marketCap)
    }

    if (daily.size === 0) {
      dropped.push({ id: entry.id, reason: 'capitalisation non publiée dans la série' })
      continue
    }

    byMember.set(entry.id, daily)
  }

  if (byMember.size === 0) {
    throw new Error('Aucune série de capitalisation exploitable pour le panier.')
  }

  /*
   * Un membre dont la série couvre moins des trois quarts de la plus longue est écarté
   * AVANT l'intersection. Sans ce filtre, un actif référencé il y a six mois ramènerait
   * une fenêtre de douze mois à six pour tout le monde — la courbe perdrait la moitié
   * de sa profondeur à cause d'un membre sur neuf.
   */
  const longest = Math.max(...[...byMember.values()].map((daily) => daily.size))
  for (const [id, daily] of [...byMember.entries()]) {
    if (daily.size < longest * 0.75) {
      byMember.delete(id)
      dropped.push({ id, reason: 'série trop courte pour la fenêtre demandée' })
    }
  }

  const kept = [...byMember.keys()]

  /* Intersection des jours : on part du membre le plus court, puisque le résultat ne
     peut pas être plus long que lui. */
  const pivot = kept.reduce((shortest, id) =>
    (byMember.get(id) as Map<number, number>).size <
    (byMember.get(shortest) as Map<number, number>).size
      ? id
      : shortest,
  )

  const points: MarketCapBasketPoint[] = []
  for (const day of [...(byMember.get(pivot) as Map<number, number>).keys()].sort((a, b) => a - b)) {
    const byId: Record<string, number> = {}
    let total = 0
    let complete = true

    for (const id of kept) {
      const value = (byMember.get(id) as Map<number, number>).get(day)
      if (value === undefined) {
        complete = false
        break
      }
      byId[id] = value
      total += value
    }

    if (complete) points.push({ timestamp: day * BASKET_DAY_MS, byId, total })
  }

  if (points.length < 2) {
    throw new Error('Les séries du panier ne se recoupent pas sur assez de jours.')
  }

  const last = points[points.length - 1] as MarketCapBasketPoint

  const members: MarketCapBasketMember[] = MARKET_CAP_BASKET.filter((entry) =>
    kept.includes(entry.id),
  ).map((entry) => ({
    id: entry.id,
    bucket: entry.bucket,
    latest: last.byId[entry.id] as number,
  }))

  return { members, points, days, currency, dropped }
}

/* ── Macroéconomie ─────────────────────────────────────────────────────────── */

/**
 * Six heures.
 *
 * Ces séries sont ANNUELLES : une valeur change une fois par an, et sa révision
 * quelques fois de plus. Six heures est déjà d'une prudence excessive au regard de la
 * donnée ; c'est la même valeur que le profil boursier, et l'aligner évite un
 * troisième palier de fraîcheur à retenir.
 */
const MACRO_TTL_SECONDS = 6 * 3_600

/**
 * Dernière observation de chaque pays pour un indicateur macroéconomique.
 *
 * `code` est le code de série de la Banque mondiale, pris dans `MACRO_INDICATORS` —
 * jamais construit par l'appelant. Le passer en clair permettrait d'interroger
 * n'importe quelle série du catalogue, y compris celles dont nous n'avons ni libellé
 * ni unité à afficher.
 */
export function getMacroIndicator(
  code: string,
  /**
   * Années remontées par pays. `1` = dernière valeur connue.
   *
   * ENTRE DANS LA CLÉ DE CACHE, et il le faut : la carte d'aperçu de l'accueil n'a
   * besoin que du dernier point, la page macro veut quinze ans pour son curseur. Sans
   * cette distinction, la première paierait le téléchargement de la seconde à chaque
   * expiration — ou pire, la seconde servirait l'instantané mémorisé par la première
   * et son curseur n'aurait qu'une position.
   */
  years = 1,
): Promise<DataResult<MacroObservation[]>> {
  return runStandalone(
    /* `fr` dans la clé : les libellés viennent de la source, dans sa version
       française. Le jour où une seconde langue est servie, les deux jeux ne doivent
       pas se marcher dessus dans le cache — et un changement de langue ne doit pas
       laisser six heures de noms anglais derrière lui. */
    `macro:fr:${code}:${years}`,
    WORLDBANK_SOURCE,
    () => fetchMacroIndicator(code, years),
    MACRO_TTL_SECONDS,
  )
}
