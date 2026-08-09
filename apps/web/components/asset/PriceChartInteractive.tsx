'use client'

import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useMemo, useRef, useState } from 'react'

export interface ChartPoint {
  timestamp: number
  price: number
  volume?: number
}

export interface ChartCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Types de rendu proposés.
 *
 * `candles` et `bars` sont les seuls à exiger de l'OHLC réel ; les trois autres se
 * contentent d'une série de prix. C'est cette distinction qui permet à la fiche de
 * n'aller chercher les bougies que si l'utilisateur les demande.
 */
export type ChartKind = 'area' | 'line' | 'baseline' | 'candles' | 'bars'

export const OHLC_KINDS: readonly ChartKind[] = ['candles', 'bars']

interface PriceChartInteractiveProps {
  points: ChartPoint[]
  /** Bougies réelles — requises pour `candles` et `bars`, ignorées sinon. */
  candles?: ChartCandle[]
  kind?: ChartKind
  /** Facteur appliqué aux prix pour la devise choisie (1 = devise d'origine). */
  rate: number
  currency: string
  height?: number
  /** Fenêtre en jours — détermine le format de l'axe temporel. */
  days: number
  label: string
  /** Sous-graphique de volume, si la source en publie. */
  showVolume?: boolean
  /** Moyenne mobile superposée (§3.3 du cahier des charges). */
  showMovingAverage?: boolean
  /** Lignes horizontales plus haut / moyenne / plus bas. */
  showPriceLines?: boolean
}

/** Valeurs suivies par la croix de visée, affichées dans la légende. */
interface LegendState {
  price?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  time?: string
}

/**
 * Graphique de cours interactif — lightweight-charts (Apache 2.0, TradingView).
 *
 * Pourquoi cette bibliothèque plutôt que Highcharts, qu'utilise CoinGecko ?
 * Highcharts exige une licence payante pour un usage commercial, ce que ZENITH est
 * destiné à devenir (§8) — s'aligner sur eux aurait contredit la contrainte « tout
 * gratuit » du §7. Parmi les alternatives libres, celle-ci est la seule conçue pour
 * le financier : croix de visée, infobulle et échelle temporelle sont natives, pour
 * un tiers du poids d'ApexCharts.
 *
 * Le rendu est en canvas, donc client uniquement. C'est le compromis assumé du
 * passage à l'interactivité : les sparklines des tableaux restent en SVG rendu
 * serveur, cinquante canvas sur une page de classement étant ingérables.
 */
export function PriceChartInteractive({
  points,
  candles,
  kind = 'area',
  rate,
  currency,
  height = 320,
  days,
  label,
  showVolume = false,
  showMovingAverage = false,
  showPriceLines = false,
}: PriceChartInteractiveProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const averageRef = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])

  const [legend, setLegend] = useState<LegendState>({})

  const usesCandles = OHLC_KINDS.includes(kind) && (candles?.length ?? 0) > 1

  /* ── Création de l'instance : une seule fois par hauteur ──────────────────── */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        attributionLogo: false,
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScale: { axisPressedMouseMove: false },
      localization: { locale: 'fr-FR', priceFormatter: formatPrice },
    })

    chartRef.current = chart

    // `ResizeObserver` plutôt qu'un écouteur sur `window` : le graphique vit dans une
    // colonne dont la largeur change aussi quand la mise en page se réorganise, sans
    // que la fenêtre soit redimensionnée.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) chart.applyOptions({ width: entry.contentRect.width })
    })
    observer.observe(container)
    chart.applyOptions({ width: container.clientWidth })

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      mainRef.current = null
      volumeRef.current = null
      averageRef.current = null
      priceLinesRef.current = []
    }
  }, [height])

  /* ── Format de l'axe temporel : une option, pas une reconstruction ────────── */
  useEffect(() => {
    // Sous la semaine, l'heure porte l'information ; au-delà, elle sature l'axe.
    chartRef.current?.applyOptions({ timeScale: { timeVisible: days <= 7 } })
  }, [days])

  /* ── Séries : recréées quand le TYPE change ───────────────────────────────── */
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // Impossible de muter une série d'un type vers un autre : les formats de données
    // diffèrent (valeur unique contre quadruplet OHLC). On remplace donc l'objet.
    const main = chart.addSeries(seriesDefinition(kind), { priceLineVisible: false })
    mainRef.current = main

    const volume = showVolume
      ? chart.addSeries(HistogramSeries, {
          // Échelle DÉDIÉE : superposer volume et prix sur la même échelle écraserait
          // le cours contre le haut du cadre, les ordres de grandeur n'ayant aucun
          // rapport (un prix à 60 000 face à un volume à 30 milliards).
          priceScaleId: 'volume',
          priceFormat: { type: 'volume' },
          priceLineVisible: false,
          lastValueVisible: false,
        })
      : null
    volumeRef.current = volume

    if (volume) {
      // Le volume occupe le cinquième inférieur, sous la courbe de prix.
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    }

    const average = showMovingAverage
      ? chart.addSeries(LineSeries, {
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
      : null
    averageRef.current = average

    return () => {
      priceLinesRef.current = []
      mainRef.current = null
      volumeRef.current = null
      averageRef.current = null

      // Sentinelle indispensable. React nettoie les effets DANS LEUR ORDRE DE
      // DÉCLARATION : au démontage, l'effet de création ci-dessus s'exécute en
      // premier et appelle `chart.remove()`, qui détruit l'instance et toutes ses
      // séries. Retirer ensuite une série d'un graphique mort lève « Value is
      // undefined ». `chartRef` étant remis à `null` par ce nettoyage, sa valeur
      // suffit à distinguer les deux cas :
      //   • instance vivante  → simple changement de type, il FAUT retirer les séries ;
      //   • instance détruite → tout est déjà libéré, il n'y a plus rien à faire.
      if (chartRef.current !== chart) return

      // Retirer les séries sans détruire le graphique : l'échelle de temps et le
      // niveau de zoom de l'utilisateur survivent au changement de type.
      chart.removeSeries(main)
      if (volume) chart.removeSeries(volume)
      if (average) chart.removeSeries(average)
    }
  }, [kind, showVolume, showMovingAverage])

  /* ── Données ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const chart = chartRef.current
    const main = mainRef.current
    if (!chart || !main) return

    /*
     * Le type de série est décidé par `kind`, mais les bougies arrivent de façon
     * ASYNCHRONE. Entre le clic sur « Chandeliers » et la réponse de l'API, la série
     * est déjà une `CandlestickSeries` alors que seules des valeurs simples sont
     * disponibles — l'alimenter au format ligne lève « Value is undefined ».
     *
     * On ne dessine donc rien tant que la donnée n'a pas la forme qu'attend la série.
     * L'ancien graphique reste affiché en attendant, ce qui vaut mieux qu'un cadre
     * vide le temps de l'aller-retour réseau.
     */
    if (OHLC_KINDS.includes(kind) && !usesCandles) return

    const rising = trendIsUp(usesCandles, candles, points)
    const palette = readPalette()

    if (usesCandles && candles) {
      main.setData(
        candles.map((candle) => ({
          time: toUtc(candle.timestamp),
          open: candle.open * rate,
          high: candle.high * rate,
          low: candle.low * rate,
          close: candle.close * rate,
        })),
      )
    } else {
      if (points.length < 2) return
      main.setData(
        points.map((point) => ({ time: toUtc(point.timestamp), value: point.price * rate })),
      )
    }

    applySeriesTheme(main, kind, palette, rising)
    applyChartTheme(chart, palette)

    /* Volume — uniquement si la source l'a réellement fourni. */
    const volume = volumeRef.current
    if (volume) {
      const source: { timestamp: number; volume?: number; up: boolean }[] = usesCandles
        ? (candles ?? []).map((c) => ({
            timestamp: c.timestamp,
            volume: c.volume,
            up: c.close >= c.open,
          }))
        : points.map((p, index) => ({
            timestamp: p.timestamp,
            volume: p.volume,
            up: p.price >= (points[index - 1]?.price ?? p.price),
          }))

      volume.setData(
        source
          .filter((row): row is typeof row & { volume: number } => row.volume !== undefined)
          .map((row) => ({
            time: toUtc(row.timestamp),
            value: row.volume * rate,
            color: withAlpha(row.up ? palette.up : palette.down, 0.45),
          })),
      )
    }

    /* Moyenne mobile — calculée sur les clôtures, jamais extrapolée. */
    const average = averageRef.current
    if (average) {
      const closes = usesCandles
        ? (candles ?? []).map((c) => ({ timestamp: c.timestamp, price: c.close }))
        : points
      const sma = movingAverage(closes, smaPeriod(closes.length))
      average.applyOptions({ color: palette.accent })
      average.setData(sma.map((row) => ({ time: toUtc(row.timestamp), value: row.value * rate })))
    }

    /* Lignes de prix plus haut / moyenne / plus bas. */
    for (const line of priceLinesRef.current) main.removePriceLine(line)
    priceLinesRef.current = []

    if (showPriceLines) {
      const values = usesCandles
        ? (candles ?? []).map((c) => c.close * rate)
        : points.map((p) => p.price * rate)

      if (values.length > 1) {
        const max = Math.max(...values)
        const min = Math.min(...values)
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length

        priceLinesRef.current = (
          [
            { price: max, title: 'plus haut', color: palette.up },
            { price: mean, title: 'moyenne', color: palette.muted },
            { price: min, title: 'plus bas', color: palette.down },
          ] as const
        ).map((line) =>
          main.createPriceLine({
            price: line.price,
            color: line.color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: line.title,
          }),
        )
      }
    }

    chart.timeScale().fitContent()
  }, [points, candles, kind, rate, currency, usesCandles, showPriceLines, showVolume, showMovingAverage])

  /* ── Légende suivie par la croix de visée ─────────────────────────────────── */
  useEffect(() => {
    const chart = chartRef.current
    const main = mainRef.current
    if (!chart || !main) return

    const volume = volumeRef.current

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || param.point === undefined) {
        setLegend({})
        return
      }

      const value = param.seriesData.get(main)
      if (!value) {
        setLegend({})
        return
      }

      const next: LegendState = { time: formatStamp(param.time as UTCTimestamp, days) }

      if ('close' in value) {
        next.price = value.close as number
        next.open = value.open as number
        next.high = value.high as number
        next.low = value.low as number
      } else if ('value' in value) {
        next.price = value.value as number
      }

      if (volume) {
        const volumePoint = param.seriesData.get(volume)
        if (volumePoint && 'value' in volumePoint) next.volume = volumePoint.value as number
      }

      setLegend(next)
    })

    return () => {
      // Pas de `unsubscribeCrosshairMove` avec une référence perdue : l'instance est
      // détruite avec le graphique, et les séries sont remplacées à chaque changement
      // de type — on rattache donc l'écouteur au même cycle de vie que les séries.
      setLegend({})
    }
  }, [kind, showVolume, days])

  /* ── Suivi du thème ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const chart = chartRef.current
      const main = mainRef.current
      if (!chart || !main) return

      const palette = readPalette()
      applySeriesTheme(main, kind, palette, trendIsUp(usesCandles, candles, points))
      applyChartTheme(chart, palette)
      averageRef.current?.applyOptions({ color: palette.accent })
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [points, candles, kind, usesCandles])

  const hasLegend = legend.price !== undefined

  return (
    <div className="relative w-full">
      {/*
        Légende en surimpression plutôt qu'infobulle flottante attachée au curseur :
        une infobulle qui suit la souris masque précisément la zone du graphique que
        l'utilisateur est en train d'examiner. Position fixe, lecture stable.
      */}
      <div
        className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs"
        aria-hidden="true"
      >
        {hasLegend ? (
          <>
            <span className="font-medium text-ink">{formatPrice(legend.price ?? 0)}</span>
            {legend.open !== undefined && (
              <span className="text-ink-muted">
                O {formatPrice(legend.open)} · H {formatPrice(legend.high ?? 0)} · B{' '}
                {formatPrice(legend.low ?? 0)}
              </span>
            )}
            {legend.volume !== undefined && (
              <span className="text-ink-muted">Vol {formatCompact(legend.volume)}</span>
            )}
            <span className="text-ink-muted">{legend.time}</span>
          </>
        ) : null}
      </div>

      <div ref={containerRef} role="img" aria-label={label} className="w-full" />
    </div>
  )
}

/* ── Fabrique de séries ────────────────────────────────────────────────────── */

function seriesDefinition(kind: ChartKind) {
  switch (kind) {
    case 'candles':
      return CandlestickSeries
    case 'bars':
      return BarSeries
    case 'line':
      return LineSeries
    case 'baseline':
      return BaselineSeries
    default:
      return AreaSeries
  }
}

/* ── Thème ─────────────────────────────────────────────────────────────────── */

interface Palette {
  up: string
  down: string
  accent: string
  muted: string
  border: string
}

/**
 * Couleurs LUES depuis les jetons CSS plutôt qu'écrites en dur : le graphique suit
 * ainsi le thème sans dupliquer la palette, exactement comme le reste des composants.
 */
function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback

  return {
    up: token('--color-up', '#047857'),
    down: token('--color-down', '#b91c1c'),
    accent: token('--color-brand', '#0369a1'),
    muted: token('--color-ink-muted', '#475569'),
    border: token('--color-border-subtle', '#e2e8f0'),
  }
}

function applyChartTheme(chart: IChartApi, palette: Palette): void {
  chart.applyOptions({
    layout: { textColor: palette.muted },
    grid: { vertLines: { visible: false }, horzLines: { color: palette.border } },
  })
}

function applySeriesTheme(
  series: ISeriesApi<SeriesType>,
  kind: ChartKind,
  palette: Palette,
  rising: boolean,
): void {
  const accent = rising ? palette.up : palette.down

  switch (kind) {
    case 'candles':
      series.applyOptions({
        upColor: palette.up,
        downColor: palette.down,
        borderUpColor: palette.up,
        borderDownColor: palette.down,
        wickUpColor: palette.up,
        wickDownColor: palette.down,
      })
      break
    case 'bars':
      series.applyOptions({ upColor: palette.up, downColor: palette.down })
      break
    case 'line':
      series.applyOptions({ color: accent, lineWidth: 2 })
      break
    case 'baseline':
      series.applyOptions({
        topLineColor: palette.up,
        topFillColor1: withAlpha(palette.up, 0.28),
        topFillColor2: withAlpha(palette.up, 0.02),
        bottomLineColor: palette.down,
        bottomFillColor1: withAlpha(palette.down, 0.02),
        bottomFillColor2: withAlpha(palette.down, 0.28),
      })
      break
    default:
      series.applyOptions({
        lineColor: accent,
        lineWidth: 2,
        topColor: withAlpha(accent, 0.22),
        bottomColor: withAlpha(accent, 0),
      })
  }
}

/* ── Calculs ───────────────────────────────────────────────────────────────── */

function trendIsUp(
  usesCandles: boolean,
  candles: ChartCandle[] | undefined,
  points: ChartPoint[],
): boolean {
  if (usesCandles && candles && candles.length > 1) {
    return (candles[candles.length - 1]?.close ?? 0) >= (candles[0]?.open ?? 0)
  }
  return (points[points.length - 1]?.price ?? 0) >= (points[0]?.price ?? 0)
}

/**
 * Période de la moyenne mobile, proportionnée au nombre de points.
 *
 * Une période fixe n'a pas de sens ici : la même fenêtre de 7 jours contient 168
 * points en pas horaire et 7 en pas quotidien. Une moyenne à 20 périodes lisserait
 * utilement la première et effacerait complètement la seconde.
 */
function smaPeriod(count: number): number {
  return Math.max(5, Math.min(50, Math.round(count / 12)))
}

/** Moyenne mobile simple. Les `period - 1` premiers points n'en ont pas — on ne les invente pas. */
function movingAverage(
  series: { timestamp: number; price: number }[],
  period: number,
): { timestamp: number; value: number }[] {
  if (series.length < period) return []

  const result: { timestamp: number; value: number }[] = []
  let sum = 0

  for (const [index, point] of series.entries()) {
    sum += point.price
    if (index >= period) sum -= series[index - period]?.price ?? 0
    if (index >= period - 1) result.push({ timestamp: point.timestamp, value: sum / period })
  }

  return result
}

/* ── Formatage ─────────────────────────────────────────────────────────────── */

const toUtc = (timestamp: number) => Math.floor(timestamp / 1000) as UTCTimestamp

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: value >= 100 ? 0 : value >= 1 ? 2 : 6,
  }).format(value)
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

function formatStamp(time: UTCTimestamp, days: number): string {
  const date = new Date((time as number) * 1000)
  return date.toLocaleString(
    'fr-FR',
    days <= 7
      ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' },
  )
}

/** Applique une transparence à une couleur hexadécimale ou `rgb()` issue des jetons. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex =
      color.length === 4
        ? color
            .slice(1)
            .split('')
            .map((char) => char + char)
            .join('')
        : color.slice(1)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Format `rgb(...)` : on le convertit sans supposer d'espacement particulier.
  const numbers = color.match(/\d+(\.\d+)?/g)
  if (numbers && numbers.length >= 3) {
    return `rgba(${numbers[0]}, ${numbers[1]}, ${numbers[2]}, ${alpha})`
  }
  return color
}
