'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'


import { ZenkuuMark } from '@/components/BrandMark'
import { ChartNavigator } from '@/components/asset/ChartNavigator'
import { PriceChartAm, type AmCompare, type AmPoint } from '@/components/asset/PriceChartAm'
import { useReducedMotion } from '@/components/charts/useReducedMotion'
import { useLocale } from 'next-intl'

import { usePhrase } from '@/components/locale/ContentProvider'
import { useFormatters } from '@/components/locale/useFormatters'
import {
  ASSET_CHART_HEIGHT,
  OHLC_KINDS,
  nearestRow,
  type ChartCandle,
  type ChartHandle,
  type ChartKind,
  type ChartPoint,
  type ChartReferenceLine,
} from '@/components/asset/chart-kinds'

/** Le type de la racine amCharts, sans importer la bibliothèque ici — voir plus bas. */
type Am5Root = { dom?: HTMLElement | null }

/*
 * Le vocabulaire du graphique a déménagé dans `chart-kinds.ts`, et il y est resté :
 * `AssetWorkspace` a besoin de `OHLC_KINDS` alors qu'il charge CE module à la demande.
 * L'importer d'ici le rappellerait tout entier. Voir la note en tête de ce fichier-là.
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

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GRAPHIQUE DE COURS — LA PRÉPARATION DES DONNÉES, ET RIEN D'AUTRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier ne dessine plus. Il convertit, indexe, découpe, formate — puis passe le
 * résultat à `PriceChartAm`, qui pilote amCharts 5. Le partage est net et c'est ce qui
 * le rend tenable :
 *
 *   · ICI vit tout ce qui relève de ZENKUU — le taux de change, la base 100 de la
 *     comparaison, la moyenne mobile, les repères, les formats de nombre et de date.
 *     Rien n'y dépend de la bibliothèque de tracé, et c'est ce qui a permis d'en
 *     changer trois fois sans toucher aux appelants.
 *
 *   · LÀ-BAS vit tout ce qui relève d'amCharts — axes, séries, curseur, infobulle. Ce
 *     fichier n'importe pas la bibliothèque, pas même ses types : `Am5Root` est réduit
 *     à ce qu'on en utilise, la copie du canevas.
 *
 * ── CE QUI A ÉTÉ PERDU EN CHEMIN, ET QU'IL FAUT SAVOIR ─────────────────────
 *
 *   · LES CHANDELIERS ET LES BARRES OHLC. Le sélecteur de type de tracé a été retiré
 *     de la barre d'outils : plus rien ne les demande. `ChartKind` et `OHLC_KINDS`
 *     restent — `AssetWorkspace` s'en sert encore pour décider s'il faut charger des
 *     bougies — mais la propriété `candles` n'est plus lue.
 *
 *   · LE BANDEAU DE LECTURE SUIT DE NOUVEAU LE CURSEUR. Il ne l'a pas suivi pendant un
 *     temps, au motif — écrit ici même — que faire remonter la position survolée
 *     jusqu'à React « demanderait un écouteur par point ». C'était faux : il en faut
 *     UN, posé sur le curseur d'amCharts. Voir `onHover` dans `PriceChartAm`.
 *
 *     Au repos, le bandeau montre la dernière ligne de la table — laquelle est tenue à
 *     jour par le flux temps réel, et non figée au chargement de la page.
 */
interface PriceChartInteractiveProps {
  points: ChartPoint[]
  /** Bougies réelles — requises pour `candles` et `bars`, ignorées sinon. */
  candles?: ChartCandle[]
  kind?: ChartKind
  /** Facteur appliqué aux prix pour la devise choisie (1 = devise d'origine). */
  rate: number
  /**
   * Code de la devise affichée — et il est ÉCRIT SUR L'ÉCHELLE.
   *
   * L'axe portait des nombres nus : « 80 000 », sans rien qui dise de quoi. Sur une
   * page qui trace au choix un cours, une capitalisation ou un volume, et qui convertit
   * en treize devises, c'est l'information la plus vite perdue et la plus coûteuse à
   * perdre. La référence écrit « $97.00 » à chaque graduation, et c'est désormais ce
   * que l'échelle écrit aussi — voir `formatAxisMoney` dans `@zenkuu/ui`.
   *
   * L'infobulle, elle, garde le format FRANÇAIS (« 80,18 $US ») : c'est un chiffre dans
   * une phrase, pas une graduation d'axe. Les deux conventions coexistent parce qu'elles
   * ne répondent pas à la même question.
   */
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
  /**
   * Relevés quotidiens de l'indice de peur et d'avidité, à superposer.
   *
   * Vide ou absent : aucune courbe, aucun axe. C'est l'appelant qui décide de les
   * charger — voir `AssetWorkspace`, où la case du menu déclenche l'appel.
   */
  sentiment?: { timestamp: number; value: number }[]
  logScale?: boolean
  /** Repères historiques (plus haut / plus bas de tous les temps). */
  referenceLines?: ChartReferenceLine[]
  /**
   * Seconds actifs superposés, pour comparaison.
   *
   * ── LES COURBES PASSENT EN BASE 100 ───────────────────────────────────────
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
   * Elles se distinguent par leur COULEUR, prise dans la palette des séries, et
   * partagent le trait tireté qui les sépare de la courbe principale. C'est le bon
   * partage : le style du trait dit « ceci n'est pas l'actif de la fiche » et reste
   * lisible pour qui ne perçoit pas les couleurs (§9) ; la teinte ne fait que
   * distinguer les comparants entre eux, ce que la légende reprend par écrit.
   */
  compare?: { id: string; label: string; points: ChartPoint[] }[]
  /**
   * L'échelle porte-t-elle une grandeur qui se compte en milliards ?
   *
   * Posé par l'appelant plutôt que déduit de la magnitude des points, et la nuance
   * compte : un bitcoin à 63 000 € et une capitalisation de 63 000 € sont le même
   * nombre, mais on vient lire le premier au chiffre près et le second à l'ordre de
   * grandeur. Seule la fiche sait laquelle des deux elle trace.
   */
  compactValues?: boolean
  /** Poignée rendue au parent pour la capture d'image. */
  handleRef?: React.MutableRefObject<ChartHandle | null>
  /**
   * Historique COMPLET de l'actif, pour la bande de navigation.
   *
   * Sa présence change ce que la bande fait : au lieu de découper la période chargée,
   * elle montre où cette période se situe dans l'histoire entière, et la déplacer en
   * demande une autre — d'où `onOverviewRange`, qui va de pair. Voir `ChartNavigator`,
   * qui décrit ses deux régimes, et `AssetWorkspace`, qui explique ce que coûte le
   * chargement de cette série.
   */
  overview?: { values: number[]; timestamps: number[] }
  /** Nouvelle période demandée depuis la frise, en horodatages. */
  onOverviewRange?: (from: number, to: number) => void
  /**
   * Bande de navigation sous la courbe.
   *
   * Retirée quand le cadre n'est pas fait pour être exploré : la vue « profondeur »
   * n'a pas de temps en abscisse, et un aperçu de trois points sur une série presque
   * vide n'aiderait personne.
   */
  showNavigator?: boolean
  /**
   * ══════════════════════════════════════════════════════════════════════════
   * CE QUE L'INFOBULLE PORTE EN PLUS DU COURS
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Deux lignes facultatives, commandées par la roue dentée de la barre d'outils —
   * c'est la section « Tooltip Settings » du modèle (CoinMarketCap), qui sépare ce
   * que le GRAPHIQUE montre de ce que la BULLE dit. La distinction est juste : une
   * bande de volume occupe un quart du cadre, une ligne de bulle ne coûte rien tant
   * qu'on ne survole pas.
   *
   * Les deux sont ÉTEINTES par défaut. La bulle porte déjà la date, le cours et le
   * volume ; en ajouter deux d'office ferait un pavé de cinq lignes à chaque
   * mouvement de souris.
   */
  /** Capitalisation à l'instant survolé. Sans effet si la source ne la publie pas. */
  showTooltipMarketCap?: boolean
  /**
   * Variation depuis le PREMIER point de la fenêtre affichée.
   *
   * « Depuis le début de ce qui est tracé », donc — et non depuis la veille. C'est la
   * seule origine que le lecteur a sous les yeux : elle se vérifie en regardant le
   * bord gauche de la courbe, là où une variation sur 24 h serait un chiffre venu
   * d'ailleurs posé sur un graphique qui montre autre chose.
   */
  showTooltipChange?: boolean
}

/**
 * Valeurs suivies par le curseur.
 *
 * Elles alimentent DEUX affichages distincts, et c'est volontaire :
 *
 *   · le BANDEAU DE LECTURE, ancré au-dessus du tracé, qui reprend la ligne
 *     « O H L C Variation » des plateformes de trading — il ne bouge jamais, on peut
 *     donc y lire un chiffre en déplaçant le curseur d'un point à l'autre ;
 *   · l'INFOBULLE FLOTTANTE — celle de shadcn/ui — attachée au curseur : elle dit à
 *     quel POINT du tracé se rapporte ce qu'on lit, ce qu'un bandeau fixe ne peut pas
 *     montrer quand la courbe est dense.
 *
 * Les deux ensemble, parce qu'ils répondent à deux questions différentes : « combien »
 * et « où ».
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
}

/** Une ligne de la table préparée. Les clés de comparaison sont dynamiques. */
interface Row {
  t: number
  price: number
  volume?: number
  ma?: number
  /** Capitalisation du point — n'existe que si la source la publie. */
  cap?: number
  [compareKey: string]: number | undefined
}

/** Préfixe des colonnes de comparaison — évite toute collision avec les clés fixes. */
const COMPARE_PREFIX = 'cmp:'

/**
 * Teintes des courbes de COMPARAISON, dans l'ordre de leur ajout.
 *
 * Les mêmes jetons que les autres figures du site, ordonnés par distance perceptuelle.
 * Inventer une palette pour ce graphique aurait fait diverger les couleurs d'un même
 * actif entre une courbe et un camembert. Quatre suffisent : c'est `COMPARE_MAX`, et le
 * panneau de comparaison n'en laisse pas choisir davantage.
 */
const COMPARE_COLORS = [
  'var(--color-data-1)',
  'var(--color-data-2)',
  'var(--color-data-3)',
  'var(--color-data-4)',
]

export function PriceChartInteractive({
  points,
  rate,
  currency,
  height = ASSET_CHART_HEIGHT,
  days,
  label,
  showVolume = false,
  showMovingAverage = false,
  showPriceLines = false,
  sentiment,
  logScale = false,
  referenceLines,
  handleRef,
  overview,
  onOverviewRange,
  compare,
  compactValues = false,
  showNavigator = true,
  showTooltipMarketCap = false,
  showTooltipChange = false,
}: PriceChartInteractiveProps) {
  const nombres = useFormatters()

  const t = usePhrase()
  /* Sert la date de l'infobulle, et rien d'autre — voir `formatStamp`. */
  const locale = useLocale()
  const reduced = useReducedMotion()

  /**
   * Courbes de comparaison réellement traçables.
   *
   * Une série d'un seul point ne s'indexe pas — la base 100 se calcule sur son premier
   * point, et la courbe serait une horizontale à 100. On les écarte ICI plutôt qu'à
   * l'affichage : c'est ce décompte qui décide de l'unité de l'axe.
   */
  /*
   * ══════════════════════════════════════════════════════════════════════════
   * L'INDICE DE PEUR, RAPPROCHÉ DES POINTS DE COURS PAR LA JOURNÉE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ── LE RAPPROCHEMENT SE FAIT SUR LE JOUR, ET C'EST LA SEULE JOINTURE HONNÊTE ──
   *
   * L'indice est QUOTIDIEN — un relevé par jour, horodaté à minuit UTC. Le cours peut
   * être horaire, voire à cinq minutes sous un jour. Les deux séries n'ont donc
   * presque aucun horodatage en commun, et il n'existe pas de correspondance point à
   * point.
   *
   * On indexe l'indice par sa JOURNÉE, et chaque point de cours reçoit la valeur de
   * SA journée. Un point de 14 h et un point de 3 h du même jour portent donc le même
   * indice, ce qui est exact : c'est une mesure quotidienne, elle vaut pour la
   * journée entière.
   *
   * ⚠️ AUCUNE INTERPOLATION, ET C'EST UNE RÈGLE HÉRITÉE. Le fournisseur de sentiment
   * refuse déjà de combler ses propres trous : « une interpolation inventerait un
   * sentiment qui n'a pas été mesuré ». Une journée sans relevé laisse donc ses
   * points sans valeur, et la courbe s'interrompt — `connect: false` côté amCharts
   * traduit ce trou à l'écran plutôt que de le masquer par une droite.
   *
   * La clé est calculée en UTC (`Math.floor(t / JOUR_MS)`) et non par
   * `toDateString()` : ce dernier passe par le fuseau du navigateur, et deux lecteurs
   * de part et d'autre d'une frontière horaire rattacheraient le même point à deux
   * journées différentes.
   */
  const sentimentParJour = useMemo(() => {
    if (!sentiment || sentiment.length === 0) return null
    const JOUR_MS = 86_400_000
    const table = new Map<number, number>()
    for (const point of sentiment) table.set(Math.floor(point.timestamp / JOUR_MS), point.value)
    return table
  }, [sentiment])

  const overlays = useMemo(
    () => (compare ?? []).filter((entry) => entry.points.length > 1),
    [compare],
  )

  /** Comparaison active : l'axe cesse de porter des montants (voir `compare`). */
  const indexed = overlays.length > 0

  /**
   * Fenêtre de la bande de navigation, en fractions de la série.
   *
   * `{ 0, 1 }` — toute la période — est aussi l'état de repos : tant que le lecteur
   * n'a rien déplacé, la bande n'impose rien et le graphique montre tout.
   */
  const [navWindow, setNavWindow] = useState({ from: 0, to: 1 })

  /*
   * ── LA TABLE COMPLÈTE, UNE LIGNE PAR INSTANT ──────────────────────────────
   *
   * Tout se prépare ici : conversion de devise, indexation en base 100, moyenne
   * mobile, colonnes de comparaison, et les textes d'infobulle. La bande de navigation
   * ne fait ensuite que trancher dans cette table.
   *
   * Les comparants sont lus AU MÊME RANG que la série principale, et non à la même
   * date : les séries d'un même graphique partagent leur pas d'échantillonnage, et
   * chercher chacune par sa propre date donnerait des relevés pris à des instants
   * différents sous un seul titre.
   */
  const allRows = useMemo<Row[]>(() => {
    const base: Row[] = points.map((point) => ({
      t: point.timestamp,
      price: point.price * rate,
      ...(point.volume !== undefined ? { volume: point.volume * rate } : {}),
      /* La capitalisation subit le MÊME taux que le prix : c'est un montant dans la
         devise d'origine, pas un rapport. L'omettre laisserait une bulle qui annonce
         des euros et affiche des dollars. */
      ...(point.marketCap !== undefined ? { cap: point.marketCap * rate } : {}),
    }))

    if (base.length === 0) return base

    /*
      ══════════════════════════════════════════════════════════════════════════
      LA COMPARAISON S'EXPRIME EN VARIATION, PLUS EN INDICE BASE 100
      ══════════════════════════════════════════════════════════════════════════

      Les courbes étaient ramenées à 100 sur leur premier point : l'axe portait
      « 100 », « 118 », « 96 ». C'est juste, et c'est illisible pour qui n'a pas
      l'habitude — il faut soustraire cent de tête à chaque graduation pour obtenir la
      seule chose qu'on cherche, la performance.

      La référence trace la même donnée en POURCENTAGE : l'origine est à 0 %, et
      +18 % se lit sans conversion. Le changement est une simple soustraction — un
      indice de 118 devient +18 % — et il ne coûte donc aucune précision.

      Ce qui compte davantage : l'axe passe par ZÉRO, et zéro est une ligne qui a un
      sens. « Au-dessus, l'actif a monté sur la fenêtre ; en dessous, il a baissé. »
      La base 100 n'offrait aucun repère de ce genre — cent n'est pas plus remarquable
      que quatre-vingt-dix-neuf sur un axe qui ne le dit pas.

      La conversion de devise reste sans objet dans les deux cas : un rapport de deux
      prix ne dépend pas de l'unité dans laquelle on les exprime.
    */
    if (indexed) {
      const anchor = base.find((row) => Number.isFinite(row.price) && row.price > 0)?.price
      if (anchor !== undefined) {
        for (const row of base) row.price = (row.price / anchor - 1) * 100
      }

      overlays.forEach((entry, index) => {
        const series = indexSeries(entry.points)
        series.forEach((value, position) => {
          const row = base[position]
          if (row) row[`${COMPARE_PREFIX}${index}`] = value
        })
      })
    }

    /* La colonne `fear` n'existe que sur les points dont la journée porte un relevé.
       Les autres n'ont pas la clé du tout — `undefined` est ce qu'amCharts lit comme
       « pas de valeur ici », et c'est ce qui ouvre le trou plutôt qu'un zéro qui
       plongerait la courbe au bas du cadre. */
    if (sentimentParJour) {
      const JOUR_MS = 86_400_000
      for (const row of base) {
        const valeur = sentimentParJour.get(Math.floor(row.t / JOUR_MS))
        if (valeur !== undefined) row.fear = valeur
      }
    }

    if (showMovingAverage) {
      const period = smaPeriod(base.length)
      if (base.length >= period) {
        let sum = 0
        base.forEach((row, index) => {
          sum += row.price
          if (index >= period) sum -= base[index - period]?.price ?? 0
          if (index >= period - 1) row.ma = sum / period
        })
      }
    }

    return base
  }, [points, rate, indexed, overlays, showMovingAverage, sentimentParJour])

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LA MOLETTE ZOOME, ET ELLE PILOTE LA BANDE PLUTÔT QUE LE GRAPHIQUE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ── POURQUOI PAS `wheelY: 'zoomX'` D'amCHARTS ──────────────────────────────
   *
   * La bibliothèque sait zoomer seule, et `PriceChartAm` le refusait explicitement.
   * L'objection écrite là-bas était juste : « un coup de molette involontaire
   * décadrerait le graphique sans qu'aucun bouton ne dise comment revenir ».
   *
   * Elle vise le zoom INTERNE d'amCharts, qui tient son état dans l'axe — invisible
   * du reste de l'interface. La bande de navigation continuerait d'annoncer la période
   * entière pendant qu'on regarderait six heures, et rien ne permettrait de revenir
   * autrement qu'en rechargeant.
   *
   * Le zoom passe donc par `navWindow`, l'état QUE LA BANDE AFFICHE DÉJÀ. Ses deux
   * poignées se resserrent sous la molette, la tranche visible suit, et l'objection
   * tombe : la position est montrée, et on revient en tirant les poignées.
   *
   * ── LE ZOOM EST CENTRÉ SUR LE CURSEUR ──────────────────────────────────────
   *
   * `ratio` est l'abscisse du pointeur rapportée à la largeur du cadre. Le point sous
   * le curseur garde sa fraction de fenêtre : on resserre les deux bornes VERS LUI, et
   * non vers le milieu. C'est ce qui permet de plonger sur un décrochage sans le
   * perdre de vue à chaque cran.
   *
   * ── DEUX BORNES, ET LA SECONDE EST LA MOINS ÉVIDENTE ───────────────────────
   *
   * ⚠️ UNE LARGEUR MINIMALE EST INDISPENSABLE. Sans elle, quelques crans réduisent la
   * fenêtre à quelques points : `rows` retombe alors sur `allRows` par son garde
   * `slice.length > 1`, et le graphique SAUTE d'un coup à la période entière — le
   * contraire de ce que le geste demandait. `MIN_SPAN` la tient à 2 % de la série,
   * soit une trentaine de points sur une fenêtre de 24 h.
   *
   * ⚠️ `preventDefault` DEMANDE `passive: false`, ET LE LISTENER DOIT DONC ÊTRE POSÉ
   * À LA MAIN. React attache ses `onWheel` en mode passif : appeler `preventDefault`
   * dedans est ignoré, avec un avertissement en console, et la PAGE défile pendant
   * qu'on zoome.
   */
  const cadreTrace = useRef<HTMLDivElement>(null)

  /*
   * ⚠️ DEUX VALEURS LUES PAR RÉFÉRENCE, ET C'EST DÉLIBÉRÉ.
   *
   * L'effet du zoom ne dépend que de `overview` : il pose un écouteur natif, et le
   * reposer à chaque rendu ferait perdre le geste en cours. Mais son rappel a besoin
   * de la fenêtre chargée et du gestionnaire de période, qui changent tous deux
   * souvent. Les lire dans une référence donne la valeur du moment SANS remettre
   * l'effet dans la liste des dépendances.
   */
  const overviewWindowRef = useRef<{ from: number; to: number } | null>(null)
  const onOverviewRangeRef = useRef(onOverviewRange)

  /* ⚠️ L'AFFECTATION VIT DANS UN EFFET, PAS DANS LE CORPS DU RENDU. Le compilateur
     React refuse l'écriture d'une référence pendant le rendu — « Cannot access refs
     during render », relevé par le linter — parce qu'un rendu doit pouvoir être rejoué
     sans effet de bord. Un effet sans tableau de dépendances s'exécute après CHAQUE
     rendu, ce qui donne exactement la fraîcheur recherchée. */
  useEffect(() => {
    onOverviewRangeRef.current = onOverviewRange
  })


  /* La tranche visible. `navWindow` est en fractions : deux poignées, pas deux index —
     c'est ce qui permet à la bande de rester juste quand la série change de longueur.

     Elle n'a plus cours dès que la frise porte l'historique complet : la bande change
     alors la PÉRIODE au lieu de découper dedans. */
  const rows = useMemo(() => {
    if (overview) return allRows
    if (navWindow.from <= 0.001 && navWindow.to >= 0.999) return allRows
    const count = allRows.length
    const first = Math.max(0, Math.floor(navWindow.from * (count - 1)))
    const last = Math.min(count, Math.ceil(navWindow.to * (count - 1)) + 1)
    const slice = allRows.slice(first, last)
    return slice.length > 1 ? slice : allRows
  }, [allRows, navWindow, overview])

  /**
   * Étendue RÉELLEMENT tracée, en jours — et non celle qui a été demandée.
   *
   * `days` dit la profondeur commandée à la source. Depuis que les bornes libres sont
   * vraiment appliquées (voir `clipToRange`), les deux divergent : tirer une fenêtre de
   * sept jours sur février 2025 charge dix-huit mois de profondeur et n'en affiche
   * qu'une semaine. Les libellés doivent se formater sur CE QU'ILS MONTRENT.
   */
  const spanDays = useMemo(() => {
    const first = rows[0]?.t
    const last = rows[rows.length - 1]?.t
    if (first === undefined || last === undefined || last <= first) return days
    return (last - first) / 86_400_000
  }, [rows, days])

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * AZUR À LA HAUSSE, ROUGE À LA BAISSE — ET LE VERT NE REVIENT PAS
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ── CE QUI PRÉCÉDAIT, ET CE QUI EN EST GARDÉ ───────────────────────────────
   *
   * Le tracé a d'abord été vert-ou-rouge, puis TOUJOURS bleu. La note qui défendait le
   * bleu unique tenait deux arguments, et l'un des deux reste vrai :
   *
   *   · LA REDONDANCE. Le signe, la flèche, le badge de variation et la pente disent
   *     déjà la tendance. Une cinquième façon de la dire n'apprend rien — argument
   *     valable, mais c'est un argument d'économie, pas de justesse.
   *
   *   · LA CONTRADICTION. Sur une fenêtre d'un an qui finit en hausse, un tracé vert
   *     peignait aussi les six mois de chute traversés au milieu. On lisait une
   *     descente en vert.
   *
   * Le second est celui qui comptait, et il vaut toujours. La demande explicite
   * rétablit néanmoins la couleur de tendance, et la forme retenue en tient compte :
   *
   * ⚠️ LE VERT NE REVIENT PAS. Seul le ROUGE est rendu. Une hausse garde l'azur de la
   * marque. C'est ce qui distingue cette version de celle qui avait été retirée : le
   * vert d'une hausse était la moitié REDONDANTE du couple — il répétait quatre
   * signaux déjà présents — tandis que le rouge d'une baisse est ce qu'on cherche
   * d'un coup d'œil dans une grille de fiches ouvertes.
   *
   * La contradiction subsiste sur les longues fenêtres, et elle est ATTÉNUÉE par le
   * fait qu'elle ne joue plus que dans un sens : un an rouge peut contenir des mois de
   * hausse peints en rouge, mais plus l'inverse — et la couleur d'alerte qui déborde
   * est moins trompeuse qu'une couleur de confort qui déborde.
   *
   * ── LE CALCUL PORTE SUR CE QUI EST TRACÉ, PAS SUR CE QUI A ÉTÉ DEMANDÉ ─────
   *
   * `rows` et non `allRows` : la frise de navigation découpe dans la série, et une
   * fenêtre de sept jours tirée sur un mois baissier peut être haussière. La couleur
   * doit décrire LE SEGMENT VISIBLE, sinon elle contredit la pente qu'on regarde —
   * ce qui est exactement le défaut qu'on cherche à ne pas reproduire.
   *
   * ⚠️ EN MODE INDEXÉ, LA COMPARAISON RESTE JUSTE : `rows` porte alors les valeurs
   * ramenées à 100, et le rapport entre la première et la dernière est le même.
   */
  const trendColor = useMemo(() => {
    const first = rows[0]?.price
    const last = rows[rows.length - 1]?.price
    /* Repli sur l'azur quand la série est vide ou d'un seul point : une tendance ne se
       lit pas sur un point, et peindre en rouge par défaut alarmerait sans motif. */
    if (first === undefined || last === undefined) return 'var(--color-brand-strong)'
    return last < first ? 'var(--color-down)' : 'var(--color-brand-strong)'
  }, [rows])

  /**
   * Formateur de l'ÉCHELLE — et il porte désormais l'UNITÉ.
   *
   * L'axe écrivait « 80 000 », un nombre sans nature. La référence écrit « $97.00 » :
   * on sait à la première graduation qu'on lit des dollars et non des jetons. En
   * comparaison, l'unité disparaît au profit de « 100 = début de période », qui est ce
   * que l'axe porte alors réellement.
   *
   * `useCallback` n'est pas cosmétique ici : ce formateur est une dépendance de l'effet
   * de construction d'amCharts, et une fonction recréée à chaque rendu reconstruirait
   * le graphique en boucle.
   */
  const formatAxis = useCallback(
    (value: number) => {
      if (indexed) return formatIndex(value, locale)
      return nombres.axisMoney(value, currency, compactValues) ?? ''
    },
    /* `locale` et `nombres` entrent aux dépendances : l'échelle s'écrit dans la langue
       rendue, et sans eux un changement de langue laisserait les graduations dans
       l'ancienne — le rappel étant mémoïsé, rien ne le recalculerait. */
    [indexed, compactValues, currency, locale, nombres],
  )

  /*
    ══════════════════════════════════════════════════════════════════════════════
    L'INFOBULLE LISTE TOUTES LES COURBES, ET NON LA SEULE QU'ON SURVOLE
    ══════════════════════════════════════════════════════════════════════════════

    Elle ne portait que la série principale : date, prix, volume. En comparaison, cela
    revenait à masquer l'objet même de la vue — on superpose cinq courbes pour LES
    METTRE EN REGARD à un instant donné, et l'infobulle n'en donnait qu'une, celle
    dont le curseur passait le plus près.

    Elle porte désormais une LIGNE PAR SÉRIE, chacune précédée de sa pastille de
    couleur, dans l'ordre du graphique : l'actif d'abord, puis les comparés. C'est la
    forme de la référence, et c'est ce qui permet de lire « HYPE +1,04 %, BTC −0,07 %,
    SOL −0,75 % » d'un seul coup d'œil au lieu de promener le curseur trois fois.

    ⚠️ LA PASTILLE EST DESSINÉE EN HTML, PAS EMPRUNTÉE À AMCHARTS. Le moteur sait
    poser un marqueur par série dans ses propres infobulles, mais une par série veut
    dire cinq infobulles superposées ; ici il n'y en a qu'UNE, ancrée à la série
    principale, qui décrit tout l'instant. Les couleurs viennent donc de la même table
    que les tracés — `COMPARE_COLORS` — et c'est cette table unique qui garantit que la
    pastille et la courbe s'accordent.

    Une série SANS valeur à cet instant est omise plutôt que rendue à zéro : les séries
    comparées n'ont pas toutes la même profondeur, et une ligne « BTC : 0 % » sur une
    date où l'on ne sait rien serait de la donnée inventée (§5).
  */
  /*
   * Origine de la variation d'infobulle : le premier point NON NUL de la fenêtre
   * VISIBLE (`rows`), et non de la table complète.
   *
   * `rows` est déjà la tranche que la frise de navigation laisse voir — voir plus
   * haut. Prendre l'origine dans `allRows` donnerait donc une variation calculée
   * depuis un point hors du cadre, c'est-à-dire invérifiable à l'œil.
   *
   * Le zéro est écarté plutôt que gardé : diviser par lui rendrait `Infinity`, et un
   * cours nul en tête de série est un trou de source, pas une valeur.
   */
  const anchorPrice = useMemo(() => {
    const first = rows.find((row) => Number.isFinite(row.price) && row.price !== 0)
    return first?.price
  }, [rows])

  const amData = useMemo<AmPoint[]>(
    () =>
      rows.map((row) => {
        const money = (value: number) =>
          `${(indexed ? formatIndex(value, locale) : formatPrice(value, locale))} ${
            indexed ? '' : currencySign(currency, locale)
          }`.trim()

        const dot = (color: string) =>
          `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};margin-right:7px;vertical-align:middle"></span>`

        /*
          ── LA LIGNE DE PRIX EST LA PLUS GROSSE DE LA BULLE ──────────────────

          Elle était à la même taille que la date et le volume — onze pixels pour les
          trois. C'est ce qu'on vient lire, et c'était typographié comme ce qui
          l'entoure : à onze pixels sur un fond translucide posé par-dessus un tracé,
          il faut s'arrêter pour lire un chiffre qu'on devrait saisir en passant.

          Quinze pixels pour le montant, treize pour le reste. L'écart n'est pas
          décoratif : c'est lui qui dit lequel des trois nombres répond à la question.
        */
        const lines = [
          `<div style="display:flex;align-items:center;gap:2px;font-size:15px;font-weight:600;letter-spacing:-0.01em">${dot(trendColor)}<span>${money(row.price)}</span></div>`,
          `<div style="opacity:.75;margin-top:1px">${label}</div>`,
        ]

        overlays.forEach((entry, index) => {
          const value = row[`${COMPARE_PREFIX}${index}`]
          if (typeof value !== 'number' || !Number.isFinite(value)) return
          const color = COMPARE_COLORS[index % COMPARE_COLORS.length] as string
          /* Les comparaisons gardent le format « intitulé : montant » sur une ligne :
             empilées à quinze pixels, cinq courbes feraient une bulle plus haute que le
             cadre, qu'amCharts rognerait. */
          lines.push(
            `<div style="margin-top:3px">${dot(color)}<span style="opacity:.75">${entry.label}</span> <span style="font-weight:600">${money(value)}</span></div>`,
          )
        })

        /* Le volume ferme l'infobulle, et seulement hors comparaison : il décrit la
           série principale seule, et l'afficher sous cinq lignes de comparaison
           laisserait croire qu'il les concerne toutes. */
        const volume =
          !indexed && typeof row.volume === 'number' && Number.isFinite(row.volume)
            ? `<div style="opacity:.75;margin-top:4px">${t('Vol :')} ${compactValue(row.volume, locale)}</div>`
            : ''

        /*
          ── LES DEUX LIGNES FACULTATIVES DE LA BULLE ─────────────────────────

          Elles sortent des « Tooltip Settings » de la barre d'outils. Comme le
          volume, elles se taisent EN COMPARAISON (`indexed`) : la courbe n'y montre
          plus des montants mais des variations relatives, et une capitalisation en
          euros posée sous une échelle en pourcents se rapporterait à une donnée qui
          n'est plus tracée.

          ⚠️ AUCUNE DES DEUX N'EST CALCULÉE À PARTIR D'AUJOURD'HUI. La capitalisation
          est celle que la source a publiée CE JOUR-LÀ (voir `ChartPoint.marketCap`) ;
          la variation se rapporte au premier point de la fenêtre visible, que le
          lecteur a sous les yeux. Reconstituer l'une par `prix × offre actuelle` ou
          l'autre depuis une clôture hors cadre donnerait un chiffre juste en
          apparence et faux en fait (§5).
        */
        const cap =
          showTooltipMarketCap && !indexed && typeof row.cap === 'number' && Number.isFinite(row.cap)
            ? `<div style="opacity:.75;margin-top:2px">${t('Cap. :')} ${compactValue(row.cap, locale)} ${currencySign(currency, locale)}</div>`
            : ''

        const change =
          showTooltipChange && anchorPrice !== undefined && Number.isFinite(row.price)
            ? (() => {
                const pct = (row.price / anchorPrice - 1) * 100
                const sign = pct >= 0 ? '+' : '−'
                const tint = pct >= 0 ? 'var(--color-up)' : 'var(--color-down)'
                return `<div style="color:${tint};margin-top:2px">${sign}${nombres.fixed(Math.abs(pct), 2) ?? '—'} %<span style="opacity:.75"> ${t('sur la fenêtre')}</span></div>`
              })()
            : ''

        const point: AmPoint = {
          t: row.t,
          price: row.price,
          /* 13 px et non 11, interligne 1,5, et la date détachée du reste par un vrai
             blanc plutôt que par trois pixels. La bulle grandit d'une dizaine de pixels
             en hauteur — elle est posée en haut du cadre, où il n'y a rien à masquer. */
          tip: `<div style="font-size:13px;line-height:1.5;padding:2px 1px">
              <div style="opacity:.75;margin-bottom:6px;white-space:nowrap">${formatStamp(row.t, spanDays, locale)}</div>
              ${lines.join('')}
              ${change}
              ${cap}
              ${volume}
            </div>`,
        }

        if (typeof row.volume === 'number') point.volume = row.volume
        for (let index = 0; index < overlays.length; index += 1) {
          const value = row[`${COMPARE_PREFIX}${index}`]
          if (typeof value === 'number') point[`${COMPARE_PREFIX}${index}`] = value
        }
        if (typeof row.ma === 'number') point.ma = row.ma

        /* ⚠️ L'INDICE DE PEUR DOIT ÊTRE RECOPIÉ ICI, ET SON OUBLI NE SE VOYAIT PAS.
           `amData` ne PROPAGE PAS les lignes : il en reconstruit une neuve, champ par
           champ, parce que chaque point porte une infobulle en HTML qu'il faut
           composer. Une colonne ajoutée en amont — dans la table `base` — n'arrive
           donc jamais au graphique si elle n'est pas nommée dans cette liste.

           Relevé au navigateur : les 366 lignes atteignaient bien `PriceChartAm`, la
           prop `overlay` était correctement posée, la série et son axe étaient
           construits, et pas une seule ligne ne portait `fear`. Le défaut ne
           produisait aucune erreur — seulement une courbe absente. */
        if (typeof row.fear === 'number') point.fear = row.fear

        return point
      }),
    [
      rows,
      indexed,
      currency,
      locale,
      spanDays,
      overlays,
      trendColor,
      label,
      showTooltipMarketCap,
      showTooltipChange,
      anchorPrice,
      t,
      nombres,
    ],
  )

  const amCompare = useMemo<AmCompare[]>(
    () =>
      overlays.map((entry, index) => ({
        key: `${COMPARE_PREFIX}${index}`,
        label: entry.label,
        color: COMPARE_COLORS[index % COMPARE_COLORS.length] as string,
      })),
    [overlays],
  )

  /** Repères horizontaux, calculés sur la FENÊTRE affichée puis complétés des records. */
  const amReferenceLines = useMemo(() => {
    const lines: { value: number; label: string; color: string }[] = []

    if (showPriceLines && rows.length > 1) {
      const values = rows.map((row) => row.price)
      const max = Math.max(...values)
      const min = Math.min(...values)
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length
      lines.push(
        { value: max, label: t('plus haut'), color: 'var(--color-up)' },
        { value: mean, label: 'moyenne', color: 'var(--color-ink-muted)' },
        { value: min, label: t('plus bas'), color: 'var(--color-ink-muted)' },
      )
    }

    /*
     * Les records HISTORIQUES ne sont posés que s'ils tombent dans la fenêtre.
     *
     * Les y mettre sans condition écraserait l'échelle : sur le bitcoin en 7 jours, le
     * plus haut historique à 125 953 et le plus bas à 60,02 étireraient le cadre de
     * 60 à 126 000, et les sept jours qu'on est venu regarder se réduiraient à un
     * ruban plat. Ils sont tus en comparaison, où l'axe porte un indice.
     */
    if (!indexed && rows.length > 0) {
      const values = rows.map((row) => row.price)
      const low = Math.min(...values)
      const high = Math.max(...values)

      for (const line of referenceLines ?? []) {
        const scaled = line.value * rate
        if (!Number.isFinite(scaled) || scaled < low || scaled > high) continue
        lines.push({
          value: scaled,
          label: line.label,
          color:
            line.tone === 'up'
              ? 'var(--color-up)'
              : line.tone === 'down'
                ? 'var(--color-down)'
                : 'var(--color-ink-muted)',
        })
      }
    }

    return lines
  }, [showPriceLines, rows, referenceLines, rate, indexed, t])

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LE BANDEAU SUIT LE CURSEUR, ET REVIENT AU DERNIER RELEVÉ DÈS QU'ON LE QUITTE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ── CE QUI A CHANGÉ, ET POURQUOI L'ANCIENNE NOTE AVAIT TORT ───────────────
   *
   * Elle affirmait que faire remonter la position survolée jusqu'à React « demanderait
   * un écouteur par point de données ». Il en faut UN, posé sur le curseur d'amCharts,
   * qui connaît déjà l'élément survolé de la série. Voir `PriceChartAm`.
   *
   * ── LE REPOS EST L'ÉTAT PAR DÉFAUT, ET IL EST *VIVANT* ────────────────────
   *
   * Curseur hors du tracé, le bandeau montre la DERNIÈRE ligne de la table — et cette
   * ligne est mise à jour par le flux temps réel (`live-series.ts` allonge ou remplace
   * la fin de la série à chaque tic). On y lit donc l'état courant, pas un instantané
   * figé au chargement de la page.
   *
   * ── LA RECHERCHE SE FAIT PAR HORODATAGE ───────────────────────────────────
   *
   * amCharts regroupe ses points au-delà d'une certaine densité : son index ne désigne
   * pas la même ligne que le nôtre. On cherche donc la ligne dont l'instant est le plus
   * PROCHE de celui remonté — une comparaison stricte manquerait sa cible dès que la
   * bibliothèque agrège, c'est-à-dire sur toutes les fenêtres longues.
   */
  const [hoveredAt, setHoveredAt] = useState<number | null>(null)

  const shown = useMemo<LegendState>(
    () =>
      readRow(
        rows,
        hoveredAt === null ? rows.length - 1 : nearestRow(rows, hoveredAt),
        spanDays,
        locale,
      ),
    [rows, hoveredAt, spanDays, locale],
  )

  /** Valeurs dessinées dans la bande — l'historique complet s'il est chargé. */
  const navValues = useMemo(() => {
    if (overview) return overview.values
    return points.map((point) => point.price)
  }, [overview, points])

  /**
   * Fenêtre de la frise pendant un glissement.
   *
   * En régime « historique complet », la fenêtre affichée n'est plus un état libre :
   * elle DÉCRIT la période chargée. Pendant le geste, en revanche, elle doit suivre le
   * curseur — sans quoi la poignée resterait collée pendant qu'on la tire.
   */
  const [dragWindow, setDragWindow] = useState<{ from: number; to: number } | null>(null)

  /** Position de la période chargée dans l'histoire complète, en fractions. */
  const overviewWindow = useMemo(() => {
    if (!overview) return null
    const first = overview.timestamps[0]
    const last = overview.timestamps[overview.timestamps.length - 1]
    const start = points[0]?.timestamp
    const end = points[points.length - 1]?.timestamp
    if (first === undefined || last === undefined || last <= first) return null
    if (start === undefined || end === undefined) return null

    const span = last - first
    const clamp = (value: number) => Math.min(1, Math.max(0, value))
    return { from: clamp((start - first) / span), to: clamp((end - first) / span) }
  }, [overview, points])

  /* Voir la note des références plus haut : l'écouteur de molette lit celle-ci pour
     connaître la fenêtre chargée sans en faire une dépendance de son effet. */
  useEffect(() => {
    overviewWindowRef.current = overviewWindow
  }, [overviewWindow])

  /* Le report de la demande de période, en régime « historique complet ». Une
     référence et non un état : le changer ne doit rien redessiner. */
  const reportRange = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const boite = cadreTrace.current
    if (!boite) return

    const MIN_SPAN = 0.02

    /* Le pas est MULTIPLICATIF : un cran retire toujours la même PROPORTION, si bien
       que la vitesse ressentie ne change pas selon la profondeur atteinte. Un pas
       additif deviendrait imperceptible une fois la fenêtre resserrée. */
    const resserrer = (
      fenetre: { from: number; to: number },
      deltaY: number,
      ratio: number,
    ) => {
      const span = fenetre.to - fenetre.from
      const facteur = deltaY > 0 ? 1.15 : 1 / 1.15
      const suivant = Math.min(Math.max(span * facteur, MIN_SPAN), 1)
      if (suivant === span) return null

      /* Le point sous le curseur garde son abscisse absolue. */
      const ancrage = fenetre.from + span * ratio
      let from = ancrage - suivant * ratio
      let to = from + suivant

      /* Recadrage aux bornes SANS changer la largeur : on glisse la fenêtre plutôt que
         de la rogner, sinon un zoom près d'un bord zoomerait moins qu'au centre. */
      if (from < 0) { from = 0; to = suivant }
      if (to > 1) { to = 1; from = 1 - suivant }
      return { from, to }
    }

    const onWheel = (event: WheelEvent) => {
      /* Un défilement horizontal — pavé tactile, souris à molette latérale — n'est pas
         un geste de zoom. On le laisse à la page. */
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()

      const rect = boite.getBoundingClientRect()
      if (rect.width <= 0) return
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)

      /*
       * ── DEUX RÉGIMES, ET LE SECOND DEMANDE DES DONNÉES ────────────────────
       *
       * Sans `overview`, la bande découpe dans les points déjà en mémoire : resserrer
       * `navWindow` suffit, l'effet est immédiat et gratuit.
       *
       * Avec `overview`, la fenêtre DÉCRIT la période chargée, et la déplacer en
       * demande une autre au serveur. Le geste reprend donc exactement le protocole en
       * deux temps du glissement de poignée : `dragWindow` suit le mouvement pour que
       * la bande réponde tout de suite, et `onOverviewRange` n'est appelé qu'UNE FOIS,
       * la molette arrêtée.
       *
       * ⚠️ SANS CE REPORT, CHAQUE CRAN DÉCLENCHERAIT UNE REQUÊTE. Un geste ordinaire
       * en produit une dizaine ; les réponses reviendraient dans le désordre et la
       * dernière affichée ne serait pas la dernière demandée.
       */
      if (overview) {
        setDragWindow((precedent) => {
          /*
           * ⚠️ LE REPLI SUR LA FENÊTRE ENTIÈRE EST INDISPENSABLE, ET IL A ÉTÉ TROUVÉ
           * AU NAVIGATEUR. `overviewWindow` vaut `null` tant que la frise n'a pas reçu
           * ses horodatages — ce qui est le cas à l'ouverture d'une fiche, et sur
           * `/crypto/bitcoin` de façon durable. Sans ce repli, la molette y était
           * INERTE : le rappel lisait `null` et rendait l'état inchangé, sans rien
           * signaler. Relevé en lisant l'état React après le geste, pas en le
           * supposant.
           *
           * `{ from: 0, to: 1 }` est la valeur JUSTE et non un pis-aller : quand la
           * position de la période dans l'histoire n'est pas connue, ce qui est chargé
           * EST tout ce qu'on connaît, donc la fenêtre entière.
           */
          const base = precedent ?? overviewWindowRef.current ?? { from: 0, to: 1 }
          const suivant = resserrer(base, event.deltaY, ratio)
          if (!suivant) return precedent

          if (reportRange.current) clearTimeout(reportRange.current)
          reportRange.current = setTimeout(() => {
            setDragWindow(null)
            onOverviewRangeRef.current?.(suivant.from, suivant.to)
          }, 320)

          return suivant
        })
        return
      }

      setNavWindow((precedent) => resserrer(precedent, event.deltaY, ratio) ?? precedent)
    }

    boite.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      boite.removeEventListener('wheel', onWheel)
      if (reportRange.current) clearTimeout(reportRange.current)
    }
  }, [overview])

  /*
   * ── LA CAPTURE D'ÉCRAN ────────────────────────────────────────────────────
   *
   * amCharts sait s'exporter lui-même — `am5plugins_exporting` — mais le module pèse
   * autant que le graphique. On peint donc son `<canvas>` interne : la bibliothèque
   * rend en canevas, et une copie y est directe, sans sérialisation ni couleurs à
   * résoudre. C'était déjà la méthode du temps de `lightweight-charts`.
   */
  const rootRef = useRef<Am5Root | null>(null)

  const onReady = useCallback(
    (root: Am5Root | null) => {
      rootRef.current = root
      if (!handleRef) return
      handleRef.current = root ? { screenshot: () => captureAm(rootRef.current) } : null
    },
    [handleRef],
  )

  if (rows.length < 2) {
    return (
      <div
        className="flex w-full items-center justify-center px-4 text-center text-xs text-ink-muted"
        style={{ height }}
      >
        {t('Pas encore assez de relevés pour tracer une courbe.')}
      </div>
    )
  }

  return (
    /* `chart-stretch` : voir `OverviewTab` et `globals.css` — maillon de la chaîne qui
       distribue la hauteur au tracé quand le cadre passe en plein écran. */
    <div className="chart-stretch relative w-full">
      {/*
        ── BANDEAU DE LECTURE ────────────────────────────────────────────────────

        La ligne « date · valeur · variation · Vol » d'OKX, posée AU-DESSUS du tracé et
        non par-dessus lui. Il ne recouvre rien puisqu'il occupe sa propre bande, et il
        ne bouge pas — on peut donc y lire un chiffre sans que la mise en page saute.
      */}
      <ReadoutStrip shown={shown} />

      {/*
        `chart-plot` : la boîte qui donne sa taille au graphique, et le seul endroit où
        cette taille est écrite — le style en ligne ci-dessous. La règle CSS qui la
        surchargeait en plein écran est partie avec le plein écran lui-même.
      */}
      <div
        ref={cadreTrace}
        /* `overscroll-contain` : quand la fenêtre atteint sa borne, le geste ne
           « déborde » plus sur le défilement de la page. Sans lui, un cran de trop
           fait sauter la page pendant qu'on croit encore zoomer. */
        className="chart-plot relative min-h-0 overscroll-contain"
        style={{ height }}
      >
        <PriceChartAm
          data={amData}
          height={height}
          label={label}
          color={trendColor}
          formatAxis={formatAxis}
          showVolume={showVolume}
          logScale={logScale}
          compare={amCompare}
          /* L'axe de la superposition est borné à 0–100 : ce sont les deux extrémités
             que l'indice ne franchit pas, et une échelle fixe est ce qui rend deux
             fenêtres comparables. `--color-gold` plutôt qu'une teinte de marché : ni
             hausse ni baisse, l'indice ne dit pas un sens mais un climat. */
        {...(sentimentParJour
          ? {
              overlay: {
                key: 'fear',
                label: t('Indice de peur et d’avidité'),
                color: '--color-gold',
                min: 0,
                max: 100,
              },
            }
          : {})}
          referenceLines={amReferenceLines}
          reducedMotion={reduced}
          onReady={onReady}
          onHover={setHoveredAt}
        />

        {/*
          ── LA MARQUE, DANS LE COIN OÙ ELLE NE GÊNE PAS ────────────────────────

          Un graphique de cours se lit de gauche à droite et s'arrête sur la dernière
          valeur ; le coin bas-droit est donc la zone la moins regardée du cadre. Elle
          sert à SIGNER — ces courbes circulent en capture d'écran — et à situer.

          `pointer-events-none` : le survol doit passer à travers, sans quoi il
          s'interromprait dans un rectangle de cent pixels au moment précis où l'on
          inspecte les dernières valeurs.
        */}
        <span
          aria-hidden="true"
          /* La marque se pose DANS l'aire de tracé des prix : `right-20` la garde à
             gauche de l'échelle, et le bord bas la remonte au-dessus de l'histogramme
             de volume quand il est là — sinon elle se lirait par-dessus les barres. */
          className="pointer-events-none absolute right-20 flex select-none items-center gap-1 text-ink-muted opacity-40"
          style={{ bottom: showVolume ? '26%' : '2rem' }}
        >
          <ZenkuuMark className="h-3 w-auto" />
          <span className="text-micro font-semibold lowercase tracking-wide">zenkuu</span>
        </span>
      </div>

      {/*
        ── LA BANDE, DANS L'UN OU L'AUTRE DE SES DEUX RÉGIMES ────────────────

        Avec `overview`, elle porte l'histoire complète : sa fenêtre décrit la période
        chargée, la déplacer en demande une autre. Sans, elle garde son régime d'origine
        et découpe dans les points en mémoire. Voir `ChartNavigator`.
      */}
      {showNavigator ? (
        overview && overviewWindow ? (
          <ChartNavigator
            values={navValues}
            timestamps={overview.timestamps}
            window={dragWindow ?? overviewWindow}
            onChange={setDragWindow}
            onCommit={(from, to) => {
              setDragWindow(null)
              onOverviewRange?.(from, to)
            }}
          />
        ) : (
          <ChartNavigator values={navValues} window={navWindow} onChange={setNavWindow} />
        )
      ) : null}

      {/* ══════════════════════════════════════════════════════════════════════
          LE BLOC « GRANDEUR TRACÉE » A ÉTÉ RETIRÉ (demande explicite)

          Il fermait le graphique : un intitulé en encre tertiaire, puis la liste des
          séries affichées avec leur pastille de couleur — « ● Cours de Bitcoin ».

          Sa note défendait deux choses, et la première tenait : une légende NUE ne
          dit rien de plus que la courbe, mais celle-ci nommait la GRANDEUR tracée,
          information qui ne se lit nulle part ailleurs une fois la barre d'outils
          quittée des yeux.

          Elle ne tient plus, parce que la barre d'outils NE SE QUITTE PLUS DES YEUX :
          son sélecteur segmenté « Prix / Capitalisation » est posé juste au-dessus du
          graphique et reste visible en permanence. La grandeur tracée y est donc déjà
          écrite, en toutes lettres et à l'état actif. Le bloc la répétait cinq cents
          pixels plus bas.

          Le second argument — « refermer les quatre-vingt-quatre pixels de blanc à
          droite du bas du rail » — est caduc depuis que le rail a perdu ses cartes :
          il s'est raccourci d'une centaine de pixels et c'est LUI qui finit avant le
          graphique.

          ⚠️ CE QUI RESTE SOUS LA COURBE EST LA TABLE DES VARIATIONS. C'est ce que la
          référence pose à cet endroit (`AssetChangeStrip` : 1 h, 24 h, 7 j, 14 j,
          30 j, 1 an), et c'est de l'information que le graphique ne porte pas.

          Les pastilles de comparaison partent avec le bloc. Le jour où plusieurs
          courbes coexistent à l'écran sans que rien ne les nomme, c'est ici qu'il
          faudra rouvrir la question — le panneau « Comparer » les liste déjà, mais il
          se referme.
          ══════════════════════════════════════════════════════════════════════ */}
    </div>
  )
}

/* ── Capture d'image ───────────────────────────────────────────────────────── */

/**
 * Le graphique amCharts, copié dans un canevas.
 *
 * La bibliothèque peint en canevas : sa surface est donc directement recopiable, sans
 * sérialisation ni couleurs à résoudre — c'est la méthode qu'utilisait déjà la version
 * `lightweight-charts`, et elle revient avec elle.
 *
 * ⚠️ LE FOND EST PEINT AVANT. Un canevas de graphique est transparent ; un PNG
 * transparent partagé sur fond sombre affiche du texte sombre sur du sombre.
 *
 * La promesse est conservée bien que le travail soit synchrone : le contrat
 * `ChartHandle` a été rendu asynchrone du temps du rendu SVG, et le rétrécir
 * obligerait à retoucher l'appelant pour rien.
 */
async function captureAm(root: Am5Root | null): Promise<HTMLCanvasElement | null> {
  const source = root?.dom?.querySelector('canvas')
  if (!source) return null

  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height

  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle =
    getComputedStyle(document.documentElement).getPropertyValue('--color-panel').trim() || '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0)

  return canvas
}

/**
 * Signe monétaire d'un code ISO, pour l'échelle.
 *
 * `Intl` ne rend pas de symbole seul : on lui fait formater zéro dans le style monétaire
 * et l'on retire ce qui est chiffre, séparateur ou espace. C'est la méthode habituelle,
 * et elle a l'avantage de suivre la locale — « $US » en français, « US$ » ailleurs.
 */
function currencySign(currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/[\d\s .,]/g, '')
  } catch {
    /* Un code inconnu — une crypto en unité de compte, par exemple — se rend tel quel. */
    return currency.toUpperCase()
  }
}
/* ── Affichages de lecture ─────────────────────────────────────────────────── */

/** Le bandeau « date · O H L C · Variation · Plage · Vol ». */
function ReadoutStrip({ shown }: { shown: LegendState }) {
  /* Les cinq aides de mise en forme de ce fichier prennent la langue en argument — elles
     sont PURES et servent aussi bien le traçé (hors React) que ce bandeau. Le composant
     est le seul point où la langue s'obtient sans qu'on la lui passe. */
  const locale = useLocale()

  return (
    <div
      /* ⚠️ IL VALAIT 0,6875rem (11 px), ET C'ÉTAIT TROP PETIT.

         C'est la ligne qu'on lit EN DÉPLAÇANT LE CURSEUR sur la courbe — la date, les
         quatre valeurs de la bougie, la variation, le volume. Autrement dit la seule
         du cadre dont la lecture est active et répétée, et elle était rendue dans le
         plus petit corps du site, réservé ailleurs aux mentions de source.

         13 px (`text-xs`) la remet au corps des libellés ordinaires. La hauteur de
         ligne passe à 6 pour garder les 20 pixels du bandeau : sans cela, la rangée
         grandirait de deux pixels et pousserait la courbe d'autant. */
      className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs leading-6"
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
        <span className="tabular font-semibold text-ink">{formatPrice(shown.price, locale)}</span>
      ) : null}

      {shown.changeAbs !== undefined && shown.changePct !== undefined ? (
        // Le signe est composé à la main plutôt que laissé au formateur : « − » est
        // le signe moins typographique (U+2212), pas le trait d'union du clavier. Sur
        // une colonne de chiffres tabulaires, le second est trop court et fait
        // sautiller l'alignement d'un point à l'autre.
        <span className={`tabular font-medium ${shown.changeAbs >= 0 ? 'text-up' : 'text-down'}`}>
          {shown.changeAbs >= 0 ? '+' : '−'}
          {formatAgainst(Math.abs(shown.changeAbs), shown.price ?? 0, locale)} (
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
          Vol <span className="text-ink">{compactValue(shown.volume, locale)}</span>
        </span>
      ) : null}
    </div>
  )
}

/** Une paire « libellé valeur » du bandeau OHLC — l'espacement est le même partout. */
function Ohlc({ label, value, reference }: { label: string; value: number; reference: number }) {
  const locale = useLocale()

  return (
    <>
      <span className="ml-2 first:ml-0">{label} </span>
      <span className="font-medium text-ink">{formatAgainst(value, reference, locale)}</span>
    </>
  )
}

/**
 * Une ligne de la table, lue pour le bandeau.
 *
 * La variation d'une courbe simple se mesure contre le point PRÉCÉDENT, alors qu'une
 * bougie la mesure contre sa propre ouverture. Ce n'est pas une incohérence : un point
 * de courbe n'a pas d'ouverture, et la seule variation qu'on puisse lui attribuer est
 * celle du pas qui l'a amené là.
 */
function readRow(rows: Row[], index: number, days: number, locale: string): LegendState {
  const row = rows[index]
  if (!row) return {}

  if (row.open !== undefined && row.high !== undefined && row.low !== undefined) {
    return {
      time: formatStamp(row.t, days, locale),
      open: row.open,
      high: row.high,
      low: row.low,
      price: row.price,
      ...(row.open > 0
        ? {
            changeAbs: row.price - row.open,
            changePct: ((row.price - row.open) / row.open) * 100,
          }
        : {}),
      ...(row.low > 0 ? { rangePct: ((row.high - row.low) / row.low) * 100 } : {}),
      ...(row.volume !== undefined ? { volume: row.volume } : {}),
    }
  }

  const previous = rows[index - 1]

  return {
    time: formatStamp(row.t, days, locale),
    price: row.price,
    ...(previous && previous.price > 0
      ? {
          changeAbs: row.price - previous.price,
          changePct: ((row.price - previous.price) / previous.price) * 100,
        }
      : {}),
    ...(row.volume !== undefined ? { volume: row.volume } : {}),
  }
}

/* ── Calculs ───────────────────────────────────────────────────────────────── */




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

/**
 * Série exprimée en VARIATION depuis son premier point exploitable, en pourcentage.
 *
 * Le premier point vaut donc 0 %, et non 100 : voir la note de l'indexation, plus
 * haut, pour la raison du changement.
 *
 * Les points dont le prix est nul ou négatif sont écartés AVANT de choisir la base :
 * diviser par zéro produirait un `Infinity` qui, tracé, détruirait l'échelle des deux
 * courbes.
 */
function indexSeries(points: ChartPoint[]): number[] {
  const usable = points.filter((point) => Number.isFinite(point.price) && point.price > 0)
  const base = usable[0]?.price
  if (base === undefined) return []
  return usable.map((point) => (point.price / base - 1) * 100)
}

/* ── Formatage ─────────────────────────────────────────────────────────────── */

/**
 * Variation depuis le début de la fenêtre — 0 % = niveau de départ.
 *
 * Le SIGNE est explicite au-dessus de zéro : « +18,0 % » et non « 18,0 % ». Sur un axe
 * qui descend sous zéro, l'absence de signe fait hésiter une fraction de seconde sur
 * chaque graduation positive, et c'est exactement ce qu'un axe doit éviter.
 */
function formatIndex(value: number, locale: string): string {
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${value > 0 ? '+' : ''}${formatted} %`
}


/* `formatAxisMoney` vit dans `@zenkuu/ui` — voir sa note : le SVG rendu par le serveur
   et ce tracé doivent écrire EXACTEMENT les mêmes étiquettes, sans quoi l'axe saute au
   moment de l'hydratation. C'est la même raison que pour `formatCompactAxis`. */

function formatPrice(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
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
 * `formatPrice` choisit ses décimales d'après la magnitude de la valeur qu'il reçoit.
 * C'est le bon calcul pour un cours isolé, et le mauvais dès que plusieurs nombres
 * liés se lisent sur la même ligne :
 *
 *   · une VARIATION de 0,079 sur un actif coté 49 € tombe sous l'unité et recevrait
 *     six décimales — le bandeau afficherait « 49 » et « −0,079104 » côte à côte,
 *     alors que le second est la différence du premier ;
 *   · les quatre valeurs OHLC d'une même bougie peuvent tomber de part et d'autre
 *     d'un seuil et changer de précision entre elles, ce qui ferait sautiller les
 *     colonnes d'un point à l'autre.
 *
 * Chaque valeur hérite donc de la précision de la CLÔTURE, avec un plancher à deux
 * décimales : sur un actif à 63 000 €, `priceDigits` renverrait zéro et un mouvement
 * de quarante centimes s'afficherait « +0 ».
 */
function formatAgainst(value: number, reference: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, priceDigits(reference)),
  }).format(value)
}

/**
 * Volume et capitalisation de l'infobulle, en échelle abrégée.
 *
 * Homéonyme du `formatCompact` de `@zenkuu/ui` et distinct de lui : celui-ci porte des
 * unités à une décimale pour tenir dans une bulle de deux lignes, là où le partagé en
 * met deux. Le nom désambiguïse désormais, puisque les deux se croisent dans ce fichier.
 */
function compactValue(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

/**
 * Horodatage → texte daté de l'infobulle et du bandeau.
 *
 * ── TOUT EST EN HEURE LOCALE ─────────────────────────────────────────────────
 *
 * La version canevas devait tromper une bibliothèque qui ne rend qu'en UTC : chaque
 * point était avancé de l'offset local à l'aller, puis relu en UTC au retour. Deux
 * décalages qui s'annulaient, et un piège pour qui touchait à l'un des deux. Ici le
 * navigateur formate en local, directement.
 *
 * ── L'ANNÉE FIGURE MÊME SUR LES FENÊTRES COURTES ─────────────────────────────
 *
 * « 14 août, 21:00 » ne dit pas de quelle année il s'agit — ce qui n'a l'air de rien
 * tant qu'on regarde les sept derniers jours, et devient faux dès qu'on lit une capture
 * d'écran ou qu'on remonte la courbe d'un an au palier suivant.
 *
 * ── LE FUSEAU EST ÉCRIT, PARCE QU'UNE HEURE SEULE NE DIT RIEN ────────────────
 *
 * Sur un actif coté à New York lu depuis Paris, l'écart est de six heures.
 * `getTimezoneOffset` rend des minutes, et de signe INVERSE à l'usage courant : Paris
 * en été vaut −120, ce qui s'écrit « GMT+2 ». Les fuseaux à minutes non nulles existent
 * (Inde : +5:30, Népal : +5:45) et ne sont pas des cas d'école — d'où la partie
 * fractionnaire, affichée seulement quand elle n'est pas nulle.
 */
function formatStamp(timestamp: number, days: number, locale: string): string {
  const date = new Date(timestamp)

  /* ⚠️ LA LANGUE DU SITE, ET NON `fr-FR` EN DUR. La date de cette bulle sortait en
     français sur les treize langues — « 3 sept. 2026 » à un lecteur japonais. Le défaut
     ne se voyait pas au relevé automatique : ce n'est pas du texte écrit dans du JSX,
     c'est un argument passé à `toLocaleString`. */
  const texte = date.toLocaleString(
    locale,
    days <= 7
      ? {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : { day: 'numeric', month: 'short', year: 'numeric' },
  )

  const decalageMinutes = -date.getTimezoneOffset()
  const signe = decalageMinutes >= 0 ? '+' : '−'
  const heures = Math.floor(Math.abs(decalageMinutes) / 60)
  const minutes = Math.abs(decalageMinutes) % 60
  const fuseau = `GMT${signe}${heures}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`

  return days <= 7 ? `${texte} ${fuseau}` : texte
}
