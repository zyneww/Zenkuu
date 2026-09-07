'use client'

import { useMemo, useState } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import type { SentimentPoint } from '@zenkuu/data'

import { SentimentBars, type PricePoint } from '@/components/sentiment/SentimentBars'
import { usePhrase } from '@/components/locale/ContentProvider'

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

export function SentimentHistoryView({
  points,
  /**
   * Cours du bitcoin, en surimpression. Vide quand la source n'a rien rendu — la
   * figure retire alors son axe de droite plutôt que d'en afficher un vide (§5).
   */
  prices = [],
}: {
  points: SentimentPoint[]
  prices?: PricePoint[]
}) {
  const t = usePhrase()
  const [days, setDays] = useState(90)

  const visible = useMemo(() => points.slice(-days), [points, days])

  /* Le cours est découpé PAR DATE et non par nombre de points : les deux séries
     n'ont pas le même pas — l'indice est quotidien, le cours peut être horaire selon
     la profondeur demandée. Un `slice(-days)` sur les prix cadrerait donc une fenêtre
     différente de celle des barres, et la courbe raconterait une autre période. */
  const visiblePrices = useMemo(() => {
    const first = visible[0]
    if (!first) return []
    return prices.filter((price) => price.timestamp >= first.timestamp)
  }, [prices, visible])

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
        <h2 id="historique-titre" className="display-sm text-ink">{t('Évolution de l’indice')}</h2>

        {/* `ToggleGroup` de shadcn/ui, comme sur les classements : un vrai groupe à
            sélection unique, avec les flèches directionnelles et l'annonce du rang par
            la synthèse vocale. ⚠️ Les clés sont des NOMBRES de jours, et Radix ne parle
            que chaînes : d'où le `String()` à l'aller et le `Number()` au retour. */}
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          aria-label={t('Période affichée')}
          value={String(days)}
          onValueChange={(next) => {
            /* Radix n'a pas de `disallowEmptySelection` : recliquer l'option
               active rappelle avec la CHAÎNE VIDE. Ce réglage n'a pas d'état
               « aucun » — on ignore donc ce cas plutôt que de laisser le
               contrôle devenir muet sur une valeur qui, elle, n'a pas bougé. */
            if (next) setDays(Number(next))
          }}
        >
          {available.map((range) => (
            <ToggleGroupItem key={range.days} value={String(range.days)} className="tabular">
              {t(range.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <SentimentBars points={visible} prices={visiblePrices} />

      {stats ? (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle">
          <Cell label={t('Plus bas sur la période')} value={stats.min} />
          <Cell label={t('Moyenne')} value={stats.moyenne} />
          <Cell label={t('Plus haut sur la période')} value={stats.max} />
        </dl>
      ) : null}
    </section>
  )
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      {/* `text-micro` et non `text-micro` : c'est exactement le même cran, mais
          nommé par le design system plutôt que réécrit en littéral. */}
      <dt className="text-micro text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{value}</dd>
    </div>
  )
}
