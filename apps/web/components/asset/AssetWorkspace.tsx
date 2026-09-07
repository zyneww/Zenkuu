'use client'

import { useLocale } from 'next-intl'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AssetClass, AssetDetail, ExchangeRates, PriceHistory } from '@zenkuu/data'
import { EmptyState, PriceChart } from '@zenkuu/ui'

import {
  ASSET_CHART_HEIGHT,
  OHLC_KINDS,
  type ChartCandle,
  type ChartHandle,
  type ChartKind,
  type ChartReferenceLine,
} from '@/components/asset/chart-kinds'

/**
 * ── LES 240 Ko DU GRAPHIQUE NE PARTENT PLUS AVEC LA PAGE ────────────────────
 *
 * `lightweight-charts` est la plus grosse dépendance du site : 280 Ko bruts, 87 Ko une
 * fois compressés, mesurés dans le morceau que le build lui réserve. Elle partait dans
 * le premier chargement de CHAQUE fiche d'actif.
 *
 * C'était du poids pour rien, et le fichier le disait déjà sans en tirer la
 * conséquence : la fiche rend d'abord une courbe SVG côté serveur — immédiate,
 * indexable, sans JavaScript — puis bascule sur le canevas une fois montée. Le canevas
 * n'est donc JAMAIS nécessaire avant l'hydratation. Un import statique le faisait
 * pourtant télécharger avant, pendant le temps même où la page essaie de devenir
 * interactive.
 *
 * `ssr: false` ne coûte aucun rendu serveur perdu : ce composant n'en produisait déjà
 * aucun, il attendait `interactive`.
 *
 * ⚠️ LE PIÈGE ÉVITÉ, et il annulait tout le bénéfice. Basculer `interactive` à vrai dès
 * le montage, comme avant, ferait disparaître la courbe SVG à l'instant où le module
 * commence seulement à se télécharger : le lecteur verrait un trou de plusieurs
 * centaines de millisecondes là où il voyait une courbe. On aurait gagné 87 Ko et perdu
 * le LCP qu'ils servaient à protéger. La bascule attend donc que le module soit
 * RÉELLEMENT arrivé — voir l'effet de `OverviewTab`.
 */
const PriceChartInteractive = dynamic(
  () => import('@/components/asset/PriceChartInteractive').then((m) => m.PriceChartInteractive),
  { ssr: false },
)
import {
  ChartToolbar,
  RANGE_PRESETS,
  daysSinceJanuary,
  snapToAllowedDepth,
  type ChartView,
  type ExportFormat,
  type RangePreset,
  type CompareOption,
  type RenderOption,
} from '@/components/asset/ChartToolbar'
import { useContent } from '@/components/locale/ContentProvider'
import { useCurrency } from '@/components/locale/CurrencyProvider'
import { useLiveTicker } from '@/components/asset/useLiveTicker'
import { appendLivePoint, clipToRange, mergeCandle } from '@/components/asset/live-series'
import { AssetDepthChart } from '@/components/asset/AssetDepthChart'
import { TradingViewChart } from '@/components/asset/TradingViewChart'
import { usePhrase } from '@/components/locale/ContentProvider'
import { useFormatters } from '@/components/locale/useFormatters'
import {
  BINANCE_INTERVALS,
  fetchBinanceKlines,
  subscribeKline,
  toBinancePair,
  type BinanceInterval,
  type LiveCandle,
} from '@/components/asset/binance-market'

/**
 * Les constantes de ce fichier ne portent plus que des CLÉS, jamais des libellés.
 *
 * Elles étaient évaluées au chargement du module — donc une seule fois pour tout le
 * serveur, dans la langue du fichier importé. Un lecteur anglophone voyait
 * « Chandeliers » et « Aire » au milieu d'une interface anglaise, et aucune bascule
 * de langue n'y changeait rien : le module était déjà résolu.
 *
 * Le libellé se lit désormais AU RENDU, depuis le dictionnaire de la requête. Les
 * clés, elles, sont stables et servent aussi d'identifiants d'état — ce qui est leur
 * vrai rôle.
 */

/* La liste des cinq types de tracé a disparu avec le menu qui les proposait : il n'en
   reste que deux, posés par `renderOptions` sur les icônes du segment. Voir la note de
   cette valeur pour le détail des trois rendus fusionnés. */

/*
 * ── LA BARRE DE SOUS-ONGLETS A ÉTÉ SUPPRIMÉE ─────────────────────────────────
 *
 * Ce composant portait une rangée « Graphique / Performances / FAQ » au-dessus de la
 * barre d'outils du graphique. Elle a fondu par étapes — « Statistiques » et
 * « À propos » en étaient déjà sortis vers des bandes pleine largeur — et il n'en
 * reste rien.
 *
 * Le motif est de DISPOSITION : c'était la dernière chose qui séparait la fiche de
 * la référence, chez qui la courbe démarre immédiatement sous les onglets
 * principaux. Deux niveaux d'onglets empilés — sept en haut, trois en dessous —
 * obligeaient en outre à se demander lequel commande quoi.
 *
 * Les deux contenus restants n'ont pas disparu, ils ont rejoint leur famille :
 *
 *   · les performances sur un an  → `AssetYearPerformance`, dans l'onglet Analyse,
 *                                    avec les autres mesures dérivées d'une série ;
 *   · la foire aux questions      → `AssetFaq`, en bas de page, où la référence la
 *                                    met aussi et où elle est indexable sans clic.
 *
 * Ce composant ne rend donc plus QUE le graphique et ses commandes, ce qui est aussi
 * ce que son nom promettait.
 */

/**
 * Grandeur tracée.
 *
 * Les trois vivent dans la MÊME réponse (`market_chart` de CoinGecko renvoie prix,
 * capitalisation et volume ensemble) : basculer de l'une à l'autre ne coûte aucun
 * appel réseau. C'est ce qui rend ce sélecteur évident — la donnée était déjà là,
 * seule la courbe manquait.
 *
 * `price` reste le défaut : c'est ce qu'on vient voir. La capitalisation répond à une
 * question voisine mais distincte — elle dit la TAILLE, et monte quand des jetons sont
 * émis, même à cours constant.
 *
 * ── « VOLUME » A QUITTÉ L'INTERRUPTEUR ──────────────────────────────────────
 *
 * Il y figurait comme troisième position, et c'était un doublon : l'infobulle du
 * graphique affiche le volume du point survolé, en permanence et sur la même courbe.
 * Le lecteur avait donc deux chemins vers la même donnée, dont l'un lui faisait perdre
 * le cours de vue pour la lire.
 *
 * La référence tranche de la même façon : son interrupteur ne porte que « Price » et
 * « Market Cap », et le volume vit dans l'infobulle. Deux positions au lieu de trois
 * font aussi un interrupteur qui se lit d'un coup d'œil.
 *
 * La donnée n'est pas perdue et le tracé reste possible : `chartMetric` sait encore
 * dessiner `volume`, seule l'entrée du sélecteur disparaît.
 */
/*
 * ⚠️ LE VOLUME A ÉTÉ AJOUTÉ ICI PUIS RETIRÉ. Il rendait le sélecteur de grandeur
 * visible sur les cinq classes que la capitalisation ne couvre pas — mais il n'avait
 * pas été demandé, et une grandeur de plus dans la barre est une décision de produit,
 * pas un correctif de mise en page. `metricAvailable.volume` reste calculé : la série
 * existe, seule la commande manque.
 */
const METRICS = [
  { key: 'price', message: 'price' },
  { key: 'marketCap', message: 'marketCap' },
] as const satisfies readonly { key: string; message: string }[]

type ChartMetric = (typeof METRICS)[number]['key']

/**
 * Cadence du rafraîchissement de fond, et fenêtre au-delà de laquelle il ne sert plus.
 *
 * Soixante secondes : sous le TTL du cache applicatif (180 s), donc la plupart de ces
 * requêtes sont servies depuis le cache et ne touchent aucune source externe. Les
 * resserrer davantage n'apporterait rien — la donnée, elle, n'aurait pas changé.
 *
 * Sept jours : au-delà, la source publie au mieux un point par heure, et souvent un
 * par jour. Voir l'effet qui les utilise.
 */
/**
 * Unités proposées par le menu du graphique, dans l'ordre de la référence.
 *
 * Relevé sur `dropstab.com/coins/solana` le 2026-09-06 : « Price in USD », « Price in
 * BTC », « Price in ETH ». Trois entrées, pas davantage — ce n'est pas un catalogue de
 * devises mais le choix d'une UNITÉ DE COMPTE, et les trois qui comptent sur un site
 * de cotations crypto sont le dollar et les deux plus grosses capitalisations.
 *
 * Le catalogue complet reste dans `packages/data/src/currencies.ts` ; il alimente le
 * sélecteur global, qui ne propose plus que les devises courantes.
 */
const DENOMINATORS = ['USD', 'BTC', 'ETH'] as const

const REFRESH_INTERVAL_MS = 60_000
const REFRESH_MAX_DAYS = 7

/**
 * Bougies demandées à Binance pour un pas donné.
 *
 * Cinq cents et non le millier autorisé : au-delà, les bougies deviennent plus fines
 * qu'un pixel sur un cadre de mille points de large, et l'on paie du réseau pour du
 * détail qu'aucun écran ne peut montrer. Cinq cents bougies d'une minute couvrent
 * plus de huit heures — largement la fenêtre qu'on regarde à ce pas.
 */
const KLINE_LIMIT = 500

const METRIC_LABELS: Record<ChartMetric, string> = {
  price: 'Prix',
  marketCap: 'Capitalisation',
}

/**
 * Une date au format `AAAA-MM-JJ`, dans le fuseau du LECTEUR.
 *
 * `toISOString().slice(0, 10)` serait plus court et faux d'un jour à l'ouest de
 * Greenwich : le 1ᵉʳ janvier à minuit heure locale y est encore le 31 décembre en UTC,
 * et « depuis le 1ᵉʳ janvier » démarrerait donc la veille — un point de plus, tiré de
 * l'année précédente, en tête de la courbe.
 */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/* Les paliers de période vivent désormais dans `ChartToolbar`, avec « Depuis janv. »
   et « Max » que cette liste ne portait pas. La garder ici en aurait fait une
   seconde source de vérité, condamnée à diverger. */

interface AssetWorkspaceProps {
  asset: AssetDetail
  assetClass: AssetClass
  initialHistory: PriceHistory | null
  initialDays: number
  rates: ExchangeRates | null
  /**
   * Actifs proposables en comparaison.
   *
   * Fournis par la page plutôt que devinés ici : c'est elle qui connaît les
   * comparables de la source, et coder « bitcoin, ethereum » en dur dans un widget
   * qui sert aussi les actions et les devises n'aurait aucun sens.
   */
  compareOptions?: CompareOption[]
  /**
   * Symbole COMPLET chez TradingView, ou `null` si l'actif n'y est pas nommable.
   *
   * ── POURQUOI IL ARRIVE TRADUIT, ET NE L'EST PLUS ICI ──────────────────────
   *
   * Ce composant appelait `tradingViewSymbol(assetClass, asset.symbol)` — deux fois,
   * pour deux décisions qui doivent s'accorder : proposer l'interrupteur, et nommer le
   * cadre. La traduction de la CRYPTO lit désormais la table des places de l'actif,
   * qui vit côté serveur et ne traverse pas jusqu'ici. La page la fait donc une fois,
   * et passe le résultat.
   *
   * `null` retire l'interrupteur de la barre : mieux vaut pas de bouton qu'un bouton
   * qui ouvre « Ce symbole n'existe pas ». Voir `tradingview-symbol.ts`.
   */
  tradingViewSymbol?: string | null
  /**
   * Symbole TradingView de la CAPITALISATION, quand il en existe un.
   *
   * `null` partout sauf en crypto : voir `tradingViewMarketCapSymbol`. C'est ce `null`
   * qui grise le sélecteur de grandeur pendant que le moteur externe a la main — un
   * choix qui ne changerait rien vaut moins qu'un choix visiblement indisponible.
   */
  tradingViewMarketCapSymbol?: string | null
}

/**
 * Widget central de la fiche actif : onglets, période et devise.
 *
 * Différence assumée avec Kraken, dont la barre d'onglets fait défiler la page
 * jusqu'à une ancre : ici, le clic REMPLACE le contenu du widget en place. Le
 * lecteur ne perd donc jamais de vue l'en-tête de prix, et l'URL ne change pas —
 * ce qui évite de multiplier les variantes indexables d'une même fiche (§9).
 */
export function AssetWorkspace({
  asset,
  assetClass,
  initialHistory,
  initialDays,
  rates,
  compareOptions = [],
  tradingViewSymbol = null,
  tradingViewMarketCapSymbol = null,
}: AssetWorkspaceProps) {

  const t = usePhrase()
  const [days, setDays] = useState(initialDays)
  /**
   * ═════════════════════════════════════════════════════════════════════════════
   * LA DEVISE VIENT DU SITE, PLUS D'UN ÉTAT LOCAL
   * ═════════════════════════════════════════════════════════════════════════════
   *
   * C'était un `useState`, piloté par un sélecteur propre à la barre d'outils. Le
   * site en a un autre, dans ses préférences, qui commande les classements, les
   * tableaux et les convertisseurs. Les deux coexistaient sur la même page et
   * pouvaient afficher deux codes différents : le bandeau de l'actif en euros, sa
   * courbe en dollars, sans que rien ne rapproche les deux.
   *
   * Le graphique lit donc le contexte. Le sélecteur local a disparu avec
   * `currencySlot` — voir `ChartToolbar`.
   *
   * ── LE REPLI SUR LA DEVISE D'ORIGINE N'EST PAS UNE PRÉCAUTION DE FAÇADE ─────
   *
   * Le fournisseur mondial n'a pas toujours le taux de la devise choisie — c'est le
   * cas des cryptomonnaies et des métaux proposés par le sélecteur global. Sans le
   * garde ci-dessous, `rate` retomberait à 1 et la courbe afficherait des montants en
   * euros sous une étiquette « BTC ». On reste alors sur la devise de la série, ce que
   * l'axe annonce correctement.
   */
  const { currency: siteCurrency } = useCurrency()

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * LE DÉNOMINATEUR DU GRAPHIQUE — « COURS EN USD / BTC / ETH »
   * ══════════════════════════════════════════════════════════════════════════
   *
   * `null` veut dire « suivre le site ». C'est l'état de départ et celui vers lequel
   * on revient en décochant : le graphique reste alors solidaire du reste de la page,
   * ce qu'il a toujours fait.
   *
   * ── POURQUOI CE SÉLECTEUR REVIENT, APRÈS AVOIR ÉTÉ RETIRÉ ────────────────
   *
   * La note au-dessus raconte son retrait : un sélecteur de devise LOCAL faisait
   * cohabiter deux codes à l'écran — « le bandeau de l'actif en euros, sa courbe en
   * dollars, sans que rien ne rapproche les deux ». L'argument tenait tant que le
   * sélecteur GLOBAL proposait les mêmes devises : deux commandes pour un réglage.
   *
   * Il ne les propose plus. `DisplaySettings` a été ramené au seul groupe « Devises
   * courantes » (demande explicite), et BTC comme ETH en sont sortis. Ces trois
   * entrées ne doublent donc plus rien : elles sont le SEUL chemin vers une courbe
   * libellée en bitcoin, et c'est ce que la référence met à cet endroit.
   *
   * ⚠️ ELLES SONT EXCLUSIVES, ET LE MENU LE MONTRE. Relevé sur
   * `dropstab.com/coins/solana` le 2026-09-06 : « Price in USD » allumé, « Price in
   * BTC » et « Price in ETH » éteints. Ce n'est pas une pile d'interrupteurs
   * indépendants mais un choix d'unité — cocher l'un éteint les autres, et décocher
   * celui qui est allumé rend la main au réglage du site.
   *
   * Le repli sur la devise de la série reste en vigueur : sans taux disponible, on ne
   * convertit rien plutôt que d'écrire des euros sous une étiquette « BTC ».
   */
  const [chartCurrency, setChartCurrency] = useState<string | null>(null)

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * L'INDICE DE PEUR ET D'AVIDITÉ — CHARGÉ À LA PREMIÈRE ACTIVATION
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ── POURQUOI PAS AVEC LA FICHE ──────────────────────────────────────────
   *
   * Quatre lecteurs sur cinq n'ouvriront jamais ce menu. Charger la série avec chaque
   * fiche ferait payer un aller-retour — et une part du quota de vingt requêtes par
   * fenêtre du fournisseur — pour une courbe que presque personne n'affiche.
   *
   * ── UNE SEULE FOIS PAR SESSION ──────────────────────────────────────────
   *
   * `sentiment !== null` garde aussi bien le succès QUE l'échec, et c'est
   * délibéré : sans cela, une source en panne serait redemandée à chaque
   * décochage-recochage. C'est le même motif que la vue « En tendance » du tableau
   * d'accueil, dont l'en-tête porte le raisonnement.
   *
   * ⚠️ LA PROFONDEUR DEMANDÉE EST FIXE — 365 jours — ALORS QUE LE GRAPHIQUE CHANGE DE
   * PÉRIODE. C'est un choix, pas un oubli : la série quotidienne d'une année pèse
   * trois cent soixante-cinq points, et le rapprochement par journée ne garde que ce
   * dont la fenêtre a besoin. Redemander à chaque changement de période coûterait un
   * appel par clic pour une donnée déjà en main.
   *
   * ⚠️ CRYPTO SEULEMENT, ET IL FAUT LE DIRE. L'indice mesure le climat du marché
   * CRYPTO dans son ensemble ; le superposer au cours d'une action ou d'une paire de
   * devises rapprocherait deux choses sans rapport. L'entrée du menu ne se rend donc
   * pas hors crypto — voir plus bas.
   */
  const [showFear, setShowFear] = useState(false)
  const [sentiment, setSentiment] = useState<
    { points: { timestamp: number; value: number }[]; failed: boolean } | null
  >(null)

  useEffect(() => {
    if (!showFear || sentiment !== null) return

    /* `cancelled` plutôt qu'un `AbortController` : la réponse est mise en cache par la
       route, et l'abandonner ferait repayer l'appel à la prochaine activation. */
    let cancelled = false

    fetch('/api/sentiment?jours=365')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('HTTP'))))
      .then((payload: { points?: { timestamp: number; value: number }[]; indisponible?: boolean }) => {
        if (cancelled) return
        setSentiment({ points: payload.points ?? [], failed: payload.indisponible === true })
      })
      .catch(() => {
        if (!cancelled) setSentiment({ points: [], failed: true })
      })

    return () => {
      cancelled = true
    }
  }, [showFear, sentiment])

  const wantedCurrency = chartCurrency ?? siteCurrency
  const currency =
    wantedCurrency === asset.currency || rates?.rates[wantedCurrency]
      ? wantedCurrency
      : asset.currency
  const [history, setHistory] = useState<PriceHistory | null>(initialHistory)
  const [loading, setLoading] = useState(false)

  const [kind, setKind] = useState<ChartKind>('area')
  const [candles, setCandles] = useState<ChartCandle[] | null>(null)
  const [candlesLoading, setCandlesLoading] = useState(false)
  /**
   * `false` tant qu'on ne sait pas. Passe à `true` dès qu'une source répond qu'elle
   * ne publie pas d'OHLC — les entrées Chandeliers et Barres disparaissent alors du
   * sélecteur au lieu de rester cliquables et de ne rien produire.
   */
  const [candlesUnavailable, setCandlesUnavailable] = useState(false)

  const [metric, setMetric] = useState<ChartMetric>('price')

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LES QUATRE RÉGLAGES D'AFFICHAGE NE SONT PLUS DES ÉTATS
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Ils vivaient dans quatre `useState`, pilotés par un menu de la barre d'outils qui
   * a été retiré — voir la note de `ChartToolbar`. Sans commande pour les changer, un
   * état ne serait qu'une valeur constante déguisée : ils deviennent donc des
   * constantes, ce qui rend leur valeur lisible ici plutôt que dans un initialiseur.
   *
   * Le VOLUME passe de « masqué par défaut » à « affiché dès que la source en
   * publie ». C'est le seul des quatre à changer de valeur, et c'est le comportement de
   * la référence : la bande de volume y est toujours là, elle n'a jamais été une option.
   *
   * Les trois autres restent éteints. Le graphique sait toujours les tracer — ce sont
   * des propriétés conservées de `PriceChartInteractive` — mais plus rien ne les allume.
   */
  /*
   * ── LES RÉGLAGES DU TRACÉ SONT REDEVENUS DES ÉTATS ──────────────────────────
   *
   * Ils avaient été figés en constantes éteintes, faute de commande : le menu qui les
   * pilotait avait été retiré de la barre. Il revient sous une roue dentée voisine de
   * « Comparer » (voir `settings` dans `ChartToolbar`), donc les valeurs redeviennent
   * des états.
   *
   * Les DÉFAUTS ne changent pas — moyenne mobile, repères et échelle logarithmique
   * restent éteints, volume et frise allumés — pour que la fiche s'ouvre exactement
   * comme avant pour qui ne touche à rien.
   */
  const [showMovingAverage, setShowMovingAverage] = useState(false)
  const [showPriceLines, setShowPriceLines] = useState(false)
  const [logScale, setLogScale] = useState(false)
  const [volumeWanted, setVolumeWanted] = useState(true)
  const [navigatorWanted, setNavigatorWanted] = useState(true)
  /*
   * ── LES DEUX RÉGLAGES D'INFOBULLE ──────────────────────────────────────────
   *
   * Ils forment la seconde section de la roue dentée — « Infobulle » —, calquée sur
   * les « Tooltip Settings » du modèle. Éteints par défaut : la bulle porte déjà la
   * date, le cours et le volume, et deux lignes de plus d'office en feraient un pavé
   * qui suit le curseur.
   */
  const [tooltipMarketCap, setTooltipMarketCap] = useState(false)
  const [tooltipChange, setTooltipChange] = useState(false)
  /**
   * Actifs superposés, et grandeurs superposées — deux listes, une seule limite.
   *
   * C'était `compareId`, une chaîne unique. Le panneau de comparaison en accepte
   * désormais quatre au total, toutes familles confondues — voir `COMPARE_MAX`.
   */
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareMetrics, setCompareMetrics] = useState<string[]>([])

  /*
   * ── LES ACTIFS VENUS DE LA RECHERCHE ────────────────────────────────────────
   *
   * `compareOptions` est la liste que la PAGE propose : quelques pairs, choisis
   * côté serveur. Le panneau cherche désormais dans tout le catalogue (voir
   * `ComparePanel`), et ce qu'il en ramène n'existe nulle part ici — ni son nom pour
   * la légende, ni sa classe pour aller chercher sa série.
   *
   * Ils sont donc conservés à côté, et fusionnés à la liste proposée. L'état vit ici
   * plutôt que dans le panneau parce qu'il survit à sa fermeture : rouvrir « Comparer »
   * doit remontrer ce qui est tracé.
   */
  const [discovered, setDiscovered] = useState<CompareOption[]>([])

  /** Ce que le panneau propose : les pairs de la page, puis ce que la recherche a ramené. */
  const comparable = useMemo<CompareOption[]>(() => {
    const known = new Set(compareOptions.map((entry) => entry.id))
    return [...compareOptions, ...discovered.filter((entry) => !known.has(entry.id))]
  }, [compareOptions, discovered])

  /**
   * Classe d'actif d'un comparant — la sienne, ou celle de la fiche à défaut.
   *
   * ⚠️ LA REQUÊTE PARTAIT TOUJOURS EN `classe=crypto`. C'était sans conséquence tant
   * que la liste venait d'une fiche crypto ; depuis que la recherche ouvre tout le
   * catalogue, demander l'historique d'Apple à l'adresse des cryptomonnaies rend
   * « identifiant inconnu » et la courbe manque sans explication.
   */
  const classOfCompared = useCallback(
    (id: string): AssetClass =>
      comparable.find((entry) => entry.id === id)?.assetClass ?? assetClass,
    [comparable, assetClass],
  )
  /**
   * Vue du cadre, et pas de bougie choisi.
   *
   * Les deux sont indépendants : on peut regarder la profondeur puis revenir sur la
   * courbe et retrouver son pas. `null` en pas signifie « aucun » — ce sont alors les
   * paliers de durée qui commandent, comportement d'origine de la fiche.
   */
  const [view, setView] = useState<ChartView>('original')
  const [intervalId, setIntervalId] = useState<BinanceInterval | null>(null)
  const [intervalCandles, setIntervalCandles] = useState<ChartCandle[] | null>(null)

  /** Palier actif. Distinct de `days` : « Depuis janv. » et « Max » varient en jours. */
  const [rangeId, setRangeId] = useState('7d')
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null)
  /**
   * Série comparée, ÉTIQUETÉE de l'identifiant qui l'a produite.
   *
   * Stocker les points seuls ouvrait une course discrète : entre le choix d'Ethereum
   * et l'arrivée de sa série, l'état contenait encore les points du Bitcoin tandis
   * que le libellé, lui, se dérivait immédiatement du nouveau choix. Le graphique
   * annonçait donc « Ethereum » sous la courbe du Bitcoin — une donnée fausse, pas
   * un simple décalage d'affichage.
   *
   * L'identifiant voyage avec les points : la comparaison n'est rendue que si les
   * deux concordent, et le désaccord transitoire n'affiche rien au lieu d'un
   * mensonge.
   */
  const [compareSeries, setCompareSeries] = useState<
    { id: string; points: { timestamp: number; price: number }[] }[]
  >([])

  /** Poignée de capture, fournie par le graphique une fois monté. */
  const chartHandle = useRef<ChartHandle | null>(null)


  /**
   * Facteur de conversion vers la devise choisie.
   *
   * On convertit côté client depuis un taux BCE plutôt que de redemander la donnée
   * dans la devise cible. Redemander serait plus exact — CoinGecko cote nativement
   * en dollars — mais coûterait deux appels par changement de devise, sur un quota
   * qui n'en tolère que cinq par minute. Le compromis est explicite : la conversion
   * est signalée à l'écran avec la date du taux appliqué (§5).
   */
  const rate = useMemo(() => {
    if (currency === asset.currency) return 1
    const target = rates?.rates[currency]
    const source = rates?.rates[asset.currency]
    if (!target || !source) return 1
    return target / source
  }, [currency, asset.currency, rates])

  /**
   * Cours en direct, dans la devise de la SÉRIE — pas dans celle de l'affichage.
   *
   * ── LE DÉFAUT QUE CECI CORRIGE ────────────────────────────────────────────────
   *
   * La courbe s'arrêtait là où s'arrêtait la réponse mise en cache : jusqu'à trois
   * minutes en fonctionnement normal, et bien davantage quand la source elle-même
   * publie avec du retard. Le cours affiché en tête de fiche, lui, tiquait déjà à la
   * seconde. Le même écran montrait donc deux instants différents — et c'est le
   * graphique qui avait tort, sans que rien ne le signale.
   *
   * ── POURQUOI PROLONGER PLUTÔT QUE REMPLACER ───────────────────────────────────
   *
   * Binance est UNE place parmi les soixante-cinq qui cotent un actif ; CoinGecko
   * publie une moyenne pondérée par les volumes. Redessiner toute la courbe avec les
   * bougies Binance changerait donc la nature de ce qui est tracé, silencieusement.
   * On se contente d'AJOUTER un point à l'extrémité : la série reste celle de
   * CoinGecko, elle atteint simplement l'instant présent.
   *
   * ── LA DEVISE EST CELLE DE LA SÉRIE, ET C'EST CE QUI COMPTE ───────────────────
   *
   * Le graphique reçoit ses points dans `asset.currency` puis leur applique `rate`
   * pour l'affichage. Un point ajouté en dollars y subirait donc la conversion une
   * seconde fois. On ramène le cours dans la devise de la série AVANT de l'ajouter,
   * pour qu'il traverse exactement le même chemin que les autres points.
   */
  const tick = useLiveTicker(asset.symbol, assetClass === 'crypto')

  /**
   * Facteur USD → devise de la série, ou `null` si le taux manque.
   *
   * Il sert à DEUX entrées : le cours en direct et les bougies Binance. Le calculer
   * une seule fois garantit qu'elles atterrissent sur la même échelle — un point
   * converti par un chemin et une bougie par un autre finiraient par diverger d'un
   * arrondi, et le direct trancherait alors une bougie en deux.
   */
  const usdToSeries = useMemo<number | null>(() => {
    if (asset.currency === 'USD') return 1
    const target = rates?.rates[asset.currency]
    const usd = rates?.rates.USD
    // Taux manquant : on ne convertit RIEN plutôt que de mêler des dollars à une
    // courbe en euros, ce qui se lirait comme un décrochage du cours (§5).
    if (!target || !usd) return null
    return target / usd
  }, [rates, asset.currency])

  const livePrice = useMemo<{ timestamp: number; price: number } | null>(() => {
    if (!tick || usdToSeries === null) return null
    return { timestamp: tick.at, price: tick.price * usdToSeries }
  }, [tick, usdToSeries])

  /* `convertible` a disparu avec le sélecteur de devise local : la liste des devises
     proposables est celle du fournisseur global, qui la dérive des mêmes taux. Le
     garde équivalent vit désormais sur `currency`, en haut de ce composant. */

  /**
   * Jeton de la dernière requête d'historique émise.
   *
   * Il protège d'une COURSE bien réelle : deux clics rapprochés sur le sélecteur de
   * période lancent deux requêtes concurrentes, et rien ne garantit qu'elles
   * reviennent dans l'ordre. Sans ce garde-fou, la réponse « 24 h » arrivant après
   * la réponse « 1 an » écrasait cette dernière — le graphique affichait alors une
   * journée de données sous un axe libellé « 1 an », sans le moindre signe d'erreur.
   *
   * Un `ref` plutôt qu'un `state` : le compteur ne doit pas déclencher de rendu, et
   * doit être lisible par une fermeture créée avant sa mise à jour.
   *
   * Les effets voisins (bougies, historique annuel) utilisent un booléen `cancelled`
   * de nettoyage, ce qui est le motif adapté à un `useEffect`. Ici l'appel est
   * impératif et déclenché par un clic : il n'a pas de fonction de nettoyage à
   * laquelle s'accrocher, d'où le compteur.
   */
  const historyRequestId = useRef(0)

  const fetchHistory = useCallback(
    async (targetDays: number, silent = false) => {
      const requestId = historyRequestId.current + 1
      historyRequestId.current = requestId

      // Un rafraîchissement de fond n'allume PAS l'indicateur de chargement : le
      // lecteur n'a rien demandé, et faire clignoter le graphique toutes les minutes
      // sous ses yeux transformerait une amélioration invisible en gêne visible.
      if (!silent) setLoading(true)
      try {
        const response = await fetch(
          `/api/historique?classe=${assetClass}&id=${encodeURIComponent(asset.id)}&jours=${targetDays}`,
        )
        const payload = await response.json()
        // Une réponse dépassée est jetée en silence : elle décrit une période que le
        // lecteur ne regarde plus.
        if (historyRequestId.current !== requestId) return
        // UN ÉCHEC DE FOND NE VIDE PAS LE GRAPHIQUE.
        //
        // Un rafraîchissement automatique qui échoue — une coupure réseau de deux
        // secondes, un portable qui change de borne — remplaçait une courbe correcte
        // par un état vide. Le lecteur n'avait rien demandé : il voyait sa page se
        // dégrader toute seule. La série précédente reste donc en place, et la
        // tentative suivante la remplacera si elle aboutit.
        if (payload.ok) setHistory(payload as PriceHistory)
        else if (!silent) setHistory(null)
      } catch {
        if (historyRequestId.current !== requestId) return
        if (!silent) setHistory(null)
      } finally {
        // `loading` n'est relâché que par la requête la plus récente : sinon la
        // première réponse arrivée éteindrait l'indicateur alors qu'une autre
        // requête est encore en vol.
        if (historyRequestId.current === requestId) setLoading(false)
      }
    },
    [assetClass, asset.id],
  )

  /**
   * Rafraîchissement de fond de la série — pour tout ce que le direct ne couvre pas.
   *
   * ── CE QU'IL SERT, ET CE QU'IL NE SERT PAS ────────────────────────────────────
   *
   * Le flux Binance ne connaît que les cryptos qu'il cote. Une action, une matière
   * première, une crypto de la longue traîne n'en bénéficient pas : leur courbe
   * restait figée sur la réponse mise en cache tant que la page n'était pas
   * rechargée à la main. Une minute de cadence ramène leur retard sous celui du
   * cache applicatif, qui est le vrai plancher (§4).
   *
   * ── POURQUOI SEULEMENT SUR LES COURTES PÉRIODES ───────────────────────────────
   *
   * Sur une vue d'un an, les points sont QUOTIDIENS : redemander la série chaque
   * minute produirait 1 440 requêtes pour voir apparaître un point par jour. Le seuil
   * ci-dessous borne le rafraîchissement aux fenêtres où un point neuf peut
   * réellement arriver dans l'intervalle.
   *
   * ── L'ONGLET CACHÉ NE TRAVAILLE PAS ───────────────────────────────────────────
   *
   * `visibilitychange` évite qu'un onglet oublié pendant la nuit n'émette des
   * centaines de requêtes pour une courbe que personne ne regarde. Le retour à
   * l'onglet déclenche en revanche un rafraîchissement IMMÉDIAT : c'est précisément
   * l'instant où le lecteur revient lire un chiffre, et où le retard accumulé est le
   * plus grand.
   */
  useEffect(() => {
    if (days > REFRESH_MAX_DAYS) return

    function refresh(): void {
      if (document.visibilityState !== 'visible') return
      void fetchHistory(days, true)
    }

    const timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [days, fetchHistory])

  /**
   * Bougies Binance pour le pas choisi — chargement puis mise à jour en continu.
   *
   * ── DEUX TEMPS, ET ILS SONT COMPLÉMENTAIRES ───────────────────────────────────
   *
   * Une requête donne l'HISTOIRE (les cinq cents dernières bougies closes) ; le flux
   * donne la bougie EN COURS, réécrite à chaque transaction. Sans la requête, le
   * graphique partirait vide et se remplirait une bougie à la fois ; sans le flux, la
   * dernière bougie resterait figée jusqu'au prochain changement de pas. C'est
   * exactement le montage d'une page de trading.
   *
   * ── LA CONVERSION EST FAITE ICI, UNE FOIS ─────────────────────────────────────
   *
   * Binance cote en USDT ; la série de la fiche est libellée dans `asset.currency`.
   * Les bougies sont donc ramenées à cette devise DÈS L'ENTRÉE, pour emprunter
   * ensuite exactement le même chemin que les points de CoinGecko — y compris la
   * conversion d'affichage appliquée plus loin par `rate`.
   *
   * ── L'ÉCHEC REND LA MAIN AUX PALIERS DE DURÉE ─────────────────────────────────
   *
   * Une paire absente n'est pas une panne : c'est le cas courant hors des grandes
   * capitalisations. On repasse alors silencieusement en durées plutôt que d'afficher
   * un cadre vide sous un bouton resté allumé.
   */
  useEffect(() => {
    if (!intervalId || usdToSeries === null) return

    const pair = toBinancePair(asset.symbol)
    const controller = new AbortController()
    let cancelled = false

    const scale = (candle: LiveCandle): ChartCandle => ({
      timestamp: candle.timestamp,
      open: candle.open * usdToSeries,
      high: candle.high * usdToSeries,
      low: candle.low * usdToSeries,
      close: candle.close * usdToSeries,
      ...(candle.volume !== undefined ? { volume: candle.volume } : {}),
    })

    fetchBinanceKlines(pair, intervalId, KLINE_LIMIT, controller.signal)
      .then((rows) => {
        if (!cancelled) setIntervalCandles(rows.map(scale))
      })
      .catch(() => {
        if (cancelled) return
        setIntervalId(null)
        setIntervalCandles(null)
      })

    const unsubscribe = subscribeKline(pair, intervalId, (candle) => {
      if (cancelled) return
      setIntervalCandles((current) =>
        current ? mergeCandle(current, scale(candle), KLINE_LIMIT) : current,
      )
    })

    return () => {
      cancelled = true
      controller.abort()
      unsubscribe()
    }
  }, [intervalId, asset.symbol, usdToSeries])

  function selectRange(targetDays: number) {
    if (targetDays === days) return
    setDays(targetDays)
    // Les bougies déjà chargées portent sur l'ANCIENNE fenêtre : les conserver
    // afficherait un mois de bougies sous un axe libellé « 24 h ».
    setCandles(null)
    void fetchHistory(targetDays)
  }

  /**
   * Bougies chargées À LA DEMANDE, jamais au rendu initial.
   *
   * C'est le point qui protège le quota : chez CoinGecko l'OHLC vit derrière un
   * endpoint distinct, donc un appel externe de plus. Le faire porter au seul
   * visiteur qui bascule en chandeliers évite de le facturer à tous les autres, sur
   * un plafond mesuré à ~5 requêtes/minute sans clé.
   */
  useEffect(() => {
    if (!OHLC_KINDS.includes(kind) || candles || candlesUnavailable) return

    let cancelled = false
    // Indicateur de chargement immédiat pour CET appel : sans lui, changer de
    // période affiche les anciennes bougies jusqu'à la réponse au lieu d'un état
    // de chargement, ce qui se lit comme des données figées.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCandlesLoading(true)

    fetch(`/api/bougies?classe=${assetClass}&id=${encodeURIComponent(asset.id)}&jours=${days}`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return
        if (payload.ok && Array.isArray(payload.candles)) {
          setCandles(payload.candles as ChartCandle[])
        } else {
          // La source n'a pas d'OHLC : on le retient pour ne pas redemander à chaque
          // changement de période, et on repasse sur une vue que la donnée permet.
          setCandlesUnavailable(true)
          setKind('area')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCandlesUnavailable(true)
          setKind('area')
        }
      })
      .finally(() => {
        if (!cancelled) setCandlesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [kind, candles, candlesUnavailable, assetClass, asset.id, days])

  /**
   * Le volume n'est proposé que si la série en contient réellement.
   *
   * Toutes les sources n'en publient pas — la BCE n'a pas de volume, et CoinGecko ne
   * le renvoie que dans `market_chart`. Griser la case plutôt que l'afficher active
   * pour un graphique vide (§5).
   */
  const volumeAvailable = useMemo(() => {
    if (OHLC_KINDS.includes(kind)) return (candles ?? []).some((c) => c.volume !== undefined)
    return (history?.points ?? []).some((point) => point.volume !== undefined)
  }, [kind, candles, history])

  /* Le chargement de l'année de données a suivi les performances dans
     `AssetYearPerformance`, qui les calcule : la série n'est demandée qu'à l'ouverture
     de l'onglet Analyse, comme elle ne l'était qu'à l'ouverture du sous-onglet. */


  /**
   * Série réellement tracée, selon la grandeur choisie.
   *
   * La capitalisation et le volume sont OPTIONNELS point par point : une source peut
   * publier le prix sans l'un ni l'autre. Les points dépourvus sont écartés plutôt
   * que ramenés à zéro — un zéro tracerait une chute verticale là où il n'y a
   * qu'une mesure manquante (§5).
   */
  /**
   * Série des bougies Binance, quand un pas est actif.
   *
   * Elle SUPPLANTE celle de CoinGecko pour toute la durée du pas choisi, et c'est
   * assumé : demander « cinq minutes » ne peut pas être servi par une source qui
   * publie un point par heure. Le lecteur regarde alors le cours d'une place précise,
   * ce que la mention de source affichée sous le graphique doit dire.
   */
  const intervalHistory = useMemo<PriceHistory | null>(() => {
    if (!intervalId || !intervalCandles || intervalCandles.length < 2) return null

    return {
      points: intervalCandles.map((candle) => ({
        timestamp: candle.timestamp,
        price: candle.close,
        ...(candle.volume !== undefined ? { volume: candle.volume } : {}),
      })),
      currency: asset.currency,
      // La profondeur en jours découle du pas et du nombre de bougies ; elle ne sert
      // ici qu'aux libellés d'axe, pas à une requête.
      days: Math.max(
        1,
        Math.round(
          ((intervalCandles[intervalCandles.length - 1]?.timestamp ?? 0) -
            (intervalCandles[0]?.timestamp ?? 0)) /
            86_400_000,
        ),
      ),
    }
  }, [intervalId, intervalCandles, asset.currency])

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LES BORNES LIBRES SONT VRAIMENT APPLIQUÉES — ELLES NE L'ÉTAIENT PAS
   * ══════════════════════════════════════════════════════════════════════════
   *
   * `applyCustomRange` convertit un intervalle en PROFONDEUR : `/api/historique` ne
   * comprend qu'un nombre de jours depuis aujourd'hui, jamais deux dates. Sa note
   * annonçait que « le graphique se charge ensuite de ne montrer que la fenêtre
   * demandée » — et rien ne le faisait. Choisir « du 3 au 10 mars » chargeait la
   * profondeur qui CONTIENT le 3 mars, puis affichait tout, du 3 mars à aujourd'hui.
   *
   * Le défaut ne se voyait guère tant que le calendrier était la seule façon de poser
   * des bornes ; la frise de navigation en fait un geste courant, et il devient
   * flagrant — on tire une fenêtre de sept jours sur 2024 et l'on obtient deux ans.
   *
   * Le découpage se fait donc ICI, après le chargement : c'est le dernier endroit
   * traversé par TOUTES les séries — prix, capitalisation, volume, bougies — et donc
   * le seul où l'écrire une fois suffit.
   */
  /**
   * Découpage appliqué à TOUTES les séries avant tracé.
   *
   * Deux origines, une seule sortie. Le CALENDRIER pose des bornes explicites, et elles
   * l'emportent : c'est le geste le plus précis dont dispose le lecteur. À défaut, le
   * palier « YTD » pose les siennes — du 1ᵉʳ janvier à aujourd'hui — parce que la
   * profondeur qu'il commande est forcément plus large que la période qu'il nomme (voir
   * `selectPreset`).
   *
   * Recalculé quand `rangeId` change, donc au plus une fois par clic : la date du jour
   * n'a pas besoin d'être relue à chaque rendu, et la relire y ferait varier la valeur
   * d'un rendu à l'autre sans que rien ne l'ait demandé.
   */
  const clipRange = useMemo<{ from: string; to: string } | null>(() => {
    if (customRange) return customRange
    if (rangeId !== 'ytd') return null
    const now = new Date()
    return { from: isoDay(new Date(now.getFullYear(), 0, 1)), to: isoDay(now) }
  }, [customRange, rangeId])

  const chartHistory = useMemo<PriceHistory | null>(() => {
    /*
     * LE PAS NE COMMANDE QUE POUR LE PRIX.
     *
     * Une place d'échange cote un prix ; elle ne publie ni capitalisation, ni offre en
     * circulation. Sans cette condition, choisir « Capitalisation » pendant qu'un pas
     * de bougie était actif continuait d'afficher la courbe des PRIX Binance, sous un
     * sélecteur qui annonçait la capitalisation — un chiffre juste présenté comme un
     * autre, ce qui est pire qu'une absence (§5).
     *
     * Le pas est d'ailleurs remis à zéro au changement de grandeur (voir la barre
     * d'outils) : ce garde-fou est la seconde barrière, pas la première.
     */
    if (metric === 'price' && intervalHistory) return clipToRange(intervalHistory, clipRange)

    if (!history) return null
    // Le point du ticker n'est ajouté qu'en l'absence de pas : la série des bougies
    // est déjà tenue à jour par son propre flux, et l'y ajouter dupliquerait la
    // dernière bougie sous forme de point.
    if (metric === 'price') return clipToRange(appendLivePoint(history, livePrice), clipRange)

    const points = history.points
      .map((point) => ({
        timestamp: point.timestamp,
        price: metric === 'marketCap' ? point.marketCap : point.volume,
      }))
      .filter((point): point is { timestamp: number; price: number } => point.price !== undefined)

    return points.length > 1 ? clipToRange({ ...history, points }, clipRange) : null
  }, [history, metric, livePrice, intervalHistory, clipRange])

  /** Une grandeur qui ne produit aucune courbe est retirée du sélecteur. */
  const metricAvailable = useMemo<Record<ChartMetric, boolean>>(
    () => ({
      price: true,
      marketCap: (history?.points ?? []).some((point) => point.marketCap !== undefined),
      volume: (history?.points ?? []).some((point) => point.volume !== undefined),
    }),
    [history],
  )

  /**
   * Vues réellement rendables pour CET actif.
   *
   * TradingView, la profondeur et le pas de bougie reposent tous trois sur la même
   * supposition : que Binance cote la paire. On ne peut pas la vérifier sans appeler
   * — et appeler pour construire une barre d'outils coûterait une requête par fiche,
   * y compris à qui ne cliquera jamais ces vues.
   *
   * On les propose donc sur la seule condition évaluable à coût nul — la classe
   * d'actif — et chaque vue se retire d'elle-même si la paire n'existe pas : la
   * profondeur affiche son propre message, le pas de bougie retombe en durées. C'est
   * le compromis inverse de celui du sélecteur de grandeur, qui dispose déjà de la
   * donnée pour trancher.
   *
   * La capitalisation, elle, se vérifie VRAIMENT : la série l'a ou ne l'a pas.
   */
  /**
   * ── LES RENDUS PROPOSÉS, EN UNE SEULE LISTE ────────────────────────────────
   *
   * Elle remplace `availableViews` ET `kindOptions`, qui décrivaient deux axes du même
   * choix — voir `RenderOption` dans `ChartToolbar`. Chaque entrée pose un couple
   * (vue, type de tracé).
   *
   * ── CINQ TYPES DE TRACÉ SONT DEVENUS DEUX ──────────────────────────────────
   *
   * Le menu supprimé proposait aire, ligne, chandeliers, barres et ligne de base. Trois
   * dessinent la même information — une aire est une ligne remplie, une ligne de base
   * une aire coupée à une référence — et « barres » est la variante américaine des
   * chandeliers. Restent les deux lectures réellement distinctes : la COURBE, qui suit
   * une valeur, et l'OHLC, qui montre l'amplitude de chaque période.
   *
   * ── LA CAPITALISATION N'EST PLUS ICI ───────────────────────────────────────
   *
   * Elle figurait parmi les vues, ce qui obligeait `selectView` à la détourner vers le
   * sélecteur de grandeur. Ce détour n'a plus lieu d'être : elle est désormais une
   * position visible de l'interrupteur de grandeur, à gauche de la barre. Une commande,
   * un état.
   */
  const renderOptions = useMemo<RenderOption[]>(() => {
    const entries: RenderOption[] = [
      { id: 'line', label: 'Courbe', view: 'original', kind: 'area' },
    ]

    /*
     * ⚠️ UNE MATIÈRE PREMIÈRE N'A QUE LA COURBE (demande explicite).
     *
     * Sa barre portait deux icônes de plus — chandeliers et TradingView — soit un
     * segment de trois boutons pour un actif dont la source ne publie qu'une clôture
     * par séance. Le segment disparaît de lui-même à une seule entrée : c'est la règle
     * déjà écrite sur `renderOptions` dans `ChartToolbar`, « un sélecteur à un choix
     * n'est pas un sélecteur ».
     */
    if (assetClass === 'commodity') return entries

    /* Les chandeliers exigent de l'OHLC, que la source ne publie QUE pour le prix — et
       pas pour tous les actifs. La condition est la même que celle qui filtrait le
       menu supprimé : la déplacer ici plutôt que de la dupliquer évite qu'un bouton
       reste offert quand rien ne peut être dessiné derrière (§5). */
    if (!candlesUnavailable && metric === 'price') {
      entries.push({
        id: 'candles',
        label: 'Chandeliers',
        view: 'original',
        kind: 'candles',
      })
    }

    /*
     * ── LE MOTEUR EXTERNE SUIT LE SYMBOLE, PLUS LA CLASSE D'ACTIF ────────────
     *
     * La condition était `assetClass === 'crypto'`, et elle disait la bonne chose pour
     * la mauvaise raison : ce n'est pas la classe qui empêchait TradingView, c'est le
     * SYMBOLE, construit en dur comme `BINANCE:{SYM}USDT`. Sur une matière première il
     * aurait produit `BINANCE:GC=FUSDT`, que TradingView ne connaît pas.
     *
     * La traduction vit désormais dans `tradingview-symbol.ts`, qui sait nommer une
     * action, un ETF, une paire de devises, et les douze contrats et huit indices de
     * notre univers. Elle rend `null` pour ce qu'elle ne sait pas nommer — et c'est
     * ce `null` qui décide ici, pas la classe.
     *
     * LA PROFONDEUR DU CARNET, elle, RESTE crypto : elle lit le carnet d'ordres de
     * Binance en direct, ce qu'aucune autre classe n'a. Ce n'est pas une question de
     * nommage mais de source.
     */
    if (tradingViewSymbol) {
      entries.push({ id: 'tradingview', label: 'TradingView', view: 'tradingview' })
    }

    if (assetClass === 'crypto') {
      entries.push({ id: 'depth', label: 'Profondeur du carnet', view: 'depth' })
    }

    return entries
  }, [assetClass, tradingViewSymbol, candlesUnavailable, metric])

  const availableIntervals = useMemo(
    () =>
      assetClass === 'crypto'
        ? BINANCE_INTERVALS.map((entry) => ({ id: entry.id, label: entry.label }))
        : [],
    [assetClass],
  )

  /*
   * ── `activeView` A DISPARU, ET SON ABSENCE CORRIGE UN DÉFAUT ──────────────
   *
   * Il valait `metric === 'marketCap' ? 'marketCap' : view`, pour allumer l'entrée
   * « Capitalisation » du segment quand on choisissait cette grandeur.
   *
   * Cette entrée n'existe plus : la capitalisation est devenue une position de
   * l'interrupteur de grandeur, à gauche. La traduction laissait donc `view` valoir
   * `'marketCap'` — une valeur qu'AUCUNE entrée du segment ne porte, si bien que
   * choisir « Capitalisation » éteignait le segment entier. Le lecteur voyait quatre
   * icônes dont aucune n'était active, et ne pouvait plus savoir ce qui était tracé.
   *
   * `view` est passé tel quel. Une commande, un état.
   */

  /**
   * Changement de grandeur — qui abandonne le pas de bougie s'il y en avait un.
   *
   * Binance ne cote qu'un prix. Garder « 15 m » allumé en passant à la capitalisation
   * laisserait un bouton actif qui ne commande plus rien, et le lecteur attribuerait
   * la finesse de la courbe à ce pas alors qu'elle vient d'une autre source. Le
   * relâcher rallume le palier de durée, qui lui commande réellement.
   */
  function selectMetric(next: ChartMetric) {
    setMetric(next)
    if (next !== 'price') {
      setIntervalId(null)
      setIntervalCandles(null)
    }
  }

  /**
   * Bascule de vue — désormais UNE SEULE LIGNE, et c'est le but.
   *
   * ── DEUX DÉTOURS RETIRÉS, TOUS DEUX DEVENUS FAUX ──────────────────────────
   *
   * Cette fonction en portait deux, hérités de l'époque où « Capitalisation » était
   * une entrée du segment de vues :
   *
   *   · `if (next === 'marketCap')` détournait le clic vers le sélecteur de grandeur.
   *     Code MORT depuis que `renderOptions` n'émet plus cette entrée.
   *
   *   · `if (metric === 'marketCap') setMetric('price')` remettait la grandeur sur le
   *     prix dès qu'on cliquait une autre vue. C'était juste tant qu'une vue et une
   *     grandeur se disputaient le même état ; c'est un DÉFAUT maintenant que non :
   *     un lecteur qui regarde la capitalisation et clique l'icône « Chandeliers »
   *     demande un autre TRACÉ, pas une autre grandeur — et se retrouvait devant le
   *     cours sans avoir rien demandé de tel.
   *
   * Les deux axes sont enfin indépendants : la grandeur se change à gauche, le rendu
   * au milieu, et l'un ne réécrit plus l'autre.
   */
  function selectView(next: ChartView) {
    setView(next)
  }

  /*
   * Les chandeliers n'existent que pour le PRIX : la source ne publie ni ouverture ni
   * plus haut pour une capitalisation. Basculer de grandeur retombe donc sur l'aire,
   * plutôt que de laisser un type sélectionné qui ne peut rien dessiner.
   */
  const effectiveKind: ChartKind =
    metric === 'price' && compareIds.length === 0 && compareMetrics.length === 0
      ? kind
      : OHLC_KINDS.includes(kind)
        ? 'area'
        : kind

  /**
   * Extrêmes historiques — seulement sur la courbe de prix, où ils ont un sens, et
   * seulement si `showPriceLines` les demande.
   *
   * Ce second garde est nouveau et il répare une incohérence : le menu d'affichage
   * portait une case « Extrêmes historiques », et ces lignes-ci s'affichaient sans la
   * consulter. Cocher la case n'ajoutait donc pas les repères — ils étaient déjà là —
   * elle ajoutait les lignes plus haut / moyenne / plus bas de la FENÊTRE, qui ne
   * portent pas ce nom. Le menu est retiré depuis, la constante vaut `false`, et le
   * graphique s'affiche nu comme celui de la référence.
   */
  const referenceLines = useMemo<ChartReferenceLine[]>(() => {
    if (metric !== 'price' || !showPriceLines) return []
    const lines: ChartReferenceLine[] = []
    if (asset.ath !== undefined) lines.push({ value: asset.ath, label: 'record', tone: 'up' })
    if (asset.atl !== undefined) lines.push({ value: asset.atl, label: 'plancher', tone: 'down' })
    return lines
  }, [metric, showPriceLines, asset.ath, asset.atl])

  /*
   * Série de comparaison, rechargée quand l'actif OU la période change.
   *
   * La période compte autant que l'actif : comparer sept jours de l'un à un an de
   * l'autre ne veut rien dire, et la base 100 est calculée sur le premier point de
   * CHAQUE série — des fenêtres différentes donneraient deux origines différentes.
   */
  /*
   * `compareIds` est un TABLEAU, et un tableau change d'identité à chaque rendu. Le
   * lister tel quel dans les dépendances relancerait quatre requêtes à chaque frappe
   * dans le champ de recherche du panneau. On dépend donc de sa forme sérialisée —
   * seule une vraie modification de la sélection la fait changer.
   */
  const compareKey = compareIds.join(',')

  useEffect(() => {
    // Sortie IMMÉDIATE sans toucher à l'état quand aucune comparaison n'est demandée.
    // Remettre la liste à vide ici serait un `setState` synchrone dans un effet, donc
    // un rendu en cascade — et surtout ce serait inutile : le filtre par identifiant
    // plus bas suffit à neutraliser des séries qui n'ont plus cours.
    if (compareKey === '') return

    let cancelled = false
    const wanted = compareKey.split(',')

    /*
     * TOUTES LES SÉRIES PARTENT ENSEMBLE, et l'état n'est posé qu'une fois.
     *
     * Les écrire au fil de l'eau ferait apparaître les courbes l'une après l'autre,
     * chacune redéclenchant un rendu du graphique — quatre reconstructions de séries
     * lightweight-charts pour une seule sélection. Un `Promise.all` coûte l'attente
     * de la plus lente et rend une figure complète d'un coup.
     *
     * Une série en échec est ÉCARTÉE, pas remplacée : la comparaison se fait à trois
     * courbes plutôt que de tomber entièrement parce qu'une source a fléchi.
     */
    Promise.all(
      wanted.map((id) =>
        fetch(
          `/api/historique?classe=${classOfCompared(id)}&id=${encodeURIComponent(id)}&jours=${days}`,
        )
          .then((response) => response.json())
          .then((payload) =>
            payload?.ok
              ? { id, points: payload.points as { timestamp: number; price: number }[] }
              : null,
          )
          .catch(() => null),
      ),
    ).then((rows) => {
      if (cancelled) return
      setCompareSeries(rows.filter((row) => row !== null))
    })

    return () => {
      cancelled = true
    }
  }, [compareKey, days, classOfCompared])

  /**
   * Courbes superposées, dans l'ordre où elles ont été choisies.
   *
   * Deux familles s'y rejoignent, et le graphique ne fait pas la différence : des
   * AUTRES ACTIFS, dont les points arrivent du réseau, et d'autres GRANDEURS du même
   * actif, qui sont déjà dans `history` — la source publie cours, capitalisation et
   * volume dans la même réponse. Les secondes ne coûtent donc aucun appel.
   *
   * Le filtre sur `compareIds` reste indispensable : entre le choix d'Ethereum et
   * l'arrivée de sa série, l'état contient encore les points du précédent. Ne rendre
   * que ce qui concorde affiche une courbe de moins pendant un instant, là où l'ancien
   * code affichait une courbe sous le mauvais nom.
   */
  const compare = useMemo(() => {
    const rows: { id: string; label: string; points: { timestamp: number; price: number }[] }[] = []

    for (const id of compareIds) {
      const series = compareSeries.find((entry) => entry.id === id)
      const label = comparable.find((entry) => entry.id === id)?.label
      if (series && label) rows.push({ id, label, points: series.points })
    }

    for (const key of compareMetrics) {
      const points = (history?.points ?? [])
        .map((point) => ({
          timestamp: point.timestamp,
          price: key === 'marketCap' ? point.marketCap : key === 'volume' ? point.volume : undefined,
        }))
        .filter((point): point is { timestamp: number; price: number } => point.price !== undefined)

      // Un point unique ne s'indexe pas : la base 100 se calcule sur le premier point
      // et la courbe serait une horizontale à 100.
      if (points.length > 1) {
        rows.push({ id: `metric:${key}`, label: t(METRIC_LABELS[key as ChartMetric] ?? key), points })
      }
    }

    return rows
  }, [compareIds, compareSeries, comparable, compareMetrics, history, t])

  /**
   * Choix d'un palier de période.
   *
   * Deux paliers n'ont pas de profondeur fixe et se résolvent ici : « Depuis janv. »,
   * qui dépend du jour où l'on regarde, et « Max », qui demande toute l'histoire.
   * Ce dernier est borné à dix ans : au-delà, la source ne publie plus rien pour la
   * quasi-totalité des actifs, et demander l'infini coûterait un appel plus lourd
   * pour un résultat identique.
   */
  function selectPreset(preset: RangePreset) {
    setRangeId(preset.id)

    if (preset.days !== null) {
      setCustomRange(null)
      selectRange(preset.days)
      return
    }

    /*
     * ══════════════════════════════════════════════════════════════════════════
     * ⚠️ « YTD » AFFICHAIT EXACTEMENT LA MÊME FENÊTRE QUE « 1A »
     * ══════════════════════════════════════════════════════════════════════════
     *
     * Le palier ne posait qu'une PROFONDEUR — `snapToAllowedDepth(daysSinceJanuary())`.
     * Or cette fonction arrondit vers le palier autorisé SUPÉRIEUR, et les paliers vont
     * de 90 à 180 puis à 365 : dès la mi-juin, « depuis le 1ᵉʳ janvier » demandait donc
     * 365 jours et n'en découpait AUCUN. Relevé au navigateur le 24 août — le bouton
     * s'allumait, l'axe portait « sept. 2025 → août 2026 », c'est-à-dire le contenu de
     * « 1A ». Cliquer « 1A » puis « YTD » ne changeait alors strictement rien à l'écran.
     *
     * La profondeur reste arrondie — c'est la liste blanche du service, on ne peut pas
     * lui demander 236 jours — et le DÉCOUPAGE se fait à l'affichage, comme pour les
     * bornes libres. Voir `ytdRange`, qui le pose sans passer par `customRange` : ce
     * dernier appartient au calendrier, et l'y écrire allumerait sa pastille de dates à
     * la place du palier qu'on vient de cliquer.
     */
    setCustomRange(null)
    selectRange(snapToAllowedDepth(preset.id === 'ytd' ? daysSinceJanuary() : 3650))
  }

  /**
   * Bornes libres — converties en PROFONDEUR, seule chose que l'API comprend.
   *
   * `/api/historique` prend un nombre de jours depuis aujourd'hui, pas un intervalle.
   * On demande donc la profondeur qui contient la borne de début ; le graphique se
   * charge ensuite de ne montrer que la fenêtre demandée. C'est une approximation
   * assumée : on télécharge un peu plus que nécessaire quand la borne de fin est
   * ancienne, ce qui évite d'étendre le contrat de l'API pour un cas de confort.
   */
  function applyCustomRange(range: { from: string; to: string } | null) {
    setCustomRange(range)
    if (!range) return

    const from = Date.parse(range.from)
    if (!Number.isFinite(from)) return

    const depth = Math.ceil((Date.now() - from) / 86_400_000)
    selectRange(snapToAllowedDepth(Math.max(1, depth)))
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * L'HISTORIQUE COMPLET, POUR LA BANDE DE NAVIGATION
   * ══════════════════════════════════════════════════════════════════════════
   *
   * La bande sous la courbe portait la période CHARGÉE : elle découpait dedans, et
   * changer de période restait l'affaire des paliers. La référence, elle, y met toute
   * l'histoire de l'actif — « 2021 → 2026 » sous un graphique de 24 h — ce qui en fait
   * une frise autant qu'une commande : on voit d'un coup où se situe la fenêtre qu'on
   * regarde dans la vie de l'actif.
   *
   * ── CE QUE ÇA COÛTE, ET COMMENT ON LE PAIE ────────────────────────────────
   *
   * Un second appel, en plus de la série affichée. C'est exactement l'argument qui
   * l'avait fait écarter, et il tient toujours — d'où les trois précautions :
   *
   * 1. IL EST DIFFÉRÉ. `requestIdleCallback` attend que le navigateur n'ait plus rien
   *    d'urgent : la courbe, les actualités et le rendu de la fiche passent devant.
   *    L'appel ne pèse donc sur aucune mesure de chargement.
   *
   * 2. IL EST UNIQUE PAR ACTIF. Une seule fois au montage, jamais rejoué quand la
   *    période change — c'est justement la période qui bouge, pas l'histoire.
   *
   * 3. IL ÉCHOUE EN SILENCE. Sans réponse, la bande retombe sur son premier régime,
   *    celui qu'elle a toujours eu. Rien ne casse, rien ne s'affiche à moitié.
   */
  /*
   * La frise porte l'IDENTIFIANT de l'actif qu'elle décrit.
   *
   * Sans lui, il faudrait la remettre à `null` en tête de l'effet, au changement
   * d'actif — un `setState` synchrone dans un effet, qui déclenche un second rendu
   * immédiat. Avec lui, la frise d'un actif qu'on vient de quitter est simplement
   * ignorée à la lecture, sans rendu de plus.
   */
  const [loadedOverview, setLoadedOverview] = useState<
    { id: string; values: number[]; timestamps: number[] } | null
  >(null)

  const overview = loadedOverview?.id === asset.id ? loadedOverview : null

  useEffect(() => {
    let cancelled = false

    const load = () => {
      void fetch(
        `/api/historique?classe=${assetClass}&id=${encodeURIComponent(asset.id)}&jours=3650`,
      )
        .then((response) => response.json())
        .then((payload: PriceHistory & { ok?: boolean }) => {
          if (cancelled || !payload.ok) return
          const points = payload.points ?? []
          /* Moins de deux points ne fait pas une frise, et une frise d'un seul jour
             n'apprend rien de plus que le graphique lui-même. */
          if (points.length < 2) return
          setLoadedOverview({
            id: asset.id,
            values: points.map((point) => point.price),
            timestamps: points.map((point) => point.timestamp),
          })
        })
        .catch(() => undefined)
    }

    /* `requestIdleCallback` n'existe pas partout — Safari l'a longtemps ignoré. Le
       repli sur un `setTimeout` de deux secondes vise la même chose : passer APRÈS le
       chargement de la page. */
    const idle = typeof window.requestIdleCallback === 'function'
    const handle = idle
      ? window.requestIdleCallback(load, { timeout: 6000 })
      : window.setTimeout(load, 2000)

    return () => {
      cancelled = true
      if (idle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [assetClass, asset.id])

  /**
   * Fin de glissement sur la frise : la fenêtre choisie devient la période affichée.
   *
   * Les bornes arrivent en horodatages et repartent en ISO court, format qu'attend
   * `applyCustomRange` — le même chemin que le sélecteur de dates du calendrier, ce qui
   * évite deux façons de demander la même chose.
   */
  const selectOverviewRange = useCallback((from: number, to: number) => {
    /* `isoDay` et non `toISOString()` : la borne est lue dans le fuseau du lecteur, où
       elle a été tirée. Voir la note de ce format — un décalage d'un jour à l'ouest de
       Greenwich sinon. */
    applyCustomRange({ from: isoDay(new Date(from)), to: isoDay(new Date(to)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `applyCustomRange` est une déclaration de fonction, stable pour la durée du composant
  }, [])

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LE PLEIN ÉCRAN AU DOUBLE-CLIC A ÉTÉ RETIRÉ
   * ══════════════════════════════════════════════════════════════════════════
   *
   * C'était un geste INVISIBLE — rien à l'écran ne l'annonçait hors d'une infobulle
   * de survol — et surtout INVOLONTAIRE : deux clics rapprochés sur une courbe qu'on
   * inspecte au curseur sont un geste courant, et il faisait basculer la page entière
   * dans un mode dont on ne sort qu'avec Échap.
   *
   * Ce qui part avec lui : la fonction de bascule, la référence sur le cadre, et les
   * trois règles `:fullscreen` de `globals.css`. Aucune commande ne le remplace — la
   * référence n'en a pas non plus, et le graphique occupe déjà toute la largeur utile
   * de la colonne.
   */

  /**
   * Export dans l'un des quatre formats.
   *
   * Le module est chargé À LA DEMANDE, au clic : il ne sert qu'à cet instant et le
   * poser en import statique le ferait voyager dans le paquet de chaque visiteur de
   * fiche, dont l'immense majorité n'exportera jamais rien.
   */
  async function handleExport(format: ExportFormat) {
    const canvas = await chartHandle.current?.screenshot()
    if (!canvas) return

    const { exportChart } = await import('@/components/asset/export-chart')

    /*
     * L'EN-TÊTE VOYAGE AVEC L'IMAGE — voir `frame` dans `export-chart`.
     *
     * Le fichier partait avec la seule toile d'amCharts : une courbe sans nom
     * d'actif, sans période et sans provenance, donc illisible dès qu'elle quitte la
     * page. Les trois mentions sont prises à l'état COURANT du widget, pas à celui du
     * rendu serveur — c'est ce que le lecteur a sous les yeux au moment du clic.
     */
    const rangeLabel =
      RANGE_PRESETS.find((preset) => preset.id === rangeId)?.label ??
      (customRange ? `${customRange.from} → ${customRange.to}` : '')
    const source = (history as (PriceHistory & { source?: { label?: string } }) | null)?.source
      ?.label

    exportChart(canvas, format, `${asset.name}-${metric}`, {
      title: `${asset.name} (${asset.symbol})`,
      subtitle: [t(METRIC_LABELS[metric]), rangeLabel, currency].filter(Boolean).join(' · '),
      ...(source ? { source: `Source : ${source}` } : {}),
    })
  }


  return (
    /*
      ── LE GRAPHIQUE N'EST PLUS DANS UNE CARTE ──────────────────────────────

      Le panneau portait un fond, une bordure et seize pixels de rembourrage : une
      carte, comme les autres blocs de la fiche. C'est ce que la référence ne fait
      PAS — chez CoinGecko le tracé repose directement sur le fond de la page, et
      cette absence de cadre est ce qui lui donne son ampleur.

      L'argument n'est pas seulement esthétique. Un cadre borne, et ce qu'il borne se
      lit comme un élément parmi d'autres ; le graphique est LE contenu de la fiche,
      pas un de ses encadrés. Il prend aussi, au passage, les trente-quatre pixels de
      largeur que le rembourrage lui prélevait.

      La classe `chart-frame` a disparu avec le plein écran au double-clic : elle ne
      portait QUE ce comportement, et ne déclarait rien au repos.
    */
    <div>
      <div>
        {/*
          LA RANGÉE DE DEVISE A DISPARU — le sélecteur est passé DANS la barre.

          Il occupait ici une ligne entière, à lui seul, alignée à droite. C'était le
          dernier vestige de la disposition en trois rangées que `ChartToolbar` a
          supprimée : on avait ramené les commandes du graphique à une seule ligne
          tout en laissant celle-ci au-dessus, si bien que le cadre en comptait
          toujours deux.

          Il rejoint donc les autres réglages de LECTURE, à droite de la barre — voir
          `currencySlot`. La fiche gagne une trentaine de pixels de hauteur avant que
          la courbe ne commence, ce qui était précisément l'objet de l'opération.
        */}
        {/*
          ── LA MENTION DE CONVERSION EST RETIRÉE ──────────────────────────────

          Elle occupait un bandeau pleine largeur au-dessus du graphique, sur chaque
          fiche dont la source cote dans une autre devise que celle du lecteur —
          c'est-à-dire presque toutes. Trente pixels de hauteur avant la courbe, pour
          une phrase lue une fois.

          L'information n'est pas perdue : le taux et sa date restent au pied du cadre,
          dans la ligne de source (`SourceNote`), qui est l'endroit où l'on va chercher
          la provenance d'un chiffre. Ce qui disparaît est la répétition en tête.
        */}

        {/* Le graphique est RENDU SANS CONDITION : il est désormais le seul contenu
            de ce panneau, la barre de sous-onglets qui le mettait en concurrence avec
            deux autres vues ayant été supprimée (voir l'en-tête du fichier). */}
        <div>
            {/*
              UNE SEULE BARRE, là où trois rangées s'empilaient. Voir l'en-tête de
              `ChartToolbar` : le quart de la hauteur du cadre servait à choisir quoi
              regarder plutôt qu'à regarder.
            */}
            <ChartToolbar
              metric={metric}
              /*
               * ⚠️ LA LISTE N'EST PLUS FILTRÉE, ELLE EST MARQUÉE.
               *
               * Elle l'était : `filter(metricAvailable[...])` retirait toute grandeur
               * dont la source ne publie pas la série. Sur les cinq classes servies par
               * Yahoo, qui ne publient pas d'historique de capitalisation, il ne restait
               * qu'une entrée — donc pas de segment du tout, et une barre d'outils
               * amputée de son premier groupe. Relevé sur `/matieres-premieres/gc=f`,
               * dont la barre ne portait plus que « Comparer ».
               *
               * Les deux grandeurs sont donc toujours RENDUES, celle qui n'a pas de
               * série étant désactivée et légendée. C'est plus honnête que le filtre :
               * une entrée grisée dit « cette lecture existe, la source ne la fournit
               * pas ici », là où l'absence laissait croire que le site n'en avait
               * jamais entendu parler. Voir `ChartToolbar`, qui rend l'état inerte.
               */
              /*
                ⚠️ EN MODE TRADINGVIEW, LA DISPONIBILITÉ CHANGE DE SOURCE.

                Hors de ce mode, une grandeur est disponible si NOTRE source publie sa
                série — c'est `metricAvailable`, calculé plus haut.

                Sous TradingView, notre série ne sert plus à rien : c'est le widget qui
                trace, et il trace un SYMBOLE. La capitalisation n'est donc atteignable
                que là où il en existe un — `CRYPTOCAP:BTC` en crypto, rien ailleurs.
                Laisser le bouton actif sur une action ferait cliquer dans le vide.
              */
              metricOptions={METRICS.map((entry) => ({
                key: entry.key,
                label: t(METRIC_LABELS[entry.key]),
                available:
                  view === 'tradingview'
                    ? entry.key === 'price' || tradingViewMarketCapSymbol !== null
                    : metricAvailable[entry.key],
              }))}
              onMetricChange={(key) => selectMetric(key as ChartMetric)}
              compareIds={compareIds}
              compareOptions={comparable}
              /* Le menu propose les tendances du marché, que personne ne filtre : sans
                 cet identifiant, une fiche assez chaude pour y figurer se proposerait
                 en première ligne de sa propre comparaison. */
              selfId={asset.id}
              onCompareChange={setCompareIds}
              onCompareDiscover={(option) =>
                setDiscovered((current) =>
                  current.some((entry) => entry.id === option.id) ? current : [...current, option],
                )
              }
              compareMetrics={compareMetrics}
              onCompareMetricsChange={setCompareMetrics}
              /*
               * ── CE QUE LA ROUE DENTÉE COMMANDE ────────────────────────────
               *
               * Cinq réglages, tous ADOSSÉS À UNE CAPACITÉ RÉELLE du tracé — c'est la
               * condition pour qu'une case existe. Les réglages de CoinMarketCap qui
               * n'ont pas d'équivalent chez nous (indice de peur, financement global,
               * cours en SOL) ne figurent pas : une case qui ne commande rien vaut
               * moins que pas de case (§5).
               *
               * Le volume porte `available` plutôt que de disparaître : sur un actif
               * dont la source ne publie aucun volume, l'entrée grisée dit « cette
               * bande existe, la source ne la remplit pas ici ».
               */
              settings={[
                {
                  id: 'volume',
                  group: 'chart',
                  label: 'Volume d’échange',
                  checked: volumeWanted,
                  available: volumeAvailable && metric === 'price',
                },
                {
                  id: 'navigator',
                  group: 'chart',
                  label: 'Frise de navigation',
                  checked: navigatorWanted,
                },
                { id: 'ma', group: 'chart', label: 'Moyenne mobile', checked: showMovingAverage },
                {
                  id: 'lines',
                  group: 'chart',
                  label: 'Repères haut / moyenne / bas',
                  checked: showPriceLines,
                  available: metric === 'price',
                },
                { id: 'log', group: 'chart', label: 'Échelle logarithmique', checked: logScale },

                /* ── L'INDICE DE PEUR, SUR LES SEULES CRYPTOMONNAIES ───────
                   `available` et non une absence : l'entrée grisée dit « cette lecture
                   existe, pas sur cette classe d'actif », là où la faire disparaître
                   laisserait croire à un oubli. C'est le traitement déjà réservé au
                   volume et à la capitalisation.

                   Elle passe aussi à `false` quand la source n'a pas répondu : une
                   case cochée sans courbe accuserait le graphique d'un défaut de
                   réseau. */
                {
                  id: 'fear',
                  group: 'chart' as const,
                  label: t('Indice de peur et d’avidité'),
                  checked: showFear,
                  available: assetClass === 'crypto' && sentiment?.failed !== true,
                },

                /* ── LE DÉNOMINATEUR, EN TROIS ENTRÉES EXCLUSIVES ─────────
                   Voir la note de `chartCurrency`. `available` teste la présence
                   RÉELLE du taux : sans lui, cocher « BTC » laisserait la courbe en
                   euros sous une étiquette fausse, ce que le repli de `currency`
                   évite déjà mais qu'une case allumée démentirait. */
                ...DENOMINATORS.map((code) => ({
                  id: `denom-${code}`,
                  group: 'chart' as const,
                  /* ⚠️ LE LIBELLÉ PASSE PAR LA TABLE DE PHRASES, ET IL LE FAUT.
                     Écrit en gabarit littéral — `Cours en ${code}` — il n'aurait
                     correspondu à aucune clé, et `translate()` aurait rendu le texte
                     d'entrée : « Cours en BTC » dans les douze langues. La clé
                     paramétrée est posée dans les douze fichiers de phrases, et le
                     code de l'unité y est substitué après traduction. */
                  label: t('Cours en {unite}').replace('{unite}', code),
                  checked: currency === code,
                  available: code === asset.currency || Boolean(rates?.rates[code]),
                })),

                /* ── SECTION « INFOBULLE » ────────────────────────────────
                   Elle ne change RIEN au tracé : ces deux-là ajoutent une ligne à la
                   bulle qui suit le curseur. C'est le partage du modèle, et il tient
                   parce que le coût n'est pas le même — une bande de volume mange un
                   quart du cadre, une ligne de bulle ne coûte que pendant le survol. */
                {
                  id: 'tip-change',
                  group: 'tooltip',
                  label: 'Variation sur la fenêtre',
                  checked: tooltipChange,
                },
                {
                  id: 'tip-cap',
                  group: 'tooltip',
                  label: 'Capitalisation',
                  checked: tooltipMarketCap,
                  /* Grisée plutôt que masquée, comme le volume : sur une action ou une
                     matière première, la source ne publie aucun historique de
                     capitalisation, et l'entrée éteinte dit « cette lecture existe,
                     pas ici » là où l'absence laisserait croire à un oubli. */
                  available: metricAvailable.marketCap && metric === 'price',
                },
              ]}
              onSettingChange={(id, next) => {
                if (id === 'volume') setVolumeWanted(next)
                else if (id === 'navigator') setNavigatorWanted(next)
                else if (id === 'ma') setShowMovingAverage(next)
                else if (id === 'lines') setShowPriceLines(next)
                else if (id === 'log') setLogScale(next)
                else if (id === 'fear') setShowFear(next)
                else if (id === 'tip-cap') setTooltipMarketCap(next)
                else if (id === 'tip-change') setTooltipChange(next)
                else if (id.startsWith('denom-')) {
                  /* Cocher CHOISIT l'unité — les deux autres s'éteignent d'elles-mêmes
                     puisque `checked` compare à `currency`. Décocher rend la main au
                     réglage du site plutôt que de laisser le graphique sans devise. */
                  setChartCurrency(next ? id.slice('denom-'.length) : null)
                }
              }}
              kind={effectiveKind}
              onKindChange={(key) => setKind(key as ChartKind)}
              view={view}
              renderOptions={renderOptions}
              onViewChange={selectView}
              intervals={availableIntervals}
              intervalId={intervalId}
              onIntervalChange={(id) => setIntervalId(id as BinanceInterval | null)}
              rangeId={rangeId}
              onRangeChange={selectPreset}
              customRange={customRange}
              onCustomRange={applyCustomRange}
              onExport={(format) => void handleExport(format)}
            />

            {/*
              AIGUILLAGE DES VUES.

              Chacune remplace le tracé sans toucher au reste de la barre : les
              commandes de grandeur, de type et de période restent visibles, parce
              qu'elles reprendront leur effet dès le retour à la vue originale.

              Les deux vues externes sont montées CONDITIONNELLEMENT et non masquées
              en CSS : TradingView chargerait sinon ses centaines de kilooctets pour
              tout le monde, et le carnet interrogerait Binance toutes les cinq
              secondes derrière un écran que personne ne regarde.
            */}
            {/* Le symbole arrive TRADUIT de la page — voir la prop. La condition sur sa
                présence est la MÊME que celle qui fait exister l'interrupteur dans
                `renderOptions` : le cadre ne peut donc pas être monté avec un symbole
                que TradingView ne connaît pas. */}
            {view === 'tradingview' && tradingViewSymbol ? (
              /* Le SYMBOLE suit la grandeur choisie : `CRYPTOCAP:BTC` quand on demande
                 la capitalisation, la paire de cotation sinon. Le repli sur le prix
                 couvre le cas où la grandeur est restée sur « capitalisation » en
                 arrivant depuis une fiche qui la traçait — le sélecteur est alors grisé,
                 mais l'état, lui, a voyagé. */
              <TradingViewChart
                symbol={
                  metric === 'marketCap' && tradingViewMarketCapSymbol
                    ? tradingViewMarketCapSymbol
                    : tradingViewSymbol
                }
              />
            ) : view === 'depth' ? (
              <AssetDepthChart symbol={asset.symbol} />
            ) : (
              <OverviewTab
                history={chartHistory}
                candles={intervalId ? intervalCandles : candles}
                kind={effectiveKind}
                loading={loading || candlesLoading}
                rate={rate}
                currency={currency}
                days={days}
                assetName={asset.name}
                showVolume={volumeWanted && volumeAvailable && metric === 'price'}
                showNavigator={navigatorWanted}
                showMovingAverage={showMovingAverage}
                showPriceLines={showPriceLines}
          /* Décocher retire la courbe sans jeter la série, qui reste en mémoire
             pour un recochage immédiat. Une source en panne ne passe rien :
             l'entrée du menu se grise, elle ne ment pas par une case cochée. */
          {...(showFear && sentiment && !sentiment.failed
            ? { sentiment: sentiment.points }
            : {})}
                logScale={logScale}
                referenceLines={referenceLines}
                handleRef={chartHandle}
                overview={overview}
                onOverviewRange={selectOverviewRange}
                compare={compare}
                /* La capitalisation et le volume se comptent en milliards ; le cours,
                   non. C'est ici que la distinction existe — le graphique, lui, ne
                   voit que des nombres. */
                compactValues={metric !== 'price'}
                /* La capitalisation ne s'affiche dans la bulle que si la série la
                   porte ET si l'on trace bien le cours : sous « Capitalisation », la
                   courbe EST la capitalisation, et la répéter dans la bulle serait
                   écrire deux fois le même nombre. */
                showTooltipMarketCap={
                  tooltipMarketCap && metricAvailable.marketCap && metric === 'price'
                }
                showTooltipChange={tooltipChange}
              />
            )}

            {/* La source change AVEC la vue, et le dire est une obligation (§5) : un
                pas de bougie affiche le cours d'une seule place, là où la courbe par
                défaut montre une moyenne pondérée de plusieurs dizaines. */}
            {intervalId && view === 'original' ? (
              <p className="mt-2 text-micro text-ink-muted">
                {t(
                  'Bougies de {paire} sur Binance, converties en {devise}. La courbe par défaut agrège au contraire l’ensemble des places de cotation.',
                )
                  .replace('{paire}', `${asset.symbol}/USDT`)
                  .replace('{devise}', currency)}
              </p>
            ) : null}

            {compare.length > 0 ? (
              /* ⚠️ CETTE PHRASE DISAIT « RAMENÉES À 100 », ET C'ÉTAIT VRAI. L'axe de
                 comparaison porte désormais des POURCENTAGES et non un indice — voir
                 la note de l'indexation dans `PriceChartInteractive`. La légende sous
                 le graphique nomme maintenant chaque courbe avec sa couleur, si bien
                 que l'énumération « traits tiretés : … » n'a plus lieu d'être : elle
                 redisait en texte ce que les pastilles montrent. */
              <p className="mt-2 text-micro leading-relaxed text-ink-muted">
                {t('Chaque courbe part de zéro au début de la période : l’axe montre une progression relative, pas un montant.')}
              </p>
            ) : null}
        </div>
      </div>
    </div>
  )
}

/* Les deux fonctions de fusion du direct — `appendLivePoint` et `mergeCandle` —
   vivent dans `live-series.ts`, avec leurs tests. Elles décident à chaque message
   s'il faut allonger la série, en remplacer la fin ou ne rien faire, et leurs cas
   limites ne se reproduisent pas à la main dans un navigateur. */

/* ── Onglets ──────────────────────────────────────────────────────────────── */

/**
 * Onglet Aperçu — amélioration progressive du graphique.
 *
 * Le graphique EST le contenu principal d'une fiche de cotation : c'est donc lui qui
 * détermine le LCP, et ce que voit un robot d'indexation. Or lightweight-charts peint
 * en canvas depuis une `requestAnimationFrame`, ce qui suppose du JavaScript exécuté
 * ET un onglet visible. Sans précaution, la fiche resterait vide jusqu'à
 * l'hydratation, et entièrement vide pour un crawler.
 *
 * On rend donc d'abord la version SVG côté serveur — immédiate, indexable, sans
 * JavaScript — puis on bascule sur la version interactive une fois montée. Le
 * visiteur voit une courbe tout de suite, et gagne la croix de visée un instant plus
 * tard sans avoir rien vu clignoter.
 */
function OverviewTab({
  history,
  candles,
  kind,
  loading,
  rate,
  currency,
  days,
  assetName,
  showVolume,
  showNavigator,
  showMovingAverage,
  showPriceLines,
  sentiment,
  logScale,
  referenceLines,
  handleRef,
  overview,
  onOverviewRange,
  compare,
  compactValues,
  showTooltipMarketCap,
  showTooltipChange,
}: {
  history: PriceHistory | null
  candles: ChartCandle[] | null
  kind: ChartKind
  loading: boolean
  rate: number
  currency: string
  days: number
  assetName: string
  showVolume: boolean
  /** Frise de navigation sous le tracé — réglable depuis la roue dentée de la barre. */
  showNavigator: boolean
  showMovingAverage: boolean
  showPriceLines: boolean
  /**
   * Relevés de l'indice de peur, DÉJÀ filtrés par l'état de la case.
   *
   * L'onglet ne connaît ni le réglage ni son chargement : il reçoit une série ou
   * rien. C'est `AssetWorkspace` qui décide, parce que c'est lui qui tient l'état du
   * menu et l'appel réseau.
   */
  sentiment?: { timestamp: number; value: number }[]
  logScale: boolean
  referenceLines: ChartReferenceLine[]
  handleRef: React.MutableRefObject<ChartHandle | null>
  /** Historique complet pour la frise de navigation — voir sa note plus haut. */
  overview: { values: number[]; timestamps: number[] } | null
  onOverviewRange: (from: number, to: number) => void
  /** Courbes superposées — zéro à quatre. Vide = aucune comparaison. */
  compare: { id: string; label: string; points: { timestamp: number; price: number }[] }[]
  /** La grandeur tracée se compte-t-elle en milliards ? Voir `formatCompactPrice`. */
  compactValues: boolean
  /** Lignes facultatives de l'infobulle — section « Infobulle » de la roue dentée. */
  showTooltipMarketCap: boolean
  showTooltipChange: boolean
}) {
  const locale = useLocale()
  const nombres = useFormatters()

  const fr = useContent()
  const t = usePhrase()
  const [interactive, setInteractive] = useState(false)

  /*
   * Interactivité (survol, infobulle) retardée après le montage : le rendu serveur n'a
   * pas de souris à écouter, l'activer avant l'hydratation n'apporterait rien.
   *
   * ON ATTEND EN PLUS QUE LE MODULE SOIT ARRIVÉ. Le graphique interactif est désormais
   * chargé à la demande (voir sa note en tête de fichier) : basculer dès le montage
   * remplacerait la courbe SVG par du VIDE pendant le téléchargement des 87 Ko, c'est-
   * à-dire exactement le trou que le rendu progressif existait pour éviter.
   *
   * L'`import()` résout depuis le cache de modules la seconde fois : celui de `dynamic`
   * ne repaie donc rien, il retrouve ce que celui-ci vient de chercher.
   */
  useEffect(() => {
    let cancelled = false
    void import('@/components/asset/PriceChartInteractive').then(() => {
      if (!cancelled) setInteractive(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!history || history.points.length < 2) {
    return (
      <EmptyState
        title={fr.asset.chartUnavailable}
        description={loading ? fr.asset.loadingSeries : null}
        compact
      />
    )
  }

  const label = `${t('Cours de {nom}').replace('{nom}', assetName)} — ${t('{n} jours').replace('{n}', String(days))}`

  return (
    // L'opacité pendant le chargement conserve le graphique précédent à l'écran :
    // le vider ferait sauter la hauteur de la page à chaque changement de période.
    //
    // `chart-stretch` : maillon de la CHAÎNE qui distribue la hauteur en plein écran.
    // `flex: 1` ne s'applique qu'aux enfants DIRECTS d'un conteneur flexible, et la
    // boîte du tracé est enfouie deux niveaux plus bas ; chaque niveau intermédiaire
    // doit donc à la fois grandir et redistribuer. La classe ne fait rien hors plein
    // écran — voir `globals.css`.
    <div
      className={`chart-stretch ${loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}`}
    >
      {interactive ? (
        <PriceChartInteractive
          points={history.points}
          candles={candles ?? undefined}
          kind={kind}
          rate={rate}
          currency={currency}
          days={days}
          label={label}
          showVolume={showVolume}
          showNavigator={showNavigator}
          showMovingAverage={showMovingAverage}
          showPriceLines={showPriceLines}
          logScale={logScale}
          /* Les points ne sont passés QUE si la case est cochée : décocher retire la
             courbe sans jeter la série, qui reste en mémoire pour un recochage
             immédiat. `failed` est traité par l'entrée du menu, qui se grise. */
          {...(sentiment ? { sentiment } : {})}
          referenceLines={referenceLines}
          handleRef={handleRef}
          overview={overview ?? undefined}
          onOverviewRange={onOverviewRange}
          compare={compare}
          compactValues={compactValues}
          showTooltipMarketCap={showTooltipMarketCap}
          showTooltipChange={showTooltipChange}
        />
      ) : (
        <PriceChart
          points={history.points.map((point) => ({ ...point, price: point.price * rate }))}
          currency={currency}
          label={label}
          /* LA MÊME hauteur que le graphique interactif, et c'est ce qui évite le
             décalage de mise en page au moment de la bascule — voir la note de
             `ASSET_CHART_HEIGHT`. */
          height={ASSET_CHART_HEIGHT}
          /* La même règle que sur le graphique interactif, et il FAUT qu'elle soit la
             même : ce tracé SVG est celui qu'on voit avant l'hydratation, et deux
             échelles différentes feraient sauter les étiquettes de l'axe au moment de
             la bascule. */
          /* `formatAxisMoney` et non plus `formatCompactAxis` / `formatNumber` : le
             graphique interactif écrit désormais « $55.00 » sur son échelle, et ce
             tracé-ci est celui qu'on voit AVANT lui. Deux formats feraient sauter les
             étiquettes au moment de la bascule — c'est tout l'objet de la note. */
          formatPrice={(value) => nombres.axisMoney(value, currency, compactValues)}
          formatDate={(timestamp) =>
            new Intl.DateTimeFormat(locale,
              days <= 1
                ? { hour: '2-digit', minute: '2-digit' }
                : { day: 'numeric', month: 'short' },
            ).format(new Date(timestamp))
          }
        />
      )}
    </div>
  )
}

/*
 * `HistoryTab`, `FaqTab`, `StatsTab` et `AboutTab` ONT TOUS QUITTÉ CE FICHIER.
 *
 * Les quatre rendaient un contenu qui n'avait rien à voir avec un graphique, et qui
 * n'était atteignable qu'en le remplaçant. Ils vivent désormais là où on les cherche,
 * chacun dans son propre fichier :
 *
 *   Statistiques  → `AssetMetricRail` et `AssetChangeGrid`
 *   À propos      → la section « À propos » et `AssetTechSheet`
 *   Performances  → `AssetYearPerformance`, dans l'onglet Analyse
 *   FAQ           → `AssetFaq`, en bas de page
 *
 * Les garder ici aurait laissé deux implémentations d'un même affichage, qui auraient
 * divergé au premier ajustement. C'est déjà ce qui avait été constaté avec les
 * statistiques, d'où la règle.
 *
 * Les deux derniers ne prennent plus de `rate` ni de `currency` : ils lisent la devise
 * du site (`useCurrency`) au lieu du sélecteur local de la barre d'outils, qui est une
 * commande du graphique et n'avait pas vocation à régler le libellé d'une phrase.
 */

/*
 * ═════════════════════════════════════════════════════════════════════════════
 * `CurrencySelector` A ÉTÉ RETIRÉ — IL N'Y A PLUS QU'UN SÉLECTEUR SUR LA PAGE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Ce `<select>` a vécu dans une rangée à lui, puis dans le menu de réglages de la
 * barre d'outils. Les deux emplacements partageaient le même défaut : ils faisaient
 * cohabiter DEUX commandes de devise sur une même page — celle-ci pour le graphique,
 * celle des préférences pour tout le reste — sans que rien ne les rapproche. Le
 * bandeau de l'actif pouvait afficher des euros au-dessus d'une courbe en dollars.
 *
 * Le graphique lit désormais `useCurrency`, comme les classements et les tableaux.
 * Voir la déclaration de `currency` en tête de `AssetWorkspace`.
 */

