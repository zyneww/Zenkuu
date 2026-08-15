'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { GRID_STROKE } from '@/components/charts/chart-theme'

/**
 * Tracé de séries temporelles en SVG — SANS bibliothèque de graphiques.
 *
 * ── POURQUOI RÉÉCRIRE PLUTÔT QUE PORTER ───────────────────────────────────────
 *
 * Le site embarquait DEUX bibliothèques : `recharts` pour ces courbes-ci, et
 * `lightweight-charts` pour le graphique interactif des fiches d'actif. Mesuré sur
 * la version de production : 536 Ko non compressés répartis sur sept morceaux pour
 * la première, 240 Ko pour la seconde.
 *
 * Ramener ces courbes sur `lightweight-charts` aurait supprimé la première mais
 * AJOUTÉ la seconde à des pages qui ne la chargent pas — tableaux de bord, indice de
 * sentiment, comparateur. On aurait échangé 536 Ko contre 240 Ko sur quelques routes
 * et payé 240 Ko sur d'autres qui ne payaient rien.
 *
 * Or ce qu'il faut ici tient en peu de choses : une courbe, un dégradé, deux axes,
 * une grille horizontale et une infobulle. Aucune de ces cinq choses ne justifie une
 * dépendance ; toutes se dessinent en SVG, que le navigateur sait déjà faire.
 * `lightweight-charts` reste la bonne réponse là où il gagne son poids — chandeliers,
 * volume en sous-panneau, navigation à poignées sur des dizaines de milliers de
 * points — c'est-à-dire sur les fiches d'actif, et nulle part ailleurs.
 *
 * ── SEGMENTS DROITS ET NON COURBES ────────────────────────────────────────────
 *
 * `recharts` interpolait en `monotone`, ce qui arrondit le trajet ENTRE deux
 * relevés. C'est joli et c'est faux : la courbe invente des valeurs que la source
 * n'a jamais fournies, et sur une série peu dense elle peut dessiner un creux là où
 * il n'y en a pas. Les séries d'ici comptent de dizaines à centaines de points, où
 * la différence visuelle est nulle — mais l'honnêteté du tracé, elle, est acquise.
 *
 * ── LA MESURE EST INÉVITABLE ──────────────────────────────────────────────────
 *
 * Un graphique a besoin de sa largeur en pixels pour placer quoi que ce soit, et
 * cette largeur n'existe pas sur le serveur. On mesure donc après le montage, comme
 * le faisait la bibliothèque remplacée. Le repli `viewBox` étirable a été écarté :
 * il déforme les libellés d'axes, qui ne sont pas étirables, eux.
 */

export interface PlotPoint {
  x: number
  y: number
}

export interface PlotSeries {
  id: string
  label: string
  color: string
  points: PlotPoint[]
}

export interface AreaPlotProps {
  series: PlotSeries[]
  height?: number
  /** Dégradé sous la courbe. Réservé au tracé unique : superposés, ils se salissent. */
  fill?: boolean
  /** Bornes imposées. Absentes, elles sont déduites des données avec une marge. */
  yDomain?: [number, number]
  yTicks?: number[]
  xTicks?: number[]
  referenceLines?: number[]
  axes?: boolean
  grid?: boolean
  formatX?: (x: number) => string
  formatY?: (y: number) => string
  /** Titre de l'infobulle — la date, en général. */
  formatTooltipX?: (x: number) => string
  formatTooltipY?: (y: number, series: PlotSeries) => string
  ariaLabel?: string
}

/** Marges internes. Le bas et la gauche ne sont réservés que s'il y a des axes. */
const PAD_WITH_AXES = { top: 8, right: 8, bottom: 20, left: 46 }
const PAD_BARE = { top: 2, right: 0, bottom: 0, left: 0 }

export function AreaPlot({
  series,
  height = 320,
  fill = false,
  yDomain,
  yTicks,
  xTicks,
  referenceLines,
  axes = false,
  grid = false,
  formatX,
  formatY,
  formatTooltipX,
  formatTooltipY,
  ariaLabel,
}: AreaPlotProps) {
  const gradientId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const measure = () => setWidth(node.clientWidth)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const pad = axes ? PAD_WITH_AXES : PAD_BARE
  const innerWidth = Math.max(0, width - pad.left - pad.right)
  const innerHeight = Math.max(0, height - pad.top - pad.bottom)

  /*
   * Domaines et échelles.
   *
   * Le domaine vertical DÉBORDE les données de 8 %. Sans cette marge, le point le
   * plus haut touche le bord supérieur du cadre et le plus bas s'assoit sur l'axe :
   * la courbe paraît rognée alors qu'elle est entière. Le cas d'une série plate est
   * traité à part — un domaine de largeur nulle réduirait le tracé à une ligne de
   * pixels, ou provoquerait une division par zéro.
   */
  const scales = useMemo(() => {
    const all = series.flatMap((entry) => entry.points)
    if (all.length === 0) return null

    const xs = all.map((point) => point.x)
    const ys = all.map((point) => point.y)
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)

    let yMin: number
    let yMax: number
    if (yDomain) {
      ;[yMin, yMax] = yDomain
    } else {
      const low = Math.min(...ys)
      const high = Math.max(...ys)
      const margin = high === low ? Math.abs(high || 1) * 0.1 : (high - low) * 0.08
      yMin = low - margin
      yMax = high + margin
    }

    const xSpan = xMax - xMin || 1
    const ySpan = yMax - yMin || 1

    return {
      xMin,
      xMax,
      yMin,
      yMax,
      toX: (value: number) => pad.left + ((value - xMin) / xSpan) * innerWidth,
      toY: (value: number) => pad.top + (1 - (value - yMin) / ySpan) * innerHeight,
    }
  }, [series, yDomain, pad.left, pad.top, innerWidth, innerHeight])

  /* Graduations verticales par défaut : cinq niveaux, bornes comprises. Au-delà, les
     libellés se touchent sur les hauteurs courantes (260 à 320 pixels). */
  const resolvedYTicks = useMemo(() => {
    if (yTicks) return yTicks
    if (!scales || !axes) return []
    return Array.from({ length: 5 }, (_, index) => scales.yMin + ((scales.yMax - scales.yMin) * index) / 4)
  }, [yTicks, scales, axes])

  const resolvedXTicks = useMemo(() => {
    if (xTicks) return xTicks
    if (!scales || !axes) return []
    return Array.from({ length: 5 }, (_, index) => scales.xMin + ((scales.xMax - scales.xMin) * index) / 4)
  }, [xTicks, scales, axes])

  /*
   * L'infobulle se cale sur la PREMIÈRE série, et les autres sont lues au même rang.
   *
   * Toutes les séries d'un même graphique partagent ici leur grille d'abscisses —
   * c'est vrai du comparateur, qui aligne ses séries avant de les passer, comme des
   * courbes uniques. Chercher indépendamment dans chacune donnerait des valeurs
   * relevées à des instants différents sous un seul et même titre de date.
   */
  const reference = useMemo(() => series[0]?.points ?? [], [series])

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!scales || reference.length === 0 || innerWidth <= 0) return

      const bounds = event.currentTarget.getBoundingClientRect()
      const ratio = (event.clientX - bounds.left - pad.left) / innerWidth
      const target = scales.xMin + ratio * (scales.xMax - scales.xMin)

      let best = 0
      let bestGap = Infinity
      for (let index = 0; index < reference.length; index += 1) {
        const gap = Math.abs((reference[index] as PlotPoint).x - target)
        if (gap < bestGap) {
          bestGap = gap
          best = index
        }
      }
      setHoverIndex(best)
    },
    [scales, reference, innerWidth, pad.left],
  )

  const clearHover = useCallback(() => setHoverIndex(null), [])

  const interactive = formatTooltipY !== undefined

  if (series.length === 0 || reference.length < 2) return null

  return (
    <div ref={containerRef} className="relative" style={{ height, width: '100%' }}>
      {width > 0 && scales ? (
        <svg
          width={width}
          height={height}
          role={ariaLabel ? 'img' : 'presentation'}
          {...(ariaLabel ? { 'aria-label': ariaLabel } : { 'aria-hidden': true })}
          {...(interactive
            ? { onPointerMove, onPointerLeave: clearHover, className: 'touch-pan-y' }
            : {})}
        >
          {fill ? (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series[0]?.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={series[0]?.color} stopOpacity={0} />
              </linearGradient>
            </defs>
          ) : null}

          {/* Grille HORIZONTALE seule. Les verticales découpent une série temporelle
              qui est justement continue, sans rien apprendre de plus que l'axe. */}
          {grid
            ? resolvedYTicks.map((tick) => (
                <line
                  key={`grid-${tick}`}
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={scales.toY(tick)}
                  y2={scales.toY(tick)}
                  stroke={GRID_STROKE}
                  strokeWidth={1}
                />
              ))
            : null}

          {referenceLines?.map((value) => (
            <line
              key={`ref-${value}`}
              x1={pad.left}
              x2={width - pad.right}
              y1={scales.toY(value)}
              y2={scales.toY(value)}
              stroke={GRID_STROKE}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ))}

          <g className="plot-reveal">
            {series.map((entry, index) => {
              const line = entry.points
                .map((point, position) =>
                  `${position === 0 ? 'M' : 'L'}${scales.toX(point.x).toFixed(2)},${scales.toY(point.y).toFixed(2)}`,
                )
                .join(' ')

              return (
                <g key={entry.id}>
                  {fill && index === 0 ? (
                    <path
                      d={`${line} L${scales.toX((entry.points[entry.points.length - 1] as PlotPoint).x).toFixed(2)},${(pad.top + innerHeight).toFixed(2)} L${scales.toX((entry.points[0] as PlotPoint).x).toFixed(2)},${(pad.top + innerHeight).toFixed(2)} Z`}
                      fill={`url(#${gradientId})`}
                      stroke="none"
                    />
                  ) : null}
                  <path
                    d={line}
                    fill="none"
                    stroke={entry.color}
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              )
            })}
          </g>

          {axes ? (
            <g>
              {resolvedYTicks.map((tick) => (
                <text
                  key={`ytick-${tick}`}
                  x={pad.left - 8}
                  y={scales.toY(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--color-ink-muted)"
                  /* La taille vient de la FEUILLE DE STYLE et non de l'attribut : c'est
                     le seul moyen qu'elle suive le plancher de lisibilité mobile, qui
                     remonte la plus petite taille du site à onze pixels sous `sm`. Une
                     graduation d'axe est le premier texte qu'on n'arrive plus à lire sur
                     un téléphone, et le dernier qu'on pense à vérifier. */
                  className="text-micro"
                >
                  {formatY ? formatY(tick) : Math.round(tick)}
                </text>
              ))}

              {resolvedXTicks.map((tick, index) => (
                <text
                  key={`xtick-${tick}`}
                  x={scales.toX(tick)}
                  y={height - 6}
                  /* Les graduations extrêmes sont ancrées par le bord et non par leur
                     centre : centrées, elles dépasseraient du cadre de la moitié de
                     leur largeur, et la première serait tronquée par l'axe vertical. */
                  textAnchor={
                    index === 0 ? 'start' : index === resolvedXTicks.length - 1 ? 'end' : 'middle'
                  }
                  fill="var(--color-ink-muted)"
                  className="text-micro"
                >
                  {formatX ? formatX(tick) : Math.round(tick)}
                </text>
              ))}
            </g>
          ) : null}

          {hoverIndex !== null && reference[hoverIndex] ? (
            <g pointerEvents="none">
              <line
                x1={scales.toX((reference[hoverIndex] as PlotPoint).x)}
                x2={scales.toX((reference[hoverIndex] as PlotPoint).x)}
                y1={pad.top}
                y2={pad.top + innerHeight}
                stroke="var(--color-border-subtle)"
                strokeWidth={1}
              />
              {series.map((entry) => {
                const point = entry.points[hoverIndex]
                if (!point) return null
                return (
                  <circle
                    key={`dot-${entry.id}`}
                    cx={scales.toX(point.x)}
                    cy={scales.toY(point.y)}
                    r={3.5}
                    fill={entry.color}
                  />
                )
              })}
            </g>
          ) : null}
        </svg>
      ) : null}

      {hoverIndex !== null && scales && reference[hoverIndex] && formatTooltipY ? (
        <Tooltip
          x={scales.toX((reference[hoverIndex] as PlotPoint).x)}
          width={width}
          title={formatTooltipX?.((reference[hoverIndex] as PlotPoint).x)}
          rows={series
            .map((entry) => {
              const point = entry.points[hoverIndex]
              return point ? { entry, text: formatTooltipY(point.y, entry) } : null
            })
            .filter((row): row is { entry: PlotSeries; text: string } => row !== null)}
        />
      ) : null}
    </div>
  )
}

/**
 * Infobulle en HTML et non en SVG.
 *
 * Un `<text>` SVG ne se replie pas, ne se met pas en gras à moitié et ne prend pas
 * de fond arrondi sans qu'on dessine soi-même le rectangle derrière, à la largeur
 * qu'on aurait mesurée à la main. Le HTML fait tout cela gratuitement, et hérite au
 * passage des jetons de couche flottante déjà définis pour les menus.
 *
 * Le basculement de côté n'est pas cosmétique : ancrée toujours à gauche, l'infobulle
 * sort du cadre dès que le curseur approche du bord droit — c'est-à-dire justement
 * sur la valeur la plus récente, celle qu'on consulte le plus.
 */
function Tooltip({
  x,
  width,
  title,
  rows,
}: {
  x: number
  width: number
  title?: string | undefined
  rows: { entry: PlotSeries; text: string }[]
}) {
  const flip = x > width * 0.6

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[7rem] rounded-card border border-border-subtle bg-overlay px-2.5 py-2 text-xs shadow-overlay"
      style={flip ? { right: width - x + 10 } : { left: x + 10 }}
    >
      {title ? <p className="mb-1 text-[0.6875rem] text-ink-muted">{title}</p> : null}
      {rows.map((row) => (
        <p key={row.entry.id} className="flex items-center gap-1.5 whitespace-nowrap text-ink">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: row.entry.color }}
          />
          {rows.length > 1 ? <span className="text-ink-muted">{row.entry.label}</span> : null}
          <span className="tabular font-medium">{row.text}</span>
        </p>
      ))}
    </div>
  )
}
