'use client'

import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ChartNavigator } from '@/components/asset/ChartNavigator'
import {
  OHLC_KINDS,
  type ChartCandle,
  type ChartHandle,
  type ChartKind,
  type ChartPoint,
  type ChartReferenceLine,
} from '@/components/asset/chart-kinds'

/*
 * Le vocabulaire du graphique a déménagé dans `chart-kinds.ts`, et il y est resté :
 * `AssetWorkspace` a besoin de `OHLC_KINDS` alors qu'il charge CE module à la demande.
 * L'importer d'ici le rappellerait tout entier, `lightweight-charts` compris, et le
 * chargement différé ne servirait plus à rien. Voir la note en tête de ce fichier-là.
 *
 * La ré-exportation garde les anciens chemins d'import valides — `live-series.ts` et
 * ses tests lisent `ChartCandle` ici depuis toujours, et ce sont des types : effacés à
 * la compilation, ils n'emportent rien avec eux.
 */
export {
  OHLC_KINDS,
  type ChartCandle,
  type ChartHandle,
  type ChartKind,
  type ChartPoint,
  type ChartReferenceLine,
}

interface PriceChartInteractiveProps {
  points: ChartPoint[]
  /** Bougies réelles — requises pour `candles` et `bars`, ignorées sinon. */
  candles?: ChartCandle[]
  kind?: ChartKind
  /** Facteur appliqué aux prix pour la devise choisie (1 = devise d'origine). */
  rate: number
  currency: string
  height?: number
  /** Fenêtre en jours — détermine le format de l'axe temporel. */
  days: number
  label: string
  /** Sous-graphique de volume, si la source en publie. */
  showVolume?: boolean
  /** Moyenne mobile superposée (§3.3 du cahier des charges). */
  showMovingAverage?: boolean
  /** Lignes horizontales plus haut / moyenne / plus bas. */
  showPriceLines?: boolean
  /**
   * Échelle des prix en logarithmique.
   *
   * Indispensable dès qu'on regarde plusieurs années : en linéaire, un actif passé
   * de 4 à 76 écrase toute son histoire ancienne contre l'axe, et un doublement de 4
   * à 8 y devient invisible à côté d'une hausse de 70 à 74 — pourtant deux fois
   * moins significative. Le logarithme rend les VARIATIONS RELATIVES comparables,
   * ce qui est la seule lecture qui ait un sens sur longue période.
   */
  logScale?: boolean
  /** Repères historiques (plus haut / plus bas de tous les temps). */
  referenceLines?: ChartReferenceLine[]
  /**
   * Second actif superposé, pour comparaison.
   *
   * ── LES DEUX COURBES PASSENT EN BASE 100 ──────────────────────────────────
   *
   * C'est le point délicat de cette fonctionnalité, et il se joue en une phrase :
   * un jeton à 54 $ et un bitcoin à 64 000 $ n'ont AUCUNE échelle commune. Deux
   * solutions existent, et une seule est honnête.
   *
   * La solution répandue — poser la seconde courbe sur une échelle invisible propre,
   * à droite — produit deux tracés dont les hauteurs relatives ne veulent RIEN dire :
   * on peut faire passer l'une au-dessus de l'autre en changeant seulement les bornes
   * d'un axe qu'on n'affiche pas. Un croisement visuel y suggère un dépassement qui
   * n'a pas eu lieu.
   *
   * Celle retenue ramène les DEUX séries à 100 à leur premier point commun. L'axe ne
   * porte plus des montants mais un indice, et une courbe au-dessus de l'autre
   * signifie exactement ce qu'elle a l'air de signifier : elle a plus progressé
   * depuis le début de la fenêtre. Le coût assumé : tant que la comparaison est
   * active, on ne lit plus de prix — d'où la mention dans la légende.
   */
  compare?: { label: string; points: ChartPoint[] } | null
  /** Poignée rendue au parent pour la capture d'image. */
  handleRef?: React.MutableRefObject<ChartHandle | null>
  /**
   * Bande de navigation sous la courbe.
   *
   * Retirée quand le cadre n'est pas fait pour être exploré : la vue « profondeur »
   * n'a pas de temps en abscisse, et un aperçu de trois points sur une série presque
   * vide n'aiderait personne.
   */
  showNavigator?: boolean
}

/**
 * Valeurs suivies par la croix de visée.
 *
 * Elles alimentent DEUX affichages distincts, et c'est volontaire :
 *
 *   · le BANDEAU DE LECTURE, ancré au-dessus du tracé, qui reprend la ligne
 *     « O H L C Variation » des plateformes de trading — il ne bouge jamais, on peut
 *     donc y lire un chiffre en déplaçant le curseur d'un point à l'autre ;
 *   · l'INFOBULLE FLOTTANTE, attachée au curseur, qui reprend la boîte de CoinGecko —
 *     elle dit à quel POINT du tracé se rapporte ce qu'on lit, ce qu'un bandeau fixe
 *     ne peut pas montrer quand la courbe est dense.
 *
 * Les deux ensemble, parce qu'ils répondent à deux questions différentes : « combien »
 * et « où ». C'est exactement le partage qu'opèrent les deux références.
 */
interface LegendState {
  price?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  time?: string
  /** Écart à l'ouverture (bougies) ou au point précédent (courbe), en valeur puis en %. */
  changeAbs?: number
  changePct?: number
  /** Amplitude du point, en % — la colonne « Plage » d'OKX. Bougies seulement. */
  rangePct?: number
  /** Position du curseur dans le canevas, pour poser l'infobulle flottante. */
  x?: number
  y?: number
}

/**
 * Graphique de cours interactif — lightweight-charts (Apache 2.0, TradingView).
 *
 * Pourquoi cette bibliothèque plutôt que Highcharts, qu'utilise CoinGecko ?
 * Highcharts exige une licence payante pour un usage commercial, ce que ZENKUU est
 * destiné à devenir (§8) — s'aligner sur eux aurait contredit la contrainte « tout
 * gratuit » du §7. Parmi les alternatives libres, celle-ci est la seule conçue pour
 * le financier : croix de visée, infobulle et échelle temporelle sont natives, pour
 * un tiers du poids d'ApexCharts.
 *
 * Le rendu est en canvas, donc client uniquement. C'est le compromis assumé du
 * passage à l'interactivité : les sparklines des tableaux restent en SVG rendu
 * serveur, cinquante canvas sur une page de classement étant ingérables.
 */
export function PriceChartInteractive({
  points,
  candles,
  kind = 'area',
  rate,
  currency,
  height = 320,
  days,
  label,
  showVolume = false,
  showMovingAverage = false,
  showPriceLines = false,
  logScale = false,
  referenceLines,
  handleRef,
  compare,
  showNavigator = true,
}: PriceChartInteractiveProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  /*
   * LARGEUR DU CADRE, TENUE EN ÉTAT ET NON LUE SUR LA RÉFÉRENCE.
   *
   * Elle sert à décider de quel côté du curseur la bulle de survol se pose. Elle était
   * lue en `containerRef.current?.clientWidth` AU MOMENT DU RENDU, ce qui est faux à
   * deux titres : la référence vaut encore `null` au premier rendu — la largeur tombe
   * alors à 0, et la bulle bascule à gauche même contre le bord gauche — et une
   * référence ne déclenche aucun rendu quand elle change, si bien qu'un
   * redimensionnement de la colonne n'était jamais répercuté.
   *
   * L'observateur de taille plus bas connaît déjà cette largeur — il la donne au
   * graphique. On la range simplement en état au passage : aucune mesure de plus,
   * aucun observateur de plus.
   */
  const [frameWidth, setFrameWidth] = useState(0)

  const chartRef = useRef<IChartApi | null>(null)
  const mainRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const averageRef = useRef<ISeriesApi<'Line'> | null>(null)
  const compareRef = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])

  /** Comparaison active : l'axe cesse de porter des montants (voir `compare`). */
  const indexed = (compare?.points.length ?? 0) > 1

  /**
   * L'axe porte-t-il une HEURE, ou seulement une date ?
   *
   * Cette question commande DEUX choses qui doivent impérativement répondre de la
   * même façon, d'où la constante partagée plutôt que deux `days <= 7` recopiés :
   *
   *   · l'affichage de l'heure sur les graduations (`timeVisible`) ;
   *   · le décalage horaire appliqué aux données (voir `toChartTime`).
   *
   * Le second n'a de sens que si le premier est vrai. Sous la semaine, les points
   * sont infra-journaliers et désignent des INSTANTS, qu'il faut ramener au fuseau du
   * lecteur. Au-delà, la source ne publie qu'un point par jour et cet horodatage
   * désigne une DATE DE CALENDRIER : le décaler ferait basculer le point de la veille
   * pour tout lecteur situé à l'ouest de Greenwich — le 12 août à 00:00 UTC deviendrait
   * le 11 août à 19:00 à New York, et l'axe afficherait franchement le mauvais jour.
   */
  const showsTime = days <= 7

  const [legend, setLegend] = useState<LegendState>({})

  const usesCandles = OHLC_KINDS.includes(kind) && (candles?.length ?? 0) > 1

  /**
   * Fenêtre de la bande de navigation, en fractions de la série.
   *
   * `{ 0, 1 }` — toute la période — est aussi l'état de repos : tant que le lecteur
   * n'a rien déplacé, la bande n'impose rien et la bibliothèque garde son cadrage
   * automatique. Voir l'effet qui l'applique.
   */
  const [navWindow, setNavWindow] = useState({ from: 0, to: 1 })

  /** Valeurs dessinées dans la bande — clôtures en OHLC, prix sinon. */
  const navValues = useMemo(() => {
    if (usesCandles && candles) return candles.map((candle) => candle.close)
    return points.map((point) => point.price)
  }, [usesCandles, candles, points])

  /** Début de la série — sert d'empreinte pour détecter un vrai changement de période. */
  const seriesStart = usesCandles ? candles?.[0]?.timestamp : points[0]?.timestamp

  /* ── Création de l'instance : une seule fois par hauteur ──────────────────── */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        attributionLogo: false,
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScale: { axisPressedMouseMove: false },
      localization: { locale: 'fr-FR', priceFormatter: formatPrice },
    })

    chartRef.current = chart

    // La poignée est posée ICI et retirée au nettoyage : elle a exactement la durée
    // de vie de l'instance, si bien qu'un parent ne peut jamais capturer un graphique
    // détruit.
    if (handleRef) handleRef.current = { screenshot: () => chart.takeScreenshot() }

    // `ResizeObserver` plutôt qu'un écouteur sur `window` : le graphique vit dans une
    // colonne dont la largeur change aussi quand la mise en page se réorganise, sans
    // que la fenêtre soit redimensionnée.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      chart.applyOptions({ width: entry.contentRect.width })
      setFrameWidth(entry.contentRect.width)
    })
    observer.observe(container)
    chart.applyOptions({ width: container.clientWidth })
    setFrameWidth(container.clientWidth)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      mainRef.current = null
      volumeRef.current = null
      averageRef.current = null
      priceLinesRef.current = []
      if (handleRef) handleRef.current = null
    }
  }, [height, handleRef])

  /* ── Échelle logarithmique ────────────────────────────────────────────── */
  useEffect(() => {
    // Effet SÉPARÉ de la création : basculer l'échelle ne doit pas détruire
    // l'instance, sans quoi le niveau de zoom et la position de l'utilisateur
    // seraient perdus à chaque clic sur la bascule.
    chartRef.current
      ?.priceScale('right')
      .applyOptions({ mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal })
  }, [logScale])

  /* ── Unité de l'axe ─────────────────────────────────────────────────── */
  useEffect(() => {
    // En comparaison, l'axe porte un INDICE et non un montant. Laisser le formateur
    // de prix ferait lire « 112 € » là où la valeur signifie « +12 % depuis le début
    // de la fenêtre » — un contresens complet, et précisément le genre d'unité fausse
    // que le §5 proscrit.
    chartRef.current?.applyOptions({
      localization: { priceFormatter: indexed ? formatIndex : formatPrice },
    })
  }, [indexed])

  /* ── Format de l'axe temporel : une option, pas une reconstruction ────────── */
  useEffect(() => {
    // Sous la semaine, l'heure porte l'information ; au-delà, elle sature l'axe.
    chartRef.current?.applyOptions({ timeScale: { timeVisible: showsTime } })
  }, [showsTime])

  /* ── Séries : recréées quand le TYPE change ───────────────────────────────── */
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // Impossible de muter une série d'un type vers un autre : les formats de données
    // diffèrent (valeur unique contre quadruplet OHLC). On remplace donc l'objet.
    const main = chart.addSeries(seriesDefinition(kind), { priceLineVisible: false })
    mainRef.current = main

    const volume = showVolume
      ? chart.addSeries(HistogramSeries, {
          // Échelle DÉDIÉE : superposer volume et prix sur la même échelle écraserait
          // le cours contre le haut du cadre, les ordres de grandeur n'ayant aucun
          // rapport (un prix à 60 000 face à un volume à 30 milliards).
          priceScaleId: 'volume',
          priceFormat: { type: 'volume' },
          priceLineVisible: false,
          lastValueVisible: false,
        })
      : null
    volumeRef.current = volume

    if (volume) {
      // Le volume occupe le cinquième inférieur, sous la courbe de prix.
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    }

    const average = showMovingAverage
      ? chart.addSeries(LineSeries, {
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
      : null
    averageRef.current = average

    // Trait TIRETÉ pour la comparaison : les deux courbes portent la même unité
    // (l'indice) et ne peuvent donc pas se distinguer par leur échelle. Le style du
    // trait fait ce travail, et il reste lisible pour qui ne perçoit pas les
    // couleurs — ce qu'une seconde teinte seule n'aurait pas garanti (§9).
    const comparison = indexed
      ? chart.addSeries(LineSeries, {
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
      : null
    compareRef.current = comparison

    return () => {
      priceLinesRef.current = []
      mainRef.current = null
      volumeRef.current = null
      averageRef.current = null
      compareRef.current = null

      // Sentinelle indispensable. React nettoie les effets DANS LEUR ORDRE DE
      // DÉCLARATION : au démontage, l'effet de création ci-dessus s'exécute en
      // premier et appelle `chart.remove()`, qui détruit l'instance et toutes ses
      // séries. Retirer ensuite une série d'un graphique mort lève « Value is
      // undefined ». `chartRef` étant remis à `null` par ce nettoyage, sa valeur
      // suffit à distinguer les deux cas :
      //   • instance vivante  → simple changement de type, il FAUT retirer les séries ;
      //   • instance détruite → tout est déjà libéré, il n'y a plus rien à faire.
      if (chartRef.current !== chart) return

      // Retirer les séries sans détruire le graphique : l'échelle de temps et le
      // niveau de zoom de l'utilisateur survivent au changement de type.
      chart.removeSeries(main)
      if (volume) chart.removeSeries(volume)
      if (average) chart.removeSeries(average)
      if (comparison) chart.removeSeries(comparison)
    }
  }, [kind, showVolume, showMovingAverage, indexed])

  /* ── Données ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const chart = chartRef.current
    const main = mainRef.current
    if (!chart || !main) return

    /*
     * Le type de série est décidé par `kind`, mais les bougies arrivent de façon
     * ASYNCHRONE. Entre le clic sur « Chandeliers » et la réponse de l'API, la série
     * est déjà une `CandlestickSeries` alors que seules des valeurs simples sont
     * disponibles — l'alimenter au format ligne lève « Value is undefined ».
     *
     * On ne dessine donc rien tant que la donnée n'a pas la forme qu'attend la série.
     * L'ancien graphique reste affiché en attendant, ce qui vaut mieux qu'un cadre
     * vide le temps de l'aller-retour réseau.
     */
    if (OHLC_KINDS.includes(kind) && !usesCandles) return

    const rising = trendIsUp(usesCandles, candles, points)
    const palette = readPalette()

    if (usesCandles && candles) {
      main.setData(
        candles.map((candle) => ({
          time: toChartTime(showsTime, candle.timestamp),
          open: candle.open * rate,
          high: candle.high * rate,
          low: candle.low * rate,
          close: candle.close * rate,
        })),
      )
    } else {
      if (points.length < 2) return
      main.setData(
        // En base 100, le facteur de change se SIMPLIFIE : l'indice est un rapport
        // entre deux prix de la même série, et multiplier numérateur et dénominateur
        // par le même taux ne change rien. C'est aussi ce qui rend la comparaison
        // indépendante de la devise choisie, ce qui est le comportement attendu.
        indexed
          ? indexSeries(points).map((row) => ({ time: toChartTime(showsTime, row.timestamp), value: row.value }))
          : points.map((point) => ({ time: toChartTime(showsTime, point.timestamp), value: point.price * rate })),
      )
    }

    /* Second actif — même traitement, même échelle. */
    const comparison = compareRef.current
    if (comparison && compare) {
      comparison.applyOptions({ color: palette.muted })
      comparison.setData(
        indexSeries(compare.points).map((row) => ({
          time: toChartTime(showsTime, row.timestamp),
          value: row.value,
        })),
      )
    }

    applySeriesTheme(main, kind, palette, rising)
    applyChartTheme(chart, palette)

    /* Volume — uniquement si la source l'a réellement fourni. */
    const volume = volumeRef.current
    if (volume) {
      const source: { timestamp: number; volume?: number; up: boolean }[] = usesCandles
        ? (candles ?? []).map((c) => ({
            timestamp: c.timestamp,
            volume: c.volume,
            up: c.close >= c.open,
          }))
        : points.map((p, index) => ({
            timestamp: p.timestamp,
            volume: p.volume,
            up: p.price >= (points[index - 1]?.price ?? p.price),
          }))

      volume.setData(
        source
          .filter((row): row is typeof row & { volume: number } => row.volume !== undefined)
          .map((row) => ({
            time: toChartTime(showsTime, row.timestamp),
            value: row.volume * rate,
            color: withAlpha(row.up ? palette.up : palette.down, 0.45),
          })),
      )
    }

    /* Moyenne mobile — calculée sur les clôtures, jamais extrapolée. */
    const average = averageRef.current
    if (average) {
      const closes = usesCandles
        ? (candles ?? []).map((c) => ({ timestamp: c.timestamp, price: c.close }))
        : points
      const sma = movingAverage(closes, smaPeriod(closes.length))
      average.applyOptions({ color: palette.accent })
      average.setData(sma.map((row) => ({ time: toChartTime(showsTime, row.timestamp), value: row.value * rate })))
    }

    /* Lignes de prix plus haut / moyenne / plus bas. */
    for (const line of priceLinesRef.current) main.removePriceLine(line)
    priceLinesRef.current = []

    if (showPriceLines) {
      const values = usesCandles
        ? (candles ?? []).map((c) => c.close * rate)
        : points.map((p) => p.price * rate)

      if (values.length > 1) {
        const max = Math.max(...values)
        const min = Math.min(...values)
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length

        priceLinesRef.current = (
          [
            { price: max, title: 'plus haut', color: palette.up },
            { price: mean, title: 'moyenne', color: palette.muted },
            { price: min, title: 'plus bas', color: palette.down },
          ] as const
        ).map((line) =>
          main.createPriceLine({
            price: line.price,
            color: line.color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: line.title,
          }),
        )
      }
    }

    /* Repères historiques fournis par la page (plus haut / plus bas de tous les
       temps). Ils s'ajoutent aux lignes calculées ci-dessus et partagent leur
       registre, pour être retirés ensemble au prochain rendu. */
    for (const line of referenceLines ?? []) {
      if (!Number.isFinite(line.value) || line.value <= 0) continue
      priceLinesRef.current.push(
        main.createPriceLine({
          price: line.value * rate,
          color: line.tone === 'up' ? palette.up : line.tone === 'down' ? palette.down : palette.muted,
          lineWidth: 1,
          // Pointillé large plutôt que tirets : les lignes calculées sur la fenêtre
          // utilisent déjà les tirets, et deux repères de même facture dans le même
          // cadre se liraient comme deux mesures de même nature — ce qu'ils ne sont
          // pas : l'un décrit la période affichée, l'autre toute l'histoire de l'actif.
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: line.label,
        }),
      )
    }

    chart.timeScale().fitContent()
  }, [
    points,
    candles,
    kind,
    rate,
    currency,
    usesCandles,
    showPriceLines,
    showVolume,
    showMovingAverage,
    referenceLines,
    indexed,
    compare,
    // Le décalage horaire fait partie de la donnée remise à la bibliothèque : passer
    // de « 7 j » à « 1 M » change les horodatages eux-mêmes, pas seulement le format.
    showsTime,
  ])

  /* ── Fenêtre de navigation appliquée au cadre ─────────────────────────────── */
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    /*
      LA FENÊTRE PLEINE REND LA MAIN, ELLE NE LA PREND PAS.

      `{ 0, 1 }` appelle `fitContent()` au lieu de poser une plage explicite de zéro à
      N−1. Les deux donnent le même cadrage à l'instant présent, mais pas ensuite :
      une plage explicite FIGE le cadre, et la série s'allongeant à chaque tique du
      direct, le dernier point sortirait progressivement du champ sans que rien ne le
      signale. `fitContent` suit l'allongement, ce qui est le comportement d'origine.
    */
    if (navWindow.from <= 0.001 && navWindow.to >= 0.999) {
      chart.timeScale().fitContent()
      return
    }

    const count = navValues.length
    if (count < 2) return

    // Indices LOGIQUES et non horodatages : la bibliothèque les accepte fractionnaires
    // et les interpole, là où une plage temporelle exigerait de retrouver le point le
    // plus proche de chaque borne — un calcul de plus pour un résultat identique.
    chart.timeScale().setVisibleLogicalRange({
      from: navWindow.from * (count - 1),
      to: navWindow.to * (count - 1),
    })
  }, [navWindow, navValues.length])

  /* ── Remise à zéro de la fenêtre au changement de série ───────────────────── */
  useEffect(() => {
    /*
      Une fenêtre exprimée en FRACTIONS n'a de sens que rapportée à une série donnée.
      Conservée telle quelle en passant de « 7 j » à « 1 A », elle désignerait le même
      tiers d'une série cinquante fois plus longue — le lecteur qui vient d'élargir sa
      période se retrouverait cadré sur quatre mois au hasard, sans avoir rien
      demandé, et sans comprendre pourquoi son clic sur « 1 A » n'a pas fait ce qu'il
      annonçait.

      Le déclencheur est le PREMIER HORODATAGE de la série, et non sa longueur : le
      cours en direct allonge la série par la fin toutes les quelques secondes, et
      surveiller la longueur remettrait donc la fenêtre à zéro sous les doigts du
      lecteur à chaque tique. Le début, lui, ne bouge que si la période change
      vraiment.

      Un changement de GRANDEUR — prix vers capitalisation — ne réinitialise
      volontairement rien : l'axe des temps est le même, la fenêtre reste valide.
    */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavWindow({ from: 0, to: 1 })
  }, [seriesStart, kind])

  /* ── Légende suivie par la croix de visée ─────────────────────────────────── */
  useEffect(() => {
    const chart = chartRef.current
    const main = mainRef.current
    if (!chart || !main) return

    const volume = volumeRef.current

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || param.point === undefined) {
        setLegend({})
        return
      }

      const value = param.seriesData.get(main)
      if (!value) {
        setLegend({})
        return
      }

      const next: LegendState = {
        time: formatStamp(param.time as UTCTimestamp, days),
        x: param.point.x,
        y: param.point.y,
      }

      if ('close' in value) {
        const open = value.open as number
        const high = value.high as number
        const low = value.low as number
        const close = value.close as number

        next.price = close
        next.open = open
        next.high = high
        next.low = low

        /*
          VARIATION MESURÉE SUR LA BOUGIE ELLE-MÊME — clôture moins ouverture.

          Et non par rapport à la bougie précédente, qui serait l'autre lecture
          possible. La raison est que la couleur du chandelier obéit déjà à cette
          règle-là : un chandelier vert est un chandelier dont la clôture dépasse
          l'ouverture. Mesurer la variation autrement afficherait un nombre négatif
          sous un chandelier vert — deux signaux contradictoires pour un même point.
        */
        if (open > 0) {
          next.changeAbs = close - open
          next.changePct = ((close - open) / open) * 100
        }
        // « Plage » d'OKX : l'amplitude de la bougie rapportée à son plus bas. Elle
        // dit la nervosité du point là où la variation ne dit que sa direction — une
        // bougie peut clôturer à son ouverture après avoir bougé de 3 %.
        if (low > 0) next.rangePct = ((high - low) / low) * 100
      } else if ('value' in value) {
        next.price = value.value as number
      }

      if (volume) {
        const volumePoint = param.seriesData.get(volume)
        if (volumePoint && 'value' in volumePoint) next.volume = volumePoint.value as number
      }

      setLegend(next)
    })

    return () => {
      // Pas de `unsubscribeCrosshairMove` avec une référence perdue : l'instance est
      // détruite avec le graphique, et les séries sont remplacées à chaque changement
      // de type — on rattache donc l'écouteur au même cycle de vie que les séries.
      setLegend({})
    }
  }, [kind, showVolume, days])

  /* ── Suivi du thème ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const chart = chartRef.current
      const main = mainRef.current
      if (!chart || !main) return

      const palette = readPalette()
      applySeriesTheme(main, kind, palette, trendIsUp(usesCandles, candles, points))
      applyChartTheme(chart, palette)
      averageRef.current?.applyOptions({ color: palette.accent })
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [points, candles, kind, usesCandles])

  const hovering = legend.price !== undefined

  /*
    ── LE BANDEAU NE SE VIDE PAS QUAND LE CURSEUR PART ──────────────────────────

    Il affichait les valeurs survolées, et rien du tout au repos. Un bandeau qui
    n'existe qu'au survol a deux défauts : il apparaît et disparaît sous le curseur —
    donc la mise en page saute — et il n'apprend rien à qui regarde le graphique sans
    y toucher, ce qui est le cas le plus fréquent.

    Au repos, il montre donc le DERNIER point de la série : l'état courant, qui est la
    réponse par défaut à « où en est-on ». C'est ce que font les plateformes de
    trading, et c'est aussi ce qui rend la hauteur du bandeau constante.
  */
  const resting = restingValues(usesCandles, candles, points)
  const shown: LegendState = hovering ? legend : resting

  return (
    <div className="relative w-full">
      {/*
        ── BANDEAU DE LECTURE ────────────────────────────────────────────────────

        La ligne « date · O H L C · Variation · Plage · Vol » d'OKX, posée AU-DESSUS
        du tracé et non par-dessus lui. La surimpression était le choix précédent, au
        motif qu'une infobulle flottante masque la zone examinée ; l'argument valait
        contre une bulle qui suit le curseur, pas contre un bandeau — celui-ci ne
        recouvre rien puisqu'il occupe sa propre bande.

        Et il libère la surimpression pour ce qu'elle sait faire de mieux, l'infobulle
        de CoinGecko, dont le rôle n'est pas de porter les chiffres mais de dire à
        QUEL POINT ils se rapportent.
      */}
      <ReadoutStrip shown={shown} />

      <div className="relative">
        <div ref={containerRef} role="img" aria-label={label} className="w-full" />

        {hovering ? (
          <FloatingTooltip
            legend={legend}
            indexed={indexed}
            frameWidth={frameWidth}
          />
        ) : null}
      </div>

      {showNavigator ? (
        <ChartNavigator values={navValues} window={navWindow} onChange={setNavWindow} />
      ) : null}
    </div>
  )
}

/* ── Affichages de lecture ─────────────────────────────────────────────────── */

/** Le bandeau « date · O H L C · Variation · Plage · Vol ». */
function ReadoutStrip({ shown }: { shown: LegendState }) {
  return (
    <div
      className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[0.6875rem] leading-5"
      aria-hidden="true"
    >
      {shown.time ? <span className="tabular text-ink-muted">{shown.time}</span> : null}

      {/* Les quatre valeurs OHLC sont formatées sur la précision de la CLÔTURE, et
          non chacune sur la sienne. Elles décrivent le même instrument au même
          instant : leur accorder des décimales différentes ferait sautiller les
          quatre colonnes d'une bougie à l'autre, sur la seule ligne du cadre qu'on
          lit en déplaçant le curseur. */}
      {shown.open !== undefined ? (
        <span className="tabular text-ink-muted">
          <Ohlc label="O" value={shown.open} reference={shown.price ?? 0} />
          <Ohlc label="H" value={shown.high ?? 0} reference={shown.price ?? 0} />
          <Ohlc label="B" value={shown.low ?? 0} reference={shown.price ?? 0} />
          <Ohlc label="C" value={shown.price ?? 0} reference={shown.price ?? 0} />
        </span>
      ) : shown.price !== undefined ? (
        <span className="tabular font-semibold text-ink">{formatPrice(shown.price)}</span>
      ) : null}

      {shown.changeAbs !== undefined && shown.changePct !== undefined ? (
        // Le signe est composé à la main plutôt que laissé au formateur : « − » est
        // le signe moins typographique (U+2212), pas le trait d'union du clavier. Sur
        // une colonne de chiffres tabulaires, le second est trop court et fait
        // sautiller l'alignement d'un point à l'autre.
        <span className={`tabular font-medium ${shown.changeAbs >= 0 ? 'text-up' : 'text-down'}`}>
          {shown.changeAbs >= 0 ? '+' : '−'}
          {formatAgainst(Math.abs(shown.changeAbs), shown.price ?? 0)} (
          {shown.changeAbs >= 0 ? '+' : '−'}
          {Math.abs(shown.changePct).toFixed(2)} %)
        </span>
      ) : null}

      {shown.rangePct !== undefined ? (
        <span className="tabular text-ink-muted">
          Plage <span className="text-ink">{shown.rangePct.toFixed(2)} %</span>
        </span>
      ) : null}

      {shown.volume !== undefined ? (
        <span className="tabular text-ink-muted">
          Vol <span className="text-ink">{formatCompact(shown.volume)}</span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * Infobulle attachée au curseur, façon CoinGecko.
 *
 * ── ELLE CHANGE DE CÔTÉ AU MILIEU DU CADRE ────────────────────────────────────
 *
 * Posée invariablement à droite du curseur, elle sortirait du cadre sur le dernier
 * tiers de la courbe — c'est-à-dire précisément sur les points récents, les plus
 * consultés. Le basculement se décide sur la moitié du cadre, ce qui suffit : la
 * bulle fait 160 pixels au minimum, un cadre en fait au moins 600.
 *
 * ── `pointer-events-none` EST INDISPENSABLE, PAS DÉCORATIF ────────────────────
 *
 * Sans lui, la bulle passe sous le curseur et intercepte le survol. La croix de visée
 * se croit alors sortie du graphique, la bulle disparaît, le curseur retrouve la
 * toile, la bulle revient — un clignotement à la fréquence de rafraîchissement, dont
 * la cause est invisible en lisant le code de la croix de visée.
 */
function FloatingTooltip({
  legend,
  indexed,
  frameWidth,
}: {
  legend: LegendState
  indexed: boolean
  frameWidth: number
}) {
  if (legend.x === undefined || legend.y === undefined) return null

  const flip = legend.x > frameWidth / 2

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-20 min-w-[10rem] rounded-dense border border-border-subtle bg-overlay px-2.5 py-1.5 text-[0.6875rem] shadow-overlay"
      style={{
        left: legend.x,
        top: legend.y,
        transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      <p className="tabular mb-1 text-ink-muted">{legend.time}</p>
      <p className="tabular flex items-baseline justify-between gap-3">
        {/* « Indice » et non « Cours » en comparaison : l'axe ne porte alors plus des
            montants mais une base 100, et l'infobulle ne doit pas contredire la
            mention qui l'explique sous le graphique. */}
        <span className="text-ink-muted">{indexed ? 'Indice' : 'Cours'}</span>
        <span className="font-semibold text-ink">{formatPrice(legend.price ?? 0)}</span>
      </p>
      {legend.volume !== undefined ? (
        <p className="tabular flex items-baseline justify-between gap-3">
          <span className="text-ink-muted">Volume</span>
          <span className="font-medium text-ink">{formatCompact(legend.volume)}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Une paire « libellé valeur » du bandeau OHLC — l'espacement est le même partout. */
function Ohlc({ label, value, reference }: { label: string; value: number; reference: number }) {
  return (
    <>
      <span className="ml-2 first:ml-0">{label} </span>
      <span className="font-medium text-ink">{formatAgainst(value, reference)}</span>
    </>
  )
}

/**
 * Valeurs du DERNIER point, pour le bandeau au repos.
 *
 * La variation d'une courbe simple se mesure ici contre le point PRÉCÉDENT, alors
 * qu'une bougie la mesure contre sa propre ouverture. Ce n'est pas une incohérence :
 * un point de courbe n'a pas d'ouverture, et la seule variation qu'on puisse lui
 * attribuer est celle du pas qui l'a amené là.
 */
function restingValues(
  usesCandles: boolean,
  candles: ChartCandle[] | undefined,
  points: ChartPoint[],
): LegendState {
  if (usesCandles && candles && candles.length > 0) {
    const last = candles[candles.length - 1]
    if (!last) return {}
    return {
      time: formatStamp(toChartTime(false, last.timestamp), 9999),
      open: last.open,
      high: last.high,
      low: last.low,
      price: last.close,
      ...(last.open > 0
        ? {
            changeAbs: last.close - last.open,
            changePct: ((last.close - last.open) / last.open) * 100,
          }
        : {}),
      ...(last.low > 0 ? { rangePct: ((last.high - last.low) / last.low) * 100 } : {}),
      ...(last.volume !== undefined ? { volume: last.volume } : {}),
    }
  }

  const last = points[points.length - 1]
  const previous = points[points.length - 2]
  if (!last) return {}

  return {
    time: formatStamp(toChartTime(false, last.timestamp), 9999),
    price: last.price,
    ...(previous && previous.price > 0
      ? {
          changeAbs: last.price - previous.price,
          changePct: ((last.price - previous.price) / previous.price) * 100,
        }
      : {}),
    ...(last.volume !== undefined ? { volume: last.volume } : {}),
  }
}

/* ── Fabrique de séries ────────────────────────────────────────────────────── */

function seriesDefinition(kind: ChartKind) {
  switch (kind) {
    case 'candles':
      return CandlestickSeries
    case 'bars':
      return BarSeries
    case 'line':
      return LineSeries
    case 'baseline':
      return BaselineSeries
    default:
      return AreaSeries
  }
}

/* ── Thème ─────────────────────────────────────────────────────────────────── */

interface Palette {
  up: string
  down: string
  accent: string
  muted: string
  border: string
}

/**
 * Couleurs LUES depuis les jetons CSS plutôt qu'écrites en dur : le graphique suit
 * ainsi le thème sans dupliquer la palette, exactement comme le reste des composants.
 */
function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback

  return {
    up: token('--color-up', '#00a83e'),
    down: token('--color-down', '#ff3a33'),
    accent: token('--color-brand', '#3d63c2'),
    muted: token('--color-ink-muted', '#64748b'),
    border: token('--color-border-subtle', '#e5e7eb'),
  }
}

function applyChartTheme(chart: IChartApi, palette: Palette): void {
  chart.applyOptions({
    layout: { textColor: palette.muted },
    grid: { vertLines: { visible: false }, horzLines: { color: palette.border } },
  })
}

function applySeriesTheme(
  series: ISeriesApi<SeriesType>,
  kind: ChartKind,
  palette: Palette,
  rising: boolean,
): void {
  const accent = rising ? palette.up : palette.down

  switch (kind) {
    case 'candles':
      series.applyOptions({
        upColor: palette.up,
        downColor: palette.down,
        borderUpColor: palette.up,
        borderDownColor: palette.down,
        wickUpColor: palette.up,
        wickDownColor: palette.down,
      })
      break
    case 'bars':
      series.applyOptions({ upColor: palette.up, downColor: palette.down })
      break
    case 'line':
      series.applyOptions({ color: accent, lineWidth: 2 })
      break
    case 'baseline':
      series.applyOptions({
        topLineColor: palette.up,
        topFillColor1: withAlpha(palette.up, 0.28),
        topFillColor2: withAlpha(palette.up, 0.02),
        bottomLineColor: palette.down,
        bottomFillColor1: withAlpha(palette.down, 0.02),
        bottomFillColor2: withAlpha(palette.down, 0.28),
      })
      break
    default:
      series.applyOptions({
        lineColor: accent,
        lineWidth: 2,
        topColor: withAlpha(accent, 0.22),
        bottomColor: withAlpha(accent, 0),
      })
  }
}

/* ── Calculs ───────────────────────────────────────────────────────────────── */

function trendIsUp(
  usesCandles: boolean,
  candles: ChartCandle[] | undefined,
  points: ChartPoint[],
): boolean {
  if (usesCandles && candles && candles.length > 1) {
    return (candles[candles.length - 1]?.close ?? 0) >= (candles[0]?.open ?? 0)
  }
  return (points[points.length - 1]?.price ?? 0) >= (points[0]?.price ?? 0)
}

/**
 * Période de la moyenne mobile, proportionnée au nombre de points.
 *
 * Une période fixe n'a pas de sens ici : la même fenêtre de 7 jours contient 168
 * points en pas horaire et 7 en pas quotidien. Une moyenne à 20 périodes lisserait
 * utilement la première et effacerait complètement la seconde.
 */
function smaPeriod(count: number): number {
  return Math.max(5, Math.min(50, Math.round(count / 12)))
}

/** Moyenne mobile simple. Les `period - 1` premiers points n'en ont pas — on ne les invente pas. */
function movingAverage(
  series: { timestamp: number; price: number }[],
  period: number,
): { timestamp: number; value: number }[] {
  if (series.length < period) return []

  const result: { timestamp: number; value: number }[] = []
  let sum = 0

  for (const [index, point] of series.entries()) {
    sum += point.price
    if (index >= period) sum -= series[index - period]?.price ?? 0
    if (index >= period - 1) result.push({ timestamp: point.timestamp, value: sum / period })
  }

  return result
}

/* ── Formatage ─────────────────────────────────────────────────────────────── */

/**
 * Horodatage epoch (ms) → seconde que la bibliothèque doit AFFICHER, fuseau local compris.
 *
 * ── LE DÉFAUT QUE CECI CORRIGE ────────────────────────────────────────────────
 *
 * `lightweight-charts` ne connaît pas les fuseaux : un `UTCTimestamp` est toujours
 * rendu en UTC sur l'axe et sur l'étiquette de la croix de visée. La légende, elle,
 * passait par `toLocaleString` — donc par le fuseau du navigateur. Le même instant
 * s'affichait ainsi à deux endroits du même cadre avec deux heures d'écart à Paris
 * en été : « 19:46 » en légende, « 17:46 » sous le dernier point.
 *
 * ── POURQUOI DÉCALER LA DONNÉE PLUTÔT QUE REFORMATER L'AXE ────────────────────
 *
 * Reformater les graduations en local aurait corrigé le TEXTE sans corriger les
 * POSITIONS : la bibliothèque place ses repères sur les minuits et les heures rondes
 * UTC, et l'on aurait obtenu une graduation « 12 août » posée à 02:00 du matin.
 *
 * On décale donc les horodatages de l'offset local avant de les remettre, ce que la
 * documentation de la bibliothèque recommande explicitement. Elle continue de croire
 * qu'elle affiche de l'UTC ; ce qu'elle affiche est l'heure locale, graduations
 * comprises.
 *
 * ── L'OFFSET EST CALCULÉ PAR POINT, ET C'EST INDISPENSABLE ────────────────────
 *
 * `getTimezoneOffset()` est interrogé sur la date DU POINT et non sur l'instant
 * présent. Un graphique d'un an traverse deux changements d'heure : un offset unique
 * pris « maintenant » décalerait d'une heure toute la moitié de la série située de
 * l'autre côté du basculement — une erreur d'autant plus vicieuse qu'elle ne se voit
 * que sur les fenêtres longues.
 */
const toChartTime = (shift: boolean, timestamp: number) =>
  // `getTimezoneOffset` compte les minutes de RETARD sur UTC (−120 à Paris en été) :
  // le soustraire avance donc l'horodatage, ce qui est bien le sens voulu.
  Math.floor(
    (shift ? timestamp - new Date(timestamp).getTimezoneOffset() * 60_000 : timestamp) / 1000,
  ) as UTCTimestamp

/**
 * Série ramenée à 100 sur son premier point exploitable.
 *
 * Les points dont le prix est nul ou négatif sont écartés AVANT de choisir la base :
 * diviser par zéro produirait un `Infinity` que la bibliothèque trace comme une
 * verticale sur toute la hauteur du cadre, ce qui détruit l'échelle des deux courbes.
 */
function indexSeries(points: ChartPoint[]): { timestamp: number; value: number }[] {
  const usable = points.filter((point) => Number.isFinite(point.price) && point.price > 0)
  const base = usable[0]?.price
  if (base === undefined) return []
  return usable.map((point) => ({ timestamp: point.timestamp, value: (point.price / base) * 100 }))
}

/** Indice sans symbole monétaire — 100 = niveau au début de la fenêtre. */
function formatIndex(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: priceDigits(value),
  }).format(value)
}

/** Décimales utiles pour un montant, selon son ordre de grandeur. */
function priceDigits(value: number): number {
  const size = Math.abs(value)
  return size >= 100 ? 0 : size >= 1 ? 2 : 6
}

/**
 * Un montant formaté à la précision d'un AUTRE montant, sa référence.
 *
 * ── LE DÉFAUT QUE CECI CORRIGE ────────────────────────────────────────────────
 *
 * `formatPrice` choisit ses décimales d'après la magnitude de la valeur qu'il reçoit.
 * C'est le bon calcul pour un cours isolé, et le mauvais dès que plusieurs nombres
 * liés se lisent sur la même ligne :
 *
 *   · une VARIATION de 0,079 sur un actif coté 49 € tombe sous l'unité et recevait
 *     donc six décimales — le bandeau affichait « 49 » et « −0,079104 » côte à côte,
 *     alors que le second est la différence du premier ;
 *   · les quatre valeurs OHLC d'une même bougie peuvent tomber de part et d'autre
 *     d'un seuil et changer de précision entre elles, ce qui fait sautiller les
 *     colonnes d'un point à l'autre — sur la seule ligne du cadre qu'on lit
 *     précisément en déplaçant le curseur.
 *
 * Chaque valeur hérite donc de la précision de la CLÔTURE, avec un plancher à deux
 * décimales : sur un actif à 63 000 €, `priceDigits` renverrait zéro et un mouvement
 * de quarante centimes s'afficherait « +0 ».
 */
function formatAgainst(value: number, reference: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, priceDigits(reference)),
  }).format(value)
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

/**
 * Horodatage RENVOYÉ par le graphique → texte de la légende.
 *
 * `timeZone: 'UTC'` n'est pas une erreur, c'est la contrepartie exacte de
 * `toChartTime` : la valeur qui ressort de la croix de visée a déjà été décalée du
 * fuseau local à l'aller. La relire en local la décalerait une seconde fois, et la
 * légende afficherait quatre heures d'avance là où elle en affichait deux de retard.
 */
function formatStamp(time: UTCTimestamp, days: number): string {
  const date = new Date((time as number) * 1000)
  return date.toLocaleString(
    'fr-FR',
    days <= 7
      ? { timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' },
  )
}

/** Applique une transparence à une couleur hexadécimale ou `rgb()` issue des jetons. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex =
      color.length === 4
        ? color
            .slice(1)
            .split('')
            .map((char) => char + char)
            .join('')
        : color.slice(1)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Format `rgb(...)` : on le convertit sans supposer d'espacement particulier.
  const numbers = color.match(/\d+(\.\d+)?/g)
  if (numbers && numbers.length >= 3) {
    return `rgba(${numbers[0]}, ${numbers[1]}, ${numbers[2]}, ${alpha})`
  }
  return color
}
