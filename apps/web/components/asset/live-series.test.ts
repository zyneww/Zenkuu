import { describe, expect, it } from 'vitest'

import type { PriceHistory } from '@zenkuu/data'

import type { ChartCandle } from './PriceChartInteractive'
import { appendLivePoint, mergeCandle } from './live-series'

const MINUTE = 60_000
const DAY = 86_400_000

/** Série de `count` points au pas donné, terminant sur `end`. */
function seriesEndingAt(end: number, step: number, count: number, price = 100): PriceHistory {
  return {
    points: Array.from({ length: count }, (_, index) => ({
      timestamp: end - (count - 1 - index) * step,
      price,
    })),
    currency: 'EUR',
    days: 7,
  }
}

describe('appendLivePoint', () => {
  const end = Date.UTC(2026, 7, 12, 12, 0)

  it('ne touche à rien sans cours en direct', () => {
    const history = seriesEndingAt(end, MINUTE, 3)
    expect(appendLivePoint(history, null)).toBe(history)
  })

  it('allonge la série quand le direct dépasse le pas', () => {
    const history = seriesEndingAt(end, MINUTE, 3)
    const result = appendLivePoint(history, { timestamp: end + 5 * MINUTE, price: 101 })

    expect(result.points).toHaveLength(4)
    expect(result.points[3]).toMatchObject({ timestamp: end + 5 * MINUTE, price: 101 })
  })

  it('REMPLACE le dernier point quand le direct tombe à l’intérieur du pas', () => {
    // Le cas d'une vue annuelle à pas quotidien : sans ce remplacement, un relevé à
    // la seconde collerait un segment de deux minutes au bout de segments d'un jour.
    const history = seriesEndingAt(end, DAY, 4)
    const result = appendLivePoint(history, { timestamp: end + 2 * MINUTE, price: 101 })

    expect(result.points).toHaveLength(4)
    expect(result.points[3]).toMatchObject({ timestamp: end + 2 * MINUTE, price: 101 })
  })

  it('refuse un direct antérieur au dernier point', () => {
    const history = seriesEndingAt(end, MINUTE, 3)
    expect(appendLivePoint(history, { timestamp: end - MINUTE, price: 101 })).toBe(history)
  })

  it('refuse un direct simultané au dernier point', () => {
    // Horodatages strictement croissants : une égalité ferait rejeter TOUTE la série
    // par le graphique, pas seulement le point fautif.
    const history = seriesEndingAt(end, MINUTE, 3)
    expect(appendLivePoint(history, { timestamp: end, price: 101 })).toBe(history)
  })

  it('refuse un cours qui s’écarte de plus de 20 % — probable homonyme', () => {
    const history = seriesEndingAt(end, MINUTE, 3, 100)
    expect(appendLivePoint(history, { timestamp: end + 5 * MINUTE, price: 130 })).toBe(history)
    expect(appendLivePoint(history, { timestamp: end + 5 * MINUTE, price: 70 })).toBe(history)
  })

  it('accepte un mouvement franc mais plausible', () => {
    const history = seriesEndingAt(end, MINUTE, 3, 100)
    const result = appendLivePoint(history, { timestamp: end + 5 * MINUTE, price: 115 })
    expect(result.points).toHaveLength(4)
  })

  it('conserve les champs annexes du dernier point', () => {
    // Le volume disparaîtrait du sous-panneau à chaque tic s'il n'était pas repris.
    const history: PriceHistory = {
      points: [
        { timestamp: end - MINUTE, price: 100, volume: 5 },
        { timestamp: end, price: 100, volume: 7 },
      ],
      currency: 'EUR',
      days: 1,
    }

    const result = appendLivePoint(history, { timestamp: end + 5 * MINUTE, price: 101 })
    expect(result.points[2]).toMatchObject({ price: 101, volume: 7 })
  })

  it('n’ajoute rien à une série vide', () => {
    const history: PriceHistory = { points: [], currency: 'EUR', days: 1 }
    expect(appendLivePoint(history, { timestamp: end, price: 100 })).toBe(history)
  })
})

describe('mergeCandle', () => {
  const start = Date.UTC(2026, 7, 12, 12, 0)

  const candle = (timestamp: number, close: number): ChartCandle => ({
    timestamp,
    open: close,
    high: close,
    low: close,
    close,
  })

  it('remplace la bougie de même horodatage', () => {
    // Le cas nominal : la place réécrit la bougie courante à chaque transaction.
    const candles = [candle(start, 100), candle(start + MINUTE, 101)]
    const result = mergeCandle(candles, candle(start + MINUTE, 105), 10)

    expect(result).toHaveLength(2)
    expect(result[1]?.close).toBe(105)
  })

  it('ajoute une bougie postérieure', () => {
    const candles = [candle(start, 100)]
    const result = mergeCandle(candles, candle(start + MINUTE, 101), 10)

    expect(result).toHaveLength(2)
  })

  it('ignore une bougie en retard — cas d’une reconnexion', () => {
    const candles = [candle(start, 100), candle(start + MINUTE, 101)]
    const result = mergeCandle(candles, candle(start, 99), 10)

    expect(result).toBe(candles)
  })

  it('borne la série à la fenêtre glissante', () => {
    const candles = Array.from({ length: 3 }, (_, index) => candle(start + index * MINUTE, 100))
    const result = mergeCandle(candles, candle(start + 3 * MINUTE, 101), 3)

    expect(result).toHaveLength(3)
    expect(result[0]?.timestamp).toBe(start + MINUTE)
    expect(result[2]?.timestamp).toBe(start + 3 * MINUTE)
  })

  it('accepte la première bougie d’une série vide', () => {
    expect(mergeCandle([], candle(start, 100), 10)).toHaveLength(1)
  })
})
