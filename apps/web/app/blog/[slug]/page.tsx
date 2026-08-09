import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ShareButtons } from '@/components/blog/ShareButtons'
import { ArticleMeta, BlogCard } from '@/components/blog/BlogCard'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import {
  ARTICLES,
  categoryLabel,
  findArticle,
  formatArticleDate,
  readingMinutes,
  relatedArticles,
  sectionId,
} from '@/content/blog'

/**
 * Page d'un article.
 *
 * `generateStaticParams` renvoie un tableau vide tant qu'aucun article n'est publié.
 * Ce n'est pas un cas dégradé : Next.js construit alors zéro page de cette route, et
 * toute URL `/blog/<quelque-chose>` tombe sur le `notFound()` ci-dessous. C'est le
 * comportement juste — une adresse d'article qui n'existe pas doit répondre 404, et
 * non une page vide indexable.
 */
export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = findArticle(slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.summary,
    // Le flux est réémis ici : définir `alternates` sur une page remplace l'objet
    // hérité de la racine, et l'omettre ferait disparaître la découverte RSS de
    // toutes les pages d'article.
    alternates: {
      canonical: `/blog/${article.slug}`,
      types: { 'application/rss+xml': '/blog/rss.xml' },
    },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.summary,
      publishedTime: article.publishedAt,
      ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}),
      authors: [article.author],
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = findArticle(slug)

  if (!article) notFound()

  // Sommaire construit sur les seules sections TITRÉES : une section sans titre est
  // un prolongement de la précédente, et l'inscrire au sommaire y ferait apparaître
  // une entrée sans libellé.
  const toc = article.sections
    .map((section, index) => ({ section, id: sectionId(section, index) }))
    .filter((entry) => Boolean(entry.section.title))

  const related = relatedArticles(article)

  return (
    <div className="mx-auto max-w-4xl py-6">
      <ArticleJsonLd
        title={article.title}
        description={article.summary}
        path={`/blog/${article.slug}`}
        publishedAt={article.publishedAt}
        {...(article.updatedAt ? { updatedAt: article.updatedAt } : {})}
        author={article.author}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Blog', path: '/blog' },
          { name: article.title, path: `/blog/${article.slug}` },
        ]}
      />

      <nav aria-label="Fil d’Ariane" className="mb-6 text-xs text-ink-muted">
        <Link href="/blog" className="hover:text-brand-strong">
          Blog
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{categoryLabel(article.category)}</span>
      </nav>

      <header className="space-y-4 border-b border-border-subtle pb-8">
        <h1 className="display-lg text-ink">{article.title}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">{article.summary}</p>
        <ArticleMeta article={article} />
        {article.updatedAt ? (
          <p className="text-xs text-ink-muted">
            Révisé le{' '}
            <time dateTime={article.updatedAt}>{formatArticleDate(article.updatedAt)}</time>
          </p>
        ) : null}
      </header>

      {/* Corps à GAUCHE, sommaire à DROITE : l'inverse de la référence, et surtout
          l'ordre de lecture naturel — le texte commence au bord d'appel du regard,
          le sommaire n'est qu'un outil de navigation secondaire. */}
      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="space-y-8">
          {article.sections.map((section, index) => {
            const id = sectionId(section, index)

            return (
              <section key={id} id={id} className="scroll-mt-24 space-y-3">
                {section.title ? (
                  <h2 className="display-sm text-ink">{section.title}</h2>
                ) : null}
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className="max-w-2xl text-base leading-relaxed text-ink-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            )
          })}

          <footer className="space-y-4 border-t border-border-subtle pt-6">
            <ShareButtons title={article.title} path={`/blog/${article.slug}`} />
            <p className="text-xs leading-relaxed text-ink-muted">
              Cet article décrit le fonctionnement de ZENITH. Il ne constitue pas un
              conseil en investissement.
            </p>
          </footer>
        </article>

        {toc.length > 1 ? (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav aria-labelledby="sommaire-titre" className="space-y-2">
              <h2
                id="sommaire-titre"
                className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
              >
                Sommaire
              </h2>
              <ol className="space-y-1.5 border-l border-border-subtle">
                {toc.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      className="-ml-px block border-l border-transparent pl-3 text-sm leading-snug text-ink-muted transition-colors hover:border-brand hover:text-ink"
                    >
                      {entry.section.title}
                    </a>
                  </li>
                ))}
              </ol>
              <p className="pt-1 text-xs text-ink-muted">
                {readingMinutes(article)} min de lecture
              </p>
            </nav>
          </aside>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section className="mt-14 space-y-4 border-t border-border-subtle pt-10">
          <h2 className="display-sm text-ink">À lire ensuite</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((entry) => (
              <BlogCard key={entry.slug} article={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
