import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { getLessonVideos } from '@zenkuu/data'
import { SourceNote } from '@zenkuu/ui'

import { ShareButtons } from '@/components/blog/ShareButtons'
import { CoverArt } from '@/components/editorial/CoverArt'
import { LessonVideos } from '@/components/learn/LessonVideos'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { LESSONS, findLesson, levelLabel, relatedLessons } from '@/content/apprendre'
import { readingMinutes, sectionId } from '@/content/blog'

/**
 * Une fiche pédagogique.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LA MISE EN PAGE EST CELLE DE L'ARTICLE, PAS CELLE DE L'AIDE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La page était une colonne de 42 rem contenant un titre, un résumé et quatre
 * paragraphes — la mise en page d'une réponse de centre d'aide. Or ces fiches ne
 * répondent pas à une question ponctuelle : elles expliquent une notion, se lisent en
 * plusieurs minutes, et sont la porte d'entrée de recherche du site (§9).
 *
 * Elle reprend donc la structure d'article déjà en place pour le blog, à laquelle
 * `content/apprendre.ts` fournit désormais la matière : sections titrées et ancrées,
 * sommaire latéral collant, temps de lecture calculé, partage, suite de lecture.
 *
 * ── CE QUI EST REPRIS DE LA RÉFÉRENCE, ET CE QUI NE L'EST PAS ────────────────
 *
 * Repris de CoinGecko Learn : l'encadré « à retenir » en tête, le sommaire ancré, la
 * suite de lecture illustrée, la vidéo.
 *
 * NON repris : la note sur cinq étoiles (rien ne la mesure ici, §5), la signature
 * d'auteur nommé et la date de mise à jour (aucune n'existe réellement pour ces
 * fiches — `ArticleJsonLd` refuse d'ailleurs d'émettre une date inventée), et
 * l'infolettre, qui appartient au blog.
 *
 * ── UN SEUL ENCADRÉ, EN TÊTE ─────────────────────────────────────────────────
 *
 * « À retenir » est posé UNE FOIS, avant le corps. Le §3.1.1 proscrit l'encadré
 * identique répété en fin de chaque section : répété, il cesse d'être lu.
 */
export function generateStaticParams() {
  return LESSONS.map((lesson) => ({ slug: lesson.slug }))
}

/**
 * Revalidation quotidienne — imposée par la seule source de la page.
 *
 * Rien d'autre ici n'expire : le texte est écrit dans le dépôt. Le nombre est aligné
 * sur le TTL de `getLessonVideos`, pour que les deux couches tombent ensemble plutôt
 * que d'empiler leurs latences.
 */
export const revalidate = 86_400

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const lesson = findLesson(slug)
  if (!lesson) return {}

  return {
    title: lesson.title,
    description: lesson.summary,
    alternates: { canonical: `/apprendre/${lesson.slug}` },
  }
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lesson = findLesson(slug)

  if (!lesson) notFound()

  const toc = lesson.sections
    .map((section, index) => ({ section, id: sectionId(section, index) }))
    .filter((entry) => Boolean(entry.section.title))

  const related = relatedLessons(lesson)

  /* La requête de la FICHE d'abord, celle du THÈME en repli — « le sujet ou la
     catégorie ». Sans clé YouTube, l'appel rend `unconfigured` sans partir sur le
     réseau, et la section entière disparaît. */
  const videos = await getLessonVideos(lesson.videoQuery ?? lesson.topicVideoQuery)

  return (
    <div className="mx-auto max-w-4xl py-6">
      <ArticleJsonLd
        title={lesson.title}
        description={lesson.summary}
        path={`/apprendre/${lesson.slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Apprendre', path: '/apprendre' },
          { name: lesson.title, path: `/apprendre/${lesson.slug}` },
        ]}
      />

      <nav aria-label="Fil d’Ariane" className="mb-6 text-xs text-ink-muted">
        <Link href="/apprendre" className="hover:text-brand">
          Apprendre
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/apprendre#${lesson.topicId}`} className="hover:text-brand">
          {lesson.topicTitle}
        </Link>
      </nav>

      <header className="space-y-4">
        <h1 className="display-lg text-ink">{lesson.title}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">{lesson.summary}</p>
        {/* Niveau et durée sur une seule ligne : ce sont les deux seules choses qu'un
            lecteur veut savoir avant de s'engager, et aucune n'est inventée — le
            niveau est déclaré par le corpus, la durée calculée sur le texte. */}
        <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="rounded-card bg-brand-soft px-2 py-0.5 font-medium uppercase tracking-wide text-brand-strong">
            {levelLabel(lesson.level)}
          </span>
          <span>{readingMinutes(lesson)} min de lecture</span>
        </p>
      </header>

      <div className="mt-7 overflow-hidden rounded-card">
        <CoverArt seed={lesson.slug} label={lesson.topicTitle} ratio="21/9" />
      </div>

      <section
        aria-labelledby="a-retenir"
        className="mt-7 rounded-card border border-border-subtle bg-surface-muted p-5"
      >
        <h2 id="a-retenir" className="text-sm font-semibold text-ink">
          À retenir
        </h2>
        <ul className="mt-3 space-y-2">
          {lesson.takeaways.map((takeaway) => (
            <li
              key={takeaway}
              className="border-l-2 border-brand pl-3 text-sm leading-relaxed text-ink-muted"
            >
              {takeaway}
            </li>
          ))}
        </ul>
      </section>

      {/* Corps à GAUCHE, sommaire à DROITE — même raisonnement que sur le blog : le
          texte commence au bord d'appel du regard, le sommaire n'est qu'un outil de
          navigation secondaire. */}
      <div className="grid gap-10 pt-9 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="space-y-8">
          {lesson.sections.map((section, index) => {
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

          {videos.ok ? (
            <section aria-labelledby="en-video" className="scroll-mt-24 space-y-4 pt-2">
              <div>
                <h2 id="en-video" className="display-sm text-ink">
                  En vidéo
                </h2>
                {/* Précision de PÉRIMÈTRE, pas glose du titre (§3.1.1) : ces vidéos ne
                    sont ni écrites, ni relues, ni choisies une par une par ZENKUU. Le
                    lecteur doit savoir d'où elles viennent avant de les regarder. */}
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Sélection automatique de YouTube sur le sujet de la fiche. Ces
                  contenus sont ceux de leurs auteurs — ZENKUU ne les a ni produits ni
                  relus.
                </p>
              </div>
              <LessonVideos videos={videos.data} />
              <SourceNote label={videos.source.label} href={videos.source.attributionUrl} />
            </section>
          ) : null}

          <footer className="space-y-4 border-t border-border-subtle pt-6">
            <ShareButtons title={lesson.title} path={`/apprendre/${lesson.slug}`} />
            <p className="text-xs leading-relaxed text-ink-muted">
              Cette fiche est explicative. Elle ne constitue pas une recommandation
              d’investissement — voir la{' '}
              <Link href="/aide/pas-de-conseil" className="underline underline-offset-2">
                note sur le cadre de ZENKUU
              </Link>
              .
            </p>
          </footer>
        </article>

        {/* Sommaire MASQUÉ SOUS `lg`, et ce n'est pas de la place gagnée : en une
            colonne, la grille le place APRÈS le corps qu'il indexe — donc après le
            partage et la mention de non-conseil. Un sommaire qu'on atteint en ayant
            déjà tout lu ne sert à rien, et il rallonge une page déjà longue. */}
        {toc.length > 1 ? (
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
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
                {videos.ok ? (
                  <li>
                    <a
                      href="#en-video"
                      className="-ml-px block border-l border-transparent pl-3 text-sm leading-snug text-ink-muted transition-colors hover:border-brand hover:text-ink"
                    >
                      En vidéo
                    </a>
                  </li>
                ) : null}
              </ol>
            </nav>
          </aside>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section className="mt-14 space-y-4 border-t border-border-subtle pt-10">
          <h2 className="display-sm text-ink">À lire ensuite</h2>
          <ul className="grid gap-5 sm:grid-cols-3">
            {related.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/apprendre/${entry.slug}`} className="group flex h-full flex-col gap-2.5">
                  <span className="block overflow-hidden rounded-card">
                    <CoverArt seed={entry.slug} label={levelLabel(entry.level)} />
                  </span>
                  <span className="text-sm font-semibold leading-snug text-ink group-hover:text-brand">
                    {entry.title}
                  </span>
                  <span className="text-xs leading-relaxed text-ink-muted">{entry.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
