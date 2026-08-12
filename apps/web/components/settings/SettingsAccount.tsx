'use client'

import { UserProfile, useUser } from '@clerk/nextjs'
import { Link } from '@/i18n/navigation'

import { AUTH_ENABLED } from '@/lib/auth'
import { CLERK_PAGE_ELEMENTS } from '@/lib/clerk-appearance'

/**
 * Rubrique « Compte » — l'écran de Clerk, dans notre page.
 *
 * ⚠️ CE QUI N'EST PAS RÉÉCRIT, ET POURQUOI. Derrière cet écran : changement de nom,
 * d'adresse e-mail avec revérification, mot de passe, double authentification,
 * connexions tierces, appareils actifs, suppression du compte. Chacun est un
 * enchaînement d'états avec ses erreurs propres. Les refaire pour gagner en
 * homogénéité visuelle reviendrait à créer une dizaine d'endroits où quelqu'un peut se
 * retrouver enfermé hors de son compte — la panne la plus coûteuse qu'un site puisse
 * produire.
 *
 * `routing="hash"` : les sous-écrans de Clerk s'inscrivent dans le fragment de l'URL.
 * Avec `path`, ils feraient naviguer le routeur de Next.js hors de `/parametres`, et
 * la colonne de rubriques disparaîtrait à la première étape.
 */
export function SettingsAccount() {
  if (!AUTH_ENABLED) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-ink-muted">
          L’authentification n’est pas configurée sur cette instance. Vos préférences
          d’affichage restent enregistrées sur cet appareil, mais aucun compte ne peut
          être créé.
        </p>
      </Shell>
    )
  }

  return <ConnectedAccount />
}

function ConnectedAccount() {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return (
      <Shell>
        <p className="text-sm text-ink-muted">Chargement…</p>
      </Shell>
    )
  }

  if (!isSignedIn) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-ink-muted">
          Connectez-vous pour gérer votre profil, votre mot de passe et vos connexions.
        </p>
        <Link
          href="/connexion"
          className="mt-4 inline-block bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors duration-150 hover:bg-brand-strong"
        >
          Se connecter
        </Link>
      </Shell>
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="compte-titre">
      <div className="space-y-1">
        <h2 id="compte-titre" className="display-sm text-ink">
          Compte
        </h2>
        <p className="text-sm text-ink-muted">
          Profil, adresse e-mail, mot de passe et connexions tierces.
        </p>
      </div>

      <UserProfile routing="hash" appearance={{ elements: CLERK_PAGE_ELEMENTS }} />
    </section>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-4" aria-labelledby="compte-titre">
      <div className="space-y-1">
        <h2 id="compte-titre" className="display-sm text-ink">
          Compte
        </h2>
      </div>
      <div className="rounded-card border border-border-subtle p-6">{children}</div>
    </section>
  )
}
