import type { Metadata } from 'next'

import { glossaryByLetter } from '@/content/glossaire'
import { Link } from '@/i18n/navigation'
import { getPhrase, getSeo } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE GLOSSAIRE — UNE PAGE, PLUS UNE SECTION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI IL QUITTE `/apprendre` ────────────────────────────────────────
 *
 * Il y vivait en section, avec cette justification écrite : « trente-deux entrées ne
 * justifient pas une route à part, et les avoir sur la même page que les fiches
 * permet d'y renvoyer depuis chacune ». L'argument se tenait — jusqu'à ce que le
 * mandat devienne le recalage de l'arborescence sur celle de la référence, qui sert
 * son glossaire à `/glossary`, sous sa rubrique « Learn ».
 *
 * Ce que le déménagement rend possible et qu'une section interdisait : une adresse
 * qu'on partage, qu'un moteur indexe pour elle-même, et vers laquelle chaque
 * définition employée ailleurs sur le site peut renvoyer sans traîner la page
 * d'apprentissage avec elle.
 *
 * ── CE QUI NE CHANGE PAS ───────────────────────────────────────────────────
 *
 * Le contenu, la source (`content/glossaire.ts`), le groupement par initiale
 * (`glossaryByLetter`, qui existait déjà et faisait exactement ce travail), et le
 * lien vers la fiche d'apprentissage quand une notion en a une. Rien n'est réécrit :
 * la section est déplacée, pas refaite.
 *
 * L'index de tête ne liste QUE les lettres qui portent une entrée. Un alphabet
 * complet dont la moitié des lettres ne mène nulle part fait chercher ce qui
 * n'existe pas.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()
  const t = await getPhrase()
  return {
    title: t('Glossaire'),
    description: seo(
      '/glossaire',
      'Le vocabulaire nécessaire pour lire le marché : chaque définition dit ce que la notion mesure, et ce qu’elle ne mesure pas.',
    ),
  }
}

export default async function GlossaryPage() {
  const t = await getPhrase()
  const groups = glossaryByLetter()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display-xl text-ink">{t('Glossaire')}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {t(
            'Le vocabulaire nécessaire pour lire le site. Chaque définition dit ce que la notion mesure — et ce qu’elle ne mesure pas.',
          )}
        </p>
      </div>

      <nav aria-label={t('Index du glossaire')} className="flex flex-wrap gap-1.5">
        {groups.map((group) => (
          <a
            key={group.letter}
            href={`#glossaire-${group.letter}`}
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-control border border-border-subtle px-2 text-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand"
          >
            {group.letter}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.letter} id={`glossaire-${group.letter}`} className="space-y-2">
            <h2 className="text-sm font-bold text-ink">{group.letter}</h2>
            <dl className="divide-y divide-border-subtle border-t border-border-subtle">
              {group.entries.map((entry) => (
                <div
                  key={entry.term}
                  className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5"
                >
                  <dt className="text-sm font-semibold text-ink">
                    {entry.term}
                    {/* `inline-flex min-h-8` : le plancher tactile du site repose sur
                        `min-height`, sans effet sur une boîte en ligne. Le libellé
                        s'allonge aussi — « fiche » seul ne dit pas où il mène. */}
                    {entry.lesson ? (
                      <>
                        {' '}
                        <Link
                          href={`/apprendre/${entry.lesson}`}
                          className="inline-flex min-h-8 items-center px-1 text-xs font-normal text-ink hover:underline"
                        >
                          {t('voir la fiche')}
                        </Link>
                      </>
                    ) : null}
                  </dt>
                  <dd className="text-sm leading-relaxed text-ink-muted">{entry.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
