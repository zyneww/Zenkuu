'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { useId } from 'react'

import {
  ENTER_DURATION,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from '@/components/charts/chart-theme'
import { useReducedMotion } from '@/components/charts/useReducedMotion'

/**
 * Courbe en aire, dégradé vers la transparence.
 *
 * C'est le motif visuel qui donne aux tableaux de bord de données leur allure : une
 * ligne fine, un dégradé qui s'éteint vers le bas, aucun axe, aucune grille. La
 * courbe ne sert pas à lire une valeur — le nombre au-dessus s'en charge — mais à
 * donner la FORME de la série d'un coup d'œil.
 *
 * L'identifiant du dégradé passe par `useId()`. Sans cela, deux cartes sur la même
 * page partageraient le même `<linearGradient id="…">`, et toutes prendraient la
 * couleur de la première déclarée — un défaut classique et déroutant, puisque la
 * ligne, elle, garde sa bonne couleur.
 *
 * `YAxis` est déclaré mais MASQUÉ : sans lui, Recharts cadre la série entre son
 * minimum et son maximum, ce qui fait toucher les bords à la courbe. Le domaine
 * élargi de quelques pourcents lui laisse respirer.
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
  const gradientId = useId()
  const reduced = useReducedMotion()

  if (data.length < 2) return null

  const values = data.map((point) => point.y)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Série parfaitement plate : un domaine de largeur nulle ferait disparaître le
  // tracé. On ouvre alors une fenêtre arbitraire autour de la valeur.
  const pad = max === min ? Math.abs(max || 1) * 0.1 : (max - min) * 0.08

  return (
    /*
     * `width: '100%'` est INDISPENSABLE, pas décoratif.
     *
     * `ResponsiveContainer` mesure son parent pour se dimensionner. Dans une colonne
     * flex, ce parent n'a pas de largeur intrinsèque : la mesure renvoie une valeur
     * proche de zéro et la courbe se tasse dans un coin. Le symptôme est trompeur —
     * le graphique s'affiche, simplement minuscule, ce qui ressemble à un problème
     * de données plutôt qu'à un problème de mise en page.
     */
    <div style={{ height, width: '100%' }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <YAxis hide domain={[min - pad, max + pad]} />

          {format ? (
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              cursor={{ stroke: 'var(--color-border-subtle)', strokeWidth: 1 }}
              formatter={(value) => [formatValue(Number(value), format), '']}
            />
          ) : null}

          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            // `false` et non `0` : Recharts traite la durée nulle comme « animer en
            // 0 ms », ce qui déclenche quand même un cycle de rendu supplémentaire.
            isAnimationActive={!reduced}
            animationDuration={ENTER_DURATION}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
