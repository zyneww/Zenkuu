'use client'

import { usePhrase } from '@/components/locale/ContentProvider'
import { useState } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
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
  const t = usePhrase()
  const [tab, setTab] = useState<PreferenceTab | null>(null)
  const { theme, language, setTheme } = useSettings()
  const { currency } = useCurrency()

  return (
    <section className="space-y-4" aria-labelledby="preferences-titre">
      <h2 id="preferences-titre" className="display-sm text-ink">
        {t('Préférences d’affichage')}
      </h2>

      <dl className="divide-y divide-border-subtle rounded-card border border-border-subtle">
        {/* `variant="link"` : le bouton de shadcn/ui dans sa variante lien —
            sans fond ni bordure, souligné au survol. C'est exactement ce que ces deux
            valeurs étaient, écrit à la main. */}
        <Row label="Langue">
          <Button size="sm" variant="link" onClick={() => setTab('language')}>
            {LANGUAGE_LABELS[language] ?? 'Français'}
          </Button>
        </Row>

        <Row label="Devise d’affichage">
          <Button size="sm" variant="link" onClick={() => setTab('currency')}>
            {currency}
          </Button>
        </Row>

        <Row label="Thème">
          {/* Même contrôle segmenté qu'à la page de réglages — voir
              `SettingsPreferences` pour ce que `ButtonGroup` apporte au clavier. Le
              doublon de RENDU disparaît ici : les deux pages partagent désormais le
              même composant, non deux copies d'une même chaîne de classes. */}
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            aria-label={t('Thème')}
            value={String(theme)}
            onValueChange={(next) => {
              /* Radix n'a pas de `disallowEmptySelection` : recliquer l'option
                 active rappelle avec la CHAÎNE VIDE. Ce réglage n'a pas d'état
                 « aucun » — on ignore donc ce cas plutôt que de laisser le
                 contrôle devenir muet sur une valeur qui, elle, n'a pas bougé. */
              if (next) setTheme(next as ThemeMode)
            }}
          >
            {THEMES.map((entry) => (
              <ToggleGroupItem key={entry.value} value={String(entry.value)}>
                {entry.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>
      </dl>

      <p className="text-xs leading-relaxed text-ink-muted">
        {t('Ces réglages sont enregistrés sur cet appareil, dans votre navigateur — ils ne sont pas rattachés à votre compte et ne suivent donc pas d’un appareil à l’autre. Seule votre liste de suivi l’est.')}
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
