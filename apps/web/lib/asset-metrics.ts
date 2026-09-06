import type { AppHref } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { marketCapToFdvShare } from '@/lib/heatmap-metrics'
import type { AssetClass, AssetDetail } from '@zenkuu/data'

/**
 * Registre des métriques d'une fiche actif.
 *
 * ── POURQUOI UN REGISTRE PLUTÔT QUE DU CODE DANS LA VUE ───────────────────────
 *
 * Chaque métrique existe désormais à TROIS endroits : une ligne dans le rail, une
 * infobulle qui l'explique, et une page dédiée qui la détaille. Sans point unique de
 * vérité, ces trois-là divergent — c'est mécanique, pas hypothétique : le rail
 * afficherait « Valorisation diluée » quand l'URL dirait `fdv` et l'infobulle
 * parlerait d'autre chose. Le registre rend la divergence impossible, de la même
 * façon qu'`ASSET_CLASS_SEGMENT` la rend impossible entre routes et liens.
 *
 * ── LE SLUG EST UNE URL PUBLIQUE ──────────────────────────────────────────────
 *
 * Il est en français et lisible, comme les segments de classe d'actif, et pour la
 * même raison (§9) : `/crypto/bitcoin/metriques/capitalisation` porte du sens pour un
 * lecteur comme pour un moteur, là où `/crypto/bitcoin/metriques/market-cap` n'en
 * porterait qu'en anglais sur une page française. Un slug ne se renomme donc pas à
 * la légère — c'est une adresse indexée.
 *
 * ── `series` DIT CE QU'ON PEUT TRACER, ET RIEN DE PLUS ────────────────────────
 *
 * Trois métriques seulement disposent d'une série temporelle réelle : le cours, la
 * capitalisation et le volume. Les autres — offre, extrêmes, rang — n'ont qu'une
 * valeur instantanée chez la source. Leur page dédiée n'affiche donc PAS de
 * graphique. C'est le §5 appliqué à une page entière : tracer une courbe plate ou
 * interpolée pour « faire comme les autres » inventerait une histoire que personne
 * n'a publiée.
 */

/** Ce que la valeur représente — décide du formatage, jamais de la mise en page. */
export type MetricKind = 'money' | 'quantity' | 'percent' | 'rank' | 'text' | 'change'

export type MetricGroup = 'market' | 'range' | 'supply' | 'change'

export interface MetricDef {
  /** Segment d'URL de la page dédiée. Public et indexé : ne pas renommer sans redirection. */
  slug: string
  /** Clé sous `metric.*` dans les fichiers de messages — porte le libellé ET l'explication. */
  message: string
  group: MetricGroup
  kind: MetricKind
  /** Valeur brute. `undefined` signifie ABSENTE chez la source, jamais nulle. */
  read: (asset: AssetDetail) => number | string | undefined
  /**
   * Variation associée, quand la source en publie une pour CETTE métrique.
   *
   * Ne pas confondre avec la variation du cours : l'écart au plus haut historique
   * est une variation *de cette ligne*, alors que le groupe « Variations » liste des
   * variations du cours. Les deux occupent la même colonne, d'où la distinction.
   */
  readChange?: (asset: AssetDetail) => number | undefined
  /**
   * NATURE de cette variation — elle décide de la couleur, donc du sens lu.
   *
   * `distance` : un écart à un extrême. « −49 % du record » n'est ni une bonne ni une
   * mauvaise nouvelle du jour, c'est une position dans une amplitude. Le rendre en
   * rouge dirait qu'il vient de se produire. Reste donc en gris.
   *
   * `variation` : un mouvement sur une période. Il a un SENS, et la couleur en est la
   * lecture la plus rapide — c'est ce que la référence affiche à droite de chaque
   * repère.
   *
   * Le défaut est `distance` parce que les seules variations présentes avant celle de
   * la capitalisation étaient les écarts aux records.
   */
  changeKind?: 'distance' | 'variation'
  /** Série temporelle disponible pour la page dédiée. Absent = aucun graphique. */
  series?: 'price' | 'marketCap' | 'volume'
}

/**
 * Libellé des extrêmes selon la classe d'actif.
 *
 * Yahoo ne publie pas de plus haut de tous les temps pour les valeurs boursières :
 * le champ `ath` y porte les extrêmes 52 semaines. Annoncer un record absolu qui n'en
 * est pas un serait une erreur de fond, pas de vocabulaire — d'où deux clés de
 * message distinctes plutôt qu'un suffixe collé au libellé.
 */
export function extremeMessage(base: 'ath' | 'atl', assetClass: string): string {
  return assetClass === 'crypto' ? base : `${base}Window`
}

export const METRICS: readonly MetricDef[] = [
  // ── Repères de marché ──────────────────────────────────────────────────────
  {
    slug: 'capitalisation',
    message: 'marketCap',
    group: 'market',
    kind: 'money',
    read: (a) => a.marketCap,
    series: 'marketCap',
    /*
     * LA SEULE MÉTRIQUE DE CE GROUPE À PORTER SA VARIATION, et c'est une limite de
     * source, pas un choix de dessin.
     *
     * La référence affiche un pourcentage à droite de CHAQUE repère. Nous ne pouvons
     * l'écrire que là où la source le publie réellement : la capitalisation, oui, sous
     * `market_cap_change_percentage_24h_in_currency`. Le volume, non — CoinGecko ne
     * publie aucune variation de volume, et la calculer supposerait de garder nos
     * propres relevés de la veille, c'est-à-dire de produire un chiffre maison qu'on
     * présenterait comme celui de la source (§5).
     *
     * Une colonne vide sur trois lignes vaut mieux qu'une colonne pleine dont deux
     * tiers sont inventés.
     */
    readChange: (a) => a.marketCapChange24h,
    changeKind: 'variation',
  },
  {
    slug: 'volume-24h',
    message: 'volume24h',
    group: 'market',
    kind: 'money',
    read: (a) => a.volume24h,
    series: 'volume',
  },
  {
    slug: 'valorisation-diluee',
    message: 'fdv',
    group: 'market',
    kind: 'money',
    // Omise quand elle égale la capitalisation : c'est le cas des actifs dont toute
    // l'offre circule déjà, et répéter le même nombre deux lignes plus bas n'apprend
    // rien tout en suggérant à tort deux mesures distinctes.
    read: (a) => (a.fdv !== undefined && a.fdv !== a.marketCap ? a.fdv : undefined),
  },
  {
    /*
     * Rapport entre la capitalisation et la valorisation diluée — la part de l'offre
     * déjà en circulation, vue par la valeur.
     *
     * La référence l'affiche dans son rail ET dans son tableau (« Market Cap / FDV »).
     * ZENKUU l'avait en colonne de tableau depuis le 2026-08-29, pas dans le rail.
     *
     * ⚠️ CALCULÉ, PAS LU. `marketCapToFdvShare` vit dans `lib/heatmap-metrics.ts`,
     * testée pour ses cas limites — offre manquante, prix nul. Elle rend `undefined`
     * dès qu'un des deux termes manque, jamais un zéro qui affirmerait « aucune
     * dilution restante ».
     *
     * Omis quand la FDV égale la capitalisation, comme la ligne voisine : le ratio y
     * vaut 100 % pour tout actif dont l'offre circule entièrement, et une colonne de
     * « 100 % » n'apprend rien.
     */
    slug: 'capitalisation-sur-fdv',
    message: 'marketCapToFdv',
    group: 'market',
    kind: 'percent',
    read: (a) => (a.fdv !== undefined && a.fdv !== a.marketCap ? marketCapToFdvShare(a) : undefined),
  },
  {
    slug: 'valeur-verrouillee',
    message: 'tvl',
    group: 'market',
    kind: 'money',
    read: (a) => a.tvl,
  },
  { slug: 'rang', message: 'rank', group: 'market', kind: 'rank', read: (a) => a.rank },
  {
    slug: 'place-de-cotation',
    message: 'exchange',
    group: 'market',
    kind: 'text',
    read: (a) => a.exchange,
  },

  // ── Amplitude ──────────────────────────────────────────────────────────────
  { slug: 'plus-haut-24h', message: 'high24h', group: 'range', kind: 'money', read: (a) => a.high24h },
  { slug: 'plus-bas-24h', message: 'low24h', group: 'range', kind: 'money', read: (a) => a.low24h },
  {
    slug: 'plus-haut-historique',
    message: 'ath',
    group: 'range',
    kind: 'money',
    read: (a) => a.ath,
    readChange: (a) => a.athChangePercent,
  },
  {
    slug: 'plus-bas-historique',
    message: 'atl',
    group: 'range',
    kind: 'money',
    read: (a) => a.atl,
    readChange: (a) => a.atlChangePercent,
  },

  // ── Offre ──────────────────────────────────────────────────────────────────
  {
    slug: 'offre-en-circulation',
    message: 'circulatingSupply',
    group: 'supply',
    kind: 'quantity',
    read: (a) => a.circulatingSupply,
  },
  {
    slug: 'offre-totale',
    message: 'totalSupply',
    group: 'supply',
    kind: 'quantity',
    // Masquée quand elle égale l'offre en circulation : même raisonnement que la FDV.
    read: (a) => (a.totalSupply !== a.circulatingSupply ? a.totalSupply : undefined),
  },
  {
    slug: 'offre-maximale',
    message: 'maxSupply',
    group: 'supply',
    kind: 'quantity',
    read: (a) => a.maxSupply,
  },
  {
    slug: 'offre-emise',
    message: 'issuedShare',
    group: 'supply',
    kind: 'percent',
    // Dérivée de DEUX champs sourcés : c'est un rapport entre nombres publiés, pas
    // une estimation. La distinction autorise ce calcul là où le §5 interdirait une
    // extrapolation.
    read: (a) =>
      a.circulatingSupply !== undefined && a.maxSupply
        ? (a.circulatingSupply / a.maxSupply) * 100
        : undefined,
  },

  // ── Variations du cours ────────────────────────────────────────────────────
  { slug: 'variation-1h', message: 'change1h', group: 'change', kind: 'change', read: (a) => a.change1h },
  { slug: 'variation-24h', message: 'change24h', group: 'change', kind: 'change', read: (a) => a.change24h },
  { slug: 'variation-7j', message: 'change7d', group: 'change', kind: 'change', read: (a) => a.change7d },
  { slug: 'variation-14j', message: 'change14d', group: 'change', kind: 'change', read: (a) => a.change14d },
  { slug: 'variation-30j', message: 'change30d', group: 'change', kind: 'change', read: (a) => a.change30d },
  { slug: 'variation-1an', message: 'change1y', group: 'change', kind: 'change', read: (a) => a.change1y },
]

/**
 * Ordre des groupes, et leur intitulé.
 *
 * ⚠️ ILS VIVAIENT DANS `AssetMetricRail`, ET UN SECOND LECTEUR EST ARRIVÉ. Le
 * catalogue des métriques groupe exactement de la même façon — c'est ce qui fait
 * qu'on retrouve dans la page ce qu'on a vu dans le rail. Deux copies auraient
 * divergé au premier groupe ajouté, ce que ce registre existe précisément pour
 * empêcher.
 *
 * « Fondamentaux » et non « Repères de marché » : le second décrivait la COLONNE
 * (des repères, dans un rail), le premier décrit son CONTENU — capitalisation,
 * volume et valorisation diluée sont les fondamentaux d'un actif.
 */
export const METRIC_GROUP_ORDER: readonly MetricGroup[] = ['market', 'range', 'supply', 'change']

export const METRIC_GROUP_TITLES: Record<MetricGroup, string> = {
  market: 'Fondamentaux',
  range: 'Amplitude',
  supply: 'Offre',
  change: 'Variations',
}

const BY_SLUG = new Map(METRICS.map((metric) => [metric.slug, metric]))

export function getMetric(slug: string): MetricDef | undefined {
  return BY_SLUG.get(slug)
}

/** Métriques réellement renseignées pour cet actif, dans l'ordre du registre. */
export function availableMetrics(asset: AssetDetail): MetricDef[] {
  return METRICS.filter((metric) => metric.read(asset) !== undefined)
}

/** Lien vers la page dédiée d'une métrique. */
export function metricHref(assetClass: AssetClass, id: string, slug: string): AppHref {
  /*
   * ⚠ La CLASSE remplace le SEGMENT en argument. La fonction composait
   * `/${segment}/${id}/metriques/${slug}` — une chaîne, donc une adresse française
   * quelle que soit la langue rendue. La route se DÉSIGNE désormais, et `Link` la
   * traduit : `/stocks/aapl/metrics/…` en anglais.
   *
   * `nft` est la seule classe sans fiche, donc sans page de métrique : elle retombe
   * sur la page NFT, comme `assetHref`.
   */
  const route = METRIC_ROUTE[assetClass]
  return route ? { pathname: route, params: { id, metrique: slug } } : assetHref(assetClass, id)
}

/**
 * Lien vers le CATALOGUE des métriques d'un actif.
 *
 * ── POURQUOI IL A FALLU UNE SECONDE ADRESSE ─────────────────────────────────
 *
 * Vingt et une pages de métrique existaient sans qu'aucune ne soit canonique : la
 * rangée d'onglets de la fiche notait qu'elle ne pouvait pas les porter, faute d'UNE
 * destination. Le catalogue est cette destination — il les liste toutes, groupées
 * comme le rail les groupe, avec la valeur du jour à côté de chaque nom.
 *
 * `nft` retombe sur la page de classe, comme partout ailleurs : elle n'a pas de fiche,
 * donc pas de métrique.
 */
export function metricsHref(assetClass: AssetClass, id: string): AppHref {
  const route = METRIC_INDEX_ROUTE[assetClass]
  return route ? { pathname: route, params: { id } } : assetHref(assetClass, id)
}

/** Route du catalogue, par classe. Même table que ci-dessous, moins le segment final. */
const METRIC_INDEX_ROUTE = {
  crypto: '/crypto/[id]/metriques',
  forex: '/devises/[id]/metriques',
  stock: '/actions/[id]/metriques',
  etf: '/etf/[id]/metriques',
  commodity: '/matieres-premieres/[id]/metriques',
  index: '/indices/[id]/metriques',
  nft: null,
} as const satisfies Record<AssetClass, string | null>

/** Route de la page d'une métrique, par classe. Voir `lib/asset-routes.ts`. */
const METRIC_ROUTE = {
  crypto: '/crypto/[id]/metriques/[metrique]',
  forex: '/devises/[id]/metriques/[metrique]',
  stock: '/actions/[id]/metriques/[metrique]',
  etf: '/etf/[id]/metriques/[metrique]',
  commodity: '/matieres-premieres/[id]/metriques/[metrique]',
  index: '/indices/[id]/metriques/[metrique]',
  nft: null,
} as const satisfies Record<AssetClass, string | null>
