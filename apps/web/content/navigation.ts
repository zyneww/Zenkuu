import {
  Activity,
  ArrowRightLeft,
  Bell,
  Bitcoin,
  BookOpen,
  Building2,
  ChartCandlestick,
  Code2,
  Filter,
  Flame,
  Fuel,
  Gauge,
  Gem,
  GitCompareArrows,
  GraduationCap,
  Grid3x3,
  Info,
  Layers,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  Newspaper,
  PenLine,
  Rocket,
  Star,
  Sparkles,
  Sprout,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

/**
 * Structure de la navigation principale.
 *
 * Conçue depuis notre propre positionnement, pas recopiée : CoinGecko range son
 * menu par TYPE D'OBJET (Cryptocurrencies, Exchanges, RWA, Products, API) parce
 * qu'il vend de la donnée et référence des plateformes d'échange. ZENKUU ne vend
 * rien et n'échange rien — on range donc par INTENTION DE LECTURE : « qu'est-ce que
 * je regarde ? » (Marchés), « que mesure-t-on ? » (Données), « qu'est-ce
 * que j'en déduis ? » (Analyse), « que s'est-il passé ? » (Actualités), « comment ça
 * marche ? » (Plus).
 *
 * Ce qu'on emprunte à leur structure en revanche, c'est le DÉCOUPAGE EN SECTIONS
 * avec libellés discrets : au-delà de quatre entrées, une liste plate se parcourt
 * mal. Les sections donnent un point d'accroche visuel et rendent le menu balayable.
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
  sections: NavSection[]
}

export const NAV_MENUS: NavMenu[] = [
  {
    label: 'Marchés',
    sections: [
      /*
       * SECTION SANS TITRE, ET EN TÊTE — une seule entrée, qui domine les autres.
       *
       * Toutes les entrées qui suivent répondent à « quelle CLASSE d'actif ? ».
       * Celle-ci répond à une autre question — « je veux tout voir, d'un coup, avec
       * les filtres » — et la ranger sous « Cryptoactifs » la ferait lire comme une
       * septième classe. Un intitulé de section au-dessus d'un seul élément
       * n'apporterait rien qu'une ligne de bruit : la position en tête suffit à dire
       * qu'elle traverse le reste.
       */
      {
        items: [
          {
            label: 'Marchés avancés',
            description: 'Classement filtrable, toutes classes',
            icon: Gauge,
            href: '/marches',
            ready: true,
          },
        ],
      },
      {
        label: 'Cryptoactifs',
        items: [
          {
            label: 'Cryptomonnaies',
            description: 'Classement, capitalisations et volumes',
            icon: Bitcoin,
            href: '/crypto',
            ready: true,
          },
          {
            label: 'Catégories & secteurs',
            description: 'Performance par narratif',
            icon: LayoutGrid,
            href: '/categories',
            ready: true,
          },
        ],
      },
      {
        label: 'Marchés traditionnels',
        items: [
          {
            label: 'Actions',
            description: 'Cours et principales valeurs cotées',
            icon: Building2,
            href: '/actions',
            ready: true,
          },
          {
            label: 'ETF',
            description: 'Fonds indiciels cotés',
            icon: Layers,
            href: '/etf',
            ready: true,
          },
          {
            label: 'Indices',
            description: 'CAC 40, S&P 500, DAX et autres',
            icon: ChartCandlestick,
            href: '/indices',
            ready: true,
          },
        ],
      },
      {
        label: 'Autres classes',
        items: [
          {
            label: 'Devises',
            description: 'Paires majeures, taux de référence BCE',
            icon: ArrowRightLeft,
            href: '/devises',
            ready: true,
          },
          {
            label: 'Matières premières',
            description: 'Énergie, métaux et agricoles',
            icon: Fuel,
            href: '/matieres-premieres',
            ready: true,
          },
        ],
      },
    ],
  },

  {
    /*
     * « Données » plutôt que « Classements ».
     *
     * Le menu ne contient plus seulement des palmarès : il réunit maintenant tout ce
     * qui se lit comme une MESURE du marché — un classement, des flux d'échange, des
     * courbes longues, des arrivées récentes, des faits saillants. « Classements »
     * redevient ce qu'il est réellement : une entrée parmi d'autres, pas un chapeau.
     */
    label: 'Données',
    sections: [
      {
        label: 'Palmarès',
        items: [
          {
            label: 'Classements',
            description: 'Le classement complet, page par page',
            icon: Trophy,
            href: '/crypto/all-coins',
            ready: true,
          },
          {
            label: 'Données de trading',
            description: 'Volumes, flux et déséquilibres du marché',
            icon: Activity,
            href: '/crypto/mouvements',
            ready: true,
          },
          {
            label: 'Points marquants',
            description: 'Hausses, baisses, tendances et nouveautés',
            icon: Flame,
            href: '/crypto/highlights',
            ready: true,
          },
        ],
      },
      {
        label: 'Suivi du marché',
        items: [
          {
            label: 'Graphiques globaux',
            description: 'Capitalisation, volumes et dominance dans la durée',
            icon: LineChart,
            href: '/crypto/graphiques',
            ready: true,
          },
          {
            label: 'Nouvelles cryptomonnaies',
            description: 'Les actifs référencés le plus récemment',
            icon: Sprout,
            href: '/crypto/nouvelles',
            ready: true,
          },
        ],
      },
      {
        // « Catégories & secteurs » vivait aussi ici : le doublon est retiré au
        // profit de l'entrée du menu Marchés, où la notion se range plus
        // naturellement. La section est renommée en conséquence — « Segments »
        // n'avait de sens qu'au pluriel.
        label: 'Indicateurs',
        items: [
          {
            label: 'Indice de sentiment',
            description: 'Fear & Greed du marché crypto',
            icon: Gauge,
            href: '/sentiment',
            ready: true,
          },
        ],
      },
    ],
  },

  {
    label: 'Analyse',
    sections: [
      {
        label: 'Outils',
        items: [
          {
            label: 'Comparateur',
            description: 'Deux à quatre actifs côte à côte',
            icon: GitCompareArrows,
            href: '/comparateur',
            ready: true,
          },
          {
            label: 'Convertisseur',
            description: 'Conversion entre actifs et devises',
            icon: ArrowRightLeft,
            href: '/convertisseur',
            ready: true,
          },
          {
            label: 'Screener',
            description: 'Filtrer le marché sur vos critères',
            icon: Filter,
            href: '/screener',
            ready: true,
          },
        ],
      },
      {
        label: 'Visualisations',
        items: [
          {
            label: 'Heatmap sectorielle',
            description: 'Les secteurs en un coup d’œil',
            icon: Grid3x3,
            href: '/heatmap',
            ready: true,
          },
        ],
      },
    ],
  },

  {
    label: 'Actualités',
    sections: [
      {
        items: [
          {
            label: 'Toute l’actualité',
            description: 'Le fil complet, toutes sources confondues',
            icon: Newspaper,
            href: '/actualites',
            ready: true,
          },
        ],
      },
      /*
       * SECTION « AGENDA » RETIRÉE — calendrier économique et événements crypto.
       *
       * Les deux entrées étaient marquées « bientôt » depuis l'origine. Elles le
       * seraient restées : aucune source gratuite et sans clé ne publie ni le
       * calendrier des publications macroéconomiques, ni les dates de halving, de
       * déblocage de jetons ou de mise à jour réseau. Les reconstituer à la main
       * reviendrait à saisir des dates que rien ne vérifie — c'est-à-dire à publier de
       * la donnée non sourcée, ce que le §5 interdit précisément.
       *
       * Une entrée « bientôt » est une promesse. Deux promesses qu'on sait ne pas
       * pouvoir tenir coûtent plus cher, en confiance, que leur absence. Le jour où une
       * source paraît, la section revient — et il y aura alors quelque chose derrière.
       *
       * Même raisonnement pour « Corrélations », retiré du menu Analyse : le calcul
       * exige l'historique de chaque actif comparé, soit un appel par actif sur un
       * quota qui en tolère cinq par minute.
       */
    ],
  },

  {
    label: 'Plus',
    sections: [
      {
        label: 'Apprendre',
        items: [
          {
            label: 'Apprendre',
            description: 'Comprendre les marchés, pas à pas',
            icon: GraduationCap,
            href: '/apprendre',
            ready: true,
          },
          {
            label: 'Bien démarrer',
            description: 'Prendre en main ZENKUU en cinq minutes',
            icon: Rocket,
            href: '/bien-demarrer',
            ready: true,
          },
          {
            label: 'Blog',
            description: 'Analyses et coulisses du produit',
            icon: PenLine,
            href: '/blog',
            ready: true,
          },
        ],
      },
      {
        label: 'Ressources',
        items: [
          {
            // Remplace le « En savoir plus » initial, trop vague pour une entrée de
            // menu. Sur un site de données financières, la question que se pose
            // réellement le lecteur est « d'où viennent ces chiffres ? » — et y
            // répondre sert directement notre règle « zéro donnée inventée » (§5).
            label: 'Méthodologie & sources',
            description: 'D’où viennent nos chiffres, et à quelle fréquence',
            icon: BookOpen,
            href: '/methodologie',
            ready: true,
          },
          {
            label: 'API & développeurs',
            description: 'Accéder aux données par programme',
            icon: Code2,
            href: '/developpeurs',
            ready: true,
          },
          {
            label: 'Centre d’aide',
            description: 'Questions fréquentes et assistance',
            icon: LifeBuoy,
            href: '/aide',
            ready: true,
          },
        ],
      },
      {
        label: 'ZENKUU',
        items: [
          {
            label: 'Ma liste de suivi',
            description: 'Les actifs rattachés à votre compte',
            icon: Star,
            href: '/suivi',
            ready: true,
          },
          {
            label: 'Mes alertes',
            description: 'Un courriel au franchissement d’un seuil de prix',
            icon: Bell,
            href: '/alertes',
            ready: true,
          },
          {
            /*
             * L'offre payante vit dans « Plus », pas dans un bouton du bandeau haut.
             *
             * C'est un choix de positionnement autant que de mise en page : le site se
             * vend d'abord par son contenu gratuit (§1), et un appel à l'abonnement
             * planté dans l'en-tête de toutes les pages contredirait cette promesse à
             * chaque chargement. L'invitation apparaît là où elle a du sens — quand une
             * limite est réellement rencontrée —, et l'entrée de menu sert à ceux qui
             * la cherchent d'eux-mêmes.
             */
            label: 'Zenkuu Pro',
            description: 'L’offre qui finance le site, et ce qu’elle ajoute',
            icon: Gem,
            href: '/tarifs',
            ready: true,
          },
          {
            label: 'Pourquoi ZENKUU',
            description: 'Nos partis pris, et ce qu’on refuse de faire',
            icon: Sparkles,
            href: '/pourquoi-zenkuu',
            ready: true,
          },
          {
            label: 'Nouveautés',
            description: 'Ce qui a changé récemment',
            icon: Sparkles,
            href: '/nouveautes',
            ready: true,
          },
          {
            label: 'À propos',
            description: 'Notre positionnement et nos limites',
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
