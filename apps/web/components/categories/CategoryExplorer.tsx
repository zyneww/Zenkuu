'use client'

import { LayoutGrid, List, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { MarketCategory } from '@zenith/data'
import { ChangeBadge, EmptyState, formatCurrency } from '@zenith/ui'

import { CategoryCard } from '@/components/categories/CategoryCard'

type SortKey = 'marketCap' | 'volume' | 'change' | 'name'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'marketCap', label: 'Capitalisation' },
  { key: 'volume', label: 'Volume 24 h' },
  { key: 'change', label: 'Variation 24 h' },
  { key: 'name', label: 'Nom' },
]

/**
 * Exploration des secteurs : recherche, tri et bascule grille/tableau.
 *
 * Filtrage et tri sont faits CÔTÉ CLIENT, sur la liste déjà rendue. C'est le bon
 * choix ici et pas partout : les catégories tiennent en quelques dizaines de lignes
 * déjà présentes dans le HTML. Les classements d'actifs, eux, se comptent en
 * milliers et restent triés côté serveur avec pagination.
 *
 * La bascule grille/tableau n'est pas cosmétique : la grille sert à parcourir et
 * comparer visuellement, le tableau à lire des chiffres alignés. Les deux usages
 * sont réels, et forcer l'un des deux dessert l'autre.
 */
export function CategoryExplorer({ categories }: { categories: MarketCategory[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? categories.filter((category) => category.name.toLowerCase().includes(needle))
      : categories

    // Copie avant tri : `sort` mute en place, et muter la prop réordonnerait la
    // liste du parent à chaque rendu.
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name, 'fr')
        case 'change':
          return (b.marketCapChange24h ?? -Infinity) - (a.marketCapChange24h ?? -Infinity)
        case 'volume':
          return (b.volume24h ?? 0) - (a.volume24h ?? 0)
        default:
          return (b.marketCap ?? 0) - (a.marketCap ?? 0)
      }
    })
  }, [categories, query, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer les secteurs…"
            aria-label="Filtrer les secteurs par nom"
            className="w-full rounded-card border border-border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-ink-muted">
          Trier par
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="rounded-card border border-border-subtle bg-surface px-2.5 py-2 text-xs text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          >
            {SORTS.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1" role="group" aria-label="Mode d’affichage">
          <ViewButton
            active={view === 'grid'}
            onClick={() => setView('grid')}
            label="Affichage en grille"
            icon={LayoutGrid}
          />
          <ViewButton
            active={view === 'table'}
            onClick={() => setView('table')}
            label="Affichage en tableau"
            icon={List}
          />
        </div>
      </div>

      <p className="text-xs text-ink-muted" aria-live="polite">
        {visible.length} secteur{visible.length > 1 ? 's' : ''}
        {query.trim() ? ` correspondant à « ${query.trim()} »` : ''}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="Aucun secteur ne correspond"
          description="Essayez un autre terme, ou effacez le filtre."
          compact
        />
      ) : view === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">Secteurs de marché</caption>
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                <th scope="col" className="px-3 py-2.5 font-medium">Secteur</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Variation 24 h</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Capitalisation</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                  Volume 24 h
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {visible.map((category) => (
                <tr key={category.id} className="transition-colors hover:bg-surface-muted/60">
                  <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                    {category.name}
                  </th>
                  <td className="px-3 py-2.5 text-right">
                    <ChangeBadge value={category.marketCapChange24h} size="sm" />
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-ink">
                    {formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
                  </td>
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                    {formatCurrency(category.volume24h, 'USD', { compact: true }) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: typeof LayoutGrid
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`rounded-card border p-2 transition-colors ${
        active
          ? 'border-brand bg-brand-soft text-brand-strong'
          : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
