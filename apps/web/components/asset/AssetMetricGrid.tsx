'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { ChangeBadge, formatCompact, formatPercent, formatShare } from '@zenkuu/ui'

import { useAssetSeries } from '@/components/asset/asset-series'
import { usePanelVisible } from '@/components/asset/panel-visibility'
import { Money } from '@/components/locale/Money'
import { InfoTip } from '@/components/ui/InfoTip'
import { Panel } from '@/components/ui/Panel'
import { Link } from '@/i18n/navigation'
import type { SeriesPoint } from '@/lib/series-stats'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * CATALOGUE DE MÉTRIQUES — une carte par mesure, filtrable par catégorie.
 *
 * ── CE QUE CE BLOC REPREND DE LA RÉFÉRENCE, ET POURQUOI ───────────────────────
 *
 * C'est son écran le plus dense et le plus reconnaissable : une barre latérale de
 * catégories à gauche, une grille de cartes-graphiques à droite, une par métrique.
 * Nous avions déjà la MATIÈRE — vingt mesures au registre, chacune avec son libellé,
 * son explication et sa page dédiée — mais elle n'existait qu'à deux endroits qui la
 * montrent mal : le rail, où elle tient en une ligne de texte sans courbe, et les
 * pages dédiées, qui n'en montrent qu'UNE à la fois.
 *
 * La grille répond à une question que ni l'un ni l'autre ne traite : « qu'est-ce que
 * cet actif, en un écran ». Vingt lignes de rail se lisent l'une après l'autre ; vingt
 * cartes se balaient d'un regard, et celles qui portent une courbe se comparent entre
 * elles sans qu'on ait à ouvrir quoi que ce soit.
 *
 * ── ELLE VIT DANS « ANALYSE » ET PAS DANS SON PROPRE ONGLET ───────────────────
 *
 * La référence lui donne un onglet. Nous non, et c'est délibéré : la rangée est passée
 * de sept onglets à cinq précisément parce que sa longueur se paie à chaque visite
 * (voir `AssetPageView`). Un sixième onglet reprendrait ce coût pour un contenu qui
 * appartient au même geste que les indicateurs techniques et les mesures de risque —
 * regarder l'actif de près, avec ses chiffres dérivés.
 *
 * Sa place dans l'onglet le dit : après le risque, avant l'historique des cours. On
 * descend du synthétique vers le détaillé, et la série jour par jour ferme la marche
 * comme la pièce justificative de tout ce qui précède.
 *
 * ── TROIS SÉRIES SONT RÉELLES, TROIS SONT CALCULÉES, LE RESTE N'EN A PAS ──────
 *
 * Le cours, la capitalisation et le volume arrivent dans la MÊME réponse
 * `market_chart`, déjà chargée par l'onglet : leurs courbes ne coûtent aucun appel.
 *
 * Trois cartes de plus portent une courbe CALCULÉE à partir de ces trois séries-là —
 * rotation du volume, repli depuis le plus haut, volume moyen. Elles ne sont pas des
 * estimations mais des fonctions déterministes de nombres publiés, au même titre que
 * la volatilité du panneau de risque juste au-dessus (voir `lib/series-stats.ts`). Le
 * groupe qui les porte s'appelle « Calculées » plutôt que d'être mêlé aux autres : le
 * lecteur doit pouvoir savoir d'un coup d'œil ce qui vient de la source et ce qui vient
 * de nous.
 *
 * Les autres — offre, extrêmes, rang, place de cotation — n'existent qu'à l'instant
 * présent chez la source. Leur carte affiche la valeur et se tait sur le reste, plutôt
 * que de tracer une ligne plate qui aurait l'air d'une histoire (§5).
 */

/** Fenêtre des courbes. La même que les pages de métrique, et pour la même raison. */
const RANGE_DAYS = 365

export type MetricSeriesKey = 'price' | 'marketCap' | 'volume'

/**
 * Carte préparée CÔTÉ SERVEUR.
 *
 * `value` est un nœud React déjà rendu, et non une chaîne : les montants passent par
 * `Money`, qui suit la devise choisie par le lecteur, et les quantités par le symbole
 * de l'actif. Formater ici en texte obligerait ce composant à refaire un travail que
 * `MetricValue` fait déjà — et les deux copies finiraient par diverger, ce que le
 * registre de métriques existe précisément pour empêcher.
 */
export interface MetricCard {
  slug: string
  label: string
  help: string
  group: string
  /**
   * Page dédiée de la métrique. ABSENTE pour les mesures calculées : elles n'ont pas
   * de page, et un libellé souligné qui ne mène nulle part est pire qu'un libellé nu.
   */
  href?: string
  value: React.ReactNode
  change?: number
  changeKind?: 'distance' | 'variation'
  /** Grandeur à extraire de la réponse `market_chart`. */
  series?: MetricSeriesKey
  /**
   * Série DÉJÀ calculée, pour les mesures qui n'existent pas dans la réponse.
   *
   * `series` désigne une colonne de la source, `points` une courbe que nous avons
   * produite (rotation du volume, repli). Deux champs et non un seul : l'un se lit,
   * l'autre se fabrique, et la carte doit pouvoir le dire au lecteur.
   */
  points?: { timestamp: number; value: number }[]
  /**
   * Unité des bornes de l'axe, sous la courbe.
   *
   * Une capitalisation s'abrège (« 1,3 T »), une rotation se lit en pourcentage
   * (« 1,6 % »). Sans cette distinction, l'axe d'une courbe de pourcentage afficherait
   * « 1,6 » — un nombre nu, dont rien ne dit s'il vaut des euros ou des points.
   */
  axisFormat?: 'compact' | 'percent'
}

const GROUP_TITLES: Record<string, string> = {
  market: 'Fondamentaux',
  range: 'Amplitude',
  supply: 'Offre',
  change: 'Variations',
  derived: 'Calculées',
}

const GROUP_ORDER = ['market', 'derived', 'range', 'supply', 'change']

export function AssetMetricGrid({
  cards,
  assetClass,
  assetId,
}: {
  cards: MetricCard[]
  assetClass: string
  assetId: string
}) {
  const t = usePhrase()
  const visible = usePanelVisible()
  const { series, settled } = useAssetSeries(assetClass, assetId, RANGE_DAYS, visible)

  const [group, setGroup] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const derived = useMemo(() => deriveCards(series?.points ?? null, series?.currency ?? 'EUR'), [series])

  const all = useMemo(() => [...cards, ...derived], [cards, derived])

  /*
   * Comptes par catégorie, calculés sur la liste COMPLÈTE et non sur la liste filtrée.
   * Un compteur qui suivrait le filtre afficherait « Amplitude 0 » dès qu'on sélectionne
   * « Offre » — c'est-à-dire qu'il cesserait de dire ce qu'il y a pour dire ce qu'on
   * regarde, information dont la sélection en cours se charge déjà.
   */
  const counts = useMemo(() => {
    const tally = new Map<string, number>()
    for (const card of all) tally.set(card.group, (tally.get(card.group) ?? 0) + 1)
    return tally
  }, [all])

  const groups = GROUP_ORDER.filter((key) => (counts.get(key) ?? 0) > 0)

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all.filter((card) => {
      if (group !== null && card.group !== group) return false
      if (needle.length === 0) return true
      // Le libellé ET l'explication : « combien de bitcoins existent » ne se trouve pas
      // en cherchant « offre maximale », mais le mot « plafond » est dans l'aide.
      return (
        card.label.toLowerCase().includes(needle) || card.help.toLowerCase().includes(needle)
      )
    })
  }, [all, group, query])

  /* Regroupement pour l'affichage : la grille reste titrée par catégorie même sans
     filtre, sinon vingt-trois cartes de natures différentes se suivraient sans césure. */
  const sections = groups
    .map((key) => ({ key, cards: shown.filter((card) => card.group === key) }))
    .filter((section) => section.cards.length > 0)

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="display-sm text-ink">{t('Toutes les métriques')}</h2>
          <span className="tabular shrink-0 text-xs text-ink-muted">{all.length} mesures</span>
        </div>

        {/*
          LA RÈGLE DES COURBES EST ÉNONCÉE ICI, UNE FOIS.

          Chaque carte sans série portait la phrase entière — « la source ne publie pas
          d'historique pour cette mesure ». Sur dix-neuf cartes dont treize sont dans ce
          cas, c'est treize fois le même paragraphe à l'écran : le lecteur cesse de le
          lire dès la deuxième, et il occupe plus de place que les chiffres qu'il
          accompagne. Dit une fois en tête de section, il informe ; répété, il meuble.

          Les cartes concernées gardent une mention de trois mots, assez pour qu'on
          sache que le vide est une absence de donnée et non un défaut d'affichage.
        */}
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Six mesures portent une courbe sur douze mois. Trois sont publiées par la source —
          cours, capitalisation, volume, toutes trois transportées par la même réponse — et
          trois sont <strong className="font-medium text-ink">calculées</strong>{t('à partir d’elles. Les autres n’existent qu’à l’instant présent chez la source : leur carte donne la valeur et s’arrête là, plutôt que de tracer une ligne qui aurait l’air d’une histoire.')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/*
          BARRE LATÉRALE — liste sur grand écran, rangée de pastilles défilante sur
          téléphone. Ce n'est pas la même mise en page parce que ce n'est pas le même
          geste : une colonne de six entrées se parcourt du regard, une rangée se
          balaie du pouce. Une colonne sur 375 pixels prendrait un tiers de la largeur
          pour un filtre qu'on n'utilise qu'une fois.
        */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            <FilterButton
              active={group === null}
              onClick={() => setGroup(null)}
              label="Toutes"
              count={all.length}
            />
            {groups.map((key) => (
              <FilterButton
                key={key}
                active={group === key}
                onClick={() => setGroup(key)}
                label={GROUP_TITLES[key] ?? key}
                count={counts.get(key) ?? 0}
              />
            ))}
          </div>

          <label className="relative mt-3 block">
            <span className="sr-only">{t('Rechercher une métrique')}</span>
            <Search
              size={13}
              strokeWidth={1.5}
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-control border border-border-subtle bg-surface py-1.5 pl-7 pr-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </label>
        </aside>

        <div className="min-w-0 space-y-5">
          {sections.length === 0 ? (
            <p className="rounded-card border border-border-subtle bg-panel px-4 py-6 text-sm text-ink-muted">
              Aucune métrique ne correspond à « {query} ».
            </p>
          ) : null}

          {sections.map((section) => (
            <div key={section.key} className="space-y-2">
              {/* Le titre de catégorie disparaît quand une seule est sélectionnée : la
                  pastille active le dit déjà, et le répéter à dix pixels ferait deux
                  fois la même annonce. */}
              {group === null ? (
                <h4 className="text-micro font-semibold uppercase tracking-wide text-ink-muted">
                  {GROUP_TITLES[section.key] ?? section.key}
                </h4>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.cards.map((card) => (
                  <Card
                    key={card.slug}
                    card={card}
                    points={
                      card.points ??
                      (card.series ? seriesFor(series?.points ?? null, card.series) : null)
                    }
                    loading={card.series !== undefined && !settled}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Barre latérale ─────────────────────────────────────────────────────────── */

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      /* `shrink-0` compte : sans lui, la rangée défilante du téléphone comprimerait
         les pastilles au lieu de déborder, et « Fondamentaux » deviendrait « Fond… ». */
      className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 lg:w-full ${
        active
          ? 'bg-brand-soft text-brand-strong'
          : 'text-ink-muted hover:bg-surface hover:text-ink'
      }`}
    >
      {label}
      <span className="tabular text-micro opacity-70">{count}</span>
    </button>
  )
}

/* ── Carte ──────────────────────────────────────────────────────────────────── */

function Card({
  card,
  points,
  loading,
}: {
  card: MetricCard
  points: { timestamp: number; value: number }[] | null
  loading: boolean
}) {
  const t = usePhrase()
  /* Une mesure « traçable » est celle qui a une colonne dans la source OU une courbe
     que nous avons calculée. Les deux réservent la zone de graphique ; le reste y met
     une phrase d'absence. */
  const traceable = card.series !== undefined || card.points !== undefined

  return (
    <Panel
      title={
        <span className="flex items-center gap-1">
          {card.href !== undefined ? (
            <Link
              href={card.href}
              className="truncate underline decoration-border-subtle decoration-dotted underline-offset-4 transition-colors duration-150 hover:text-brand-strong hover:decoration-solid"
            >
              {card.label}
            </Link>
          ) : (
            <span className="truncate">{card.label}</span>
          )}
          <InfoTip content={card.help} label={`À propos de : ${card.label}`} />
        </span>
      }
      headingLevel="h4"
      rule={false}
      className="flex flex-col"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular truncate text-lg font-semibold leading-tight text-ink">
          {card.value}
        </span>
        {card.change !== undefined ? (
          card.changeKind === 'distance' ? (
            /* Écart à un extrême : gris, comme dans le rail et pour la même raison —
               ce n'est pas un mouvement du jour mais une position dans une amplitude. */
            <span className="tabular shrink-0 text-xs text-ink-muted">
              {formatPercent(card.change)}
            </span>
          ) : (
            <ChangeBadge value={card.change} size="sm" />
          )
        ) : null}
      </div>

      {/*
        La zone de courbe a une hauteur FIXE, occupée ou non. Sans elle, une grille de
        trois colonnes mêlant cartes avec et sans courbe produirait des rangées en
        dents de scie, et la ligne d'en dessous se déplacerait à chaque changement de
        filtre. Un vide régulier se lit ; un vide irrégulier se remarque.
      */}
      <div className="mt-2 h-[3.25rem]">
        {!traceable ? (
          /*
            Un filet pointillé à la place de la courbe, et trois mots sous lui.
            Le filet occupe la ligne de base qu'aurait tenue le tracé : sans lui, la
            carte se lirait comme un graphique qui n'a pas fini de charger. Pointillé
            et non plein, parce qu'il ne représente aucune valeur — c'est la marque
            d'une absence, pas une série à zéro.
          */
          <div className="flex h-full flex-col justify-end pb-1">
            <div className="border-t border-dashed border-border-subtle" />
            <span className="mt-1 text-micro text-ink-muted">{t('Sans historique publié')}</span>
          </div>
        ) : loading ? (
          <div className="h-8 animate-pulse rounded bg-surface" />
        ) : points && points.length > 1 ? (
          <CardChart
            points={points}
            label={`${card.label}, sur un an`}
            {...(card.axisFormat ? { format: card.axisFormat } : {})}
          />
        ) : (
          <p className="text-micro leading-snug text-ink-muted">{t('Série indisponible.')}</p>
        )}
      </div>
    </Panel>
  )
}

/**
 * Courbe de carte — tracé SVG nu, sans bibliothèque.
 *
 * Vingt-trois cartes à l'écran : monter un graphique interactif dans chacune coûterait
 * plus en JavaScript que tout le reste de la page réunie. Ce tracé-ci n'a ni infobulle
 * ni interaction, et c'est le bon compromis à cette taille — sur cinquante pixels de
 * haut, survoler un point ne désigne rien de précis. Le lecteur qui veut la courbe
 * détaillée clique le libellé, qui mène à la page de la métrique.
 *
 * Le dégradé sous la ligne n'est pas décoratif : à cette hauteur, une ligne seule se
 * perd sur le fond du panneau. L'aplat lui donne une masse, donc une direction lisible
 * du coin de l'œil.
 */
function CardChart({
  points,
  label,
  format = 'compact',
}: {
  points: { timestamp: number; value: number }[]
  label: string
  format?: 'compact' | 'percent'
}) {
  const width = 100
  const height = 34

  /* Sous-échantillonnage : 365 points quotidiens sur 240 pixels de large, c'est plus
     d'un point par pixel. On en garde un sur N, le DERNIER toujours compris — sans quoi
     la courbe s'arrêterait avant la valeur affichée juste au-dessus. */
  const sampled = downsample(points, 120)

  const values = sampled.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  const coords = sampled.map((point, index) => {
    const x = (index / (sampled.length - 1)) * width
    const y = span === 0 ? height / 2 : height - ((point.value - min) / span) * height
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  const gradientId = `spark-${label.replace(/[^a-z0-9]/gi, '')}`

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
        className="h-8 w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-data-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-data-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon
          points={`0,${height} ${coords.join(' ')} ${width},${height}`}
          fill={`url(#${gradientId})`}
        />
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="var(--color-data-1)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Les bornes de l'axe des ordonnées, en toutes petites capitales. Sans elles,
          une courbe qui monte de 1 % et une qui monte de 400 % ont exactement le même
          dessin — l'échelle est le seul moyen de les distinguer. */}
      <p className="tabular mt-1 flex items-center justify-between text-micro text-ink-muted">
        <span>{format === 'percent' ? formatShare(min) : formatCompact(min)}</span>
        <span>{format === 'percent' ? formatShare(max) : formatCompact(max)}</span>
      </p>
    </div>
  )
}

function downsample<T>(items: T[], target: number): T[] {
  if (items.length <= target) return items
  const step = Math.ceil(items.length / target)
  const kept = items.filter((_, index) => index % step === 0)
  const last = items[items.length - 1] as T
  if (kept[kept.length - 1] !== last) kept.push(last)
  return kept
}

/* ── Séries ─────────────────────────────────────────────────────────────────── */

function seriesFor(
  points: SeriesPoint[] | null,
  key: MetricSeriesKey,
): { timestamp: number; value: number }[] | null {
  if (!points) return null

  const extracted = points
    .map((point) => ({
      timestamp: point.timestamp,
      value: key === 'price' ? point.price : key === 'marketCap' ? point.marketCap : point.volume,
    }))
    /* Les points antérieurs à l'apparition d'un champ n'en portent pas. Les écarter
       plutôt que les lire comme des zéros : un creux à zéro se lirait comme un arrêt
       du marché, alors que c'est un trou de mesure. */
    .filter((point): point is { timestamp: number; value: number } =>
      typeof point.value === 'number' && Number.isFinite(point.value),
    )

  return extracted.length > 1 ? extracted : null
}

/**
 * Mesures que nous CALCULONS, et que la source ne publie pas.
 *
 * Trois, choisies parce qu'elles répondent à des questions que les vingt autres
 * laissent ouvertes, et parce que chacune se déduit entièrement de nombres publiés :
 *
 *   · la rotation du volume rapporte l'activité à la taille — 40 milliards échangés,
 *     c'est énorme pour un actif de 100 milliards et banal pour un actif de 1 000 ;
 *   · le repli depuis le plus haut de l'année situe le cours dans son amplitude
 *     récente, là où l'écart au record absolu remonte parfois à 2021 ;
 *   · le volume moyen sur 30 jours donne la référence à laquelle comparer le volume
 *     du jour, qui seul ne dit pas s'il est fort ou faible.
 *
 * Aucune n'est une estimation : ce sont des rapports et des moyennes de valeurs lues
 * chez la source. La distinction est celle que défend `lib/series-stats.ts`, et le
 * groupe « Calculées » la rend visible au lecteur.
 */
function deriveCards(points: SeriesPoint[] | null, currency: string): MetricCard[] {
  if (!points || points.length < 2) return []

  const cards: MetricCard[] = []

  // ── Rotation du volume ────────────────────────────────────────────────────
  const turnover = points
    .map((point) => ({
      timestamp: point.timestamp,
      value:
        point.volume !== undefined && point.marketCap !== undefined && point.marketCap > 0
          ? (point.volume / point.marketCap) * 100
          : undefined,
    }))
    .filter((point): point is { timestamp: number; value: number } => point.value !== undefined)

  const lastTurnover = turnover[turnover.length - 1]
  if (lastTurnover) {
    cards.push({
      slug: 'derive-rotation',
      label: 'Rotation du volume',
      help: 'Volume échangé sur 24 heures rapporté à la capitalisation, en pourcentage. Elle dit quelle part de l’actif change de mains chaque jour : deux actifs au même volume n’ont pas la même liquidité si l’un est dix fois plus gros. Calculée par nos soins à partir de deux nombres publiés par la source.',
      group: 'derived',
      value: formatShare(lastTurnover.value),
      points: turnover,
      axisFormat: 'percent',
    })
  }

  // ── Repli depuis le plus haut de l'année ──────────────────────────────────
  let running = 0
  const drawdown = points.map((point) => {
    running = Math.max(running, point.price)
    return {
      timestamp: point.timestamp,
      value: running > 0 ? ((point.price - running) / running) * 100 : 0,
    }
  })
  const lastDrawdown = drawdown[drawdown.length - 1]
  if (lastDrawdown) {
    cards.push({
      slug: 'derive-repli',
      label: 'Repli depuis le plus haut 1 an',
      help: 'Écart entre le cours actuel et le plus haut atteint sur les douze derniers mois. À la différence de l’écart au record absolu, qui peut remonter à plusieurs années, celui-ci situe le cours dans son amplitude récente. Calculé par nos soins sur la série publiée par la source.',
      group: 'derived',
      value: formatPercent(lastDrawdown.value),
      points: drawdown,
      axisFormat: 'percent',
    })
  }

  // ── Volume moyen sur 30 jours ─────────────────────────────────────────────
  const volumes = points
    .map((point) => point.volume)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (volumes.length >= 30) {
    const window = volumes.slice(-30)
    const mean = window.reduce((total, value) => total + value, 0) / window.length
    cards.push({
      slug: 'derive-volume-moyen',
      label: 'Volume moyen 30 j',
      help: 'Moyenne des volumes quotidiens des trente derniers jours. C’est la référence à laquelle comparer le volume du jour : seul, celui-ci ne dit pas s’il est fort ou faible pour cet actif. Calculé par nos soins sur la série publiée par la source.',
      group: 'derived',
      value: <Money value={mean} from={currency} compact />,
    })
  }

  return cards
}
