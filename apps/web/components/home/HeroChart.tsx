'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AssetClass } from '@zenkuu/data'
import { ChangeBadge, formatCurrency } from '@zenkuu/ui'

import { AreaPlot, type PlotPoint } from '@/components/charts/AreaPlot'
import { Chip, ChipGroup } from '@/components/charts/ChipGroup'
import { useCurrency } from '@/components/locale/CurrencyProvider'

/**
 * Une destination possible du graphique de tête.
 *
 * `id` et `assetClass` sont EXACTEMENT ce qu'attend `/api/historique` : ils ne sont
 * pas reconstruits ici mais recopiés depuis l'univers déclaré côté serveur. Écrire
 * « ^FCHI » à la main dans ce fichier créerait un second endroit où le symbole du
 * CAC 40 est connu, et le jour où l'univers le renomme, la puce pointerait dans le
 * vide sans que rien ne le signale à la compilation.
 */
export interface HeroOption {
  key: string
  label: string
  id: string
  assetClass: AssetClass
}

/** Clé réservée à la série pré-chargée côté serveur. Aucune option ne peut la porter. */
const BASE_KEY = '__base__'

/**
 * Tableau vide PARTAGÉ, et non un littéral écrit à l'appel.
 *
 * Une constante hissée hors du composant garde la même identité d'un rendu à l'autre,
 * là où `[]` en produit une nouvelle à chaque fois. C'est ce qui permet au `useMemo`
 * qui le consomme de tenir sa promesse au lieu de recalculer indéfiniment.
 */
const EMPTY: readonly PlotPoint[] = []

/**
 * Profondeur demandée aux séries commutées.
 *
 * `30` est l'un des paliers de la liste blanche de `/api/historique` — la route
 * refuse toute autre valeur, précisément pour empêcher qu'une suite d'entiers libres
 * n'ouvre autant d'entrées de cache. C'est aussi la fenêtre des cartes à courbe de
 * TradingView, ce qui garde le haut de page homogène.
 */
const HERO_DAYS = 30

/**
 * Graphique de tête, commutable.
 *
 * ── CE QUE LA SÉRIE PAR DÉFAUT A DE PARTICULIER ──────────────────────────────
 *
 * La capitalisation crypto mondiale n'est PAS servie par `/api/historique`, et ce
 * n'est pas un oubli : aucune source gratuite n'en publie l'historique, si bien que
 * le site enregistre ses propres relevés (voir `market-cap-series`). Elle arrive donc
 * pré-chargée depuis le serveur, tandis que les autres options se chargent à la
 * demande.
 *
 * D'où la clé réservée `__base__` plutôt qu'une option comme les autres : la
 * distinction n'est pas cosmétique, c'est la seule série dont l'origine n'est pas une
 * route. Les traiter uniformément aurait imposé d'inventer un identifiant d'actif
 * pour une donnée qui n'en est pas un.
 *
 * ── POURQUOI UN CACHE LOCAL ──────────────────────────────────────────────────
 *
 * Le va-et-vient entre deux puces est le geste le plus probable sur ce contrôle —
 * on compare. Sans mémorisation, chaque aller-retour relancerait une requête pour une
 * série déjà affichée une seconde plus tôt. Le cache applicatif du serveur rendrait
 * la réponse sans appel externe, mais le trajet réseau resterait, et avec lui le
 * scintillement de l'état de chargement.
 */
export function HeroChart({
  options,
  baseLabel,
  baseSeries,
  baseCurrency,
  currency,
  loadingLabel,
  unavailableLabel,
}: {
  options: readonly HeroOption[]
  baseLabel: string
  baseSeries: readonly PlotPoint[]
  /** Devise dans laquelle la série pré-chargée est exprimée. */
  baseCurrency: string
  /** Devise demandée aux séries commutées. */
  currency: string
  loadingLabel: string
  unavailableLabel: string
}) {
  const [activeKey, setActiveKey] = useState<string>(BASE_KEY)
  const [cache, setCache] = useState<Record<string, PlotPoint[]>>({})
  const [failed, setFailed] = useState<Record<string, true>>({})

  /*
   * LA DEVISE D'AFFICHAGE VIENT DU MÊME ENDROIT QUE PARTOUT AILLEURS.
   *
   * Formater ces montants avec `formatCurrency` seul — ce que fait tout composant
   * qui n'a qu'une valeur et un code — afficherait une capitalisation en euros juste
   * au-dessus d'une carte affichant la même capitalisation dans la devise choisie.
   * Mesuré : « 1 965 Md € » dans le graphique de tête et « 2 273 Md $ » dans la
   * carte immédiatement en dessous, pour la même donnée au même instant. Deux
   * chiffres différents pour une seule réalité, à cinquante pixels l'un de l'autre.
   *
   * `useCurrency` est ce que `Money` consomme dans tous les tableaux du site. On s'y
   * branche directement plutôt que de rendre un `<Money>` : les libellés d'axes sont
   * des CHAÎNES rendues dans du SVG, pas des éléments React.
   */
  const { currency: displayCurrency, convert } = useCurrency()

  const active = options.find((option) => option.key === activeKey) ?? null

  /*
   * PAS D'ÉTAT `pending`, ET C'EST UNE CORRECTION DE FOND.
   *
   * La première version en portait un, positionné à `true` en entrée de `load` et à
   * `false` en sortie. Le linter l'a refusé — « Avoid calling setState() directly
   * within an effect » — et il avait raison sur le fond, pas seulement sur la forme :
   * `load` est appelé DEPUIS un effet, si bien que chaque bascule de puce déclenchait
   * deux rendus supplémentaires avant même l'arrivée des données. Mesuré au
   * navigateur : vingt rendus du composant pour un seul clic.
   *
   * L'état était en outre REDONDANT. « En cours de chargement » n'est pas une
   * information indépendante : c'est exactement « une option est active, elle n'est ni
   * en cache ni en échec ». On le DÉDUIT donc plus bas, ce qui supprime à la fois les
   * rendus superflus et le risque qu'un drapeau se désynchronise de la réalité — le
   * défaut classique d'un booléen posé à la main dans un `finally`.
   */
  const load = useCallback(
    async (option: HeroOption, signal: AbortSignal) => {
      try {
        const url =
          `/api/historique?id=${encodeURIComponent(option.id)}` +
          `&classe=${option.assetClass}&jours=${HERO_DAYS}&devise=${currency}`

        const response = await fetch(url, { signal })
        const body = (await response.json()) as
          | { ok: true; points: { timestamp: number; price: number }[] }
          | { ok: false; raison: string }

        // La route rend 200 même en cas d'absence de série : l'échec se lit dans le
        // corps, pas dans le statut. Tester `response.ok` seul laisserait donc passer
        // un `{ ok: false }` et afficherait une courbe vide sans explication.
        if (!body.ok || body.points.length === 0) {
          setFailed((current) => ({ ...current, [option.key]: true }))
          return
        }

        setCache((current) => ({
          ...current,
          [option.key]: body.points.map((point) => ({ x: point.timestamp, y: point.price })),
        }))
      } catch (error) {
        // Une requête annulée n'est pas un échec : c'est l'utilisateur qui a changé
        // d'avis avant l'arrivée. La marquer en échec afficherait « indisponible »
        // sur une option parfaitement saine, dès qu'on clique vite.
        if ((error as Error).name !== 'AbortError') {
          setFailed((current) => ({ ...current, [option.key]: true }))
        }
      }
    },
    [currency],
  )

  /*
   * ── LE CHARGEMENT EST DÉCLENCHÉ PAR LE CLIC, PAS PAR UN EFFET ──────────────
   *
   * La première version synchronisait dans un `useEffect` : « quand l'option active
   * change, charge-la ». Le linter l'a refusée — « Calling setState synchronously
   * within an effect can trigger cascading renders » — et le refus est fondé, y
   * compris après retrait du drapeau `pending` qui l'avait d'abord provoqué.
   *
   * Le fond du problème n'était pas le nombre de rendus mais le MODÈLE. Un effet sert
   * à synchroniser avec un système extérieur qui vit sa propre vie — une taille de
   * fenêtre, un abonnement, une horloge. Charger une série parce qu'on vient de
   * cliquer n'est pas une synchronisation : c'est la CONSÉQUENCE d'un événement
   * utilisateur, et sa place est dans le gestionnaire de cet événement.
   *
   * Le gain n'est pas théorique. L'effet dépendait de `cache` et de `failed`, tous
   * deux modifiés par le chargement lui-même : chaque arrivée de données le
   * relançait, pour qu'il constate aussitôt qu'il n'avait rien à faire. Ici, une
   * bascule déclenche exactement un chargement, et une série déjà connue n'en
   * déclenche aucun.
   */
  const inFlight = useRef<AbortController | null>(null)

  const select = useCallback(
    (key: string, option: HeroOption | null) => {
      setActiveKey(key)

      // Une requête encore en vol pour une AUTRE série est abandonnée : sans cela,
      // deux clics rapides laissent deux réponses arriver dans un ordre non garanti,
      // et c'est la plus lente qui gagne — donc éventuellement celle qu'on ne regarde
      // plus. Son `AbortError` est explicitement ignoré par `load`.
      inFlight.current?.abort()
      inFlight.current = null

      if (!option) return
      if (cache[option.key] || failed[option.key]) return

      const controller = new AbortController()
      inFlight.current = controller
      void load(option, controller.signal)
    },
    [cache, failed, load],
  )

  // Le seul effet restant, et c'en est un vrai : libérer une requête en vol quand le
  // composant disparaît. Rien à voir avec le chargement lui-même.
  useEffect(() => () => inFlight.current?.abort(), [])

  /*
   * `rawPoints` MÉMOÏSÉ, et le motif mérite d'être nommé.
   *
   * Écrit à plat, `active ? (cache[active.key] ?? []) : baseSeries` fabrique un
   * TABLEAU VIDE NEUF à chaque rendu tant que la série n'est pas arrivée. Ce tableau
   * sert ensuite de dépendance au `useMemo` juste en dessous, dont la mémoïsation
   * devient alors purement décorative : elle recalcule à chaque fois, puisque sa
   * dépendance change à chaque fois.
   *
   * Le linter le signale — « The 'rawPoints' conditional could make the dependencies
   * of useMemo Hook change on every render » — et c'est un vrai piège de React, pas
   * une pédanterie : un tableau littéral n'est jamais égal à lui-même.
   */
  const rawPoints: readonly PlotPoint[] = useMemo(
    () => (active ? (cache[active.key] ?? EMPTY) : baseSeries),
    [active, cache, baseSeries],
  )

  const isFailed = active ? Boolean(failed[active.key]) : baseSeries.length === 0

  // DÉDUIT, jamais stocké : une option est active, et elle n'est ni en cache ni en
  // échec — il n'existe pas d'autre situation où l'on attend quelque chose.
  const isLoading = Boolean(active) && !isFailed && rawPoints.length === 0

  const label = active?.label ?? baseLabel

  // La devise SOURCE diffère selon l'origine : la série pré-chargée est tenue dans la
  // devise où elle a été enregistrée, une série commutée arrive dans celle demandée à
  // la route. C'est cette devise-là qu'on convertit VERS celle du visiteur.
  const sourceCurrency = active ? currency : baseCurrency

  const points = useMemo(
    () => rawPoints.map((point) => ({ x: point.x, y: convert(point.y, sourceCurrency) })),
    [rawPoints, convert, sourceCurrency],
  )

  const first = points[0]?.y
  const last = points[points.length - 1]?.y
  // La variation est calculée sur les points CONVERTIS, et c'est sans conséquence :
  // une conversion est une multiplication par une constante, qui se simplifie dans un
  // rapport. Le pourcentage est donc rigoureusement le même dans les deux devises.
  const change =
    typeof first === 'number' && typeof last === 'number' && first !== 0
      ? ((last - first) / first) * 100
      : undefined

  /*
   * FORMATS D'AXES — sans eux, les graduations affichent la donnée BRUTE.
   *
   * Relevé au navigateur avant correction : l'axe du temps portait
   * « 1788834767803 » et celui des valeurs « 1963573961442 ». `AreaPlot` se replie en
   * effet sur `Math.round`, ce qui est le seul comportement raisonnable pour un tracé
   * générique — il ne peut pas deviner qu'un `x` est un instant et un `y` un montant.
   *
   * Le format du temps s'ADAPTE à la profondeur : une série de trente jours veut un
   * jour et un mois, une série de quelques heures veut une heure. La série de relevés
   * ne couvre parfois que vingt minutes, où « 16 août » serait répété sur toutes les
   * graduations.
   */
  const spanHours =
    points.length > 1 ? ((points[points.length - 1]!.x - points[0]!.x) / 3_600_000) : 0
  const intraday = spanHours > 0 && spanHours < 48

  const formatX = (x: number) =>
    new Date(x).toLocaleString('fr-FR', {
      timeZone: 'UTC',
      ...(intraday ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }),
    })

  const formatY = (y: number) => formatCurrency(y, displayCurrency, { compact: true }) ?? '—'

  /* L'infobulle est plus BAVARDE que l'axe, et elle peut se le permettre : elle
     n'apparaît qu'une à la fois, là où l'axe doit loger cinq graduations sans qu'elles
     se chevauchent. Elle porte donc toujours la date complète, y compris sur une série
     intrajournalière où l'axe ne montre que l'heure. */
  const formatTooltipX = (x: number) =>
    new Date(x).toLocaleString('fr-FR', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      ...(intraday ? { hour: '2-digit', minute: '2-digit' } : {}),
    })

  return (
    <section className="flex flex-col rounded-card border border-border-subtle bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-ink-muted">{label}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tabular text-2xl font-bold text-ink">
              {typeof last === 'number'
                ? /* `compact` seulement pour la capitalisation : un agrégat se lit
                     « 2 273 Md », un cours d'indice se lit en entier. Abréger
                     « 9 998,19 » en « 10,0 k » ferait perdre la précision qui est
                     précisément ce qu'on regarde sur une cotation. */
                  (formatCurrency(last, displayCurrency, { compact: !active }) ?? '—')
                : '—'}
            </span>
            {change !== undefined ? <ChangeBadge value={change} size="sm" /> : null}
          </div>
        </div>

        {/*
          `label` DÉCRIT LE GROUPE, il ne le nomme pas une seconde fois.

          `ChipGroup` affiche son libellé à gauche des puces. Y passer `baseLabel`
          faisait lire « CAPITALISATION CRYPTO | Capitalisation crypto · CAC 40 · … » :
          le même texte deux fois de suite, dont la première occurrence n'apprenait
          rien. « Série » dit ce que la rangée commute, ce qu'aucune puce ne dit.
        */}
        <ChipGroup label="Série">
          {/* La série pré-chargée n'a rien à charger : `null` en second argument dit
              exactement cela, et `select` s'arrête après avoir annulé ce qui volait. */}
          <Chip
            active={activeKey === BASE_KEY}
            onClick={() => select(BASE_KEY, null)}
            label={baseLabel}
          />
          {options.map((option) => (
            <Chip
              key={option.key}
              active={activeKey === option.key}
              onClick={() => select(option.key, option)}
              label={option.label}
            />
          ))}
        </ChipGroup>
      </div>

      {/*
        HAUTEUR FIXE, quel que soit l'état.

        Le bloc de chargement et le bloc d'échec occupent la MÊME hauteur que la
        courbe. Sans cela, chaque bascule de puce ferait sauter tout ce qui suit sur la
        page — panneaux, sections, pied de page — pendant les quelques centaines de
        millisecondes du chargement. C'est le décalage de mise en page que Core Web
        Vitals mesure, et il est ici entièrement évitable puisque la hauteur est connue
        d'avance.
      */}
      <div className="h-[260px] sm:h-[300px]">
        {points.length > 0 ? (
          <AreaPlot
            series={[
              {
                id: activeKey,
                label,
                color: 'var(--color-data-1)',
                points: [...points],
              },
            ]}
            height={300}
            fill
            axes
            grid
            formatX={formatX}
            formatY={formatY}
            formatTooltipX={formatTooltipX}
            formatTooltipY={(y) => formatY(y)}
            ariaLabel={label}
          />
        ) : (
          <p className="flex h-full items-center justify-center text-xs text-ink-muted">
            {isLoading ? loadingLabel : isFailed ? unavailableLabel : loadingLabel}
          </p>
        )}
      </div>
    </section>
  )
}
