import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { SignUp } from '@clerk/nextjs'

import { EmptyState } from '@zenkuu/ui'

import { AUTH_ENABLED } from '@/lib/auth'
import { CLERK_PAGE_ELEMENTS } from '@/lib/clerk-appearance'
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
  title: fr.auth.signUp,
  // Les écrans de compte n'ont rien à faire dans un index de recherche.
  robots: { index: false },
  }
}

export default async function Page() {
  const fr = await getContent()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.auth.signUpTitle}</h1>
        <p className="text-sm text-ink-muted">{fr.auth.signUpSubtitle}</p>
      </header>

      {AUTH_ENABLED ? (
        <SignUp routing="hash" appearance={{ elements: CLERK_PAGE_ELEMENTS }} />
      ) : (
        /* Clerk non configuré : on l'annonce au lieu de faire tomber la page. */
        <EmptyState
          title={fr.auth.unavailableTitle}
          description={fr.auth.unavailableBody}
          action={
            <Link
              href="/"
              className="inline-block rounded-control bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              {fr.notFound.cta}
            </Link>
          }
        />
      )}
    </div>
  )
}
