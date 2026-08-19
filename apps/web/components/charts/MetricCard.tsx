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
    /* `graduated` : la carte de mesure est LE module de chiffres du site, et donc
       l'endroit où la signature se justifie. Voir `.graduated` dans globals.css. */
    <article className="graduated flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface transition-colors duration-150 hover:border-ink-muted/40">
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

        {/* ── LE NOMBRE EST EN ENCRE, ET LA COULEUR RESTE À L'ICÔNE ───────────
            Il portait la couleur de la métrique. Cette couleur vient de la palette
            de DONNÉES, celle des séries de graphiques : posée sur une capitalisation
            ou un volume, elle disait « série » là où il n'y a qu'une valeur, et
            elle entrait en concurrence avec la seule couleur qui signifie quelque
            chose ici — celle de la hausse et de la baisse.

            La couleur reste sur l'ICÔNE et sur la courbe, où elle identifie la
            métrique sans rien prétendre du marché. Voir la doctrine de l'accent
            dans `globals.css`.

            `.figure` et non `.tabular` : à vingt-quatre pixels, l'espace des
            milliers d'une chasse fixe coupe le nombre en deux. */}
        <p className="figure text-2xl font-semibold leading-tight text-ink">{value}</p>

        {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      </div>

      {series && series.length > 1 ? (
        <AreaSpark data={series} color={color} height={sparkHeight} {...(format ? { format } : {})} />
      ) : null}
    </article>
  )
}
