import type { Metadata } from 'next'
import Link from 'next/link'

import { HelpSearch } from '@/components/help/HelpSearch'
import { HELP_ARTICLES, HELP_STARTING_POINTS } from '@/content/aide'
import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.help,
  description:
    'Questions fréquentes sur les données de ZENITH, leur fraîcheur, les graphiques et les limites de ce que le site affiche.',
  alternates: { canonical: '/aide' },
}

/**
 * Centre d'aide.
 *
 * Refonte : la page enchaînait recherche puis liste plate de tous les articles. Elle
 * suit désormais l'organisation d'un centre de support — bandeau de recherche mis en
 * avant, grille de rubriques, points d'entrée conseillés, puis recours si rien ne
 * répond.
 *
 * Les rubriques et les articles sont rendus CÔTÉ SERVEUR dans le composant client :
 * ils sont donc présents dans le HTML initial, indexables et lisibles sans
 * JavaScript. La recherche n'est qu'une commodité greffée par-dessus, jamais la
 * condition d'accès au contenu (§9).
 */
export default function AidePage() {
  const starters = HELP_STARTING_POINTS.map((slug) =>
    HELP_ARTICLES.find((article) => article.slug === slug),
  ).filter((article): article is (typeof HELP_ARTICLES)[number] => Boolean(article))

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Centre d’aide</h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-ink-muted">
          Comment lire les chiffres affichés sur ZENITH, d’où ils viennent, à quelle
          fréquence ils changent — et ce que le site ne fait délibérément pas.
        </p>
      </header>

      <HelpSearch />

      <section className="space-y-3" aria-labelledby="a-lire-en-premier">
        <h2 id="a-lire-en-premier" className="text-sm font-semibold text-ink">
          À lire en premier
        </h2>
        {/* Sélection ÉDITORIALE, et le titre le dit. « Les plus consultés »
            supposerait une mesure d'audience que ZENITH ne fait pas (§5). */}
        <ul className="grid gap-2 sm:grid-cols-3">
          {starters.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/aide/${article.slug}`}
                className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-3 transition-colors hover:border-brand"
              >
                <span className="text-sm font-medium leading-snug text-ink">{article.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {article.summary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-card border border-border-subtle bg-surface-muted p-5">
        <h2 className="text-sm font-semibold text-ink">Vous n’avez pas trouvé ?</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Si votre question porte sur un chiffre affiché, commencez par suivre le lien
          de source sous le module concerné : il mène à l’endroit exact où la valeur a
          été publiée. Pour comprendre comment les données sont collectées et mises en
          cache, la{' '}
          <Link
            href="/methodologie"
            className="underline underline-offset-2 hover:text-brand-strong"
          >
            page Méthodologie
          </Link>{' '}
          détaille chaque source et ses limites connues.
        </p>
      </section>
    </div>
  )
}
