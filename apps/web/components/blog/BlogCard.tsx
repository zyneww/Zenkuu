import { Link } from '@/i18n/navigation'

import { CoverArt } from '@/components/editorial/CoverArt'
import {
  categoryLabel,
  formatArticleDate,
  readingMinutes,
  type Article,
} from '@/content/blog'

/**
 * Carte d'article.
 *
 * ── AVEC COUVERTURE, ET SANS CADRE ────────────────────────────────────────────
 *
 * Elle en était dépourvue, faute d'illustrations à publier. `CoverArt` lève
 * l'obstacle en dérivant un visuel du contenu lui-même : la grille retrouve le
 * repère visuel qui permet de reconnaître un article déjà vu sans relire son titre,
 * sans qu'aucun fichier n'ait à être produit ni chargé.
 *
 * Le CADRE, lui, a disparu. La couverture délimite déjà le bloc ; l'entourer d'un
 * filet traçait deux contours l'un dans l'autre. C'est la disposition de la
 * référence, et c'est aussi la règle de surface unique du design system — une carte
 * se distingue par sa structure, jamais en se soulevant.
 *
 * La ligne de crédits est un `<p>` et non une liste : « Équipe ZENKUU · 10 août 2026
 * · 6 min » se lit d'un trait, et trois éléments de liste imposeraient au lecteur
 * d'écran d'annoncer une liste de trois éléments avant de les énoncer.
 */
export function BlogCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  if (compact) {
    return (
      <article className="border-b border-border-subtle pb-4 last:border-0">
        <ArticleMeta article={article} />
        <h3 className="mt-1 text-base font-semibold text-ink">
          <Link href={`/blog/${article.slug}`} className="transition-colors hover:text-brand-strong">
            {article.title}
          </Link>
        </h3>
      </article>
    )
  }

  return (
    <article className="group flex h-full flex-col gap-3">
      <Link href={`/blog/${article.slug}`} className="block overflow-hidden rounded-card">
        <CoverArt seed={article.slug} label={categoryLabel(article.category)} />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5">
        {/* L'exergue de rubrique reprend la couleur de marque, comme chez la
            référence : c'est le premier mot qu'on lit d'une carte, et il situe le
            sujet avant même le titre. */}
        <span className="text-xs font-medium text-brand">{categoryLabel(article.category)}</span>

        <h3 className="text-lg font-semibold leading-snug text-ink">
          {/* Le lien porte sur le titre seul plutôt que sur la carte entière : une
              carte cliquable empêche de sélectionner le chapô à la souris. */}
          <Link href={`/blog/${article.slug}`} className="transition-colors hover:text-brand-strong">
            {article.title}
          </Link>
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{article.summary}</p>

        {/* Durée et date REJETÉES EN PIED, en retrait : ce sont des informations de
            décision (« ai-je le temps ? »), consultées après le titre et jamais
            avant. Les mettre en tête, comme le faisait la version précédente, les
            plaçait sur le chemin de lecture du sujet. */}
        <p className="mt-auto pt-1 text-xs text-ink-muted">
          {readingMinutes(article)} min de lecture
          <span className="px-1.5" aria-hidden="true">
            ·
          </span>
          <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
        </p>
      </div>
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
