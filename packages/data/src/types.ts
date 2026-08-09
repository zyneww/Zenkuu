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
   * Fenêtres longues, renvoyées par le même appel que les précédentes.
   *
   * Toutes les sources ne les publient pas — Yahoo n'expose que la variation du
   * jour. Un classement demandé sur une période absente doit donc l'annoncer au
   * lieu de retomber silencieusement sur 24 h (§5).
   */
  change14d?: number
  change30d?: number
  change1y?: number
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

/**
 * Fiche détaillée d'un actif — enrichit `MarketAsset` de ce qui n'a de sens que sur sa page.
 *
 * La plupart des champs ajoutés ici ne coûtent AUCUN appel réseau : la réponse de
 * `/coins/{id}`, déjà récupérée pour le prix et la description, transporte les liens,
 * les adresses de contrat, la valorisation diluée et les prix dans toutes les devises.
 * Ils étaient simplement jetés faute d'être typés.
 */
export interface AssetDetail extends MarketAsset {
  /** Texte de présentation fourni par la source, déjà nettoyé de son HTML. */
  description?: string
  homepageUrl?: string
  /** Identifiants d'actifs de la même catégorie, pour la colonne « comparables ». */
  categories?: string[]

  /**
   * Valorisation totalement diluée : capitalisation si l'offre maximale circulait.
   *
   * Reprise TELLE QUELLE de la source, jamais recalculée en `prix × offre totale` —
   * la source applique ses propres règles sur les jetons verrouillés ou brûlés, et
   * un produit maison divergerait du chiffre publié partout ailleurs (§5).
   */
  fdv?: number
  /** Valeur totale verrouillée — n'existe que pour les protocoles de finance décentralisée. */
  tvl?: number
  /** Écart en pourcentage au plus haut / plus bas historique, publié par la source. */
  athChangePercent?: number
  atlChangePercent?: number

  /** Adresses de contrat par chaîne, ex. { ethereum: '0x7fc6…' }. */
  contracts?: Record<string, string>
  /** Explorateurs de blocs, livre blanc, code source, forum — liens vérifiés non vides. */
  explorerUrls?: string[]
  whitepaperUrl?: string
  sourceCodeUrl?: string
  /** Réseaux communautaires : libellé lisible → URL. */
  communityUrls?: Record<string, string>

  /**
   * Cours dans toutes les devises publiées par la source, en minuscules (`{ usd, eur… }`).
   *
   * Ce sont des cotations RÉELLES et non des conversions maison : la source publie le
   * prix devise par devise. Elles sont donc préférables à un produit par un taux de
   * change, qui introduirait un second niveau d'approximation.
   */
  pricesByCurrency?: Record<string, number>
}

/**
 * Une place de cotation pour un actif — une ligne du tableau « où se négocie… ».
 *
 * `spreadPercent` et `volumePercent` peuvent manquer : la source ne les calcule pas
 * pour toutes les paires. Absent signifie absent, jamais zéro (§5).
 */
export interface AssetTicker {
  exchange: string
  base: string
  target: string
  /** Prix converti dans la devise demandée par l'appelant. */
  price: number
  currency: string
  volume24h?: number
  spreadPercent?: number
  /** Part de cette place dans le volume total de l'actif. */
  volumePercent?: number
  /** Lien direct vers la paire chez la place, quand la source le fournit. */
  tradeUrl?: string
  /** Horodatage ISO 8601 de la dernière cotation reçue. */
  lastTraded?: string
}

/** Série de prix pour les graphiques de la fiche actif. */
export interface PriceHistory {
  /**
   * `volume` accompagne le prix quand la source le publie DANS LA MÊME réponse.
   *
   * C'est le cas de `market_chart` chez CoinGecko, dont le champ `total_volumes`
   * était jusqu'ici ignoré : le sous-graphique de volume ne coûte donc aucun appel
   * supplémentaire. Absent = la source ne l'a pas fourni, et le module disparaît.
   */
  points: { timestamp: number; price: number; volume?: number }[]
  currency: string
  /** Fenêtre demandée, en jours — utile pour libeller l'axe. */
  days: number
}

/**
 * Une bougie : ouverture, plus haut, plus bas, clôture sur un intervalle.
 *
 * `volume` est optionnel, et ce n'est pas de la prudence de façade : CoinGecko
 * publie l'OHLC et les volumes par DEUX endpoints distincts, et son endpoint OHLC
 * n'inclut aucun volume. Un `volume` absent signifie donc « la source ne le donne
 * pas pour cet actif » — le sous-graphique de volume est alors omis, jamais dessiné
 * à partir d'une valeur reconstituée (§5).
 */
export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Série de bougies pour le graphique en chandeliers.
 *
 * Type SÉPARÉ de `PriceHistory`, et non une extension : une série de prix ne peut
 * pas être convertie en bougies sans inventer trois valeurs sur quatre. Garder les
 * deux formes distinctes rend cette impossibilité visible dans le typage — un
 * appelant qui veut des chandeliers doit disposer d'une vraie source OHLC.
 */
export interface OhlcHistory {
  candles: Candle[]
  currency: string
  days: number
  /**
   * Granularité réellement renvoyée par la source, en minutes.
   *
   * CoinGecko l'impose selon la fenêtre demandée (30 min jusqu'à 30 jours, 4 h
   * au-delà) au lieu de la laisser choisir. L'exposer évite que l'interface annonce
   * une précision que la donnée n'a pas.
   */
  intervalMinutes?: number
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
  /**
   * Identifiants des mêmes actifs, alignés sur `topAssets`.
   *
   * Ce sont eux qui rendent les logos CLIQUABLES vers la fiche de l'actif : sans
   * eux, une vignette n'est qu'un ornement. La source les publie dans la même
   * réponse (`top_3_coins_id`), ils ne coûtent donc aucun appel.
   */
  topAssetIds?: string[]
  /** Définition du secteur, publiée par la source (champ `content`). */
  description?: string
}

/** Article d'actualité agrégé depuis un flux public. */
export interface NewsItem {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  excerpt?: string
  /**
   * Rubrique héritée du FLUX d'origine, jamais déduite du texte de l'article.
   *
   * Un flux « marchés » ne publie que de l'actualité marchés : l'étiquette est donc
   * exacte par construction. La déduire par mots-clés dans un titre produirait des
   * classements faux, c'est-à-dire de la donnée inventée (§5).
   */
  category?: string
}

/**
 * Résultat de recherche universelle.
 *
 * Volontairement minimal : la recherche doit répondre vite et sur beaucoup de
 * candidats. Aller chercher le prix de chaque résultat coûterait un appel par ligne
 * — inenvisageable sur le quota gratuit. La liste affiche donc identité et rang, et
 * c'est la fiche de l'actif qui porte les chiffres.
 */
export interface SearchResult {
  id: string
  name: string
  symbol: string
  assetClass: AssetClass
  image?: string
  /** Rang par capitalisation, quand la source le fournit — sert à ordonner. */
  rank?: number
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
  /**
   * Restreindre à des identifiants précis, dans l'ordre du fournisseur.
   *
   * Sert aux listes dont une AUTRE source ne donne que les identifiants — les
   * tendances CoinGecko en sont le cas type : leur endpoint ne cote qu'en dollars
   * et ne publie ni capitalisation ni volume. Sans ce paramètre, un onglet
   * « Tendance » ne pourrait afficher qu'un nom et une variation, là où recharger
   * ces mêmes actifs par identifiant rend un tableau complet et cohérent avec les
   * autres vues.
   *
   * Un fournisseur qui ne sait pas filtrer par identifiant IGNORE ce paramètre : il
   * renverra plus large, jamais faux. L'appelant reste donc tenu de filtrer.
   */
  ids?: string[]
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
  /**
   * Bougies OHLC sur `days` jours, quand la source en publie.
   *
   * Distinct de `getHistory` parce que la disponibilité l'est réellement : la BCE
   * ne cote qu'un taux de référence par jour ouvré, elle n'a ni ouverture ni plus
   * haut. Un fournisseur qui n'implémente pas cette méthode fait simplement
   * disparaître le type « chandeliers » du sélecteur, sans dégrader le reste.
   */
  getOhlc?(
    id: string,
    days: number,
    assetClass?: AssetClass,
    currency?: string,
  ): Promise<OhlcHistory>
  /** Secteurs / narratifs, quand la source en publie. */
  getCategories?(currency?: string): Promise<MarketCategory[]>
  /**
   * Places de cotation d'un actif — le seul module de la fiche qui coûte un appel
   * réseau dédié, d'où sa méthode séparée plutôt qu'un champ de `getAsset`.
   */
  getTickers?(id: string, currency?: string, limit?: number): Promise<AssetTicker[]>
  /** Recherche par nom ou symbole, quand la source expose un index. */
  search?(query: string, limit?: number): Promise<SearchResult[]>
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
