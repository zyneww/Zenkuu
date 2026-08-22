'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatCompactAxis, formatPercent, formatShare } from '@zenkuu/ui'

import { GRID_DASH, GRID_STROKE } from '@/components/charts/chart-theme'
import { useReducedMotion } from '@/components/charts/useReducedMotion'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FIGURE À COURBES MULTIPLES — PLUSIEURS SÉRIES SUR UN MÊME AXE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE AJOUTE À `AreaPlot`, QUI EXISTE DÉJÀ ─────────────────────────
 *
 * `AreaPlot` sait tracer plusieurs séries, et il le fait en SVG sans dépendance.
 * Cette figure-ci ne le remplace pas : elle sert les cartes d'ANALYSE de l'accueil,
 * où la légende, l'infobulle multi-séries et l'axe catégoriel viennent de Recharts,
 * adopté pour cette refonte.
 *
 * `AreaPlot` garde les courbes de prix — carte de tête, fiches d'actif, comparateur —
 * et `Sparkline` garde les étincelles de tableau. Ce partage n'est pas une hésitation :
 * un tableau de cotations compte jusqu'à cinquante étincelles par page, et cinquante
 * instances Recharts y coûteraient bien plus que le gain visuel.
 *
 * ── SEGMENTS DROITS, JAMAIS D'INTERPOLATION COURBE ──────────────────────────
 *
 * `type="linear"` et non `monotone`. Une interpolation courbe arrondit le trajet
 * ENTRE deux relevés : c'est joli et c'est faux, puisque la courbe invente alors des
 * valeurs que la source n'a jamais publiées. Sur une série de sept points — la
 * densité de ces cartes — elle peut dessiner un creux là où il n'y en a pas.
 */

export interface LineSeries {
  key: string
  label: string
  color: string
}

export interface LineFigureProps {
  data: { label: string; [key: string]: string | number | undefined }[]
  series: LineSeries[]
  height?: number
  format?: 'compact' | 'share' | 'percent'
  ariaLabel: string
}

const AXIS_TICK = { fill: 'var(--color-ink-muted)', fontSize: 11 }

function render(value: number, format: LineFigureProps['format']): string {
  const rendered =
    format === 'share'
      ? formatShare(value)
      : format === 'percent'
        ? formatPercent(value)
        : formatCompactAxis(value)
  return rendered ?? '—'
}

export function LineFigure({
  data,
  series,
  height = 260,
  format = 'compact',
  ariaLabel,
}: LineFigureProps) {
  const reduced = useReducedMotion()

  return (
    <div className="flex w-full flex-col gap-2">
      <div role="img" aria-label={ariaLabel} className="w-full">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray={GRID_DASH} />

            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              /* `preserveStartEnd` : sur une fenêtre de trente points, afficher les
                 trente abscisses les superpose jusqu'à l'illisible. Les deux bornes
                 sont en revanche toujours rendues — sans elles, on ne sait plus quelle
                 période la figure couvre. */
              interval="preserveStartEnd"
              minTickGap={24}
              height={28}
            />

            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(value: number) => render(value, format)}
            />

            <Tooltip
              cursor={{ stroke: 'var(--color-border-subtle)', strokeWidth: 1 }}
              contentStyle={{
                background: 'var(--color-overlay)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-control)',
                fontSize: 12,
                boxShadow: 'var(--shadow-overlay)',
              }}
              labelStyle={{ color: 'var(--color-ink)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--color-ink-muted)' }}
              formatter={(value, name) => [render(Number(value), format), name]}
            />

            {series.map((entry) => (
              <Line
                key={entry.key}
                type="linear"
                dataKey={entry.key}
                name={entry.label}
                stroke={entry.color}
                strokeWidth={1.5}
                /* Points masqués au repos, révélés au survol : à sept séries, une
                   pastille par relevé transforme la figure en semis. */
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={!reduced}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* LÉGENDE ÉCRITE À LA MAIN plutôt que `<Legend>` de Recharts. La sienne se
          place dans la boîte du graphique et lui prend de la hauteur ; celle-ci vit
          en dessous, hors du tracé, et se replie sur plusieurs lignes quand les
          libellés sont longs — ce que la sienne ne sait pas faire. */}
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {series.map((entry) => (
          <li key={entry.key} className="flex items-center gap-1.5 text-micro text-ink-muted">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-pill"
              style={{ background: entry.color }}
            />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
