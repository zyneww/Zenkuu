import { getPhrase } from '@/lib/content'
import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { HELP_ARTICLES, findHelpArticle } from '@/content/aide'
import { pageAlternates } from '@/lib/site'

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

  /* Le titre d'onglet passe par la table AUSSI. Il n'y passait pas, et c'est lui qui
     restait en français dans le `<title>` des vingt-trois pages du centre d'aide une
     fois leur corps traduit — invisible dans la page, bien visible dans l'onglet, et
     c'est ce que les moteurs de recherche indexent. */
  const t = await getPhrase()

  return {
    title: t(article.title),
    description: t(article.summary),
    alternates: await pageAlternates({ pathname: '/aide/[slug]', params: { slug: article.slug } }),
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getPhrase()
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

      <nav aria-label={t('Fil d’Ariane')} className="text-xs text-ink-muted">
        <Link href="/aide" className="hover:text-brand">
          {t('Centre d’aide')}
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{t(article.categoryTitle)}</span>
      </nav>

      {/* ⚠️ LE CORPS DE L'ARTICLE PASSE PAR `t()`, ET IL NE LE FAISAIT PAS.

          `content/aide.ts` est écrit en français, comme toute la source du site : c'est
          la TABLE DE PHRASES qui porte les douze autres langues, et rien n'y arrive sans
          un `t()`. Seuls le fil d'Ariane et le lien de retour en avaient un ici. Le
          titre, le résumé, la rubrique et les paragraphes sortaient donc en français sur
          /de, /ja, /zh — sur les vingt-trois pages du centre d'aide.

          Le défaut ne se voyait dans aucun test : les chaînes SONT des clés de la table,
          traduites et vérifiées par `phrases.test.ts`. Elles n'étaient simplement jamais
          consultées. C'est le relevé au navigateur, page rendue en allemand, qui l'a
          montré — et c'est la deuxième fois que ce même angle mort remonte. */}
      <header className="space-y-3">
        <h1 className="display-xl text-ink">{t(article.title)}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{t(article.summary)}</p>
      </header>

      <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
        {article.body.map((paragraph, index) => (
          <p key={index}>{t(paragraph)}</p>
        ))}
      </div>

      <footer className="border-t border-border-subtle pt-4">
        {/*
          ⚠️ `inline-flex min-h-6` — VINGT-QUATRE PIXELS, LE PLANCHER DU WCAG 2.5.8.

          Ce lien mesurait dix-sept pixels de haut, la hauteur de sa ligne. Il est
          SEUL dans son pied de page : l'exception qui dispense un lien en ligne — sa
          taille est contrainte par l'interligne d'un texte voisin — ne s'y applique
          pas, faute de texte voisin. Les fils d'Ariane des mêmes pages, eux, en
          relèvent bien et restent tels quels.
        */}
        <Link
          href="/aide"
          className="inline-flex min-h-6 items-center text-sm text-ink hover:underline"
        >
          {t('← Retour au centre d’aide')}
        </Link>
      </footer>
    </article>
  )
}
