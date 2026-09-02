/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES SEPT CATÉGORIES DE FILTRES — LA GRAMMAIRE DU SCREENER DE BACKPACK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur backpack.exchange/stocks/screener le 2026-09-02 : leur panneau de droite
 * range les filtres en sept groupes repliables — Classification, Price, Volume,
 * Performance, Valuation, Fundamentals, Events.
 *
 * ── POURQUOI UNE TABLE ET NON UN CHAMP SUR CHAQUE FILTRE ───────────────────
 *
 * Le projet déclare une quarantaine de filtres, répartis sur six marchés, et un même
 * `peRatio` sert les actions ET les ETF. Ajouter `category:` à chaque déclaration
 * demanderait quarante éditions dont plusieurs répètent la même information — et la
 * première divergence entre deux déclarations du même filtre passerait inaperçue.
 *
 * Une table par CLÉ dit chaque appartenance une seule fois, et se relit d'un coup
 * d'œil : c'est aussi elle qui montre qu'aucune clé n'a été oubliée.
 *
 * ── CE QUE J'AVAIS DIT, ET QUI ÉTAIT FAUX ──────────────────────────────────
 *
 * ⚠️ J'ai répondu à l'exploitant que Valuation, Fundamentals et Events n'avaient
 * AUCUNE donnée chez ZENKUU, et qu'il faudrait leur substituer des équivalents
 * crypto. C'était faux pour deux des trois.
 *
 * `peRatio` vient de `quote.trailingPE`, `eps` de `quote.epsTrailingTwelveMonths`,
 * `priceToBook` et `dividendYield` de la même réponse Yahoo — toutes réelles, toutes
 * déjà branchées, et déjà filtrables sur les marchés d'actions et d'ETF.
 *
 * Seul **Events** n'a effectivement rien : le site ne suit aucun calendrier de
 * résultats. Sa catégorie existe donc dans ce fichier mais reste VIDE sur tous les
 * marchés, ce qui la fait disparaître du panneau — voir la note de `CATEGORY_ORDER`.
 *
 * Les équivalents crypto convenus gardent tout leur sens là où ils s'appliquent :
 * une cryptomonnaie n'a ni PER ni bénéfice par action, et c'est son rang, son offre
 * en circulation et son écart au sommet qui jouent ces rôles.
 */

export type ScreenerCategory =
  | 'classification'
  | 'price'
  | 'volume'
  | 'performance'
  | 'valuation'
  | 'fundamentals'
  | 'events'

/**
 * L'ordre du panneau, fixe.
 *
 * Il suit celui de la référence, et ce n'est pas de la déférence : il va du plus
 * GROSSIER au plus FIN. On choisit d'abord quel genre d'actif on cherche, puis dans
 * quelle fourchette de prix, et seulement ensuite on affine sur des ratios. Un ordre
 * alphabétique mettrait « Classification » en tête par hasard et « Volume » en queue.
 */
export const CATEGORY_ORDER: readonly ScreenerCategory[] = [
  'classification',
  'price',
  'volume',
  'performance',
  'valuation',
  'fundamentals',
  'events',
]

/** L'intitulé français de chaque catégorie — traduit à l'affichage par `t()`. */
export const CATEGORY_LABEL: Record<ScreenerCategory, string> = {
  classification: 'Classement',
  price: 'Prix',
  volume: 'Volume',
  performance: 'Performance',
  valuation: 'Valorisation',
  fundamentals: 'Fondamentaux',
  events: 'Événements',
}

/**
 * À quelle catégorie appartient chaque filtre, par sa clé.
 *
 * ⚠️ UNE CLÉ ABSENTE D'ICI TOMBE DANS « classification ». C'est le repli le plus sûr :
 * cette catégorie ouvre le panneau, donc un filtre oublié se VOIT au lieu de
 * disparaître au fond d'un groupe replié. Le test associé garantit qu'aucune clé
 * déclarée n'y tombe par accident.
 */
export const FILTER_CATEGORY: Readonly<Record<string, ScreenerCategory>> = {
  // ── Classement : ce que l'actif EST ─────────────────────────────────────
  age: 'classification',
  established: 'classification',
  trustRank: 'classification',
  trustScore: 'classification',

  // ── Prix : ce qu'il coûte, et où il se situe dans sa propre échelle ─────
  price: 'price',
  dayRange: 'price',
  fromHigh52w: 'price',
  fromAth: 'price',
  fromAverage200d: 'price',

  // ── Volume : combien il s'en échange ────────────────────────────────────
  volume24h: 'volume',
  volumeBtc: 'volume',
  averageVolume3m: 'volume',
  turnover: 'volume',
  liquidity: 'volume',
  trades: 'volume',
  buyers: 'volume',
  sellers: 'volume',
  buyRatio: 'volume',

  // ── Performance : ce qu'il a fait, sur chaque fenêtre ───────────────────
  change1h: 'performance',
  change24h: 'performance',
  change7d: 'performance',
  change30d: 'performance',
  change52w: 'performance',
  ytdReturn: 'performance',
  return3y: 'performance',
  return5y: 'performance',

  // ── Valorisation : ce qu'il vaut, rapporté à quelque chose ──────────────
  marketCap: 'valuation',
  fdv: 'valuation',
  netAssets: 'valuation',
  peRatio: 'valuation',
  forwardPe: 'valuation',
  priceToBook: 'valuation',

  // ── Fondamentaux : ce qui le produit ────────────────────────────────────
  eps: 'fundamentals',
  dividendYield: 'fundamentals',
  yieldTtm: 'fundamentals',
  expenseRatio: 'fundamentals',
  fee: 'fundamentals',
  sharesOutstanding: 'fundamentals',
  circulating: 'fundamentals',
  issued: 'fundamentals',
  maxSupply: 'fundamentals',
}

export function categoryOf(key: string): ScreenerCategory {
  return FILTER_CATEGORY[key] ?? 'classification'
}
