'use client'

import { useId, useMemo } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import { GRID_DASH, GRID_STROKE } from '@/components/charts/chart-theme'
import { useReducedMotion } from '@/components/charts/useReducedMotion'
import { usePhrase } from '@/components/locale/ContentProvider'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ChartWatermark } from '@/components/charts/asxn'

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
  /**
   * Tracé en BARRES plutôt qu'en aire.
   *
   * ── POURQUOI CE MODE EXISTE ────────────────────────────────────────────────
   *
   * C'est le tracé d'ASXN HyperScreener, mesuré le 2026-09-02 : leurs figures de
   * volume et de revenu sont des barres en aplat teal, pas des courbes. Et ce n'est
   * pas un choix d'apparence — une aire relie visuellement deux points par une pente,
   * ce qui suggère un CONTINUUM. Un volume quotidien n'en est pas un : chaque jour est
   * une quantité indépendante, et la pente entre deux barres n'existe pas.
   *
   * L'aire reste juste pour un cours ou une capitalisation, qui existent à chaque
   * instant. Les deux tracés disent des choses différentes, et le choix appartient
   * donc à l'appelant, qui sait ce que sa série mesure.
   */
  bars?: boolean
  /**
   * Légende à DROITE du tracé, façon Blockworks.
   *
   * ── ELLE NE S'AFFICHE QUE SI DEUX SÉRIES OU PLUS LA JUSTIFIENT ──────────
   *
   * Relevé sur blockworks.com/analytics le 2026-09-02 : leurs figures portent une
   * colonne de légende à droite, pastille de couleur puis nom, en 12 px gris. Elle
   * est indispensable chez eux — quatorze chaînes empilées dans le même graphique.
   *
   * ⚠️ SUR UNE SÉRIE UNIQUE ELLE SERAIT UNE COLONNE VIDE DE SENS. Une légende répond
   * à « laquelle est laquelle ? », question qui ne se pose pas quand il n'y en a
   * qu'une — et elle coûterait alors 130 px pris sur la largeur du tracé, c'est-à-dire
   * sur la seule chose qu'on regarde.
   *
   * La plupart des figures de ZENKUU sont à série unique. Le drapeau est donc
   * OPT-IN et son rendu conditionné au nombre réel de séries : demander la légende
   * sur un tracé qui n'en a qu'une ne produit rien plutôt qu'un cadre vide.
   */
  legend?: boolean
  /** Bornes imposées. Absentes, elles sont déduites des données avec une marge. */
  yDomain?: [number, number]
  yTicks?: number[]
  xTicks?: number[]
  referenceLines?: number[]
  axes?: boolean
  grid?: boolean
  formatX?: (x: number) => string
  formatY?: (y: number) => string
  /**
   * Filigrane « ZENKUU » derrière le tracé.
   *
   * ── POURQUOI IL EST OPTIONNEL, ET FAUX PAR DÉFAUT ─────────────────────────
   *
   * ASXN en pose un sur CHACUN de ses graphiques, et sur les leurs c'est juste : ce
   * sont tous de grandes figures, seules dans leur carte. `AreaPlot` sert aussi de
   * vignette — une courbe de trente pixels de haut dans une ligne de tableau — et un
   * mot posé derrière une vignette de cette taille n'est pas une trame, c'est du
   * bruit qui recouvre la donnée.
   *
   * L'appelant décide donc, parce que lui seul sait la taille qu'il donne au tracé.
   */
  watermark?: boolean
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
  bars = false,
  legend = false,
  watermark = false,
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

  const tracé = (
    <ChartContainer
      config={{}}
      {...(ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': true })}
      /* `aspect-auto` écrase le rapport 16/9 que `ChartContainer` impose par défaut :
         ici la hauteur est dictée par l'appelant, ou par le conteneur en mode `fill`. */
      className="aspect-auto w-full"
      style={{ height: height === 'fill' ? '100%' : height }}
    >
      {/* `ComposedChart` et non `AreaChart` : il accepte les DEUX éléments, ce qui
          permet à `bars` de basculer le tracé sans dupliquer tout le cadre — axes,
          grille, infobulle et lignes de repère sont partagés. */}
      <ComposedChart data={rows} margin={axes ? MARGIN_WITH_AXES : MARGIN_BARE}>
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
            /* ── LA VERTICALE DE VISÉE EST TIRETÉE, ET DANS L'ENCRE ATTÉNUÉE ──
               Elle était pleine et de la couleur du filet : à ce ton, elle se
               confondait avec une bordure de carte et on ne la voyait pas bouger.
               Tiretée, elle se lit comme un REPÈRE — le même vocabulaire que la
               grille, un cran au-dessus en contraste puisqu'elle, on la cherche.
               Le motif « 4 4 » est celui du curseur d'amCharts sur la fiche d'actif :
               les deux graphiques du site désignent l'instant survolé de la même
               façon. */
            cursor={{
              stroke: 'var(--color-ink-muted)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
              strokeOpacity: 0.8,
            }}
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
          bars ? (
            /* ── LES BARRES, MESURÉES CHEZ ASXN ────────────────────────────────
               `fill` plein et `fillOpacity` à 1 : leur transparence vient de la TEINTE
               elle-même (#51a691, un teal déjà désaturé), pas d'un canal alpha. Une
               opacité réduite sur une barre la ferait pâlir sur le fond au lieu de la
               poser dessus — et deux barres voisines se chevaucheraient visuellement.

               `radius` en haut seulement : le bas d'une barre repose sur l'axe zéro,
               qui est une ligne droite. L'arrondir décollerait la barre de sa base.

               `maxBarSize` : sans lui, une série de dix points étale dix barres de
               cent pixels de large, et la figure se lit comme un aplat. */
            <Bar
              key={entry.id}
              dataKey={entry.id}
              name={entry.id}
              fill={entry.color}
              fillOpacity={1}
              radius={[2, 2, 0, 0]}
              maxBarSize={28}
              isAnimationActive={!reduced}
            />
          ) : (
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
            /* Pastille CERCLÉE DU FOND, et non pleine. Sans cet anneau, une pastille
               posée sur sa propre courbe s'y fond — c'est le trait qu'on voit, pas le
               point — et deux séries qui se croisent n'en montrent plus qu'une. Le
               cercle de fond détache le repère de tout ce qu'il recouvre. */
            activeDot={{
              r: 4,
              fill: entry.color,
              stroke: 'var(--color-canvas)',
              strokeWidth: 2,
            }}
            isAnimationActive={!reduced}
            connectNulls
          />
          )
        ))}
      </ComposedChart>
    </ChartContainer>
  )

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LA LÉGENDE DE BLOCKWORKS — UNE COLONNE À DROITE, PAS UNE RANGÉE DESSOUS
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Relevé le 2026-09-02 : pastille carrée, nom en 12 px graisse 400 gris, empilés
   * verticalement à droite du tracé.
   *
   * ── POURQUOI À DROITE PLUTÔT QUE DESSOUS ─────────────────────────────────
   *
   * Une rangée sous le graphique s'enroule dès qu'il y a plus de cinq séries, et
   * chaque retour à la ligne repousse le tracé vers le haut ou raccourcit sa hauteur.
   * Une colonne prend une largeur FIXE quelle que soit la longueur de la liste : la
   * figure garde exactement la même hauteur avec deux séries ou avec quatorze.
   *
   * ── ELLE DISPARAÎT SOUS `sm` ─────────────────────────────────────────────
   *
   * 130 px de légende sur un écran de 375 laissent 245 px de tracé, soit une figure
   * plus étroite que haute. Sur téléphone la légende passe donc SOUS le graphique, en
   * rangée — c'est le seul cas où l'enroulement est le moindre mal.
   */
  const avecLegende = legend && series.length > 1

  const habille = avecLegende ? (
    <div className="flex h-full flex-col gap-3 sm:flex-row">
      <div className="min-h-0 min-w-0 flex-1">{tracé}</div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 sm:w-[130px] sm:shrink-0 sm:flex-col sm:flex-nowrap sm:self-start">
        {series.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 text-xs text-ink-muted">
            {/* Pastille CARRÉE et non ronde : c'est la forme de la référence, et elle
                se distingue mieux de la pastille ronde qui marque un point survolé sur
                le tracé — deux signaux différents ne doivent pas se ressembler. */}
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
            />
            <span className="truncate">{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    tracé
  )

  if (!watermark) return habille

  /* Le filigrane passe SOUS le tracé et non par-dessus : `ChartContainer` est monté
     après lui dans le flux, donc au-dessus sans qu'aucun `z-index` n'ait à le dire.
     Un filigrane posé devant intercepterait le survol qui nourrit l'infobulle — ce
     que `pointer-events-none` empêcherait, mais mieux vaut ne pas avoir à y penser.

     `@container` : la taille du filigrane suit la largeur du CONTENEUR et non celle de
     la fenêtre (`8cqw` dans `.chart-filigrane`). Sans lui, l'unité n'a pas de
     référence et le mot garde la même taille dans une carte pleine largeur et dans un
     panneau de trois cents pixels. */
  return (
    <div className="relative size-full @container" style={{ height: height === 'fill' ? '100%' : height }}>
      <ChartWatermark />
      {habille}
    </div>
  )
}
