'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useId } from 'react'

import {
  AXIS_TICK,
  CHART_MARGIN,
  ENTER_DURATION,
  GRID_STROKE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from '@/components/charts/chart-theme'
import { useReducedMotion } from '@/components/charts/useReducedMotion'

/**
 * Grande courbe datée — la version « plein format » d'`AreaSpark`.
 *
 * La différence entre les deux n'est pas la taille mais l'INTENTION. Une sparkline
 * donne une forme ; celle-ci sert à lire une valeur à une date. D'où tout ce que
 * l'autre s'interdit : axes gradués, grille horizontale, infobulle datée.
 *
 * La grille est HORIZONTALE seulement. Les lignes verticales n'aident pas à lire une
 * série temporelle continue — elles découpent visuellement ce qui est justement
 * continu — alors que les horizontales donnent l'échelle des valeurs.
 */
export type TrendFormat = 'currency' | 'compact' | 'number' | 'percent'

export interface TrendPoint {
  timestamp: number
  value: number
}

function formatValue(value: number, format: TrendFormat, currency: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        maximumFractionDigits: value >= 100 ? 0 : 2,
      }).format(value)
    case 'compact':
      return `${new Intl.NumberFormat('fr-FR', {
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(value)} ${currency}`
    case 'percent':
      return `${value.toFixed(2).replace('.', ',')} %`
    default:
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)
  }
}

/**
 * Graduations de l'axe des abscisses.
 *
 * Le format change avec la PROFONDEUR de la fenêtre : « 14:30 » sur une journée,
 * « 12 mars » sur trois mois, « mars 2026 » sur un an. Un format unique obligerait
 * soit à répéter l'année sur une fenêtre d'un jour, soit à afficher des heures
 * identiques sur douze mois — deux façons de saturer l'axe sans rien apprendre.
 */
function tickFormatter(timestamp: number, spanDays: number): string {
  const date = new Date(timestamp)
  if (spanDays <= 2) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (spanDays <= 120) {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

/**
 * Graduations imposées sur les DÉBUTS DE MOIS, au-delà de quatre mois de profondeur.
 *
 * Laissée libre, la répartition automatique de Recharts espace les graduations
 * régulièrement dans le TEMPS, sans savoir que le libellé, lui, est arrondi au mois.
 * Deux graduations distantes de trois semaines produisent alors deux fois « oct. 25 »
 * côte à côte — un axe qui a l'air cassé alors que la courbe est juste.
 *
 * En posant nous-mêmes une graduation par premier du mois, chaque libellé devient
 * unique par construction. Le pas s'élargit si les mois sont trop nombreux pour tenir
 * côte à côte : douze libellés passent, vingt-quatre se chevaucheraient.
 */
function monthlyTicks(from: number, to: number, maxTicks = 12): number[] {
  const ticks: number[] = []
  const cursor = new Date(from)
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  // Le premier du mois EN COURS est antérieur au début de la série : on part du
  // suivant, sinon la première graduation tomberait hors du domaine et Recharts la
  // collerait au bord gauche.
  if (cursor.getTime() < from) cursor.setMonth(cursor.getMonth() + 1)

  while (cursor.getTime() <= to) {
    ticks.push(cursor.getTime())
    cursor.setMonth(cursor.getMonth() + 1)
  }

  if (ticks.length <= maxTicks) return ticks

  const step = Math.ceil(ticks.length / maxTicks)
  return ticks.filter((_, index) => index % step === 0)
}

export function TrendChart({
  points,
  color = 'var(--color-data-1)',
  height = 320,
  format = 'compact',
  currency = 'EUR',
  label,
}: {
  points: TrendPoint[]
  color?: string
  height?: number
  format?: TrendFormat
  currency?: string
  /** Nom de la série, repris dans l'infobulle. */
  label: string
}) {
  const gradientId = useId()
  const reduced = useReducedMotion()

  if (points.length < 2) return null

  const first = points[0] as TrendPoint
  const last = points[points.length - 1] as TrendPoint
  const spanDays = Math.max(1, (last.timestamp - first.timestamp) / 86_400_000)

  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Même précaution que pour la sparkline : un domaine plat écraserait le tracé sur
  // une seule ligne de pixels.
  const pad = max === min ? Math.abs(max || 1) * 0.1 : (max - min) * 0.08

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={GRID_STROKE} vertical={false} />

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            // `dataMin`/`dataMax` et non `auto` : sur une échelle temporelle, `auto`
            // arrondit les bornes et laisse un vide à gauche et à droite de la courbe.
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value: number) => tickFormatter(value, spanDays)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            {...(spanDays > 120
              ? { ticks: monthlyTicks(first.timestamp, last.timestamp) }
              : {})}
          />

          <YAxis
            domain={[min - pad, max + pad]}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
                .format(value)
            }
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={48}
          />

          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={{ stroke: 'var(--color-border-subtle)', strokeWidth: 1 }}
            labelFormatter={(value) =>
              new Date(Number(value)).toLocaleString('fr-FR', {
                dateStyle: 'medium',
                ...(spanDays <= 2 ? { timeStyle: 'short' as const } : {}),
              })
            }
            formatter={(value) => [formatValue(Number(value), format, currency), label]}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduced}
            animationDuration={ENTER_DURATION}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
