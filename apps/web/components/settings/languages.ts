/**
 * Langues proposées par le sélecteur.
 *
 * Les 34 locales de la référence : 8 mises en avant, 26 en liste complète.
 *
 * ── POURQUOI LES LIBELLÉS SONT ÉCRITS ICI ─────────────────────────────────────
 *
 * Les noms de devises, eux, sont dérivés d'`Intl.DisplayNames` (cf.
 * `packages/data/src/currencies.ts`), et l'on pourrait croire l'incohérence
 * regrettable. Elle est calculée : un nom de devise change avec la langue qui
 * l'affiche — « dollar des États-Unis », « US Dollar », « 米ドル » — soit 46 × 34
 * combinaisons impossibles à tenir à la main. Un ENDONYME, au contraire, est le nom
 * que la langue se donne à elle-même : « 日本語 » s'écrit ainsi quelle que soit la
 * langue de l'interface. Une seule chaîne par langue suffit, et 34 lignes stables
 * coûtent moins cher à maintenir qu'un appel dérivé dont il faudrait vérifier la
 * casse dans chaque locale — `Intl` rend « polski » là où la référence écrit
 * « język polski ».
 *
 * ── `ready` ───────────────────────────────────────────────────────────────────
 *
 * Distingue « traduite » de « seulement enregistrable ». Sans ce drapeau, la liste
 * serait un catalogue de promesses : afficher 34 langues quand deux existent ferait
 * promettre une traduction qui n'arrive pas. Chaque langue non traduite porte donc
 * une mention, et cette mention disparaît d'elle-même le jour où le fichier de
 * messages correspondant est ajouté — elle est conditionnée au drapeau, pas écrite
 * en dur dans la vue.
 */

export interface LanguageEntry {
  /** Étiquette BCP 47 — « pt-BR », « zh-TW ». C'est aussi le préfixe d'URL. */
  code: string
  /** Endonyme : le nom que la langue se donne à elle-même. */
  label: string
  /** Un fichier de messages existe-t-il réellement pour cette langue ? */
  ready: boolean
  /** Mise en avant dans le premier groupe du sélecteur. */
  popular: boolean
}

/**
 * Langues dont la traduction existe.
 *
 * SOURCE UNIQUE DE VÉRITÉ, relue par le routage (`i18n/routing.ts`) et par le
 * sélecteur. Ajouter `messages/es.json` sans ajouter « es » ici laisserait la
 * traduction inatteignable ; l'inverse produirait une page vide. Le lien est
 * volontairement explicite plutôt que déduit d'une lecture du dossier, que le
 * bundle client ne peut pas faire.
 */
export const TRANSLATED_LOCALES = [
  'fr',
  'en',
  'es',
  'de',
  'it',
  'nl',
  'pl',
  'pt-BR',
  'ru',
  'tr',
  'vi',
  'ja',
  'zh',
] as const

export type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number]

/** Langue servie quand aucune préférence n'est exprimée, et seule sans préfixe d'URL. */
export const DEFAULT_LOCALE: TranslatedLocale = 'fr'

function entry(code: string, label: string, popular: boolean): LanguageEntry {
  return {
    code,
    label,
    popular,
    ready: (TRANSLATED_LOCALES as readonly string[]).includes(code),
  }
}

/** Les huit langues mises en avant, dans l'ordre de la référence — trafic décroissant, non alphabétique. */
const POPULAR: ReadonlyArray<readonly [string, string]> = [
  ['en', 'English'],
  ['ru', 'Русский'],
  ['de', 'Deutsch'],
  ['pl', 'język polski'],
  ['es', 'Español'],
  ['vi', 'Tiếng việt'],
  ['fr', 'Français'],
  ['pt-BR', 'Português'],
]

/** Les vingt-six autres, par code — c'est ainsi qu'on parcourt une liste longue. */
const REST: ReadonlyArray<readonly [string, string]> = [
  ['ar', 'العربية'],
  ['bg', 'български'],
  ['cs', 'čeština'],
  ['da', 'dansk'],
  ['el', 'Ελληνικά'],
  ['fi', 'suomen kieli'],
  ['he', 'עברית'],
  ['hi', 'हिंदी'],
  ['hr', 'hrvatski'],
  ['hu', 'Magyar nyelv'],
  ['id', 'Bahasa Indonesia'],
  ['it', 'Italiano'],
  ['ja', '日本語'],
  ['ko', '한국어'],
  ['lt', 'lietuvių kalba'],
  ['nl', 'Nederlands'],
  ['no', 'norsk'],
  ['ro', 'Limba română'],
  ['sk', 'slovenský jazyk'],
  ['sl', 'slovenski jezik'],
  ['sv', 'Svenska'],
  ['th', 'ภาษาไทย'],
  ['tr', 'Türkçe'],
  ['uk', 'українська мова'],
  ['zh', '简体中文'],
  ['zh-TW', '繁體中文'],
]

export const LANGUAGES: readonly LanguageEntry[] = [
  ...POPULAR.map(([code, label]) => entry(code, label, true)),
  ...REST.map(([code, label]) => entry(code, label, false)),
]

/** Toutes les étiquettes déclarées — y compris celles qui ne sont pas encore traduites. */
export const LOCALE_CODES: readonly string[] = LANGUAGES.map((language) => language.code)

const BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language]))

export function getLanguage(code: string): LanguageEntry | undefined {
  return BY_CODE.get(code)
}

/**
 * Langues écrites de droite à gauche.
 *
 * Détermine l'attribut `dir` du document. Ce n'est pas un raffinement : sans lui,
 * l'arabe et l'hébreu s'affichent avec la ponctuation et les nombres du mauvais
 * côté, et toute la mise en page reste alignée à gauche. Les deux langues sont
 * déclarées avant d'être traduites pour que le jour où leurs messages arrivent, le
 * sens de lecture soit déjà juste.
 */
const RTL = new Set(['ar', 'he'])

export function isRtl(code: string): boolean {
  return RTL.has(code.split('-')[0] ?? '')
}
