import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CoverArt } from '@/components/editorial/CoverArt'
import { LessonBrowser } from '@/components/learn/LessonBrowser'
import { LESSONS, levelLabel } from '@/content/apprendre'
import { getContent } from '@/lib/content'

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
  title: fr.pages.learn,
  description:
    'Comprendre ce que vous regardez : capitalisation, volume, offre, chandeliers, moyennes mobiles et indices de sentiment — expliqués sans jargon.',
  alternates: { canonical: '/apprendre' },
  }
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
 * popularité : ZENKUU ne mesure pas l'audience de ses pages, et présenter un ordre
 * comme « le plus lu » serait une donnée inventée (§5).
 */
const STARTING_PATH = ['capitalisation', 'volume-et-liquidite', 'sans-signaux-imaginaires']

export default function ApprendrePage() {
  const starters = STARTING_PATH.map((slug) =>
    LESSONS.find((lesson) => lesson.slug === slug),
  ).filter((lesson): lesson is (typeof LESSONS)[number] => Boolean(lesson))

  return (
    <div className="space-y-10 py-6">
      {/*
        BANDEAU COLORÉ en tête, comme la référence — mais aux couleurs de la marque
        et non en aplat criard. Il règle un vrai problème : cette page est un HUB, pas
        un article, et un titre posé sur le fond de page la faisait ressembler à une
        fiche de plus. Le bandeau dit « vous êtes à l'entrée » avant même la lecture.

        Le dégradé est tiré des jetons : il suit donc les deux thèmes sans qu'aucune
        couleur ne soit écrite ici.
      */}
      <header className="rounded-card bg-gradient-to-br from-brand to-brand-strong px-7 py-8">
        <h1 className="display-lg text-on-brand">Apprendre</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-on-brand/85">
          Comprendre ce que vous regardez : ce que chaque chiffre mesure réellement,
          et surtout ce qu’il ne mesure pas. Aucune de ces fiches ne recommande d’agir
          — ZENKUU explique des notions, il ne conseille pas.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="par-ou-commencer">
        <h2 id="par-ou-commencer" className="text-sm font-semibold text-ink">
          Par où commencer
        </h2>
        <ol className="grid gap-5 sm:grid-cols-3">
          {starters.map((lesson, index) => (
            <li key={lesson.slug}>
              <Link href={`/apprendre/${lesson.slug}`} className="group flex h-full flex-col gap-2.5">
                <span className="relative block overflow-hidden rounded-card">
                  <CoverArt seed={lesson.slug} label={levelLabel(lesson.level)} />
                  {/* Le NUMÉRO D'ÉTAPE est ce qui distingue ce bloc de la bibliothèque
                      plus bas : ces trois fiches forment un parcours ORDONNÉ, et sans
                      lui rien ne dit qu'il faut les lire dans cet ordre. Posé sur la
                      couverture plutôt qu'à côté du titre, il se lit avant elle. */}
                  <span
                    className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-canvas text-xs font-bold text-brand-strong"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </span>
                <span className="text-sm font-semibold leading-snug text-ink group-hover:text-brand-strong">
                  {lesson.title}
                </span>
                <span className="text-xs leading-relaxed text-ink-muted">{lesson.summary}</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-[0.6875rem] text-ink-muted">
          Parcours conseillé par la rédaction — ZENKUU ne mesure pas l’audience de ses
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
          Ces fiches expliquent des notions de marché. Pour comprendre comment ZENKUU
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
