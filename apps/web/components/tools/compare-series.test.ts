import { describe, expect, test } from 'vitest'

import { alignSeries, offsetLabel, offsetTick, windowLabel } from './compare-series'

/**
 * L'alignement est le genre de code qui paraît trivial et se trompe d'une unité aux
 * bornes. Les cas ci-dessous sont ceux qui produisaient un graphique FAUX plutôt qu'un
 * graphique cassé — c'est-à-dire ceux qu'on ne voit pas en regardant l'écran.
 */
describe('alignement de séries', () => {
  test('une série seule repart de 100 et garde sa forme', () => {
    const result = alignSeries([{ id: 'a', values: [50, 100], spanDays: 7 }])

    expect(result).not.toBeNull()
    expect(result?.windowDays).toBe(7)
    expect(result?.series[0]?.points[0]?.y).toBe(100)
    // Le dernier point vaut le double du premier : +100 %, donc 200 en base 100.
    expect(result?.series[0]?.points.at(-1)?.y).toBe(200)
  })

  test('l’axe compte les jours AVANT maintenant, le dernier point valant zéro', () => {
    const points = alignSeries([{ id: 'a', values: [1, 2], spanDays: 7 }])?.series[0]?.points ?? []

    expect(points[0]?.x).toBe(-7)
    expect(points.at(-1)?.x).toBe(0)
  })

  test('la fenêtre commune est la PLUS COURTE des durées', () => {
    const result = alignSeries([
      { id: 'crypto', values: [1, 2, 3, 4], spanDays: 7 },
      { id: 'action', values: [10, 20, 30], spanDays: 42 },
    ])

    expect(result?.windowDays).toBe(7)
    // Toutes les séries couvrent exactement la même plage horizontale.
    const [first, second] = result?.series ?? []
    expect(first?.points[0]?.x).toBe(-7)
    expect(second?.points[0]?.x).toBe(-7)
    expect(first?.points.at(-1)?.x).toBe(second?.points.at(-1)?.x)
  })

  test('les deux séries partent de 100, quelle que soit leur durée propre', () => {
    const result = alignSeries([
      { id: 'a', values: [1, 2, 3, 4], spanDays: 7 },
      { id: 'b', values: [10, 20, 30], spanDays: 42 },
    ])

    for (const entry of result?.series ?? []) {
      expect(entry.points[0]?.y).toBe(100)
    }
  })

  /**
   * LE CAS QUI MOTIVE TOUT LE MODULE.
   *
   * Une action dont le cours n'a pas bougé depuis six semaines, sauf sur son dernier
   * mois. Alignée par rang avec une crypto, sa hausse ancienne serait lue comme
   * survenue pendant la semaine observée. Fenêtrée, elle est plate — ce qu'elle est
   * réellement sur cette semaine-là.
   */
  test('une hausse ANTÉRIEURE à la fenêtre n’y apparaît pas', () => {
    const result = alignSeries([
      { id: 'crypto', values: [100, 110], spanDays: 7 },
      // 8 points sur 28 jours : un point tous les 4 jours. Le bond a lieu entre les
      // rangs 1 et 2, soit il y a plus de vingt jours — hors de la fenêtre de 7.
      { id: 'action', values: [10, 10, 50, 50, 50, 50, 50, 50], spanDays: 28 },
    ])

    const action = result?.series.find((entry) => entry.id === 'action')
    expect(action).toBeDefined()
    // Plate sur toute la fenêtre : aucun point ne s'écarte de 100.
    for (const point of action?.points ?? []) {
      expect(point.y).toBe(100)
    }
  })

  test('une valeur se lit à la dernière date CONNUE, jamais à la suivante', () => {
    /*
     * Deux clôtures espacées de 10 jours, fenêtre de 10 jours : le premier instant de
     * la grille tombe sur la première clôture, et tout ce qui précède la seconde doit
     * porter la PREMIÈRE valeur. Prendre la plus proche daterait la seconde clôture
     * d'avant sa publication.
     */
    const points = alignSeries([{ id: 'a', values: [100, 200], spanDays: 10 }])?.series[0]?.points ?? []

    // Le point du milieu appartient encore au premier palier.
    expect(points[Math.floor(points.length / 2)]?.y).toBe(100)
    expect(points.at(-1)?.y).toBe(200)
  })

  test('écarte ce qui ne peut pas être tracé sans inventer', () => {
    // Un seul relevé : aucune trajectoire. Une durée nulle : aucun axe.
    expect(alignSeries([{ id: 'a', values: [42], spanDays: 7 }])).toBeNull()
    expect(alignSeries([{ id: 'a', values: [1, 2], spanDays: 0 }])).toBeNull()
    expect(alignSeries([])).toBeNull()

    // Base nulle : la mise en base 100 diviserait par zéro. La série disparaît, les
    // autres restent.
    const mixed = alignSeries([
      { id: 'zero', values: [0, 0, 5], spanDays: 7 },
      { id: 'bonne', values: [1, 2], spanDays: 7 },
    ])
    expect(mixed?.series.map((entry) => entry.id)).toEqual(['bonne'])
  })
})

describe('libellés de l’axe', () => {
  test('la fenêtre change d’unité plutôt que d’aligner des dizaines de jours', () => {
    expect(windowLabel(1)).toBe('24 heures')
    expect(windowLabel(7)).toBe('7 jours')
    expect(windowLabel(12)).toBe('12 jours')
    expect(windowLabel(28)).toBe('4 semaines')
    expect(windowLabel(90)).toBe('3 mois')
  })

  test('la graduation est RELATIVE, jamais une date inventée', () => {
    expect(offsetTick(0)).toBe('auj.')
    expect(offsetTick(-6.4)).toBe('J-6')
    expect(offsetTick(-30)).toBe('J-30')
  })

  test('l’infobulle descend à l’heure quand la fenêtre est courte', () => {
    expect(offsetLabel(0)).toBe('dernier relevé')
    expect(offsetLabel(-0.5)).toBe('il y a 12 h')
    expect(offsetLabel(-3)).toBe('il y a 3 j')
    expect(offsetLabel(-3.25)).toBe('il y a 3 j 6 h')
  })
})
