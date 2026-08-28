/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA NAVIGATION DES GRAPHIQUES GLOBAUX — DIX ENTRÉES, TROIS FAMILLES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UN NIVEAU DE GROUPE APPARAÎT ───────────────────────────────────
 *
 * La page portait SIX vues sur une rangée d'onglets à plat. Le modèle repris
 * (`coinmarketcap.com/charts`) en range une vingtaine dans une BARRE LATÉRALE
 * groupée — Markets, Indicators, ETF Flows, Derivatives, Technical Analysis — et
 * conserve en plus des onglets en tête pour la famille courante.
 *
 * Le double niveau n'est pas décoratif : au-delà de six ou sept entrées, une rangée
 * d'onglets déborde ou se replie derrière un « … », et l'on ne voit plus ce que la
 * page contient. Une colonne verticale groupée montre les dix d'un coup, et le nom
 * du groupe dit à quelle question chacune répond.
 *
 * ── TOUTES LES ENTRÉES NE SONT PAS DES VUES DE CETTE PAGE ───────────────────
 *
 * C'est le point structurant de ce fichier. Trois des dix — les places de cotation,
 * les places de dérivés, l'indice de sentiment — ONT DÉJÀ LEUR PAGE, avec leur
 * tableau, leurs filtres et leurs métadonnées. Les recréer en vue de `/graphiques`
 * ferait deux adresses pour un même contenu : deux pages à maintenir, deux cibles
 * d'indexation qui se cannibalisent, et un lecteur qui ne sait pas laquelle fait foi.
 *
 * Une entrée porte donc son `href`, et `view` n'est renseigné que pour celles qui
 * vivent réellement sur cette route. C'est aussi la disposition du modèle, dont le
 * rail mêle sans le dire des vues de `/charts` et des pages entières.
 *
 * ── CE QUI N'EST PAS REPRIS DU MODÈLE, ET POURQUOI ──────────────────────────
 *
 * Son rail porte des entrées que NOS SOURCES NE PERMETTENT PAS de remplir, et une
 * vue vide est pire qu'une vue absente (§5) :
 *
 *   · FLUX ETF (Crypto / Bitcoin / Ethereum ETFs) — aucune source gratuite ne publie
 *     les créations et rachats quotidiens des ETF au comptant ;
 *   · LIQUIDATIONS — agrégat propriétaire des places de dérivés ;
 *   · ENTRÉES / SORTIES D'EXCHANGES — demande une analyse de chaîne, pas une API de
 *     cotation ;
 *   · CMC 20 / CMC 100 — indices propriétaires de l'éditeur du modèle ;
 *   · TRÉSORERIES BNB — la source n'expose ce registre que pour bitcoin et ether ;
 *   · RSI / MACD et indicateurs de cycle — calculables, mais ce sont des lectures
 *     d'ACTIF et non de marché : leur place est sur la fiche, pas ici.
 *
 * ── L'ADRESSAGE DES VUES RESTE UN PARAMÈTRE DE REQUÊTE ──────────────────────
 *
 * Le modèle en fait autant de pages (`/charts/bitcoin-dominance`…). Ici, un `?vue=`.
 * Ces vues répondent toutes à la même question — « à quoi ressemble le marché, vu de
 * loin » — et se lisent en alternance ; sept routes obligeraient à sept fichiers et
 * sept jeux de métadonnées pour changer d'angle sur le même sujet.
 *
 * Le prix est connu et assumé : un paramètre de requête s'indexe moins bien qu'un
 * chemin. Il est acceptable parce que ces vues ne sont pas des destinations de
 * recherche — on ne cherche pas « dominance bitcoin » pour arriver sur un site de
 * suivi, on cherche « bitcoin ». La page qui doit être indexable, c'est la fiche.
 */

/** Icône lucide de chaque groupe, résolue à l'affichage — la donnée ignore React. */
export type ChartGroupIcon = 'markets' | 'indicators' | 'sectors'

/**
 * Les vues rendues PAR CETTE PAGE.
 *
 * Le type est écrit à la main plutôt que dérivé du tableau : les entrées du rail
 * mêlent vues et pages entières, et dériver le type de l'ensemble ferait entrer
 * `/places` dans le domaine de `readChartView`.
 */
export type ChartView =
  | 'global'
  | 'dominance'
  | 'altseason'
  | 'tresoreries'
  | 'secteurs'
  | 'categories'
  | 'nft'

export interface ChartNavEntry {
  label: string
  href: string
  /** Renseigné SEULEMENT si l'entrée est une vue de `/graphiques`. */
  view?: ChartView
}

export interface ChartNavGroup {
  id: string
  label: string
  icon: ChartGroupIcon
  entries: ChartNavEntry[]
}

export const CHART_GROUPS: ChartNavGroup[] = [
  {
    id: 'marches',
    label: 'Marchés',
    icon: 'markets',
    entries: [
      { label: 'Vue d’ensemble', href: '/graphiques', view: 'global' },
      { label: 'Dominance de Bitcoin', href: '/graphiques?vue=dominance', view: 'dominance' },
      /* Pages à part entière — voir la note sur les entrées externes. */
      { label: 'Places de cotation', href: '/places' },
      { label: 'Places de dérivés', href: '/perpetuels' },
    ],
  },
  {
    id: 'indicateurs',
    label: 'Indicateurs',
    icon: 'indicators',
    entries: [
      { label: 'Indice de sentiment', href: '/sentiment' },
      { label: 'Saison des altcoins', href: '/graphiques?vue=altseason', view: 'altseason' },
      {
        label: 'Trésoreries d’entreprise',
        href: '/graphiques?vue=tresoreries',
        view: 'tresoreries',
      },
    ],
  },
  {
    id: 'secteurs',
    label: 'Secteurs',
    icon: 'sectors',
    entries: [
      { label: 'Carte thermique', href: '/graphiques?vue=secteurs', view: 'secteurs' },
      { label: 'Catégories & secteurs', href: '/graphiques?vue=categories', view: 'categories' },
      { label: 'Collections NFT', href: '/graphiques?vue=nft', view: 'nft' },
    ],
  },
]

/** Les vues rendues par cette page, à plat et dans l'ordre du rail. */
export const CHART_VIEWS = CHART_GROUPS.flatMap((group) =>
  group.entries.filter((entry): entry is ChartNavEntry & { view: ChartView } =>
    Boolean(entry.view),
  ),
)

/** Lecture défensive : le paramètre est saisissable à la main. */
export function readChartView(raw: string | string[] | undefined): ChartView {
  const value = Array.isArray(raw) ? raw[0] : raw
  return CHART_VIEWS.some((entry) => entry.view === value) ? (value as ChartView) : 'global'
}

/** Le groupe auquel une vue appartient. */
export function groupOfView(view: ChartView): ChartNavGroup {
  const found = CHART_GROUPS.find((group) => group.entries.some((entry) => entry.view === view))
  /* Le repli ne se produit pas pour une vue valide — `readChartView` garantit le
     domaine — mais l'écrire évite un `!` qui masquerait un vrai trou le jour où une
     vue serait ajoutée au type sans l'être au rail. */
  return found ?? (CHART_GROUPS[0] as ChartNavGroup)
}
