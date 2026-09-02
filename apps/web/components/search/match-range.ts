/**
 * ══════════════════════════════════════════════════════════════════════════════
 * OÙ LE TERME CHERCHÉ TOMBE DANS UN TEXTE — ET SEULEMENT ÇA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Ce module ne rend rien. Il répond à une question de pure arithmétique : « entre
 * quels index du texte D'ORIGINE se trouve ce que l'utilisateur a tapé ? »
 *
 * ── POURQUOI IL EST SÉPARÉ DU COMPOSANT QUI SURLIGNE ───────────────────────
 *
 * Parce que c'est la partie qui peut être FAUSSE sans que cela se voie, et que le
 * projet teste en logique pure — quarante-deux fichiers de test, pas un seul rendu de
 * composant. Séparer la mesure du dessin met le calcul risqué sous test sans introduire
 * jsdom ni bibliothèque de rendu.
 *
 * ── LA COMPARAISON IGNORE LA CASSE ET LES ACCENTS ──────────────────────────
 *
 * `normalize('NFD')` décompose « é » en « e » + accent combinant, que `\p{M}` retire.
 * Taper « matieres » trouve donc « matières » — le cas NORMAL pour un site français,
 * dont les visiteurs tapent le plus souvent sans accents.
 *
 * ⚠️ ET C'EST LÀ QU'EST LE PIÈGE. La décomposition produit parfois PLUS de caractères
 * que la source : « é » devient deux unités. Chercher dans le texte normalisé puis
 * découper l'original aux index trouvés décale donc le surlignage d'autant de
 * caractères qu'il y a d'accents avant lui.
 *
 * D'où le tableau `origine` : à chaque caractère du texte plié, il associe la position
 * du caractère d'ORIGINE dont il provient. La recherche se fait sur le plié, la coupe
 * sur l'original, et les accents cessent de compter.
 */

/** Le texte réduit à sa forme comparable, et la position d'origine de chaque caractère. */
function plier(texte: string): { plie: string; origine: number[] } {
  let plie = ''
  const origine: number[] = []

  for (let i = 0; i < texte.length; i += 1) {
    const sansAccent = texte[i]!.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    for (const c of sansAccent) {
      plie += c
      origine.push(i)
    }
  }

  return { plie, origine }
}

/**
 * Les bornes de la correspondance dans le texte d'origine, ou `null` s'il n'y en a pas.
 *
 * Les index rendus s'emploient tels quels avec `slice` : `[début, fin[`.
 */
export function matchRange(text: string, query: string): [number, number] | null {
  const terme = query.trim()
  if (terme === '') return null

  const { plie, origine } = plier(text)
  const { plie: cherche } = plier(terme)
  // Une requête qui ne contient QUE des accents combinants se replie sur du vide, et
  // `indexOf('')` rendrait 0 — donc un surlignage de longueur nulle au début du texte.
  if (cherche === '') return null

  const debut = plie.indexOf(cherche)
  if (debut === -1) return null

  const de = origine[debut] as number
  /* La fin est la position du caractère qui SUIT la correspondance. Quand celle-ci
     touche la fin du texte, il n'y a pas de suivant : la longueur totale fait office
     de borne. */
  const suivant = origine[debut + cherche.length]
  return [de, suivant === undefined ? text.length : suivant]
}
