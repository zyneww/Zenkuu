import type { Metadata } from 'next'
import Link from 'next/link'

import { LessonBrowser } from '@/components/learn/LessonBrowser'
import { LESSONS, levelLabel } from '@/content/apprendre'
import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.learn,
  description:
    'Comprendre ce que vous regardez : capitalisation, volume, offre, chandeliers, moyennes mobiles et indices de sentiment — expliqués sans jargon.',
  alternates: { canonical: '/apprendre' },
}

/**
 * Hub pédagogique.
 *
 * Refonte : la page ouvrait directement sur une liste filtrable, sans point
 * d'entrée. Elle propose désormais un parcours conseillé en tête — trois fiches
 * pour démarrer — puis la bibliothèque complète, recherchable et filtrable par
 * niveau.
 *
 * Le parcours de départ est une SÉLECTION ÉDITORIALE, pas un classement de
 * popularité : ZENITH ne mesure pas l'audience de ses pages, et présenter un ordre
 * comme « le plus lu » serait une donnée inventée (§5).
 */
const STARTING_PATH = ['capitalisation', 'volume-et-liquidite', 'sans-signaux-imaginaires']

export default function ApprendrePage() {
  const starters = STARTING_PATH.map((slug) =>
    LESSONS.find((lesson) => lesson.slug === slug),
  ).filter((lesson): lesson is (typeof LESSONS)[number] => Boolean(lesson))

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Apprendre</h1>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          Comprendre ce que vous regardez : ce que chaque chiffre mesure réellement,
          et surtout ce qu’il ne mesure pas. Aucune de ces fiches ne recommande d’agir
          — ZENITH explique des notions, il ne conseille pas.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="par-ou-commencer">
        <h2 id="par-ou-commencer" className="text-sm font-semibold text-ink">
          Par où commencer
        </h2>
        <ol className="grid gap-2 sm:grid-cols-3">
          {starters.map((lesson, index) => (
            <li key={lesson.slug}>
              <Link
                href={`/apprendre/${lesson.slug}`}
                className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-3 transition-colors hover:border-brand"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[0.6875rem] font-semibold text-brand-strong"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="text-[0.6875rem] uppercase tracking-wide text-ink-muted">
                    {levelLabel(lesson.level)}
                  </span>
                </span>
                <span className="mt-1.5 text-sm font-medium leading-snug text-ink">
                  {lesson.title}
                </span>
                <span className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {lesson.summary}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-[0.6875rem] text-ink-muted">
          Parcours conseillé par la rédaction — ZENITH ne mesure pas l’audience de ses
          pages et ne prétend donc pas afficher « les plus lues ».
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="bibliotheque">
        <h2 id="bibliotheque" className="text-sm font-semibold text-ink">
          Toute la bibliothèque
        </h2>
        <LessonBrowser />
      </section>

      <section className="rounded-card border border-border-subtle bg-surface-muted p-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          Ces fiches expliquent des notions de marché. Pour comprendre comment ZENITH
          collecte et rafraîchit ses données, voyez la{' '}
          <Link
            href="/methodologie"
            className="underline underline-offset-2 hover:text-brand-strong"
          >
            page Méthodologie
          </Link>
          ; pour une question sur le site lui-même, le{' '}
          <Link href="/aide" className="underline underline-offset-2 hover:text-brand-strong">
            centre d’aide
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
