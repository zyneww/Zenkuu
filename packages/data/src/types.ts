/**
 * Modèle de données commun à TOUTES les classes d'actifs.
 *
 * Ce fichier est le contrat que chaque adaptateur de fournisseur doit satisfaire
 * (§4 « isoler chaque fournisseur derrière une couche d'adaptateur »). Changer de
 * fournisseur = écrire un nouveau module dans `providers/` qui produit ces types.
 * Aucune page, aucun composant ne connaît la forme des réponses d'une API externe.
 */

export type AssetClass =
  | 'crypto'
  | 'forex'
  | 'stock'
  | 'etf'
  | 'commodity'
  | 'index'
  | 'nft'

export const ASSET_CLASSES: readonly AssetClass[] = [
  'crypto',
  'forex',
  'stock',
  'etf',
  'commodity',
  'index',
  'nft',
] as const

/**
 * Un actif tel qu'affiché dans un classement ou une carte.
 *
 * Les champs optionnels le sont pour de vraies raisons : une paire de devises n'a
 * pas de capitalisation, une matière première n'a pas d'offre en circulation. Un
 * champ absent DOIT être rendu comme absent (« — » non chiffré, ou module masqué),
 * jamais remplacé par 0 (§5).
 */
export interface MarketAsset {
  /** Identifiant stable chez le fournisseur, utilisé pour les URLs. */
  id: string
  symbol: string
  name: string
  assetClass: AssetClass
  /** URL absolue du logo, si le fournisseur en expose un. */
  image?: string
  price: number
  /** Code ISO 4217 de la devise de cotation, ex. « EUR ». */
  currency: string
  marketCap?: number
  volume24h?: number
  /** Variation en pourcentage, ex. -2.34 pour -2,34 %. */
  change1h?: number
  change24h?: number
  change7d?: number
  /**
   * Période réelle couverte par `change24h` lorsqu'elle n'est pas 24 h.
   *
   * La BCE, par exemple, ne publie qu'un taux par jour ouvré : parler de « 24 h »
   * pour une paire de devises serait faux. Le fournisseur déclare ici la période
   * qu'il couvre réellement, et l'UI reprend ce libellé tel quel (§5).
   */
  changePeriodLabel?: string
  /** Série de prix 7 jours pour les mini-graphiques. */
  sparkline7d?: number[]
  circulatingSupply?: number
  totalSupply?: number
  maxSupply?: number
  /**
   * Extrêmes historiques pour la crypto ; extrêmes 52 semaines pour les actifs
   * boursiers, dont Yahoo ne publie pas le plus haut de tous les temps. Le libellé
   * affiché est adapté par la fiche actif selon la classe.
   */
  ath?: number
  athDate?: string
  atl?: number
  atlDate?: string
  high24h?: number
  low24h?: number
  /** Place de cotation, quand la source la renseigne (actions, ETF, indices). */
  exchange?: string
  /** Rang par capitalisation au sein de sa classe d'actif. */
  rank?: number
  /** Horodatage ISO 8601 fourni par la source. */
  lastUpdated: string
}

/**
 * Actif en tendance — volontairement PLUS PAUVRE que `MarketAsset`.
 *
 * L'endpoint des tendances ne cote qu'en dollars, mais publie la variation 24 h dans
 * toutes les devises. Obtenir un prix en euros exigerait un second appel réseau, que
 * le palier gratuit de CoinGecko ne permet pas de dépenser sur chaque rendu (mesuré :
 * cinq requêtes avant refus). Plutôt qu'un prix converti à la main — donc inventé —
 * ou un prix en dollars glissé au milieu d'une page en euros, ce type ne porte
 * simplement PAS de prix. Le panneau affiche ce qui est réellement sourcé : le nom,
 * le rang et la variation.
 */
export interface TrendingAsset {
  id: string
  symbol: string
  name: string
  assetClass: AssetClass
  image?: string
  rank?: number
  change24h?: number
}

/** Fiche détaillée d'un actif — enrichit `MarketAsset` de ce qui n'a de sens que sur sa page. */
export interface AssetDetail extends MarketAsset {
  /** Texte de présentation fourni par la source, déjà nettoyé de son HTML. */
  description?: string
  homepageUrl?: string
  /** Identifiants d'actifs de la même catégorie, pour la colonne « comparables ». */
  categories?: string[]
}

/** Série de prix pour les graphiques de la fiche actif. */
export interface PriceHistory {
  points: { timestamp: number; price: number }[]
  currency: string
  /** Fenêtre demandée, en jours — utile pour libeller l'axe. */
  days: number
}

/** Un secteur / narratif de marché (« Layer 1 », « IA », « RWA »…). */
export interface MarketCategory {
  id: string
  name: string
  marketCap?: number
  marketCapChange24h?: number
  volume24h?: number
  /** Quelques logos représentatifs, pour illustrer la ligne. */
  topAssets?: string[]
}

/** Article d'actualité agrégé depuis un flux public. */
export interface NewsItem {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  excerpt?: string
}

/** Indice de sentiment composite (Fear & Greed). */
export interface SentimentIndex {
  /** 0 = peur extrême, 100 = avidité extrême. */
  value: number
  /** Libellé publié par la source, en anglais — traduit à l'affichage. */
  classification: string
  updatedAt: string
  previousValue?: number
}

/** Statistiques agrégées d'une classe d'actif, pour la barre de stats globale. */
export interface GlobalMarketStats {
  assetClass: AssetClass
  totalMarketCap: number
  totalVolume24h: number
  /** Variation de la capitalisation totale sur 24 h, en pourcentage. */
  marketCapChange24h: number
  /** Part de marché par symbole, ex. { btc: 54.2, eth: 12.8 }. */
  dominance: Record<string, number>
  activeAssets: number
  currency: string
  lastUpdated: string
}

export type SortField = 'marketCap' | 'volume24h' | 'price' | 'change24h' | 'change7d'
export type SortDirection = 'asc' | 'desc'

export interface ListAssetsParams {
  /** Devise de cotation demandée (ISO 4217, minuscules acceptées). */
  currency?: string
  page?: number
  perPage?: number
  sortBy?: SortField
  sortDirection?: SortDirection
  /** Inclure la série 7 jours — coûteux chez certains fournisseurs. */
  withSparkline?: boolean
  /**
   * Classe demandée, pour les fournisseurs multi-classes.
   *
   * Yahoo couvre quatre classes derrière un seul adaptateur : sans ce paramètre, il
   * ne saurait pas s'il doit renvoyer des actions ou des indices.
   */
  assetClass?: AssetClass
}

/**
 * Contrat d'un fournisseur de données de marché.
 *
 * `listAssets` est le seul membre obligatoire au-delà des métadonnées : tout
 * fournisseur sait lister des actifs. Le reste est optionnel parce que la
 * disponibilité varie réellement d'une source à l'autre — et le §5 interdit de
 * combler un trou par une valeur inventée. Un module dont la méthode est absente
 * n'est tout simplement pas rendu.
 */
export interface MarketDataProvider {
  readonly id: string
  readonly label: string
  readonly assetClasses: readonly AssetClass[]
  /** URL d'attribution, affichée dans le pied de page des modules concernés. */
  readonly attributionUrl: string

  /**
   * Le fournisseur dispose-t-il de tout ce qu'il lui faut pour répondre ?
   *
   * C'est le point d'application de la règle « zéro donnée factice » : lorsque
   * ceci renvoie `false`, le registre ne retourne pas le fournisseur, et l'UI
   * bascule sur un état vide explicite au lieu d'afficher des chiffres.
   */
  isConfigured(): boolean
  /** Raison lisible de l'indisponibilité, affichée à l'utilisateur. */
  unavailableReason(): string | null

  listAssets(params?: ListAssetsParams): Promise<MarketAsset[]>
  getGlobalStats?(currency?: string): Promise<GlobalMarketStats>
  getTrending?(currency?: string): Promise<TrendingAsset[]>
  /** Fiche complète d'un actif, pour sa page de détail. */
  getAsset?(id: string, assetClass: AssetClass, currency?: string): Promise<AssetDetail>
  /** Série de prix sur `days` jours, pour le graphique de la fiche. */
  getHistory?(
    id: string,
    days: number,
    assetClass?: AssetClass,
    currency?: string,
  ): Promise<PriceHistory>
  /** Secteurs / narratifs, quand la source en publie. */
  getCategories?(currency?: string): Promise<MarketCategory[]>
}

/** Erreur normalisée remontée par la couche adaptateur. */
export class ProviderError extends Error {
  readonly providerId: string
  readonly status?: number
  readonly retryable: boolean

  constructor(
    providerId: string,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ProviderError'
    this.providerId = providerId
    this.status = options.status
    this.retryable = options.retryable ?? false
  }
}
