'use client'

import Link from 'next/link'
import { BookOpen, Database, Scale, Search, User, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { HELP_ARTICLES, HELP_CATEGORIES, type HelpCategory } from '@/content/aide'

/**
 * Recherche et arborescence du Centre d'aide.
 *
 * Refonte : la vue de repos était une liste plate de tous les articles, toutes
 * catégories confondues. Elle présente désormais une GRILLE DE TUILES par catégorie,
 * chacune menant à sa propre page — l'organisation d'un centre de support, où l'on
 * choisit d'abord un domaine avant de descendre à l'article.
 *
 * La recherche reste un filtrage LOCAL : le corpus tient dans quelques kilo-octets
 * déjà présents dans le bundle. Une route d'API ferait un aller-retour serveur pour
 * filtrer un tableau que le navigateur a sous la main. La recherche universelle de
 * l'en-tête, elle, interroge bien le serveur — mais elle porte sur des milliers
 * d'actifs, pas sur une douzaine d'articles.
 */

const ICONS: Record<HelpCategory['icon'], LucideIcon> = {
  database: Database,
  'book-open': BookOpen,
  user: User,
  scale: Scale,
}

export function HelpSearch() {
  const [query, setQuery] = useState('')

  const normalized = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (normalized.length < 2) return null

    return HELP_ARTICLES.filter((article) =>
      // Le corps est inclus dans la recherche : on cherche souvent une aide par un
      // mot qui figure dans la réponse, pas dans son titre (« BCE », « 429 »…).
      [article.title, article.summary, article.categoryTitle, ...article.body]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
  }, [normalized])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Décrivez votre question en quelques mots…"
          aria-label="Rechercher dans le centre d’aide"
          className="w-full rounded-card border border-border-subtle bg-surface py-3.5 pl-11 pr-4 text-base text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
        />
      </div>

      {results ? (
        <section aria-live="polite" className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">
            {results.length === 0
              ? 'Aucun article ne correspond'
              : `${results.length} article${results.length > 1 ? 's' : ''} trouvé${
                  results.length > 1 ? 's' : ''
                }`}
          </h2>

          {results.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-muted">
              Reformulez avec un autre terme, ou parcourez les rubriques ci-dessous.
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/aide/${article.slug}`}
                    className="block rounded-card border border-border-subtle bg-surface p-3 transition-colors hover:border-brand"
                  >
                    <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-muted">
                      {article.categoryTitle}
                    </span>
                    <span className="block text-sm font-medium text-ink">{article.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                      {article.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="space-y-3" aria-labelledby="rubriques">
          <h2 id="rubriques" className="text-sm font-semibold text-ink">
            Parcourir par rubrique
          </h2>

          <ul className="grid gap-3 sm:grid-cols-2">
            {HELP_CATEGORIES.map((category) => {
              const Icon = ICONS[category.icon]
              return (
                <li key={category.id}>
                  <Link
                    href={`/aide/rubrique/${category.id}`}
                    className="flex h-full gap-3 rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-brand"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-brand-soft"
                      aria-hidden="true"
                    >
                      <Icon className="h-4.5 w-4.5 text-brand-strong" />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-ink">{category.title}</span>
                      <span className="block text-xs leading-relaxed text-ink-muted">
                        {category.description}
                      </span>
                      <span className="block text-[0.6875rem] text-ink-muted">
                        {category.articles.length} article
                        {category.articles.length > 1 ? 's' : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
