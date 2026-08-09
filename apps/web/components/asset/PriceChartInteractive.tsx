'use client'

import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'

export interface ChartPoint {
  timestamp: number
  price: number
}

interface PriceChartInteractiveProps {
  points: ChartPoint[]
  /** Facteur appliqué aux prix pour la devise choisie (1 = devise d'origine). */
  rate: number
  currency: string
  height?: number
  /** Fenêtre en jours — détermine le format de l'axe temporel. */
  days: number
  label: string
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
  rate,
  currency,
  height = 320,
  days,
  label,
}: PriceChartInteractiveProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  // Création du graphique : une seule fois. Les mises à jour de données et de thème
  // passent par les effets suivants, sans reconstruire l'instance — la recréer à
  // chaque changement de devise ferait clignoter le graphique.
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
      timeScale: { borderVisible: false, timeVisible: days <= 7, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScale: { axisPressedMouseMove: false },
      localization: {
        locale: 'fr-FR',
        priceFormatter: (value: number) =>
          new Intl.NumberFormat('fr-FR', {
            maximumFractionDigits: value >= 100 ? 0 : value >= 1 ? 2 : 6,
          }).format(value),
      },
    })

    const series = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false })

    chartRef.current = chart
    seriesRef.current = series

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
      seriesRef.current = null
    }
  }, [height, days])

  // Données et couleurs. Relancé à chaque changement de série ou de devise.
  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart || points.length < 2) return

    const converted = points.map((point) => ({
      time: Math.floor(point.timestamp / 1000) as UTCTimestamp,
      value: point.price * rate,
    }))

    const first = converted[0]?.value ?? 0
    const last = converted[converted.length - 1]?.value ?? 0
    const rising = last >= first

    applyTheme(chart, series, rising)
    series.setData(converted)
    chart.timeScale().fitContent()
  }, [points, rate, currency])

  // Le thème peut changer pendant que la fiche est ouverte : on réapplique les
  // couleurs quand la classe `dark` bouge sur <html>. Sans cela, le graphique
  // resterait en couleurs claires sur fond bleu-nuit.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const series = seriesRef.current
      const chart = chartRef.current
      if (!series || !chart || points.length < 2) return

      const rising = (points[points.length - 1]?.price ?? 0) >= (points[0]?.price ?? 0)
      applyTheme(chart, series, rising)
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [points])

  return <div ref={containerRef} role="img" aria-label={label} className="w-full" />
}

/**
 * Applique la palette courante au graphique.
 *
 * Les couleurs sont LUES depuis les jetons CSS plutôt qu'écrites en dur : le
 * graphique suit ainsi le thème sans dupliquer la palette, exactement comme le reste
 * des composants.
 */
function applyTheme(chart: IChartApi, series: ISeriesApi<'Area'>, rising: boolean): void {
  const styles = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback

  const accent = rising ? token('--color-up', '#047857') : token('--color-down', '#b91c1c')

  series.applyOptions({
    lineColor: accent,
    topColor: withAlpha(accent, 0.22),
    bottomColor: withAlpha(accent, 0),
  })

  chart.applyOptions({
    layout: { textColor: token('--color-ink-muted', '#57534e') },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: token('--color-border-subtle', '#ede7dc') },
    },
  })
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
