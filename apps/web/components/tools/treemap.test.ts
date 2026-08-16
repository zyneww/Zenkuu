import { describe, expect, it } from 'vitest'

import { HEATMAP_CLAMP, heatTone, squarify } from './treemap'

/**
 * Le pavage est désormais partagé par deux cartes thermiques, et il est purement
 * géométrique : c'est exactement le genre de code qu'on ne relit jamais et dont une
 * régression ne se voit qu'à l'œil, sur une figure, longtemps après.
 *
 * Les propriétés vérifiées ici sont celles dont dépend la LISIBILITÉ de la figure,
 * pas l'implémentation : la surface proportionnelle à la valeur, l'absence de
 * débordement, et le fait qu'une valeur plus grande occupe une surface plus grande.
 */
describe('squarify', () => {
  const sample = [
    { id: 'a', value: 100 },
    { id: 'b', value: 50 },
    { id: 'c', value: 25 },
    { id: 'd', value: 25 },
  ]

  it('rend une boîte par élément, dans l’ordre reçu', () => {
    const boxes = squarify(sample)
    expect(boxes.map((box) => box.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('garde toutes les boîtes dans le conteneur', () => {
    for (const box of squarify(sample)) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(100.01)
      expect(box.y + box.height).toBeLessThanOrEqual(100.01)
    }
  })

  it('donne à chaque boîte une surface proportionnelle à sa valeur', () => {
    const boxes = squarify(sample)
    const total = sample.reduce((sum, item) => sum + item.value, 0)

    for (const item of sample) {
      const box = boxes.find((candidate) => candidate.id === item.id)
      expect(box).toBeDefined()
      const area = (box as (typeof boxes)[number]).width * (box as (typeof boxes)[number]).height
      // 10 000 = 100 % × 100 %, la surface du conteneur.
      expect(area).toBeCloseTo((item.value / total) * 10_000, 1)
    }
  })

  it('rend une liste vide quand la somme est nulle', () => {
    expect(squarify([{ id: 'a', value: 0 }])).toEqual([])
    expect(squarify([])).toEqual([])
  })

  it('supporte un élément unique, qui occupe tout', () => {
    const [box] = squarify([{ id: 'seul', value: 42 }])
    expect(box?.width).toBeCloseTo(100, 1)
    expect(box?.height).toBeCloseTo(100, 1)
  })
})

describe('heatTone', () => {
  it('distingue une absence de variation d’une variation nulle', () => {
    // Une donnée absente prend la teinte neutre ; zéro reste sur l'échelle verte,
    // puisque `0 >= 0`. Confondre les deux ferait passer une lacune pour une stabilité.
    expect(heatTone(undefined)).toContain('surface-muted')
    expect(heatTone(0)).toContain('color-up')
  })

  it('sature au-delà du plafond, dans les deux sens', () => {
    expect(heatTone(HEATMAP_CLAMP)).toBe(heatTone(HEATMAP_CLAMP * 30))
    expect(heatTone(-HEATMAP_CLAMP)).toBe(heatTone(-HEATMAP_CLAMP * 30))
  })

  it('sépare hausse et baisse', () => {
    expect(heatTone(5)).toContain('color-up')
    expect(heatTone(-5)).toContain('color-down')
  })
})
