'use client'

import { useMemo } from 'react'

import { AreaPlot } from '@/components/charts/AreaPlot'

/**
 * Courbe en aire, dégradé vers la transparence.
 *
 * C'est le motif visuel qui donne aux tableaux de bord de données leur allure : une
 * ligne fine, un dégradé qui s'éteint vers le bas, aucun axe, aucune grille. La
 * courbe ne sert pas à lire une valeur — le nombre au-dessus s'en charge — mais à
 * donner la FORME de la série d'un coup d'œil.
 *
 * Le tracé lui-même est délégué à `AreaPlot`, qui dessine en SVG sans bibliothèque.
 * Ce composant-ci ne garde que ce qui lui est propre : le formatage français des
 * valeurs, et le choix de n'afficher aucun axe.
 */

/**
 * Formats d'infobulle, désignés par un MOT-CLÉ et non par une fonction.
 *
 * Une fonction ne franchit pas la frontière serveur/client : React ne sait pas
 * sérialiser une fermeture, et Next.js refuse le passage. Or les cartes qui
 * appellent ce composant sont rendues côté serveur. Le mot-clé, lui, est une
 * chaîne — il traverse sans difficulté, et le formatage a lieu ici.
 */
export type SparkFormat = 'currency' | 'compact' | 'number' | 'percent'

function formatValue(value: number, format: SparkFormat): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value)
    case 'compact':
      return new Intl.NumberFormat('fr-FR', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)
    case 'percent':
      return `${value.toFixed(2).replace('.', ',')} %`
    default:
      return new Intl.NumberFormat('fr-FR').format(value)
  }
}

export function AreaSpark({
  data,
  color,
  height = 48,
  format,
}: {
  data: { x: string | number; y: number }[]
  color: string
  height?: number
  /** Format de l'infobulle. Absent, aucune infobulle n'est affichée. */
  format?: SparkFormat
}) {
  /* Les abscisses arrivent parfois en chaînes (dates déjà mises en forme par
     l'appelant). Le rang dans la série fait alors un axe parfaitement valable :
     ces points sont régulièrement espacés, et rien ici ne les date. */
  const series = useMemo(
    () => [
      {
        id: 'spark',
        label: '',
        color,
        points: data.map((point, index) => ({
          x: typeof point.x === 'number' ? point.x : index,
          y: point.y,
        })),
      },
    ],
    [data, color],
  )

  if (data.length < 2) return null

  return (
    <AreaPlot
      series={series}
      height={height}
      fill
      {...(format ? { formatTooltipY: (value: number) => formatValue(value, format) } : {})}
    />
  )
}
