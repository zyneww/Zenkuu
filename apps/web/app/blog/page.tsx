import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@zenith/ui'

import { ArticleMeta } from '@/components/blog/BlogCard'
import { BlogBrowser } from '@/components/blog/BlogBrowser'
import { NewsletterSignup } from '@/components/blog/NewsletterSignup'
import { ARTICLES, featuredArticle, sortedArticles } from '@/content/blog'
import { fr } from '@/content/fr'

const hasArticles = ARTICLES.length > 0

export const metadata: Metadata = {
  title: fr.pages.blog,
  description:
    'Le blog de ZENITH — méthode, produit, marché et coulisses. Comment les chiffres sont collectés, vérifiés et affichés.',
  alternates: {
    canonical: '/blog',
    types: { 'application/rss+xml': '/blog/rss.xml' },
  },
  // Une page sans article n'apporte rien à un index de recherche, et une page vide
  // indexée nuit à la perception de qualité du domaine entier. La condition rouvre
  // l'indexation d'elle-même à la première publication — sans qu'on ait à y penser.
  ...(hasArticles ? {} : { robots: { index: false, follow: true } }),
}

/**
 * Index du blog.
 *
 * DISPOSITION VOLONTAIREMENT DIFFÉRENTE de la référence du secteur, qui empile une
 * sous-barre collante, un héro, puis un carrousel « Featured » à flèches. Ici :
 * un article à la une en pleine largeur, des filtres intégrés au flux, une grille à
 * deux colonnes, et les archives en liste compacte au-delà de six articles.
 *
 * Le carrousel est écarté pour une raison de lecture et non de style : il cache
 * derrière des flèches des articles qu'une grille montre d'un coup, et sur un blog
 * peu fourni il donne l'illusion d'un volume qui n'existe pas.
 *
 * ÉTAT VIDE ASSUMÉ. `ARTICLES` est vide (§5 : pas de faux billets). Le système
 * complet est en place et se peuplera de lui-même à la première entrée ; en
 * attendant, la page le dit franchement plutôt que d'afficher une grille de cartes
 * fantômes.
 */
export default function BlogPage() {
  const featured = featuredArticle()
  const rest = sortedArticles().filter((article) => article.slug !== featured?.slug)

  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6">
      <header className="space-y-4">
        <h1 className="display-xl text-ink">Blog</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
          Comment les chiffres affichés sur ZENITH sont collectés, vérifiés et
          présentés — et ce qu’ils ne disent pas.
        </p>
      </header>

      {featured ? (
        <article className="space-y-3 border-b border-border-subtle pb-10">
          <ArticleMeta article={featured} />
          <h2 className="display-md text-ink">
            <Link
              href={`/blog/${featured.slug}`}
              className="transition-colors hover:text-brand-strong"
            >
              {featured.title}
            </Link>
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-ink-muted">{featured.summary}</p>
          <Link
            href={`/blog/${featured.slug}`}
            className="inline-block text-sm font-medium text-brand hover:underline"
          >
            Lire l’article
          </Link>
        </article>
      ) : null}

      {hasArticles ? (
        <BlogBrowser articles={rest} />
      ) : (
        <EmptyState
          title="Aucun article publié pour l’instant"
          description="Plutôt que de remplir cette page de billets de circonstance, elle reste vide jusqu’au premier vrai article. Les contenus explicatifs du site sont, eux, bien réels."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/apprendre"
                className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
              >
                Fiches Apprendre
              </Link>
              <Link
                href="/methodologie"
                className="rounded-card border border-border-subtle px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand"
              >
                Méthodologie &amp; sources
              </Link>
            </div>
          }
        />
      )}

      <NewsletterSignup />
    </div>
  )
}
