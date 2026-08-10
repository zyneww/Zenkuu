import type { SentimentPoint } from '@zenith/data'

/**
 * Courbe historique de l'indice de sentiment.
 *
 * Rendue en SVG côté serveur, sans bibliothèque : la série est une simple suite de
 * valeurs entre 0 et 100, et l'axe vertical est FIXE — c'est même le point qui
 * distingue ce graphique d'une courbe de prix. Une échelle auto-ajustée ferait
 * paraître spectaculaire une oscillation entre 45 et 55, alors que l'intérêt de
 * l'indice est justement de situer une valeur sur une échelle connue et invariable.
 *
 * Les bandes de fond rappellent cette échelle sans avoir à la lire : peur en bas,
 * avidité en haut. Elles remplacent une légende, qu'il faudrait sinon parcourir des
 * yeux à chaque lecture.
 */

const WIDTH = 800
const HEIGHT = 240
const PADDING = { top: 8, right: 8, bottom: 22, left: 30 }

/** Bandes de l'échelle, alignées sur les seuils de `classify` (§ SidePanels). */
const BANDS = [
  { from: 0, to: 24, label: 'Peur extrême', color: 'var(--color-down)' },
  { from: 25, to: 44, label: 'Peur', color: 'var(--color-down)' },
  { from: 45, to: 55, label: 'Neutre', color: 'var(--color-ink-muted)' },
  { from: 56, to: 74, label: 'Avidité', color: 'var(--color-up)' },
  { from: 75, to: 100, label: 'Avidité extrême', color: 'var(--color-up)' },
]

export function SentimentChart({
  points,
  label,
}: {
  points: SentimentPoint[]
  label: string
}) {
  if (points.length < 2) return null

  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  const toX = (index: number) => PADDING.left + (index / (points.length - 1)) * plotWidth
  // Échelle FIXE de 0 à 100 : voir l'explication en tête de fichier.
  const toY = (value: number) => PADDING.top + plotHeight - (value / 100) * plotHeight

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${toX(index).toFixed(1)},${toY(point.value).toFixed(1)}`)
    .join(' ')

  const area = `${line} L${toX(points.length - 1).toFixed(1)},${(PADDING.top + plotHeight).toFixed(1)} L${PADDING.left},${(PADDING.top + plotHeight).toFixed(1)} Z`

  const last = points[points.length - 1] as SentimentPoint
  const first = points[0] as SentimentPoint

  // Quatre repères de date au maximum : au-delà, les libellés se chevauchent sur
  // mobile et deviennent illisibles.
  const ticks = [0, Math.floor(points.length / 3), Math.floor((points.length * 2) / 3), points.length - 1]

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Évolution de l’indice de sentiment ${label}. Du ${formatDay(first.timestamp)} au ${formatDay(last.timestamp)}, valeur finale ${last.value} sur 100.`}
      >
        {BANDS.map((band) => {
          const y = toY(band.to)
          const height = toY(band.from) - toY(band.to)
          return (
            <rect
              key={band.label}
              x={PADDING.left}
              y={y}
              width={plotWidth}
              height={height}
              fill={band.color}
              opacity={0.06}
            />
          )
        })}

        {/* Graduations horizontales aux seuils, pas tous les 20 : ce sont les
            frontières entre bandes qui donnent du sens, pas des paliers réguliers. */}
        {[25, 45, 56, 75].map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              y1={toY(value)}
              x2={WIDTH - PADDING.right}
              y2={toY(value)}
              stroke="var(--color-border-subtle)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={PADDING.left - 6}
              y={toY(value) + 3}
              textAnchor="end"
              className="fill-[var(--color-ink-muted)] text-[9px]"
            >
              {value}
            </text>
          </g>
        ))}

        <path d={area} fill="var(--color-brand)" opacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle cx={toX(points.length - 1)} cy={toY(last.value)} r="3.5" fill="var(--color-brand)" />

        {ticks.map((index) => {
          const point = points[index]
          if (!point) return null
          return (
            <text
              key={index}
              x={toX(index)}
              y={HEIGHT - 6}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              className="fill-[var(--color-ink-muted)] text-[9px]"
            >
              {formatDay(point.timestamp)}
            </text>
          )
        })}
      </svg>
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
