'use client'

import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'

import { AUTH_ENABLED, AUTH_ROUTES } from '@/lib/auth'
import { fr } from '@/content/fr'

/**
 * Boutons « Connexion » et « S'inscrire » du header.
 *
 * Deux implémentations séparées plutôt qu'une seule avec un `if` : `useUser()` est
 * un hook, il ne peut pas être appelé conditionnellement. Les extraire dans deux
 * composants distincts respecte les règles des hooks, et le choix entre les deux
 * repose sur une constante de module — donc stable d'un rendu à l'autre.
 *
 * Clerk v7 a retiré `SignedIn` / `SignedOut` : on lit l'état via `useUser()`.
 */
export function AuthButtons() {
  return AUTH_ENABLED ? <ConnectedAuthButtons /> : <StaticAuthLinks />
}

function ConnectedAuthButtons() {
  const { isLoaded, isSignedIn } = useUser()

  // Tant que Clerk n'a pas répondu, on réserve la place des boutons plutôt que de
  // les afficher puis de les remplacer : le header sauterait à chaque chargement.
  if (!isLoaded) {
    return <span className="hidden h-8 w-[9.5rem] sm:block" aria-hidden="true" />
  }

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{ elements: { avatarBox: 'h-7 w-7' } }}
        userProfileProps={{ appearance: { variables: { colorPrimary: '#0369a1' } } }}
      />
    )
  }

  return <StaticAuthLinks />
}

function StaticAuthLinks() {
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <AuthLink href={AUTH_ROUTES.signIn} label={fr.auth.signIn} />
      <AuthLink href={AUTH_ROUTES.signUp} label={fr.auth.signUp} primary />
    </div>
  )
}

function AuthLink({
  href,
  label,
  primary = false,
}: {
  href: string
  label: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'rounded-card bg-brand px-3 py-1.5 text-xs font-medium text-on-brand transition-colors hover:bg-brand-strong'
          : 'rounded-card px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink'
      }
    >
      {label}
    </Link>
  )
}
