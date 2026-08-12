import { describe, expect, it } from 'vitest'

import {
  annualizedVolatility,
  base100,
  maxDrawdown,
  monthlyReturns,
  totalReturnPercent,
  windowRange,
  type SeriesPoint,
} from './series-stats'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

/** Série quotidienne à partir du 1er janvier 2024, un prix par jour. */
function daily(prices: number[], step = DAY): SeriesPoint[] {
  const start = Date.UTC(2024, 0, 1)
  return prices.map((price, index) => ({ timestamp: start + index * step, price }))
}

describe('maxDrawdown', () => {
  /**
   * LE test de ce fichier : la perte maximale n'est PAS l'écart entre le plus haut
   * et le plus bas de la période.
   *
   * Ici le plus bas est 80 et le plus haut 300 — une implémentation naïve annoncerait
   * une perte de 73 %. Or ce creux de 80 précède tous les sommets : aucun détenteur
   * n'a jamais pu subir cette baisse. La seule chute réellement vécue va de 100 à
   * 95, soit 5 %.
   */
  it('ne confond pas l’écart plus-haut / plus-bas avec la perte maximale', () => {
    const points = daily([80, 100, 95, 300])
    const result = maxDrawdown(points)
    expect(result?.depthPercent).toBeCloseTo(5, 6)
    expect(result?.peakAt).toBe(points[1]!.timestamp)
    expect(result?.troughAt).toBe(points[2]!.timestamp)
  })

  it('mesure la chute d’un sommet vers un creux ultérieur', () => {
    const points = daily([100, 200, 150, 180])
    const result = maxDrawdown(points)
    expect(result?.depthPercent).toBeCloseTo(25, 6)
    expect(result?.peakAt).toBe(points[1]!.timestamp)
    expect(result?.troughAt).toBe(points[2]!.timestamp)
  })

  it('retient la PLUS profonde quand il y en a plusieurs', () => {
    // −20 % puis −50 % : c'est la seconde qui doit sortir.
    const points = daily([100, 80, 120, 60, 90])
    expect(maxDrawdown(points)?.depthPercent).toBeCloseTo(50, 6)
  })

  it('rend undefined sur une série qui ne baisse jamais', () => {
    expect(maxDrawdown(daily([1, 2, 3, 4]))).toBeUndefined()
  })
})

describe('annualizedVolatility', () => {
  /**
   * Une série strictement géométrique a un écart-type de rendements NUL. Le test
   * vérifie surtout qu'on ne rend pas `NaN` : la variance échantillonnale d'une
   * constante est zéro, et une racine de zéro reste zéro.
   */
  it('rend zéro sur une croissance parfaitement régulière', () => {
    const points = daily([100, 110, 121, 133.1, 146.41])
    expect(annualizedVolatility(points)).toBeCloseTo(0, 6)
  })

  it('déduit le pas de la série et annualise en conséquence', () => {
    const prices = [100, 105, 100, 105, 100, 105, 100, 105]
    const perDay = annualizedVolatility(daily(prices))
    const perHour = annualizedVolatility(daily(prices, HOUR))

    expect(perDay).toBeDefined()
    expect(perHour).toBeDefined()
    // Vingt-quatre fois plus de périodes dans l'année ⇒ facteur √24 sur la
    // volatilité. C'est exactement l'erreur qu'un pas codé en dur produirait.
    expect(perHour! / perDay!).toBeCloseTo(Math.sqrt(24), 4)
  })

  it('rend undefined plutôt que zéro quand la série est trop courte', () => {
    expect(annualizedVolatility(daily([100, 110]))).toBeUndefined()
  })
})

describe('monthlyReturns', () => {
  it('enchaîne les clôtures d’un mois à l’autre', () => {
    const points: SeriesPoint[] = [
      { timestamp: Date.UTC(2024, 0, 15), price: 50 },
      { timestamp: Date.UTC(2024, 0, 31), price: 100 },
      { timestamp: Date.UTC(2024, 1, 10), price: 120 },
      { timestamp: Date.UTC(2024, 1, 29), price: 150 },
    ]

    const results = monthlyReturns(points)
    // Janvier n'a pas de clôture antérieure : il est omis, pas rendu à zéro.
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ year: 2024, month: 1, changePercent: 50 })
  })

  it('compose exactement le rendement total', () => {
    const points: SeriesPoint[] = [
      { timestamp: Date.UTC(2024, 0, 31), price: 100 },
      { timestamp: Date.UTC(2024, 1, 29), price: 110 },
      { timestamp: Date.UTC(2024, 2, 31), price: 88 },
    ]

    const composed = monthlyReturns(points).reduce(
      (accumulator, entry) => accumulator * (1 + entry.changePercent / 100),
      1,
    )
    expect(composed).toBeCloseTo(0.88, 10)
  })
})

describe('windowRange', () => {
  it('compte la fenêtre depuis le dernier point, pas depuis l’horloge', () => {
    // Série de dix jours qui s'arrête « il y a longtemps » : la fenêtre de 3 jours
    // doit rendre les trois derniers jours de DONNÉES, pas un vide.
    const points = daily([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    expect(windowRange(points, 3)).toEqual({ low: 70, high: 100 })
  })

  it('rend undefined quand la fenêtre est plate', () => {
    expect(windowRange(daily([42, 42, 42]), 30)).toBeUndefined()
  })
})

describe('base100', () => {
  it('ramène le premier point à 100 et conserve les rapports', () => {
    expect(base100(daily([50, 75, 25])).map((point) => point.value)).toEqual([100, 150, 50])
  })
})

describe('totalReturnPercent', () => {
  it('mesure sur toute la série par défaut', () => {
    expect(totalReturnPercent(daily([100, 50, 200]))).toBeCloseTo(100, 6)
  })

  it('restreint à la fenêtre demandée', () => {
    const points = daily([100, 50, 200, 400])
    // Deux jours avant le dernier point : on part de 50.
    expect(totalReturnPercent(points, 2)).toBeCloseTo(700, 6)
  })
})
