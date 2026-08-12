/**
 * Indicateurs techniques et synthèse de signaux.
 *
 * ── CE QUE CE FICHIER PRODUIT, ET SOUS QUELLE AUTORITÉ ────────────────────────
 *
 * Rien ici n'est une donnée : tout est une TRANSFORMATION de bougies réellement
 * publiées. Une moyenne mobile à 50 jours n'est pas une opinion sur le marché, c'est
 * la moyenne de cinquante clôtures — vérifiable, reproductible, et donc compatible
 * avec le §5, qui interdit d'inventer des valeurs et non d'en calculer.
 *
 * La SYNTHÈSE, en revanche, demande une précaution que les indicateurs eux-mêmes ne
 * demandent pas. Traduire « RSI à 28 » en « signal d'achat » suppose un seuil, et un
 * seuil est une convention, pas un fait. Les seuils retenus ci-dessous sont ceux de
 * l'usage courant (30/70 pour le RSI, ±100 pour le CCI, 20/80 pour le stochastique),
 * mais ce sont NOS règles : aucune plateforme ne publie les siennes, et deux sites
 * affichant « achat fort » sur le même actif ne le calculent pas pareil.
 *
 * L'interface doit donc dire trois choses, et le fait : sur quelle période le calcul
 * porte, quels indicateurs y entrent, et que ce n'est pas un conseil. Une jauge
 * « achat fort » posée sans ces trois mentions serait une recommandation
 * d'investissement déguisée — ce que le §7 interdit formellement.
 *
 * ── LA CONVENTION D'ALIGNEMENT ────────────────────────────────────────────────
 *
 * Chaque fonction rend un tableau de MÊME LONGUEUR que son entrée, avec `undefined`
 * là où l'indicateur n'est pas encore défini (les 13 premières valeurs d'un RSI 14,
 * par exemple). C'est ce qui permet de tracer un sous-graphique aligné sur le
 * graphique principal sans jongler avec des décalages d'index — la source d'erreur
 * numéro un de ce genre de code.
 */

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type Signal = 'buy' | 'neutral' | 'sell'

export type Verdict = 'strongSell' | 'sell' | 'neutral' | 'buy' | 'strongBuy'

export interface IndicatorReading {
  /** Identifiant stable, utilisé comme clé de rendu. */
  key: string
  label: string
  /** Valeur courante de l'indicateur. `undefined` si la série est trop courte. */
  value: number | undefined
  signal: Signal
}

export interface Tally {
  buy: number
  neutral: number
  sell: number
  verdict: Verdict
}

export interface TechnicalSummary {
  oscillators: Tally
  movingAverages: Tally
  overall: Tally
  oscillatorReadings: IndicatorReading[]
  movingAverageReadings: IndicatorReading[]
}

type Maybe = number | undefined

/* ── Moyennes ─────────────────────────────────────────────────────────────── */

/** Moyenne mobile simple. */
export function sma(values: number[], period: number): Maybe[] {
  const out: Maybe[] = new Array(values.length).fill(undefined)
  if (period <= 0 || values.length < period) return out

  let sum = 0
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index]!
    if (index >= period) sum -= values[index - period]!
    if (index >= period - 1) out[index] = sum / period
  }
  return out
}

/**
 * Moyenne mobile exponentielle.
 *
 * Amorcée par la moyenne SIMPLE des `period` premières valeurs, et non par la
 * première valeur seule. L'amorçage naïf donne un poids écrasant au premier point :
 * sur une EMA 200, il faut plusieurs centaines de périodes pour que son influence
 * devienne négligeable, et une série d'un an n'en a que 365.
 */
export function ema(values: number[], period: number): Maybe[] {
  const out: Maybe[] = new Array(values.length).fill(undefined)
  if (period <= 0 || values.length < period) return out

  const k = 2 / (period + 1)
  let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period
  out[period - 1] = previous

  for (let index = period; index < values.length; index += 1) {
    previous = values[index]! * k + previous * (1 - k)
    out[index] = previous
  }
  return out
}

/* ── Oscillateurs ─────────────────────────────────────────────────────────── */

/**
 * Indice de force relative, lissage de Wilder.
 *
 * Wilder et non moyenne simple : c'est la définition d'origine, et c'est celle que
 * tout le monde affiche. Un RSI en moyenne simple donne des valeurs sensiblement
 * différentes — assez pour franchir un seuil de 30 ou 70 quand l'autre ne le
 * franchit pas, donc assez pour changer le signal.
 */
export function rsi(values: number[], period = 14): Maybe[] {
  const out: Maybe[] = new Array(values.length).fill(undefined)
  if (values.length <= period) return out

  let gains = 0
  let losses = 0
  for (let index = 1; index <= period; index += 1) {
    const delta = values[index]! - values[index - 1]!
    if (delta >= 0) gains += delta
    else losses -= delta
  }

  let averageGain = gains / period
  let averageLoss = losses / period
  out[period] = toRsi(averageGain, averageLoss)

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index]! - values[index - 1]!
    const gain = delta > 0 ? delta : 0
    const loss = delta < 0 ? -delta : 0
    averageGain = (averageGain * (period - 1) + gain) / period
    averageLoss = (averageLoss * (period - 1) + loss) / period
    out[index] = toRsi(averageGain, averageLoss)
  }

  return out
}

/** Un marché sans aucune baisse sur la fenêtre donne un RSI de 100, pas une division par zéro. */
function toRsi(averageGain: number, averageLoss: number): number {
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100
  const rs = averageGain / averageLoss
  return 100 - 100 / (1 + rs)
}

export interface MacdSeries {
  macd: Maybe[]
  signal: Maybe[]
  histogram: Maybe[]
}

/** Convergence-divergence des moyennes mobiles. */
export function macd(values: number[], fast = 12, slow = 26, smoothing = 9): MacdSeries {
  const fastLine = ema(values, fast)
  const slowLine = ema(values, slow)

  const line: Maybe[] = values.map((_, index) => {
    const a = fastLine[index]
    const b = slowLine[index]
    return a !== undefined && b !== undefined ? a - b : undefined
  })

  /*
   * La ligne de signal est l'EMA de la ligne MACD — mais celle-ci commence par des
   * trous. On l'EMA donc sur sa partie DÉFINIE seulement, puis on réaligne. Passer
   * les `undefined` à `ema` les traiterait comme des zéros et tirerait la courbe
   * vers le bas pendant les premières dizaines de périodes.
   */
  const firstDefined = line.findIndex((value) => value !== undefined)
  const signal: Maybe[] = new Array(values.length).fill(undefined)

  if (firstDefined >= 0) {
    const compact = line.slice(firstDefined) as number[]
    const smoothed = ema(compact, smoothing)
    for (let index = 0; index < smoothed.length; index += 1) {
      signal[firstDefined + index] = smoothed[index]
    }
  }

  const histogram: Maybe[] = values.map((_, index) => {
    const a = line[index]
    const b = signal[index]
    return a !== undefined && b !== undefined ? a - b : undefined
  })

  return { macd: line, signal, histogram }
}

export interface BollingerBands {
  middle: Maybe[]
  upper: Maybe[]
  lower: Maybe[]
}

/**
 * Bandes de Bollinger.
 *
 * L'écart-type est celui de la POPULATION (division par n) et non de l'échantillon
 * (n − 1) : c'est la définition de Bollinger, qui considère la fenêtre glissante
 * comme la population entière. L'écart est faible sur 20 périodes mais réel, et
 * suffit à décaler visiblement les bandes sur un actif calme.
 */
export function bollinger(values: number[], period = 20, deviations = 2): BollingerBands {
  const middle = sma(values, period)
  const upper: Maybe[] = new Array(values.length).fill(undefined)
  const lower: Maybe[] = new Array(values.length).fill(undefined)

  for (let index = period - 1; index < values.length; index += 1) {
    const mean = middle[index]
    if (mean === undefined) continue

    let squares = 0
    for (let back = index - period + 1; back <= index; back += 1) {
      squares += (values[back]! - mean) ** 2
    }
    const deviation = Math.sqrt(squares / period)
    upper[index] = mean + deviations * deviation
    lower[index] = mean - deviations * deviation
  }

  return { middle, upper, lower }
}

/** Stochastique %K — position de la clôture dans l'amplitude de la fenêtre. */
export function stochasticK(candles: Candle[], period = 14): Maybe[] {
  const out: Maybe[] = new Array(candles.length).fill(undefined)

  for (let index = period - 1; index < candles.length; index += 1) {
    const window = candles.slice(index - period + 1, index + 1)
    const highest = Math.max(...window.map((candle) => candle.high))
    const lowest = Math.min(...window.map((candle) => candle.low))
    // Amplitude nulle : la clôture est à la fois au plus haut et au plus bas. On
    // rend 50 — le milieu — plutôt qu'une division par zéro.
    out[index] =
      highest === lowest ? 50 : ((candles[index]!.close - lowest) / (highest - lowest)) * 100
  }

  return out
}

/** Williams %R — le stochastique vu à l'envers, borné entre −100 et 0. */
export function williamsR(candles: Candle[], period = 14): Maybe[] {
  return stochasticK(candles, period).map((value) => (value === undefined ? undefined : value - 100))
}

/**
 * Indice du canal des matières premières.
 *
 * Le facteur 0,015 n'a aucune justification théorique : Lambert l'a choisi pour que
 * environ 70 à 80 % des valeurs tombent dans l'intervalle ±100. Il est conservé
 * parce que les seuils de lecture du CCI en dépendent entièrement.
 */
export function cci(candles: Candle[], period = 20): Maybe[] {
  const typical = candles.map((candle) => (candle.high + candle.low + candle.close) / 3)
  const means = sma(typical, period)
  const out: Maybe[] = new Array(candles.length).fill(undefined)

  for (let index = period - 1; index < candles.length; index += 1) {
    const mean = means[index]
    if (mean === undefined) continue

    let deviation = 0
    for (let back = index - period + 1; back <= index; back += 1) {
      deviation += Math.abs(typical[back]! - mean)
    }
    deviation /= period

    out[index] = deviation === 0 ? 0 : (typical[index]! - mean) / (0.015 * deviation)
  }

  return out
}

/** Momentum — écart brut entre la clôture et celle de N périodes plus tôt. */
export function momentum(values: number[], period = 10): Maybe[] {
  return values.map((value, index) => (index >= period ? value - values[index - period]! : undefined))
}

/* ── Synthèse ─────────────────────────────────────────────────────────────── */

const last = (series: Maybe[]): Maybe => {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    if (series[index] !== undefined) return series[index]
  }
  return undefined
}

/**
 * Verdict à partir d'un décompte.
 *
 * Le score est l'écart NET rapporté au nombre d'indicateurs qui se sont prononcés,
 * neutres compris. Compter les neutres au dénominateur est délibéré : dix
 * indicateurs dont un seul dit « acheter » et neuf « rien à signaler » décrivent un
 * marché sans direction, pas un signal d'achat. Les exclure produirait exactement
 * l'inverse — un « achat fort » sur une voix.
 */
function tally(readings: IndicatorReading[]): Tally {
  const buy = readings.filter((reading) => reading.signal === 'buy').length
  const sell = readings.filter((reading) => reading.signal === 'sell').length
  const neutral = readings.length - buy - sell

  const total = readings.length
  const score = total === 0 ? 0 : (buy - sell) / total

  let verdict: Verdict = 'neutral'
  if (score >= 0.5) verdict = 'strongBuy'
  else if (score >= 0.15) verdict = 'buy'
  else if (score <= -0.5) verdict = 'strongSell'
  else if (score <= -0.15) verdict = 'sell'

  return { buy, neutral, sell, verdict }
}

/** Signal d'un oscillateur borné : sous le plancher on achète, au-dessus du plafond on vend. */
function bounded(value: Maybe, floor: number, ceiling: number): Signal {
  if (value === undefined) return 'neutral'
  if (value < floor) return 'buy'
  if (value > ceiling) return 'sell'
  return 'neutral'
}

/**
 * Synthèse technique complète.
 *
 * Deux familles séparées puis fusionnées, parce qu'elles ne disent pas la même
 * chose : les oscillateurs détectent les EXCÈS (et se retournent donc contre la
 * tendance), les moyennes mobiles décrivent la TENDANCE elle-même. Les mélanger sans
 * les distinguer produirait une jauge neutre en permanence, chaque famille annulant
 * l'autre dans les phases de retournement — précisément les moments intéressants.
 */
export function technicalSummary(candles: Candle[]): TechnicalSummary | undefined {
  // 35 bougies : le minimum pour qu'un MACD (26 + 9) ait une seule valeur définie.
  // En dessous, la moitié des lignes seraient vides et la jauge reposerait sur trois
  // indicateurs — un chiffre sans valeur informative, qu'il vaut mieux ne pas rendre.
  if (candles.length < 35) return undefined

  const closes = candles.map((candle) => candle.close)
  const price = closes[closes.length - 1]!

  const rsiValue = last(rsi(closes, 14))
  const stochValue = last(stochasticK(candles, 14))
  const cciValue = last(cci(candles, 20))
  const williamsValue = last(williamsR(candles, 14))
  const momentumValue = last(momentum(closes, 10))
  const macdSeries = macd(closes)
  const macdValue = last(macdSeries.macd)
  const macdSignal = last(macdSeries.signal)

  const oscillatorReadings: IndicatorReading[] = [
    { key: 'rsi', label: 'RSI (14)', value: rsiValue, signal: bounded(rsiValue, 30, 70) },
    { key: 'stoch', label: 'Stochastique %K (14)', value: stochValue, signal: bounded(stochValue, 20, 80) },
    { key: 'cci', label: 'CCI (20)', value: cciValue, signal: bounded(cciValue, -100, 100) },
    {
      key: 'williams',
      label: 'Williams %R (14)',
      value: williamsValue,
      signal: bounded(williamsValue, -80, -20),
    },
    {
      key: 'momentum',
      label: 'Momentum (10)',
      value: momentumValue,
      // Un momentum lit une DIRECTION et non un excès : positif = hausse en cours.
      // Il ne se renverse donc pas comme les oscillateurs bornés au-dessus.
      signal:
        momentumValue === undefined ? 'neutral' : momentumValue > 0 ? 'buy' : momentumValue < 0 ? 'sell' : 'neutral',
    },
    {
      key: 'macd',
      label: 'MACD (12, 26)',
      value: macdValue,
      signal:
        macdValue === undefined || macdSignal === undefined
          ? 'neutral'
          : macdValue > macdSignal
            ? 'buy'
            : macdValue < macdSignal
              ? 'sell'
              : 'neutral',
    },
  ]

  const periods = [10, 20, 50, 100, 200]
  const movingAverageReadings: IndicatorReading[] = []

  for (const period of periods) {
    for (const [kind, series] of [
      ['SMA', sma(closes, period)],
      ['EMA', ema(closes, period)],
    ] as const) {
      const value = last(series)
      movingAverageReadings.push({
        key: `${kind.toLowerCase()}${period}`,
        label: `${kind} (${period})`,
        value,
        // Le cours au-dessus de sa moyenne est une tendance haussière, en dessous une
        // tendance baissière. Une moyenne que la série est trop courte pour calculer
        // ne vote pas — elle n'est simplement pas dans la liste.
        signal: value === undefined ? 'neutral' : price > value ? 'buy' : price < value ? 'sell' : 'neutral',
      })
    }
  }

  const definedMovingAverages = movingAverageReadings.filter((reading) => reading.value !== undefined)

  return {
    oscillators: tally(oscillatorReadings),
    movingAverages: tally(definedMovingAverages),
    overall: tally([...oscillatorReadings, ...definedMovingAverages]),
    oscillatorReadings,
    movingAverageReadings: definedMovingAverages,
  }
}
