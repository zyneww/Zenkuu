import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/ButtonLink'

import { EmptyState } from '@zenkuu/ui'

import { BlogBrowser } from '@/components/blog/BlogBrowser'
import { CoverArt } from '@/components/editorial/CoverArt'
import {
  ARTICLES,
  BLOG_CATEGORIES,
  categoryLabel,
  featuredArticle,
  formatArticleDate,
  readingMinutes,
  sortedArticles,
} from '@/content/blog'
import { getContent, getPhrase, getSeo } from '@/lib/content'

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
  const seo = await getSeo()
  return {
    title: fr.pages.blog,
    description: seo(
      '/blog',
      'Le blog de ZENKUU — méthode, produit, marché et coulisses. Comment les chiffres sont collectés, vérifiés et affichés.',
    ),
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
 * ── LA DISPOSITION PASSE DE KRAKEN À TRADINGVIEW ──────────────────────────────
 *
 * Elle suivait le blog de Kraken : deux colonnes, l'article à la une sur les deux
 * tiers gauches, un encart de rubriques sur le tiers droit, la grille en dessous.
 * L'argument tenait — un article à la une en pleine largeur pousse le reste sous la
 * ligne de flottaison — et il est remplacé par un autre, relevé sur la référence
 * demandée.
 *
 * TROIS DIFFÉRENCES, dans l'ordre où elles se voient :
 *
 * 1. LES RUBRIQUES REMONTENT EN BARRE DE NAVIGATION, au-dessus du titre. Elles
 *    occupaient une colonne entière avec leur description ; elles tiennent en une
 *    ligne. Ce que perd la description est repris en infobulle, et ce que gagne la
 *    page est une colonne complète rendue au contenu.
 *
 * 2. L'EN-TÊTE EST CENTRÉ, sur une mesure étroite. C'est le seul endroit du site où
 *    le texte est centré, et c'est assumé : un index de blog n'a pas de colonne de
 *    données à aligner, et le centrage y sépare nettement l'accueil du flux.
 *
 * 3. L'ARTICLE À LA UNE PREND TOUTE LA LARGEUR, image à gauche et titre à droite.
 *    L'objection d'origine — il repousse le reste — ne tient plus avec cette forme :
 *    la mise en côte à côte le fait tenir dans la hauteur d'une image, là où la
 *    version empilée en occupait deux.
 *
 * ── CE QUI N'EST PAS REPRIS ───────────────────────────────────────────────────
 *
 * Leur grille de vignettes 16/9 uniformes, sans chapô. Elle est très dense et suppose
 * une illustration par article — ce que nous n'avons pas, `CoverArt` dérivant un
 * visuel du contenu. Nos cartes gardent donc leur chapô, qui porte l'information que
 * leur image ne peut pas porter.
 *
 * ÉTAT VIDE ASSUMÉ. `ARTICLES` est vide (§5 : pas de faux billets). Le système
 * complet est en place et se peuplera de lui-même à la première entrée ; en
 * attendant, la page le dit franchement plutôt que d'afficher une grille de cartes
 * fantômes.
 */
export default async function BlogPage() {
  const t = await getPhrase()
  const featured = featuredArticle()
  const rest = sortedArticles().filter((article) => article.slug !== featured?.slug)

  return (
    <div className="space-y-10 py-6">
      {/* ── Barre de rubriques ─────────────────────────────────────────────
          De vrais liens vers `/blog?rubrique=`… serait le prolongement naturel, et
          ce n'est pas ce qui est fait : le filtrage vit dans `BlogBrowser`, côté
          client, parce qu'un blog se compte en dizaines d'articles tous déjà présents
          dans le HTML. Ces entrées ANCRENT donc vers la grille, où les mêmes rubriques
          sont cliquables. Deux mécanismes pour un même filtre seraient pires. */}
      {hasArticles ? (
        <nav
          aria-label={t('Rubriques du blog')}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-border-subtle pb-4"
        >
          {BLOG_CATEGORIES.map((entry) => (
            <a
              key={entry.id}
              href="#flux"
              title={entry.description}
              className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {entry.label}
            </a>
          ))}
        </nav>
      ) : null}

      {/* ── En-tête centré ─────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-2xl space-y-4 text-center">
        <h1 className="display-xl text-ink">{t("Blog")}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t("Comment les chiffres affichés sur ZENKUU sont collectés, vérifiés et présentés — et ce qu’ils ne disent pas.")}</p>
      </header>

      {featured ? (
        /* ── L'article à la une, pleine largeur ──────────────────────────────
           Image à gauche sur `lg`, titre et chapô à droite. En dessous, ils
           s'empilent, l'image d'abord : sur 375 pixels, une couverture réduite au
           tiers de la largeur ne montre plus rien. */
        <article className="grid gap-6 border-b border-border-subtle pb-10 lg:grid-cols-2 lg:items-center">
          <Link
            href={`/blog/${featured.slug}`}
            className="block overflow-hidden rounded-card"
          >
            <CoverArt
              seed={featured.slug}
              label={categoryLabel(featured.category)}
              ratio="16/9"
            />
          </Link>

          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-wide text-ink">
              {categoryLabel(featured.category)}
            </span>

            {/* `display-md` et non `display-lg` : sur la moitié de 1632 pixels, un
                titre de 48 pixels tient en deux lignes pour un titre court et en
                quatre pour un titre long, ce qui déséquilibre la colonne face à
                l'image. */}
            <h2 className="display-md text-ink">
              <Link
                href={`/blog/${featured.slug}`}
                className="transition-colors hover:text-brand"
              >
                {featured.title}
              </Link>
            </h2>

            <p className="text-base leading-relaxed text-ink-muted">{featured.summary}</p>

            <p className="text-xs text-ink-muted">
              {featured.author}
              <span className="px-1.5" aria-hidden="true">
                ·
              </span>
              <time dateTime={featured.publishedAt}>
                {formatArticleDate(featured.publishedAt)}
              </time>
              <span className="px-1.5" aria-hidden="true">
                ·
              </span>
              {readingMinutes(featured)} min de lecture
            </p>
          </div>
        </article>
      ) : (
        <EmptyState
          title={t('Aucun article publié pour l’instant')}
          description={t('Plutôt que de remplir cette page de billets de circonstance, elle reste vide jusqu’au premier vrai article. Les contenus explicatifs du site sont, eux, bien réels.')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/apprendre">{t('Fiches Apprendre')}</ButtonLink>
              {/* Le second est `secondary` : deux boutons pleins côte à côte ne disent
                  plus lequel est l'action principale. C'est la paire de shadcn/ui, et
                  elle remplace ici un filet écrit à la main. */}
              <ButtonLink variant="outline" href="/a-propos">
                {t('À propos de ZENKUU')}
              </ButtonLink>
            </div>
          }
        />
      )}

      {/* L'état vide est déjà porté au-dessus : le répéter ici afficherait deux fois
          le même message sur la même page. */}
      {hasArticles ? (
        <div id="flux" className="scroll-mt-24">
          <BlogBrowser articles={rest} />
        </div>
      ) : (
        /* Sans article, les rubriques n'ont pas de barre de navigation où vivre —
           elles restent pourtant la meilleure réponse à « de quoi ce blog parlera ».
           Elles descendent donc ici, en ligne, sous l'état vide. */
        <section className="mx-auto max-w-3xl space-y-3 border-t border-border-subtle pt-8 text-center">
          <h2 className="text-base font-semibold text-ink">{t('Ce qu’on y trouvera')}</h2>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {BLOG_CATEGORIES.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="font-medium text-ink">{entry.label}</span>
                <span className="text-ink-muted"> — {entry.description}</span>
              </li>
            ))}
          </ul>

          <p className="pt-2 text-xs leading-relaxed text-ink-muted">
            Le blog paraît sans périodicité fixe : un article quand il y a quelque chose
            à dire, jamais pour tenir un calendrier.{' '}
            <Link
              href="/blog/rss.xml"
              className="underline underline-offset-2 hover:text-brand"
            >
              {t('Fil RSS')}
            </Link>
            .
          </p>
        </section>
      )}

    </div>
  )
}
