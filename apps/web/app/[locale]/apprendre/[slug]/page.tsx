import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { LESSONS, findLesson, levelLabel } from '@/content/apprendre'

export function generateStaticParams() {
  return LESSONS.map((lesson) => ({ slug: lesson.slug }))
}

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

  return (
    <article className="mx-auto max-w-2xl space-y-6 py-6">
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

      <nav aria-label="Fil d’Ariane" className="text-xs text-ink-muted">
        <Link href="/apprendre" className="hover:text-brand-strong">
          Apprendre
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{lesson.topicTitle}</span>
      </nav>

      <header className="space-y-3">
        <span className="inline-block rounded-card bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-brand-strong">
          {levelLabel(lesson.level)}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{lesson.title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{lesson.summary}</p>
      </header>

      <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
        {lesson.body.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <footer className="space-y-3 border-t border-border-subtle pt-4">
        <p className="text-xs leading-relaxed text-ink-muted">
          Cette fiche est explicative. Elle ne constitue pas une recommandation
          d’investissement — voir la{' '}
          <Link href="/aide/pas-de-conseil" className="underline underline-offset-2">
            note sur le cadre de ZENKUU
          </Link>
          .
        </p>
        <Link href="/apprendre" className="inline-block text-sm text-brand-strong hover:underline">
          ← Toutes les fiches
        </Link>
      </footer>
    </article>
  )
}
