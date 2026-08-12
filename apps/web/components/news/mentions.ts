/**
 * Détection des actifs cités dans un titre d'article.
 *
 * ── C'EST UNE RECHERCHE, PAS UNE CLASSIFICATION — la distinction est essentielle ─
 *
 * `providers/news.ts` pose un principe explicite : la rubrique d'un article vient du
 * FLUX et n'est jamais déduite de son texte, parce que deviner par mots-clés
 * « produirait des étiquettes fausses, donc de la donnée inventée » (§5).
 *
 * Ce module cherche des mots dans des titres. Il ne viole ce principe qu'à une
 * condition près, qui doit être tenue au point de rendu :
 *
 *   · il répond à « montre-moi les articles où le mot Bitcoin apparaît » — une
 *     affirmation VRAIE PAR CONSTRUCTION, que le lecteur vérifie en lisant le titre ;
 *   · il ne répond PAS à « cet article parle de Bitcoin », qui serait une
 *     interprétation, invérifiable et souvent fausse.
 *
 * Conséquences concrètes, à ne pas défaire :
 *   · aucune pastille d'actif ne s'affiche sur une carte d'article ;
 *   · le libellé du filtre dit « Articles mentionnant Bitcoin », jamais
 *     « Actualités Bitcoin » ;
 *   · un article non détecté n'est pas « sans rapport », il est seulement absent
 *     d'une recherche — ce qui n'affirme rien.
 */

export interface AssetMention {
  /** Identifiant du filtre, stable. */
  id: string
  /** Libellé affiché dans le sélecteur. */
  label: string
  /**
   * Formes recherchées, en minuscules.
   *
   * Le symbole seul (« btc ») autant que le nom (« bitcoin ») : les titres anglais
   * abrègent volontiers là où les titres français développent.
   */
  patterns: string[]
}

/**
 * Actifs proposés au filtre.
 *
 * Volontairement COURTE. Un sélecteur de deux cents entrées ne se parcourt pas, et
 * les actifs rares n'apparaissent presque jamais dans un titre — leur ligne serait
 * vide en permanence. Ceux-ci sont les seuls qui reviennent assez souvent pour
 * qu'un filtre ait un sens ; la recherche libre couvre tout le reste.
 */
export const ASSET_MENTIONS: AssetMention[] = [
  { id: 'btc', label: 'Bitcoin', patterns: ['bitcoin', 'btc'] },
  { id: 'eth', label: 'Ethereum', patterns: ['ethereum', 'ether ', 'eth '] },
  { id: 'sol', label: 'Solana', patterns: ['solana', 'sol '] },
  { id: 'xrp', label: 'XRP', patterns: ['xrp', 'ripple'] },
  { id: 'stablecoins', label: 'Stablecoins', patterns: ['stablecoin', 'usdt', 'usdc', 'tether'] },
  { id: 'etf-crypto', label: 'ETF crypto', patterns: ['etf'] },
  { id: 'nvidia', label: 'NVIDIA', patterns: ['nvidia', 'nvda'] },
  { id: 'apple', label: 'Apple', patterns: ['apple', 'aapl'] },
  { id: 'tesla', label: 'Tesla', patterns: ['tesla', 'tsla'] },
  { id: 'or', label: 'Or', patterns: [" l'or ", ' or ', 'gold'] },
  { id: 'petrole', label: 'Pétrole', patterns: ['pétrole', 'petrole', 'oil', 'brent', 'wti'] },
  { id: 'fed', label: 'Réserve fédérale', patterns: ['fed ', 'federal reserve', 'réserve fédérale'] },
  { id: 'bce', label: 'BCE', patterns: ['bce ', 'ecb ', 'banque centrale européenne'] },
  { id: 'inflation', label: 'Inflation', patterns: ['inflation', 'cpi ', 'ipc '] },
]

/**
 * L'article cite-t-il cet actif ?
 *
 * La comparaison porte sur le titre ET l'extrait, entourés d'espaces. Cet
 * encadrement n'est pas cosmétique : il permet aux formes courtes de la liste
 * (« eth », « or », « fed ») d'être cherchées avec leur espace final, et donc de ne
 * pas se déclencher au milieu d'un mot. Sans lui, « or » trouverait « Norvège »,
 * « majeur » et « historique » — le filtre renverrait tout, donc rien.
 */
export function mentions(text: string, mention: AssetMention): boolean {
  const haystack = ` ${text.toLowerCase()} `
  return mention.patterns.some((pattern) => haystack.includes(pattern))
}

/** Les actifs dont au moins un article du lot parle — les autres n'ont rien à filtrer. */
export function availableMentions(texts: string[]): AssetMention[] {
  const joined = texts.map((text) => ` ${text.toLowerCase()} `)
  return ASSET_MENTIONS.filter((mention) =>
    joined.some((haystack) => mention.patterns.some((pattern) => haystack.includes(pattern))),
  )
}
