import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/ButtonLink'

import { EmptyState } from '@zenkuu/ui'

import { Mascotte } from '@/components/brand/Mascotte'
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

/**
 * Page 404 — le premier des moments « mascotte » identifiés au §10, et le seul où
 * elle occupe autant de place.
 *
 * Une page introuvable n'a rien à montrer par définition : c'est l'endroit du site où
 * une présence coûte le moins et sert le plus. Ailleurs, la mascotte reste petite et
 * ne s'approche jamais d'un chiffre — voir son en-tête.
 */
export default async function NotFound() {
  const fr = await getContent()
  return (
    <div className="flex flex-col items-center py-16">
      {/* AU-DESSUS du cadre et non dedans : `EmptyState` porte un pictogramme d'état
          dans son propre en-tête, et y glisser l'illustration ferait deux symboles
          l'un sur l'autre. La mascotte annonce, le cadre explique. */}
      <Mascotte size={180} className="mb-2" />

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
