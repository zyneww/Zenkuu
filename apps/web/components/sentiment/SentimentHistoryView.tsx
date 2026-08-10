'use client'

import { useMemo, useState } from 'react'

import type { SentimentPoint } from '@zenith/data'

import { SentimentChart } from '@/components/sentiment/SentimentChart'

/**
 * Sélecteur de période de l'historique.
 *
 * Le découpage est fait CÔTÉ CLIENT sur la série déjà chargée : un an de relevés
 * quotidiens tient en 365 nombres, soit quelques kilooctets. Refaire un appel
 * serveur pour montrer les 30 derniers points d'un tableau déjà en mémoire serait
 * une latence sans contrepartie — et un appel de plus sur un quota mesuré.
 */
const RANGES = [
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 180, label: '6 mois' },
  { days: 365, label: '1 an' },
]

export function SentimentHistoryView({ points }: { points: SentimentPoint[] }) {
  const [days, setDays] = useState(90)

  const visible = useMemo(() => points.slice(-days), [points, days])

  // Une période plus longue que l'historique disponible est masquée plutôt que
  // proposée : un bouton « 1 an » qui rend exactement la même courbe que « 6 mois »
  // laisse croire à une panne.
  const available = RANGES.filter((range) => points.length > range.days * 0.5)

  const stats = useMemo(() => {
    if (visible.length === 0) return null
    const values = visible.map((point) => point.value)
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      moyenne: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    }
  }, [visible])

  return (
    <section className="space-y-4" aria-labelledby="historique-titre">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="historique-titre" className="display-sm text-ink">
          Évolution de l’indice
        </h2>

        <div
          className="flex items-center gap-1 rounded-card border border-border-subtle bg-surface p-1"
          role="group"
          aria-label="Période affichée"
        >
          {available.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              aria-pressed={days === range.days}
              className={`tabular rounded-[0.5rem] px-2.5 py-1 text-xs font-medium transition-colors ${
                days === range.days
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <SentimentChart points={visible} label={`sur ${days} jours`} />

      {stats ? (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle">
          <Cell label="Plus bas sur la période" value={stats.min} />
          <Cell label="Moyenne" value={stats.moyenne} />
          <Cell label="Plus haut sur la période" value={stats.max} />
        </dl>
      ) : null}
    </section>
  )
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="text-[0.6875rem] text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{value}</dd>
    </div>
  )
}
