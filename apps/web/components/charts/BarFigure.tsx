'use client'

import { useId } from 'react'

import type { Formatters } from '@zenkuu/ui'

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  XAxis,
  YAxis,
} from 'recharts'


import { GRID_DASH, GRID_STROKE } from '@/components/charts/chart-theme'
import { useReducedMotion } from '@/components/charts/useReducedMotion'
import { useFormatters } from '@/components/locale/useFormatters'

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
  /**
   * Longueur maximale d'une étiquette d'abscisse, en caractères.
   *
   * ⚠️ LA COUPE SE FAIT À L'AXE, JAMAIS DANS LES DONNÉES. Les appelants tronquaient
   * eux-mêmes leurs libellés avant de les passer ici, et l'infobulle héritait alors du
   * texte coupé : survoler la barre de « Smart Contract Platform » affichait
   * « Smart Contr… », c'est-à-dire précisément l'information qu'on venait y chercher.
   *
   * Le nom entier reste donc dans la donnée — l'infobulle et le lecteur d'écran l'ont —
   * et seule la GRADUATION est raccourcie.
   */
  tickMaxChars?: number
  /**
   * La figure prend la hauteur disponible au lieu de s'en tenir à `height`.
   *
   * `height` devient alors un MINIMUM. Sert dans les cartes d'analyse, dont la grille
   * égalise la hauteur des rangées : sans cela, la carte la plus courte étirait son
   * cadre en laissant sa figure flotter en haut, au-dessus de cent pixels de vide.
   */
  grow?: boolean
  ariaLabel: string
}

/** Hauteur de la zone de légende, réservée par Recharts sous le tracé. */
const LEGEND_HEIGHT = 24

const AXIS_TICK = { fill: 'var(--color-ink-muted)', fontSize: 11 }

/*
 * `nombres` ARRIVE EN ARGUMENT, ET NON D'UN CROCHET.
 *
 * Cette fonction vit hors du composant : elle est appelée par Recharts comme
 * `tickFormatter`, donc hors de tout rendu React. Un crochet y serait illégal. Le
 * composant les obtient une fois et les fait suivre — c'est aussi ce qui rend visible,
 * à la lecture de la signature, que cette mise en forme dépend de la langue.
 */
function render(value: number, format: BarSeries['format'], nombres: Formatters): string {
  const rendered =
    format === 'share'
      ? nombres.share(value)
      : format === 'percent'
        ? nombres.percent(value)
        : nombres.compactAxis(value)
  /* `null` remonte quand la valeur n'est pas finie. On rend un tiret plutôt qu'un
     zéro : une mesure absente reste absente (§5). */
  return rendered ?? '—'
}

export function BarFigure({
  data,
  series,
  height = 260,
  signed = false,
  tickMaxChars,
  grow = false,
  ariaLabel,
}: BarFigureProps) {
  const nombres = useFormatters()

  const reduced = useReducedMotion()
  /* Un identifiant PAR INSTANCE : deux figures sur la même page partageraient sinon
     leurs dégradés, et la seconde repeindrait les barres de la première. */
  const gradientId = useId()
  const hasRight = series.some((entry) => entry.axis === 'right')
  const left = series.find((entry) => entry.axis !== 'right')
  const right = series.find((entry) => entry.axis === 'right')

  return (
    /*
      ── `ChartContainer` REMPLACE LE `<div>` ET SON `ResponsiveContainer` ────────

      `role="img"` reste sur le CONTENEUR et non sur le SVG : Recharts régénère son
      SVG à chaque mesure de largeur, et les attributs posés dessus ne survivent pas.
      Le libellé décrit ce que la figure montre, puisqu'un lecteur d'écran ne peut pas
      lire des barres.


      Il fait les deux, et il neutralise en plus une trentaine de styles que Recharts
      écrit en dur dans son SVG — le quadrillage à `stroke="#ccc"`, les points de
      série cerclés de blanc, le curseur de survol gris. Ces valeurs ne suivent aucun
      thème : sur le thème sombre du site, elles ressortaient plus claires que les
      données qu'elles encadrent. `ChartContainer` les rattache aux jetons.

      ⚠️ `aspect-video` FAIT PARTIE DE SES CLASSES et doit être écrasé : les figures du
      site tiennent leur hauteur de la carte qui les porte, pas d'un rapport fixe. Sans
      `aspect-auto`, une figure de 120 px dans une colonne étroite s'étirerait à 200.

      `config` reste vide : les couleurs de série viennent du composant appelant, qui
      les tire déjà des jetons `--color-data-*`. Le remplir dupliquerait cette table.

      `minHeight` et non `height` : `flex-1` a pour base `0%`, et une figure dont rien
      d'autre ne fixe la hauteur s'écraserait à zéro sur la carte LA PLUS HAUTE de la
      rangée — celle, justement, qui donne sa hauteur aux autres.
    */
    <ChartContainer
      config={{}}
      role="img"
      aria-label={ariaLabel}
      className={`aspect-auto ${grow ? 'min-h-0 w-full flex-1' : 'w-full'}`}
      style={grow ? { minHeight: height } : { height }}
    >
        <BarChart data={data} margin={{ top: 8, right: hasRight ? 4 : 8, bottom: 0, left: -8 }}>
          {/*
            ── LES BARRES SONT DÉGRADÉES, ET C'EST LISIBLE PLUTÔT QUE DÉCORATIF ──

            Un aplat uniforme donne à huit barres voisines la même densité visuelle, et
            l'œil doit alors comparer des HAUTEURS seules. Le dégradé vertical assombrit
            le pied de chaque barre : la ligne de base se lit d'un trait, et le sommet —
            la seule information — garde la pleine saturation. C'est le traitement des
            deux références, et il ne coûte qu'une définition SVG.
          */}
          <defs>
            {series.map((entry) => (
              <linearGradient
                key={entry.key}
                id={`${gradientId}-${entry.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.45} />
              </linearGradient>
            ))}
          </defs>

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
            {...(tickMaxChars
              ? {
                  tickFormatter: (value: string) =>
                    value.length > tickMaxChars ? `${value.slice(0, tickMaxChars - 1)}…` : value,
                }
              : {})}
          />

          <YAxis
            yAxisId="left"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => render(value, left?.format, nombres)}
          />

          {hasRight ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => render(value, right?.format, nombres)}
            />
          ) : null}

          {/*
            ── L'INFOBULLE EST CELLE DE SHADCN/UI ────────────────────────────────

            Elle était habillée par `contentStyle` / `labelStyle` / `itemStyle` —
            trois objets de style en ligne recopiés à l'identique dans chaque figure du
            site, et qui avaient déjà divergé sur le rayon. `ChartTooltip` prend le
            rendu en charge et `ChartTooltipContent` le dessine avec les jetons du
            thème : une seule définition pour toutes les figures.

            Ce qu'elle apporte au-delà de la cohérence : la PASTILLE DE COULEUR devant
            chaque série. Sur une figure à deux séries, l'infobulle listait deux
            nombres et deux libellés sans dire lequel correspondait à quelle barre —
            il fallait revenir à la légende pour le savoir.

            `formatter` reste le nôtre : c'est lui qui applique le format déclaré par
            la série (`compact`, `share`, `percent`), et rend « — » quand la valeur
            n'est pas finie plutôt qu'un zéro (§5).
          */}
          <ChartTooltip
            /* Le curseur s'arrondit et s'éclaircit : à pleine opacité, la plaque
               grise recouvrait la barre survolée au lieu de la désigner. */
            cursor={{ fill: 'var(--color-surface-muted)', fillOpacity: 0.45, radius: 4 }}
            content={
              <ChartTooltipContent
                className="border-border-subtle bg-overlay shadow-overlay"
                formatter={(value, name) => {
                  const entry = series.find((candidate) => candidate.label === name)
                  return (
                    <>
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ background: entry?.color }}
                      />
                      <span className="flex-1 text-ink-muted">{name}</span>
                      <span className="tabular font-medium text-ink">
                        {render(Number(value), entry?.format, nombres)}
                      </span>
                    </>
                  )
                }}
              />
            }
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
              fill={`url(#${gradientId}-${entry.key})`}
              /* La barre survolée reprend l'aplat plein et se cerne d'un filet
                 d'encre : c'est le seul retour qui désigne UNE barre parmi huit sans
                 dépendre de la position du curseur, donc le seul qui tienne au doigt. */
              activeBar={{ fill: entry.color, stroke: 'var(--color-ink)', strokeOpacity: 0.2 }}
              radius={[3, 3, 0, 0]}
              maxBarSize={38}
              isAnimationActive={!reduced}
              animationDuration={420}
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
    </ChartContainer>
  )
}
