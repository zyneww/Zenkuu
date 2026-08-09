import Link from 'next/link'

import {
  categoryLabel,
  formatArticleDate,
  readingMinutes,
  type Article,
} from '@/content/blog'

/**
 * Carte d'article.
 *
 * SANS VIGNETTE, contrairement à la référence dont chaque carte porte une image de
 * couverture. ZENITH n'a pas de banque d'illustrations et n'en produira pas : une
 * image générique posée sur chaque billet est du remplissage visuel, et un cadre
 * gris « image à venir » est pire. Le titre et le chapô portent seuls l'accroche,
 * ce qui donne au passage une grille plus dense et plus rapide à parcourir.
 *
 * La ligne de crédits est un `<p>` et non une liste : « Équipe ZENITH · 10 août 2026
 * · 6 min » se lit d'un trait, et trois éléments de liste imposeraient au lecteur
 * d'écran d'annoncer une liste de trois éléments avant de les énoncer.
 */
export function BlogCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  return (
    <article
      className={
        compact
          ? 'border-b border-border-subtle pb-4 last:border-0'
          : 'flex h-full flex-col gap-2 rounded-card border border-border-subtle bg-surface p-5 transition-colors hover:border-brand'
      }
    >
      <ArticleMeta article={article} />

      <h3 className={compact ? 'text-base font-semibold text-ink' : 'text-lg font-semibold leading-snug text-ink'}>
        {/* Le lien porte sur le titre seul plutôt que sur la carte entière : une
            carte cliquable empêche de sélectionner le chapô à la souris. */}
        <Link href={`/blog/${article.slug}`} className="transition-colors hover:text-brand-strong">
          {article.title}
        </Link>
      </h3>

      {!compact ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{article.summary}</p>
      ) : null}
    </article>
  )
}

export function ArticleMeta({ article }: { article: Article }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
      <span className="font-medium text-brand-strong">{categoryLabel(article.category)}</span>
      <span aria-hidden="true">·</span>
      <span>{article.author}</span>
      <span aria-hidden="true">·</span>
      {/* `<time>` avec `dateTime` : la date lisible est en français, la machine lit
          la forme ISO. Sans cet attribut, un agrégateur devrait analyser « 10 août ». */}
      <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{readingMinutes(article)} min de lecture</span>
    </p>
  )
}
