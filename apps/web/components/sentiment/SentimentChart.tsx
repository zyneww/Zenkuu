'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useId } from 'react'

import type { SentimentPoint } from '@zenith/data'

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
 * Courbe historique de l'indice de sentiment.
 *
 * ÉCHELLE VERTICALE FIXE de 0 à 100, et c'est le point qui distingue ce graphique
 * d'une courbe de prix. Une échelle auto-ajustée ferait paraître spectaculaire une
 * oscillation entre 45 et 55, alors que tout l'intérêt de l'indice est de situer une
 * valeur sur une échelle connue et invariable.
 *
 * Les lignes de référence remplacent une légende : elles marquent les frontières
 * entre bandes (peur / neutre / avidité) à même le graphique, là où une légende
 * obligerait à faire l'aller-retour du regard à chaque lecture.
 */

/** Seuils de `classify` — voir `SidePanels`. Ce sont eux qui portent le sens. */
const THRESHOLDS = [
  { value: 25, label: 'Peur' },
  { value: 45, label: 'Neutre' },
  { value: 56, label: 'Avidité' },
  { value: 75, label: 'Avidité extrême' },
]

export function SentimentChart({
  points,
  height = 260,
}: {
  points: SentimentPoint[]
  height?: number
}) {
  const gradientId = useId()
  const reduced = useReducedMotion()

  if (points.length < 2) return null

  const data = points.map((point) => ({
    // Formaté ICI plutôt que dans l'axe : Recharts appelle son formateur à chaque
    // rendu, y compris pendant l'animation, ce qui recalculerait la date des
    // centaines de fois pour un résultat invariable.
    date: formatDay(point.timestamp),
    valeur: point.value,
    classification: point.classification,
  }))

  const last = points[points.length - 1] as SentimentPoint
  const first = points[0] as SentimentPoint

  return (
    <figure
      style={{ height }}
      role="img"
      aria-label={`Évolution de l’indice de sentiment du ${formatDay(first.timestamp)} au ${formatDay(last.timestamp)}. Valeur finale : ${last.value} sur 100.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grille HORIZONTALE seule : les verticales n'apporteraient rien sur un
              axe de dates déjà gradué, et doubleraient la densité de traits. */}
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />

          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={48}
          />

          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={28}
          />

          {THRESHOLDS.map((threshold) => (
            <ReferenceLine
              key={threshold.value}
              y={threshold.value}
              stroke={GRID_STROKE}
              strokeDasharray="3 3"
            />
          ))}

          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={{ stroke: 'var(--color-border-subtle)', strokeWidth: 1 }}
            formatter={(value, _name, item) => [
              `${value} / 100 · ${item?.payload?.classification ?? ''}`,
              '',
            ]}
          />

          <Area
            type="monotone"
            dataKey="valeur"
            stroke="var(--color-brand)"
            strokeWidth={1.8}
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduced}
            animationDuration={ENTER_DURATION}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0, fill: 'var(--color-brand)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  )
}

function formatDay(timestamp: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    // Fuseau figé : sans lui, un relevé de minuit bascule à la veille pour un
    // lecteur situé à l'ouest de Greenwich.
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}
