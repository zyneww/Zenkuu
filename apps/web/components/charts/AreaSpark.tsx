'use client'

import type { Formatters } from '@zenkuu/ui'

import { useFormatters } from '@/components/locale/useFormatters'
import { useLocale } from 'next-intl'
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

function formatValue(
  value: number,
  format: SparkFormat,
  locale: string,
  nombres: Formatters,
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value)
    case 'compact':
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)
    case 'percent':
      return `${nombres.fixed(value, 2) ?? '—'} %`
    default:
      return new Intl.NumberFormat(locale).format(value)
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
  /** Pixels, ou `'fill'` pour épouser la hauteur du conteneur — voir `AreaPlot`. */
  height?: number | 'fill'
  /** Format de l'infobulle. Absent, aucune infobulle n'est affichée. */
  format?: SparkFormat
}) {
  const locale = useLocale()
  const nombres = useFormatters()

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
      /* Une étincelle vit dans une cellule de tableau : elle n'a pas la place d'une
         phrase, et le garde ci-dessus l'a déjà écartée quand il n'y a rien à tracer. */
      quiet
      {...(format ? { formatTooltipY: (value: number) => formatValue(value, format, locale, nombres) } : {})}
    />
  )
}
