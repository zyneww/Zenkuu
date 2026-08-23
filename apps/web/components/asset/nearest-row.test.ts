import { describe, expect, it } from 'vitest'

import { nearestRow } from './chart-kinds'

/**
 * `nearestRow` fait le lien entre l'instant qu'amCharts remonte au survol et la ligne
 * de NOTRE table — voir sa note. La dichotomie n'est pas relisible à l'œil, et ses cas
 * limites (avant le premier point, après le dernier, à mi-chemin exact) ne se
 * reproduisent pas à la main dans un navigateur.
 */
describe('nearestRow', () => {
  const rows = [{ t: 0 }, { t: 100 }, { t: 200 }, { t: 300 }]

  it('trouve une correspondance exacte', () => {
    expect(nearestRow(rows, 0)).toBe(0)
    expect(nearestRow(rows, 200)).toBe(2)
    expect(nearestRow(rows, 300)).toBe(3)
  })

  it('retient le voisin le plus proche, pas celui de gauche', () => {
    expect(nearestRow(rows, 120)).toBe(1)
    expect(nearestRow(rows, 180)).toBe(2)
  })

  it('garde le relevé précédent à mi-chemin exact', () => {
    // À égalité, c'est la valeur EN VIGUEUR à cet instant qui l'emporte : le point
    // suivant n'a pas encore été relevé. Voir la note de la fonction.
    expect(nearestRow(rows, 150)).toBe(1)
    expect(nearestRow(rows, 250)).toBe(2)
  })

  it('borne aux extrémités', () => {
    expect(nearestRow(rows, -1000)).toBe(0)
    expect(nearestRow(rows, 10_000)).toBe(3)
  })

  it('survit à une table d’un seul point', () => {
    expect(nearestRow([{ t: 42 }], 0)).toBe(0)
  })
})
