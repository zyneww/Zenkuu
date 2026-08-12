import { describe, expect, it } from 'vitest'

import {
  bollinger,
  cci,
  ema,
  macd,
  momentum,
  rsi,
  sma,
  stochasticK,
  technicalSummary,
  williamsR,
  type Candle,
} from './indicators'

const DAY = 24 * 60 * 60 * 1000

/** Bougies plates dont seule la clôture varie — suffisant pour les tests de forme. */
function candlesFrom(closes: number[], spread = 1): Candle[] {
  const start = Date.UTC(2024, 0, 1)
  return closes.map((close, index) => ({
    timestamp: start + index * DAY,
    open: close,
    high: close + spread,
    low: close - spread,
    close,
  }))
}

describe('alignement', () => {
  /**
   * L'invariant qui protège tous les sous-graphiques : longueur d'entrée = longueur
   * de sortie, trous en `undefined`. Un décalage d'un cran ferait tracer le RSI
   * d'hier sous la bougie d'aujourd'hui, sans que rien ne le signale.
   */
  it('rend toujours un tableau de la longueur de l’entrée', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(sma(values, 3)).toHaveLength(10)
    expect(ema(values, 3)).toHaveLength(10)
    expect(rsi(values, 5)).toHaveLength(10)
    expect(momentum(values, 3)).toHaveLength(10)
    expect(macd(values).macd).toHaveLength(10)
    expect(bollinger(values, 4).upper).toHaveLength(10)
  })

  it('laisse undefined avant que l’indicateur ne soit défini', () => {
    const result = sma([1, 2, 3, 4, 5], 3)
    expect(result[0]).toBeUndefined()
    expect(result[1]).toBeUndefined()
    expect(result[2]).toBe(2)
  })

  it('rend tout undefined si la série est plus courte que la période', () => {
    expect(sma([1, 2], 5).every((value) => value === undefined)).toBe(true)
    expect(ema([1, 2], 5).every((value) => value === undefined)).toBe(true)
  })
})

describe('ema', () => {
  /**
   * L'amorçage par moyenne simple est vérifiable directement : la première valeur
   * définie DOIT être la SMA de la fenêtre. Un amorçage par la première valeur seule
   * donnerait 1 ici, pas 2.
   */
  it('s’amorce sur la moyenne simple de la première fenêtre', () => {
    expect(ema([1, 2, 3, 10, 20], 3)[2]).toBe(2)
  })
})

describe('rsi', () => {
  it('vaut 100 sur une série qui ne baisse jamais', () => {
    const values = Array.from({ length: 20 }, (_, index) => 100 + index)
    expect(rsi(values, 14)[19]).toBeCloseTo(100, 6)
  })

  it('vaut 0 sur une série qui ne monte jamais', () => {
    const values = Array.from({ length: 20 }, (_, index) => 100 - index)
    expect(rsi(values, 14)[19]).toBeCloseTo(0, 6)
  })

  it('reste dans [0, 100] sur une série alternée', () => {
    const values = Array.from({ length: 60 }, (_, index) => 100 + (index % 2 === 0 ? 5 : -5))
    for (const value of rsi(values, 14)) {
      if (value === undefined) continue
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })
})

describe('bollinger', () => {
  /**
   * Écart-type de POPULATION (division par n). Sur [2, 4, 4, 4, 5, 5, 7, 9] la
   * moyenne est 5 et l'écart-type population exactement 2 — le cas d'école. Avec un
   * écart-type d'échantillon on obtiendrait ≈ 2,138, et les bandes seraient décalées.
   */
  it('utilise l’écart-type de population', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    const bands = bollinger(values, 8, 2)
    expect(bands.middle[7]).toBe(5)
    expect(bands.upper[7]).toBeCloseTo(9, 10)
    expect(bands.lower[7]).toBeCloseTo(1, 10)
  })
})

describe('stochasticK et williamsR', () => {
  it('vaut 100 quand la clôture est au plus haut de la fenêtre', () => {
    const candles = candlesFrom([10, 11, 12, 13, 14], 0)
    expect(stochasticK(candles, 5)[4]).toBeCloseTo(100, 6)
  })

  it('williamsR est le stochastique décalé de −100', () => {
    const candles = candlesFrom([10, 12, 11, 15, 13, 18, 14], 0)
    const stoch = stochasticK(candles, 5)
    const williams = williamsR(candles, 5)
    for (let index = 0; index < candles.length; index += 1) {
      if (stoch[index] === undefined) {
        expect(williams[index]).toBeUndefined()
        continue
      }
      expect(williams[index]).toBeCloseTo(stoch[index]! - 100, 10)
    }
  })

  it('rend 50 plutôt qu’une division par zéro sur une amplitude nulle', () => {
    const candles = candlesFrom([10, 10, 10, 10, 10], 0)
    expect(stochasticK(candles, 5)[4]).toBe(50)
  })
})

describe('cci', () => {
  it('rend 0 plutôt qu’une division par zéro sur une série plate', () => {
    const candles = candlesFrom(new Array(25).fill(50), 0)
    expect(cci(candles, 20)[24]).toBe(0)
  })
})

describe('macd', () => {
  /**
   * La ligne de signal ne doit PAS traiter les trous de la ligne MACD comme des
   * zéros. Sur une série qui monte franchement, le MACD est positif ; un signal
   * pollué par des zéros initiaux resterait sous lui artificiellement longtemps.
   * On vérifie ici la seule chose robuste : le signal commence là où le MACD
   * commence, décalé du lissage, et jamais avant.
   */
  it('ne définit le signal qu’après la ligne MACD', () => {
    const values = Array.from({ length: 80 }, (_, index) => 100 + index)
    const result = macd(values)
    const firstMacd = result.macd.findIndex((value) => value !== undefined)
    const firstSignal = result.signal.findIndex((value) => value !== undefined)
    expect(firstSignal).toBeGreaterThan(firstMacd)
  })

  it('l’histogramme est exactement macd − signal', () => {
    const values = Array.from({ length: 80 }, (_, index) => 100 + Math.sin(index) * 10)
    const result = macd(values)
    for (let index = 0; index < values.length; index += 1) {
      const line = result.macd[index]
      const signal = result.signal[index]
      if (line === undefined || signal === undefined) {
        expect(result.histogram[index]).toBeUndefined()
        continue
      }
      expect(result.histogram[index]).toBeCloseTo(line - signal, 10)
    }
  })
})

describe('technicalSummary', () => {
  it('refuse de se prononcer sur une série trop courte', () => {
    expect(technicalSummary(candlesFrom([1, 2, 3, 4, 5]))).toBeUndefined()
  })

  it('conclut à l’achat sur une tendance haussière franche', () => {
    const candles = candlesFrom(Array.from({ length: 250 }, (_, index) => 100 + index))
    const summary = technicalSummary(candles)
    expect(summary).toBeDefined()
    // Le cours est au-dessus de toutes ses moyennes : la famille tendance est
    // unanime, donc « achat fort ».
    expect(summary!.movingAverages.verdict).toBe('strongBuy')
    expect(summary!.movingAverages.sell).toBe(0)
  })

  it('conclut à la vente sur une tendance baissière franche', () => {
    const candles = candlesFrom(Array.from({ length: 250 }, (_, index) => 1000 - index))
    const summary = technicalSummary(candles)
    expect(summary!.movingAverages.verdict).toBe('strongSell')
    expect(summary!.movingAverages.buy).toBe(0)
  })

  /**
   * Les neutres comptent au dénominateur. Sans cela, un seul indicateur haussier
   * parmi quinze silencieux produirait « achat fort » — l'erreur classique de ce
   * genre de jauge.
   */
  it('compte les neutres dans le dénominateur du verdict', () => {
    const candles = candlesFrom(new Array(250).fill(100), 0)
    const summary = technicalSummary(candles)
    expect(summary!.overall.verdict).toBe('neutral')
  })

  it('n’inclut jamais une moyenne que la série est trop courte pour calculer', () => {
    // 60 bougies : les moyennes 100 et 200 ne peuvent pas exister.
    const candles = candlesFrom(Array.from({ length: 60 }, (_, index) => 100 + index))
    const summary = technicalSummary(candles)
    const keys = summary!.movingAverageReadings.map((reading) => reading.key)
    expect(keys).not.toContain('sma200')
    expect(keys).not.toContain('ema100')
    expect(summary!.movingAverageReadings.every((reading) => reading.value !== undefined)).toBe(true)
  })
})
