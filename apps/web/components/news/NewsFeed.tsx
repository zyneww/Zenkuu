'use client'

import { ArrowUpRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { NEWS_CATEGORY_LABELS, type NewsItem } from '@zenith/data'
import { EmptyState } from '@zenith/ui'

/**
 * Fil d'actualités en cartes, filtrable par rubrique.
 *
 * Reprise structurelle d'un hub d'actualités : un article mis en avant, des filtres
 * de rubrique, puis une grille de cartes homogènes — plutôt qu'une liste plate où
 * tous les articles ont exactement le même poids visuel.
 *
 * Écarts assumés :
 *  • aucune image d'illustration. Les vignettes des flux RSS appartiennent aux
 *    éditeurs et leur syndication n'emporte pas de droit de réutilisation. Les
 *    cartes reposent donc sur la typographie, pas sur des visuels tiers ;
 *  • aucun texte intégral. Titre, extrait fourni par le flux, source et date, avec
 *    lien sortant vers l'article d'origine. La syndication autorise l'annonce, pas
 *    la reprise.
 */
export function NewsFeed({ articles }: { articles: NewsItem[] }) {
  const [category, setCategory] = useState<string>('all')

  // Seules les rubriques réellement présentes dans le lot sont proposées : un filtre
  // qui ne renverrait jamais rien vaut moins qu'un filtre absent.
  const categories = useMemo(() => {
    const present = new Set(
      articles.map((article) => article.category).filter((value): value is string => Boolean(value)),
    )
    return [...present]
  }, [articles])

  const visible = useMemo(
    () => (category === 'all' ? articles : articles.filter((a) => a.category === category)),
    [articles, category],
  )

  const [featured, ...rest] = visible

  return (
    <div className="space-y-5">
      {categories.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Rubriques">
          <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="Tout" />
          {categories.map((entry) => (
            <FilterChip
              key={entry}
              active={category === entry}
              onClick={() => setCategory(entry)}
              label={NEWS_CATEGORY_LABELS[entry as keyof typeof NEWS_CATEGORY_LABELS] ?? entry}
            />
          ))}
        </div>
      ) : null}

      {!featured ? (
        <EmptyState
          title="Aucun article dans cette rubrique"
          description="Les flux n’ont rien publié récemment sur ce thème."
          compact
        />
      ) : (
        <>
          <FeaturedArticle article={featured} />

          {rest.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  )
}

function FeaturedArticle({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-card border border-border-subtle bg-surface p-5 transition-colors hover:border-brand"
    >
      <ArticleMeta article={article} />
      <h2 className="mt-2 text-lg font-semibold leading-snug text-ink group-hover:text-brand-strong">
        {article.title}
      </h2>
      {article.excerpt ? (
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-muted">{article.excerpt}</p>
      ) : null}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-strong">
        Lire chez {article.source}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </a>
  )
}

function ArticleCard({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-brand"
    >
      <ArticleMeta article={article} />
      <h3 className="mt-1.5 text-sm font-medium leading-snug text-ink group-hover:text-brand-strong">
        {article.title}
      </h3>
      {article.excerpt ? (
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-muted">
          {article.excerpt}
        </p>
      ) : null}
    </a>
  )
}

function ArticleMeta({ article }: { article: NewsItem }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-ink-muted">
      {article.category ? (
        <span className="rounded-card bg-brand-soft px-1.5 py-0.5 font-medium text-brand-strong">
          {NEWS_CATEGORY_LABELS[article.category as keyof typeof NEWS_CATEGORY_LABELS] ??
            article.category}
        </span>
      ) : null}
      <span>{article.source}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
    </p>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FilterChip({
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
      className={`rounded-card px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-brand-soft text-brand-strong'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
