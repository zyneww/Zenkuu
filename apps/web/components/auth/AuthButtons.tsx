'use client'

import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'

import type { AuthMode } from '@/components/auth/AuthOverlay'
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
export function AuthButtons({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
  return AUTH_ENABLED ? (
    <ConnectedAuthButtons onOpen={onOpen} />
  ) : (
    /* Sans Clerk configuré, la fenêtre n'a aucun formulaire à montrer : les liens
       mènent alors aux pages, qui expliquent ce qui manque. */
    <StaticAuthLinks />
  )
}

function ConnectedAuthButtons({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
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

  return <StaticAuthLinks onOpen={onOpen} />
}

function StaticAuthLinks({ onOpen }: { onOpen?: (mode: AuthMode) => void }) {
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <AuthLink
        href={AUTH_ROUTES.signIn}
        label={fr.auth.signIn}
        {...(onOpen ? { onOpen: () => onOpen('signIn') } : {})}
      />
      <AuthLink
        href={AUTH_ROUTES.signUp}
        label={fr.auth.signUp}
        primary
        {...(onOpen ? { onOpen: () => onOpen('signUp') } : {})}
      />
    </div>
  )
}

/**
 * Entrée de compte du menu mobile.
 *
 * ⚠️ ELLE COMBLE UN TROU, elle n'ajoute pas un raccourci. Les boutons ci-dessus sont
 * `hidden sm:flex`, et le menu mobile n'avait aucune entrée de compte : sur un
 * téléphone, il n'existait tout simplement AUCUN moyen de se connecter. Le défaut se
 * voyait d'autant moins que la page `/connexion` fonctionnait parfaitement — encore
 * fallait-il en connaître l'adresse.
 *
 * Rend `null` une fois connecté : le bouton de compte de Clerk, lui, est visible à
 * toutes les tailles.
 */
export function MobileAuthLinks({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
  return AUTH_ENABLED ? <ConnectedMobileAuthLinks onOpen={onOpen} /> : <MobileAuthRow />
}

function ConnectedMobileAuthLinks({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
  const { isLoaded, isSignedIn } = useUser()
  if (!isLoaded || isSignedIn) return null
  return <MobileAuthRow onOpen={onOpen} />
}

function MobileAuthRow({ onOpen }: { onOpen?: (mode: AuthMode) => void }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-border-subtle pb-4 sm:hidden">
      <AuthLink
        href={AUTH_ROUTES.signIn}
        label={fr.auth.signIn}
        {...(onOpen ? { onOpen: () => onOpen('signIn') } : {})}
      />
      <AuthLink
        href={AUTH_ROUTES.signUp}
        label={fr.auth.signUp}
        primary
        {...(onOpen ? { onOpen: () => onOpen('signUp') } : {})}
      />
    </div>
  )
}

/**
 * Toujours un `<Link>`, jamais un `<button>` — même quand il ouvre une fenêtre.
 *
 * L'`href` reste une destination réelle, et l'ouverture de la fenêtre n'intercepte
 * que le clic ORDINAIRE. Trois conséquences, toutes acquises gratuitement :
 *
 * · le clic milieu et Ctrl+clic ouvrent la page dans un onglet, comme partout ;
 * · le survol affiche l'adresse en barre d'état, ce qu'un bouton ne fait pas ;
 * · si le JavaScript tombe, le lien fonctionne encore.
 *
 * D'où le test sur les touches de modification : intercepter un Ctrl+clic
 * transformerait « ouvrir dans un onglet » en « ouvrir une fenêtre ici », un geste
 * détourné de son sens. `button !== 0` écarte de même le clic milieu.
 */
function AuthLink({
  href,
  label,
  primary = false,
  onOpen,
}: {
  href: string
  label: string
  primary?: boolean
  onOpen?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={
        onOpen
          ? (event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              if (event.button !== 0) return
              event.preventDefault()
              onOpen()
            }
          : undefined
      }
      className={
        primary
          ? 'bg-brand px-3 py-1.5 text-xs font-medium text-on-brand transition-colors duration-150 hover:bg-brand-strong'
          : 'px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink'
      }
    >
      {label}
    </Link>
  )
}
