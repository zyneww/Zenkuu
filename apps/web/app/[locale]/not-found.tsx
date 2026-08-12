import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { EmptyState } from '@zenkuu/ui'

import { getContent } from '@/lib/content'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  title: fr.pages.notFound,
  // Une page d'erreur n'a rien à faire dans un index de recherche.
  robots: { index: false },
  }
}

/** Page 404 — un des moments « mascotte » identifiés au §10. */
export default async function NotFound() {
  const fr = await getContent()
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
