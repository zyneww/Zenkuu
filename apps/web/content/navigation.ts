import {
  Activity,
  ArrowRightLeft,
  Banknote,
  Building2,
  CandlestickChart,
  Coins,
  Filter,
  Gauge,
  Gem,
  GitCompareArrows,
  GraduationCap,
  Globe2,
  Grid3x3,
  Info,
  Layers,
  LifeBuoy,
  LineChart,
  Landmark,
  TrendingUp,
  Newspaper,
  PenLine,
  Rocket,
  Recycle,
  Scale,
  Sparkles,
  Sprout,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

/**
 * Structure de la navigation principale.
 *
 * ⚠️ CETTE STRUCTURE EST CELLE DE LA RÉFÉRENCE, ET C'EST UN RENVERSEMENT ASSUMÉ.
 *
 * Cette note disait exactement l'inverse : « Conçue depuis notre propre
 * positionnement, pas recopiée », et rangeait par INTENTION DE LECTURE — Marchés,
 * Données, Analyse, Actualités, Plus — au motif que CoinGecko range par type d'objet
 * parce qu'il vend de la donnée, ce que ZENKUU ne fait pas.
 *
 * Le raisonnement se tenait sous l'ancien mandat. Le mandat du 2026-08-30 est la
 * fidélité intégrale, et l'exploitant a tranché pour « méga-menus complets, contenu
 * ZENKUU ». Les rubriques suivent donc les leurs — Cryptomonnaies, Plateformes,
 * Actifs réels, Apprendre, Portefeuille — relevées sur `coingecko.com`, et chaque
 * panneau est rempli des pages que ZENKUU possède RÉELLEMENT.
 *
 * Deux règles ont guidé le remplissage :
 *
 *   · Une rubrique de la référence sans équivalent ici DISPARAÎT plutôt que de
 *     pointer vers du vide — API, Ask Gecko, Candy, et les produits.
 *
 *   · Une page de ZENKUU sans équivalent chez elle ne disparaît PAS. La référence a
 *     une rubrique de produits : cette place existe dans sa structure, et « Plus »
 *     l'occupe. Orpheliner une page construite pour gagner une rubrique coûterait
 *     plus que la sixième entrée de la barre.
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
  icon: LucideIcon
  href?: string
  ready: boolean
}

export interface NavSection {
  /** Libellé discret ; omis pour un groupe qui se passe d'intitulé. */
  label?: string
  items: NavItem[]
}

export interface NavMenu {
  label: string
  /**
   * Destination du menu lui-même, quand il n'ouvre AUCUN panneau.
   *
   * ── POURQUOI UN MENU PEUT NE PAS ÊTRE UN MENU ─────────────────────────────
   *
   * « Parcourir » ne déroule rien : il mène à une page qui porte déjà, en onglets
   * centrés, les sept classes d'actifs que son panneau énumérait. Garder le panneau
   * reviendrait à faire choisir DEUX FOIS — une fois dans un menu qui se referme,
   * une fois dans une barre d'onglets qui reste — et la première fois ne servirait
   * qu'à décider par quel onglet on arrive.
   *
   * Le champ est optionnel plutôt que porté par un second type : les deux formes
   * partagent tout le reste (libellé, place dans la barre, comportement au clavier),
   * et une union de types obligerait chaque lecture de `NAV_MENUS` à distinguer les
   * deux avant même de lire un libellé.
   *
   * `sections` reste alors VIDE, et c'est ce vide qui déclenche le rendu en lien.
   * Un menu qui porterait les deux serait ambigu : cliquer navigue-t-il, ou ouvre-t-il ?
   */
  href?: string
  sections: NavSection[]
}

export const NAV_MENUS: NavMenu[] = [
  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « CRYPTOMONNAIES » — LEUR PREMIÈRE RUBRIQUE, LEURS ENTRÉES
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * Panneau relevé le 2026-08-30 sur `coingecko.com` : By Market Cap, Categories,
   * Chains, Rehypothecated, Crypto Treasuries, NFT, Highlights, New
   * Cryptocurrencies, Gainers & Losers, All Coins, Compare Coins and NFT,
   * Converter, Global Chart.
   *
   * Onze des treize ont un équivalent ici. « Rehypothecated » n'en a pas — c'est un
   * classement d'actifs réhypothéqués qu'aucune source de ZENKUU ne produit — et
   * « All Coins » fait double emploi avec « By Market Cap » chez eux.
   *
   * ── DEUX ENTRÉES REJOIGNENT LE MENU, ET ELLES EXISTAIENT DÉJÀ ─────────────
   *
   * `/graphiques/tresoreries` et `/graphiques/nft` sont des pages construites que la
   * navigation ne montrait pas : on ne pouvait les atteindre qu'en connaissant leur
   * adresse. La structure de la référence leur donne une place.
   */
  {
    label: 'Cryptomonnaies',
    sections: [
      {
        label: 'Classements',
        items: [
          {
            label: 'Par capitalisation',
            description: 'Les premières capitalisations, page par page',
            icon: Coins,
            href: '/crypto',
            ready: true,
          },
          {
            label: 'Points forts',
            description: 'Hausses, baisses, volumes et rotation, au même endroit',
            icon: Trophy,
            href: '/classements',
            ready: true,
          },
          {
            label: 'Hausses et baisses',
            description: 'Les deux bouts du classement, sur la même fenêtre',
            icon: TrendingUp,
            href: '/classements/hausses',
            ready: true,
          },
          {
            label: 'Nouvelles cotations',
            description: 'Les actifs référencés le plus récemment',
            icon: Sprout,
            href: '/nouvelles-cotations',
            ready: true,
          },
          {
            label: 'Écart au sommet',
            description: 'Ce qui sépare chaque actif de son plus haut historique',
            icon: Trophy,
            href: '/classements/sommet',
            ready: true,
          },
          {
            label: 'Halving du bitcoin',
            description: 'Le calendrier des divisions par deux de la récompense de bloc',
            icon: Recycle,
            href: '/crypto/bitcoin/halving',
            ready: true,
          },
        ],
      },
      {
        label: 'Explorer',
        items: [
          {
            label: 'Toutes les catégories',
            description: 'Les secteurs du marché, classés par capitalisation',
            icon: Layers,
            href: '/categories',
            ready: true,
          },
          {
            label: 'Chaînes',
            description: 'Les écosystèmes, et ce qui s’y déploie',
            icon: Globe2,
            href: '/categories/ecosystemes',
            ready: true,
          },
          {
            label: 'Trésoreries',
            description: 'Les sociétés qui détiennent des cryptomonnaies',
            icon: Landmark,
            href: '/graphiques/tresoreries',
            ready: true,
          },
          {
            label: 'NFT',
            description: 'Les collections et leurs prix planchers',
            icon: Grid3x3,
            href: '/graphiques/nft',
            ready: true,
          },
        ],
      },
      {
        label: 'Outils',
        items: [
          {
            label: 'Comparateur',
            description: 'Deux actifs en regard, chiffre par chiffre',
            icon: GitCompareArrows,
            href: '/comparateur',
            ready: true,
          },
          {
            label: 'Convertisseur',
            description: 'Un montant d’un actif vers une devise',
            icon: ArrowRightLeft,
            href: '/convertisseur',
            ready: true,
          },
          {
            label: 'Graphique global',
            description: 'Capitalisation, volume et dominance dans le temps',
            icon: LineChart,
            href: '/graphiques',
            ready: true,
          },
        ],
      },
    ],
  },

  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « PLATEFORMES » — LEUR DEUXIÈME RUBRIQUE
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * Leur panneau : Crypto Exchanges, Decentralized Exchanges, Derivatives, Perp
   * DEXs. Trois sur quatre ont un équivalent ; ZENKUU n'a pas de liste de places
   * décentralisées — `/pool/[network]/[address]` décrit UNE réserve, pas un
   * classement de plateformes.
   *
   * Quatre entrées ne remplissent pas trois colonnes : la section n'a donc pas de
   * libellé, comme chez eux, où ce panneau est une liste simple.
   */
  {
    label: 'Plateformes',
    sections: [
      {
        items: [
          {
            label: 'Places de cotation',
            description: 'Où les actifs se négocient, et à quel volume',
            icon: Landmark,
            href: '/places',
            ready: true,
          },
          {
            label: 'Dérivés',
            description: 'Contrats à terme et perpétuels, par place',
            icon: CandlestickChart,
            href: '/derives',
            ready: true,
          },
          {
            label: 'Places de dérivés',
            description: 'Les plateformes spécialisées dans les perpétuels',
            icon: Building2,
            href: '/perpetuels',
            ready: true,
          },
        ],
      },
    ],
  },

  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « ACTIFS RÉELS » — C'EST LEUR RUBRIQUE « RWA », ET ELLE ABSORBE TRADFI
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * Découverte du relevé : chez eux, les actions, les matières premières et les ETF
   * ne forment PAS une rubrique séparée. Ils vivent sous « RWA » — By Market Cap,
   * Stocks, Commodities, ETFs, Global Chart — parce que ce sont des actifs du monde
   * réel tokenisés.
   *
   * Le menu « TradFi » de ZENKUU disparaît donc, et ses cinq classes le rejoignent.
   * Indices et devises s'y ajoutent : ils n'ont pas d'entrée chez la référence, mais
   * ce sont des pages construites qui relèvent de la même famille, et les laisser
   * hors du menu les rendrait inatteignables.
   */
  {
    label: 'Actifs réels',
    sections: [
      {
        items: [
          {
            label: 'Par capitalisation',
            description: 'Les actifs du monde réel portés par une chaîne',
            icon: Landmark,
            href: '/graphiques/actifs-reels',
            ready: true,
          },
          {
            label: 'Actions',
            description: 'Les valeurs cotées, cours et capitalisation',
            icon: TrendingUp,
            href: '/actions',
            ready: true,
          },
          {
            label: 'Matières premières',
            description: 'Métaux, énergie et denrées',
            icon: Gem,
            href: '/matieres-premieres',
            ready: true,
          },
          {
            label: 'ETF',
            description: 'Les fonds indiciels, par encours',
            icon: Layers,
            href: '/etf',
            ready: true,
          },
          {
            label: 'Indices',
            description: 'Les grands indices boursiers',
            icon: Scale,
            href: '/indices',
            ready: true,
          },
          {
            label: 'Devises',
            description: 'Les parités entre monnaies',
            icon: Banknote,
            href: '/devises',
            ready: true,
          },
        ],
      },
    ],
  },

  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « APPRENDRE » — LEUR RUBRIQUE « LEARN »
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * Leur panneau : Learn Crypto, Research Insights, News, Reports, Learn & Earn,
   * Videos, Newsletter, Glossary. Quatre sur huit ont un équivalent. Les quatre
   * autres sont des produits — un programme de récompenses, une chaîne vidéo, une
   * lettre d'information, un cabinet de recherche — pas des pages de données.
   *
   * Le glossaire A une entrée depuis le 2026-08-31. Cette note disait le contraire —
   * « pas d'index : `/resoudre/[terme]` définit UN terme, sans page qui les liste » —
   * et c'était vrai : les 32 définitions vivaient en SECTION de `/apprendre`. Elles
   * ont leur propre route, comme le `/glossary` de la référence.
   */
  {
    label: 'Apprendre',
    sections: [
      {
        items: [
          {
            label: 'Apprendre',
            description: 'Les notions du marché, expliquées',
            icon: GraduationCap,
            href: '/apprendre',
            ready: true,
          },
          {
            label: 'Bien démarrer',
            description: 'Par où commencer quand on arrive',
            icon: Rocket,
            href: '/bien-demarrer',
            ready: true,
          },
          {
            label: 'Actualité',
            description: 'Ce qui bouge, et chez quel éditeur',
            icon: Newspaper,
            href: '/actualites',
            ready: true,
          },
          {
            label: 'Blog',
            description: 'Nos analyses de fond',
            icon: PenLine,
            href: '/blog',
            ready: true,
          },
          {
            label: 'Glossaire',
            description: 'Le vocabulaire du marché, défini terme par terme',
            icon: GraduationCap,
            href: '/glossaire',
            ready: true,
          },
        ],
      },
    ],
  },

  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « PORTEFEUILLE » — UN LIEN, PAS UN PANNEAU
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * Leur rubrique « Portfolio » déroule My Coins / My NFTs / Overview. Ici, une
   * seule page porte les trois : dérouler un panneau d'une entrée ferait choisir
   * pour ne rien choisir. `href` sans `sections` — voir la note du type.
   */
  {
    label: 'Portefeuille',
    href: '/tableau-de-bord',
    sections: [],
  },

  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « PLUS » — CE QUE ZENKUU A ET QUE LA RÉFÉRENCE N'A PAS
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * La référence a une rubrique de produits (application, publicité, widget,
   * GeckoTerminal) : cette place existe donc dans sa structure. On y range ce qui
   * n'a pas d'équivalent chez elle plutôt que de le retirer du menu.
   *
   * ⚠️ CE N'EST PAS UN FOURRE-TOUT PAR DÉFAUT. Chaque entrée mène à une page
   * CONSTRUITE que la nouvelle structure laisserait autrement inatteignable : carte
   * thermique, indice de sentiment, screener, macroéconomie, rachats. Les orpheliner
   * pour gagner une rubrique coûterait plus qu'une sixième entrée dans la barre.
   */
  {
    label: 'Plus',
    sections: [
      {
        label: 'Outils',
        items: [
          {
            label: 'Carte thermique',
            description: 'Le marché en une figure, par taille et variation',
            icon: Grid3x3,
            href: '/heatmap',
            ready: true,
          },
          {
            label: 'Indice de sentiment',
            description: 'Ce que l’humeur du marché mesure, et ne mesure pas',
            icon: Gauge,
            href: '/sentiment',
            ready: true,
          },
          {
            label: 'Screener',
            description: 'Filtrer le marché sur vos propres critères',
            icon: Filter,
            href: '/screener',
            ready: true,
          },
        ],
      },
      {
        label: 'Contexte',
        items: [
          {
            label: 'Macroéconomie',
            description: 'Le terrain sur lequel les cours évoluent',
            icon: Globe2,
            href: '/macro',
            ready: true,
          },
          {
            label: 'Rachats',
            description: 'Les jetons retirés de la circulation',
            icon: Recycle,
            href: '/rachats',
            ready: true,
          },
        ],
      },
      {
        label: 'ZENKUU',
        items: [
          {
            label: 'Centre d’aide',
            description: 'Les questions qui reviennent, et leurs réponses',
            icon: LifeBuoy,
            href: '/aide',
            ready: true,
          },
          {
            label: 'Pourquoi ZENKUU',
            description: 'Les partis pris du site, en détail',
            icon: Sparkles,
            href: '/pourquoi-zenkuu',
            ready: true,
          },
          {
            label: 'Nouveautés',
            description: 'Ce qui a changé, daté',
            icon: Sparkles,
            href: '/nouveautes',
            ready: true,
          },
          {
            label: 'À propos',
            description: 'Qui édite ce site, et avec quelles sources',
            icon: Info,
            href: '/a-propos',
            ready: true,
          },
        ],
      },
    ],
  },
]
/** Icône générique des classes d'actifs, réutilisée hors navigation. */
export const ASSET_CLASS_ICON = Activity

/*
 * LES RACCOURCIS DIRECTS DE L'EN-TÊTE ONT ÉTÉ RETIRÉS.
 *
 * Trois liens — Heatmap, Screener, Sentiment — occupaient un second groupe après le
 * filet. Ils se justifiaient tant qu'ils ne doublaient pas les menus ; ils les
 * doublaient pourtant, chacune des trois destinations étant déjà annoncée plus haut
 * dans ce fichier (voir `/sentiment`, `/screener` et `/heatmap` dans NAV_MENUS).
 * Un même lien à deux endroits de la même barre n'accélère rien : il oblige à
 * choisir entre deux chemins identiques.
 *
 * Aucune page n'est devenue inatteignable par ce retrait, et c'est la seule
 * condition qui rendait la suppression sans risque.
 */
