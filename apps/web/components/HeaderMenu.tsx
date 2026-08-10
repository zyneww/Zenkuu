'use client'

import { ChevronRight, LayoutDashboard, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

import type { AuthMode } from '@/components/auth/AuthOverlay'
import type { PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { useCurrency } from '@/components/locale/CurrencyProvider'
import { AccountSection, SignOutRow } from '@/components/auth/AuthButtons'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'
import { NAV_MENUS } from '@/content/navigation'
import { fr } from '@/content/fr'

/**
 * Menu de l'en-tête — compte, réglages, et navigation sur petit écran.
 *
 * ── UN SEUL BOUTON, PAS DEUX ───────────────────────────────────────────────────
 *
 * L'en-tête portait auparavant une roue dentée (réglages) ET, sur mobile, un
 * hamburger (navigation). Deux icônes voisines pour deux tiroirs, sans que rien
 * n'indique lequel contient quoi. Elles fusionnent ici.
 *
 * La navigation n'apparaît QUE sous le seuil où la barre de menus est masquée : sur
 * grand écran, elle est déjà dans l'en-tête, et la répéter allongerait le tiroir de
 * trente entrées inutiles.
 *
 * ── POURQUOI LES LANGUES ET DEVISES N'OUVRENT PAS UN SOUS-MENU ─────────────────
 *
 * Elles ouvrent une FENÊTRE, pas un second niveau dans ce tiroir. Un tiroir de 320
 * pixels de large ne peut pas présenter une grille de cinq devises et huit langues
 * sans les réduire à une colonne à défilement — or ces listes se parcourent du regard,
 * pas au doigt. La fenêtre leur donne la largeur qu'elles demandent.
 */

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Système' },
]

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
}

export function HeaderMenu({
  open,
  onClose,
  onOpenAuth,
  onOpenPreference,
}: {
  open: boolean
  onClose: () => void
  onOpenAuth: (mode: AuthMode) => void
  onOpenPreference: (tab: PreferenceTab) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { theme, language, setTheme } = useSettings()
  const { currency } = useCurrency()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /*
   * Fermeture au clic extérieur, posée sur `mousedown` et non `click`.
   *
   * Avec `click`, un bouton qui disparaît sous le curseur pendant la pression fait
   * avorter l'événement : le menu resterait ouvert une fois sur deux.
   */
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="absolute right-4 top-full z-[95] max-h-[80vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto border border-border-subtle bg-overlay shadow-overlay"
      role="menu"
      aria-label={fr.nav.openMenu}
    >
      {/* ── Compte ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle p-4">
        <AccountSection onOpenAuth={onOpenAuth} onClose={onClose} />
      </div>

      <div className="border-b border-border-subtle p-2">
        <Link
          href="/tableau-de-bord"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2 py-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          Tableau de bord
        </Link>

        {/* « Paramètres » remplace « Ajouter un compte » du menu d'origine. Le
            multi-compte est une fonction de plateforme d'entreprise ; sur un site de
            lecture de marché, personne ne jongle entre deux identités. */}
        <Link
          href="/parametres"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2 py-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
        >
          <Settings className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          Paramètres
        </Link>
      </div>

      {/* ── Réglages d'affichage ────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle p-2">
        <PreferenceRow
          label="Langue"
          value={LANGUAGE_LABELS[language] ?? 'Français'}
          onClick={() => {
            onClose()
            onOpenPreference('language')
          }}
        />
        <PreferenceRow
          label="Devise"
          value={currency}
          onClick={() => {
            onClose()
            onOpenPreference('currency')
          }}
        />

        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <span className="text-sm text-ink">Thème</span>
          <div
            className="flex items-center gap-0.5 border border-border-subtle p-0.5"
            role="group"
            aria-label="Thème"
          >
            {THEMES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setTheme(entry.value)}
                aria-pressed={theme === entry.value}
                className={`px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                  theme === entry.value
                    ? 'bg-brand text-on-brand'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Déconnexion ─────────────────────────────────────────────────────── */}
      <SignOutRow onClose={onClose} />

      {/* ── Navigation, SOUS LE SEUIL seulement ─────────────────────────────── */}
      <div className="p-2 lg:hidden">
        {NAV_MENUS.map((menu) => (
          <section key={menu.label} className="mb-3 last:mb-0">
            <h3 className="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted">
              {menu.label}
            </h3>
            <ul>
              {menu.sections.flatMap((section) =>
                section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={`${menu.label}-${item.label}`}>
                      {item.ready && item.href ? (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                          {item.label}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-ink-muted opacity-60">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {item.label}
                        </span>
                      )}
                    </li>
                  )
                }),
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

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
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-muted"
    >
      <span className="text-sm text-ink">{label}</span>
      <span className="flex items-center gap-1 text-sm text-ink-muted">
        {value}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  )
}
