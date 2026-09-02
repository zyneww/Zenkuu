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
    label: 'Cryptoactifs',
    /* ══════════════════════════════════════════════════════════════════════
       LES INTITULÉS DE SECTION NOMMENT UN TYPE DE CONTENU, TOUS DE LA MÊME FAÇON

       ── CE QU'ILS ÉTAIENT ───────────────────────────────────────────────────

       Six intitulés, cinq grammaires : « Classements » (nom pluriel), « Explorer »
       (verbe), « Outils » (nom pluriel), « Outils » À NOUVEAU dans un autre menu,
       « Contexte » (nom abstrait au singulier), « ZENKUU » (une marque).

       Le doublon était le plus visible : deux sections du même nom, dans deux menus
       différents, avec des contenus différents. Le lecteur qui cherche le screener sous
       « Outils » du menu Cryptomonnaies ne l'y trouve pas — il est sous « Outils » du
       menu Plus. Un intitulé qui ne distingue pas ne guide pas.

       ── LA RÈGLE RETENUE ────────────────────────────────────────────────────

       Un intitulé répond à « quel TYPE de chose y a-t-il là-dedans ? », en nom pluriel,
       et deux sections ne portent jamais le même. Ce n'est pas une préférence de style :
       c'est ce qui permet de choisir sa section sans l'ouvrir.

           Classements  · des listes ordonnées
           Secteurs     · des regroupements d'actifs
           Instruments  · des outils qu'on manipule sur un actif
           Vues         · des lectures du marché entier
           Indicateurs  · des mesures publiées par des tiers
           Le site      · ZENKUU lui-même

       « Le site » n'est pas un pluriel, et c'est le seul écart : il désigne un objet
       unique, et le mettre au pluriel serait faux pour tenir une symétrie.
       ══════════════════════════════════════════════════════════════════════ */
    sections: [
      {
        label: 'Palmarès',
        /* ── L'ORDRE SUIT L'USAGE, PUIS REGROUPE CE QUI DÉPASSE ────────────────

           Il était celui de la référence, et il mélangeait deux choses. Les cinq
           premières entrées sont des LISTES ORDONNÉES d'actifs ; les deux dernières
           sont des pages BITCOIN — `/crypto/bitcoin/halving` et
           `/crypto/bitcoin/historique`. Ni l'une ni l'autre n'est un classement.

           Elles restent dans cette section faute d'une meilleure — ce sont bien des
           pages crypto — mais elles la FERMENT, l'une à côté de l'autre, au lieu d'être
           semées entre les listes. Un lecteur qui parcourt « Classements » lit d'abord
           cinq classements, puis deux pages qui n'en sont pas et qui se signalent
           d'elles-mêmes par leur voisinage.

           Les cinq listes, elles, vont de la plus consultée à la plus spécifique :
           l'ensemble du marché, ses deux extrémités, la vue d'ensemble, l'écart au
           sommet, les dernières arrivées. */
        items: [
          {
            /* « Par capitalisation » nommait un TRI, pas un contenu — et le MÊME
               libellé servait dans le menu « Actifs réels » pour une page sans rapport.
               Deux entrées de même nom menant à deux endroits différents. */
            label: 'Tout le marché',
            description: 'Les dix-neuf mille jetons suivis, classés par capitalisation',
            icon: Coins,
            href: '/crypto',
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
            /* La page s'intitule « Classements crypto » et réunit les quatre
               palmarès. « Points forts » ne disait ni l'un ni l'autre. */
            label: 'Tous les palmarès',
            description: 'Hausses, baisses, volumes et rotation, au même endroit',
            icon: Trophy,
            href: '/classements',
            ready: true,
          },
          {
            label: 'Écart au plus haut',
            description: 'Ce qui sépare chaque actif de son plus haut historique',
            icon: Trophy,
            href: '/classements/sommet',
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
            /* Bitcoin comme point d'entrée : la route est `/crypto/[id]/historique`,
               et un menu ne peut pas nommer les milliers d'actifs. Depuis là, changer
               d'identifiant dans l'adresse suffit — et la fiche de chaque actif reste
               le chemin normal. */
            label: 'Historique des cours',
            description: 'La clôture de chaque journée, jour par jour',
            icon: LineChart,
            href: '/crypto/bitcoin/historique',
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
        label: 'Secteurs',
        items: [
          {
            label: 'Tous les secteurs',
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
            /* ── LE SCREENER A CHANGÉ DE MENU ──────────────────────────────────
               Il vivait sous « Vues » dans le menu « Plus », entre la carte thermique
               et l'indice de sentiment. Ces deux-là sont des LECTURES — on les regarde.
               Un screener est un INSTRUMENT — on s'en sert, on y pose des critères.

               Il rejoint donc le comparateur et le convertisseur, avec lesquels il
               partage ce métier, et quitte un menu fourre-tout où personne ne pense à
               le chercher. Il ouvre la section : des trois, c'est celui qu'on ouvre le
               plus souvent. */
            label: 'Recherche filtrée',
            description: 'Filtrer le marché sur vos propres critères',
            icon: Filter,
            href: '/screener',
            ready: true,
          },
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
            label: 'Vue d’ensemble',
            description: 'Capitalisation, volume et dominance dans le temps',
            icon: LineChart,
            href: '/graphiques',
            ready: true,
          },
        ],
      },
    ],
  },
  {
    label: 'Marchés traditionnels',
    sections: [
      {
        items: [
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
          {
            /* EN DERNIER, et non en premier comme avant. C'est une page de NICHE — des
               actions répliquées en jetons sur chaîne — et elle ouvrait un menu dont
               les cinq autres entrées sont les grandes classes d'actifs. Un lecteur
               qui cherche « Actions » tombait d'abord sur « Actions tokenisées ».

               Elle reste dans ce menu : ce sont bien des actifs réels. Elle le ferme. */
            label: 'Actions tokenisées',
            description: 'Les actifs du monde réel portés par une chaîne',
            icon: Landmark,
            href: '/graphiques/actifs-reels',
            ready: true,
          },
        ],
      },
    ],
  },
  {
    label: 'Places de marché',
    sections: [
      {
        items: [
          {
            /* Les trois entrées de ce menu portaient des noms qu'on ne pouvait pas
               distinguer : « Dérivés » et « Places de dérivés » l'un sous l'autre.
               Elles disent maintenant ce qu'elles LISTENT — des plateformes ou des
               contrats —, ce que leurs pages annoncent déjà en titre. */
            label: 'Au comptant',
            description: 'Où les actifs se négocient, et à quel volume',
            icon: Landmark,
            href: '/places',
            ready: true,
          },
          {
            label: 'Contrats dérivés',
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
  {
    label: 'Comprendre',
    sections: [
      {
        items: [
          {
            /* Le menu s'appelle « Apprendre » et son entrée aussi : deux fois le
               même mot, sans dire ce qu'on y trouve. La page porte des FICHES. */
            label: 'Fiches thématiques',
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
            label: 'Actualités',
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
  {
    label: 'Plus loin',
    sections: [
      {
        label: 'Autres vues',
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
        ],
      },
      {
        label: 'Indicateurs',
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
        label: 'Le site',
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
