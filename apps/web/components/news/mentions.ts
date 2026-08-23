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

import type { AssetClass } from '@zenkuu/data'

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
  /**
   * Actif suivi correspondant, quand il y en a un.
   *
   * OPTIONNEL, et la moitié de la liste s'en passe : « Inflation », « Réserve
   * fédérale » ou « ETF crypto » sont des SUJETS, pas des actifs. Leur inventer un
   * identifiant pour uniformiser le type produirait une pastille qui promet une
   * cotation derrière un mot qui n'en a pas.
   *
   * ⚠️ CE SONT DES IDENTIFIANTS DE ROUTE, PAS DES SYMBOLES.
   *
   * Pour la crypto, l'identifiant CoinGecko (`bitcoin`). Pour tout ce que sert Yahoo,
   * le symbole passé par `toSlug` — c'est-à-dire EN MINUSCULES, sans `^` ni `=` ni
   * point : `nvda`, `gc-f`, `gspc`.
   *
   * Les trois entrées d'actions portaient ici `NVDA`, `AAPL`, `TSLA` en capitales, en
   * s'appuyant sur un commentaire qui affirmait que « ce sont eux qui résolvent sur
   * /actions/{id} ». C'était faux : `resolveEntry` compare à `toSlug(symbol)`, et
   * `/actions/NVDA` répondait donc 404. Le défaut ne se voyait pas parce que la
   * pastille ne s'affiche QUE si une cotation est connue pour l'identifiant, et que la
   * page d'actualités ne fournissait alors que des cotations crypto — aucune pastille
   * d'action n'était jamais rendue, donc aucun lien n'était jamais suivi.
   */
  assetId?: string
  /** Classe de l'actif, nécessaire pour construire l'URL de sa fiche. */
  assetClass?: AssetClass
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
  // ── Cryptoactifs ──────────────────────────────────────────────────────────
  { id: 'btc', label: 'Bitcoin', patterns: ['bitcoin', 'btc'], assetId: 'bitcoin', assetClass: 'crypto' },
  { id: 'eth', label: 'Ethereum', patterns: ['ethereum', 'ether ', 'eth '], assetId: 'ethereum', assetClass: 'crypto' },
  { id: 'sol', label: 'Solana', patterns: ['solana', 'sol '], assetId: 'solana', assetClass: 'crypto' },
  { id: 'xrp', label: 'XRP', patterns: ['xrp', 'ripple'], assetId: 'ripple', assetClass: 'crypto' },
  { id: 'bnb', label: 'BNB', patterns: ['bnb', 'binance coin'], assetId: 'binancecoin', assetClass: 'crypto' },
  { id: 'ada', label: 'Cardano', patterns: ['cardano', 'ada '], assetId: 'cardano', assetClass: 'crypto' },
  { id: 'doge', label: 'Dogecoin', patterns: ['dogecoin', 'doge'], assetId: 'dogecoin', assetClass: 'crypto' },
  { id: 'stablecoins', label: 'Stablecoins', patterns: ['stablecoin', 'usdt', 'usdc', 'tether'] },
  // ── ETF au comptant ───────────────────────────────────────────────────────
  /* `ibit` et non « ETF » tout court : le mot seul désigne aussi bien un fonds
     obligataire qu'un fonds bitcoin. Les formes cherchées nomment le PRODUIT, ce qui
     garde la pastille vraie — voir l'en-tête de ce fichier sur la différence entre
     chercher un mot et classer un article. */
  { id: 'etf-btc', label: 'ETF Bitcoin', patterns: ['ibit', 'spot bitcoin etf', 'etf bitcoin'], assetId: 'ibit', assetClass: 'etf' },
  { id: 'etf-eth', label: 'ETF Ether', patterns: ['etha', 'spot ether etf', 'etf ether'], assetId: 'etha', assetClass: 'etf' },
  { id: 'etf-crypto', label: 'ETF crypto', patterns: ['etf'] },
  // ── Actions ───────────────────────────────────────────────────────────────
  { id: 'nvidia', label: 'NVIDIA', patterns: ['nvidia', 'nvda'], assetId: 'nvda', assetClass: 'stock' },
  { id: 'apple', label: 'Apple', patterns: ['apple', 'aapl'], assetId: 'aapl', assetClass: 'stock' },
  { id: 'tesla', label: 'Tesla', patterns: ['tesla', 'tsla'], assetId: 'tsla', assetClass: 'stock' },
  { id: 'microsoft', label: 'Microsoft', patterns: ['microsoft', 'msft'], assetId: 'msft', assetClass: 'stock' },
  { id: 'amazon', label: 'Amazon', patterns: ['amazon', 'amzn'], assetId: 'amzn', assetClass: 'stock' },
  { id: 'coinbase', label: 'Coinbase', patterns: ['coinbase', 'coin '], assetId: 'coin', assetClass: 'stock' },
  { id: 'strategy', label: 'Strategy', patterns: ['microstrategy', 'mstr'], assetId: 'mstr', assetClass: 'stock' },
  // ── Indices ───────────────────────────────────────────────────────────────
  { id: 'sp500', label: 'S&P 500', patterns: ['s&p 500', 's&p500', 'sp500'], assetId: 'gspc', assetClass: 'index' },
  { id: 'nasdaq', label: 'Nasdaq', patterns: ['nasdaq'], assetId: 'ixic', assetClass: 'index' },
  { id: 'cac40', label: 'CAC 40', patterns: ['cac 40', 'cac40'], assetId: 'fchi', assetClass: 'index' },
  { id: 'dax', label: 'DAX', patterns: ['dax '], assetId: 'gdaxi', assetClass: 'index' },
  // ── Matières premières ────────────────────────────────────────────────────
  { id: 'or', label: 'Or', patterns: [" l'or ", ' or ', 'gold'], assetId: 'gc-f', assetClass: 'commodity' },
  { id: 'petrole', label: 'Pétrole', patterns: ['pétrole', 'petrole', 'oil', 'brent', 'wti'], assetId: 'bz-f', assetClass: 'commodity' },
  // ── Sujets sans cotation — proposés au FILTRE, jamais en pastille ─────────
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

/**
 * Les actifs QU'UN ARTICLE cite — pour les pastilles posées sous son titre.
 *
 * ── POURQUOI SEULEMENT CEUX QUI ONT UNE FICHE ──────────────────────────────
 *
 * Une pastille sert à DEUX choses : dire de quoi parle l'article, et donner la
 * variation de l'actif au moment où on le lit. La seconde n'a de sens que si l'actif
 * est coté quelque part chez nous. « Inflation » ou « Réserve fédérale » produiraient
 * une pastille inerte au milieu de pastilles chiffrées — l'œil y chercherait un
 * nombre qui n'arrivera jamais.
 *
 * Ces sujets restent PROPOSÉS AU FILTRE, où ils sont parfaitement utiles : filtrer
 * sur « inflation » a un sens, afficher une variation de l'inflation n'en a pas.
 */
export function citedAssets(text: string): AssetMention[] {
  return ASSET_MENTIONS.filter((mention) => mention.assetId && mentions(text, mention))
}

/** Les actifs dont au moins un article du lot parle — les autres n'ont rien à filtrer. */
export function availableMentions(texts: string[]): AssetMention[] {
  const joined = texts.map((text) => ` ${text.toLowerCase()} `)
  return ASSET_MENTIONS.filter((mention) =>
    joined.some((haystack) => mention.patterns.some((pattern) => haystack.includes(pattern))),
  )
}
