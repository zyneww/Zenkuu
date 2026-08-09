import type { Metadata } from 'next'
import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

import { EmptyState } from '@zenith/ui'

import { AUTH_ENABLED } from '@/lib/auth'
import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.auth.signUp,
  // Les écrans de compte n'ont rien à faire dans un index de recherche.
  robots: { index: false },
}

export default function Page() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.auth.signUpTitle}</h1>
        <p className="text-sm text-ink-muted">{fr.auth.signUpSubtitle}</p>
      </header>

      {AUTH_ENABLED ? (
        <SignUp routing="hash" />
      ) : (
        /* Clerk non configuré : on l'annonce au lieu de faire tomber la page. */
        <EmptyState
          title={fr.auth.unavailableTitle}
          description={fr.auth.unavailableBody}
          action={
            <Link
              href="/"
              className="inline-block rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              {fr.notFound.cta}
            </Link>
          }
        />
      )}
    </div>
  )
}
