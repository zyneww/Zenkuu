'use client'

import { useState } from 'react'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import {
  PreferenceOverlay,
  type PreferenceTab,
} from '@/components/settings/PreferenceOverlay'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'

/**
 * Préférences d'affichage, rappelées sur le tableau de bord.
 *
 * Elles vivent aussi dans le menu de l'en-tête. Le doublon est VOULU : le menu sert à
 * changer un réglage en passant, la page à savoir où l'on en est. Un tableau de bord
 * qui annoncerait « vos préférences sont conservées » sans jamais les montrer
 * demanderait d'ouvrir un tiroir pour vérifier une promesse qu'il vient de faire.
 *
 * ⚠️ CES RÉGLAGES SONT LOCAUX À L'APPAREIL, pas rattachés au compte. Ils vivent dans
 * le stockage du navigateur — les synchroniser supposerait de les écrire en base à
 * chaque bascule de thème. C'est écrit sous le bloc : sans cette phrase, retrouver
 * l'euro sur un second appareil après avoir choisi le dollar sur le premier passerait
 * pour une panne.
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

export function DashboardPreferences() {
  const [tab, setTab] = useState<PreferenceTab | null>(null)
  const { theme, language, setTheme } = useSettings()
  const { currency } = useCurrency()

  return (
    <section className="space-y-4" aria-labelledby="preferences-titre">
      <h2 id="preferences-titre" className="display-sm text-ink">
        Préférences d’affichage
      </h2>

      <dl className="divide-y divide-border-subtle rounded-card border border-border-subtle">
        <Row label="Langue">
          <button
            type="button"
            onClick={() => setTab('language')}
            className="text-sm font-medium text-brand hover:underline"
          >
            {LANGUAGE_LABELS[language] ?? 'Français'}
          </button>
        </Row>

        <Row label="Devise d’affichage">
          <button
            type="button"
            onClick={() => setTab('currency')}
            className="text-sm font-medium text-brand hover:underline"
          >
            {currency}
          </button>
        </Row>

        <Row label="Thème">
          <div
            className="flex items-center gap-0.5 rounded-card border border-border-subtle p-0.5"
            role="group"
            aria-label="Thème"
          >
            {THEMES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setTheme(entry.value)}
                aria-pressed={theme === entry.value}
                className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                  theme === entry.value
                    ? 'bg-brand text-on-brand'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </Row>
      </dl>

      <p className="text-xs leading-relaxed text-ink-muted">
        Ces réglages sont enregistrés sur cet appareil, dans votre navigateur — ils ne
        sont pas rattachés à votre compte et ne suivent donc pas d’un appareil à
        l’autre. Seule votre liste de suivi l’est.
      </p>

      <PreferenceOverlay tab={tab} onTabChange={setTab} onClose={() => setTab(null)} />
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-ink">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
