'use client'

import { useMemo, useRef, useState } from 'react'

import type { SentimentPoint } from '@zenkuu/data'
import { formatCompactAxis } from '@zenkuu/ui'

import { GRID_DASH, GRID_STROKE } from '@/components/charts/chart-theme'
import { sentimentBand } from '@/components/sentiment/bands'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'HISTORIQUE EN BARRES COLORÉES, AVEC LE COURS DU BITCOIN EN SURIMPRESSION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI DES BARRES ET NON UNE COURBE ──────────────────────────────────
 *
 * C'est la figure de la référence, et le choix porte du sens. Une courbe d'indice
 * relie des relevés QUOTIDIENS indépendants, ce qui suggère une continuité que la
 * donnée n'a pas — l'indice n'est pas mesuré en continu, il est publié une fois par
 * jour. Surtout, une courbe unie ne peut pas être colorée par zone : c'est la teinte
 * de chaque barre qui fait qu'on lit d'un coup d'œil « trois mois de peur, puis un
 * basculement », là où une ligne bleue oblige à comparer sa hauteur à des repères.
 *
 * ── LE COURS DU BITCOIN EST LE CONTRE-CHAMP ────────────────────────────────
 *
 * Sans lui, l'indice ne se rapporte à rien : c'est en voyant que l'avidité précède ou
 * suit les sommets qu'on comprend ce qu'il mesure. Il a donc SON axe, à droite —
 * opposer un prix en dizaines de milliers à un indice borné à cent sur une échelle
 * unique écraserait l'un des deux.
 *
 * ⚠️ Il est facultatif. Si l'appel du cours échoue, la figure rend ses barres et
 * l'axe de droite DISPARAÎT, plutôt que d'afficher un axe vide (§5).
 *
 * ── TRACÉ MAISON, COMME `AreaPlot` ─────────────────────────────────────────
 *
 * Le projet a retiré `recharts` de ses courbes. Trois cent soixante-cinq rectangles
 * et une polyligne ne justifient pas de le réintroduire : la géométrie tient dans ce
 * fichier, et le seul état est la position du pointeur.
 */

const PAD_TOP = 10
const PAD_BOTTOM = 22
const PAD_LEFT = 32
/** Réservé à l'axe des prix ; ramené à `PAD_LEFT` quand le cours manque. */
const PAD_RIGHT = 52

const LEFT_TICKS = [0, 25, 50, 75, 100]

export interface PricePoint {
  timestamp: number
  value: number
}

export function SentimentBars({
  points,
  prices,
  height = 280,
}: {
  points: SentimentPoint[]
  /** Cours du bitcoin sur la même fenêtre. Vide quand la source n'a rien rendu. */
  prices: PricePoint[]
  height?: number
}) {
  const frame = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  /* Repère de 1000 unités de large, mis à l'échelle par le navigateur : la figure
     n'a pas besoin de connaître sa largeur en pixels, donc pas d'observateur de
     redimensionnement ni de rendu au montage. */
  const WIDTH = 1000
  const innerLeft = PAD_LEFT
  const hasPrices = prices.length > 1
  const innerRight = WIDTH - (hasPrices ? PAD_RIGHT : PAD_LEFT)
  const innerW = innerRight - innerLeft
  const innerTop = PAD_TOP
  const innerBottom = height - PAD_BOTTOM
  const innerH = innerBottom - innerTop

  const priceScale = useMemo(() => {
    if (!hasPrices) return null
    const values = prices.map((price) => price.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    /* Série plate : un dénominateur nul renverrait `Infinity` et la polyligne
       sortirait du cadre. On la pose alors au milieu. */
    if (max <= min) return { min, max, at: () => innerTop + innerH / 2 }
    return {
      min,
      max,
      at: (value: number) => innerBottom - ((value - min) / (max - min)) * innerH,
    }
  }, [prices, hasPrices, innerBottom, innerH, innerTop])

  if (points.length < 2) return null

  const step = innerW / points.length
  const barWidth = Math.max(1, step * 0.8)

  const xAt = (index: number) => innerLeft + index * step + step / 2
  const yAt = (value: number) => innerBottom - (value / 100) * innerH

  /* Les dates sont prises DANS la série, à intervalle régulier d'indices : calculer
     des dates rondes obligerait à chercher le point le plus proche de chacune, et
     l'indice ayant des trous, la graduation ne tomberait pas sur une barre. */
  const dateTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round((index * (points.length - 1)) / 4),
  )

  const priceLine =
    priceScale && hasPrices
      ? prices
          .map((price, index) => {
            const x = innerLeft + (index / Math.max(1, prices.length - 1)) * innerW
            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${priceScale.at(price.value).toFixed(1)}`
          })
          .join(' ')
      : null

  const active = hover !== null ? points[hover] : undefined

  return (
    <div ref={frame} className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Évolution de l’indice de sentiment sur ${points.length} jours. Valeur finale : ${(points[points.length - 1] as SentimentPoint).value} sur 100.`}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          /* Le pointeur est en pixels d'écran, la figure en unités de repère : le
             rapport des deux largeurs ramène l'un dans l'autre. */
          const ratio = WIDTH / box.width
          const x = (event.clientX - box.left) * ratio
          const index = Math.floor((x - innerLeft) / step)
          setHover(index >= 0 && index < points.length ? index : null)
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* Grille et graduations de l'indice */}
        {LEFT_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={innerLeft}
              y1={yAt(tick)}
              x2={innerRight}
              y2={yAt(tick)}
              stroke={GRID_STROKE}
              strokeDasharray={GRID_DASH}
            />
            <text
              x={innerLeft - 6}
              y={yAt(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-ink-muted text-[11px] tabular-nums"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Barres — une par relevé, teintée de sa zone */}
        {points.map((point, index) => {
          const top = yAt(point.value)
          return (
            <rect
              key={point.timestamp}
              x={xAt(index) - barWidth / 2}
              y={top}
              width={barWidth}
              height={Math.max(1, innerBottom - top)}
              fill={sentimentBand(point.value).color}
              opacity={hover === null || hover === index ? 1 : 0.55}
            />
          )
        })}

        {/* Cours du bitcoin, par-dessus les barres */}
        {priceLine ? (
          <path
            d={priceLine}
            fill="none"
            className="stroke-ink"
            strokeWidth={1.5}
            strokeOpacity={0.75}
            strokeLinejoin="round"
          />
        ) : null}

        {priceScale ? (
          <>
            <text
              x={innerRight + 6}
              y={innerTop}
              dominantBaseline="middle"
              className="fill-ink-muted text-[11px] tabular-nums"
            >
              {formatCompactAxis(priceScale.max) ?? ''}
            </text>
            <text
              x={innerRight + 6}
              y={innerBottom}
              dominantBaseline="middle"
              className="fill-ink-muted text-[11px] tabular-nums"
            >
              {formatCompactAxis(priceScale.min) ?? ''}
            </text>
          </>
        ) : null}

        {/* Dates */}
        {dateTicks.map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={height - 6}
            textAnchor="middle"
            className="fill-ink-muted text-[11px]"
          >
            {formatDay((points[index] as SentimentPoint).timestamp)}
          </text>
        ))}

        {hover !== null && points[hover] ? (
          <line
            x1={xAt(hover)}
            y1={innerTop}
            x2={xAt(hover)}
            y2={innerBottom}
            className="stroke-ink"
            strokeOpacity={0.35}
          />
        ) : null}
      </svg>

      {/* Infobulle en HTML et non en SVG : elle porte du texte mis en forme, que les
          classes utilitaires habillent directement. Positionnée en pourcentage de la
          largeur pour suivre la mise à l'échelle du repère. */}
      {active ? (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-card border border-border-subtle bg-overlay px-2.5 py-1.5 text-xs shadow-overlay"
          style={{
            /* Bornée à 6 %–94 % : contre le bord, une bulle centrée sur sa barre
               sortirait du cadre. */
            left: `${Math.min(94, Math.max(6, ((xAt(hover as number) / WIDTH) * 100)))}%`,
          }}
        >
          <p className="whitespace-nowrap text-ink-muted">{formatFullDay(active.timestamp)}</p>
          <p className="whitespace-nowrap font-semibold text-ink">
            {active.value} / 100
            <span
              className="ml-1.5 font-normal"
              style={{ color: sentimentBand(active.value).color }}
            >
              {sentimentBand(active.value).short}
            </span>
          </p>
        </div>
      ) : null}
    </div>
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

function formatFullDay(timestamp: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}
