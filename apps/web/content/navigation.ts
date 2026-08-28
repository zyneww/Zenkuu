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
   * ── « PARCOURIR » — UN MENU, ET DE NOUVEAU ───────────────────────────────────
   *
   * Il a été trois choses : un menu « Marchés » de onze entrées, puis un BOUTON menant
   * à `/marches` — une page unique portant les sept classes en onglets — et de nouveau
   * un menu. L'aller-retour n'est pas une hésitation : la page intermédiaire a été
   * supprimée, et avec elle le motif du bouton.
   *
   * Ce motif était qu'un menu dont chaque entrée mène à la même page avec un paramètre
   * différent n'est pas un menu, c'est une barre d'onglets qui se cache. Vrai — mais il
   * décrivait `/marches?classe=…`, pas la structure des routes. Les six classes sont
   * redevenues six PAGES (`/crypto`, `/actions`, `/etf`, `/indices`, `/devises`,
   * `/matieres-premieres`) : chaque entrée mène désormais à une adresse distincte,
   * indexable et partageable, et le menu redevient un menu.
   *
   * ── DEUX SECTIONS, ET LA SECONDE N'EST PAS UN FOURRE-TOUT ───────────────────
   *
   * La coupure est celle entre ce qu'on DÉTIENT et ce qui l'ENTOURE. À gauche, six
   * classes d'actifs : des choses qui ont un cours et une capitalisation. À droite,
   * ce qui n'en a pas — des contrats adossés à un actif, les places où ils se
   * traitent, et les programmes qui retirent des jetons de la circulation.
   *
   * Six et quatre : le panneau s'ouvre sur deux colonnes de hauteur comparable. Une
   * troisième section pour le seul « Buyback » aurait donné une colonne d'une ligne.
   *
   * ── LA STRUCTURE VIENT DE COINGECKO, PAS SON CONTENU ────────────────────────
   *
   * Leur menu range en groupes séparés par un filet, chaque entrée portant une icône,
   * un intitulé et une ligne d'explication. C'est une CONVENTION de mise en forme, et
   * on la reprend. Ce qu'on ne reprend pas, c'est leur découpage — eux séparent par
   * type d'objet parce qu'ils vendent de la donnée et référencent des plateformes ;
   * on sépare par nature d'instrument parce qu'on n'échange rien.
   */
  {
    label: 'Parcourir',
    sections: [
      {
        label: 'Classes d’actifs',
        items: [
          {
            label: 'Cryptomonnaies',
            description: 'Les cryptoactifs classés par capitalisation',
            icon: Coins,
            href: '/crypto',
            ready: true,
          },
          {
            label: 'Actions',
            description: 'Les titres cotés suivis par Zenkuu',
            icon: TrendingUp,
            href: '/actions',
            ready: true,
          },
          {
            label: 'ETF',
            description: 'Les fonds indiciels cotés et leur variation',
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
            description: 'Les paires majeures, à titre indicatif',
            icon: Banknote,
            href: '/devises',
            ready: true,
          },
          {
            label: 'Matières premières',
            description: 'Énergie, métaux et produits agricoles',
            icon: Gem,
            href: '/matieres-premieres',
            ready: true,
          },
        ],
      },
      {
        label: 'Instruments et programmes',
        items: [
          {
            label: 'Dérivés',
            description: 'Contrats perpétuels, intérêt ouvert, financement',
            icon: CandlestickChart,
            href: '/derives',
            ready: true,
          },
          {
            label: 'Places de cotation',
            description: 'Où les actifs changent de mains',
            icon: Landmark,
            href: '/places',
            ready: true,
          },
          {
            label: 'Places de dérivés',
            description: 'Où se portent les positions à effet de levier',
            icon: Building2,
            href: '/perpetuels',
            ready: true,
          },
          {
            label: 'Buyback',
            description: 'Les jetons rachetés par leur propre protocole',
            icon: Recycle,
            href: '/rachats',
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
            href: '/classements',
            ready: true,
          },
          /*
           * CATÉGORIES — la page existait, le menu l'ignorait.
           *
           * `/categories` est en service, indexée au sitemap, et reçoit DIX liens
           * depuis d'autres pages (fiches d'actif, points marquants). Elle n'était
           * simplement joignable par aucun menu : on ne pouvait y arriver qu'en
           * passant d'abord par une page qui y renvoie. Un classement sectoriel est
           * pourtant une porte d'entrée, pas une destination de second rebond.
           *
           * Rangée dans « Palmarès » et non dans « Suivi du marché », parce que c'en
           * est un : la page classe les secteurs par variation, exactement comme
           * « Classements » classe les actifs. Le voisinage est le bon.
           */
          {
            label: 'Catégories',
            description: 'Les secteurs classés par leur variation du jour',
            icon: Layers,
            href: '/categories',
            ready: true,
          },
          /*
           * ⚠️ « ACTIVITÉ DU MARCHÉ » A ÉTÉ RETIRÉE AVEC SES DEUX PAGES.
           *
           * L'entrée ouvrait `/mouvements`, qui portait une barre à deux onglets vers
           * `/points-marquants`. Les deux pages ont été supprimées (demande explicite) :
           * routes, disposition de groupe, barre d'onglets et filtres compris.
           *
           * Rien n'est ajouté à leur place ici : « Classements », juste au-dessus,
           * porte les mêmes palmarès, et la heatmap du menu « Analyse » porte la
           * lecture d'ensemble. Une entrée de menu vers une page qui n'existe plus
           * serait un lien mort ; une entrée de remplaçement vers une page déjà
           * listée serait un doublon.
           */
        ],
      },
      {
        label: 'Suivi du marché',
        items: [
          {
            label: 'Graphiques globaux',
            description: 'Capitalisation, dominance, secteurs et trésoreries',
            icon: LineChart,
            href: '/graphiques',
            ready: true,
          },
          /*
           * PLACES DE COTATION — la donnée existait, la page n'existait pas.
           *
           * `getSpotExchanges` alimentait un panneau enterré au milieu de la page de
           * données de trading, entre les agrégats macro et les dérivés. C'est
           * pourtant la réponse à une question qu'on se pose seule : « où ce marché
           * s'échange-t-il vraiment, et à qui fait-on confiance ? ». Elle méritait une
           * URL.
           */
          {
            label: 'Places de cotation',
            description: 'Où le marché s’échange, et avec quelle confiance',
            icon: Building2,
            href: '/places',
            ready: true,
          },
          {
            /*
             * PLACES DE DÉRIVÉS — la question que « Places de cotation » ne pose pas.
             *
             * Celle du dessus classe par CONFIANCE, ce qui est la bonne mesure au
             * comptant : on y dépose des fonds pour détenir. Celle-ci classe par
             * INTÉRÊT OUVERT, parce qu'on n'y détient rien — on y porte une exposition,
             * et c'est son ampleur qui dit où le risque s'accumule.
             */
            label: 'Places de dérivés',
            description: 'Où se portent les positions à effet de levier',
            icon: Building2,
            href: '/perpetuels',
            ready: true,
          },
          {
            label: 'Nouvelles cryptomonnaies',
            description: 'Les actifs référencés le plus récemment',
            icon: Sprout,
            href: '/nouvelles-cotations',
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
          {
            /*
             * Elle vit dans « Visualisations » et non dans « Marchés », et le rangement
             * est une position : ces chiffres ne sont PAS des cours. Ils décrivent le
             * terrain sur lequel les marchés se tiennent, à un pas annuel. Les mettre à
             * côté des classements les ferait lire comme une cotation de plus.
             */
            label: 'Carte macroéconomique',
            description: 'Inflation, chômage, dette : l’état des économies',
            icon: Globe2,
            href: '/macro',
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
          /*
           * ⚠️ TROIS ENTRÉES ONT DISPARU D'ICI AVEC LEURS PAGES.
           *
           * « Méthodologie & sources » (`/methodologie`), « API & développeurs »
           * (`/developpeurs`) et « Widgets de marché » (`/widgets`) ont été
           * supprimées du site sur demande explicite : routes, entrées de plan de
           * site, traductions SEO et liens entrants compris.
           *
           * Il ne reste donc dans « Ressources » que le centre d'aide, qui répond aux
           * questions d'usage. La colonne n'est pas fusionnée avec sa voisine : elle
           * garde son titre parce qu'elle garde sa nature — ce à quoi on s'adresse
           * quand on cherche de l'aide, et non ce qu'on vient consulter.
           */
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
          /*
           * ⚠️ TROIS ENTRÉES ONT DISPARU DU HAUT DE CETTE COLONNE.
           *
           * « Ma liste de suivi » (`/suivi`), « Mes alertes » (`/alertes`) et
           * « Mon compte » (`/parametres?rubrique=compte`) ont été retirées du menu
           * sur demande explicite.
           *
           * Les deux premières pages n'existent plus : `/alertes` était déjà partie
           * avec le système d'alertes, `/suivi` a été supprimée ici même. La liste
           * des actifs suivis reste consultable — `/tableau-de-bord` en porte une
           * section, et c'est là que pointent désormais l'étoile de suivi et le menu
           * de compte.
           *
           * ⚠️ `/parametres` N'A PAS ÉTÉ SUPPRIMÉE, et il ne faut pas le faire par
           * symétrie : elle porte les réglages d'affichage du site — thème, langue,
           * devise, largeur — et pas seulement la rubrique « compte » que cette
           * entrée visait. Seule l'entrée de menu est partie ; la page reste
           * atteignable par la roue dentée de l'en-tête.
           */
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
