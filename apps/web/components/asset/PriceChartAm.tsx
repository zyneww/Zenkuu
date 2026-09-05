'use client'

import * as am5 from '@amcharts/amcharts5'
import * as am5xy from '@amcharts/amcharts5/xy'
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated'
import am5locales_fr_FR from '@amcharts/amcharts5/locales/fr_FR'
import { useEffect, useRef, useState } from 'react'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE TRACÉ DE COURS — amCharts 5
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE BIBLIOTHÈQUE, APRÈS DEUX AUTRES ─────────────────────────
 *
 * Le graphique de cours a été écrit trois fois : `lightweight-charts` (canevas), puis
 * Recharts avec le reste du site, puis ceci. Le motif du dernier changement est
 * explicite : la référence visée — CoinGecko — dessine avec Highcharts, et amCharts 5
 * est ce qui s'en approche le plus. Curseur, infobulle, formats d'axe, étiquette de
 * dernière valeur : ce sont des primitives de la bibliothèque, là où Recharts demandait
 * de les rebâtir une par une.
 *
 * ⚠️ LA MARQUE « amCharts » EN BAS DU TRACÉ N'EST PAS UN OUBLI. La licence gratuite
 * l'exige, et la retirer sans licence commerciale serait une violation. C'est le choix
 * assumé du projet : pas de `am5.addLicense()` dans ce fichier, et pas de règle CSS pour
 * la masquer.
 *
 * ── CE COMPOSANT NE DESSINE QUE LE CADRE ───────────────────────────────────
 *
 * La bande de navigation reste à `ChartNavigator`, qui porte l'historique complet et
 * change la PÉRIODE quand on la déplace. Le `XYChartScrollbar` d'amCharts ferait un
 * beau navigateur, mais il est conçu pour cadrer les données du graphique lui-même —
 * jamais une série plus longue. Les deux ne se remplacent donc pas.
 *
 * ── LA RECONSTRUCTION EST ASSUMÉE ──────────────────────────────────────────
 *
 * amCharts se pilote impérativement, et la tentation est de muter finement : changer
 * l'échelle sans toucher aux séries, ajouter une courbe de comparaison sans refaire
 * les axes. C'est la voie des bogues d'état — la version canevas de ce fichier
 * comptait sept effets et cinq références mutables, et c'est là que vivaient ses
 * défauts.
 *
 * Ici, tout ce qui touche à la STRUCTURE — type de tracé, échelle, présence du volume,
 * nombre de comparants — reconstruit le graphique. Ce qui touche aux DONNÉES ne fait
 * que les repousser. Reconstruire coûte une poignée de millisecondes et n'arrive que
 * sur un geste explicite ; les données, elles, changent à chaque tic de cours.
 */

export interface AmPoint {
  /** Horodatage en millisecondes. */
  t: number
  price: number
  volume?: number
  /**
   * L'infobulle du point, déjà écrite.
   *
   * ── POURQUOI LE GABARIT EST DANS LES DONNÉES ────────────────────────────
   *
   * amCharts compose ses infobulles à partir d'un gabarit à trous (`{valueY}`) et de
   * son propre formateur de nombres. Deux formateurs pour une même page, c'est deux
   * conventions de séparateurs et de décimales qui finissent par diverger — et sur une
   * fiche de cotation, l'écart se lit.
   *
   * Le texte est donc écrit par React, avec le formateur Intl du reste du site, et
   * amCharts n'a plus qu'à le poser. Le gabarit se réduit à `{tip}`.
   *
   * Aucune donnée extérieure n'y entre : ce sont des nombres passés par `Intl`.
   */
  tip: string
  /** Colonnes de comparaison, en base 100. */
  [compare: string]: number | string | undefined
}

export interface AmCompare {
  key: string
  label: string
  color: string
}

export interface PriceChartAmProps {
  data: AmPoint[]
  /** Hauteur totale du cadre, bande de volume comprise. */
  height: number
  /** Étiquette de la région, pour les technologies d'assistance. */
  label: string
  /** Couleur de la courbe principale — la teinte de tendance. */
  color: string
  /** Formate une valeur pour l'ÉCHELLE, unité comprise. */
  formatAxis: (value: number) => string
  /** Dessiner l'histogramme de volume sous le tracé. */
  showVolume: boolean
  /** Échelle logarithmique des prix. */
  logScale: boolean
  /** Courbes superposées, en base 100. */
  compare: AmCompare[]
  /** Repères horizontaux — extrêmes de la fenêtre, records historiques. */
  referenceLines: { value: number; label: string; color: string }[]
  /** Animations désactivées quand le système le demande. */
  reducedMotion: boolean
  /** Poignée de capture, rendue au parent. */
  onReady?: (root: am5.Root | null) => void
  /**
   * Instant survolé par le curseur, en millisecondes — `null` dès qu'il quitte le tracé.
   *
   * ── POURQUOI UN HORODATAGE ET NON UN INDEX ────────────────────────────────
   *
   * C'est le point délicat, et un index serait FAUX. L'axe des temps est déclaré
   * `groupData: true` : au-delà d'une certaine densité, amCharts agrège lui-même les
   * points et ses `dataItems` ne correspondent plus un pour un à ceux qu'on lui a
   * passés. Un index lu chez lui désignerait donc une autre ligne dans la table de
   * l'appelant — d'autant plus décalée que la fenêtre est longue.
   *
   * L'horodatage, lui, survit au regroupement : c'est la même grandeur des deux côtés.
   * L'appelant retrouve sa ligne par recherche, et le contrat ne dépend plus d'un
   * détail de la bibliothèque.
   */
  onHover?: (timestamp: number | null) => void
}

/** Hauteur de la bande de volume, en pourcentage du cadre — voir `ASSET_CHART_HEIGHT`. */
const VOLUME_SHARE = 22

/**
 * Corps des étiquettes des DEUX axes.
 *
 * ⚠️ IL VALAIT 11 PIXELS, ET C'ÉTAIT TROP PETIT. L'échelle des prix est ce qu'on lit
 * pour donner une valeur à un point de la courbe : c'est la légende du tracé, pas une
 * mention de bas de page. À 11 px elle était rendue plus petite que le moindre libellé
 * du rail de chiffres, à quelques centimètres de là.
 *
 * 13 px correspond au `text-xs` du site, désormais aussi celui du bandeau de lecture
 * au-dessus de la courbe — les trois textes du cadre parlent donc du même corps.
 *
 * Déclaré UNE fois pour les deux axes : deux corps différents sur les deux bords du
 * même graphique se voient, et c'est le genre d'écart qui s'installe quand deux
 * réglages identiques vivent à trente lignes l'un de l'autre.
 */
const AXIS_LABEL_SIZE = 13

export function PriceChartAm({
  data,
  height,
  label,
  color,
  formatAxis,
  showVolume,
  logScale,
  compare,
  referenceLines,
  reducedMotion,
  onReady,
  onHover,
}: PriceChartAmProps) {
  /*
   * ── LE RAPPEL DE SURVOL PASSE PAR UNE RÉFÉRENCE, ET IL LE FAUT ────────────
   *
   * L'effet de structure DÉTRUIT et reconstruit le graphique à chaque changement de ses
   * dépendances. Y lister `onHover` — une fonction que le parent recrée à chaque rendu —
   * reconstruirait le cadre à chaque mouvement de souris, c'est-à-dire précisément
   * quand il ne faut pas.
   *
   * La référence est mise à jour APRÈS chaque rendu et lue au moment de l'événement :
   * le gestionnaire attaché une seule fois appelle toujours la version courante.
   *
   * ⚠️ L'AFFECTATION VIT DANS UN EFFET, pas dans le corps du composant. Écrire une
   * référence pendant le rendu est refusé par le compilateur React — un rendu doit
   * pouvoir être rejoué sans effet de bord. L'effet s'exécute avant tout événement de
   * souris, la référence est donc toujours à jour quand le curseur la lit.
   */
  const hoverRef = useRef(onHover)
  useEffect(() => {
    hoverRef.current = onHover
  }, [onHover])
  /*
   * Les EMPREINTES des deux tableaux de configuration.
   *
   * `compare` et `referenceLines` changent d'identité à chaque rendu du parent, et les
   * lister tels quels dans les dépendances de l'effet de construction reconstruirait le
   * graphique en boucle. On dépend donc de leur forme sérialisée : seule une vraie
   * modification la fait changer.
   */
  const compareKey = compare.map((entry) => `${entry.key}:${entry.color}`).join(',')
  const referenceKey = referenceLines.map((line) => `${line.value}:${line.label}`).join(',')

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * L'APPARENCE COURANTE, ET POURQUOI ELLE DOIT ÊTRE UNE DÉPENDANCE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ⚠️ LES VALEURS DE REPLI SONT CELLES DU THÈME SOMBRE, ET PLUS DES GRIS ORPHELINS.
   *
   * Elles ne servent que si `getComputedStyle` rend une chaîne vide — un graphique
   * construit avant que la feuille de style ne soit résolue. Ce chemin est rare, mais
   * il existe, et il peignait #8a8a8a, #383838 et #0c0c0c : trois teintes qui
   * n'appartenaient à AUCUN des deux thèmes. Le repli d'un jeton doit être la valeur
   * que ce jeton prend le plus souvent, sans quoi il introduit une quatrième palette
   * que personne n'a choisie — et il le fait précisément au moment où l'on ne peut
   * pas la voir venir.
   *
   * `readToken` résout les jetons CSS en couleurs à la CONSTRUCTION : amCharts peint en
   * canevas et `am5.color` attend une valeur, pas une référence (voir sa note). La
   * conséquence est écrite depuis toujours dans ce fichier — « le graphique doit être
   * reconstruit à la bascule de thème » — mais rien ne le déclenchait : les dépendances
   * de l'effet de structure ne portaient que `color`, un jeton (`var(--color-up)`) dont
   * la CHAÎNE ne change pas d'un thème à l'autre.
   *
   * Relevé au navigateur : passer en clair repeignait toute la page sauf le cadre, dont
   * la grille et les axes gardaient les couleurs du sombre — des filets presque noirs
   * sur fond blanc.
   *
   * ── POURQUOI LA CLASSE ET NON LE RÉGLAGE ─────────────────────────────────
   *
   * `useSettings().theme` vaut « suivre l'appareil » pour la majorité des visiteurs :
   * il ne dit donc pas ce qui est AFFICHÉ. La classe `dark` de `<html>`, elle, porte
   * l'apparence réelle quelle qu'en soit l'origine — réglage explicite, système au
   * chargement, ou système qui bascule en cours de visite (voir `ThemeSync`).
   *
   * L'état est initialisé par lecture directe : ce composant n'est jamais rendu au
   * serveur (`PriceChartInteractive` est importé en `ssr: false`), il n'y a donc aucune
   * divergence d'hydratation à craindre, et l'on évite une reconstruction au montage.
   */
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains('dark'))

    /* Un observateur plutôt qu'un abonnement au store : la classe est posée par
       `applyTheme`, mais aussi par le script d'amorçage avant toute hydratation. La
       surveiller couvre les deux, et tout ce qui la posera demain. */
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const holder = useRef<HTMLDivElement>(null)
  const chartRef = useRef<{
    root: am5.Root
    series: am5xy.LineSeries
    volume: am5xy.ColumnSeries | null
    compare: am5xy.LineSeries[]
    priceAxis: am5xy.ValueAxis<am5xy.AxisRenderer>
  } | null>(null)

  /*
   * ── EFFET DE STRUCTURE ────────────────────────────────────────────────────
   *
   * Il construit tout, et se rejoue quand la FORME du graphique change. Ses dépendances
   * sont donc les réglages, jamais les données : `data` n'y figure pas, sans quoi chaque
   * tic de cours détruirait et reconstruirait le cadre — un clignotement à la seconde.
   */
  useEffect(() => {
    const node = holder.current
    if (!node) return

    const root = am5.Root.new(node)

    /* Le thème « Animated » n'apporte QUE les transitions. On l'écarte quand le système
       demande moins de mouvement — c'est le seul réglage d'accessibilité qui compte ici,
       les couleurs venant toutes de nos jetons. */
    root.setThemes(reducedMotion ? [] : [am5themes_Animated.new(root)])

    /*
     * ⚠️ LA LOCALE N'EST PAS UN DÉTAIL DE CONFORT.
     *
     * amCharts formate lui-même les graduations de l'axe des temps, et son défaut est
     * l'anglais américain : sans cette ligne, l'axe écrivait « Aug 17 · Aug 18 » au
     * milieu d'une page française, sous un cours libellé « 77 333,01 $US ». La
     * bibliothèque livre ses locales, il suffit de poser la bonne.
     */
    root.locale = am5locales_fr_FR

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        /*
         * ── NI MOLETTE NI GLISSEMENT SUR LE TRACÉ ─────────────────────────
         *
         * Tout ce que la période choisie contient doit tenir dans le cadre. Un coup de
         * molette involontaire décadrerait le graphique sans qu'aucun bouton ne dise
         * comment revenir — on lirait « 24 h » dans la barre en regardant six heures.
         * Le zoom volontaire passe par la bande de navigation, qui montre OÙ l'on est.
         */
        panX: false,
        panY: false,
        wheelX: 'none',
        wheelY: 'none',
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: 0,
      }),
    )

    /* ── L'AXE DES TEMPS ────────────────────────────────────────────────────
       `baseInterval` à la minute : la plus fine granularité que les sources publient.
       amCharts regroupe ensuite lui-même selon la densité — c'est `groupData`, et c'est
       ce qui lui permet d'écrire « 23 août » là où Recharts écrivait cinq fois le même
       mois. */
    const xRenderer = am5xy.AxisRendererX.new(root, {
      /* 80 et non 64 : l'axe sans trous (voir plus bas) pose une graduation sur le
         PREMIER instant porteur de données, laquelle tombe à quelques pixels de la
         première graduation régulière. À 64 px les deux se chevauchaient au bord
         gauche — « 18 Aoû » par-dessus « 18 Aoû 12:00 ». */
      minGridDistance: 80,
      strokeOpacity: 0,
    })
    xRenderer.grid.template.setAll({ visible: false })
    xRenderer.labels.template.setAll({
      fill: am5.color(readToken('--color-ink-muted', '#969faf')),
      /* ⚠️ 11 px ÉTAIT TROP PETIT — voir la note de l'axe des prix, juste en dessous.
         Les deux axes montent ensemble : deux corps différents sur les deux bords du
         même cadre se verraient. */
      fontSize: AXIS_LABEL_SIZE,
    })

    /*
     * ══════════════════════════════════════════════════════════════════════════
     * ⚠️ AXE SANS TROUS — LE WEEK-END N'EST PLUS UN SEGMENT RECTILIGNE
     * ══════════════════════════════════════════════════════════════════════════
     *
     * Un `DateAxis` ordinaire réserve de la place à CHAQUE instant de la fenêtre,
     * qu'il porte une cotation ou non. Sur une action, les soixante-cinq heures qui
     * séparent la clôture du vendredi de l'ouverture du lundi n'ont aucun point : la
     * courbe les traversait donc d'un trait droit, sur près d'un cinquième de la
     * largeur du palier « 7 J ». Relevé sur NFLX, du 21 au 24 août : une diagonale
     * parfaite, « Vol 0 », qui se lit comme une séance sans volatilité alors
     * qu'aucune séance n'a eu lieu.
     *
     * `GaplessDateAxis` ne garde que les instants RÉELLEMENT porteurs de données et
     * colle les séances les unes aux autres — c'est ce que font Yahoo Finance et
     * TradingView, et c'est la seule façon d'être exact sans hacher la courbe.
     *
     * Il est posé pour TOUTES les classes d'actif, y compris les cryptos : leur série
     * n'a pas de trou, l'axe n'a donc rien à retirer et le rendu est identique. Un
     * axe conditionnel obligerait à faire descendre la classe d'actif jusqu'ici pour
     * un résultat que la donnée décrit déjà.
     */
    const xAxis = chart.xAxes.push(
      am5xy.GaplessDateAxis.new(root, {
        baseInterval: { timeUnit: 'minute', count: 1 },
        groupData: true,
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, { forceHidden: true }),
      }),
    )

    /* ── L'AXE DES PRIX, À DROITE ───────────────────────────────────────────
       C'est le bord où s'arrête la lecture d'une courbe de cours, et donc celui où l'on
       cherche la dernière valeur. */
    const yRenderer = am5xy.AxisRendererY.new(root, {
      opposite: true,
      strokeOpacity: 0,
    })
    yRenderer.grid.template.setAll({
      stroke: am5.color(readToken('--color-border-subtle', '#1c1e26')),
      strokeOpacity: 1,
    })
    yRenderer.labels.template.setAll({
      fill: am5.color(readToken('--color-ink-muted', '#969faf')),
      fontSize: AXIS_LABEL_SIZE,
    })

    /*
     * ⚠️ L'UNITÉ EST ÉCRITE SUR CHAQUE GRADUATION, et c'est ce que l'axe n'avait pas.
     * Il portait « 80 000 » — un nombre sans nature. La référence écrit « $97.00 » : on
     * sait à la première graduation qu'on lit des dollars et non des jetons. Le
     * formatage passe par un adaptateur plutôt que par `numberFormat` : c'est notre
     * formateur Intl qui décide, le même que le reste de la page.
     */
    yRenderer.labels.template.adapters.add('text', (_text, target) => {
      const value = (target.dataItem as am5.DataItem<am5xy.IValueAxisDataItem> | undefined)?.get(
        'value',
      )
      if (typeof value !== 'number') return ''
      /* ⚠️ PAS DE GRADUATION NÉGATIVE SUR UNE ÉCHELLE DE COURS. `extraMin` étend
         l'échelle de 8 % SOUS le minimum ; sur « MAX », où la série part de 3 000 $
         pour monter à 125 000 $, ces 8 % passent sous zéro et l'axe écrivait
         « -20 000,00 $ » — un prix qui n'existe pas. La graduation reste, son
         étiquette disparaît. */
      if (value < 0) return ''
      return formatAxis(value)
    })

    const priceAxis = chart.yAxes.push(
      logScale
        ? am5xy.ValueAxis.new(root, {
            renderer: yRenderer,
            logarithmic: true,
            treatZeroAs: 0.000001,
            extraMax: 0.12,
            extraMin: 0.08,
          })
        : am5xy.ValueAxis.new(root, {
            renderer: yRenderer,
            extraMax: 0.12,
            extraMin: 0.08,
          }),
    )

    /*
     * ── LA BANDE DE VOLUME EST UN AXE EMPILÉ ──────────────────────────────
     *
     * Un axe d'amCharts est un conteneur : lui donner une hauteur et une ordonnée le
     * cantonne à une bande du cadre. L'axe des prix garde le haut, celui des volumes
     * occupe le bas — deux aires distinctes, une seule échelle de temps, un seul
     * curseur. C'est la disposition de la référence, obtenue sans second graphique à
     * synchroniser.
     */
    let volumeSeries: am5xy.ColumnSeries | null = null

    if (showVolume) {
      priceAxis.setAll({ height: am5.percent(100 - VOLUME_SHARE) })

      const volumeRenderer = am5xy.AxisRendererY.new(root, {
        opposite: true,
        strokeOpacity: 0,
      })
      volumeRenderer.grid.template.setAll({ visible: false })
      volumeRenderer.labels.template.setAll({ visible: false })

      const volumeAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: volumeRenderer,
          height: am5.percent(VOLUME_SHARE),
          y: am5.percent(100 - VOLUME_SHARE),
          centerY: am5.p0,
          min: 0,
        }),
      )

      volumeSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name: 'volume',
          xAxis,
          yAxis: volumeAxis,
          valueXField: 't',
          valueYField: 'volume',
        }),
      )
      volumeSeries.columns.template.setAll({
        fill: am5.color(readToken('--color-ink-muted', '#969faf')),
        fillOpacity: 0.3,
        strokeOpacity: 0,
        width: am5.percent(70),
      })
    }

    /* ── LA COURBE PRINCIPALE ───────────────────────────────────────────────
       `tooltipHTML` plutôt que `tooltipText` : l'infobulle porte trois lignes de
       hiérarchies différentes — une date grise, un prix en gras, un volume — et un
       gabarit texte ne sait pas les distinguer. Les valeurs sont PRÉ-FORMATÉES dans les
       données (voir `AmPoint`) : c'est notre formateur Intl qui écrit les nombres, et
       non celui d'amCharts, sans quoi la bulle et le reste de la page divergeraient sur
       les séparateurs et les décimales. */
    const series = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'price',
        xAxis,
        yAxis: priceAxis,
        valueXField: 't',
        valueYField: 'price',
        stroke: am5.color(readToken(color, color)),
        tooltip: am5.Tooltip.new(root, {
          getFillFromSprite: false,
          getStrokeFromSprite: false,
          autoTextColor: false,
          labelHTML: '{tip}',
          /* À CÔTÉ de la verticale, pas au-dessus d'elle. L'orientation par défaut est
             verticale : la bulle se posait sur la courbe et masquait précisément le
             morceau de tracé qu'on était en train de lire. `horizontal` la met sur le
             flanc, et laisse amCharts choisir le côté qui tient dans le cadre — à
             droite tant qu'il y a la place, ce qui est le cas partout sauf en fin de
             période. */
          pointerOrientation: 'horizontal',
        }),
      }),
    )

    /*
     * ══════════════════════════════════════════════════════════════════════════
     * LA BULLE EST DÉCROCHÉE DE L'ORDONNÉE DU POINT : ELLE MONTE EN HAUT DU CADRE
     * ══════════════════════════════════════════════════════════════════════════
     *
     * `pointerOrientation: 'horizontal'` ne suffisait pas, et le défaut se MESURE au
     * navigateur : l'orientation horizontale décale la bulle sur le flanc mais la
     * garde CENTRÉE VERTICALEMENT sur le point survolé, à une quinzaine de pixels.
     * Quinze pixels séparent donc son bord de la pastille de 12 px posée sur la
     * courbe — et il n'en reste aucun dans les deux cas les plus fréquents : quand la
     * bulle grandit (une comparaison lui ajoute une ligne par courbe) et quand
     * amCharts la ramène dans le cadre près d'un bord, ce qui la fait basculer de
     * l'autre côté en la collant au point. La pastille passe alors dessous : c'est le
     * point qu'on cherche à lire qui disparaît, à l'instant où on le vise.
     *
     * ── L'ADAPTATEUR PLUTÔT QU'UN RÉGLAGE ────────────────────────────────────
     *
     * `XYSeries` n'a pas de réglage pour cela — `tooltipPositionX/Y` choisissent
     * QUELLE VALEUR de la donnée sert d'ancre (ouverture, plus haut…), pas où la bulle
     * se pose. On intercepte donc le point d'ancrage lui-même : `pointTo` est un
     * réglage de l'infobulle, et un adaptateur en réécrit la valeur à chaque lecture,
     * après qu'amCharts l'a calculée.
     *
     * L'ABSCISSE est conservée telle quelle — la bulle continue de suivre la colonne
     * de temps sous le curseur, ce qui est tout ce qu'on lui demande. Seule
     * l'ORDONNÉE est remplacée par le haut de l'aire de tracé, là où il n'y a ni
     * pastille ni courbe à masquer. amCharts la rentre ensuite dans le cadre par son
     * propre bornage, quelle que soit sa hauteur.
     */
    const priceTooltip = series.get('tooltip')
    priceTooltip?.adapters.add('pointTo', (point) => {
      if (!point) return point
      /* Le haut du tracé est LU à chaque fois, jamais mémorisé : la hauteur du cadre
         change au redimensionnement de la fenêtre et à l'apparition de la bande de
         volume, et une valeur figée décalerait la bulle sans que rien ne le signale. */
      return { x: point.x, y: chart.plotContainer.toGlobal({ x: 0, y: 0 }).y }
    })

    series.strokes.template.setAll({ strokeWidth: 2 })
    styleTooltip(root, series.get('tooltip'))

    /* Le dégradé sous la courbe — la même forme que chez la référence : dense au trait,
       éteint au bas du cadre. Il n'habille QUE la courbe principale ; superposés, deux
       remplissages se salissent l'un l'autre. */
    if (compare.length === 0) {
      series.fills.template.setAll({
        visible: true,
        fillOpacity: 1,
        fillGradient: am5.LinearGradient.new(root, {
          stops: [
            { color: am5.color(readToken(color, color)), opacity: 0.28 },
            { color: am5.color(readToken(color, color)), opacity: 0 },
          ],
          rotation: 90,
        }),
      })
    }

    /* ── LES COURBES DE COMPARAISON ─────────────────────────────────────────
       Trait tireté sur toutes : c'est lui qui dit « ceci n'est pas l'actif de la
       fiche », et il reste lisible pour qui ne perçoit pas les couleurs. La teinte ne
       fait que les distinguer entre elles. */
    const compareSeries = compare.map((entry) => {
      const line = chart.series.push(
        am5xy.LineSeries.new(root, {
          name: entry.label,
          xAxis,
          yAxis: priceAxis,
          valueXField: 't',
          valueYField: entry.key,
          stroke: am5.color(readToken(entry.color, entry.color)),
        }),
      )
      line.strokes.template.setAll({ strokeWidth: 1.5, strokeDasharray: [5, 3] })
      return line
    })

    /* ── LES REPÈRES HORIZONTAUX ────────────────────────────────────────────
       Hors du domaine tracé, amCharts les place au bord ; on les laisse à l'appelant,
       qui ne passe que ceux qui ont un sens dans la fenêtre. */
    for (const line of referenceLines) {
      const item = priceAxis.makeDataItem({ value: line.value })
      priceAxis.createAxisRange(item)

      item.get('grid')?.setAll({
        visible: true,
        stroke: am5.color(readToken(line.color, line.color)),
        strokeOpacity: 0.8,
        strokeDasharray: [4, 4],
      })
      item.get('label')?.setAll({
        visible: true,
        text: line.label,
        fill: am5.color(readToken(line.color, line.color)),
        fontSize: 10,
        inside: true,
        centerX: am5.p100,
        centerY: am5.p100,
      })
    }

    /* ── LE CURSEUR ─────────────────────────────────────────────────────────
       Une verticale TIRETÉE seule : l'horizontale de la croix de visée doublerait les
       lignes de grille sans rien apprendre, et la référence ne la dessine pas non plus.
       `behavior: 'none'` — le glissement ne doit pas zoomer, voir le réglage du cadre. */
    const cursor = chart.set(
      'cursor',
      am5xy.XYCursor.new(root, { behavior: 'none', xAxis }),
    )

    /*
     * ── L'INFOBULLE SORT OÙ QUE SOIT LA SOURIS ────────────────────────────
     *
     * C'est CE réglage, et lui seul, qui donne le relevé de la référence : une
     * bulle qui suit la colonne de temps sous le curseur, que le pointeur frôle la
     * courbe ou traverse le vide au-dessus.
     *
     * `maxTooltipDistance` vaut -1 par défaut, et -1 ne veut pas dire « aucune
     * limite » : il veut dire « seulement la série la plus proche du POINTEUR ».
     * Loin du tracé, aucune série n'était assez proche et la bulle disparaissait
     * précisément là où on la cherchait. `0` lève la condition de distance ; une
     * seule série porte une infobulle, il n'y a donc rien à départager.
     */
    chart.set('maxTooltipDistance', 0)
    cursor.lineY.set('visible', false)
    /* Le trait suit le relevé ASXN : un pointillé plus SERRÉ (3 3 et non 4 4) et plus
       discret (0,55 et non 0,8). Le crosshair désigne un instant, il ne le souligne
       pas — à 0,8 il tenait la même présence que la courbe qu'il sert à lire.

       ⚠️ CES TROIS VALEURS SONT LE DOUBLON ASSUMÉ de `--chart-crosshair` et
       `--chart-crosshair-dash` dans `globals.css`, qui habillent le crosshair des
       tracés Recharts. amCharts ne peut PAS lire les jetons : il construit ses
       couleurs en JavaScript (`am5.color`), et la valeur du jeton est un
       `color-mix(…)` que `getPropertyValue` rend sans le résoudre. Le doublon est donc
       la seule façon d'avoir la même teinte des deux côtés — les jetons ont été
       ramenés sur CES valeurs-ci, et non l'inverse. Modifier l'un exige de modifier
       l'autre, sans quoi deux pages voisines désignent l'instant survolé autrement. */
    cursor.lineX.setAll({
      stroke: am5.color(readToken('--color-ink-muted', '#969faf')),
      strokeDasharray: [3, 3],
      strokeOpacity: 0.55,
    })

    /* ── LE POINT DE SURVOL ─────────────────────────────────────────────────
       La pastille posée SUR la courbe à l'instant survolé. amCharts ne la fournit
       pas : ses puces sont attachées aux données, il en faudrait une par point —
       plusieurs milliers d'objets pour n'en montrer qu'un. Un seul cercle, déplacé
       à la main dans le conteneur de tracé, fait le même travail.

       Ses coordonnées sont recalculées depuis les AXES et non lues sur le pointeur :
       le curseur s'aligne sur l'abscisse, mais l'ordonnée doit être celle du cours,
       sans quoi la pastille flotterait à côté du tracé. */
    const hoverDot = chart.plotContainer.children.push(
      am5.Circle.new(root, {
        radius: 4,
        fill: am5.color(readToken(color, color)),
        fillOpacity: 1,
        stroke: am5.color(readToken('--color-canvas', '#0e0f14')),
        strokeWidth: 2,
        forceHidden: true,
      }),
    )

    /* ── UNE PASTILLE PAR COURBE DE COMPARAISON ─────────────────────────────
       Le repère ne valait que pour l'actif de la fiche : sur une comparaison, la
       verticale traversait la seconde courbe sans rien y marquer, et l'infobulle
       annonçait un cours dont on ne pouvait pas voir d'où il était lu. Une pastille
       de la teinte de sa courbe, cerclée du fond comme la première, rattache chaque
       nombre de la bulle à son tracé. */
    const compareDots = compare.map((entry) =>
      chart.plotContainer.children.push(
        am5.Circle.new(root, {
          radius: 4,
          fill: am5.color(readToken(entry.color, entry.color)),
          fillOpacity: 1,
          stroke: am5.color(readToken('--color-canvas', '#0e0f14')),
          strokeWidth: 2,
          forceHidden: true,
        }),
      ),
    )

    const hideDots = () => {
      hoverDot.set('forceHidden', true)
      for (const dot of compareDots) dot.set('forceHidden', true)
    }

    /*
     * ── LE BANDEAU DE LECTURE SUIT DÉSORMAIS LE CURSEUR ───────────────────────
     *
     * Il ne le suivait pas, et l'ancienne note de `PriceChartInteractive` disait
     * pourquoi : « faire remonter la position survolée jusqu'à React demanderait un
     * écouteur par point de données ». C'était faux — il en faut UN, sur le curseur,
     * qui porte déjà l'élément survolé de la série.
     *
     * `cursormoved` est émis à chaque image pendant un déplacement. On ne remonte donc
     * l'information que lorsque l'INSTANT survolé change réellement : sans ce garde-fou,
     * traverser le tracé provoquerait une soixantaine de rendus React par seconde pour
     * un bandeau qui n'a que quelques dizaines de valeurs distinctes à montrer.
     *
     * `pointerout` sur le conteneur de tracé — et non sur la racine — parce que c'est la
     * zone où le curseur existe. Sortir vers la barre d'outils rend donc la main au
     * dernier relevé, ce qui est l'état de repos attendu.
     */
    let lastStamp: number | null = null

    const report = (stamp: number | null) => {
      if (stamp === lastStamp) return
      lastStamp = stamp
      hoverRef.current?.(stamp)
    }

    cursor.events.on('cursormoved', () => {
      const item = series.get('tooltipDataItem') as
        | am5.DataItem<am5xy.ILineSeriesDataItem>
        | undefined
      const stamp = item?.get('valueX')
      const price = item?.get('valueY')

      if (typeof stamp === 'number' && typeof price === 'number') {
        /* L'abscisse est la même pour toutes les pastilles — c'est la définition du
           repère : une colonne de temps. Seule l'ordonnée change d'une courbe à
           l'autre, et elle est lue sur la LIGNE de données, pas sur la série : toutes
           les séries partagent le même tableau (voir l'effet de données plus bas), si
           bien qu'un seul relevé porte déjà la valeur de chaque comparaison. */
        const x = xAxis.get('renderer').positionToCoordinate(xAxis.valueToPosition(stamp))
        const row = item?.dataContext as Record<string, unknown> | undefined

        hoverDot.setAll({
          x,
          y: priceAxis.get('renderer').positionToCoordinate(priceAxis.valueToPosition(price)),
          forceHidden: false,
        })

        compare.forEach((entry, index) => {
          const dot = compareDots[index]
          if (!dot) return
          const value = row?.[entry.key]
          if (typeof value !== 'number') {
            dot.set('forceHidden', true)
            return
          }
          dot.setAll({
            x,
            y: priceAxis.get('renderer').positionToCoordinate(priceAxis.valueToPosition(value)),
            forceHidden: false,
          })
        })
      } else {
        hideDots()
      }

      report(typeof stamp === 'number' ? stamp : null)
    })

    chart.plotContainer.events.on('pointerout', () => {
      hideDots()
      report(null)
    })

    /* ── L'ÉTIQUETTE DU DERNIER COURS, SUR L'ÉCHELLE ────────────────────────
       Le chiffre qu'on vient chercher en premier est le dernier, et l'échelle ne le
       donne qu'à l'estime : elle porte des graduations rondes, jamais la valeur
       courante. C'est la pastille pleine de la référence, et amCharts la fournit comme
       une plage d'axe. Elle est remplie par l'effet de données, qui seul connaît le
       dernier point. */
    const lastItem = priceAxis.makeDataItem({ value: 0 })
    priceAxis.createAxisRange(lastItem)
    lastItem.get('grid')?.setAll({ visible: false })
    const lastLabel = lastItem.get('label')
    lastLabel?.setAll({
      visible: false,
      fill: am5.color(readToken('--color-canvas', '#0e0f14')),
      background: am5.RoundedRectangle.new(root, {
        fill: am5.color(readToken(color, color)),
        cornerRadiusTL: 4,
        cornerRadiusTR: 4,
        cornerRadiusBL: 4,
        cornerRadiusBR: 4,
      }),
      /* La pastille du DERNIER cours, sur l'échelle. Un point sous les graduations
         (12 contre 13) et non deux : elle porte un fond plein, qui la détache déjà —
         l'aligner exactement sur l'axe la ferait au contraire peser trop lourd. Elle
         suivait les 10 px de l'ancien axe et se retrouvait, elle, illisible. */
      fontSize: 12,
      fontWeight: '600',
      paddingLeft: 5,
      paddingRight: 5,
      paddingTop: 2,
      paddingBottom: 2,
      centerY: am5.p50,
    })

    chartRef.current = { root, series, volume: volumeSeries, compare: compareSeries, priceAxis }
    onReady?.(root)

    return () => {
      onReady?.(null)
      /* Le survol est ANNULÉ au démontage : sans cela, changer de période laisserait le
         bandeau figé sur l'instant survolé d'un graphique qui n'existe plus. */
      hoverRef.current?.(null)
      chartRef.current = null
      root.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `data` est volontairement absent : voir la note de l'effet
  }, [
    height,
    showVolume,
    logScale,
    color,
    reducedMotion,
    formatAxis,
    onReady,
    compareKey,
    referenceKey,
    /* Voir la note de `dark` : c'est ce qui fait repeindre le cadre à la bascule de
       thème, les jetons étant résolus une fois pour toutes à la construction. */
    dark,
  ])

  /* ── EFFET DE DONNÉES ─────────────────────────────────────────────────────
     Il ne fait que pousser les points, et se rejoue à chaque tic. C'est la séparation
     qui rend le montage tenable : reconstruire ici clignoterait à la seconde. */
  useEffect(() => {
    const current = chartRef.current
    if (!current) return

    current.series.data.setAll(data)
    current.volume?.data.setAll(data)
    for (const line of current.compare) line.data.setAll(data)

    /* L'étiquette de dernière valeur suit le dernier point. Elle est masquée quand la
       série est vide — une pastille posée sur zéro serait un chiffre inventé. */
    const last = data[data.length - 1]
    const range = current.priceAxis.axisRanges.getIndex(
      current.priceAxis.axisRanges.length - 1,
    )
    if (range) {
      range.set('value', last?.price ?? 0)
      range.get('label')?.setAll({
        visible: last !== undefined,
        text: last ? formatAxis(last.price) : '',
      })
    }
  }, [data, formatAxis])

  return (
    <div
      ref={holder}
      role="img"
      aria-label={label}
      className="w-full"
      style={{ height }}
    />
  )
}

/**
 * L'infobulle d'amCharts, alignée sur le langage relevé chez ASXN HyperScreener.
 *
 * ── CE QUI CHANGE, ET POURQUOI ────────────────────────────────────────────────
 *
 * Elle était OPAQUE — `fillOpacity: 1` sur la couche flottante du site. Une infobulle
 * opaque est une carte posée SUR le graphique : elle cache le morceau de courbe qu'on
 * était précisément en train de lire, à l'instant où on le lit.
 *
 * Le relevé du 2026-09-02 (voir `CHARTS_AUDIT.md`) mesure chez eux un fond à 80 %
 * d'opacité, floutée par-dessous. Le résultat n'est plus une carte mais une loupe : on
 * voit à travers, la courbe reste lisible sous le chiffre qui la commente.
 *
 * ⚠️ LE FLOU NE PASSE PAS PAR ICI. amCharts peint en SVG et ne connaît pas
 * `backdrop-filter` ; le fond translucide, lui, est natif. C'est déjà l'essentiel de
 * l'effet — le flou sépare deux textes superposés, l'opacité fait le reste. Le reste du
 * site (les tracés Recharts) l'obtient par `--chart-tooltip-blur` dans `chart.tsx`.
 *
 * Le rayon suit les 4 px du relevé, et non les 8 des cartes du site : une infobulle
 * n'est pas une carte, et c'est justement ce qu'on cherche à ne plus lui faire dire.
 */
function styleTooltip(root: am5.Root, tooltip: am5.Tooltip | undefined): void {
  if (!tooltip) return

  tooltip.get('background')?.setAll({
    fill: am5.color(readToken('--color-overlay', '#1a1a1a')),
    /* 0,86 en clair, 0,8 en sombre chez eux. Une seule valeur ici : l'écart de six
       centièmes ne se voit pas, et deux valeurs demanderaient de lire le thème en
       JavaScript puis de re-peindre à chaque bascule — ce que ce fichier évite
       partout ailleurs. */
    fillOpacity: 0.86,
    stroke: am5.color(readToken('--color-border-subtle', '#1c1e26')),
    strokeOpacity: 0.5,
  })
  tooltip.label.setAll({
    fill: am5.color(readToken('--color-ink', '#f4f4f4')),
  })
  void root
}

/**
 * Résout un jeton CSS en couleur utilisable par amCharts.
 *
 * ── POURQUOI CETTE LECTURE EXISTE, ALORS QU'ELLE AVAIT ÉTÉ SUPPRIMÉE ──────────
 *
 * En SVG, `stroke="var(--color-up)"` fonctionne : le navigateur résout la variable à la
 * peinture, et le tracé suit la bascule de thème sans qu'on lise rien en JavaScript.
 * C'est ce que faisait la version Recharts, et c'était mieux.
 *
 * amCharts ne peint pas par attributs : il construit ses couleurs en JavaScript
 * (`am5.color`), qui attend une valeur, pas une référence. Il faut donc résoudre —
 * exactement comme le faisait la version canevas avant elle. La contrepartie est
 * connue : le graphique doit être reconstruit à la bascule de thème, ce dont se charge
 * l'appelant en changeant la clé de couleur.
 *
 * Une valeur qui n'est pas un jeton (`#22c55e`) est rendue telle quelle : les couleurs
 * de comparaison arrivent parfois déjà résolues.
 */
function readToken(token: string, fallback: string): string {
  if (!token.startsWith('--')) {
    const match = token.match(/var\((--[a-z0-9-]+)\)/i)
    if (!match) return token
    token = match[1] as string
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return value || fallback
}
