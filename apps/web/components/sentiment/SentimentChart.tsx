'use client'

import { useMemo } from 'react'

import type { SentimentPoint } from '@zenkuu/data'

import { AreaPlot } from '@/components/charts/AreaPlot'

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
const THRESHOLDS = [25, 45, 56, 75]

export function SentimentChart({
  points,
  height = 260,
}: {
  points: SentimentPoint[]
  height?: number
}) {
  /* La classification est conservée à côté de la valeur : l'infobulle l'affiche, et
     la retrouver depuis la seule valeur obligerait à refaire ici le classement que
     la source a déjà fait — avec le risque de diverger de ses seuils. */
  const classifications = useMemo(
    () => new Map(points.map((point) => [point.timestamp, point.classification])),
    [points],
  )

  const series = useMemo(
    () => [
      {
        id: 'sentiment',
        label: 'Indice',
        color: 'var(--color-brand)',
        points: points.map((point) => ({ x: point.timestamp, y: point.value })),
      },
    ],
    [points],
  )

  if (points.length < 2) return null

  const first = points[0] as SentimentPoint
  const last = points[points.length - 1] as SentimentPoint

  return (
    <figure style={{ height }}>
      <AreaPlot
        series={series}
        height={height}
        fill
        axes
        grid
        yDomain={[0, 100]}
        yTicks={[0, 25, 50, 75, 100]}
        referenceLines={THRESHOLDS}
        formatX={formatDay}
        formatY={(value) => String(Math.round(value))}
        formatTooltipX={formatDay}
        formatTooltipY={(value) => {
          const timestamp = points.find((point) => point.value === value)?.timestamp
          const classification = timestamp ? classifications.get(timestamp) : undefined
          return classification ? `${value} / 100 · ${classification}` : `${value} / 100`
        }}
        ariaLabel={`Évolution de l’indice de sentiment du ${formatDay(first.timestamp)} au ${formatDay(last.timestamp)}. Valeur finale : ${last.value} sur 100.`}
      />
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
