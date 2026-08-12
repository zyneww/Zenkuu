import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { EmptyState } from '@zenkuu/ui'

import { ArticleMeta } from '@/components/blog/BlogCard'
import { BlogBrowser } from '@/components/blog/BlogBrowser'
import { NewsletterSignup } from '@/components/blog/NewsletterSignup'
import { CoverArt } from '@/components/editorial/CoverArt'
import {
  ARTICLES,
  BLOG_CATEGORIES,
  categoryLabel,
  featuredArticle,
  sortedArticles,
} from '@/content/blog'
import { getContent } from '@/lib/content'

const hasArticles = ARTICLES.length > 0

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  title: fr.pages.blog,
  description:
    'Le blog de ZENKUU — méthode, produit, marché et coulisses. Comment les chiffres sont collectés, vérifiés et affichés.',
  alternates: {
    canonical: '/blog',
    types: { 'application/rss+xml': '/blog/rss.xml' },
  },
  // Une page sans article n'apporte rien à un index de recherche, et une page vide
  // indexée nuit à la perception de qualité du domaine entier. La condition rouvre
  // l'indexation d'elle-même à la première publication — sans qu'on ait à y penser.
  ...(hasArticles ? {} : { robots: { index: false, follow: true } }),
  }
}

/**
 * Index du blog.
 *
 * ── LA DISPOSITION DE LA RÉFÉRENCE, MOINS SON CARROUSEL ──────────────────────
 *
 * Le blog Kraken ouvre sur DEUX COLONNES : l'article à la une occupe les deux tiers
 * gauches, un encart thématique le tiers droit ; la grille des articles suit en
 * dessous, séparée par des filets. C'est cette structure qui est reprise ici, parce
 * qu'elle règle un vrai problème : un article à la une en pleine largeur pousse tout
 * le reste sous la ligne de flottaison, et le lecteur qui n'est pas intéressé par
 * celui-là doit défiler avant de voir qu'il y en a d'autres.
 *
 * L'encart latéral porte chez eux les nouvelles cotations ; il porte ici les
 * RUBRIQUES, avec leur description. C'est l'équivalent fonctionnel — dire d'un coup
 * d'œil de quoi ce blog parle — avec ce que nous avons réellement.
 *
 * Le carrousel « Featured », lui, reste écarté, pour une raison de lecture et non de
 * style : il cache derrière des flèches des articles qu'une grille montre d'un coup,
 * et sur un blog peu fourni il donne l'illusion d'un volume qui n'existe pas.
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
    <div className="space-y-12 py-6">
      <header className="space-y-4">
        <h1 className="display-xl text-ink">Blog</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
          Comment les chiffres affichés sur ZENKUU sont collectés, vérifiés et
          présentés — et ce qu’ils ne disent pas.
        </p>
      </header>

      <div className="grid gap-8 border-b border-border-subtle pb-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {featured ? (
          <article className="space-y-4">
            <Link href={`/blog/${featured.slug}`} className="block overflow-hidden rounded-card">
              <CoverArt
                seed={featured.slug}
                label={categoryLabel(featured.category)}
                ratio="16/9"
              />
            </Link>

            <div className="space-y-2.5">
              <span className="text-xs font-medium text-brand">
                {categoryLabel(featured.category)}
              </span>
              <h2 className="display-md text-ink">
                <Link
                  href={`/blog/${featured.slug}`}
                  className="transition-colors hover:text-brand-strong"
                >
                  {featured.title}
                </Link>
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
                {featured.summary}
              </p>
              <ArticleMeta article={featured} />
            </div>
          </article>
        ) : (
          /* Sans article à la une, la colonne de gauche porte l'état vide plutôt que
             de laisser un trou béant à côté d'un encart bien rempli. */
          <EmptyState
            title="Aucun article publié pour l’instant"
            description="Plutôt que de remplir cette page de billets de circonstance, elle reste vide jusqu’au premier vrai article. Les contenus explicatifs du site sont, eux, bien réels."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/apprendre"
                  className="rounded-control bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
                >
                  Fiches Apprendre
                </Link>
                <Link
                  href="/methodologie"
                  className="rounded-control border border-border-subtle px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand"
                >
                  Méthodologie &amp; sources
                </Link>
              </div>
            }
          />
        )}

        {/* Encart latéral — les rubriques et ce qu'elles couvrent. À la place des
            nouvelles cotations de la référence : même rôle, dire de quoi il est
            question ici, avec ce que nous avons vraiment. */}
        <aside className="space-y-4 lg:border-l lg:border-border-subtle lg:pl-8">
          <h2 className="text-base font-semibold text-ink">Ce qu’on y trouve</h2>
          <ul className="space-y-3.5">
            {BLOG_CATEGORIES.map((entry) => (
              <li key={entry.id} className="space-y-0.5">
                <p className="text-sm font-medium text-brand-strong">{entry.label}</p>
                <p className="text-xs leading-relaxed text-ink-muted">{entry.description}</p>
              </li>
            ))}
          </ul>

          <p className="border-t border-border-subtle pt-3.5 text-xs leading-relaxed text-ink-muted">
            Le blog paraît sans périodicité fixe : un article quand il y a quelque
            chose à dire, jamais pour tenir un calendrier.{' '}
            <Link
              href="/blog/rss.xml"
              className="underline underline-offset-2 hover:text-brand-strong"
            >
              Fil RSS
            </Link>
            .
          </p>
        </aside>
      </div>

      {/* L'état vide est déjà porté par la colonne de gauche ci-dessus : le répéter
          ici afficherait deux fois le même message sur la même page. */}
      {hasArticles ? <BlogBrowser articles={rest} /> : null}

      <NewsletterSignup />
    </div>
  )
}
