'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@zenith/ui'

import { LESSON_TOPICS, LEVELS, levelLabel, type Level } from '@/content/apprendre'

/**
 * Bibliothèque de contenus pédagogiques.
 *
 * Refonte : la page n'offrait qu'un filtre de niveau appliqué à des sections
 * empilées. Elle fonctionne désormais comme une bibliothèque — recherche, filtre de
 * niveau, navigation par thème, et sommaire des thèmes en tête pour atteindre une
 * section sans faire défiler.
 *
 * Le filtre reste un état CLIENT et non un paramètre d'URL : chaque combinaison
 * créerait sinon une URL distincte servant le même corpus, donc autant de pages
 * quasi dupliquées à indexer. Les fiches, elles, ont chacune leur URL propre — c'est
 * là que l'indexation doit porter (§9).
 */
export function LessonBrowser() {
  const [level, setLevel] = useState<Level | 'tous'>('tous')
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()

  const topics = useMemo(
    () =>
      LESSON_TOPICS.map((topic) => ({
        ...topic,
        lessons: topic.lessons.filter((lesson) => {
          if (level !== 'tous' && lesson.level !== level) return false
          if (!needle) return true
          return `${lesson.title} ${lesson.summary}`.toLowerCase().includes(needle)
        }),
      })).filter((topic) => topic.lessons.length > 0),
    [level, needle],
  )

  const total = topics.reduce((sum, topic) => sum + topic.lessons.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une notion…"
            aria-label="Rechercher une fiche"
            className="w-full rounded-card border border-border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrer par niveau">
          <FilterButton active={level === 'tous'} onClick={() => setLevel('tous')} label="Tous niveaux" />
          {LEVELS.map((entry) => (
            <FilterButton
              key={entry.id}
              active={level === entry.id}
              onClick={() => setLevel(entry.id)}
              label={entry.label}
              hint={entry.hint}
            />
          ))}
        </div>
      </div>

      {/* Sommaire des thèmes : atteindre une section sans faire défiler toute la page. */}
      {topics.length > 1 ? (
        <nav aria-label="Thèmes" className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <a
              key={topic.id}
              href={`#${topic.id}`}
              className="rounded-card border border-border-subtle px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-brand hover:text-ink"
            >
              {topic.title}
            </a>
          ))}
        </nav>
      ) : null}

      <p className="text-xs text-ink-muted" aria-live="polite">
        {total} fiche{total > 1 ? 's' : ''}
        {level === 'tous' ? '' : ` de niveau ${levelLabel(level).toLowerCase()}`}
        {needle ? ` correspondant à « ${query.trim()} »` : ''}
      </p>

      {topics.length === 0 ? (
        <EmptyState
          title="Aucune fiche ne correspond"
          description="Essayez un autre terme, ou élargissez le filtre de niveau."
          compact
        />
      ) : (
        topics.map((topic) => (
          <section key={topic.id} id={topic.id} className="scroll-mt-24 space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink">{topic.title}</h2>
              <p className="text-sm text-ink-muted">{topic.description}</p>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {topic.lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={`/apprendre/${lesson.slug}`}
                    className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-3 transition-colors hover:border-brand"
                  >
                    <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-brand-strong">
                      {levelLabel(lesson.level)}
                    </span>
                    <span className="mt-0.5 text-sm font-medium text-ink">{lesson.title}</span>
                    <span className="mt-1 text-xs leading-relaxed text-ink-muted">
                      {lesson.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={`rounded-card px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-brand-soft text-brand-strong'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
