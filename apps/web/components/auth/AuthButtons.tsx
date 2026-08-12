'use client'

import { LogOut } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useClerk, useUser } from '@clerk/nextjs'

import type { AuthMode } from '@/components/auth/AuthOverlay'
import { AUTH_ENABLED, AUTH_ROUTES } from '@/lib/auth'
import { useContent } from '@/components/locale/ContentProvider'

/**
 * Boutons de session de l'en-tête — « Connexion » puis « S'inscrire ».
 *
 * ── DEUX BOUTONS, ET LEUR POIDS N'EST PAS LE MÊME ─────────────────────────────
 *
 * Ils s'adressent à deux publics : celui qui a déjà un compte SAIT qu'il doit se
 * connecter et cherche l'entrée ; celui qui n'en a pas doit être invité. D'où deux
 * traitements — « Connexion » en texte nu, « S'inscrire » en aplat de marque. Deux
 * boutons pleins côte à côte se disputeraient l'attention sans qu'aucun ne guide.
 *
 * Une version précédente ne gardait que l'inscription et reléguait la connexion dans
 * le tiroir. C'était défendable tant que ce tiroir existait ; il a été démonté, et
 * une connexion enfouie derrière une roue dentée aurait été introuvable.
 *
 * Une fois connecté, ce composant s'efface entièrement : `AccountMenu` prend le
 * relais dans l'en-tête.
 *
 * `useUser()` est un hook, donc non appelable conditionnellement : d'où deux
 * composants distincts plutôt qu'un `if`. Le choix entre les deux repose sur une
 * constante de module, stable d'un rendu à l'autre.
 */
export function AuthButtons({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
  return AUTH_ENABLED ? <ConnectedAuthButtons onOpen={onOpen} /> : <StaticAuthLinks />
}

function ConnectedAuthButtons({ onOpen }: { onOpen: (mode: AuthMode) => void }) {
  const { isLoaded, isSignedIn } = useUser()

  // Tant que Clerk n'a pas répondu, on réserve la place plutôt que d'afficher les
  // boutons puis de les retirer : l'en-tête sauterait à chaque chargement.
  if (!isLoaded) return <span className="hidden h-8 w-[10rem] sm:block" aria-hidden="true" />

  // Connecté : rien ici. `AccountMenu` porte l'identité et les réglages.
  if (isSignedIn) return null

  return <StaticAuthLinks onOpen={onOpen} />
}

/** Les deux liens, avec ou sans interception de clic selon que Clerk est configuré. */
function StaticAuthLinks({ onOpen }: { onOpen?: (mode: AuthMode) => void }) {
  const fr = useContent()
  return (
    <span className="hidden items-center gap-1 sm:flex">
      <AuthLink
        href={AUTH_ROUTES.signIn}
        label={fr.auth.signIn}
        className="whitespace-nowrap rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        {...(onOpen ? { onOpen: () => onOpen('signIn') } : {})}
      />
      <AuthLink
        href={AUTH_ROUTES.signUp}
        label={fr.auth.signUp}
        className="whitespace-nowrap rounded-control bg-brand px-3 py-1.5 text-xs font-medium text-on-brand transition-colors duration-150 hover:bg-brand-strong"
        {...(onOpen ? { onOpen: () => onOpen('signUp') } : {})}
      />
    </span>
  )
}

/**
 * Ligne de déconnexion du menu.
 *
 * Rend `null` hors session — une déconnexion proposée à qui n'est pas connecté est
 * une action sans effet, et une entrée de menu sans effet finit par être cliquée.
 *
 * Comme le reste, elle sort avant tout appel de hook quand Clerk n'est pas
 * configuré : le composant interne porte les hooks, l'enveloppe porte la condition.
 */
export function SignOutRow({ onClose }: { onClose: () => void }) {
  if (!AUTH_ENABLED) return null
  return <ConnectedSignOutRow onClose={onClose} />
}

function ConnectedSignOutRow({ onClose }: { onClose: () => void }) {
  const { isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()

  if (!isLoaded || !isSignedIn) return null

  return (
    <div className="border-b border-border-subtle p-2">
      <button
        type="button"
        onClick={() => {
          onClose()
          // Retour à l'accueil : rester sur place renverrait une page personnelle
          // — tableau de bord, liste de suivi — dans son état « non connecté »,
          // ce qui ressemble à une perte de données plutôt qu'à une déconnexion.
          void signOut({ redirectUrl: '/' })
        }}
        className="flex w-full items-center gap-2.5 px-2 py-2 text-sm font-medium text-down transition-colors duration-150 hover:bg-down-soft"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        Déconnexion
      </button>
    </div>
  )
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
function AuthLink({
  href,
  label,
  className,
  onOpen,
}: {
  href: string
  label: string
  className: string
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
      className={className}
    >
      {label}
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
  const fr = useContent()
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
  const fr = useContent()
  const { isLoaded, user } = useUser()
  const { openUserProfile } = useClerk()

  // Réserve la hauteur pendant le chargement : sans cela, le menu se réorganise sous
  // le curseur au moment où Clerk répond.
  if (!isLoaded) return <span className="block h-9" aria-hidden="true" />

  if (user) {
    return (
      <div className="flex items-start gap-3">
        {/*
          AVATAR SIMPLE, et non le `<UserButton>` de Clerk.

          Celui-ci porte sa propre liste déroulante — profil, ajout de compte,
          déconnexion. Posé DANS notre tiroir, il ouvrait un second menu par-dessus le
          premier : deux panneaux superposés, aux styles différents, pour le même
          sujet. On garde donc l'avatar et l'on rebranche ses actions sur nos propres
          entrées, plus bas dans ce même tiroir.

          Ce qui n'est PAS réécrit : la gestion du compte elle-même. « Gérer le
          compte » ouvre l'écran de Clerk — profil, mot de passe, connexions tierces,
          double authentification. Réimplémenter cela ne gagnerait qu'un peu
          d'homogénéité visuelle, au prix de tout ce qui s'y rattache.
        */}
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar servi par Clerk, hors domaines optimisés
          <img
            src={user.imageUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-pill object-cover"
          />
        ) : (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-sm font-semibold text-brand-strong"
            aria-hidden="true"
          >
            {(user.fullName ?? user.username ?? '?').slice(0, 1).toUpperCase()}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {user.fullName ?? user.username ?? 'Mon compte'}
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {user.primaryEmailAddress?.emailAddress ?? ''}
          </span>
          <button
            type="button"
            onClick={() => {
              onClose()
              openUserProfile()
            }}
            className="mt-1 text-xs font-medium text-brand hover:underline"
          >
            Gérer le compte
          </button>
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
        className="flex-1 rounded-control border border-brand px-3 py-2 text-sm font-medium text-brand transition-colors duration-150 hover:bg-brand-soft"
      >
        {fr.auth.signUp}
      </button>
    </div>
  )
}
