/**
 * Textes de l'interface, en français.
 *
 * Le §9 demande de préparer l'internationalisation sans l'implémenter au MVP.
 * Regrouper les chaînes ici suffit à cet objectif : le jour où une seconde langue
 * arrive, on ajoute `en.ts` à côté et un sélecteur, sans avoir à repasser sur
 * chaque composant. Pas de bibliothèque i18n tant qu'il n'y a qu'une langue.
 */

export const fr = {
  site: {
    name: 'Zenith',
    tagline: 'Suivi et analyse de marché multi-actifs',
    description:
      'Cryptomonnaies, forex, actions, ETF, matières premières et indices — prix, capitalisations et tendances au même endroit. Plateforme d’analyse en lecture seule.',
  },

  nav: {
    home: 'Accueil',
    soon: 'Bientôt disponible',
    soonShort: 'Bientôt',
    openMenu: 'Ouvrir le menu',
    searchPlaceholder: 'Rechercher un actif',
    searchSoon: 'La recherche universelle arrive avec les prochaines classes d’actifs.',
    skipToContent: 'Aller au contenu principal',
  },

  theme: {
    switchToDark: 'Passer en thème sombre',
    switchToLight: 'Passer en thème clair',
  },

  /** Titres d'onglet — le gabarit « Zenith | %s » est posé dans le layout. */
  pages: {
    home: 'Accueil',
    crypto: 'Cryptomonnaies',
    forex: 'Devises',
    stocks: 'Actions',
    etf: 'ETF',
    commodities: 'Matières premières',
    indices: 'Indices',
    categories: 'Catégories',
    news: 'Actualités',
    sentiment: 'Sentiment de marché',
    movers: 'Hausses et baisses',
    account: 'Compte',
    notFound: 'Page introuvable',
  },

  globalStats: {
    marketCap: 'Capitalisation totale',
    volume: 'Volume 24 h',
    dominanceBtc: 'Dominance BTC',
    dominanceEth: 'Dominance ETH',
    activeAssets: 'Cryptos actives',
    unavailable: 'Statistiques globales momentanément indisponibles',
    caption: (value: string, change: string) =>
      `La capitalisation mondiale des cryptomonnaies s’élève à ${value}, soit ${change} sur les dernières 24 heures.`,
  },

  home: {
    trendingTitle: 'Tendances',
    trendingHint: 'Les actifs les plus consultés ces dernières 24 heures',
    gainersTitle: 'Plus fortes hausses',
    losersTitle: 'Plus fortes baisses',
    moversHint: (size: number) => `Parmi les ${size} plus grandes capitalisations`,
    topMarketCapTitle: 'Top capitalisations',
    marketCapCardTitle: 'Capitalisation du marché',
    volumeCardTitle: 'Volume négocié 24 h',
    narrativesTitle: 'Narratifs du jour',
    narrativesHint: 'Les secteurs qui bougent le plus sur 24 heures',
    newsTitle: 'Dernières actualités',
    sentimentTitle: 'Sentiment du marché',
    coverageTitle: 'Couverture par classe d’actif',
    coverageHint: 'Ce qui est branché aujourd’hui, et ce qui reste à connecter',
    forexTitle: 'Devises · référence BCE',
    forexHint: 'Taux publiés une fois par jour ouvré',
    watchlistTitle: 'Ma watchlist',
    watchlistEmptyTitle: 'Ta watchlist est vide',
    watchlistEmptyBody:
      'Ajoute ton premier actif pour commencer ton ascension. Le suivi personnalisé arrive avec les comptes utilisateurs.',
    seeAll: 'Tout voir',
    tabs: {
      all: 'Tout',
      trending: 'Tendances',
      gainers: 'Hausses',
      losers: 'Baisses',
      categories: 'Catégories',
    },
  },

  market: {
    columns: {
      rank: '#',
      name: 'Actif',
      price: 'Prix',
      change1h: '1 h',
      change24h: '24 h',
      change7d: '7 j',
      volume: 'Volume 24 h',
      marketCap: 'Capitalisation',
      chart: '7 jours',
    },
    sortByMarketCap: 'Trier par capitalisation',
    sortByVolume: 'Trier par volume',
    sortNotSupported:
      'Le tri porte sur l’ensemble du classement. Les colonnes de variation ne sont pas triables : la source ne le permet pas à l’échelle du marché entier.',
    previous: 'Page précédente',
    next: 'Page suivante',
    pageLabel: (page: number) => `Page ${page}`,
    emptyPage: 'Aucun actif sur cette page du classement. Reviens à la première page.',
  },

  crypto: {
    title: 'Classement des cryptomonnaies',
    subtitle: 'Prix, capitalisation et volume en euros, actualisés toutes les 5 minutes.',
  },

  forex: {
    title: 'Taux de change',
    subtitle:
      'Taux de référence publiés par la Banque centrale européenne, une fois par jour ouvré.',
  },

  stocks: {
    title: 'Actions',
    subtitle: 'Cours et capitalisations des principales valeurs cotées.',
  },

  etf: {
    title: 'ETF',
    subtitle: 'Fonds indiciels cotés : cours, variation et volume.',
  },

  commodities: {
    title: 'Matières premières',
    subtitle: 'Énergie, métaux précieux et industriels, produits agricoles.',
  },

  indices: {
    title: 'Indices boursiers',
    subtitle: 'Les grands indices mondiaux et leur évolution récente.',
  },

  asset: {
    priceLabel: (name: string) => `Cours de ${name}`,
    statsTitle: 'Statistiques de marché',
    aboutTitle: (name: string) => `À propos de ${name}`,
    similarTitle: 'Actifs comparables',
    rangeTitle: 'Période',
    ranges: { d1: '24 h', d7: '7 j', d30: '30 j', d90: '90 j', y1: '1 an' },
    stats: {
      marketCap: 'Capitalisation',
      volume: 'Volume 24 h',
      circulating: 'Offre en circulation',
      total: 'Offre totale',
      max: 'Offre maximale',
      ath: 'Plus haut historique',
      atl: 'Plus bas historique',
      rank: 'Rang',
      low24h: 'Plus bas 24 h',
      high24h: 'Plus haut 24 h',
      previousClose: 'Clôture précédente',
      exchange: 'Place de cotation',
    },
    noDescription: 'Aucune description n’est fournie par la source pour cet actif.',
    readOnly:
      'Page d’information uniquement. ZENITH ne permet ni achat, ni vente, ni passage d’ordre.',
    officialLinks: 'Liens officiels',
    website: 'Site officiel',
    notFoundTitle: 'Actif introuvable',
    notFoundBody: 'Cet identifiant ne correspond à aucun actif connu de nos sources.',
    backToRanking: 'Retour au classement',
    chartUnavailable: 'Historique de cours indisponible pour cet actif.',
  },

  categories: {
    title: 'Catégories et secteurs',
    subtitle: 'Performance des grands narratifs du marché crypto sur 24 heures.',
    columns: { name: 'Catégorie', marketCap: 'Capitalisation', change: '24 h', volume: 'Volume 24 h' },
  },

  news: {
    title: 'Actualités des marchés',
    subtitle: 'Agrégées depuis les flux publics des principaux éditeurs.',
    readOn: (source: string) => `Lire sur ${source}`,
    unavailable: 'Fil d’actualités momentanément indisponible.',
  },

  sentiment: {
    title: 'Indice Fear & Greed',
    subtitle:
      'Mesure composite du sentiment du marché crypto, de 0 (peur extrême) à 100 (avidité extrême).',
    scale: {
      extremeFear: 'Peur extrême',
      fear: 'Peur',
      neutral: 'Neutre',
      greed: 'Avidité',
      extremeGreed: 'Avidité extrême',
    },
    disclaimer:
      'Indicateur de sentiment, pas de recommandation. Il ne prédit aucune évolution de prix.',
  },

  assetClass: {
    crypto: 'Cryptomonnaies',
    forex: 'Devises',
    stock: 'Actions',
    etf: 'ETF',
    commodity: 'Matières premières',
    index: 'Indices',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: 'Données indisponibles',
    connected: 'Connecté',
    pending: 'À connecter',
  },

  footer: {
    disclaimer:
      'ZENITH est une plateforme d’information en lecture seule. Aucune fonction d’achat, de vente ou de connexion à un portefeuille. Les informations affichées ne constituent pas un conseil en investissement.',
    dataNote: 'Données de marché fournies par des sources publiques, actualisées toutes les 5 minutes.',
    rights: (year: number) => `© ${year} ZENITH`,
  },

  notFound: {
    title: 'Ce sommet n’existe pas',
    body: 'La page que tu cherches a été déplacée ou n’a jamais existé. Reprends l’ascension depuis l’accueil.',
    cta: 'Retour à l’accueil',
  },
} as const
