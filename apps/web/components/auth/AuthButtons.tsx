'use client'

import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'

import type { AuthMode } from '@/components/auth/AuthOverlay'
import { AUTH_ENABLED, AUTH_ROUTES } from '@/lib/auth'
import { fr } from '@/content/fr'

/**
 * Bouton d'inscription de l'en-tête.
 *
 * UN SEUL BOUTON, plus deux. « Connexion » et « S'inscrire » côte à côte, c'est deux
 * appels à l'action de même poids visuel pour deux publics différents : celui qui a
 * déjà un compte sait le chercher, celui qui n'en a pas doit être invité. On garde
 * donc l'invitation dans l'en-tête, et « Connexion » descend dans le menu — où il
 * reste à un clic.
 *
 * Une fois connecté, l'en-tête n'affiche plus rien ici : le compte vit entièrement
 * dans le menu, avec les réglages.
 *
 * `useUser()` est un hook, donc non appelable conditionnellement : d'où deux
 * composants distincts plutôt qu'un `if`. Le choix entre les deux repose sur une
 * constante de module, stable d'un rendu à l'autre.
 */
export function AuthButtons({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
  return AUTH_ENABLED ? <ConnectedAuthButton onOpen={onOpen} /> : <StaticSignUpLink />
}

function ConnectedAuthButton({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
  const { isLoaded, isSignedIn } = useUser()

  // Tant que Clerk n'a pas répondu, on réserve la place plutôt que d'afficher le
  // bouton puis de le retirer : l'en-tête sauterait à chaque chargement.
  if (!isLoaded) return <span className="hidden h-8 w-[5.5rem] sm:block" aria-hidden="true" />

  // Connecté : rien dans l'en-tête. Le bouton de compte de Clerk est dans le menu.
  if (isSignedIn) return null

  return <StaticSignUpLink onOpen={() => onOpen('signUp')} />
}

/**
 * Toujours un `<Link>`, jamais un `<button>` — même quand il ouvre une fenêtre.
 *
 * L'`href` reste une destination réelle, et l'ouverture de la fenêtre n'intercepte
 * que le clic ORDINAIRE. Trois conséquences, toutes acquises gratuitement : le clic
 * milieu et Ctrl+clic ouvrent la page dans un onglet comme partout ; le survol
 * affiche l'adresse en barre d'état ; et si le JavaScript tombe, le lien fonctionne
 * encore.
 *
 * D'où le test sur les touches de modification : intercepter un Ctrl+clic
 * transformerait « ouvrir dans un onglet » en « ouvrir une fenêtre ici », un geste
 * détourné de son sens.
 */
function StaticSignUpLink({ onOpen }: { onOpen?: () => void }) {
  return (
    <Link
      href={AUTH_ROUTES.signUp}
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
      className="hidden whitespace-nowrap bg-brand px-3 py-1.5 text-xs font-medium text-on-brand transition-colors duration-150 hover:bg-brand-strong sm:block"
    >
      {fr.auth.signUp}
    </Link>
  )
}

/**
 * En-tête de compte du menu — soit l'identité, soit les deux invitations.
 *
 * ⚠️ POURQUOI UN COMPOSANT PLUTÔT QU'UN BOOLÉEN `isSignedIn` PASSÉ EN PROP.
 *
 * Connaître l'état de connexion exige `useUser()`, qui lève une exception sans
 * fournisseur Clerk. Le calculer dans la barre de navigation aurait donc supposé un
 * hook appelé conditionnellement — interdit — ou un `useUser()` inconditionnel, qui
 * ferait tomber tout l'en-tête sur une instance sans clé.
 *
 * En déplaçant la décision ICI, la barre de navigation n'a plus besoin de savoir : la
 * branche « pas de Clerk » sort avant tout appel de hook, et les deux autres sont des
 * composants distincts, chacun avec un ordre de hooks constant.
 */
export function AccountSection({
  onOpenAuth,
  onClose,
}: {
  onOpenAuth: (mode: AuthMode) => void
  onClose: () => void
}) {
  if (!AUTH_ENABLED) {
    // Sans Clerk, on n'affiche pas deux boutons qui n'ouvriraient rien : les pages
    // dédiées expliquent ce qui manque.
    return <p className="text-xs leading-relaxed text-ink-muted">{fr.auth.unavailableTitle}</p>
  }

  return <ConnectedAccountSection onOpenAuth={onOpenAuth} onClose={onClose} />
}

function ConnectedAccountSection({
  onOpenAuth,
  onClose,
}: {
  onOpenAuth: (mode: AuthMode) => void
  onClose: () => void
}) {
  const { isLoaded, user } = useUser()

  // Réserve la hauteur pendant le chargement : sans cela, le menu se réorganise sous
  // le curseur au moment où Clerk répond.
  if (!isLoaded) return <span className="block h-9" aria-hidden="true" />

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {/* Le bouton de Clerk est CONSERVÉ ici plutôt que remplacé par nos propres
            entrées : il porte déjà la gestion du profil, des connexions tierces, du
            mot de passe et de la déconnexion. Les réécrire ne gagnerait qu'un peu
            d'homogénéité visuelle, au prix de tout ce qui s'y rattache. */}
        <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">
            {user.fullName ?? user.username ?? 'Mon compte'}
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {user.primaryEmailAddress?.emailAddress ?? ''}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          onClose()
          onOpenAuth('signIn')
        }}
        className="flex-1 bg-brand px-3 py-2 text-sm font-medium text-on-brand transition-colors duration-150 hover:bg-brand-strong"
      >
        {fr.auth.signIn}
      </button>
      <button
        type="button"
        onClick={() => {
          onClose()
          onOpenAuth('signUp')
        }}
        className="flex-1 border border-brand px-3 py-2 text-sm font-medium text-brand transition-colors duration-150 hover:bg-brand-soft"
      >
        {fr.auth.signUp}
      </button>
    </div>
  )
}
