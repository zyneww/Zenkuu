import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@zenith/ui'

import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.notFound,
  // Une page d'erreur n'a rien à faire dans un index de recherche.
  robots: { index: false },
}

/** Page 404 — un des moments « mascotte » identifiés au §10. */
export default function NotFound() {
  return (
    <div className="py-16">
      <EmptyState
        title={fr.notFound.title}
        description={fr.notFound.body}
        action={
          <Link
            href="/"
            className="inline-block rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
          >
            {fr.notFound.cta}
          </Link>
        }
      />
    </div>
  )
}
