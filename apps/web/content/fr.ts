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

  search: {
    title: 'Recherche universelle',
    open: 'Ouvrir la recherche',
    close: 'Fermer la recherche',
    placeholder: 'Rechercher un actif, un symbole…',
    trendingTitle: 'Tendances',
    trendingHint: 'les plus consultés ces 24 h',
    trendingEmpty: 'Tendances momentanément indisponibles.',
    otherAssets: 'Actions, ETF, indices et matières premières',
    loading: 'Recherche en cours…',
    noResult: (query: string) => `Aucun actif ne correspond à « ${query} ».`,
    cryptoUnavailable:
      'La source crypto est momentanément saturée. Les autres classes d’actifs restent consultables.',
    hint: 'Ctrl + K pour rouvrir la recherche',
  },

  locale: {
    open: 'Langue et devise',
    language: 'Langue',
    languageHint:
      'Le site est publié en français. Les autres langues arriveront avec les fichiers de traduction — nous préférons ne rien proposer plutôt qu’une traduction automatique.',
    currency: 'Devise locale',
    currencyHint: (date: string) =>
      `Conversion au taux de référence BCE du ${date}. Les sources cotent en euros ; la devise choisie est appliquée à tout le site.`,
    search: 'Rechercher',
    noMatch: 'Aucune devise ne correspond.',
    convertedFrom: (from: string, date: string) => `converti depuis ${from} · taux BCE du ${date}`,
  },

  auth: {
    signIn: 'Connexion',
    signUp: 'S’inscrire',
    // Pas de libellés « Mon compte » / « Déconnexion » ici : le <UserButton> de Clerk
    // porte son propre menu, déjà traduit par la localisation frFR du fournisseur.
    unavailableTitle: 'Comptes bientôt disponibles',
    unavailableBody:
      'L’authentification n’est pas encore configurée sur cette instance. Les comptes débloqueront la watchlist persistante, les alertes de prix et les préférences d’affichage.',
    signInTitle: 'Se connecter à ZENITH',
    signInSubtitle: 'Retrouvez votre watchlist et vos préférences.',
    signUpTitle: 'Créer un compte ZENITH',
    signUpSubtitle:
      'Gratuit. Aucune donnée bancaire demandée — ZENITH ne gère ni fonds ni transaction.',
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
    notFound: 'Page introuvable',
    learn: 'Apprendre',
    getStarted: 'Bien démarrer',
    blog: 'Blog',
    methodology: 'Méthodologie & sources',
    developers: 'API & développeurs',
    help: 'Centre d’aide',
    changelog: 'Nouveautés',
    about: 'À propos',
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
    marketCapSeriesLabel: (minutes: number) =>
      `Évolution de la capitalisation totale sur les ${minutes} dernières minutes`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `Relevés ZENITH sur ${Math.round(minutes / 60)} h`
        : `Relevés ZENITH sur ${minutes} min`,
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Courbe en cours de constitution : aucune source gratuite ne publie l’historique de la capitalisation mondiale, nous enregistrons donc nos propres relevés.'
        : `Courbe en cours de constitution — ${count} relevé${count > 1 ? 's' : ''} enregistré${count > 1 ? 's' : ''}. Nous traçons nos propres mesures, faute de source gratuite pour cet historique.`,
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
      /** En-tête de la colonne unique de variation, quand un sélecteur de période la pilote. */
      variation: 'Variation',
      watch: 'Suivi',
      /** Amplitude de la séance — remplace la capitalisation quand la source ne la publie pas. */
      dayRange: 'Plus bas / plus haut 24 h',
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
    chart: {
      kindTitle: 'Type de graphique',
      kinds: {
        area: 'Aire',
        line: 'Ligne',
        baseline: 'Écart',
        candles: 'Chandeliers',
        bars: 'Barres',
      },
      optionsTitle: 'Affichage',
      volume: 'Volume',
      movingAverage: 'Moyenne mobile',
      priceLines: 'Extrêmes',
      loadingCandles: 'Chargement des bougies…',
      /** Message affiché quand la source ne publie pas d'OHLC pour cet actif. */
      candlesUnavailable:
        'Cette source ne publie pas de bougies pour cet actif — les vues Chandeliers et Barres sont donc indisponibles.',
      volumeUnavailable: 'Volume non publié par la source pour cette période.',
    },
    tabs: {
      overview: 'Aperçu',
      history: 'Historique',
      stats: 'Statistiques',
      about: 'À propos',
      faq: 'FAQ',
    },
    currencyLabel: 'Devise d’affichage',
    convertedNotice: (from: string, to: string, date: string) =>
      `Montants convertis de ${from} vers ${to} au taux de référence BCE du ${date}. La source cote cet actif en ${from}.`,
    loadingSeries: 'Chargement de la série…',
    performanceTitle: 'Performance par période',
    performanceNote:
      'Variations calculées sur la série d’un an chargée pour cet actif ; celle de 24 h est reprise telle quelle de la source.',
    rangeYearTitle: 'Extrêmes sur un an',
    lowest: 'Plus bas',
    highest: 'Plus haut',
    faq: {
      priceQ: (name: string) => `Quel est le cours de ${name} aujourd’hui ?`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} s’échange à ${price}. Dernière valeur publiée par notre source le ${updated}.`,
      capQ: (name: string) => `Quelle est la capitalisation de ${name} ?`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `Sa capitalisation s’élève à ${cap}, ce qui le place au rang ${rank} de sa classe d’actif.`
          : `Sa capitalisation s’élève à ${cap}.`,
      athQ: (name: string) => `Quel est le plus haut historique de ${name} ?`,
      athA: (price: string, date: string | null) =>
        date
          ? `Son plus haut historique est de ${price}, atteint le ${date}.`
          : `Son plus haut historique est de ${price}.`,
      supplyQ: (name: string) => `Combien d’unités de ${name} existeront au maximum ?`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `L’offre maximale est de ${max} ${symbol}, dont ${circulating} ${symbol} sont actuellement en circulation.`
          : `L’offre maximale est de ${max} ${symbol}.`,
      buyQ: (name: string) => `Peut-on acheter ${name} sur ZENITH ?`,
      buyA:
        'Non. ZENITH est une plateforme d’information : nous n’exécutons aucun ordre, ne détenons aucun fonds et ne sommes ni courtier ni plateforme d’échange.',
    },
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
      high52w: 'Plus haut 52 semaines',
      low52w: 'Plus bas 52 semaines',
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
    positioning:
      'Plateforme d’information, sans exécution d’ordres ni conservation de fonds.',
    community: 'Communauté',
    locale: 'Français · EUR',
    localeHint:
      'Le site est publié en français, avec l’euro comme devise de référence. D’autres langues et devises suivront.',
    disclaimer:
      'ZENITH est une plateforme d’information en lecture seule. Aucune fonction d’achat, de vente ou de connexion à un portefeuille. Les informations affichées ne constituent pas un conseil en investissement.',
    dataNote: 'Données de marché fournies par des sources publiques, actualisées toutes les 5 minutes.',
    /**
     * Formulation imposée par les CGU de l'API CoinGecko — à conserver telle quelle,
     * en anglais. C'est une mention d'attribution contractuelle, pas un élément
     * d'interface : la traduire ne satisferait pas l'obligation.
     */
    poweredByCoinGecko: 'Powered by CoinGecko',
    rights: (year: number) => `© ${year} ZENITH`,
  },

  placeholder: {
    plannedTitle: 'Ce que cette page contiendra',
    meanwhileTitle: 'En attendant',
    meanwhileBody:
      'La page Méthodologie détaille dès maintenant d’où viennent nos chiffres, à quelle fréquence ils sont actualisés et ce que nous n’affichons pas faute de source.',
    meanwhileCta: 'Voir la méthodologie',
  },

  notFound: {
    title: 'Ce sommet n’existe pas',
    body: 'La page que tu cherches a été déplacée ou n’a jamais existé. Reprends l’ascension depuis l’accueil.',
    cta: 'Retour à l’accueil',
  },
} as const
