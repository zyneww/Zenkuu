'use client'

import { ChevronRight, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { AUTH_ENABLED } from '@/lib/auth'
import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import { usePresence } from '@/components/nav/usePresence'
import { GlassToggle } from '@/components/settings/GlassToggle'
import { getLanguage } from '@/components/settings/languages'
import type { PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'

/**
 * Menu de réglages de l'en-tête — langue, devise, thème.
 *
 * ── TROIS RÉGLAGES, DEUX TRAITEMENTS ──────────────────────────────────────────
 *
 * Le thème se choisit ICI, en trois boutons : il n'a que trois valeurs, et les
 * montrer coûte moins de place qu'une ligne qui annoncerait laquelle est active.
 *
 * La langue et la devise, elles, RENVOIENT à la fenêtre de préférences. Elles ont
 * respectivement quatre et soixante-deux valeurs, groupées et cherchables — les
 * empiler dans un menu de 220 pixels reviendrait à refaire cette fenêtre en moins
 * bien. Le menu affiche donc le choix COURANT et ouvre l'écran complet d'un clic,
 * ce qui est aussi la façon dont la référence traite ce cas.
 *
 * ── POURQUOI PAS LE TIROIR EXISTANT ───────────────────────────────────────────
 *
 * `HeaderMenu` couvrait déjà ces trois réglages, mais il portait AUSSI le compte et
 * toute la navigation repliée. Un seul bouton pour trois sujets sans rapport oblige à
 * l'ouvrir pour savoir ce qu'il contient. La roue dentée annonce des réglages et ne
 * contient que cela.
 */

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Système', Icon: Monitor },
]

/**
 * Il cède la place à `AccountMenu` dès qu'une session existe.
 *
 * Les deux boutons ne doivent JAMAIS coexister : ils posent la même question au
 * lecteur (« mes réglages sont où ? ») et il faudrait ouvrir les deux pour savoir
 * lequel répond. `AccountMenu` reprend donc les trois réglages en plus du compte.
 *
 * Sans Clerk configuré, il n'y a pas de session possible : ce menu est le seul, et
 * la condition sort AVANT tout appel de hook — `useUser()` lève sans fournisseur.
 */
export function SettingsMenu({
  onOpenPreference,
}: {
  onOpenPreference: (tab: PreferenceTab) => void
}) {
  if (!AUTH_ENABLED) return <SettingsMenuPanel onOpenPreference={onOpenPreference} />
  return <SignedOutSettingsMenu onOpenPreference={onOpenPreference} />
}

function SignedOutSettingsMenu({
  onOpenPreference,
}: {
  onOpenPreference: (tab: PreferenceTab) => void
}) {
  const { isLoaded, isSignedIn } = useUser()

  // Avant résolution, on réserve la place : afficher la roue dentée puis la voir
  // remplacée par l'avatar ferait sauter l'en-tête à chaque chargement.
  if (!isLoaded) return <span className="h-9 w-9 shrink-0" aria-hidden="true" />
  if (isSignedIn) return null

  return <SettingsMenuPanel onOpenPreference={onOpenPreference} />
}

function SettingsMenuPanel({
  onOpenPreference,
}: {
  onOpenPreference: (tab: PreferenceTab) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { state, mounted, onTransitionEnd } = usePresence(open)

  /* Voir `AccountMenu` : le curseur qui s'éloigne referme le menu, au même titre que
     le clic extérieur et la touche Échap. */
  const hoverDismiss = useHoverDismiss(() => setOpen(false), open)

  const { language, theme, setTheme } = useSettings()
  const { currency } = useCurrency()

  // Fermeture au clic extérieur et à Échap — les deux réflexes attendus de tout menu.
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

  return (
    <div ref={rootRef} className="relative" {...hoverDismiss}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Réglages"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card border transition-colors duration-150 ${
          open
            ? 'border-brand bg-brand-soft text-brand-strong'
            : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
        }`}
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </button>

      {mounted ? (
        <div
          role="menu"
          aria-label="Réglages"
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          className="menu-panel absolute right-0 top-full z-50 mt-2 w-64 rounded-card border border-border-subtle bg-overlay shadow-overlay"
        >
          <div className="p-1.5">
            <PreferenceRow
              label="Langue"
              // Repli sur le code brut : une langue inconnue du catalogue reste
              // affichable, là où une chaîne vide ferait croire à un réglage absent.
              value={getLanguage(language)?.label ?? language.toUpperCase()}
              onClick={() => {
                setOpen(false)
                onOpenPreference('language')
              }}
            />
            <PreferenceRow
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
                      /* Voir `AccountMenu` : un choix pris referme le menu, sans quoi
                         le panneau masque la page dont on vient de changer le thème. */
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

            <GlassToggle />
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Ligne « réglage → valeur courante », qui ouvre l'écran complet.
 *
 * La valeur est affichée à droite plutôt que masquée derrière le clic : c'est la
 * question qu'on se pose en ouvrant ce menu — « suis-je bien en euros ? » — et y
 * répondre sans second clic est la moitié de l'intérêt.
 */
function PreferenceRow({
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
