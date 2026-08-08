import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getCategories } from '@zenith/data'
import { ChangeBadge, EmptyState, SourceNote, formatCurrency } from '@zenith/ui'

import { fr } from '@/content/fr'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.pages.categories,
  description: fr.categories.subtitle,
}

export default async function CategoriesPage() {
  const categories = await getCategories(40)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.categories.title}</h1>
        <p className="text-sm text-ink-muted">{fr.categories.subtitle}</p>
      </header>

      {categories.ok && categories.data.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <caption className="sr-only">{fr.categories.title}</caption>
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    {fr.categories.columns.name}
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    {fr.categories.columns.change}
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    {fr.categories.columns.marketCap}
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                    {fr.categories.columns.volume}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {categories.data.map((category) => (
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

          {/* La source ne publie ces agrégats qu'en dollars : on l'écrit plutôt que
              de convertir nous-mêmes vers l'euro (§5). */}
          <SourceNote
            label={`${categories.source.label} · montants en USD`}
            href={categories.source.attributionUrl}
          />
        </>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={categories.ok ? null : categories.reason}
          source={categories.source?.label ?? null}
        />
      )}
    </div>
  )
}
