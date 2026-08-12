'use client'

import { ChevronDown, ChevronRight, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import { usePresence } from '@/components/nav/usePresence'
import { GlassToggle } from '@/components/settings/GlassToggle'
import { getLanguage } from '@/components/settings/languages'
import type { PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { AUTH_ENABLED } from '@/lib/auth'
import { BILLING_ENABLED, PRO_PLAN } from '@/lib/billing'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'

/**
 * Menu de compte — remplace la roue dentée une fois le visiteur connecté.
 *
 * ── IL ABSORBE LES RÉGLAGES PLUTÔT QUE DE COHABITER AVEC EUX ──────────────────
 *
 * Connecté, l'en-tête n'a plus qu'UN bouton à droite : celui-ci. Il porte donc les
 * trois réglages en plus du compte, ce qui double `SettingsMenu` — et c'est le bon
 * compromis. L'alternative aurait été de garder les deux boutons côte à côte, mais
 * la roue dentée et l'avatar posent la même question au lecteur (« mes affaires sont
 * où ? ») et il faudrait ouvrir les deux pour savoir lequel répond.
 *
 * ── CE QUI N'EST PAS RÉÉCRIT ──────────────────────────────────────────────────
 *
 * « Gérer le compte » ouvre l'écran de Clerk — profil, mot de passe, connexions
 * tierces, double authentification. Le refaire ne gagnerait qu'un peu d'homogénéité
 * visuelle, au prix de tout ce qui s'y rattache.
 *
 * ── L'ENVELOPPE ET LE COMPOSANT INTERNE ───────────────────────────────────────
 *
 * `useUser()` lève sans `<ClerkProvider>`. La condition est donc lue AVANT tout appel
 * de hook, et les hooks vivent dans le composant interne — même découpage que
 * `AuthButtons` et `ProGate`.
 */

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Système', Icon: Monitor },
]

export function AccountMenu({
  onOpenPreference,
}: {
  onOpenPreference: (tab: PreferenceTab) => void
}) {
  if (!AUTH_ENABLED) return null
  return <ConnectedAccountMenu onOpenPreference={onOpenPreference} />
}

function ConnectedAccountMenu({
  onOpenPreference,
}: {
  onOpenPreference: (tab: PreferenceTab) => void
}) {
  const { isLoaded, isSignedIn, user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { language, theme, setTheme } = useSettings()
  const { currency } = useCurrency()

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { state, mounted, onTransitionEnd } = usePresence(open)

  /* Troisième voie de sortie, à côté du clic extérieur et d'Échap : le curseur qui
     s'éloigne. C'est le geste qu'on fait naturellement quand on a fini de lire un
     menu, et ne rien en faire oblige à revenir cliquer ailleurs pour s'en débarrasser. */
  const hoverDismiss = useHoverDismiss(() => setOpen(false), open)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Hors session, ce composant n'a rien à dire : c'est `SettingsMenu` qui prend le
  // relais, décidé par la barre de navigation.
  if (!isLoaded || !isSignedIn || !user) return null

  const name = user.fullName ?? user.username ?? 'Mon compte'
  const email = user.primaryEmailAddress?.emailAddress ?? ''
  const initial = name.slice(0, 1).toUpperCase()

  return (
    <div ref={rootRef} className="relative" {...hoverDismiss}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-9 shrink-0 items-center gap-2 rounded-card border px-2 transition-colors duration-150 ${
          open
            ? 'border-brand bg-brand-soft'
            : 'border-border-subtle hover:border-brand'
        }`}
      >
        <Avatar imageUrl={user.imageUrl} initial={initial} size={22} />
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-ink sm:block">
          {name}
        </span>
        <PlanBadge />
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-ink-muted transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {mounted ? (
        <div
          role="menu"
          aria-label="Compte et réglages"
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          className="menu-panel absolute right-0 top-full z-50 mt-2 w-72 rounded-card border border-border-subtle bg-overlay shadow-overlay"
        >
          <div className="flex items-start gap-3 border-b border-border-subtle p-3">
            <Avatar imageUrl={user.imageUrl} initial={initial} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{name}</span>
              {email ? (
                <span className="block truncate text-xs text-ink-muted">{email}</span>
              ) : null}
            </span>
          </div>

          <div className="p-1.5">
            <MenuRow
              label="Gérer le compte"
              Icon={Settings}
              onClick={() => {
                setOpen(false)
                openUserProfile()
              }}
            />
          </div>

          <div className="border-t border-border-subtle p-1.5">
            <ValueRow
              label="Langue"
              value={getLanguage(language)?.label ?? language.toUpperCase()}
              onClick={() => {
                setOpen(false)
                onOpenPreference('language')
              }}
            />
            <ValueRow
              label="Devise"
              value={currency.toUpperCase()}
              onClick={() => {
                setOpen(false)
                onOpenPreference('currency')
              }}
            />
          </div>

          <div className="border-t border-border-subtle p-1.5">
            <p className="px-2 py-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-ink-muted">
              Thème
            </p>
            <div className="flex gap-1 px-1 pb-1">
              {THEME_OPTIONS.map((option) => {
                const active = option.value === theme
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setTheme(option.value)
                      /* Un choix pris referme le menu, comme les lignes « Langue »
                         et « Devise » au-dessus. Le thème repeint la PAGE, que ce
                         panneau recouvre en partie : rester ouvert cacherait
                         précisément ce que l'on vient de demander à voir. */
                      setOpen(false)
                    }}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-control border px-2 py-2 text-[0.6875rem] font-medium transition-colors duration-150 ${
                      active
                        ? 'border-brand bg-brand-soft text-brand-strong'
                        : 'border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink'
                    }`}
                  >
                    <option.Icon className="h-4 w-4" aria-hidden="true" />
                    {option.label}
                  </button>
                )
              })}
            </div>

            {/* Sous les thèmes et non parmi eux : le verre s'AJOUTE au thème choisi,
                il ne s'y substitue pas. Voir l'en-tête de `GlassToggle`. */}
            <GlassToggle />
          </div>

          <div className="border-t border-border-subtle p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                // Retour à l'accueil : rester sur place renverrait une page
                // personnelle — tableau de bord, liste de suivi — dans son état
                // « non connecté », ce qui ressemble à une perte de données.
                void signOut({ redirectUrl: '/' })
              }}
              className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-sm font-medium text-down transition-colors duration-150 hover:bg-down-soft"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Déconnexion
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Pastille d'OFFRE — « Free » ou « Pro », jamais rien.
 *
 * ── ELLE NE S'EFFACE PLUS ─────────────────────────────────────────────────────
 *
 * Elle ne s'allumait qu'aux abonnés, et l'absence portait alors l'information : pas
 * de pastille, donc offre gratuite. C'est une lecture que personne ne fait. Un blanc
 * ne se remarque pas, et surtout il ne se distingue pas d'un chargement en cours ou
 * d'un défaut d'affichage — un abonné qui ne voit rien se demande légitimement si son
 * paiement a été pris en compte. Nommer les deux états supprime la question.
 *
 * ── DEUX COULEURS, PARCE QU'ELLES DISENT DEUX CHOSES ──────────────────────────
 *
 * « Free » est un ÉTAT : vert de statut, celui qui ne veut rien dire d'autre que
 * « en cours de validité » (voir `--color-status` dans globals.css). « Pro » est une
 * OFFRE, et le système lui a déjà donné une couleur — l'or de `accent`, celui de la
 * couronne du bouton d'abonnement. Les peindre du même vert reviendrait à faire de
 * l'abonnement un simple état, et à effacer le seul repère visuel qui distingue
 * aujourd'hui ce qui est vendu de ce qui ne l'est pas.
 *
 * ── CE QUE « FREE » SIGNIFIE QUAND LA BOUTIQUE N'EXISTE PAS ───────────────────
 *
 * Sans facturation configurée, `has()` renvoie faux et la pastille affiche « Free ».
 * C'est littéralement exact — aucun abonnement n'existe — même si `<ProGate>` ouvre
 * alors les fonctions à tout le monde. L'inverse, masquer la pastille, ramènerait le
 * blanc ambigu qu'on vient de supprimer.
 *
 * `useAuth()` est appelé INCONDITIONNELLEMENT, comme la règle des hooks l'exige. Ce
 * composant n'est rendu que depuis `ConnectedAccountMenu`, lui-même gardé par
 * `AUTH_ENABLED` : le fournisseur Clerk est donc toujours au-dessus.
 */
function PlanBadge() {
  const { isLoaded, has } = useAuth()

  // Avant résolution, on ne rend RIEN plutôt que « Free » : afficher l'offre gratuite
  // puis la corriger en « Pro » ferait clignoter le mot à chaque chargement de page,
  // et sous les yeux de la seule personne que cela froisse.
  if (!isLoaded) return null

  const isPro = BILLING_ENABLED && has?.({ plan: PRO_PLAN }) === true

  return (
    <span
      className={`shrink-0 rounded-pill px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${
        isPro ? 'bg-accent-soft text-accent-strong' : 'bg-status-soft text-status'
      }`}
    >
      {isPro ? 'Pro' : 'Free'}
    </span>
  )
}

function Avatar({
  imageUrl,
  initial,
  size,
}: {
  imageUrl?: string
  initial: string
  size: number
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar servi par Clerk, hors domaines optimisés
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-pill object-cover"
      />
    )
  }

  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-pill bg-brand-soft text-xs font-semibold text-brand-strong"
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

function MenuRow({
  label,
  Icon,
  onClick,
}: {
  label: string
  Icon: typeof Settings
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-card px-2 py-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
    >
      <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
      {label}
    </button>
  )
}

function ValueRow({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-card px-2 py-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
    >
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs text-ink-muted">{value}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
    </button>
  )
}
