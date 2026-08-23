import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/ButtonLink'

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
          <ButtonLink href="/">{fr.notFound.cta}</ButtonLink>
        }
      />
    </div>
  )
}
