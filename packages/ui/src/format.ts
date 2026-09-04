/**
 * Formatage des nombres.
 *
 * Toutes les fonctions renvoient `null` quand la valeur est absente, plutôt qu'un
 * « 0 » ou un « 0,00 € ». C'est l'application de la règle §5 au niveau de
 * l'affichage : une donnée manquante se voit, elle ne se déguise pas en zéro.
 *
 * ── LOCALE ────────────────────────────────────────────────────────────────────
 *
 * Chaque fonction accepte une locale en dernier argument, et l'on ne l'appelle plus
 * directement : `createFormatters(locale)`, en bas de ce fichier, rend les mêmes
 * fonctions avec la langue déjà liée. Les composants passent par lui.
 *
 * ⚠️ LA NOTE QUI TENAIT ICI DISAIT L'INVERSE, ET SON CONSEIL NE MARCHAIT PAS.
 *
 * Elle expliquait que le paramètre restait optionnel « par compatibilité », et que
 * « toute nouvelle écriture devrait le passer ». Mesuré au moment d'écrire ces lignes :
 * sur cent cinquante sites d'appel, AUCUN ne le passait. Le conseil était juste et
 * personne ne l'a suivi — parce qu'un paramètre facultatif en fin de signature ne se
 * réclame jamais de lui-même.
 *
 * Les deux constantes ci-dessous ne sont donc plus le régime normal mais un DERNIER
 * RECOURS, celui d'un appel direct qui aurait échappé à `createFormatters`.
 */

import { currencyDecimals, currencySymbol, getCurrency } from '@zenkuu/data/currencies'

/**
 * Locale de dernier recours pour les DATES.
 *
 * ⚠️ ELLE VALAIT `'fr-FR'`, ET SON RAISONNEMENT A CESSÉ D'ÊTRE VRAI. La note
 * expliquait que « le site reste français » et qu'une date américaine y serait lue à
 * l'envers un jour sur deux. Le site n'est plus français par défaut : `DEFAULT_LOCALE`
 * de `components/settings/languages.ts` est passé à l'anglais, et servir une date
 * française sous une interface anglaise fait exactement l'inconvénient que la note
 * dénonçait, dans l'autre sens.
 *
 * Le risque qu'elle décrivait — « 8/24 » lu pour le 8 août — reste réel, et il est
 * traité mieux qu'ici : `formatDateTime` demande un `dateStyle: 'short'`, qu'`Intl`
 * rend selon la convention de la langue reçue. La langue étant désormais toujours
 * passée, la question ne se pose plus qu'ici, sur un appel qui aurait fui.
 */
const DEFAULT_LOCALE = 'en-US'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LOCALE DES NOMBRES ET DES MONTANTS — ANGLO-SAXONNE, ET C'EST DÉLIBÉRÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Les montants s'écrivent désormais « $77,570.30 » et non « 77 570,30 $US » : symbole
 * devant, virgule pour les milliers, point pour les décimales.
 *
 * ── POURQUOI SÉPARER LES NOMBRES DES DATES ───────────────────────────────────
 *
 * Parce que les deux conventions ne portent pas le même risque. Un montant anglo-saxon
 * lu par un francophone reste JUSTE : « $77,570.30 » ne peut pas se comprendre comme
 * autre chose que soixante-dix-sept mille. Une date anglo-saxonne, elle, devient
 * FAUSSE une fois sur deux — « 8/24 » et « 24/8 » sont tous deux plausibles. On change
 * donc ce qui est sans danger et l'on garde le français là où il protège.
 *
 * ── CE QUE CELA TOUCHE ───────────────────────────────────────────────────────
 *
 * Tout ce qui n'écrit pas explicitement sa locale : le cours en tête de fiche, le rail
 * de chiffres, les tableaux de cotation, les axes du graphique, les cartes d'accueil,
 * le convertisseur. C'est le point unique par lequel ils passent tous — d'où le
 * changement ici plutôt qu'aux sites d'appel.
 *
 * ⚠️ LES APPELANTS QUI PASSENT UNE LOCALE GARDENT LA MAIN. C'est voulu : une page
 * traduite doit pouvoir écrire ses nombres dans sa propre convention. Le défaut ne
 * s'applique qu'à ceux qui n'en demandent aucune.
 */
const NUMBER_LOCALE = 'en-US'

/**
 * Espace fine INSÉCABLE (U+202F), posée devant le signe pourcent.
 *
 * Écrite en séquence d'échappement et non au caractère : à l'œil nu, dans un
 * éditeur, elle est indistinguable d'une espace ordinaire — laquelle serait un point
 * de coupure pour le navigateur et casserait « +3,89 % » en deux lignes au milieu
 * d'une colonne étroite. La forme échappée rend la nuance visible en relecture.
 */
const PERCENT_GAP = '\u202F'

interface CompactUnit {
  threshold: number
  suffix: string
  divisor: number
}

/**
 * Échelle française — « Md » pour milliard, pas « B ».
 *
 * Volontairement arrêtée au milliard : au-delà, le français dit « billion » pour
 * 10¹², quand l'anglais dit « billion » pour 10⁹. Sur un site de marché lu par des
 * gens habitués aux chiffres anglo-saxons, cette collision est un piège. Une
 * capitalisation de 1,99 × 10¹² s'affiche donc « 1 991 Md € », qui ne se lit que
 * d'une seule manière.
 */
const COMPACT_FR: readonly CompactUnit[] = [
  { threshold: 1e9, suffix: ' Md', divisor: 1e9 },
  { threshold: 1e6, suffix: ' M', divisor: 1e6 },
  { threshold: 1e3, suffix: ' k', divisor: 1e3 },
]

/**
 * Échelle anglo-saxonne.
 *
 * Le raisonnement du bloc précédent NE SE TRANSPOSE PAS : l'ambiguïté « billion »
 * qui interdit d'aller au-delà du milliard en français n'existe pas en anglais, où
 * « B » vaut sans discussion 10⁹. On s'arrête pourtant au même rang, pour que les
 * deux langues affichent la MÊME grandeur au même endroit — un tableau comparé
 * entre deux onglets de langue différente doit donner les mêmes nombres.
 *
 * Suffixes collés au nombre, sans espace : « $1.99B » et non « 1,99 Md $ ». C'est la
 * convention typographique anglaise, et l'espace française s'y remarque aussitôt.
 */
const COMPACT_EN: readonly CompactUnit[] = [
  { threshold: 1e9, suffix: 'B', divisor: 1e9 },
  { threshold: 1e6, suffix: 'M', divisor: 1e6 },
  { threshold: 1e3, suffix: 'K', divisor: 1e3 },
]

/**
 * Échelle abrégée selon la langue.
 *
 * Deux échelles seulement, et non vingt-huit : les abréviations d'ordre de grandeur
 * ne sont pas normalisées et `Intl.NumberFormat({ notation: 'compact' })` produit des
 * résultats hétérogènes selon la langue — « 1,9 Bn », « 19億 », « 1,9 مليار » — dont
 * la largeur de colonne varie du simple au triple. Sur des tableaux à colonnes fixes,
 * cela casse la mise en page.
 *
 * Le partage se fait donc sur la seule distinction qui compte ici : le français,
 * qui a sa propre convention documentée ci-dessus, et TOUT LE RESTE, qui lit
 * couramment la notation anglo-saxonne des marchés. C'est un choix assumé, et
 * révisable langue par langue si un lecteur le signale.
 */
function compactUnits(locale: string): readonly CompactUnit[] {
  return locale.toLowerCase().startsWith('fr') ? COMPACT_FR : COMPACT_EN
}

/**
 * La langue met-elle une espace devant le signe pourcent ?
 *
 * Le français l'exige, l'anglais l'interdit. La liste suit les conventions
 * typographiques nationales plutôt qu'une donnée d'`Intl`, qui n'expose pas cette
 * information séparément du formatage complet.
 */
function usesSpaceBeforePercent(locale: string): boolean {
  const language = locale.toLowerCase().split('-')[0] ?? ''
  return ['fr', 'cs', 'sv', 'fi', 'de', 'da', 'nb', 'no', 'tr', 'sk', 'sl'].includes(language)
}

/**
 * Montant monétaire.
 *
 * ── POURQUOI DEUX CHEMINS DE FORMATAGE ────────────────────────────────────────
 *
 * `Intl.NumberFormat({ style: 'currency' })` n'accepte QUE des codes de trois
 * lettres. Depuis que le sélecteur propose les 62 devises du catalogue, trois
 * d'entre elles en comptent quatre — LINK, BITS, SATS — et le constructeur lève une
 * `RangeError`. Ce n'est pas une dégradation d'affichage : c'est une exception non
 * rattrapée qui fait tomber le rendu de la page entière. Un lecteur qui choisit
 * « Satoshi » perdait le site.
 *
 * Les codes crypto à trois lettres, eux, passent — mais mal. `Intl` ne les connaît
 * pas et applique son défaut de deux décimales : 0,00004 BTC s'affichait « 0,00 BTC ».
 * Un chiffre faux, ce que le §5 proscrit au même titre qu'un zéro inventé.
 *
 * D'où la bifurcation : les monnaies et les métaux (codes ISO 4217) passent par le
 * style monétaire d'`Intl`, qui place correctement le symbole selon la langue ; les
 * unités crypto sont formatées en décimal puis suffixées de leur propre code, avec
 * un nombre de décimales tiré de l'ORDRE DE GRANDEUR (cf. `currencyDecimals`).
 */
export function formatCurrency(
  value: number | undefined,
  currency: string,
  options: { compact?: boolean; locale?: string } = {},
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  const locale = options.locale ?? NUMBER_LOCALE
  const code = currency.toUpperCase()

  if (options.compact) {
    const compact = formatCompact(Math.abs(value), locale)
    if (compact === null) return null

    /*
     * ⚠️ LE SYMBOLE SE PLACE SELON LA LANGUE, IL N'EST PLUS TOUJOURS SUFFIXÉ.
     *
     * Il l'était : `${montant} ${symbole}`, ce qui donnait « 1,56 Md $ » — juste en
     * français. Depuis que les nombres se composent en anglo-saxon, la même ligne
     * écrivait « 1.56B $ », qui n'est la convention de personne : l'anglais met le
     * signe DEVANT, et sans espace.
     *
     * Le décalage se voyait à l'œil sur la fiche : le cours affichait « $77,503.54 »
     * deux centimètres au-dessus d'une capitalisation « 1,555B $ ».
     *
     * On ne peut pas déléguer ce placement à `Intl` : le chemin compact ne passe pas
     * par le style monétaire (voir l'en-tête), justement parce qu'il doit produire nos
     * propres abréviations. Le test de langue est donc explicite, et il reprend celui
     * de `compactUnits` — les deux décrivent la même frontière.
     *
     * L'espace du côté français est INSÉCABLE (U+00A0) : une espace ordinaire
     * autoriserait le navigateur à couper « 1,56 Md » et « $ » sur deux lignes.
     */
    const sign = value < 0 ? '−' : ''
    const symbol = currencySymbol(code, locale)
    return locale.toLowerCase().startsWith('fr')
      ? `${sign}${compact} ${symbol}`
      : `${sign}${symbol}${compact}`
  }

  const digits = currencyDecimals(code, value)

  // Chemin des unités crypto : décimal + suffixe. On ne PEUT PAS déléguer à `Intl`,
  // qui refuse les codes hors ISO ou leur impose ses décimales.
  if (getCurrency(code)?.kind === 'crypto') {
    const amount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(value)
    return `${amount} ${currencySymbol(code, locale)}`
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: Math.min(2, digits),
      maximumFractionDigits: digits,
    }).format(value)
  } catch {
    // Filet pour un code absent du catalogue — un actif dont la source annonce une
    // devise que nous ne connaissons pas. Mieux vaut « 1 234,50 XYZ » qu'une page
    // blanche : le montant reste juste, seul le symbole manque.
    const amount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Math.min(2, digits),
      maximumFractionDigits: digits,
    }).format(value)
    return `${amount} ${code}`
  }
}

export function formatCompact(
  value: number | undefined,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  const absolute = Math.abs(value)
  const units = compactUnits(locale)
  const unit = units.find((candidate) => absolute >= candidate.threshold)

  if (!unit) return formatNumber(value, 2, locale)

  const scaled = value / unit.divisor
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2,
  }).format(scaled)}${unit.suffix}`
}

/**
 * ÉCHELLE ABRÉGÉE D'UN AXE — « 1,7 Bn », « 1,292 Bn », « 63,24 k ».
 *
 * Distincte de `formatCompact`, et l'écart tient en un mot : la PRÉCISION s'exprime
 * ici en chiffres significatifs, là-bas en décimales.
 *
 * ── POURQUOI CETTE SECONDE FONCTION EXISTE ───────────────────────────────────
 *
 * `formatCompact` sert des libellés ISOLÉS — une tuile de carte thermique, un
 * compteur, une infobulle de volume. Chacun se lit seul, et l'ordre de grandeur y
 * suffit : « 1,3 Bn » dit tout ce qu'on attend d'une tuile.
 *
 * Un AXE est l'inverse : ses six graduations se lisent LES UNES CONTRE LES AUTRES, et
 * leur seul office est de se distinguer. Mesuré sur une capitalisation de bitcoin en
 * fenêtre de sept jours, `formatCompact` rendait « 1,3 Bn » aux six graduations —
 * l'actif ne bouge que d'un ou deux pour cent en une semaine, et 1 292, 1 301 et
 * 1 310 milliards partagent le même dixième.
 *
 * Aucun nombre fixe de décimales ne peut convenir, parce que l'écart entre graduations
 * dépend de la fenêtre affichée : un dixième suffit sur un an, il en faut trois sur
 * sept jours. Les chiffres significatifs règlent cela sans connaître la fenêtre —
 * quatre donnent « 1,7 Bn » là où le nombre est rond, « 1,292 Bn » là où il ne l'est
 * pas.
 *
 * Le `null` d'entrée est propagé comme partout ailleurs ici : une valeur absente reste
 * absente, elle ne devient pas « 0 » (§5).
 */
export function formatCompactAxis(
  value: number | undefined,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumSignificantDigits: 4,
  }).format(value)
}

export function formatNumber(
  value: number | undefined,
  maximumFractionDigits = 2,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)
}

/**
 * Un nombre à décimales FIXÉES — l'équivalent de `toFixed`, en suivant la langue.
 *
 * ── POURQUOI IL NE SUFFIT PAS D'APPELER `formatNumber` ─────────────────────
 *
 * Celui-ci ne borne que le MAXIMUM : il rend « 36 » là où `toFixed(1)` écrit « 36,0 ».
 * Sur une colonne de ratios alignés, la différence se voit — c'est le décalage d'un
 * chiffre sur une ligne parmi vingt.
 *
 * Il existe parce que le site écrivait ces valeurs en `toFixed(n).replace('.', ',')`,
 * vingt-trois fois. La virgule était posée À LA MAIN, donc française dans les treize
 * langues : mesuré sur la fiche Apple en anglais, le rapport cours/bénéfice s'affichait
 * « 36,7 » sous un cours écrit « $328.21 ». Deux conventions dans la même colonne.
 */
export function formatFixed(
  value: number | undefined,
  digits: number,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'ÉCHELLE D'UN GRAPHIQUE DE COURS — « $55.00 », ET NON « 55 $US »
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LA SEULE FONCTION DE CE FICHIER QUI IGNORE LA LOCALE, ET C'EST VOULU ─────
 *
 * Toutes les autres suivent la langue du lecteur, parce qu'elles écrivent des
 * chiffres DANS DU TEXTE. L'axe d'un graphique de cotation n'est pas du texte : c'est
 * une convention de marché, la même chez CoinGecko, TradingView et Bloomberg —
 * symbole devant, point décimal, deux décimales. « 55 $US » se lit comme une phrase
 * française ; « $55.00 » se lit comme un cours.
 *
 * ── POURQUOI ELLE VIT ICI PLUTÔT QUE DANS LE COMPOSANT DE TRACÉ ──────────────
 *
 * Parce que DEUX tracés écrivent ces étiquettes : le SVG rendu par le serveur, visible
 * avant l'hydratation, et le graphique amCharts qui le remplace ensuite. Deux
 * formateurs différents feraient sauter l'axe au moment de la bascule — c'est déjà la
 * raison d'être de `formatCompactAxis`, juste au-dessus.
 *
 * `compact` est réservé aux grandeurs qui se comptent en milliards (capitalisation,
 * volume) : « $1.7B ». Un cours n'y passe jamais, on vient le lire au chiffre près.
 */
export function formatAxisMoney(
  value: number | undefined,
  currency: string,
  compact = false,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...(compact
        ? { notation: 'compact' as const, maximumFractionDigits: 2 }
        : {
            minimumFractionDigits: axisDigits(value),
            maximumFractionDigits: axisDigits(value),
          }),
    }).format(value)
  } catch {
    /* Code non monétaire — une crypto en unité de compte : le nombre seul plutôt
       qu'une exception qui mettrait la fiche entière en erreur. */
    return compact
      ? formatCompactAxis(value, locale)
      : new Intl.NumberFormat(locale, { maximumFractionDigits: axisDigits(value) }).format(value)
  }
}

/**
 * Décimales de l'échelle, choisies sur l'ordre de grandeur.
 *
 * Deux, comme la référence, tant que le cours est lisible ainsi. En dessous de
 * l'unité — une mème-monnaie à 0,000012 — deux décimales écriraient six graduations
 * identiques à « $0.00 », c'est-à-dire une échelle sans information.
 */
function axisDigits(value: number): number {
  const size = Math.abs(value)
  if (size >= 1 || size === 0) return 2
  if (size >= 0.01) return 4
  return 8
}

/** Variation en pourcentage, signe explicite compris : « +2,34 % », « −1,10 % ». */
export function formatPercent(
  value: number | undefined,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))

  const sign = value > 0 ? '+' : value < 0 ? '−' : ''

  // Espace fine INSÉCABLE (U+202F) devant le signe pourcent, et non une espace
  // ordinaire. Deux raisons qui vont dans le même sens :
  //   · typographie française — le pourcent se sépare du nombre par une espace
  //     insécable, de préférence fine ;
  //   · rendu — une espace ordinaire est un point de coupure pour le navigateur.
  //     Dans les colonnes de variation, posées en largeur fixe, « +3,89 % » se
  //     cassait en deux lignes avec le pourcent seul sous son nombre.
  //
  // L'anglais colle au contraire le signe au nombre — « +3.89% ». Conserver l'espace
  // française dans un texte anglais se remarque immédiatement.
  const gap = usesSpaceBeforePercent(locale) ? PERCENT_GAP : ''
  return `${sign}${formatted}${gap}%`
}

/**
 * Part d'un total — « 98,5 % », SANS signe.
 *
 * Distinct de `formatPercent`, et la distinction n'est pas cosmétique : une
 * VARIATION porte un signe explicite parce que son sens dépend de sa direction,
 * quand une PART est positive par construction. « +98,5 % » sur une répartition se
 * lit comme une hausse de 98,5 %, ce qui est un contresens.
 *
 * Une décimale et non deux : sur une légende d'anneau, la seconde décimale n'aide
 * aucune décision et allonge une colonne déjà étroite.
 */
export function formatShare(
  value: number | undefined,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value)

  return `${formatted}${usesSpaceBeforePercent(locale) ? PERCENT_GAP : ''}%`
}

/** Taux de change : 4 décimales, sauf pour les paires à forte valeur nominale (JPY). */
export function formatRate(
  value: number | undefined,
  locale: string = NUMBER_LOCALE,
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: value >= 100 ? 2 : 4,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value)
}

export function formatDateTime(
  iso: string | undefined,
  locale: string = DEFAULT_LOCALE,
): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES MÊMES FONCTIONS, LIÉES À UNE LANGUE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE DÉFAUT ÉTAIT UN MENSONGE POLI ─────────────────────────────────────────
 *
 * Chaque fonction ci-dessus accepte une locale en dernier argument, et la note
 * d'en-tête invitait les nouveaux appels à la passer. Mesuré : sur cent cinquante
 * sites d'appel, AUCUN ne la passait. Le site rendait donc `en-US` dans les treize
 * langues pour les nombres et `fr-FR` pour les dates, pendant qu'une quarantaine de
 * composants écrivaient leur propre `Intl.NumberFormat('fr-FR')` par-dessus — d'où
 * des fiches affichant « $320.38 » au-dessus de « 36,7 ».
 *
 * Un paramètre optionnel qu'on peut oublier finit par être oublié : ce ne sont pas
 * cent cinquante distractions, c'est une friction de trop, cent cinquante fois. Lier
 * la langue UNE FOIS par composant retire l'occasion de se tromper.
 *
 * ── POURQUOI DES NOMS COURTS ─────────────────────────────────────────────────
 *
 * `nombres.compact(v)` plutôt que `nombres.formatCompact(v)` : le préfixe `format`
 * disait « ceci est du formatage » quand la fonction voyageait seule. Rattaché à un
 * objet qui le dit déjà, il ne porte plus rien.
 */
export interface Formatters {
  currency: (
    value: number | undefined,
    currency: string,
    options?: { compact?: boolean },
  ) => string | null
  compact: (value: number | undefined) => string | null
  compactAxis: (value: number | undefined) => string | null
  number: (value: number | undefined, maximumFractionDigits?: number) => string | null
  /** Décimales fixées, comme `toFixed` — voir `formatFixed`. */
  fixed: (value: number | undefined, digits: number) => string | null
  axisMoney: (value: number | undefined, currency: string, compact?: boolean) => string | null
  percent: (value: number | undefined) => string | null
  share: (value: number | undefined) => string | null
  rate: (value: number | undefined) => string | null
  dateTime: (iso: string | undefined) => string | null
}

/**
 * ⚠️ À N'APPELER QUE PAR `useFormatters()` ET `getFormatters()`.
 *
 * Cette fonction ne SAIT pas quelle langue est rendue — on la lui donne. Les deux
 * accesseurs de `apps/web` la tiennent de la requête ; l'appeler ailleurs avec une
 * locale devinée reproduirait exactement le défaut qu'elle corrige.
 */
export function createFormatters(locale: string): Formatters {
  return {
    currency: (value, code, options) => formatCurrency(value, code, { ...options, locale }),
    compact: (value) => formatCompact(value, locale),
    compactAxis: (value) => formatCompactAxis(value, locale),
    number: (value, maximumFractionDigits) =>
      formatNumber(value, maximumFractionDigits ?? 2, locale),
    fixed: (value, digits) => formatFixed(value, digits, locale),
    axisMoney: (value, code, compact) => formatAxisMoney(value, code, compact, locale),
    percent: (value) => formatPercent(value, locale),
    share: (value) => formatShare(value, locale),
    rate: (value) => formatRate(value, locale),
    dateTime: (iso) => formatDateTime(iso, locale),
  }
}
