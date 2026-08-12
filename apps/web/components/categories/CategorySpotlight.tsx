import { Link } from '@/i18n/navigation'

import type { MarketCategory } from '@zenkuu/data'
import { ChangeBadge, formatCurrency } from '@zenkuu/ui'

import { TopAssets } from '@/components/categories/CategoryExplorer'

/**
 * Quatre secteurs mis en avant, en tête de page.
 *
 * SANS COURBE, contrairement à la référence dont chaque carte porte un graphique
 * 30 jours. La source ne publie aucun historique par catégorie : le tracer
 * supposerait de l'inventer, et une courbe est précisément le genre de donnée qu'un
 * lecteur croit sur parole (§5). La carte affiche donc ce qui est réellement sourcé —
 * capitalisation, variation, volume et actifs représentatifs.
 *
 * Le critère de sélection est explicite dans le titre passé par la page : « plus
 * fortes hausses » n'est pas « les plus importants ». Sans cette précision, quatre
 * cartes en tête de page passent pour un palmarès dont on ignore la règle.
 */
export function CategorySpotlight({
  title,
  hint,
  categories,
}: {
  title: string
  hint: string
  categories: MarketCategory[]
}) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="spotlight-titre" className="space-y-3">
      <div className="space-y-1">
        <h2 id="spotlight-titre" className="display-md text-ink">
          {title}
        </h2>
        <p className="text-sm text-ink-muted">{hint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <article
            key={category.id}
            className="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug">
                {/* Lien sur le NOM seul : la carte contient déjà les logos des actifs
                    représentatifs, eux-mêmes cliquables vers leurs fiches. */}
                <Link
                  href={`/categories/${category.id}`}
                  className="text-ink transition-colors hover:text-brand-strong hover:underline"
                >
                  {category.name}
                </Link>
              </h3>
              <ChangeBadge value={category.marketCapChange24h} size="sm" />
            </div>

            <p className="tabular text-xl font-semibold text-ink">
              {formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
            </p>

            <dl className="space-y-1 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-ink-muted">Volume 24 h</dt>
                <dd className="tabular text-ink-muted">
                  {formatCurrency(category.volume24h, 'USD', { compact: true }) ?? '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-auto pt-1">
              <TopAssets category={category} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
