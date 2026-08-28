import { describe, expect, it } from 'vitest'

import { globePath, orthographic, project, type CountryFeature } from './geo'

/**
 * La projection orthographique du globe.
 *
 * Elle a trois propriétés dont tout le rendu dépend, et aucune ne se voit dans le
 * code : le point regardé tombe au centre, le point diamétralement opposé est
 * déclaré caché, et un point caché est rabattu SUR le cercle d'horizon — pas jeté,
 * ce qui refermerait les polygones par une corde à travers la sphère.
 */
describe('orthographic', () => {
  const rotation = { lon: 0, lat: 0 }

  it('pose au centre le point exactement regardé', () => {
    const point = orthographic(0, 0, rotation, 100, 200, 200)

    expect(point.visible).toBe(true)
    expect(point.x).toBeCloseTo(200)
    expect(point.y).toBeCloseTo(200)
  })

  it('pose sur le bord un point à 90° du regard', () => {
    const point = orthographic(90, 0, rotation, 100, 200, 200)

    expect(point.visible).toBe(true)
    expect(point.x).toBeCloseTo(300)
    expect(point.y).toBeCloseTo(200)
  })

  it('déclare caché le point diamétralement opposé', () => {
    expect(orthographic(180, 0, rotation, 100, 200, 200).visible).toBe(false)
  })

  it('rabat un point caché SUR le cercle d’horizon, sans le jeter', () => {
    const point = orthographic(150, 0, rotation, 100, 200, 200)

    expect(point.visible).toBe(false)
    /* Rabattu veut dire : à exactement un rayon du centre. */
    expect(Math.hypot(point.x - 200, point.y - 200)).toBeCloseTo(100)
  })

  it('suit la rotation : le méridien regardé revient au centre', () => {
    const point = orthographic(120, 0, { lon: 120, lat: 0 }, 100, 200, 200)

    expect(point.visible).toBe(true)
    expect(point.x).toBeCloseTo(200)
  })

  it('monte vers le nord quand la latitude augmente', () => {
    const nord = orthographic(0, 45, rotation, 100, 200, 200)

    /* L'axe des ordonnées d'un SVG descend : « plus au nord » veut dire « y plus
       petit ». C'est le signe qu'un moins mal placé inverserait sans rien casser
       d'autre. */
    expect(nord.y).toBeLessThan(200)
  })
})

describe('globePath', () => {
  /** Un carré autour de l'origine, sur la face visible depuis (0, 0). */
  const devant: CountryFeature = {
    iso: 'AAA',
    name: 'Devant',
    rings: [
      [
        [-10, -10],
        [10, -10],
        [10, 10],
        [-10, 10],
      ],
    ],
  }

  /** Le même carré, à l'exact opposé du globe. */
  const derriere: CountryFeature = {
    iso: 'BBB',
    name: 'Derrière',
    rings: [
      [
        [170, -10],
        [-170, -10],
        [-170, 10],
        [170, 10],
      ],
    ],
  }

  const rotation = { lon: 0, lat: 0 }

  it('dessine un pays de la face visible', () => {
    const d = globePath(devant, rotation, 100, 200, 200)

    expect(d).not.toBeNull()
    expect(d).toMatch(/^M[\d.,-]+L/)
    expect(d?.endsWith('Z')).toBe(true)
  })

  it('ne dessine RIEN pour un pays entièrement derrière', () => {
    /* Sans ce rejet, la moitié cachée du monde s'écraserait sur le cercle d'horizon
       en un liseré de couleurs qui n'appartient à aucun pays. */
    expect(globePath(derriere, rotation, 100, 200, 200)).toBeNull()
  })

  it('ignore les anneaux de moins de trois points', () => {
    const degenere: CountryFeature = {
      iso: 'CCC',
      name: 'Dégénéré',
      rings: [[[0, 0], [1, 1]]],
    }

    expect(globePath(degenere, rotation, 100, 200, 200)).toBeNull()
  })
})

describe('project', () => {
  it('garde la projection équirectangulaire de la carte plate intacte', () => {
    /* Le globe est venu s'ajouter à côté d'elle : cette assertion existe pour que le
       jour où l'une des deux bouge, on sache laquelle. */
    expect(project(0, 0, 1000, 500)).toEqual([500, 250])
    expect(project(-180, 90, 1000, 500)).toEqual([0, 0])
    expect(project(180, -90, 1000, 500)).toEqual([1000, 500])
  })
})
