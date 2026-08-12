/**
 * « Ce texte parle-t-il de cet actif ? »
 *
 * ── POURQUOI C'EST UNE RECHERCHE ET NON UN CLASSEMENT ─────────────────────────
 *
 * Le §5 interdit de déduire une donnée qu'une source n'a pas publiée, et les
 * commentaires de `NewsItem` sont explicites : la rubrique et la langue d'un article
 * viennent du FLUX, jamais d'une analyse du titre, parce que classer un texte par
 * mots-clés produit des étiquettes fausses présentées comme sûres.
 *
 * Ce fichier ne classe rien. Il répond à une question vérifiable mot pour mot : le
 * nom de cet actif figure-t-il dans ce titre ? La nuance porte tout le poids, et
 * elle doit rester visible jusque dans l'interface — le panneau s'intitule
 * « Articles mentionnant X », pas « Actualité de X ». Un article qui cite
 * Hyperliquid en passant apparaîtra ; il n'est pas présenté comme une nouvelle
 * CONCERNANT Hyperliquid, seulement comme un texte où le mot apparaît.
 *
 * ── LE SYMBOLE EST LE PIÈGE ───────────────────────────────────────────────────
 *
 * Chercher « HYPE » sans précaution ramène tous les titres anglais contenant le mot
 * courant « hype », ce qui est massif et absurde. Le symbole n'est donc accepté
 * qu'en CAPITALES dans le texte d'origine et à partir de trois caractères : « HYPE »
 * passe, « hype » non, et les symboles de deux lettres sont écartés d'office
 * (« ID », « OP », « ON »… sont des mots dans plusieurs langues).
 *
 * Le nom, lui, est cherché sans égard à la casse mais AVEC frontières de mots :
 * sans elles, « Sui » remonterait « je suis », « ensuite », « poursuite ».
 */

/** Minuscules et diacritiques retirés, pour que « Térra » trouve « terra ». */
function fold(value: string): string {
  return (
    value
      .normalize('NFD')
      // Plage des diacritiques combinants, écrite en séquences d'échappement : les
      // caractères eux-mêmes sont invisibles dans un éditeur et se perdent au
      // premier copier-coller mal encodé.
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  )
}

/** Échappe ce qui serait interprété comme syntaxe d'expression régulière. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Frontière de mot compatible avec les noms accentués ou composés.
 *
 * `\b` de JavaScript raisonne en ASCII : dans « bitcoin·cash », il place une
 * frontière au milieu du mot, et sur un nom accentué il se comporte de façon
 * surprenante. On encadre donc explicitement par « début, fin ou caractère non
 * alphanumérique ».
 */
function wordPattern(term: string): RegExp {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(fold(term))}([^a-z0-9]|$)`)
}

export interface MentionTarget {
  name: string
  symbol?: string
}

export function mentions(text: string, target: MentionTarget): boolean {
  if (!text) return false

  // Les noms d'un ou deux caractères ne sont pas cherchables : trop de faux positifs
  // pour que le résultat veuille dire quelque chose.
  if (target.name.length >= 3 && wordPattern(target.name).test(fold(text))) return true

  const symbol = target.symbol?.trim()
  if (!symbol || symbol.length < 3) return false

  // Casse d'ORIGINE, délibérément : c'est la seule chose qui distingue le jeton HYPE
  // du mot anglais « hype ».
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(symbol.toUpperCase())}([^A-Za-z0-9]|$)`).test(
    text,
  )
}
