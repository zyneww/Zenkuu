'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { AssetClass } from '@zenkuu/data'
import { ChangeBadge, EmptyState, formatPercent, formatShare } from '@zenkuu/ui'

import { loadAssetSeries } from '@/components/asset/asset-series'
import { usePanelVisible } from '@/components/asset/panel-visibility'
import { TechnicalGauge } from '@/components/asset/TechnicalGauge'
import { Money } from '@/components/locale/Money'
import { Panel } from '@/components/ui/Panel'
import { technicalSummary, type Candle, type IndicatorReading } from '@/lib/indicators'
import {
  annualizedVolatility,
  maxDrawdown,
  monthlyReturns,
  totalReturnPercent,
  windowRange,
  type SeriesPoint,
} from '@/lib/series-stats'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Onglet « Analyse » — indicateurs, risque, saisonnalité, performance relative.
 *
 * ── UN SEUL CHARGEMENT POUR QUATRE PANNEAUX ───────────────────────────────────
 *
 * Les quatre sections partagent la même matière première : une année de cours. Les
 * laisser se servir chacune ferait quatre appels pour une seule donnée, sur un quota
 * mesuré à cinq requêtes par minute. Ce composant charge donc une fois et distribue.
 *
 * ── ET IL NE CHARGE QU'À L'OUVERTURE DE L'ONGLET ──────────────────────────────
 *
 * Les quatre panneaux d'onglets sont TOUS dans le document dès le rendu serveur —
 * c'est un choix de référencement assumé (voir `AssetTabs`). Un `useEffect` de
 * montage déclencherait donc quatre appels externes pour chaque visiteur, y compris
 * l'immense majorité qui ne quittera jamais l'aperçu.
 *
 * La visibilité vient de `usePanelVisible`, c'est-à-dire de la barre d'onglets
 * elle-même. Une première version l'observait géométriquement ; l'en-tête de
 * `panel-visibility.tsx` raconte pourquoi cela ne marchait pas.
 *
 * ── CE QUE CET ONGLET N'EST PAS ───────────────────────────────────────────────
 *
 * Pas un conseil. Les indicateurs sont des transformations de cours passés, et leur
 * synthèse repose sur des seuils conventionnels que nous avons choisis (voir
 * `lib/indicators.ts`). La mention en bas de panneau n'est pas une formalité
 * juridique : elle est la condition pour qu'une aiguille pointant « achat fort »
 * puisse figurer sur un site qui n'est pas courtier (§7).
 */

const BENCHMARKS: { id: string; label: string }[] = [
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'ethereum', label: 'Ethereum' },
]

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

interface AssetAnalysisProps {
  assetClass: AssetClass
  assetId: string
  currency: string
  ath?: number
  athDate?: string
  atl?: number
  atlDate?: string
}

export function AssetAnalysis(props: AssetAnalysisProps) {
  const t = usePhrase()
  const visible = usePanelVisible()

  const [points, setPoints] = useState<SeriesPoint[] | null>(null)
  const [candles, setCandles] = useState<Candle[] | null>(null)
  const [benchmarks, setBenchmarks] = useState<Record<string, SeriesPoint[]>>({})
  /**
   * Verrou de déclenchement — une RÉFÉRENCE, et surtout pas un état.
   *
   * La première version utilisait `useState`, et c'était un bug complet, du genre qui
   * ne se voit qu'au navigateur : `setStarted(true)` était appelé DANS l'effet, et
   * `started` figurait dans ses dépendances. React exécutait donc le NETTOYAGE de
   * l'effet avant de le relancer — nettoyage qui pose `cancelled = true`. Les quatre
   * requêtes lancées une milliseconde plus tôt étaient toujours en vol ; à leur
   * retour, toutes voyaient `cancelled` vrai et jetaient leur résultat en silence.
   *
   * Symptôme observé : le serveur journalisait bien les quatre appels, en 25 ms pour
   * certains, et le squelette de chargement restait à l'écran indéfiniment.
   *
   * Une référence ne déclenche aucun rendu et ne figure dans aucune liste de
   * dépendances : le verrou se ferme sans que l'effet se relance, et `cancelled` ne
   * passe à vrai que sur un vrai démontage.
   */
  const startedRef = useRef(false)
  /** Ce qui reste attendu. Un panneau s'affiche dès que SA donnée est arrivée. */
  const [pending, setPending] = useState({ history: true, candles: true, benchmarks: true })

  const { assetClass, assetId } = props
  // Les comparaisons ne valent qu'entre actifs d'un même marché. Rapporter une action
  // au bitcoin ne dirait rien de la première et beaucoup de bruit sur la seconde.
  const comparable = assetClass === 'crypto'

  /*
   * ── RENDU PROGRESSIF, ET POURQUOI CE N'EST PAS DU CONFORT ──────────────────
   *
   * La première version attendait les quatre réponses avant de rien afficher. Mesuré
   * au serveur de développement sur un cache froid : l'historique propre revenait en
   * 1,4 s, les trois autres en 62 SECONDES. Ce n'est pas une lenteur de réseau mais
   * le quota gratuit de la source, qui plafonne à quelques requêtes par minute et met
   * les suivantes en file. Le lecteur voyait donc un squelette pendant une minute
   * alors que la moitié des panneaux étaient calculables en une seconde et demie.
   *
   * Chaque réponse pose donc son propre morceau d'état. La conséquence à accepter :
   * la page bouge pendant le chargement. C'est très largement préférable à une page
   * immobile pendant une minute, et l'ordre d'arrivée n'est pas aléatoire — le moins
   * cher arrive d'abord, ce qui est aussi le plus consulté.
   *
   * ── ET LES RÉFÉRENCES PARTENT EN SECOND ────────────────────────────────────
   *
   * Bitcoin et Ethereum sont demandés APRÈS l'historique propre, pas en même temps.
   * Quatre requêtes simultanées sur un quota de cinq par minute se bloquent
   * mutuellement : la comparaison, qui est le panneau le moins essentiel, retardait
   * les bougies dont dépend la synthèse technique. Séquencer ne change rien au total
   * mais impose l'ordre d'arrivée, et donc ce que le lecteur voit en premier.
   */
  useEffect(() => {
    if (!visible || startedRef.current) return

    let cancelled = false
    startedRef.current = true

    /*
     * L'historique passe par le cache de promesses partagé.
     *
     * Le catalogue de métriques, plus bas dans le MÊME onglet, a besoin de la même
     * année de cours. Les deux panneaux deviennent visibles au même instant — un seul
     * clic les ouvre — donc leurs effets partent ensemble et un `fetch` nu dans chacun
     * ferait deux requêtes pour une seule donnée. Sur un fournisseur plafonné à
     * quelques appels par minute, la seconde est celle qui manquera ailleurs.
     *
     * Voir `asset-series.ts` : ce qui est mis en cache est la promesse, pas le
     * résultat, ce qui déduplique aussi les appels concurrents.
     */
    const history = (id: string, klass: AssetClass) => loadAssetSeries(klass, id, 365)

    const done = (key: keyof typeof pending) =>
      setPending((previous) => ({ ...previous, [key]: false }))

    void history(assetId, assetClass).then((payload) => {
      if (cancelled) return
      if (payload) setPoints(payload.points)
      done('history')

      if (!comparable) {
        done('benchmarks')
        return
      }

      const eligible = BENCHMARKS.filter((entry) => entry.id !== assetId)
      void Promise.all(
        eligible.map((entry) =>
          history(entry.id, 'crypto').then((response) => {
            if (cancelled || !response) return
            // Mise à jour fonctionnelle : les deux références reviennent dans un ordre
            // imprévisible, et un `setBenchmarks({ ...benchmarks, … })` sur une valeur
            // capturée perdrait celle arrivée entre-temps.
            setBenchmarks((previous) => ({ ...previous, [entry.id]: response.points }))
          }),
        ),
      ).then(() => {
        if (!cancelled) done('benchmarks')
      })
    })

    void fetch(`/api/bougies?classe=${assetClass}&id=${encodeURIComponent(assetId)}&jours=365`)
      .then((response) => response.json())
      .catch(() => null)
      .then((payload) => {
        if (cancelled) return
        if (payload?.ok && Array.isArray(payload.candles)) setCandles(payload.candles)
        done('candles')
      })

    return () => {
      cancelled = true
    }
    // `pending` n'apparaît pas dans les dépendances et n'a pas à y être : il n'est
    // qu'ÉCRIT ici, par mises à jour fonctionnelles. L'inclure relancerait l'effet à
    // chaque réponse reçue — exactement la boucle que le verrou par référence évite.
  }, [visible, assetId, assetClass, comparable])

  const summary = useMemo(() => (candles ? technicalSummary(candles) : undefined), [candles])

  // Tout est arrivé et rien n'est exploitable : c'est le seul cas d'échec franc.
  if (!pending.history && !pending.candles && !points && !candles) {
    return (
      <EmptyState
        title={t('Analyse indisponible')}
        description={t('La source n’a pas fourni d’historique suffisant pour calculer ces indicateurs.')}
        compact
      />
    )
  }

  return (
    <div className="space-y-4">
      {summary === undefined && pending.candles ? <SkeletonPanel lines={3} /> : null}
      {summary ? (
        <Panel title={t('Synthèse technique')} rule={false}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <TechnicalGauge tally={summary.oscillators} title={t('Oscillateurs')} />
            <TechnicalGauge tally={summary.overall} title={t('Synthèse')} />
            <TechnicalGauge tally={summary.movingAverages} title={t('Moyennes mobiles')} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReadingTable title={t('Oscillateurs')} readings={summary.oscillatorReadings} />
            <ReadingTable title={t('Moyennes mobiles')} readings={summary.movingAverageReadings} />
          </div>

          <p className="mt-5 border-t border-border-subtle pt-3 text-[0.6875rem] leading-relaxed text-ink-muted">{t('Calculé sur les bougies quotidiennes des douze derniers mois. Les seuils de lecture (30/70 pour le RSI, ±100 pour le CCI, 20/80 pour le stochastique) sont des conventions d’usage, pas des règles universelles : deux sites peuvent afficher des verdicts différents sur le même actif. Ceci décrit le passé et ne constitue pas un conseil en investissement.')}</p>
        </Panel>
      ) : null}

      {pending.history ? <SkeletonPanel lines={2} /> : null}

      {points ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RiskPanel points={points} {...props} />
          {comparable ? (
            Object.keys(benchmarks).length > 0 ? (
              <RelativePanel points={points} benchmarks={benchmarks} />
            ) : pending.benchmarks ? (
              <SkeletonPanel lines={2} />
            ) : null
          ) : null}
        </div>
      ) : null}

      {points ? <SeasonalityPanel points={points} /> : null}
    </div>
  )
}

/* ── Tableau d'indicateurs ────────────────────────────────────────────────── */

const SIGNAL_LABELS = { buy: 'Achat', neutral: 'Neutre', sell: 'Vente' } as const
const SIGNAL_TONES = { buy: 'text-up', neutral: 'text-ink-muted', sell: 'text-down' } as const

function ReadingTable({ title, readings }: { title: string; readings: IndicatorReading[] }) {
  if (readings.length === 0) return null

  return (
    <div>
      <h3 className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      <dl>
        {readings.map((reading) => (
          <div
            key={reading.key}
            className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-1.5 last:border-0"
          >
            <dt className="min-w-0 flex-1 truncate text-xs text-ink-muted">{reading.label}</dt>
            <dd className="tabular shrink-0 text-xs font-medium text-ink">
              {reading.value === undefined ? '—' : formatIndicator(reading.value)}
            </dd>
            <dd className={`shrink-0 text-xs font-medium ${SIGNAL_TONES[reading.signal]}`}>
              {SIGNAL_LABELS[reading.signal]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * Deux décimales, sauf pour les valeurs qui dépassent le millier.
 *
 * Un RSI se lit à la décimale près ; une moyenne mobile sur un actif à 64 000 $ n'a
 * aucun besoin de ses centièmes, et les afficher casse l'alignement de la colonne.
 */
function formatIndicator(value: number): string {
  const digits = Math.abs(value) >= 1000 ? 0 : 2
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/* ── Risque ───────────────────────────────────────────────────────────────── */

function RiskPanel({
  points,
  currency,
  ath,
  athDate,
  atl,
  atlDate,
}: AssetAnalysisProps & { points: SeriesPoint[] }) {
  const t = usePhrase()
  const volatility = annualizedVolatility(points)
  const drawdown = maxDrawdown(points)
  const range7 = windowRange(points, 7)
  const range30 = windowRange(points, 30)

  return (
    <Panel title={t('Risque et extrêmes')}>
      <dl>
        {volatility !== undefined ? (
          <Row
            label={t('Volatilité annualisée')}
            hint={t('Écart-type des rendements quotidiens, ramené à l’année')}
            // `formatShare` et non `formatPercent` : une volatilité n'a pas de signe.
            // Un « +84 % » ferait lire une hausse là où il n'y a qu'une amplitude.
            value={formatShare(volatility)}
          />
        ) : null}

        {drawdown ? (
          <Row
            label={t('Perte maximale')}
            hint={`Du ${formatDay(drawdown.peakAt)} au ${formatDay(drawdown.troughAt)}`}
            value={`−${formatShare(drawdown.depthPercent)}`}
            tone="text-down"
          />
        ) : null}

        {range7 ? (
          <Row
            label={t('Amplitude 7 jours')}
            value={
              <>
                <Money value={range7.low} from={currency} /> –{' '}
                <Money value={range7.high} from={currency} />
              </>
            }
          />
        ) : null}

        {range30 ? (
          <Row
            label={t('Amplitude 30 jours')}
            value={
              <>
                <Money value={range30.low} from={currency} /> –{' '}
                <Money value={range30.high} from={currency} />
              </>
            }
          />
        ) : null}

        {ath !== undefined ? (
          <Row
            label={t('Plus haut historique')}
            hint={athDate ? relativeDay(athDate) : undefined}
            value={<Money value={ath} from={currency} />}
          />
        ) : null}

        {atl !== undefined ? (
          <Row
            label={t('Plus bas historique')}
            hint={atlDate ? relativeDay(atlDate) : undefined}
            value={<Money value={atl} from={currency} />}
          />
        ) : null}
      </dl>
    </Panel>
  )
}

function Row({
  label,
  hint,
  value,
  tone,
}: {
  label: string
  hint?: string
  value: React.ReactNode
  tone?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-2 last:border-0">
      <dt className="min-w-0 flex-1">
        <span className="text-xs text-ink-muted">{label}</span>
        {hint ? <span className="block text-micro text-ink-muted opacity-70">{hint}</span> : null}
      </dt>
      <dd className={`tabular shrink-0 text-xs font-medium ${tone ?? 'text-ink'}`}>{value}</dd>
    </div>
  )
}

/* ── Performance relative ─────────────────────────────────────────────────── */

const RELATIVE_WINDOWS = [
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 365, label: '1 an' },
]

/**
 * Surperformance face à un actif de référence.
 *
 * L'écart est calculé en points de pourcentage entre deux rendements, et non comme
 * le rendement d'un ratio. Les deux diffèrent, et le premier est celui qu'on attend :
 * « +12 points face au bitcoin » se lit directement comme « j'aurais gagné 12 points
 * de plus qu'en détenant du bitcoin ».
 */
function RelativePanel({
  points,
  benchmarks,
}: {
  points: SeriesPoint[]
  benchmarks: Record<string, SeriesPoint[]>
}) {
  const t = usePhrase()
  return (
    <Panel title={t('Face au marché')}>
      <div className="space-y-4">
        {BENCHMARKS.filter((entry) => benchmarks[entry.id]).map((entry) => {
          const reference = benchmarks[entry.id]!
          return (
            <div key={entry.id}>
              <p className="mb-1.5 text-xs font-medium text-ink">{entry.label}</p>
              <div className="grid grid-cols-3 gap-2">
                {RELATIVE_WINDOWS.map((window) => {
                  const own = totalReturnPercent(points, window.days)
                  const other = totalReturnPercent(reference, window.days)
                  const gap = own !== undefined && other !== undefined ? own - other : undefined

                  return (
                    <div
                      key={window.days}
                      className="rounded-card border border-border-subtle px-2 py-1.5"
                    >
                      <p className="text-micro uppercase tracking-wide text-ink-muted">
                        {t(window.label)}
                      </p>
                      <p className="tabular mt-0.5 text-xs">
                        {gap === undefined ? (
                          <span className="text-ink-muted">—</span>
                        ) : (
                          <ChangeBadge value={gap} size="sm" />
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 border-t border-border-subtle pt-3 text-[0.6875rem] leading-relaxed text-ink-muted">{t('Écart en points de pourcentage entre les deux rendements sur la même fenêtre.')}</p>
    </Panel>
  )
}

/* ── Saisonnalité ─────────────────────────────────────────────────────────── */

/**
 * Grille de rendements mensuels.
 *
 * L'intensité de la couleur est proportionnelle au rendement RAPPORTÉ AU PLUS FORT
 * du tableau, et non à une échelle fixe. Une échelle fixe rendrait la grille d'un
 * actif calme entièrement pâle et celle d'un actif volatil entièrement saturée —
 * dans les deux cas illisible. Normalisée, chaque grille utilise toute sa gamme.
 */
function SeasonalityPanel({ points }: { points: SeriesPoint[] }) {
  const t = usePhrase()
  const returns = monthlyReturns(points)
  if (returns.length < 2) return null

  const years = [...new Set(returns.map((entry) => entry.year))].sort((a, b) => a - b)
  const strongest = Math.max(...returns.map((entry) => Math.abs(entry.changePercent)), 1)

  const cellFor = (year: number, month: number) =>
    returns.find((entry) => entry.year === year && entry.month === month)

  return (
    <Panel title={t('Rendements mensuels')}>
      <div className="overflow-x-auto">
        {/* LE PLANCHER RESTE, contrairement à tous les autres tableaux du site.
            Ce n'est pas un tableau mais une GRILLE : treize colonnes de largeur égale
            dont la lecture tient à l'alignement des douze mois. En masquer serait
            trouer l'année ; les resserrer sous 520 pixels rendrait les cases
            illisibles. Le défilement latéral est ici la bonne réponse, et l'enveloppe
            `overflow-x-auto` le contient sans jamais élargir la page. */}
        <table className="w-full min-w-[520px] border-collapse text-xs">
          <caption className="sr-only">{t('Rendement mois par mois, en pourcentage')}</caption>
          <thead>
            <tr className="text-ink-muted">
              <th scope="col" className="py-1 text-left font-medium">
                {t('Année')}
              </th>
              {MONTH_LABELS.map((label, index) => (
                <th key={index} scope="col" className="py-1 text-center font-medium">
                  <abbr title={MONTH_NAMES[index]} className="no-underline">
                    {label}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year}>
                <th scope="row" className="tabular py-1 pr-2 text-left font-medium text-ink">
                  {year}
                </th>
                {MONTH_LABELS.map((_, month) => {
                  const cell = cellFor(year, month)
                  if (!cell) {
                    return <td key={month} className="py-1 text-center text-ink-muted opacity-40">·</td>
                  }

                  const intensity = Math.min(Math.abs(cell.changePercent) / strongest, 1)
                  const tone = cell.changePercent >= 0 ? 'var(--color-up)' : 'var(--color-down)'

                  return (
                    <td key={month} className="p-0.5">
                      <span
                        className="tabular block rounded-card px-1 py-1 text-center text-micro font-medium text-ink"
                        style={{
                          // 12 % minimum : en dessous, une case teintée devient
                          // indiscernable d'une case vide et la grille perd sa lecture.
                          backgroundColor: `color-mix(in srgb, ${tone} ${12 + intensity * 48}%, transparent)`,
                        }}
                        title={`${MONTH_NAMES[month]} ${year}`}
                      >
                        {formatPercent(cell.changePercent)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/* ── Utilitaires ──────────────────────────────────────────────────────────── */

function formatDay(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * « il y a 2 mois », à partir d'une date ISO.
 *
 * Rendu côté client uniquement — ce composant l'est entièrement — ce qui écarte le
 * risque de désaccord entre l'heure du serveur et celle du navigateur qu'un rendu
 * mixte produirait sur une durée relative.
 */
function relativeDay(iso: string): string | undefined {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return undefined

  const days = Math.round((Date.now() - then) / 86_400_000)
  const absolute = new Date(then).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (days < 1) return `${absolute} · aujourd’hui`
  if (days < 31) return `${absolute} · il y a ${days} j`
  if (days < 365) return `${absolute} · il y a ${Math.round(days / 30)} mois`
  const years = (days / 365).toFixed(1).replace('.', ',')
  return `${absolute} · il y a ${years} an${days >= 730 ? 's' : ''}`
}

/**
 * Bloc de chargement.
 *
 * Pas d'animation de pulsation : sur un quota qui peut faire attendre une minute, un
 * clignotement prolongé devient une gêne plutôt qu'un signe de vie. Une forme
 * immobile aux bonnes dimensions réserve la place sans se faire remarquer, et le
 * contenu qui la remplace ne déplace rien.
 */
function SkeletonPanel({ lines = 1 }: { lines?: number }) {
  const t = usePhrase()
  return (
    <div className="rounded-card border border-border-subtle bg-panel p-4">
      <div className="h-3 w-32 rounded-card bg-surface-muted" />
      <div
        className="mt-4 rounded-card bg-surface-muted"
        style={{ height: `${lines * 48}px` }}
      />
      <span className="sr-only">{t('Chargement des données d’analyse…')}</span>
    </div>
  )
}
