'use client'

import { useState } from 'react'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import {
  PreferenceOverlay,
  type PreferenceTab,
} from '@/components/settings/PreferenceOverlay'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'

/**
 * Rubrique « Préférences ».
 *
 * Chaque réglage est présenté en LIGNE, avec sa valeur à droite et une phrase qui dit
 * ce qu'il change réellement. La référence se contente d'un intitulé ; ici, « Devise
 * d'affichage » sans précision laisserait croire que le site cote nativement dans la
 * devise choisie, alors qu'il convertit depuis l'euro au taux BCE. La phrase n'est pas
 * de la pédagogie : elle empêche une lecture fausse.
 */

const THEMES: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'light', label: 'Clair', hint: 'Toujours clair' },
  { value: 'dark', label: 'Sombre', hint: 'Toujours sombre' },
  { value: 'system', label: 'Système', hint: 'Suit votre appareil' },
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

export function SettingsPreferences() {
  const [tab, setTab] = useState<PreferenceTab | null>(null)
  const { theme, language, setTheme } = useSettings()
  const { currency } = useCurrency()

  return (
    <section className="space-y-6" aria-labelledby="preferences-titre">
      <div className="space-y-1">
        <h2 id="preferences-titre" className="display-sm text-ink">
          Préférences
        </h2>
        <p className="text-sm text-ink-muted">
          Ces réglages sont enregistrés dans ce navigateur, sur cet appareil.
        </p>
      </div>

      <div className="divide-y divide-border-subtle rounded-card border border-border-subtle">
        <Row
          label="Langue"
          /* Le texte affirmait « seul le français est traduit », ce qui est faux depuis
             que treize langues le sont. Il ne parle donc plus d'un nombre — qui se
             périmerait à nouveau au prochain ajout — mais de la RÈGLE : une langue
             traduite change l'interface, une autre enregistre seulement la préférence.
             Cette règle-là, elle, ne bougera pas. */
          description="Les langues traduites changent l’interface ; les autres enregistrent votre préférence en attendant leur traduction. Le sélecteur signale lesquelles le sont."
        >
          <button
            type="button"
            onClick={() => setTab('language')}
            className="rounded-control border border-border-subtle px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-brand hover:text-brand-strong"
          >
            {LANGUAGE_LABELS[language] ?? 'Français'}
          </button>
        </Row>

        <Row
          label="Devise d’affichage"
          description="Les cours sont convertis depuis leur devise de cotation au taux de référence BCE, dont la date est rappelée sous chaque montant. Une conversion n’est pas un cours coté."
        >
          <button
            type="button"
            onClick={() => setTab('currency')}
            className="rounded-control border border-border-subtle px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-brand hover:text-brand-strong"
          >
            {currency}
          </button>
        </Row>

        <Row
          label="Thème"
          description="« Système » suit le réglage de votre appareil, y compris sa bascule automatique le soir."
        >
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
                title={entry.hint}
                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
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
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        Ces trois réglages ne sont pas rattachés à votre compte : ils ne suivent donc
        pas d’un appareil à l’autre. Seule votre liste de suivi est synchronisée.
      </p>

      <PreferenceOverlay tab={tab} onTabChange={setTab} onClose={() => setTab(null)} />
    </section>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 sm:max-w-md">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
