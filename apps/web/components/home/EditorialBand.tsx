import { LESSONS } from '@/content/apprendre'
import { formatArticleDate, readingMinutes, sortedArticles } from '@/content/blog'
import { CoverArt } from '@/components/editorial/CoverArt'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/** Deux cartes par colonne, comme la bande éditoriale de la référence. */
const PER_COLUMN = 2

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BANDE ÉDITORIALE — DEUX COLONNES, AVANT LE PIED DE PAGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Reprend l'emplacement et la composition de leur bande « Research + Press », qui
 * pose deux familles de contenu écrit côte à côte, chacune avec son propre lien
 * d'échappement. Chez eux c'est leur recherche maison d'un côté, leurs citations dans
 * la presse de l'autre. Chez nous : le blog et les fiches pédagogiques — les deux
 * seules familles de contenu écrit que le site produit.
 *
 * ── LE BLOG PEUT ÊTRE VIDE, ET C'EST LE CAS AUJOURD'HUI ─────────────────────
 *
 * `ARTICLES` est un tableau vide : aucun article n'est publié. Une colonne vide à
 * côté d'une colonne pleine se lit comme un défaut de chargement, pas comme une
 * absence de contenu. La bande se replie donc sur UNE colonne pleine largeur quand
 * l'une des deux familles n'a rien à montrer — et disparaît entièrement si les deux
 * sont vides.
 *
 * C'est le même principe que partout ailleurs sur le site : on ne rend pas un cadre
 * pour dire qu'il n'y a rien, sauf là où l'absence est elle-même l'information (§5).
 * Ici elle ne l'est pas — un visiteur n'a rien à faire de savoir que le blog n'a pas
 * encore d'article.
 */
export async function EditorialBand() {
  const t = await getPhrase()

  const articles = sortedArticles().slice(0, PER_COLUMN)
  /* Les fiches les plus accessibles d'abord : un visiteur qui descend jusqu'ici n'a
     pas demandé le niveau avancé. `LESSONS` est déjà à plat, thèmes confondus. */
  const lessons = LESSONS.filter((lesson) => lesson.level === 'debutant').slice(0, PER_COLUMN)

  if (articles.length === 0 && lessons.length === 0) return null

  /* Une seule famille présente : elle prend toute la largeur plutôt que la moitié,
     et ses cartes s'étalent au lieu de laisser un vide à côté d'elles. */
  const columns = articles.length > 0 && lessons.length > 0 ? 'lg:grid-cols-2' : ''

  return (
    <div className={`grid items-start gap-6 ${columns}`}>
      {articles.length > 0 ? (
        <Column title={t('Le blog')} href="/blog" action={t('Tout lire')}>
          {articles.map((article) => (
            <Card
              key={article.slug}
              href={`/blog/${article.slug}`}
              seed={article.slug}
              label={t('Blog')}
              title={article.title}
              meta={`${formatArticleDate(article.publishedAt)} · ${t('{n} min de lecture').replace(
                '{n}',
                String(readingMinutes(article)),
              )}`}
            />
          ))}
        </Column>
      ) : null}

      {lessons.length > 0 ? (
        <Column title={t('Apprendre')} href="/apprendre" action={t('Tout voir')}>
          {lessons.map((lesson) => (
            <Card
              key={lesson.slug}
              href={`/apprendre/${lesson.slug}`}
              seed={lesson.slug}
              label={lesson.topicTitle}
              title={lesson.title}
              meta={lesson.summary}
            />
          ))}
        </Column>
      ) : null}
    </div>
  )
}

function Column({
  title,
  href,
  action,
  children,
}: {
  title: string
  href: string
  action: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-normal text-ink-muted">{title}</h2>
        <Link
          href={href}
          className="shrink-0 text-sm text-brand transition-colors hover:text-brand-strong"
        >
          {action} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Card({
  href,
  seed,
  label,
  title,
  meta,
}: {
  href: string
  seed: string
  label: string
  title: string
  meta: string
}) {
  return (
    /* `<Link>` et non `<a>` : ces destinations sont INTERNES, contrairement aux
       actualités. Le pré-chargement de Next et la navigation sans rechargement
       viennent alors gratuitement. */
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-panel border border-border-subtle bg-panel transition-colors duration-150 hover:border-brand/50"
    >
      <CoverArt seed={seed} label={label} ratio="21/9" />

      <span className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-brand-strong">
          {title}
        </span>
        {/* `mt-auto` : les cartes d'une rangée sont étirées à la hauteur de la plus
            haute, et sans cela la ligne de contexte flotterait au milieu du vide
            sous les titres courts. */}
        <span className="mt-auto line-clamp-2 text-micro text-ink-muted">{meta}</span>
      </span>
    </Link>
  )
}
