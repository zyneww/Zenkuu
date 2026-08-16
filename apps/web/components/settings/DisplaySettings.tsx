'use client'

import { ChevronRight, Monitor, Moon, Sun } from 'lucide-react'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { GlassToggle } from '@/components/settings/GlassToggle'
import { getLanguage } from '@/components/settings/languages'
import type { PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'

/**
 * Les réglages d'affichage — langue, devise, thème, verre dépoli.
 *
 * ── D'OÙ CE BLOC VIENT, ET POURQUOI IL A DÉMÉNAGÉ ─────────────────────────────
 *
 * Il occupait une roue dentée à lui, entre la recherche et le compte. Trois boutons
 * se suivaient donc dans l'en-tête, et le premier était le seul dont l'icône ne dît
 * rien de ce qu'elle ouvrait : un engrenage annonce « des réglages », sans préciser
 * lesquels ni les distinguer de ceux du compte, qui portait aussi ce mot.
 *
 * La question posée aux deux boutons était en réalité la même — « où sont mes
 * réglages ? » — et il fallait ouvrir les deux pour y répondre. Ils fusionnent donc.
 * L'en-tête garde deux entrées, recherche et compte, chacune sans ambiguïté.
 *
 * Le bloc est un COMPOSANT et non du balisage recopié : il sert le panneau du visiteur
 * anonyme comme celui du visiteur connecté, qui n'ont en commun que lui.
 *
 * ── TROIS RÉGLAGES, DEUX TRAITEMENTS ──────────────────────────────────────────
 *
 * Le thème se choisit ICI, en trois boutons : il n'a que trois valeurs, et les montrer
 * coûte moins de place qu'une ligne qui annoncerait laquelle est active.
 *
 * La langue et la devise, elles, RENVOIENT à la fenêtre de préférences. Elles ont
 * respectivement quatre et soixante-deux valeurs, groupées et cherchables — les
 * empiler dans un menu de 288 pixels reviendrait à refaire cette fenêtre en moins
 * bien. Le bloc affiche donc le choix COURANT et ouvre l'écran complet d'un clic, ce
 * qui est aussi la façon dont la référence traite ce cas.
 */

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Système', Icon: Monitor },
]

export function DisplaySettings({
  onOpenPreference,
  onNavigate,
}: {
  onOpenPreference: (tab: PreferenceTab) => void
  /**
   * Referme le panneau qui contient ce bloc.
   *
   * Appelé sur TOUT choix, y compris le thème : sans cela, le panneau masque la page
   * dont on vient de changer les couleurs, c'est-à-dire précisément ce qu'on voulait
   * regarder. Le verre dépoli fait exception — il s'apprécie justement sur le panneau
   * lui-même, qui est une surface translucide.
   */
  onNavigate: () => void
}) {
  const { language, theme, setTheme } = useSettings()
  const { currency } = useCurrency()

  return (
    <>
      <div className="p-1.5">
        <PreferenceRow
          label="Langue"
          // Repli sur le code brut : une langue inconnue du catalogue reste affichable,
          // là où une chaîne vide ferait croire à un réglage absent.
          value={getLanguage(language)?.label ?? language.toUpperCase()}
          onClick={() => {
            onNavigate()
            onOpenPreference('language')
          }}
        />
        <PreferenceRow
          label="Devise"
          value={currency.toUpperCase()}
          onClick={() => {
            onNavigate()
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
                  onNavigate()
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
    </>
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
