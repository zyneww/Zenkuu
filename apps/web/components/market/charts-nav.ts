/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA NAVIGATION DES GRAPHIQUES GLOBAUX
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LES VUES SONT DEVENUES DES ROUTES ───────────────────────────────────────
 *
 * ⚠️ REVIREMENT ASSUMÉ. Ces vues vivaient sur une seule route, distinguées par un
 * `?vue=`. L'argument d'alors : sept fichiers et sept jeux de métadonnées pour
 * changer d'angle sur un même sujet, alors que ces vues « ne sont pas des
 * destinations de recherche ».
 *
 * Il ne tient pas. Le §9 fait du référencement organique le premier moteur
 * d'acquisition, et un paramètre de requête s'indexe mal — c'était écrit noir sur
 * blanc dans la version précédente de ce fichier, puis rangé au rayon des coûts
 * acceptables. Or « dominance bitcoin », « trésoreries d'entreprise » ou « actifs du
 * monde réel » SONT des requêtes, et la référence (`coingecko.com/en/charts`) leur
 * donne à chacune sa page. Chaque vue a donc désormais son chemin, son titre et sa
 * description.
 *
 * ── TROIS ENTRÉES POINTENT VERS DES PAGES QUI EXISTAIENT DÉJÀ ───────────────
 *
 * `/categories`, `/heatmap` et `/sentiment` ont leur page, leur tableau, leurs
 * filtres et leurs métadonnées depuis longtemps. Les redoubler sous `/graphiques`
 * ferait deux adresses pour un même contenu : deux pages à maintenir, deux cibles
 * d'indexation qui se cannibalisent, et un lecteur qui ne sait pas laquelle fait foi.
 * Le rail les référence donc là où elles sont — c'est aussi ce que fait la référence,
 * dont la colonne mêle sans le dire ses propres vues et des pages entières.
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
 *   · TRÉSORERIES BNB — la source n'expose ce registre que pour bitcoin et ether.
 */

/** Icône lucide de chaque entrée, résolue à l'affichage — la donnée ignore React. */
export type ChartNavIcon =
  | 'coins'
  | 'dominance'
  | 'heatmap'
  | 'rwa'
  | 'categories'
  | 'treasuries'
  | 'nft'
  | 'sentiment'
  | 'altseason'

export interface ChartNavEntry {
  label: string
  href: string
  icon?: ChartNavIcon
}

export interface ChartNavGroup {
  id: string
  label: string
  icon: ChartNavIcon
  /** Adresse du groupe lui-même, quand il en a une (« Coins » mène à la vue générale). */
  href?: string
  entries: ChartNavEntry[]
}

/**
 * Le rail, dans l'ordre de la référence.
 *
 * Un seul groupe déplié — « Coins » — puis quatre entrées de premier niveau. C'est sa
 * disposition exacte, et elle porte un sens : les trois vues de « Coins » regardent le
 * MÊME objet, le marché des cryptomonnaies, sous trois angles ; les quatre autres
 * regardent chacune un objet différent.
 */
export const CHART_GROUPS: ChartNavGroup[] = [
  {
    id: 'coins',
    label: 'Cryptomonnaies',
    icon: 'coins',
    href: '/graphiques',
    entries: [
      { label: 'Vue d’ensemble du marché', href: '/graphiques' },
      { label: 'Dominance de Bitcoin', href: '/graphiques/dominance' },
      { label: 'Carte thermique', href: '/heatmap' },
    ],
  },
]

/** Entrées de premier niveau, sous le groupe. */
export const CHART_LINKS: ChartNavEntry[] = [
  { label: 'Actifs du monde réel', href: '/graphiques/actifs-reels', icon: 'rwa' },
  { label: 'Catégories', href: '/categories', icon: 'categories' },
  { label: 'Trésoreries', href: '/graphiques/tresoreries', icon: 'treasuries' },
  { label: 'NFT', href: '/graphiques/nft', icon: 'nft' },
]

/**
 * Indicateurs — un second bloc, sous les précédents.
 *
 * Absent de la capture de référence, qui ne montre que le haut de son rail. Ces deux
 * pages existent et sont atteintes depuis ici plutôt que d'être perdues : les retirer
 * du rail au nom de la fidélité à une capture partielle aurait cassé leur accès.
 */
export const CHART_INDICATORS: ChartNavEntry[] = [
  { label: 'Indice de sentiment', href: '/sentiment', icon: 'sentiment' },
  { label: 'Saison des altcoins', href: '/graphiques/saison-altcoins', icon: 'altseason' },
]
