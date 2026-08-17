import {
  Activity,
  ArrowRightLeft,
  Bell,
  BookOpen,
  Building2,
  Code2,
  Filter,
  Gauge,
  Gem,
  GitCompareArrows,
  GraduationCap,
  Globe2,
  Grid3x3,
  Info,
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
   * ── « PARCOURIR » — UN BOUTON, PAS UN MENU ───────────────────────────────────
   *
   * Il s'appelait « Marchés » et déroulait onze entrées réparties en quatre sections :
   * marchés avancés, cryptoactifs, marchés traditionnels, autres classes. Le panneau
   * est SUPPRIMÉ, pas déplacé.
   *
   * Le motif est que la page d'arrivée porte désormais les mêmes classes en onglets
   * centrés, et qu'elle les garde à l'écran. Le panneau faisait donc choisir deux fois
   * — une fois dans un menu qui se referme, une fois dans une barre qui reste — et le
   * premier choix ne décidait que de l'onglet d'arrivée. Un menu dont chaque entrée
   * mène à la même page avec un paramètre différent n'est pas un menu, c'est une barre
   * d'onglets qui se cache.
   *
   * « Parcourir » et non « Marchés » : le mot décrit le GESTE plutôt que l'objet, ce
   * qui est juste pour un bouton unique — on ne choisit plus un marché dans une liste,
   * on ouvre la surface où on les parcourt tous.
   *
   * Les sept classes ne perdent pas leur URL : `/crypto`, `/actions`, `/etf` et les
   * autres restent des pages à part entière, indexables et partageables. Elles ne sont
   * simplement plus énumérées dans une barre de navigation qui les redirait.
   */
  {
    label: 'Parcourir',
    href: '/marches',
    sections: [],
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
           * UNE ENTRÉE LÀ OÙ IL Y EN AVAIT DEUX.
           *
           * « Données de trading » et « Points marquants » figuraient côte à côte. Ce
           * sont deux lectures du MÊME instant de marché — l'une par les volumes et
           * l'exposition, l'autre par les extrêmes du jour — et rien dans les deux
           * intitulés ne disait laquelle répondait à la question qu'on se pose. On les
           * ouvrait donc l'une après l'autre pour trancher.
           *
           * Elles deviennent deux onglets d'une même page. Le menu porte la question
           * (« que fait le marché en ce moment ? »), la page porte le choix de l'angle.
           */
          {
            label: 'Activité du marché',
            description: 'Volumes et exposition, ou extrêmes du jour',
            icon: Activity,
            /*
             * Pointe sur `/mouvements`, qui EXISTE et porte désormais la barre
             * à deux onglets. Créer `/crypto/activite` aurait été plus joli au regard
             * du libellé, et aurait coûté deux redirections, douze liens à réécrire et
             * deux entrées de sitemap déjà indexées — pour une adresse que personne ne
             * lit. Le libellé du menu nomme la PAIRE, la barre d'onglets nomme la vue.
             */
            href: '/mouvements',
            ready: true,
          },
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
             * L'ENTRÉE « ZENKUU PRO » A DISPARU AVEC L'OFFRE.
             *
             * Elle vivait ici plutôt que dans un bouton du bandeau haut, au motif que le
             * site se vend d'abord par son contenu gratuit (§1) et qu'un appel à
             * l'abonnement planté dans l'en-tête contredirait cette promesse à chaque
             * chargement.
             *
             * Le raisonnement n'a pas été démenti : il est devenu sans objet. La
             * facturation était adossée au fournisseur d'identité tiers, retiré du site,
             * et il n'existe plus qu'un seul jeu de plafonds pour tout le monde
             * (`lib/limits.ts`). Ce qui reste ici est la seule chose que le compte
             * apporte encore, et elle n'est pas commerciale.
             */
            label: 'Mon compte',
            description: 'Liste de suivi, alertes et écrans, retrouvés partout',
            icon: Gem,
            href: '/parametres?rubrique=compte',
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
