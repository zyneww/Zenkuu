import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { HELP_CATEGORIES } from '@/content/aide'

/**
 * Page d'une rubrique d'aide.
 *
 * Palier intermédiaire entre l'index et l'article, comme dans un centre de support :
 * rubrique → article. Sans lui, la grille de tuiles de l'index n'aurait nulle part
 * où mener, et tous les articles resteraient sous une seule URL de listing.
 */
export function generateStaticParams() {
  return HELP_CATEGORIES.map((category) => ({ id: category.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const category = HELP_CATEGORIES.find((entry) => entry.id === id)
  if (!category) return {}

  return {
    title: category.title,
    description: category.description,
    alternates: { canonical: `/aide/rubrique/${category.id}` },
  }
}

export default async function RubriquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const category = HELP_CATEGORIES.find((entry) => entry.id === id)

  if (!category) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Centre d’aide', path: '/aide' },
          { name: category.title, path: `/aide/rubrique/${category.id}` },
        ]}
      />

      <nav aria-label="Fil d’Ariane" className="text-xs text-ink-muted">
        <Link href="/aide" className="hover:text-brand">
          Centre d’aide
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{category.title}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="display-xl text-ink">{category.title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{category.description}</p>
      </header>

      <ul className="space-y-2">
        {category.articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/aide/${article.slug}`}
              className="block rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-brand"
            >
              <span className="block text-sm font-medium text-ink">{article.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                {article.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/aide" className="inline-block text-sm text-ink hover:underline">
        ← Toutes les rubriques
      </Link>
    </div>
  )
}
