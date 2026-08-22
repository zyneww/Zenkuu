'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatCompactAxis, formatPercent, formatShare } from '@zenkuu/ui'

import { GRID_DASH, GRID_STROKE } from '@/components/charts/chart-theme'
import { useReducedMotion } from '@/components/charts/useReducedMotion'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FIGURE À BARRES — SIMPLE OU GROUPÉE, AVEC AXE SECONDAIRE FACULTATIF
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE SERT, ET POURQUOI ELLE EST GÉNÉRIQUE ─────────────────────────
 *
 * Sept des huit cartes d'analyse de l'accueil montrent la même chose sous des noms
 * différents : quelques catégories en abscisse, une ou deux mesures par catégorie.
 * Offre restant à émettre, volume par place, dominance, part de secteur — toutes
 * répondent à « combien, pour chacun de ceux-là ».
 *
 * Écrire sept fois la même figure aurait garanti sept réglages d'axe divergents. Elle
 * est donc écrite une fois et paramétrée par ses données.
 *
 * ── L'AXE SECONDAIRE N'EST PAS UNE COMMODITÉ ────────────────────────────────
 *
 * Il n'apparaît que si la seconde série est déclarée `axis: 'right'`, et cela ne se
 * fait que pour opposer une VALEUR ABSOLUE à une PART. Superposer un volume en euros
 * et un pourcentage sur un axe unique rendrait le pourcentage invisible — un volume
 * se compte en milliards, une part plafonne à cent.
 *
 * ⚠️ Deux axes se lisent mal, et c'est un fait établi : rien ne dit lequel gouverne
 * quelle barre en dehors de la couleur. On ne l'emploie donc jamais pour deux
 * grandeurs de MÊME nature, où le lecteur croirait comparer des hauteurs comparables.
 *
 * ── LES COULEURS SONT DES JETONS, JAMAIS DES VALEURS ────────────────────────
 *
 * Recharts reçoit la chaîne `var(--color-data-1)` et la pose telle quelle dans le
 * SVG : c'est le NAVIGATEUR qui la résout à la peinture. Les figures suivent donc la
 * bascule de thème sans être re-rendues, et sans qu'aucune d'elles ne lise le thème.
 */

export interface BarSeries {
  /** Clé de la mesure dans chaque entrée de `data`. */
  key: string
  label: string
  color: string
  /** Axe de rattachement. `right` réservé à l'opposition valeur / part. */
  axis?: 'left' | 'right'
  /** Mise en forme de l'axe et de l'infobulle. */
  format?: 'compact' | 'share' | 'percent'
}

export interface BarFigureProps {
  /** Une entrée par catégorie. `label` porte l'abscisse, le reste les mesures. */
  data: { label: string; [key: string]: string | number | undefined }[]
  series: BarSeries[]
  height?: number
  /**
   * Teinter chaque barre selon le SIGNE de sa valeur plutôt que selon sa série.
   *
   * Réservé aux figures de variation, où la couleur porte déjà un sens sur tout le
   * site — vert pour la hausse, rouge pour la baisse. Une barre de variation peinte
   * dans une teinte de série dirait « ceci est la série 2 » là où le lecteur attend
   * « ceci a monté ».
   *
   * Sans effet sur une figure à plusieurs séries : la couleur y distingue les séries,
   * et deux sens pour une seule couleur est précisément ce que le §3.1 interdit.
   */
  signed?: boolean
  ariaLabel: string
}

/** Hauteur de la zone de légende, réservée par Recharts sous le tracé. */
const LEGEND_HEIGHT = 24

const AXIS_TICK = { fill: 'var(--color-ink-muted)', fontSize: 11 }

function render(value: number, format: BarSeries['format']): string {
  const rendered =
    format === 'share'
      ? formatShare(value)
      : format === 'percent'
        ? formatPercent(value)
        : formatCompactAxis(value)
  /* `null` remonte quand la valeur n'est pas finie. On rend un tiret plutôt qu'un
     zéro : une mesure absente reste absente (§5). */
  return rendered ?? '—'
}

export function BarFigure({
  data,
  series,
  height = 260,
  signed = false,
  ariaLabel,
}: BarFigureProps) {
  const reduced = useReducedMotion()
  const hasRight = series.some((entry) => entry.axis === 'right')
  const left = series.find((entry) => entry.axis !== 'right')
  const right = series.find((entry) => entry.axis === 'right')

  return (
    /* `role="img"` sur le CONTENEUR et non sur le SVG : Recharts régénère son SVG à
       chaque mesure de largeur, et les attributs posés dessus ne survivent pas. Le
       libellé décrit ce que la figure montre, puisqu'un lecteur d'écran ne peut pas
       lire des barres. */
    <div role="img" aria-label={ariaLabel} className="w-full">
      {/* `width="100%"` sur un parent de largeur DÉFINIE : dans une colonne flex, la
          mesure de `ResponsiveContainer` renvoie zéro et la figure se tasse dans un
          coin — elle s'affiche, simplement minuscule, ce qui ressemble à un défaut de
          données plutôt qu'à un défaut de mise en page. */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: hasRight ? 4 : 8, bottom: 0, left: -8 }}>
          {/* Horizontale seule : une grille verticale sur des catégories nommées
              double les séparations que les barres dessinent déjà. */}
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray={GRID_DASH} />

          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval={0}
            height={28}
          />

          <YAxis
            yAxisId="left"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => render(value, left?.format)}
          />

          {hasRight ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => render(value, right?.format)}
            />
          ) : null}

          <Tooltip
            cursor={{ fill: 'var(--color-surface-muted)' }}
            contentStyle={{
              background: 'var(--color-overlay)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-control)',
              fontSize: 12,
              boxShadow: 'var(--shadow-overlay)',
            }}
            labelStyle={{ color: 'var(--color-ink)', fontWeight: 600 }}
            itemStyle={{ color: 'var(--color-ink-muted)' }}
            formatter={(value, name) => {
              const entry = series.find((candidate) => candidate.label === name)
              return [render(Number(value), entry?.format), name]
            }}
          />

          {series.length > 1 ? (
            <Legend
              height={LEGEND_HEIGHT}
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-muted)' }}
            />
          ) : null}

          {series.map((entry) => (
            <Bar
              key={entry.key}
              yAxisId={entry.axis === 'right' ? 'right' : 'left'}
              dataKey={entry.key}
              name={entry.label}
              fill={entry.color}
              radius={[2, 2, 0, 0]}
              maxBarSize={38}
              isAnimationActive={!reduced}
            >
              {/* Teinture au signe : une `<Cell>` par barre, ce qui est la seule
                  façon d'attribuer une couleur PAR POINT chez Recharts — `fill` est
                  une propriété de la série entière. */}
              {signed && series.length === 1
                ? data.map((point, index) => {
                    const value = Number(point[entry.key] ?? 0)
                    return (
                      <Cell
                        key={index}
                        fill={value < 0 ? 'var(--color-down)' : 'var(--color-up)'}
                      />
                    )
                  })
                : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
