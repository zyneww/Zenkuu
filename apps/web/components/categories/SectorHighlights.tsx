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
 *
 * Les deux listes sont filtrées PAR SIGNE et pas seulement découpées aux extrémités.
 * Un simple `slice(0,3)` / `slice(-3)` fait se rejoindre les deux listes les jours où
 * le marché va dans un seul sens : « Secteurs en repli » affichait alors les trois
 * secteurs qui montaient le MOINS, présentés comme des baisses. Le groupe disparaît
 * plutôt que de mentir quand aucun secteur ne recule.
 */
export function SectorHighlights({ categories }: { categories: MarketCategory[] }) {
  const ranked = categories
    .filter((category) => category.marketCapChange24h !== undefined)
    .sort((a, b) => (b.marketCapChange24h ?? 0) - (a.marketCapChange24h ?? 0))

  if (ranked.length < 4) return null

  const leaders = ranked.filter((category) => (category.marketCapChange24h ?? 0) > 0).slice(0, 3)
  const laggards = ranked
    .filter((category) => (category.marketCapChange24h ?? 0) < 0)
    .slice(-3)
    .reverse()

  if (leaders.length === 0 && laggards.length === 0) return null

  return (
    // Le titre était en `sr-only` tant que la page empilait des blocs serrés.
    // Dans un rythme de bandes espacées, une bande sans titre visible flotte :
    // le lecteur ne sait plus si elle prolonge la précédente ou en ouvre une autre.
    <section className="space-y-5" aria-labelledby="secteurs-en-vue">
      <h2 id="secteurs-en-vue" className="display-md text-ink">
        Secteurs en vue
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {leaders.length > 0 ? (
          <HighlightGroup title="Secteurs en tête" tone="up" categories={leaders} />
        ) : null}
        {laggards.length > 0 ? (
          <HighlightGroup title="Secteurs en repli" tone="down" categories={laggards} />
        ) : null}
      </div>

      {/* « retenus pour le classement » et non « publiés par la source » : le nombre
          affiché est celui des secteurs qui dépassent le plancher de capitalisation,
          pas celui que publie la source. Écrire l'un pour l'autre serait faux. */}
      <p className="text-xs text-ink-muted">
        Classement établi sur les {categories.length} secteurs retenus pour le classement —
        ceux qui pèsent au moins 10 M$ — et non sur l’ensemble du marché.
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
    <div className="rounded-card border border-border-subtle bg-surface p-5">
      <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Icon
          className={`h-4 w-4 ${tone === 'up' ? 'text-up' : 'text-down'}`}
          aria-hidden="true"
        />
        {title}
      </h3>

      <ul className="space-y-3">
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
