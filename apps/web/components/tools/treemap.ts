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
