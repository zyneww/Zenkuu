'use client'

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  CartesianGrid,
  Line,
  LineChart,
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
  /**
   * La figure prend la hauteur disponible, `height` devenant un MINIMUM.
   *
   * Même motif que `BarFigure` : les cartes d'analyse sont égalisées par leur grille,
   * et une figure à hauteur fixe y laisse un vide sous elle. Voir la note de `grow`
   * là-bas pour la raison du `minHeight`.
   */
  grow?: boolean
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
  grow = false,
  ariaLabel,
}: LineFigureProps) {
  const reduced = useReducedMotion()

  return (
    <div className={`flex w-full flex-col gap-2 ${grow ? 'min-h-0 flex-1' : ''}`}>
      {/* `ChartContainer` : voir la note de `BarFigure`, qui explique ce qu'il
          neutralise dans les styles écrits en dur par Recharts et pourquoi
          `aspect-auto` doit écraser son rapport par défaut. */}
      <ChartContainer
        config={{}}
        role="img"
        aria-label={ariaLabel}
        className={`aspect-auto ${grow ? 'min-h-0 w-full flex-1' : 'w-full'}`}
        style={grow ? { minHeight: height } : { height }}
      >
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

            {/* `ChartTooltipContent` — voir la note de `BarFigure` : une seule
                définition d'infobulle pour toutes les figures, et une pastille de
                couleur qui rattache chaque nombre à sa courbe. Indispensable ici, où
                sept séries peuvent se superposer. */}
            <ChartTooltip
              /* Verticale tiretée dans l'encre atténuée — voir `AreaPlot`, où le motif
                 « 4 4 » et le choix du ton sont expliqués. Les figures d'analyse
                 désignent l'instant survolé exactement comme les courbes de cours. */
              cursor={{
                stroke: 'var(--color-ink-muted)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
                strokeOpacity: 0.8,
              }}
              content={
                <ChartTooltipContent
                  className="border-border-subtle bg-overlay shadow-overlay"
                  formatter={(value, name) => {
                    const entry = series.find((candidate) => candidate.label === name)
                    return (
                      <>
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-pill"
                          style={{ background: entry?.color }}
                        />
                        <span className="flex-1 text-ink-muted">{name}</span>
                        <span className="tabular font-medium text-ink">
                          {render(Number(value), format)}
                        </span>
                      </>
                    )
                  }}
                />
              }
            />

            {series.map((entry) => (
              <Line
                key={entry.key}
                type="linear"
                dataKey={entry.key}
                name={entry.label}
                stroke={entry.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                /* Points masqués au repos, révélés au survol : à sept séries, une
                   pastille par relevé transforme la figure en semis. */
                dot={false}
                /* Cerclée du fond : à sept séries superposées, c'est l'anneau — et non
                   la teinte — qui dit laquelle des pastilles est devant. Voir
                   `AreaPlot`. */
                activeDot={{
                  r: 4,
                  fill: entry.color,
                  stroke: 'var(--color-canvas)',
                  strokeWidth: 2,
                }}
                isAnimationActive={!reduced}
              />
            ))}
          </LineChart>
      </ChartContainer>

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
