'use client'

import { Link } from '@/i18n/navigation'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

import { EmptyState } from '@zenkuu/ui'

import { CoverArt } from '@/components/editorial/CoverArt'
import { LESSON_TOPICS, LEVELS, levelLabel, type Level } from '@/content/apprendre'
import { usePhrase } from '@/components/locale/ContentProvider'

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
 *
 * ── UNE FICHE DE TÊTE PAR THÈME, PUIS DES ENTRÉES COMPACTES ──────────────────
 *
 * La disposition reprend celle de CoinGecko Learn, et pour la raison qui la rend
 * bonne : une grille où toutes les fiches se valent oblige à lire dix titres pour
 * choisir par où entrer dans un thème. Une fiche mise en avant donne un point
 * d'entrée évident, les autres restent atteignables d'un coup d'œil à côté.
 *
 * Le critère de mise en avant est l'ORDRE DU CORPUS — la première fiche du thème,
 * telle que la rédaction l'a rangée. Pas un « plus lu » : ZENKUU ne mesure pas
 * l'audience de ses pages, et afficher un classement sans donnée derrière serait de
 * la donnée inventée (§5). La note sous le parcours de départ le dit déjà.
 */
export function LessonBrowser() {
  const t = usePhrase()
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
        <InputGroup size="sm" className="min-w-[12rem] flex-1">
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Rechercher une notion…')}
            aria-label={t('Rechercher une fiche')}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('Filtrer par niveau')}>
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
        <nav aria-label={t('Thèmes')} className="flex flex-wrap gap-2">
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
          title={t('Aucune fiche ne correspond')}
          description={t('Essayez un autre terme, ou élargissez le filtre de niveau.')}
          compact
        />
      ) : (
        topics.map((topic) => {
          const [lead, ...others] = topic.lessons
          if (!lead) return null

          return (
            <section
              key={topic.id}
              id={topic.id}
              className="scroll-mt-24 space-y-4 border-t border-border-subtle pt-7 first:border-0 first:pt-0"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-ink">{topic.title}</h2>
                <p className="text-sm text-ink-muted">{topic.description}</p>
              </div>

              <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                {/* Fiche de tête : la seule à porter une couverture. Illustrer les
                    dix entrées d'un thème rendrait la page à la fois plus lourde à
                    lire et moins hiérarchisée — dix repères visuels ne repèrent rien. */}
                <Link href={`/apprendre/${lead.slug}`} className="group flex flex-col gap-3">
                  <span className="block overflow-hidden rounded-card">
                    <CoverArt seed={lead.slug} label={levelLabel(lead.level)} ratio="16/10" />
                  </span>
                  <span className="space-y-1.5">
                    <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-brand">
                      {levelLabel(lead.level)}
                    </span>
                    <span className="block text-base font-semibold leading-snug text-ink group-hover:text-brand-strong">
                      {lead.title}
                    </span>
                    <span className="block text-sm leading-relaxed text-ink-muted">
                      {lead.summary}
                    </span>
                  </span>
                </Link>

                {/* Les autres fiches en deux colonnes de texte, séparées par des
                    filets — la grammaire de la référence, et celle du design system :
                    on trace la structure au lieu d'empiler des cartes. */}
                {others.length > 0 ? (
                  <ul className="grid gap-x-8 sm:grid-cols-2">
                    {others.map((lesson) => (
                      <li key={lesson.slug} className="border-b border-border-subtle last:border-0 sm:[&:nth-last-child(2)]:border-0">
                        <Link
                          href={`/apprendre/${lesson.slug}`}
                          className="group flex flex-col gap-1 py-3.5"
                        >
                          <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-muted">
                            {levelLabel(lesson.level)}
                          </span>
                          <span className="text-sm font-semibold leading-snug text-ink group-hover:text-brand-strong">
                            {lesson.title}
                          </span>
                          <span className="text-xs leading-relaxed text-ink-muted">
                            {lesson.summary}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          )
        })
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
      className={`rounded-control px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-brand-soft text-brand-strong'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
