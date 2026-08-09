import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import type { MarketCategory } from '@zenith/data'
import { ChangeBadge, formatCurrency } from '@zenith/ui'

/**
 * Bandeau de tête : les secteurs qui portent et qui pèsent sur le marché.
 *
 * Reprise structurelle d'une page de catégories : donner un point d'entrée éditorial
 * avant la grille exhaustive, pour que le lecteur ne parte pas d'une liste plate.
 *
 * Point d'honnêteté important : le classement porte sur les secteurs REÇUS de la
 * source, pas sur l'ensemble du marché. C'est écrit sous le bandeau — le §5 vaut
 * aussi pour les superlatifs, pas seulement pour les nombres.
 */
export function SectorHighlights({ categories }: { categories: MarketCategory[] }) {
  const ranked = categories
    .filter((category) => category.marketCapChange24h !== undefined)
    .sort((a, b) => (b.marketCapChange24h ?? 0) - (a.marketCapChange24h ?? 0))

  if (ranked.length < 4) return null

  const leaders = ranked.slice(0, 3)
  const laggards = ranked.slice(-3).reverse()

  return (
    <section className="space-y-2" aria-labelledby="secteurs-en-vue">
      <h2 id="secteurs-en-vue" className="sr-only">
        Secteurs en vue
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <HighlightGroup title="Secteurs en tête" tone="up" categories={leaders} />
        <HighlightGroup title="Secteurs en repli" tone="down" categories={laggards} />
      </div>

      <p className="text-[0.6875rem] text-ink-muted">
        Classement établi sur les {categories.length} secteurs publiés par la source, et
        non sur l’ensemble du marché.
      </p>
    </section>
  )
}

function HighlightGroup({
  title,
  tone,
  categories,
}: {
  title: string
  tone: 'up' | 'down'
  categories: MarketCategory[]
}) {
  const Icon = tone === 'up' ? ArrowUpRight : ArrowDownRight

  return (
    <div className="rounded-card border border-border-subtle bg-surface p-4">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
        <Icon
          className={`h-3.5 w-3.5 ${tone === 'up' ? 'text-up' : 'text-down'}`}
          aria-hidden="true"
        />
        {title}
      </h3>

      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-ink">{category.name}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="tabular text-xs text-ink-muted">
                {formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
              </span>
              <ChangeBadge value={category.marketCapChange24h} size="sm" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
