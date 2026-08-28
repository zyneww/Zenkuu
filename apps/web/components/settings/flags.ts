/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DRAPEAUX — DEUX FONCTIONS, ET ELLES N'ONT PAS LE MÊME DEGRÉ DE VÉRITÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un drapeau à côté d'un code aide à le reconnaître avant de le lire : dans une liste
 * de quarante devises, la bannière tricolore se trouve plus vite que les trois lettres
 * « EUR ». C'est le seul service que ces fonctions rendent, et c'est pour cela
 * qu'elles renvoient `null` plutôt qu'un pictogramme approximatif — un mauvais
 * drapeau est pire qu'aucun drapeau, il désigne le mauvais endroit.
 *
 * ── LA DEVISE : UNE DÉRIVATION, PAS UNE TABLE ───────────────────────────────
 *
 * Les codes ISO 4217 sont bâtis sur les codes pays ISO 3166 : les deux premières
 * lettres de `USD` sont `US`, celles de `JPY` sont `JP`. La conversion est donc
 * mécanique — chaque lettre devient son INDICATEUR RÉGIONAL Unicode, et le couple se
 * rend comme un drapeau. Aucune table de quarante lignes à maintenir.
 *
 * Les EXCEPTIONS sont ce qui compte, et elles sont de deux natures. L'euro est
 * supranational (`EU` n'est pas un pays, mais Unicode lui donne sa bannière). Les
 * métaux, les droits de tirage et les unités crypto commencent par `X` : `XAU` ne
 * donnerait pas un drapeau mais deux lettres accolées, `🇽🇦`, qui s'affichent comme
 * un rectangle vide. Ils sont donc écartés explicitement.
 *
 * ── LA LANGUE : UNE TABLE, ET ELLE EST DISCUTABLE ───────────────────────────
 *
 * ⚠️ UNE LANGUE N'EST PAS UN PAYS, et associer les deux est faux au sens strict :
 * l'anglais n'appartient pas au Royaume-Uni, le portugais est parlé par bien plus de
 * Brésiliens que de Portugais, l'espagnol n'est pas espagnol. Le raccourci est
 * néanmoins la convention de toutes les interfaces qui listent des langues, et il
 * remplit sa fonction — repérer sa ligne d'un coup d'œil.
 *
 * La table est donc ÉCRITE plutôt que dérivée, et chaque choix y est un choix :
 * `pt-BR` porte le drapeau brésilien parce que c'est cette variante que nous servons,
 * `en` porte le drapeau britannique parce que la locale de repli du site est
 * l'anglais britannique. Une langue absente de la table n'a pas de drapeau, et sa
 * ligne se rend avec son seul code — ce qui reste lisible.
 */

/** Les deux lettres de tête, converties en indicateurs régionaux Unicode. */
function regionalIndicator(pair: string): string {
  return [...pair.toUpperCase()]
    .map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join('')
}

/**
 * Codes qui ne désignent AUCUN pays, et qui ne doivent donc pas être dérivés.
 *
 * `X…` couvre les métaux précieux (XAU, XAG), les droits de tirage spéciaux (XDR) et
 * les unités crypto que le site propose (XBT). La règle est la préfixe, pas la liste :
 * ISO 4217 réserve tout l'espace `X` aux codes non nationaux.
 */
const EURO = '🇪🇺'

export function currencyFlag(code: string): string | null {
  const upper = code.toUpperCase()
  if (upper === 'EUR') return EURO
  if (upper.startsWith('X')) return null
  if (!/^[A-Z]{3}$/.test(upper)) return null
  return regionalIndicator(upper.slice(0, 2))
}

/** Voir l'avertissement en tête de fichier : ces couples sont des conventions. */
const LANGUAGE_FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  it: '🇮🇹',
  nl: '🇳🇱',
  pl: '🇵🇱',
  'pt-BR': '🇧🇷',
  pt: '🇵🇹',
  ru: '🇷🇺',
  tr: '🇹🇷',
  vi: '🇻🇳',
  zh: '🇨🇳',
  ja: '🇯🇵',
}

export function languageFlag(code: string): string | null {
  return LANGUAGE_FLAGS[code] ?? LANGUAGE_FLAGS[code.split('-')[0] as string] ?? null
}
