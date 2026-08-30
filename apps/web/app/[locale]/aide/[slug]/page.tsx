import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { HELP_ARTICLES, findHelpArticle } from '@/content/aide'

/**
 * Une page par article : c'est ce qui rend l'aide indexable.
 *
 * Un accordéon aurait été plus simple, mais tout le contenu vivrait alors sous une
 * seule URL — un moteur de recherche ne pourrait renvoyer un visiteur vers la
 * réponse précise à sa question. Or le SEO organique est le principal moteur
 * d'acquisition du projet (§9).
 */
export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = findHelpArticle(slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/aide/${article.slug}` },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = findHelpArticle(slug)

  if (!article) notFound()

  return (
    <article className="mx-auto max-w-2xl space-y-6 py-6">
      <ArticleJsonLd
        title={article.title}
        description={article.summary}
        path={`/aide/${article.slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Centre d’aide', path: '/aide' },
          { name: article.title, path: `/aide/${article.slug}` },
        ]}
      />

      <nav aria-label="Fil d’Ariane" className="text-xs text-ink-muted">
        <Link href="/aide" className="hover:text-brand">
          Centre d’aide
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{article.categoryTitle}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{article.title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{article.summary}</p>
      </header>

      <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
        {article.body.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <footer className="border-t border-border-subtle pt-4">
        <Link href="/aide" className="text-sm text-ink hover:underline">
          ← Retour au centre d’aide
        </Link>
      </footer>
    </article>
  )
}
