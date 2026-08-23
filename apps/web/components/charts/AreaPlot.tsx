'use client'

import { useId, useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import { GRID_DASH, GRID_STROKE } from '@/components/charts/chart-theme'
import { useReducedMotion } from '@/components/charts/useReducedMotion'
import { usePhrase } from '@/components/locale/ContentProvider'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TRACÉ DE SÉRIES TEMPORELLES — L'AIRE DE shadcn/ui
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE COMPOSANT A ÉTÉ ÉCRIT DEUX FOIS, ET LA SECONDE ANNULE LA PREMIÈRE ────
 *
 * Il dessinait tout à la main : cinq cents lignes de SVG, un `ResizeObserver` pour
 * mesurer sa largeur, ses propres échelles, ses propres graduations, sa propre
 * infobulle, et une recherche de point le plus proche sur `pointermove`. L'argument
 * tenait en un chiffre — `recharts` pesait 536 Ko non compressés, pour une courbe, un
 * dégradé, deux axes et une grille.
 *
 * Cet argument est CADUC, et pas parce qu'on a changé d'avis : `recharts` est de
 * nouveau dans le graphe de dépendances, tiré par `shadcn add chart` pour les figures
 * à barres et à courbes de l'accueil. Le coût n'est plus à payer, il est déjà payé.
 * Maintenir en parallèle une seconde implémentation maison ne fait plus économiser un
 * octet ; elle ne fait plus que diverger — deux infobulles à styler, deux calculs de
 * domaine à corriger, deux façons de rater le même cas limite.
 *
 * ── CE QUI EST CONSERVÉ, ET QUI N'ÉTAIT PAS GRATUIT ────────────────────────
 *
 * La surface d'API ne bouge pas d'un caractère : sept appelants la consomment, du
 * comparateur à l'indice de sentiment, et aucun n'est touché. Quatre comportements
 * étaient de VRAIES corrections, gagnées sur des défauts observés, et sont reportés
 * tels quels sur la nouvelle mécanique :
 *
 * 1. LA GOUTTIÈRE DE GAUCHE EST CALCULÉE, jamais fixe. Elle valait 46 pixels en dur,
 *    ce qui suffit à « 3,2 Bn » et pas à « 172,5 Md » — le panier de capitalisations
 *    affichait « 72,5 Md ». Un axe rogné est PIRE qu'un axe absent : il ne se signale
 *    pas, et le lecteur n'a aucune raison de mettre le nombre en doute.
 *
 * 2. LES GRADUATIONS EXTRÊMES SONT ANCRÉES PAR LE BORD. Centrées — ce que fait
 *    `recharts` par défaut — elles dépassent du cadre de la moitié de leur largeur, et
 *    le `<svg>` les rogne. D'où `EdgeTick`, plus bas.
 *
 * 3. LE DOMAINE VERTICAL DÉBORDE LES DONNÉES DE 8 %. Sans cette marge, le point le
 *    plus haut touche le bord et le plus bas s'assoit sur l'axe : la courbe paraît
 *    rognée alors qu'elle est entière. Le cas d'une série plate est traité à part —
 *    un domaine de largeur nulle réduirait le tracé à une ligne de pixels.
 *
 * 4. DEUX POINTS, SINON UNE PHRASE. Le retour était `null`, et c'est ce qui a coûté
 *    cher : `HeroChart` gardait sur `points.length > 0`, si bien qu'un unique relevé —
 *    l'état normal d'une série qu'on vient de commencer à enregistrer — passait son
 *    garde puis s'effaçait ici. La page montrait une zone vide, sans courbe ni
 *    message, et aucune erreur nulle part. `quiet` reste pour les courbes trop petites
 *    pour porter du texte.
 *
 * ── SEGMENTS DROITS, ET C'EST NON NÉGOCIABLE ───────────────────────────────
 *
 * `type="linear"`. Une interpolation courbe arrondit le trajet ENTRE deux relevés :
 * elle invente des valeurs que la source n'a jamais publiées, et sur une série peu
 * dense elle dessine un creux là où il n'y en a pas. C'est le réglage que portait le
 * tracé maison, et c'est la seule raison pour laquelle il valait la peine d'être écrit.
 *
 * ── CE QUI EST PERDU ───────────────────────────────────────────────────────
 *
 * La mesure explicite par `ResizeObserver` disparaît au profit du `ResponsiveContainer`
 * de `recharts`, qui fait la même chose. Le repli sur `viewBox` étirable reste écarté
 * pour la même raison qu'avant : il déforme les libellés d'axes, qui ne sont pas
 * étirables, eux.
 */

export interface PlotPoint {
  x: number
  y: number
}

export interface PlotSeries {
  id: string
  label: string
  color: string
  points: PlotPoint[]
}

export interface AreaPlotProps {
  series: PlotSeries[]
  /**
   * Hauteur en pixels, ou `'fill'` pour occuper celle du conteneur.
   *
   * ── POURQUOI `'fill'` EXISTE ────────────────────────────────────────────────
   *
   * Une carte de mesure étirée à la hauteur d'une voisine plus haute — le cas de
   * toute bande de cartes alignées — grandit par son BLOC DE TEXTE, puisque c'est
   * lui qui porte le `flex-1`. La courbe, calée en bas à hauteur fixe, ne bouge
   * pas : tout l'étirement se transforme en blanc entre le chiffre et le tracé.
   *
   * Le contournement était de passer une hauteur plus grande à la main (56 → 128
   * sur l'accueil). Un nombre magique ne peut pas suivre : il faut le retoucher dès
   * qu'un voisin change de contenu, et il était déjà en retard de 200 pixels sur le
   * panneau d'actualités qui fixe la hauteur de la bande.
   *
   * `'fill'` renverse la responsabilité — c'est la COURBE qui absorbe l'étirement,
   * et plus le vide.
   */
  height?: number | 'fill'
  /** Dégradé sous la courbe. Réservé au tracé unique : superposés, ils se salissent. */
  fill?: boolean
  /** Bornes imposées. Absentes, elles sont déduites des données avec une marge. */
  yDomain?: [number, number]
  yTicks?: number[]
  xTicks?: number[]
  referenceLines?: number[]
  axes?: boolean
  grid?: boolean
  formatX?: (x: number) => string
  formatY?: (y: number) => string
  /** Titre de l'infobulle — la date, en général. */
  formatTooltipX?: (x: number) => string
  formatTooltipY?: (y: number, series: PlotSeries) => string
  ariaLabel?: string
  /**
   * Disparaître SANS RIEN DIRE quand la courbe ne peut pas être tracée.
   *
   * C'est le comportement voulu d'une courbe d'ambiance — une étincelle de tableau,
   * qui vit dans une cellule et n'a pas la place d'une phrase. Partout ailleurs, se
   * taire produit un trou que rien n'explique : le défaut est donc l'inverse, et ce
   * drapeau doit être DEMANDÉ.
   */
  quiet?: boolean
}

/**
 * Marges internes.
 *
 * Sans axes, elles tombent presque à zéro : une étincelle doit toucher les bords de sa
 * cellule, et `recharts` ne réserve rien de lui-même dès lors que les axes sont
 * masqués. Le `top: 2` garde l'épaisseur du trait à l'intérieur du cadre quand la
 * courbe culmine au maximum du domaine.
 */
const MARGIN_WITH_AXES = { top: 8, right: 8, bottom: 0, left: 0 }
const MARGIN_BARE = { top: 2, right: 0, bottom: 0, left: 0 }

/** Graduation d'axe horizontal ancrée par le bord aux extrémités — voir §2 de l'en-tête. */
function EdgeTick({
  x,
  y,
  payload,
  index,
  count,
  format,
}: {
  x?: number
  y?: number
  payload?: { value: number }
  index?: number
  count: number
  format?: ((value: number) => string) | undefined
}) {
  const value = payload?.value ?? 0
  return (
    <text
      x={x}
      y={y}
      dy={10}
      textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
      fill="var(--color-ink-muted)"
      /* La taille vient de la FEUILLE DE STYLE et non de l'attribut : c'est le seul
         moyen qu'elle suive le plancher de lisibilité mobile, qui remonte la plus
         petite taille du site à onze pixels sous `sm`. Une graduation d'axe est le
         premier texte qu'on n'arrive plus à lire sur un téléphone, et le dernier qu'on
         pense à vérifier. */
      className="text-micro"
    >
      {format ? format(value) : Math.round(value)}
    </text>
  )
}

export function AreaPlot({
  series,
  height = 320,
  fill = false,
  yDomain,
  yTicks,
  xTicks,
  referenceLines,
  axes = false,
  grid = false,
  formatX,
  formatY,
  formatTooltipX,
  formatTooltipY,
  ariaLabel,
  quiet = false,
}: AreaPlotProps) {
  const t = usePhrase()
  const gradientId = useId().replace(/:/g, '')
  const reduced = useReducedMotion()

  /*
   * ── LES SÉRIES SONT LUES AU MÊME RANG, PAS À LA MÊME ABSCISSE ─────────────
   *
   * `recharts` veut UNE table de lignes, une colonne par série. La première série sert
   * de grille de référence et les autres sont lues à l'index correspondant.
   *
   * C'est le comportement du tracé précédent, et il est correct ici : toutes les
   * séries d'un même graphique partagent leur grille d'abscisses — le comparateur les
   * aligne avant de les passer. Interroger chaque série par sa propre valeur de `x`
   * donnerait des relevés pris à des instants différents sous un seul titre de date.
   */
  const reference = useMemo(() => series[0]?.points ?? [], [series])

  const rows = useMemo(
    () =>
      reference.map((point, index) => {
        const row: Record<string, number> = { x: point.x }
        for (const entry of series) {
          const value = entry.points[index]?.y
          if (value !== undefined) row[entry.id] = value
        }
        return row
      }),
    [reference, series],
  )

  /* Le domaine vertical — voir §3 de l'en-tête pour la marge de 8 % et le cas plat. */
  const domain = useMemo<[number, number] | null>(() => {
    if (yDomain) return yDomain

    const ys = series.flatMap((entry) => entry.points.map((point) => point.y))
    if (ys.length === 0) return null

    const low = Math.min(...ys)
    const high = Math.max(...ys)
    const margin = high === low ? Math.abs(high || 1) * 0.1 : (high - low) * 0.08
    return [low - margin, high + margin]
  }, [series, yDomain])

  /* Cinq niveaux, bornes comprises. Au-delà, les libellés se touchent sur les hauteurs
     courantes (260 à 320 pixels). */
  const resolvedYTicks = useMemo(() => {
    if (yTicks) return yTicks
    if (!domain || !axes) return undefined
    return Array.from({ length: 5 }, (_, index) => domain[0] + ((domain[1] - domain[0]) * index) / 4)
  }, [yTicks, domain, axes])

  const resolvedXTicks = useMemo(() => {
    if (xTicks) return xTicks
    if (!axes || reference.length === 0) return undefined
    const xMin = reference[0]?.x ?? 0
    const xMax = reference[reference.length - 1]?.x ?? 0
    return Array.from({ length: 5 }, (_, index) => xMin + ((xMax - xMin) * index) / 4)
  }, [xTicks, axes, reference])

  /*
   * La gouttière de gauche — voir §1 de l'en-tête pour ce que son absence a coûté.
   *
   * Elle est ESTIMÉE plutôt que mesurée : mesurer un texte SVG demande de le rendre
   * d'abord, donc un second passage à chaque changement de données. Les étiquettes sont
   * en chiffres tabulaires, dont l'avance est constante par construction — l'estimation
   * y est exacte à un pixel près, là où elle serait hasardeuse sur du texte
   * proportionnel. Le plancher de 46 conserve le rendu de toutes les courbes aux
   * étiquettes courtes ; le plafond de 96 empêche qu'une étiquette aberrante ne mange
   * la moitié du cadre.
   */
  const gutter = useMemo(() => {
    if (!axes || !resolvedYTicks) return 0
    const longest = resolvedYTicks.reduce((max, tick) => {
      const text = formatY ? formatY(tick) : String(Math.round(tick))
      return Math.max(max, text.length)
    }, 0)
    return Math.min(96, Math.max(46, Math.round(longest * 6.4) + 14))
  }, [axes, resolvedYTicks, formatY])

  /* Une courbe relie des relevés : un seul point ne décrit aucune évolution, et le
     domaine horizontal se réduirait à une largeur nulle. Voir §4 de l'en-tête. */
  if (series.length === 0 || reference.length < 2 || !domain) {
    if (quiet) return null
    return (
      <div
        className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-ink-muted"
        style={{ height: height === 'fill' ? '100%' : height }}
      >
        {t('Pas encore assez de relevés pour tracer une courbe.')}
      </div>
    )
  }

  return (
    <ChartContainer
      config={{}}
      {...(ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': true })}
      /* `aspect-auto` écrase le rapport 16/9 que `ChartContainer` impose par défaut :
         ici la hauteur est dictée par l'appelant, ou par le conteneur en mode `fill`. */
      className="aspect-auto w-full"
      style={{ height: height === 'fill' ? '100%' : height }}
    >
      <AreaChart data={rows} margin={axes ? MARGIN_WITH_AXES : MARGIN_BARE}>
        {fill ? (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0]?.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={series[0]?.color} stopOpacity={0} />
            </linearGradient>
          </defs>
        ) : null}

        {/* Grille HORIZONTALE seule. Les verticales découpent une série temporelle qui
            est justement continue, sans rien apprendre de plus que l'axe. */}
        {grid ? (
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray={GRID_DASH} />
        ) : null}

        {/*
          `type="number"` et non l'axe catégoriel par défaut : les abscisses sont des
          horodatages, et les espacer régulièrement mentirait sur le rythme des relevés
          dès qu'une série a un trou — ce qui arrive à toute série tenue en continu.
        */}
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin', 'dataMax']}
          hide={!axes}
          {...(resolvedXTicks ? { ticks: resolvedXTicks } : {})}
          tickLine={false}
          axisLine={false}
          height={20}
          tick={
            <EdgeTick count={resolvedXTicks?.length ?? 0} format={formatX} />
          }
        />

        <YAxis
          type="number"
          domain={domain}
          hide={!axes}
          {...(resolvedYTicks ? { ticks: resolvedYTicks } : {})}
          tickLine={false}
          axisLine={false}
          width={gutter}
          tick={{ fill: 'var(--color-ink-muted)' }}
          className="text-micro"
          tickFormatter={(value: number) => (formatY ? formatY(value) : String(Math.round(value)))}
        />

        {referenceLines?.map((value) => (
          <ReferenceLine
            key={`ref-${value}`}
            y={value}
            stroke={GRID_STROKE}
            strokeDasharray="3 3"
          />
        ))}

        {/* L'infobulle n'est montée que si l'appelant sait formater une valeur : sans
            `formatTooltipY`, la courbe est décorative et un survol qui affiche un
            nombre brut vaut moins que pas de survol du tout. */}
        {formatTooltipY ? (
          <ChartTooltip
            cursor={{ stroke: 'var(--color-border-subtle)', strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                className="min-w-[8.5rem] border-border-subtle bg-overlay shadow-overlay"
                /* ── LE TITRE EST EN PLEINE ENCRE, LES LIBELLÉS SONT ATTÉNUÉS ────
                   Un titre atténué au-dessus de valeurs pleines se lit comme une
                   légende de bas de bloc plutôt que comme l'en-tête de ce qu'on
                   survole — et sur une infobulle à trois séries, plus rien ne disait
                   quelle date on lisait. */
                labelFormatter={(_label, payload) => {
                  const x = payload?.[0]?.payload?.x as number | undefined
                  return x !== undefined && formatTooltipX ? formatTooltipX(x) : ''
                }}
                formatter={(value, name) => {
                  const entry = series.find((candidate) => candidate.id === name)
                  if (!entry) return null
                  return (
                    <>
                      <span
                        aria-hidden="true"
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: entry.color }}
                      />
                      {/* Le nom de série est tu quand il n'y en a qu'une : il répète
                          alors le titre de la carte qui porte le graphique. */}
                      {series.length > 1 ? (
                        <span className="flex-1 text-ink-muted">{entry.label}</span>
                      ) : null}
                      <span className="tabular ml-auto font-semibold text-ink">
                        {formatTooltipY(Number(value), entry)}
                      </span>
                    </>
                  )
                }}
              />
            }
          />
        ) : null}

        {series.map((entry, index) => (
          <Area
            key={entry.id}
            type="linear"
            dataKey={entry.id}
            name={entry.id}
            stroke={entry.color}
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            /* Le dégradé n'habille QUE la première série : superposés, deux remplissages
               se salissent l'un l'autre et aucune des deux courbes n'est plus lisible. */
            fill={fill && index === 0 ? `url(#${gradientId})` : 'none'}
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0, fill: entry.color }}
            isAnimationActive={!reduced}
            connectNulls
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}
