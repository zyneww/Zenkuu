import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { frFR } from '@clerk/localizations'

import { AUTH_ENABLED, AUTH_ROUTES } from '@/lib/auth'

/**
 * Enveloppe d'authentification, montée CONDITIONNELLEMENT.
 *
 * `ClerkProvider` exige une clé publique et lève une exception sans elle. On ne le
 * monte donc que si la clé existe : sans configuration, l'application se rend
 * normalement et seules les fonctions de compte sont annoncées comme indisponibles.
 *
 * La localisation française est fournie par Clerk : sans elle, les écrans de
 * connexion s'afficheraient en anglais au milieu d'un site francophone.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!AUTH_ENABLED) return <>{children}</>

  return (
    <ClerkProvider
      localization={frFR}
      signInUrl={AUTH_ROUTES.signIn}
      signUpUrl={AUTH_ROUTES.signUp}
      appearance={{
        variables: {
          // Les écrans Clerk reprennent les jetons de la charte plutôt que leur
          // bleu par défaut, pour ne pas donner l'impression d'un site tiers.
          colorPrimary: '#ea580c',
          borderRadius: '12px',
          fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
