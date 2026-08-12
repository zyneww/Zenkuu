/**
 * Catalogue des devises d'affichage.
 *
 * Les 63 devises que CoinGecko accepte en `vs_currency`, moins VEF (voir plus bas) :
 * 46 monnaies, 14 unités crypto, 2 métaux. C'est la liste que propose la référence,
 * et c'est aussi — ce qui compte davantage — la liste que nos taux savent réellement
 * convertir. Une devise n'entre ici que si le moteur de change peut la servir.
 *
 * ── POURQUOI AUCUN NOM DE DEVISE N'EST ÉCRIT DANS CE FICHIER ──────────────────
 *
 * Le site vise 28 langues. Écrire les noms à la main coûterait 46 × 28 ≈ 1 300
 * traductions, qu'il faudrait maintenir et dont aucune ne serait vérifiable par
 * l'équipe. Or `Intl.DisplayNames` connaît DÉJÀ tout code ISO 4217 dans chaque
 * langue installée : « dollar des États-Unis », « US Dollar », « 米ドル »,
 * « دولار أمريكي » sortent du navigateur, gratuitement et sans risque de faute.
 *
 * Le catalogue ne porte donc que ce qu'`Intl` ignore : le classement en groupes, et
 * un nom de repli pour les 14 unités crypto — qui ne sont pas des codes ISO, et dont
 * les noms sont de toute façon des noms propres identiques dans toutes les langues
 * (« Bitcoin », « Solana »). Voir `currencyName()`.
 *
 * ── VEF, ABSENTE VOLONTAIREMENT ───────────────────────────────────────────────
 *
 * CoinGecko l'accepte encore en `vs_currency`, mais le bolívar VEF a été remplacé
 * par le VES en 2018 : le taux renvoyé est figé et faux de plusieurs ordres de
 * grandeur. Proposer une conversion dont on sait le résultat faux contredit le §5
 * plus sûrement que ne pas la proposer du tout. C'est la seule des 63 qui manque,
 * et la référence l'écarte pareillement.
 */

/** Nature de la devise — décide du groupe d'affichage et du formatage. */
export type CurrencyKind = 'fiat' | 'crypto' | 'commodity'

/**
 * Groupe d'affichage dans le sélecteur.
 *
 * `suggested` double volontairement `fiat` : les huit devises les plus demandées
 * apparaissent en tête ET restent absentes de la longue liste, pour ne pas obliger
 * à parcourir quarante lignes afin de retrouver le dollar.
 */
export type CurrencyGroup = 'suggested' | 'fiat' | 'crypto' | 'bitcoin' | 'commodity'

export interface CurrencyMeta {
  /** Code en majuscules — « USD », « SATS ». */
  code: string
  kind: CurrencyKind
  group: CurrencyGroup
  /**
   * Nom de repli, en anglais.
   *
   * Renseigné UNIQUEMENT pour ce qu'`Intl.DisplayNames` ignore : les unités crypto,
   * qui ne sont pas des codes ISO 4217. Pour tout le reste, `undefined` — et c'est
   * une absence significative, pas un oubli : elle signale que le nom doit venir de
   * la locale, jamais d'une chaîne figée en anglais.
   */
  fallbackName?: string
}

/**
 * Devises mises en avant.
 *
 * L'ordre est celui de la référence, et il n'est pas alphabétique : il suit le
 * volume de consultation réel. Le dollar et l'euro d'abord, puis les marchés
 * asiatiques qui pèsent le plus lourd en trafic crypto.
 */
const SUGGESTED = ['USD', 'IDR', 'TWD', 'EUR', 'KRW', 'JPY', 'RUB', 'CNY'] as const

/** Monnaies restantes, par ordre alphabétique — c'est ainsi qu'on cherche dans une liste longue. */
const FIAT = [
  'AED', 'ARS', 'AUD', 'BDT', 'BHD', 'BMD', 'BRL', 'CAD', 'CHF', 'CLP',
  'CZK', 'DKK', 'GBP', 'GEL', 'HKD', 'HUF', 'ILS', 'INR', 'KWD', 'LKR',
  'MMK', 'MXN', 'MYR', 'NGN', 'NOK', 'NZD', 'PHP', 'PKR', 'PLN', 'SAR',
  'SEK', 'SGD', 'THB', 'TRY', 'UAH', 'VND', 'ZAR', 'XDR',
] as const

/** Unités crypto — noms propres, donc identiques dans toutes les langues. */
const CRYPTO: ReadonlyArray<readonly [string, string]> = [
  ['BTC', 'Bitcoin'],
  ['ETH', 'Ether'],
  ['LTC', 'Litecoin'],
  ['BCH', 'Bitcoin Cash'],
  ['BNB', 'Binance Coin'],
  ['EOS', 'EOS'],
  ['XRP', 'XRP'],
  ['XLM', 'Lumens'],
  ['LINK', 'Chainlink'],
  ['DOT', 'Polkadot'],
  ['YFI', 'Yearn.finance'],
  ['SOL', 'Solana'],
]

/**
 * Sous-unités du bitcoin, à part.
 *
 * Ce ne sont pas des devises distinctes mais des échelles du BTC — 1 BTC = 10⁶ bits
 * = 10⁸ satoshis. Les grouper avec les cryptos laisserait croire à trois actifs
 * différents ; la référence les sépare pour la même raison.
 */
const BITCOIN_UNITS: ReadonlyArray<readonly [string, string]> = [
  ['BITS', 'Bits'],
  ['SATS', 'Satoshi'],
]

/**
 * Métaux précieux, cotés à l'once troy.
 *
 * Ce sont bien des codes ISO 4217, et l'on s'attendrait donc à ce qu'`Intl` les
 * traduise comme les monnaies. Il n'en est rien, et l'écart MESURÉ est instructif :
 *
 *   • Node (ICU complet)  → `of('XAU')` rend « or », « Gold », « 金 »
 *   • Chrome 151          → `of('XAU')` rend `undefined` dans TOUTES les langues
 *
 * Deux environnements, deux réponses, pour le même code et la même norme. Laisser
 * `Intl` décider ferait afficher « Or » au rendu serveur et « XAU » après
 * hydratation — un désaccord que React signale, et un libellé qui change sous les
 * yeux du lecteur.
 *
 * Un nom explicite est donc porté ici, ce qui garantit que les deux environnements
 * disent la même chose. Il est en anglais, comme les unités crypto, et c'est le seul
 * endroit du catalogue où ce choix se paie : « Gold » restera « Gold » en français
 * tant que la fenêtre de préférences ne fournira pas de traduction pour ces deux
 * lignes (ce qu'elle pourra faire depuis ses propres messages, cf. §i18n).
 */
const COMMODITIES: ReadonlyArray<readonly [string, string]> = [
  ['XAG', 'Silver — troy ounce'],
  ['XAU', 'Gold — troy ounce'],
]

function entry(code: string, kind: CurrencyKind, group: CurrencyGroup, fallbackName?: string): CurrencyMeta {
  return fallbackName ? { code, kind, group, fallbackName } : { code, kind, group }
}

/** Catalogue complet, dans l'ordre d'affichage du sélecteur. */
export const CURRENCIES: readonly CurrencyMeta[] = [
  ...SUGGESTED.map((code) => entry(code, 'fiat', 'suggested')),
  ...FIAT.map((code) => entry(code, 'fiat', 'fiat')),
  ...CRYPTO.map(([code, name]) => entry(code, 'crypto', 'crypto', name)),
  ...BITCOIN_UNITS.map(([code, name]) => entry(code, 'crypto', 'bitcoin', name)),
  ...COMMODITIES.map(([code, name]) => entry(code, 'commodity', 'commodity', name)),
]

/** Index par code, pour éviter un balayage linéaire à chaque montant formaté. */
const BY_CODE = new Map(CURRENCIES.map((meta) => [meta.code, meta]))

/** Codes en minuscules, tels que les attend le paramètre `vs_currency` de la source. */
export const CURRENCY_CODES: readonly string[] = CURRENCIES.map((meta) => meta.code)

export function getCurrency(code: string): CurrencyMeta | undefined {
  return BY_CODE.get(code.toUpperCase())
}

export function isSupportedCurrency(code: string): boolean {
  return BY_CODE.has(code.toUpperCase())
}

/**
 * Nom lisible d'une devise, dans la langue demandée.
 *
 * Chaîne de repli en trois temps, et chacun des trois sert réellement :
 *   1. `Intl.DisplayNames` — couvre les 46 monnaies et les 2 métaux, dans les 28
 *      langues. C'est le cas courant.
 *   2. `fallbackName` — les 14 unités crypto, qu'aucune norme ISO ne décrit.
 *   3. le code lui-même — filet pour une langue dont les données de localisation
 *      sont partielles. Mesuré : le hindi ne connaît ni XAU, ni XAG, ni XDR, alors
 *      qu'il connaît les monnaies. Sans ce troisième temps, ces lignes seraient vides.
 *
 * `fallback: 'none'` est indispensable : par défaut `Intl` renvoie le code au lieu
 * d'échouer, ce qui rendrait le deuxième temps inatteignable.
 */
/**
 * Instances `Intl.DisplayNames`, une par langue.
 *
 * Leur construction n'est pas gratuite : le sélecteur en demandait 62 par rendu, et
 * le filtre de recherche relance le calcul à chaque frappe. Une instance par langue
 * suffit — elles sont sans état et réutilisables.
 */
const DISPLAY_NAMES = new Map<string, Intl.DisplayNames | null>()

function displayNames(locale: string): Intl.DisplayNames | null {
  const cached = DISPLAY_NAMES.get(locale)
  if (cached !== undefined) return cached

  let instance: Intl.DisplayNames | null = null
  try {
    instance = new Intl.DisplayNames([locale], { type: 'currency', fallback: 'none' })
  } catch {
    /* Locale inconnue de l'environnement : mémorisée comme absente, pas retentée. */
  }

  DISPLAY_NAMES.set(locale, instance)
  return instance
}

export function currencyName(code: string, locale: string): string {
  const upper = code.toUpperCase()
  const meta = BY_CODE.get(upper)

  // Court-circuit AVANT tout appel à `Intl`, et non un simple raccourci de
  // performance : `DisplayNames.of()` lève une `RangeError` — et non `undefined` —
  // sur un code qui n'a pas la forme d'un code monétaire ISO. Les quatre lettres de
  // « BITS », « SATS » et « LINK » suffisent à faire tomber le rendu.
  //
  // Un `fallbackName` renseigné signale précisément « code hors ISO » : c'est la
  // condition la plus fiable dont on dispose, et elle évite d'avoir à deviner la
  // règle de validité d'`Intl`.
  if (meta?.fallbackName) return meta.fallbackName

  // Filet malgré tout, pour un code venu d'une source et absent du catalogue : la
  // garde ci-dessus ne le couvre pas, et `of()` lèverait de la même façon.
  try {
    const name = displayNames(locale)?.of(upper)
    if (name) return capitalise(name, locale)
  } catch {
    /* Code mal formé : on rend le code brut plutôt que de faire tomber la page. */
  }

  return upper
}

/**
 * Majuscule initiale.
 *
 * Le CLDR suit la typographie de chaque langue, et le français écrit les noms de
 * monnaies en bas de casse : « dollar des États-Unis », « euro », « yen japonais ».
 * C'est correct dans une phrase, mais le sélecteur n'est pas une phrase — c'est une
 * grille d'étiquettes, où une colonne de minuscules à côté d'une colonne de codes en
 * capitales se lit comme un défaut de rendu.
 *
 * `toLocaleUpperCase` et non `toUpperCase` : la règle dépend de la langue. En turc,
 * « i » devient « İ » et non « I », et une majuscule latine sur un mot turc est une
 * faute visible pour un lecteur turc.
 */
function capitalise(value: string, locale: string): string {
  const first = value.charAt(0)
  if (!first) return value
  return first.toLocaleUpperCase(locale) + value.slice(1)
}

/**
 * Symbole d'affichage — « $ », « £ », « sats ».
 *
 * Dérivé de la locale pour les codes ISO, parce que le symbole DÉPEND de la langue :
 * un lecteur américain lit « $ » là où un lecteur canadien attend « US$ ». Les codes
 * hors ISO n'ont pas de symbole normalisé et rendent leur propre code.
 */
export function currencySymbol(code: string, locale: string): string {
  const upper = code.toUpperCase()
  const meta = BY_CODE.get(upper)

  // Crypto : aucun symbole normalisé. « SATS » se lit mieux que n'importe quel glyphe
  // inventé, et « μBTC » pour les bits est la notation d'usage.
  if (meta?.kind === 'crypto') return upper === 'BITS' ? 'μBTC' : upper

  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: upper,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(1)
    const symbol = parts.find((part) => part.type === 'currency')?.value
    if (symbol) return symbol
  } catch {
    /* Code refusé par Intl : on rend le code. */
  }

  return upper
}

/**
 * Décimales à afficher pour un montant.
 *
 * Le nombre de décimales n'est pas une question de style mais d'exactitude : deux
 * décimales sur un montant en satoshis (1 € ≈ 900 sats) tronquent l'information
 * utile, tandis que huit décimales sur un montant en yens la noient. On suit donc
 * l'ORDRE DE GRANDEUR de la valeur, pas seulement la devise.
 */
export function currencyDecimals(code: string, value: number): number {
  const meta = BY_CODE.get(code.toUpperCase())
  const absolute = Math.abs(value)

  // Les unités crypto s'expriment en très grands nombres (sats) ou en très petits
  // (BTC) : c'est la valeur qui tranche, jamais la devise seule.
  if (meta?.kind === 'crypto' || meta?.kind === 'commodity') {
    if (absolute >= 1000) return 0
    if (absolute >= 1) return 2
    if (absolute >= 0.01) return 4
    return 8
  }

  return absolute >= 1 ? 2 : absolute >= 0.01 ? 4 : 8
}
