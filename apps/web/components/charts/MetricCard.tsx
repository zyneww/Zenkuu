import type { ReactNode } from 'react'

import { AreaSpark, type SparkFormat } from '@/components/charts/AreaSpark'

/**
 * Carte de métrique — le widget signature d'un tableau de bord de données.
 *
 * Structure : libellé discret, grand nombre dans la teinte de la carte, précision,
 * puis courbe en aire collée au bas. Cet ordre n'est pas décoratif — il suit le
 * parcours du regard : « de quoi parle-t-on », « combien », « depuis quand ».
 *
 * La courbe est calée AU BAS de la carte et déborde jusqu'aux bords, sans marge.
 * C'est ce qui la fait lire comme un fond de carte plutôt que comme un graphique
 * miniature, et c'est ce qui distingue ce motif d'une simple carte avec vignette.
 *
 * `color` est la teinte de la métrique : elle colore le nombre ET la courbe.
 * L'accord des deux est ce qui rattache le chiffre à sa forme quand plusieurs
 * cartes s'alignent — sans lui, quatre cartes multicolores deviennent illisibles.
 */
export function MetricCard({
  label,
  value,
  hint,
  color = 'var(--color-data-1)',
  icon,
  series,
  sparkHeight = 56,
  format,
  action,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  color?: string
  icon?: ReactNode
  series?: { x: string | number; y: number }[]
  /**
   * Hauteur de la courbe, en pixels.
   *
   * Réglable parce que cette carte sert dans deux contextes de hauteurs très
   * différentes. Dans une colonne étroite, 56 px suffisent à donner la forme de la
   * série. Dans une bande étirée à la hauteur d'un voisin plus haut, la même valeur
   * laisse cent pixels de vide entre le chiffre et la courbe — le tracé étant calé
   * en bas, c'est le blanc du milieu qui absorbe tout l'étirement.
   */
  sparkHeight?: number
  /** Format de l'infobulle de la courbe — un mot-clé, non une fonction (voir `AreaSpark`). */
  format?: SparkFormat
  action?: ReactNode
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface transition-colors duration-150 hover:border-ink-muted/40">
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            {icon ? (
              <span className="flex h-4 w-4 items-center justify-center" style={{ color }}>
                {icon}
              </span>
            ) : null}
            {label}
          </h3>
          {action}
        </div>

        {/* Le nombre porte la couleur de la métrique. Il est en chasse fixe pour que
            deux cartes voisines alignent leurs chiffres malgré des valeurs de
            largeurs différentes. */}
        <p className="tabular text-2xl font-semibold leading-tight" style={{ color }}>
          {value}
        </p>

        {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      </div>

      {series && series.length > 1 ? (
        <AreaSpark data={series} color={color} height={sparkHeight} {...(format ? { format } : {})} />
      ) : null}
    </article>
  )
}
