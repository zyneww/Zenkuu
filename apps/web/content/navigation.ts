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
  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « COINS » — LA CRYPTO, ET RIEN QU'ELLE
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * ── LE RENOMMAGE EST UNE SCISSION, PAS UNE ÉTIQUETTE ─────────────────────────
   *
   * « Parcourir » portait DEUX choses : les six classes d'actifs — dont cinq n'ont
   * rien de crypto — et les instruments du marché crypto. Le nom était vague parce
   * que le contenu l'était : « parcourir » ne dit pas quoi.
   *
   * Appeler ce menu « Coins » oblige à en sortir ce qui n'est pas une cryptomonnaie.
   * Actions, ETF, indices, devises et matières premières partent donc dans « TradFi »,
   * juste à côté — où elles retrouvent la macroéconomie, qui décrit le terrain sur
   * lequel elles se tiennent. Les deux menus répondent enfin à une question chacun.
   *
   * ── TROIS SECTIONS, DANS L'ORDRE OÙ ON CHERCHE ───────────────────────────────
   *
   * « Classements » d'abord — c'est ce qu'on vient voir. « Explorer » ensuite, pour
   * les lectures d'ensemble. « Instruments » en dernier : ce sont des objets de
   * second rang, qu'on ne cherche qu'en sachant déjà ce qu'on veut.
   *
   * ⚠️ QUATRE ENTRÉES DE LA RÉFÉRENCE MANQUENT, ET C'EST DÉLIBÉRÉ. Son menu porte
   * « Performance », « All Time High », « Trending Cryptos » et « Blockchains ». Les
   * deux premières sont des VUES du tableau d'accueil — des onglets, pas des pages —
   * et les pointer ici mènerait à une adresse qui ne les ouvre pas. « Trending » n'a
   * qu'une route d'API, sans page. « Blockchains » n'a aucune source : comparer des
   * métriques de chaînes demande un agrégat que rien de ce que le site charge ne
   * publie. Une entrée de menu vers une page qui n'existe pas est un lien mort ; le
   * §5 vaut aussi pour la navigation.
   */
  {
    label: 'Coins',
    sections: [
      {
        label: 'Classements',
        items: [
          {
            label: 'Top 100 cryptomonnaies',
            description: 'Les premières capitalisations, page par page',
            icon: Coins,
            href: '/crypto',
            ready: true,
          },
          {
            /* La SEULE entrée de l'ancien menu « Données » qui n'était pas déjà
               ailleurs : `/classements` est l'index des quatre palmarès, là où les
               trois entrées ci-dessous ouvrent chacune le sien. */
            label: 'Tous les classements',
            description: 'Hausses, baisses, volumes et rotation, au même endroit',
            icon: Trophy,
            href: '/classements',
            ready: true,
          },
          {
            label: 'Plus fortes hausses',
            description: 'Les cryptos qui montent le plus sur la période',
            icon: TrendingUp,
            href: '/classements/hausses',
            ready: true,
          },
          {
            label: 'Plus fortes baisses',
            description: 'L’autre bout du classement, sur la même fenêtre',
            icon: Activity,
            href: '/classements/baisses',
            ready: true,
          },
          {
            label: 'Volumes',
            description: 'Ce qui s’échange le plus, indépendamment du cours',
            icon: Trophy,
            href: '/classements/volumes',
            ready: true,
          },
          {
            label: 'Nouvelles cotations',
            description: 'Les actifs référencés le plus récemment',
            icon: Sprout,
            href: '/nouvelles-cotations',
            ready: true,
          },
        ],
      },
      {
        label: 'Explorer',
        items: [
          {
            label: 'Données de marché globales',
            description: 'Capitalisation, dominance, stablecoins et trésoreries',
            icon: LineChart,
            href: '/graphiques',
            ready: true,
          },
          {
            label: 'Toutes les catégories',
            description: 'Les cryptomonnaies rangées par narratif',
            icon: Layers,
            href: '/categories',
            ready: true,
          },
          {
            label: 'Écosystèmes',
            description: 'Les projets rattachés à chaque plateforme',
            icon: Globe2,
            href: '/categories/ecosystemes',
            ready: true,
          },
          {
            label: 'Carte thermique',
            description: 'Le marché en une figure : surface et couleur',
            icon: Grid3x3,
            href: '/heatmap',
            ready: true,
          },
          {
            label: 'Indice de sentiment',
            description: 'La peur et l’avidité, jour par jour',
            icon: Gauge,
            href: '/sentiment',
            ready: true,
          },
        ],
      },
      {
        label: 'Instruments',
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
            label: 'Rachats',
            description: 'Les jetons rachetés par leur propre protocole',
            icon: Recycle,
            href: '/rachats',
            ready: true,
          },
        ],
      },
    ],
  },

  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * « TRADFI » — CE QUI SE COTE AILLEURS QUE SUR UNE CHAÎNE
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * ── SES ENTRÉES SONT DÉDUITES DU SITE, PAS INVENTÉES ─────────────────────────
   *
   * Chacune correspond à une route qui existe et qui rend des données réelles :
   * `/actions` et `/devises` viennent d'être branchées en onglets sur l'accueil,
   * `/etf`, `/indices` et `/matieres-premieres` sont servies par le même
   * `MarketPageView` que les cryptos, `/macro` par la Banque mondiale, et
   * `/graphiques/actifs-reels` par le catalogue des actions tokenisées.
   *
   * ── POURQUOI LA MACRO EST ICI ET NON DANS « ANALYSE » ────────────────────────
   *
   * Elle y était, rangée parmi les « Visualisations ». Le voisinage était
   * défendable — c'est une carte — mais il séparait l'inflation des actions, alors
   * que la première explique la seconde. Ici, elle ferme le menu comme un contexte :
   * les actifs d'abord, le terrain sur lequel ils évoluent ensuite.
   */
  {
    label: 'TradFi',
    sections: [
      {
        label: 'Classes d’actifs',
        items: [
          {
            label: 'Actions',
            description: 'Les titres cotés suivis par ZENKUU',
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
        label: 'Contexte',
        items: [
          {
            label: 'Macroéconomie',
            description: 'Inflation, chômage, dette : l’état des économies',
            icon: Globe2,
            href: '/macro',
            ready: true,
          },
          {
            label: 'Actifs du monde réel',
            description: 'Les actions répliquées en jetons sur chaîne',
            icon: Landmark,
            href: '/graphiques/actifs-reels',
            ready: true,
          },
        ],
      },
    ],
  },


  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * ⚠️ LE MENU « DONNÉES » A ÉTÉ RETIRÉ — IL ÉTAIT DEVENU UN DOUBLON INTÉGRAL
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * Il portait neuf entrées, réparties en « Palmarès », « Suivi du marché » et
   * « Indicateurs » : classements, catégories, graphiques globaux, places de cotation,
   * places de dérivés, nouvelles cotations, indice de sentiment.
   *
   * Les NEUF vivent désormais dans « Coins », où elles trouvent leur sujet — ce sont
   * toutes des lectures du marché crypto. Les garder ici aurait fait deux chemins vers
   * chaque page, et ce fichier condamne déjà ce défaut deux fois dans ses propres
   * commentaires : « une entrée de remplacement vers une page déjà listée serait un
   * doublon ».
   *
   * Un menu dont chaque entrée figure ailleurs n'aide plus à choisir : il double la
   * surface à parcourir sans ajouter une destination. La barre passe donc de cinq
   * menus à quatre — Coins, TradFi, Analyse, Plus — et chacun répond à une question
   * qu'aucun autre ne pose.
   * ══════════════════════════════════════════════════════════════════════════════
   */

  {
    label: 'Analyse',
    sections: [
      /*
       * ── « ACTUALITÉS » DESCEND ICI, ET PERD SON MENU PROPRE ──────────────────
       *
       * Elle occupait un menu de premier niveau pour UNE entrée. Un menu d'une ligne
       * coûte à la barre la même place qu'un menu de quinze, et il oblige à un clic
       * pour découvrir qu'il n'y avait rien à choisir.
       *
       * Sa place est en tête d'« Analyse » : lire ce qui s'est passé précède
       * l'outillage qui sert à l'interpréter. Le fil complet reste à `/actualites`,
       * inchangé — seul le chemin qui y mène a bougé.
       */
      {
        label: 'Actualités',
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
      /*
       * ⚠️ LA SECTION « VISUALISATIONS » A ÉTÉ VIDÉE PAR LE DÉCOUPAGE, PAS SUPPRIMÉE
       * PAR GOÛT.
       *
       * Elle portait deux entrées, et chacune est allée rejoindre son sujet : la carte
       * thermique est une lecture du marché CRYPTO — elle est dans « Coins » — et la
       * carte macroéconomique décrit le terrain des marchés traditionnels, où
       * l'inflation explique les actions. Elle ferme donc « TradFi ».
       *
       * Une section « Visualisations » restait défendable tant qu'elle réunissait deux
       * figures ; vidée de l'une comme de l'autre, elle n'aurait plus décrit qu'un
       * format d'affichage. On ne range pas un menu par forme de rendu.
       *
       * ── ET « AGENDA », RETIRÉE BIEN AVANT ───────────────────────────────────
       *
       * Calendrier économique et événements crypto : deux entrées marquées « bientôt »
       * depuis l'origine, et qui le seraient restées. Aucune source gratuite et sans
       * clé ne publie le calendrier des publications macroéconomiques, ni les dates de
       * halving, de déblocage de jetons ou de mise à jour réseau. Les saisir à la main
       * reviendrait à publier de la donnée que rien ne vérifie (§5).
       *
       * Même raisonnement pour « Corrélations » : le calcul exige l'historique de
       * chaque actif comparé, soit un appel par actif sur un quota qui en tolère cinq
       * par minute.
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
