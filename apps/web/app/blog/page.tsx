import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@zenith/ui'

import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.blog,
  description:
    'Le blog de ZENITH — analyses de fond et notes méthodologiques. Aucun article n’est encore publié.',
  alternates: { canonical: '/blog' },
  // Une page sans article n'a rien à apporter à un index de recherche, et une page
  // vide indexée nuit à la perception de qualité du domaine entier. On la rouvrira à
  // l'indexation en même temps que le premier article.
  robots: { index: false, follow: true },
}

/**
 * Blog — structure en place, aucun article inventé.
 *
 * Le §5 interdit les données de remplissage, et cela vaut aussi pour de faux billets
 * signés de faux auteurs à de fausses dates. La page annonce donc franchement qu'elle
 * est vide et redirige vers les contenus qui, eux, existent vraiment.
 */
export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Blog</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Analyses de fond, notes méthodologiques et retours sur la construction de
          ZENITH.
        </p>
      </header>

      <EmptyState
        title="Aucun article publié pour l’instant"
        description="Plutôt que de remplir cette page d’articles de circonstance, elle reste vide jusqu’au premier vrai billet. En attendant, les contenus explicatifs du site sont, eux, bien réels."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/apprendre"
              className="rounded-card bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink"
            >
              Fiches Apprendre
            </Link>
            <Link
              href="/methodologie"
              className="rounded-card border border-border-subtle px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand"
            >
              Méthodologie & sources
            </Link>
          </div>
        }
      />
    </div>
  )
}
