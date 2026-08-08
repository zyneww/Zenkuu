/**
 * Structure de la navigation principale.
 *
 * Conçue depuis notre propre positionnement, pas recopiée : CoinGecko range son
 * menu par TYPE D'OBJET (Cryptomonnaies, Exchanges, RWA, Products, API) parce qu'il
 * vend de la donnée et référence des plateformes d'échange. ZENITH ne vend rien et
 * n'échange rien — on range donc par INTENTION DE LECTURE : « qu'est-ce que je
 * regarde ? » (Marchés), « qui monte, qui descend ? » (Classements), « qu'est-ce que
 * j'en déduis ? » (Analyse), « que s'est-il passé ? » (Actualités).
 *
 * Aucune entrée ne mène ni ne fait référence à un achat, une vente ou un ordre (§7).
 *
 * `ready: false` signale une destination pas encore construite : l'entrée s'affiche
 * en grisé avec la mention « Bientôt », plutôt que d'être masquée — la trajectoire du
 * produit est une information utile, un lien mort ne l'est pas.
 */

export interface NavItem {
  label: string
  description: string
  href?: string
  ready: boolean
}

export interface NavMenu {
  label: string
  /** Destination du libellé du menu lui-même, quand elle existe. */
  href?: string
  items: NavItem[]
}

export const NAV_MENUS: NavMenu[] = [
  {
    label: 'Marchés',
    items: [
      {
        label: 'Cryptomonnaies',
        description: 'Classement, capitalisations et volumes',
        href: '/crypto',
        ready: true,
      },
      {
        label: 'Devises',
        description: 'Paires majeures, taux de référence BCE',
        href: '/devises',
        ready: true,
      },
      {
        label: 'Actions',
        description: 'Cours, capitalisation et fondamentaux',
        href: '/actions',
        ready: true,
      },
      {
        label: 'ETF',
        description: 'Frais, encours et performance',
        href: '/etf',
        ready: true,
      },
      {
        label: 'Matières premières',
        description: 'Énergie, métaux et agricoles',
        href: '/matieres-premieres',
        ready: true,
      },
      {
        label: 'Indices',
        description: 'Grands indices et leur composition',
        href: '/indices',
        ready: true,
      },
    ],
  },
  {
    label: 'Classements',
    items: [
      {
        label: 'Top capitalisations',
        description: 'Les plus grandes valorisations du marché',
        href: '/crypto',
        ready: true,
      },
      {
        label: 'Plus fortes hausses',
        description: 'Meilleures performances sur 24 heures',
        href: '/crypto/mouvements',
        ready: true,
      },
      {
        label: 'Plus fortes baisses',
        description: 'Plus forts reculs sur 24 heures',
        href: '/crypto/mouvements',
        ready: true,
      },
      {
        label: 'Catégories & secteurs',
        description: 'Performance par narratif et par secteur',
        href: '/categories',
        ready: true,
      },
      {
        label: 'Indice de sentiment',
        description: 'Fear & Greed du marché crypto',
        href: '/sentiment',
        ready: true,
      },
    ],
  },
  {
    label: 'Analyse',
    items: [
      {
        label: 'Comparateur',
        description: 'Deux à quatre actifs côte à côte',
        ready: false,
      },
      {
        label: 'Convertisseur',
        description: 'Conversion entre devises et actifs',
        ready: false,
      },
      {
        label: 'Screener',
        description: 'Filtrer le marché sur vos critères',
        ready: false,
      },
      {
        label: 'Heatmap sectorielle',
        description: 'Vue d’ensemble des secteurs en un coup d’œil',
        ready: false,
      },
      {
        label: 'Corrélations',
        description: 'Comment les actifs évoluent les uns par rapport aux autres',
        ready: false,
      },
    ],
  },
  {
    label: 'Actualités',
    items: [
      {
        label: 'Toute l’actualité',
        description: 'Le fil complet, toutes sources confondues',
        href: '/actualites',
        ready: true,
      },
      {
        label: 'Calendrier économique',
        description: 'Publications macro et événements à venir',
        ready: false,
      },
      {
        label: 'Événements crypto',
        description: 'Halvings, déblocages de jetons, mises à jour réseau',
        ready: false,
      },
    ],
  },
]
