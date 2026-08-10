import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { frFR } from '@clerk/localizations'

import { AUTH_ENABLED, AUTH_ROUTES } from '@/lib/auth'
import { CLERK_VARIABLES } from '@/lib/clerk-appearance'

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
      /*
       * Traduction du fournisseur, COMPLÉTÉE.
       *
       * Le paquet `frFR` laisse passer quelques chaînes en anglais — relevé à
       * l'écran : « Create a password » sous un libellé « Mot de passe » traduit,
       * lui. Une seule phrase anglaise au milieu d'un formulaire français suffit à
       * donner l'impression d'un écran tiers greffé sur le site, ce que tout le
       * travail d'habillage cherche précisément à éviter.
       *
       * L'objet étale `frFR` puis surcharge : les corrections futures du paquet
       * continuent d'arriver, seules les clés listées ici sont figées.
       */
      localization={{
        ...frFR,
        formFieldInputPlaceholder__password: 'Choisissez un mot de passe',
      }}
      signInUrl={AUTH_ROUTES.signIn}
      signUpUrl={AUTH_ROUTES.signUp}
      appearance={{ variables: CLERK_VARIABLES }}
    >
      {children}
    </ClerkProvider>
  )
}
