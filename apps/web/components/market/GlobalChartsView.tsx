'use client'

import { useMemo, useState } from 'react'

import type { PriceHistory } from '@zenith/data'

import { TrendChart, type TrendPoint } from '@/components/charts/TrendChart'
import { dataColor } from '@/components/charts/chart-theme'

/**
 * Explorateur de courbes longues.
 *
 * Trois choix indépendants — QUEL actif, QUELLE grandeur, SUR QUELLE fenêtre — et
 * aucun ne relance de requête : la série d'un an est déjà en mémoire, et les trois
 * grandeurs (prix, capitalisation, volume) voyagent dans la même réponse de la
 * source. Un sélecteur de fenêtre qui rappellerait le serveur pour montrer les
 * trente derniers points d'un tableau déjà chargé ajouterait une latence sans
 * contrepartie, et une requête de plus sur un quota mesuré.
 *
 * C'est aussi ce qui rend la comparaison honnête : les trois grandeurs proviennent du
 * même relevé, au même instant. Les charger séparément exposerait à afficher un prix
 * de 14 h 02 sous une capitalisation de 13 h 55.
 */

const SERIES = [
  { id: 'bitcoin', label: 'Bitcoin', symbol: 'BTC' },
  { id: 'ethereum', label: 'Ethereum', symbol: 'ETH' },
] as const

type SeriesId = (typeof SERIES)[number]['id']

const METRICS = [
  { id: 'marketCap', label: 'Capitalisation' },
  { id: 'price', label: 'Cours' },
  { id: 'volume', label: 'Volume 24 h' },
] as const

type MetricId = (typeof METRICS)[number]['id']

const RANGES = [
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 365, label: '1 an' },
] as const

export function GlobalChartsView({
  histories,
}: {
  /** Séries d'un an, indexées par identifiant d'actif. Une entrée absente = source muette. */
  histories: Partial<Record<SeriesId, PriceHistory>>
}) {
  const [seriesId, setSeriesId] = useState<SeriesId>('bitcoin')
  const [metric, setMetric] = useState<MetricId>('marketCap')
  const [days, setDays] = useState<number>(365)

  const history = histories[seriesId]

  const points = useMemo<TrendPoint[]>(() => {
    if (!history) return []

    const cutoff = Date.now() - days * 86_400_000
    const result: TrendPoint[] = []

    for (const point of history.points) {
      if (point.timestamp < cutoff) continue
      const value =
        metric === 'price' ? point.price : metric === 'volume' ? point.volume : point.marketCap
      // Un point dont la grandeur demandée n'est pas publiée est ÉCARTÉ, pas ramené à
      // zéro : un creux à zéro au milieu d'une courbe de capitalisation se lirait
      // comme un effondrement du marché.
      if (value === undefined || !Number.isFinite(value)) continue
      result.push({ timestamp: point.timestamp, value })
    }

    return result
  }, [history, metric, days])

  const available = SERIES.filter((entry) => histories[entry.id])
  const current = SERIES.find((entry) => entry.id === seriesId)
  const color = dataColor(SERIES.findIndex((entry) => entry.id === seriesId))

  if (available.length === 0) return null

  return (
    <section className="space-y-4" aria-labelledby="courbes-titre">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 id="courbes-titre" className="display-md text-ink">
            Courbes longues
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Cours, capitalisation et volume proviennent d’un même relevé de la source —
            trois lectures d’un même instant, jamais recalculées l’une depuis l’autre.
          </p>
        </div>

        <Group label="Période">
          {RANGES.map((range) => (
            <Chip
              key={range.days}
              active={days === range.days}
              onClick={() => setDays(range.days)}
              label={range.label}
            />
          ))}
        </Group>
      </div>

      <div className="border border-border-subtle bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-3">
          <Group label="Actif">
            {available.map((entry) => (
              <Chip
                key={entry.id}
                active={seriesId === entry.id}
                onClick={() => setSeriesId(entry.id)}
                label={entry.label}
              />
            ))}
          </Group>

          <Group label="Grandeur">
            {METRICS.map((entry) => (
              <Chip
                key={entry.id}
                active={metric === entry.id}
                onClick={() => setMetric(entry.id)}
                label={entry.label}
              />
            ))}
          </Group>
        </div>

        <div className="p-3">
          {points.length >= 2 ? (
            <TrendChart
              points={points}
              color={color}
              currency={history?.currency ?? 'EUR'}
              format={metric === 'price' ? 'currency' : 'compact'}
              label={`${current?.symbol ?? ''} · ${
                METRICS.find((entry) => entry.id === metric)?.label ?? ''
              }`}
            />
          ) : (
            <p className="py-16 text-center text-sm text-ink-muted">
              La source ne publie pas cette grandeur pour {current?.label} sur la période
              choisie.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="text-[0.6875rem] uppercase tracking-wide text-ink-muted">{label}</span>
      <div className="flex items-center gap-1 border border-border-subtle p-0.5">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
        active ? 'bg-brand text-on-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
