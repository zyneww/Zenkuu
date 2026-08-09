'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { AssetClass, AssetDetail, ExchangeRates, PriceHistory } from '@zenith/data'
import {
  ChangeBadge,
  EmptyState,
  PriceChart,
  formatCompact,
  formatDateTime,
  formatNumber,
} from '@zenith/ui'

import {
  OHLC_KINDS,
  PriceChartInteractive,
  type ChartCandle,
  type ChartKind,
} from '@/components/asset/PriceChartInteractive'
import { fr } from '@/content/fr'

/** Types proposés dans la barre d'outils, dans l'ordre d'affichage. */
const CHART_KINDS = [
  { key: 'area', label: fr.asset.chart.kinds.area },
  { key: 'line', label: fr.asset.chart.kinds.line },
  { key: 'candles', label: fr.asset.chart.kinds.candles },
  { key: 'bars', label: fr.asset.chart.kinds.bars },
  { key: 'baseline', label: fr.asset.chart.kinds.baseline },
] as const satisfies readonly { key: ChartKind; label: string }[]

/**
 * Onglets du widget. Le clic remplace le contenu en place, sans navigation ni défilement.
 *
 * Les onglets « Statistiques » et « À propos » ont été RETIRÉS de cette barre : la
 * refonte de la fiche les a sortis en bandes horizontales pleine largeur, où ils
 * sont visibles sans clic. Les laisser ici afficherait deux fois la même
 * information dans la même page — et la version enfermée dans un onglet serait la
 * moins consultée des deux.
 *
 * Les trois restants portent chacun un contenu qui n'existe nulle part ailleurs :
 * le graphique, les extrêmes calculés sur un an (dont la série n'est chargée qu'à
 * l'ouverture de l'onglet, pour ne pas la payer à chaque visite) et la foire aux
 * questions.
 */
const TABS = [
  { key: 'apercu', label: fr.asset.tabs.overview },
  { key: 'historique', label: fr.asset.tabs.history },
  { key: 'faq', label: fr.asset.tabs.faq },
] as const

type TabKey = (typeof TABS)[number]['key']

const RANGES = [
  { days: 1, label: fr.asset.ranges.d1 },
  { days: 7, label: fr.asset.ranges.d7 },
  { days: 30, label: fr.asset.ranges.d30 },
  { days: 90, label: fr.asset.ranges.d90 },
  { days: 365, label: fr.asset.ranges.y1 },
] as const

interface AssetWorkspaceProps {
  asset: AssetDetail
  assetClass: AssetClass
  initialHistory: PriceHistory | null
  initialDays: number
  rates: ExchangeRates | null
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
}: AssetWorkspaceProps) {
  const [tab, setTab] = useState<TabKey>('apercu')
  const [days, setDays] = useState(initialDays)
  const [currency, setCurrency] = useState(asset.currency)
  const [history, setHistory] = useState<PriceHistory | null>(initialHistory)
  const [loading, setLoading] = useState(false)
  const [yearHistory, setYearHistory] = useState<PriceHistory | null>(null)

  const [kind, setKind] = useState<ChartKind>('area')
  const [candles, setCandles] = useState<ChartCandle[] | null>(null)
  const [candlesLoading, setCandlesLoading] = useState(false)
  /**
   * `false` tant qu'on ne sait pas. Passe à `true` dès qu'une source répond qu'elle
   * ne publie pas d'OHLC — les entrées Chandeliers et Barres disparaissent alors du
   * sélecteur au lieu de rester cliquables et de ne rien produire.
   */
  const [candlesUnavailable, setCandlesUnavailable] = useState(false)

  const [showVolume, setShowVolume] = useState(false)
  const [showMovingAverage, setShowMovingAverage] = useState(false)
  const [showPriceLines, setShowPriceLines] = useState(false)

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

  const convertible = useMemo(() => {
    if (!rates) return []
    // Une devise n'est proposée que si le taux existe DANS LES DEUX SENS : sans le
    // taux de la devise d'origine, la conversion serait impossible à calculer.
    if (!rates.rates[asset.currency]) return [asset.currency]
    return Object.keys(rates.rates)
  }, [rates, asset.currency])

  const fetchHistory = useCallback(
    async (targetDays: number) => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/historique?classe=${assetClass}&id=${encodeURIComponent(asset.id)}&jours=${targetDays}`,
        )
        const payload = await response.json()
        setHistory(payload.ok ? (payload as PriceHistory) : null)
      } catch {
        setHistory(null)
      } finally {
        setLoading(false)
      }
    },
    [assetClass, asset.id],
  )

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

  // L'onglet « Historique » a besoin d'une année de données pour calculer ses
  // performances. On ne la charge qu'à son ouverture : la plupart des visiteurs ne
  // quitteront jamais l'aperçu, et cet appel serait alors gaspillé.
  useEffect(() => {
    if (tab !== 'historique' || yearHistory) return

    let cancelled = false
    fetch(`/api/historique?classe=${assetClass}&id=${encodeURIComponent(asset.id)}&jours=365`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && payload.ok) setYearHistory(payload as PriceHistory)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [tab, yearHistory, assetClass, asset.id])

  const converted = currency !== asset.currency

  return (
    <div className="rounded-card border border-border-subtle bg-surface">
      {/* Barre d'onglets */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border-subtle px-2 pt-2">
        {TABS.map((entry) => {
          const active = entry.key === tab
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              aria-current={active ? 'true' : undefined}
              className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-brand text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          )
        })}
      </div>

      <div className="p-4">
        {/* Contrôles : période à gauche (aperçu seulement), devise toujours visible. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {tab === 'apercu' ? (
            <div className="flex items-center gap-1" role="group" aria-label={fr.asset.rangeTitle}>
              {RANGES.map((range) => (
                <button
                  key={range.days}
                  type="button"
                  onClick={() => selectRange(range.days)}
                  aria-current={range.days === days ? 'true' : undefined}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    range.days === days
                      ? 'bg-brand-soft text-brand-strong'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}

          <CurrencySelector
            value={currency}
            options={convertible}
            onChange={setCurrency}
            disabled={convertible.length < 2}
          />
        </div>

        {converted && rates ? (
          <p className="mb-3 rounded-lg bg-surface-muted px-3 py-2 text-[0.6875rem] leading-relaxed text-ink-muted">
            {fr.asset.convertedNotice(asset.currency, currency, formatDay(rates.date))}
          </p>
        ) : null}

        {tab === 'apercu' ? (
          <>
            <ChartToolbar
              kind={kind}
              onKindChange={setKind}
              ohlcUnavailable={candlesUnavailable}
              volumeAvailable={volumeAvailable}
              showVolume={showVolume}
              showMovingAverage={showMovingAverage}
              showPriceLines={showPriceLines}
              onToggleVolume={setShowVolume}
              onToggleMovingAverage={setShowMovingAverage}
              onTogglePriceLines={setShowPriceLines}
            />

            <OverviewTab
              history={history}
              candles={candles}
              kind={kind}
              loading={loading || candlesLoading}
              rate={rate}
              currency={currency}
              days={days}
              assetName={asset.name}
              showVolume={showVolume && volumeAvailable}
              showMovingAverage={showMovingAverage}
              showPriceLines={showPriceLines}
            />
          </>
        ) : null}

        {tab === 'historique' ? (
          <HistoryTab
            asset={asset}
            history={yearHistory}
            rate={rate}
            currency={currency}
          />
        ) : null}

        {tab === 'faq' ? <FaqTab asset={asset} rate={rate} currency={currency} /> : null}
      </div>
    </div>
  )
}

/* ── Barre d'outils du graphique ──────────────────────────────────────────── */

/**
 * Sélecteur de type et options d'affichage.
 *
 * Les options sont des cases à cocher et non des boutons-bascule stylés : elles sont
 * cumulables et leur état doit être lisible d'un coup d'œil, y compris au clavier et
 * au lecteur d'écran (§9). Une option dont la donnée manque est DÉSACTIVÉE avec un
 * `title` qui l'explique, plutôt que masquée — l'absence silencieuse laisserait
 * croire à un oubli.
 */
function ChartToolbar({
  kind,
  onKindChange,
  ohlcUnavailable,
  volumeAvailable,
  showVolume,
  showMovingAverage,
  showPriceLines,
  onToggleVolume,
  onToggleMovingAverage,
  onTogglePriceLines,
}: {
  kind: ChartKind
  onKindChange: (kind: ChartKind) => void
  ohlcUnavailable: boolean
  volumeAvailable: boolean
  showVolume: boolean
  showMovingAverage: boolean
  showPriceLines: boolean
  onToggleVolume: (value: boolean) => void
  onToggleMovingAverage: (value: boolean) => void
  onTogglePriceLines: (value: boolean) => void
}) {
  const kinds = CHART_KINDS.filter(
    (entry) => !(ohlcUnavailable && OHLC_KINDS.includes(entry.key)),
  )

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1" role="group" aria-label={fr.asset.chart.kindTitle}>
        {kinds.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => onKindChange(entry.key)}
            aria-pressed={entry.key === kind}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              entry.key === kind
                ? 'bg-brand-soft text-brand-strong'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div
        className="flex flex-wrap items-center gap-3"
        role="group"
        aria-label={fr.asset.chart.optionsTitle}
      >
        <ChartOption
          label={fr.asset.chart.volume}
          checked={showVolume && volumeAvailable}
          onChange={onToggleVolume}
          disabled={!volumeAvailable}
          hint={volumeAvailable ? undefined : fr.asset.chart.volumeUnavailable}
        />
        <ChartOption
          label={fr.asset.chart.movingAverage}
          checked={showMovingAverage}
          onChange={onToggleMovingAverage}
        />
        <ChartOption
          label={fr.asset.chart.priceLines}
          checked={showPriceLines}
          onChange={onTogglePriceLines}
        />
      </div>
    </div>
  )
}

function ChartOption({
  label,
  checked,
  onChange,
  disabled = false,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <label
      className={`flex items-center gap-1.5 text-xs ${
        disabled ? 'cursor-not-allowed text-ink-muted/60' : 'cursor-pointer text-ink-muted'
      }`}
      title={hint}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 rounded border-border-subtle accent-brand-strong"
      />
      {label}
    </label>
  )
}

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
  showMovingAverage,
  showPriceLines,
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
  showMovingAverage: boolean
  showPriceLines: boolean
}) {
  const [interactive, setInteractive] = useState(false)

  useEffect(() => setInteractive(true), [])

  if (!history || history.points.length < 2) {
    return (
      <EmptyState
        title={fr.asset.chartUnavailable}
        description={loading ? fr.asset.loadingSeries : null}
        compact
      />
    )
  }

  const label = `${fr.asset.priceLabel(assetName)} — ${days} jours`

  return (
    // L'opacité pendant le chargement conserve le graphique précédent à l'écran :
    // le vider ferait sauter la hauteur de la page à chaque changement de période.
    <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
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
          showMovingAverage={showMovingAverage}
          showPriceLines={showPriceLines}
        />
      ) : (
        <PriceChart
          points={history.points.map((point) => ({ ...point, price: point.price * rate }))}
          currency={currency}
          label={label}
          height={320}
          formatPrice={(value) => formatNumber(value, value >= 100 ? 0 : 2)}
          formatDate={(timestamp) =>
            new Intl.DateTimeFormat('fr-FR',
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

function HistoryTab({
  asset,
  history,
  rate,
  currency,
}: {
  asset: AssetDetail
  history: PriceHistory | null
  rate: number
  currency: string
}) {
  if (!history || history.points.length < 2) {
    return <EmptyState title={fr.asset.loadingSeries} compact />
  }

  const points = history.points
  const last = points[points.length - 1]?.price ?? 0
  const now = points[points.length - 1]?.timestamp ?? Date.now()

  /** Performance sur une fenêtre, calculée depuis la série réellement chargée. */
  function performance(daysBack: number): number | undefined {
    const target = now - daysBack * 86_400_000
    // Premier point à ou après la borne : la série étant quotidienne au-delà de
    // 90 jours, viser exactement la date échouerait la plupart du temps.
    const reference = points.find((point) => point.timestamp >= target)
    if (!reference || reference.price === 0) return undefined
    return ((last - reference.price) / reference.price) * 100
  }

  const prices = points.map((point) => point.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)

  const rows = [
    // La variation 24 h vient de la SOURCE, pas de notre série : sur une année en pas
    // quotidien, deux points consécutifs ne représentent pas exactement 24 heures.
    { label: fr.asset.ranges.d1, value: asset.change24h, sourced: true },
    { label: fr.asset.ranges.d7, value: performance(7) },
    { label: fr.asset.ranges.d30, value: performance(30) },
    { label: fr.asset.ranges.d90, value: performance(90) },
    { label: fr.asset.ranges.y1, value: performance(365) },
  ]

  const money = (value: number) =>
    `${formatNumber(value * rate, value * rate >= 100 ? 2 : 6)} ${currency}`

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">{fr.asset.performanceTitle}</h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-[0.6875rem] text-ink-muted">{row.label}</dt>
              <dd className="mt-0.5">
                <ChangeBadge value={row.value} size="sm" periodLabel={`sur ${row.label}`} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[0.6875rem] text-ink-muted">{fr.asset.performanceNote}</p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">{fr.asset.rangeYearTitle}</h3>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-muted px-3 py-2">
            <dt className="text-[0.6875rem] text-ink-muted">{fr.asset.lowest}</dt>
            <dd className="tabular text-sm font-semibold text-ink">{money(min)}</dd>
          </div>
          <div className="rounded-lg bg-surface-muted px-3 py-2">
            <dt className="text-[0.6875rem] text-ink-muted">{fr.asset.highest}</dt>
            <dd className="tabular text-sm font-semibold text-ink">{money(max)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

/*
 * `StatsTab` et `AboutTab` ont été SUPPRIMÉS de ce fichier, pas seulement retirés
 * de la barre d'onglets : leur contenu vit désormais en bandes pleine largeur dans
 * `AssetPageView` (`AssetKeyStats`, `AssetChangeGrid`, la section « À propos » et
 * `AssetTechSheet`). Les garder ici aurait laissé deux implémentations d'un même
 * affichage, qui auraient divergé au premier ajustement.
 */

/**
 * FAQ entièrement DÉRIVÉE de la donnée réelle de l'actif.
 *
 * Aucune réponse n'est rédigée à l'avance : chaque entrée reprend une valeur
 * effectivement chargée, et les questions dont la donnée manque ne sont pas
 * affichées. Une FAQ écrite « en dur » sur une fiche générique finirait
 * inévitablement par affirmer quelque chose de faux sur l'un des milliers d'actifs.
 */
function FaqTab({
  asset,
  rate,
  currency,
}: {
  asset: AssetDetail
  rate: number
  currency: string
}) {
  const price = `${formatNumber(asset.price * rate, asset.price * rate >= 100 ? 2 : 6)} ${currency}`

  const entries: { question: string; answer: string }[] = [
    {
      question: fr.asset.faq.priceQ(asset.name),
      answer: fr.asset.faq.priceA(asset.name, price, formatDateTime(asset.lastUpdated) ?? '—'),
    },
  ]

  if (asset.marketCap !== undefined) {
    entries.push({
      question: fr.asset.faq.capQ(asset.name),
      answer: fr.asset.faq.capA(
        `${formatCompact(asset.marketCap * rate)} ${currency}`,
        asset.rank,
      ),
    })
  }

  if (asset.ath !== undefined && asset.assetClass === 'crypto') {
    entries.push({
      question: fr.asset.faq.athQ(asset.name),
      answer: fr.asset.faq.athA(
        `${formatNumber(asset.ath * rate, 2)} ${currency}`,
        asset.athDate ? formatDay(asset.athDate) : null,
      ),
    })
  }

  if (asset.maxSupply !== undefined) {
    entries.push({
      question: fr.asset.faq.supplyQ(asset.name),
      answer: fr.asset.faq.supplyA(
        formatCompact(asset.maxSupply) ?? '—',
        asset.symbol,
        formatCompact(asset.circulatingSupply),
      ),
    })
  }

  entries.push({ question: fr.asset.faq.buyQ(asset.name), answer: fr.asset.faq.buyA })

  return (
    <dl className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.question}>
          <dt className="text-sm font-semibold text-ink">{entry.question}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{entry.answer}</dd>
        </div>
      ))}
    </dl>
  )
}

function CurrencySelector({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: string[]
  onChange: (currency: string) => void
  disabled: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted">
      <span className="sr-only">{fr.asset.currencyLabel}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-card border border-border-subtle bg-surface px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
        aria-label={fr.asset.currencyLabel}
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  )
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date)
}
