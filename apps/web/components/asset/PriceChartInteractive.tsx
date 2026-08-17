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

import { formatCompactAxis } from '@zenkuu/ui'

import { ZenkuuMark } from '@/components/BrandMark'
import { ChartNavigator } from '@/components/asset/ChartNavigator'
import {
  ASSET_CHART_HEIGHT,
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
  /**
   * Hauteur du TRACÉ, axe temporel compris. Par défaut `ASSET_CHART_HEIGHT`.
   *
   * Reste réglable : la vue « profondeur du carnet » et les aperçus de la page
   * d'accueil montent le même composant dans des cadres bien plus courts.
   */
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
   * Celle retenue ramène TOUTES les séries à 100 à leur premier point. L'axe ne porte
   * plus des montants mais un indice, et une courbe au-dessus d'une autre signifie
   * exactement ce qu'elle a l'air de signifier : elle a plus progressé depuis le début
   * de la fenêtre. Le coût assumé : tant que la comparaison est active, on ne lit plus
   * de prix — d'où la mention dans la légende.
   *
   * ── PLUSIEURS COURBES, ET NON PLUS UNE SEULE ─────────────────────────────
   *
   * Le panneau de comparaison en accepte quatre. Elles se distinguent par leur
   * COULEUR, prise dans la palette des séries, et partagent toutes le trait tireté qui
   * les sépare de la courbe principale. C'est le bon partage : le style du trait dit
   * « ceci n'est pas l'actif de la fiche » et reste lisible pour qui ne perçoit pas les
   * couleurs (§9) ; la teinte, elle, ne fait que distinguer les comparants entre eux,
   * ce que la légende sous le graphique reprend par écrit.
   */
  compare?: { id: string; label: string; points: ChartPoint[] }[]
  /**
   * L'échelle porte-t-elle une grandeur qui se compte en milliards ?
   *
   * Posé par l'appelant plutôt que déduit de la magnitude des points, et la nuance
   * compte : un bitcoin à 63 000 € et une capitalisation de 63 000 € sont le même
   * nombre, mais on vient lire le premier au chiffre près et le second à l'ordre de
   * grandeur. Seule la fiche sait laquelle des deux elle trace.
   *
   * Voir `formatCompactPrice` pour ce que cela change, et pourquoi seule l'ÉCHELLE est
   * concernée.
   */
  compactValues?: boolean
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
  height = ASSET_CHART_HEIGHT,
  days,
  label,
  showVolume = false,
  showMovingAverage = false,
  showPriceLines = false,
  logScale = false,
  referenceLines,
  handleRef,
  compare,
  compactValues = false,
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
  const compareRef = useRef<ISeriesApi<'Line'>[]>([])
  const priceLinesRef = useRef<IPriceLine[]>([])

  /**
   * Courbes de comparaison réellement traçables.
   *
   * Une série d'un seul point ne s'indexe pas — la base 100 se calcule sur son premier
   * point, et la courbe serait une horizontale à 100. On les écarte ICI plutôt qu'à
   * l'affichage : c'est ce décompte qui décide combien de séries créer, et en créer une
   * qu'on n'alimentera pas laisse une entrée vide dans la légende du graphique.
   */
  const overlays = useMemo(
    () => (compare ?? []).filter((entry) => entry.points.length > 1),
    [compare],
  )

  /**
   * Comparaison active : l'axe cesse de porter des montants (voir `compare`).
   *
   * Le NOMBRE de courbes, et non un booléen : c'est lui qui commande la création des
   * séries, et l'effet doit se rejouer quand on passe de deux comparants à trois — pas
   * seulement quand on passe de zéro à un.
   */
  const overlayCount = overlays.length
  const indexed = overlayCount > 0

  /**
   * Formateur de l'ÉCHELLE, choisi une fois pour les deux endroits qui le posent.
   *
   * Il est calculé ici plutôt qu'à chacun de ces endroits parce qu'ils DOIVENT dire la
   * même chose : l'un s'applique à la création du graphique, l'autre à chaque
   * changement d'unité. Deux expressions recopiées finiraient par diverger, et l'axe
   * afficherait alors une unité au premier rendu et une autre au premier réglage.
   */
  const axisFormatter = useMemo(
    () => (indexed ? formatIndex : compactValues ? formatCompactPrice : formatPrice),
    [indexed, compactValues],
  )

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

  /* Volume par horodatage de graphique, pour l'infobulle. Remplie au montage des
     séries, lue par la croix de visée — voir les deux notes qui s'y rapportent. */
  const volumeByTime = useRef<Map<number, number>>(new Map())

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
      /*
       * `autoSize` REMPLACE la hauteur fixe, et c'est ce qui répare le plein écran.
       *
       * La hauteur était posée ici en pixels, une fois pour toutes, et l'observateur
       * de taille ne rendait compte que de la LARGEUR. Le résultat se voyait
       * immédiatement : en plein écran, la courbe gardait ses 320 pixels au sommet
       * d'un écran de mille, et les huit cents restants étaient un aplat vide. C'est
       * exactement le défaut signalé.
       *
       * En `autoSize`, la bibliothèque observe elle-même son conteneur et suit ses
       * DEUX dimensions. La hauteur est donc décidée en CSS — par le style du
       * conteneur en lecture normale, par la règle `:fullscreen` de `globals.css`
       * quand le cadre est extrait du document.
       *
       * Effet de bord bienvenu : `height` quitte les dépendances de cet effet, donc
       * changer de hauteur ne détruit plus l'instance.
       */
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        attributionLogo: false,
      },
      rightPriceScale: {
        borderVisible: false,
        /*
         * ── DOUZE POUR CENT DE BLANC EN HAUT, HUIT EN BAS ─────────────────────
         *
         * Sans marge, la bibliothèque colle la valeur la plus haute au bord supérieur
         * du cadre — et l'étiquette d'axe qui la désigne se retrouve COUPÉE EN DEUX
         * par ce bord. Constaté sur la fiche du bitcoin en 24 h : « 55 400 » n'était
         * lisible qu'à moitié, tranché horizontalement.
         *
         * Le bas reçoit davantage parce qu'il porte plus de choses : la bande de
         * volume quand elle est demandée, et les étiquettes de l'axe des temps.
         *
         * Ces marges sont exprimées en FRACTION de la hauteur du cadre, pas en
         * pixels — elles tiennent donc aussi bien à 320 pixels qu'en plein écran, ce
         * qu'une réserve chiffrée ne ferait pas.
         */
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: { borderVisible: false, secondsVisible: false },
      crosshair: { mode: 1 },
      /*
       * ── LA SOURIS NE DÉPLACE NI NE ZOOME LE CADRE ────────────────────────
       *
       * Tout ce que la période choisie contient DOIT tenir dans le cadre, sans avoir à
       * tirer la courbe pour retrouver le début de la fenêtre. C'est la règle de la
       * référence, et elle a une raison qui dépasse le confort : `fitContent()` cadre
       * la série entière à chaque changement de données, mais un coup de molette
       * involontaire décadrait ensuite le graphique sans qu'aucun bouton ne dise
       * comment revenir. On lisait alors « 24 h » dans la barre en regardant six heures.
       *
       * Le zoom volontaire n'est pas perdu pour autant : la bande de navigation sous le
       * traçé le permet, avec deux poignées qui montrent OU L'ON EST dans la période —
       * ce qu'une molette ne dit jamais. Voir `ChartNavigator`.
       */
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
        axisDoubleClickReset: false,
      },
      /*
        `formatPrice` ICI, et non `axisFormatter`.

        Cet effet ne se rejoue qu'au montage — c'est tout l'intérêt : recréer
        l'instance à chaque changement d'unité perdrait le zoom et la position du
        lecteur. Y lire `axisFormatter` l'aurait donc figé à sa valeur du premier
        rendu, ou obligé à le mettre en dépendance et à reconstruire le graphique
        chaque fois qu'on bascule sur la capitalisation.

        L'effet « Unité de l'axe », juste en dessous, pose le bon formateur — et il
        s'exécute dans le même commit que celui-ci, avant la première peinture. Le
        formateur ci-dessous n'est donc jamais visible : c'est une valeur de départ,
        pas un affichage transitoire.
      */
      localization: { locale: 'fr-FR', priceFormatter: formatPrice },
    })

    chartRef.current = chart

    // La poignée est posée ICI et retirée au nettoyage : elle a exactement la durée
    // de vie de l'instance, si bien qu'un parent ne peut jamais capturer un graphique
    // détruit.
    if (handleRef) handleRef.current = { screenshot: () => chart.takeScreenshot() }

    /*
     * CET OBSERVATEUR NE REDIMENSIONNE PLUS RIEN — `autoSize` s'en charge.
     *
     * Il ne sert plus qu'à tenir `frameWidth` à jour, dont la bulle de survol a besoin
     * pour décider de quel côté du curseur se poser. Le supprimer obligerait à lire
     * cette largeur pendant le rendu, ce qui ne déclencherait aucun nouveau rendu
     * quand la colonne change de taille — le défaut d'origine.
     */
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setFrameWidth(entry.contentRect.width)
    })
    observer.observe(container)
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
  }, [handleRef])

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
    // Trois unités possibles sur le même axe, et deux contresens à éviter :
    //
    //   · en COMPARAISON, l'axe porte un INDICE et non un montant. Laisser le
    //     formateur de prix ferait lire « 112 € » là où la valeur signifie « +12 %
    //     depuis le début de la fenêtre » — exactement le genre d'unité fausse que le
    //     §5 proscrit ;
    //   · sur une CAPITALISATION, treize chiffres par graduation dévorent le quart du
    //     cadre. Voir `formatCompactPrice`.
    chartRef.current?.applyOptions({
      localization: { priceFormatter: axisFormatter },
    })
  }, [axisFormatter])

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

    // Trait TIRETÉ pour les comparaisons : toutes les courbes portent la même unité
    // (l'indice) et ne peuvent donc pas se distinguer par leur échelle. Le style du
    // trait sépare l'actif de la fiche de ses comparants, et il reste lisible pour qui
    // ne perçoit pas les couleurs — ce qu'une teinte seule n'aurait pas garanti (§9).
    // Entre comparants, c'est la teinte qui distingue : quatre traits tiretés
    // identiques seraient impossibles à rapporter à leur légende.
    const comparisons = Array.from({ length: overlayCount }, () =>
      chart.addSeries(LineSeries, {
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    )
    compareRef.current = comparisons

    return () => {
      priceLinesRef.current = []
      mainRef.current = null
      volumeRef.current = null
      averageRef.current = null
      compareRef.current = []

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
      for (const comparison of comparisons) chart.removeSeries(comparison)
    }
    /* `overlayCount` et non `indexed` : passer de deux comparants à trois doit
       recréer les séries, et le booléen ne bougeait pas dans ce cas. */
  }, [kind, showVolume, showMovingAverage, overlayCount])

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

    /* Actifs et grandeurs superposés — même traitement, même échelle indicée.

       La série et sa donnée sont appariées PAR INDEX : `overlayCount` a commandé la
       création, et l'effet de données se rejoue après celui de création. Le garde sur
       l'existence reste nécessaire pour le rendu intermédiaire, où `compare` a déjà
       changé alors que les séries n'ont pas encore été recréées. */
    overlays.forEach((entry, index) => {
      const comparison = compareRef.current[index]
      if (!comparison) return

      comparison.applyOptions({
        color: palette.compare[index % palette.compare.length] ?? palette.muted,
      })
      comparison.setData(
        indexSeries(entry.points).map((row) => ({
          time: toChartTime(showsTime, row.timestamp),
          value: row.value,
        })),
      )
    })

    applySeriesTheme(main, kind, palette, rising)
    applyChartTheme(chart, palette)

    /*
     * ── LE VOLUME, PRÉPARÉ UNE FOIS POUR DEUX USAGES ───────────────────────
     *
     * Il ne servait qu'au SOUS-PANNEAU, et n'était donc calculé que si celui-ci
     * existait. L'infobulle en a désormais besoin aussi, et sans condition — voir le
     * gestionnaire de croix de visée pour le pourquoi.
     *
     * La normalisation est donc sortie du `if`. Le sous-panneau, lui, reste
     * conditionnel : c'est une série de plus dans le graphique, pas une donnée de plus.
     */
    const volumeRows = (
      usesCandles
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
    )
      .filter((row): row is typeof row & { volume: number } => row.volume !== undefined)
      /* Le décalage de fuseau est appliqué ICI, une bonne fois : les deux usages
         indexent sur l'horodatage que le graphique manipule, jamais sur le brut. */
      .map((row) => ({
        time: toChartTime(showsTime, row.timestamp),
        value: row.volume * rate,
        up: row.up,
      }))

    /*
     * ── TABLE HORODATAGE → VOLUME, POUR L'INFOBULLE ────────────────────────
     *
     * Une `ref` et non un état : elle est lue dans un écouteur d'événement, et la
     * poser en état déclencherait un rendu à chaque changement de série.
     */
    volumeByTime.current = new Map(volumeRows.map((row) => [row.time as number, row.value]))

    /* Sous-panneau — uniquement si le lecteur l'a demandé ET si la source a fourni
       de quoi le tracer. */
    const volume = volumeRef.current
    if (volume) {
      volume.setData(
        volumeRows.map((row) => ({
          time: row.time,
          value: row.value,
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
    // `overlays` et non `compare` : c'est la liste FILTRÉE qui alimente les séries, et
    // elle est mémoïsée sur `compare`. Lister les deux ne changerait rien au nombre de
    // rejeux ; ne lister que `compare` laissait l'analyseur signaler l'écart.
    overlays,
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
    /*
     * `frameWidth` EST UNE DÉPENDANCE, et ce n'est pas un abus.
     *
     * La bibliothèque ne conserve pas la plage visible quand son cadre change de
     * taille : elle conserve l'ÉCART entre deux points, et ancre la série à droite.
     * Un cadre qui s'élargit accueille donc plus de barres qu'il n'en existe, et le
     * surplus se traduit par du vide — à gauche, puisque c'est la droite qui est
     * ancrée.
     *
     * Constaté au passage en plein écran : la fenêtre passait de 1 090 à 1 509 pixels
     * et la courbe se tassait sur les deux tiers droits, un tiers d'écran vide devant
     * elle. Rejouer le cadrage à chaque changement de largeur le corrige sans logique
     * supplémentaire — c'est exactement le travail que cet effet fait déjà, il lui
     * manquait seulement de savoir que la largeur compte.
     */
  }, [navWindow, navValues.length, frameWidth])

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

      /*
       * ── LE VOLUME NE DÉPEND PLUS DU SOUS-PANNEAU ─────────────────────────
       *
       * Il était lu dans la SÉRIE de volume, laquelle n'existe que si le lecteur a
       * coché « Volume en sous-panneau ». L'infobulle n'affichait donc « Vol » que
       * dans un mode qu'à peu près personne n'active — alors que la donnée est là,
       * dans les mêmes points, depuis le début.
       *
       * CoinGecko l'affiche toujours, et c'est justifié : sur un point de courbe, le
       * volume dit si le mouvement a été SUIVI. Un décrochage à volume nul et un
       * décrochage à volume triple ne racontent pas la même chose, et le cours seul
       * ne permet pas de les distinguer.
       *
       * La série reste consultée EN PREMIER quand elle existe : elle porte la valeur
       * déjà convertie dans la devise d'affichage, et la relire évite d'appliquer le
       * taux deux fois.
       */
      const fromSeries = volume ? param.seriesData.get(volume) : undefined
      if (fromSeries && 'value' in fromSeries) {
        next.volume = fromSeries.value as number
      } else {
        const raw = volumeByTime.current.get(param.time as number)
        if (raw !== undefined) next.volume = raw
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
    /* `chart-stretch` : voir `OverviewTab` et `globals.css` — maillon de la chaîne qui
       distribue la hauteur au tracé quand le cadre passe en plein écran. */
    <div className="chart-stretch relative w-full">
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

      {/*
        `chart-plot` : la boîte qui donne sa taille au graphique, et le seul endroit où
        cette taille est écrite. En lecture normale c'est le style en ligne ci-dessous ;
        en plein écran, la règle `.chart-frame:fullscreen .chart-plot` de `globals.css`
        la remplace par « tout l'espace restant ». La bibliothèque suit, puisqu'elle est
        en `autoSize` — voir la création de l'instance.

        `min-h-0` : indispensable dès que ce bloc devient un élément flexible, la
        hauteur minimale par défaut d'un tel élément étant celle de son contenu. Sans
        lui, le canvas refuserait de rétrécir et déborderait du cadre en plein écran.
      */}
      <div className="chart-plot relative min-h-0" style={{ height }}>
        <div ref={containerRef} role="img" aria-label={label} className="h-full w-full" />

        {/*
          ── LA MARQUE, DANS LE COIN OÙ ELLE NE GÊNE PAS ────────────────────────

          Un graphique de cours se lit de gauche à droite et s'arrête sur la dernière
          valeur ; le coin bas-droit est donc la zone la moins regardée du cadre, et
          c'est précisément là que la référence pose la sienne.

          Elle sert à deux choses. D'abord à SIGNER : ces courbes circulent en capture
          d'écran, et sans marque elles deviennent anonymes au premier partage. Ensuite
          à situer — un lecteur qui retrouve l'image ailleurs sait d'où elle vient et
          peut revenir la consulter à jour.

          `pointer-events-none` sur tout le bloc : la croix de visée doit passer à
          travers. Sans cela, le survol s'interromprait dans un rectangle de cent
          pixels au moment précis où l'on inspecte les dernières valeurs.

          L'opacité est basse — 40 % — et c'est la limite entre les deux échecs
          possibles : plus haut, la marque se dispute la lecture avec la courbe ; plus
          bas, elle disparaît dès qu'une capture est recompressée.
        */}
        <span
          aria-hidden="true"
          /* `bottom-8` et `right-14` : la marque se pose DANS l'aire de tracé, pas
             sur les axes. L'axe des temps occupe la vingtaine de pixels du bas, celui
             des prix la cinquantaine de droite — à `bottom-6`, le mot chevauchait une
             graduation horaire. */
          className="pointer-events-none absolute bottom-8 right-14 flex select-none items-center gap-1 text-ink-muted opacity-40"
        >
          <ZenkuuMark className="h-3 w-auto" />
          <span className="text-[0.625rem] font-semibold lowercase tracking-wide">zenkuu</span>
        </span>

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
      /*
        ── LA FORME DE LA RÉFÉRENCE, ET CE QUI CHANGE ────────────────────────

        Trois écarts avec la version précédente, tous relevés sur la capture de
        CoinGecko :

          · `rounded-card` et non `rounded-dense`. La bulle de la référence est
            franchement arrondie — c'est une carte flottante, pas un contrôle. Voir
            les deux familles de rayons dans `globals.css`.

          · pas de BORDURE, une ombre portée plus marquée à la place. Une bordure sur
            fond sombre dessine un liseré gris qui découpe la bulle ; l'ombre la fait
            flotter, ce qui est l'effet voulu au-dessus d'une courbe.

          · les LIBELLÉS et les valeurs sur la même ligne, en `Prix :` / `Vol :`. La
            référence les met bout à bout plutôt qu'aux deux bords, ce qui resserre la
            bulle — et sur une bulle qui suit le curseur, la largeur compte : chaque
            pixel de plus est un pixel de courbe masqué.
      */
      className="pointer-events-none absolute z-20 min-w-[9rem] rounded-card bg-overlay px-3 py-2 text-[0.6875rem] shadow-overlay ring-1 ring-inset ring-white/5"
      style={{
        left: legend.x,
        top: legend.y,
        transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      {/* La date en PREMIER et en gris : c'est le repère, pas la valeur. Elle porte
          désormais son fuseau — voir `formatStamp`. */}
      <p className="tabular mb-1.5 whitespace-nowrap text-ink-muted">{legend.time}</p>

      <p className="tabular whitespace-nowrap">
        {/* « Indice » et non « Cours » en comparaison : l'axe ne porte alors plus des
            montants mais une base 100, et l'infobulle ne doit pas contredire la
            mention qui l'explique sous le graphique. */}
        <span className="text-ink-muted">{indexed ? 'Indice' : 'Prix'} : </span>
        <span className="font-semibold text-ink">{formatPrice(legend.price ?? 0)}</span>
      </p>

      {legend.volume !== undefined ? (
        <p className="tabular mt-0.5 whitespace-nowrap">
          <span className="text-ink-muted">Vol : </span>
          <span className="font-semibold text-ink">{formatCompact(legend.volume)}</span>
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
  /**
   * Teintes des courbes de COMPARAISON, dans l'ordre de leur ajout.
   *
   * Les mêmes jetons que les autres figures du site (`--color-data-1` à `-4`),
   * ordonnés par distance perceptuelle. Inventer une palette pour ce graphique aurait
   * fait diverger les couleurs d'un même actif entre une courbe et un camembert.
   *
   * Quatre suffisent : c'est `COMPARE_MAX`, et le panneau de comparaison n'en laisse
   * pas choisir davantage.
   */
  compare: string[]
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
    compare: [
      token('--color-data-1', '#3d63c2'),
      token('--color-data-2', '#c2853d'),
      token('--color-data-3', '#3da4c2'),
      token('--color-data-4', '#9c3dc2'),
    ],
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

/**
 * ÉCHELLE ABRÉGÉE — « 1,7 Bn » plutôt que « 1 700 000 000 000 ».
 *
 * Réservée aux grandeurs qui se comptent en milliards : capitalisation, volume. Un
 * cours ne passe jamais par ici, et c'est voulu — abréger « 63 240 € » en « 63,2 k »
 * ferait perdre la précision qu'on vient justement lire sur une courbe de prix.
 *
 * ── POURQUOI L'AXE ET PAS L'INFOBULLE ────────────────────────────────────────
 *
 * L'axe a QUATRE-VINGTS pixels de large et six graduations. Sans abréviation, une
 * capitalisation y écrivait treize chiffres et trois séparateurs : la bibliothèque
 * élargit alors la colonne d'échelle jusqu'à lui donner le quart du cadre, qu'elle
 * prend au tracé. C'est ce que fait la référence, dont l'axe porte « €1.7T ».
 *
 * L'infobulle, elle, garde le montant EXACT. Elle n'a pas de contrainte de largeur,
 * et c'est le seul endroit où l'on vient chercher une valeur précise — la référence
 * fait le même partage.
 *
 * ── LA PRÉCISION EST EN CHIFFRES SIGNIFICATIFS, PAS EN DÉCIMALES ─────────────
 *
 * C'est tout l'objet de `formatCompactAxis`, dont la note détaille la mesure : avec
 * une décimale fixe, les six graduations d'une capitalisation sur sept jours
 * affichaient TOUTES « 1,3 Bn ».
 *
 * Elle vit dans `@zenkuu/ui` et non ici parce que le tracé SVG rendu avant
 * l'hydratation doit écrire exactement les mêmes étiquettes : deux échelles
 * différentes feraient sauter l'axe au moment de la bascule.
 *
 * Ce n'est donc PAS le `formatCompact` du sous-panneau de volume, et l'écart est
 * assumé : un histogramme de volume se lit à l'ordre de grandeur, une échelle de prix
 * se lit à la graduation près.
 *
 * Le repli couvre le `null` d'une valeur non finie — que la bibliothèque ne devrait
 * jamais passer à un formateur d'axe, mais qui rendrait l'axe muet si elle le faisait.
 */
function formatCompactPrice(value: number): string {
  return formatCompactAxis(value) ?? formatPrice(value)
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

  const texte = date.toLocaleString(
    'fr-FR',
    days <= 7
      ? /*
         * L'ANNÉE FIGURE MÊME SUR LES FENÊTRES COURTES.
         *
         * « 14 août, 21:00 » ne dit pas de quelle année il s'agit — ce qui n'a l'air
         * de rien tant qu'on regarde les sept derniers jours, et devient faux dès
         * qu'on lit une capture d'écran, qu'on compare deux fiches ou qu'on remonte
         * la courbe d'un an au palier suivant. La référence date toujours en entier,
         * et cinq caractères de plus ne coûtent rien à une bulle de 160 pixels.
         */
        {
          timeZone: 'UTC',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' },
  )

  /*
   * ── LE FUSEAU EST AJOUTÉ À LA MAIN, ET IL LE FAUT ─────────────────────────
   *
   * CoinGecko date ses infobulles « Aug 17, 2026, 04:05:00 GMT+2 » : sans le fuseau,
   * une heure ne dit pas de quelle heure il s'agit — et sur un actif coté à New York
   * lu depuis Paris, l'écart est de six heures.
   *
   * Il ne peut PAS venir de `Intl` (`timeZoneName: 'shortOffset'`) : le formateur
   * annoncerait alors « UTC », qui est le fuseau qu'on lui a demandé, et non celui du
   * lecteur. Or l'heure affichée est bien LOCALE — la valeur a été décalée à l'aller
   * par `toChartTime`, parce que la bibliothèque de tracé ne rend qu'en UTC. Le
   * `timeZone: 'UTC'` ci-dessus est la contrepartie exacte de ce décalage, pas une
   * déclaration de fuseau.
   *
   * On lit donc le décalage RÉEL du navigateur et on l'écrit soi-même. `getTimezoneOffset`
   * rend des minutes, et de signe INVERSE à l'usage courant : Paris en été vaut −120,
   * ce qui s'écrit « GMT+2 ».
   *
   * Les fuseaux à minutes non nulles existent (Inde : +5:30, Népal : +5:45) et ne sont
   * pas des cas d'école — d'où la partie fractionnaire, affichée seulement quand elle
   * n'est pas nulle.
   */
  const decalageMinutes = -date.getTimezoneOffset()
  const signe = decalageMinutes >= 0 ? '+' : '−'
  const heures = Math.floor(Math.abs(decalageMinutes) / 60)
  const minutes = Math.abs(decalageMinutes) % 60
  const fuseau = `GMT${signe}${heures}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`

  return `${texte} ${fuseau}`
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
