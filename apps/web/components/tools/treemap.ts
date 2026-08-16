/**
 * Pavage squarifié — l'algorithme, sans le dessin.
 *
 * ── POURQUOI IL EST SORTI DE `SectorHeatmap` ──────────────────────────────────
 *
 * Il y vivait, et il n'y avait qu'un appelant. Il en a désormais deux : la carte des
 * secteurs et celle des pièces, qui partagent la géométrie et rien d'autre — pas les
 * mêmes tuiles, pas les mêmes liens, pas la même légende. Une fonction pure de
 * `{ id, valeur }[]` vers `{ x, y, largeur, hauteur }[]` est exactement la frontière
 * entre les deux, et c'est aussi ce qui la rend testable sans monter un rendu.
 *
 * ── CE QUE « SQUARIFIÉ » VEUT DIRE ────────────────────────────────────────────
 *
 * L'algorithme de Bruls, Huizing et van Wijk empile les éléments dans une bande tant
 * que cela AMÉLIORE le pire rapport d'aspect de la bande, puis ferme la bande et
 * repart sur l'espace restant. C'est ce qui évite les rectangles filiformes d'un
 * découpage naïf — et un rectangle filiforme est un rectangle dont on ne peut pas lire
 * l'étiquette, donc une case perdue.
 *
 * Les coordonnées sont en POURCENTAGES du conteneur. C'est ce qui rend la figure
 * réactive sans une ligne de JavaScript : le navigateur redimensionne des `div`
 * positionnées en pourcentage, personne n'a rien à recalculer.
 */

export interface TreemapInput {
  id: string
  value: number
}

export interface TreemapBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export function squarify(items: TreemapInput[]): TreemapBox[] {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total <= 0) return []

  const boxes: TreemapBox[] = []
  // Espace restant, en pourcentages.
  let x = 0
  let y = 0
  let width = 100
  let height = 100

  let remaining = [...items]
  let remainingValue = total

  /** Pire rapport d'aspect d'une bande, la mesure que l'algorithme minimise. */
  function worst(row: number[], side: number, scale: number): number {
    if (row.length === 0 || side === 0) return Infinity
    const sum = row.reduce((acc, value) => acc + value, 0)
    const area = sum * scale
    if (area === 0) return Infinity
    const max = Math.max(...row)
    const min = Math.min(...row)
    return Math.max(
      (side * side * max * scale) / (area * area),
      (area * area) / (side * side * min * scale),
    )
  }

  while (remaining.length > 0) {
    const horizontal = width >= height
    const side = horizontal ? height : width
    // Surface d'une unité de valeur dans l'espace restant.
    const scale = (width * height) / remainingValue

    const row: TreemapInput[] = []
    let rowValues: number[] = []

    while (remaining.length > 0) {
      const candidate = remaining[0] as TreemapInput
      const next = [...rowValues, candidate.value]
      if (row.length > 0 && worst(next, side, scale) > worst(rowValues, side, scale)) break
      row.push(candidate)
      rowValues = next
      remaining = remaining.slice(1)
    }

    const rowValue = rowValues.reduce((sum, value) => sum + value, 0)
    // Épaisseur de la bande : sa surface divisée par sa longueur.
    const thickness = (rowValue * scale) / side

    let offset = 0
    for (const item of row) {
      const share = rowValue > 0 ? item.value / rowValue : 0
      const length = share * side

      boxes.push({
        id: item.id,
        x: horizontal ? x : x + offset,
        y: horizontal ? y + offset : y,
        width: horizontal ? thickness : length,
        height: horizontal ? length : thickness,
      })

      offset += length
    }

    if (horizontal) {
      x += thickness
      width -= thickness
    } else {
      y += thickness
      height -= thickness
    }

    remainingValue -= rowValue
    // Garde-fou : sans elle, une valeur résiduelle nulle ferait diverger `scale`.
    if (remainingValue <= 0 || width <= 0.01 || height <= 0.01) break
  }

  return boxes
}

/**
 * Pavage EN DEUX ÉTAGES — les groupes d'abord, leurs tuiles ensuite.
 *
 * ── CE QUE LE PAVAGE PLAT NE PEUT PAS MONTRER ────────────────────────────────
 *
 * `squarify` range cent actifs par taille décroissante, et rien d'autre. On y voit
 * qui pèse lourd ; on n'y voit pas que les six premières tuiles sont toutes des
 * émetteurs de stablecoins. L'information de STRUCTURE — quelle famille domine — est
 * présente dans les données et absente de la figure.
 *
 * Token Terminal résout cela en pavant deux fois : une fois pour placer les secteurs,
 * une fois à l'intérieur de chacun pour placer ses actifs. C'est ce que fait cette
 * fonction, et c'est la seule différence structurelle entre les deux cartes.
 *
 * ── LES COORDONNÉES INTÉRIEURES SONT RAMENÉES AU CONTENEUR ───────────────────
 *
 * `squarify` rend des pourcentages de SON espace, c'est-à-dire de 0 à 100 dans les
 * deux axes. Les tuiles d'un groupe sont donc remises à l'échelle de la boîte de ce
 * groupe, faute de quoi chaque groupe repeindrait la figure entière par-dessus les
 * autres.
 *
 * La bande de titre est retranchée AVANT cette mise à l'échelle : sans quoi la
 * première rangée de tuiles passerait sous le nom du secteur, qui deviendrait
 * illisible sur les groupes denses.
 */
export interface TreemapGroupInput {
  id: string
  label: string
  items: TreemapInput[]
}

export interface TreemapGroupBox extends TreemapBox {
  label: string
  /** Tuiles du groupe, déjà ramenées aux coordonnées de la figure entière. */
  children: TreemapBox[]
}

/** Hauteur de la bande de titre d'un groupe, en pourcentage de la figure. */
const GROUP_HEADER = 3.2

export function squarifyGrouped(groups: TreemapGroupInput[]): TreemapGroupBox[] {
  const usable = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.value > 0),
    }))
    .filter((group) => group.items.length > 0)

  const outer = squarify(
    usable.map((group) => ({
      id: group.id,
      value: group.items.reduce((sum, item) => sum + item.value, 0),
    })),
  )

  const byId = new Map(usable.map((group) => [group.id, group]))

  return outer.flatMap((box) => {
    const group = byId.get(box.id)
    if (!group) return []

    /* Un groupe trop bas pour porter sa bande de titre garde tout de même ses tuiles :
       mieux vaut un groupe sans titre visible qu'un groupe vide. La bande est alors
       ramenée à ce que la hauteur permet. */
    const header = Math.min(GROUP_HEADER, box.height * 0.4)
    const innerHeight = box.height - header

    const children = squarify(group.items).map((child) => ({
      id: child.id,
      x: box.x + (child.x / 100) * box.width,
      y: box.y + header + (child.y / 100) * innerHeight,
      width: (child.width / 100) * box.width,
      height: (child.height / 100) * innerHeight,
    }))

    return [{ ...box, label: group.label, children }]
  })
}

/** Au-delà de ce seuil, l'intensité de couleur sature. */
export const HEATMAP_CLAMP = 10

/**
 * Teinte d'une tuile selon sa variation.
 *
 * `color-mix` plutôt qu'une échelle de teintes codée en dur : les deux couleurs
 * sémantiques suivent alors la bascule de thème sans une ligne de JavaScript.
 *
 * L'intensité est plafonnée à ±10 % : sans plafond, une tuile minuscule à +300 %
 * écraserait l'échelle et rendrait tout le reste uniformément pâle.
 */
export function heatTone(change: number | undefined): string {
  if (change === undefined) return 'var(--color-surface-muted)'

  const intensity = Math.min(Math.abs(change), HEATMAP_CLAMP) / HEATMAP_CLAMP
  const base = change >= 0 ? 'var(--color-up)' : 'var(--color-down)'
  const weight = Math.round(16 + intensity * 60)
  return `color-mix(in srgb, ${base} ${weight}%, var(--color-surface))`
}

/**
 * Palette CATÉGORIELLE — une teinte par groupe, la surface portant seule la valeur.
 *
 * ── CE QUE CE MODE CHANGE, ET POURQUOI IL EXISTE ─────────────────────────────
 *
 * En coloration par variation, toute la figure est rouge ou verte : on lit le
 * mouvement du jour et rien d'autre. En coloration catégorielle, la couleur cesse de
 * porter une grandeur et se contente d'IDENTIFIER — elle regroupe l'œil par famille,
 * et la surface reste seule à dire les montants.
 *
 * C'est le mode par défaut de Token Terminal, et il répond à une question distincte :
 * non pas « qu'est-ce qui monte » mais « de quoi ce marché est-il fait ». Les deux
 * cohabitent donc plutôt que l'un ne remplace l'autre.
 *
 * ── LES TEINTES VIENNENT DES SIX COULEURS DE SÉRIES ──────────────────────────
 *
 * `--color-data-1` à `--color-data-6`, celles des graphiques, ordonnées par distance
 * perceptuelle. Inventer une septième palette pour cette figure aurait fait diverger
 * les couleurs d'un même secteur entre une carte et une courbe — or c'est précisément
 * la constance qui rend une couleur identifiante.
 *
 * L'index vient de la POSITION du groupe et non d'un hachage de son nom : un hachage
 * est stable mais imprévisible, et rien n'empêche deux voisins de tomber sur la même
 * teinte. La position garantit que six groupes consécutifs sont six couleurs
 * distinctes, ce qui est exactement le cas gênant.
 */
const CATEGORY_TONES = [
  'var(--color-data-1)',
  'var(--color-data-2)',
  'var(--color-data-3)',
  'var(--color-data-4)',
  'var(--color-data-5)',
  'var(--color-data-6)',
] as const

export function categoryTone(index: number, kind: 'group' | 'tile'): string {
  const base = CATEGORY_TONES[index % CATEGORY_TONES.length]

  /*
   * DEUX OPACITÉS, RELEVÉES SUR LA RÉFÉRENCE : 20 % pour le cadre du groupe, 10 % pour
   * la tuile. L'écart est faible et il est essentiel — c'est lui qui fait lire les
   * tuiles COMME POSÉES DANS leur groupe plutôt qu'à côté de lui. Une tuile plus
   * sombre que son cadre inverserait la profondeur, et une tuile de même valeur les
   * ferait fondre l'une dans l'autre.
   */
  const weight = kind === 'group' ? 20 : 10
  return `color-mix(in srgb, ${base} ${weight}%, var(--color-surface))`
}

/** Bordure d'une tuile catégorielle — la même teinte, à peine plus soutenue. */
export function categoryEdge(index: number): string {
  const base = CATEGORY_TONES[index % CATEGORY_TONES.length]
  return `color-mix(in srgb, ${base} 35%, transparent)`
}
