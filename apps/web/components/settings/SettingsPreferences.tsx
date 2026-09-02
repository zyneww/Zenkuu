'use client'

import { useState } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { useCurrency } from '@/components/locale/CurrencyProvider'
import {
  PreferenceOverlay,
  type PreferenceTab,
} from '@/components/settings/PreferenceOverlay'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Rubrique « Préférences ».
 *
 * Chaque réglage est présenté en LIGNE, avec sa valeur à droite et une phrase qui dit
 * ce qu'il change réellement. La référence se contente d'un intitulé ; ici, « Devise
 * d'affichage » sans précision laisserait croire que le site cote nativement dans la
 * devise choisie, alors qu'il convertit depuis l'euro au taux BCE. La phrase n'est pas
 * de la pédagogie : elle empêche une lecture fausse.
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

export function SettingsPreferences() {
  const t = usePhrase()
  const [tab, setTab] = useState<PreferenceTab | null>(null)
  const { theme, language, setTheme } = useSettings()
  const { currency } = useCurrency()

  return (
    <section className="space-y-6" aria-labelledby="preferences-titre">
      <div className="space-y-1">
        <h2 id="preferences-titre" className="display-sm text-ink">{t('Préférences')}</h2>
        <p className="text-sm text-ink-muted">{t('Ces réglages sont enregistrés dans ce navigateur, sur cet appareil.')}</p>
      </div>

      <div className="divide-y divide-border-subtle rounded-card border border-border-subtle">
        <Row
          label={t('Langue')}
          /* Le texte affirmait « seul le français est traduit », ce qui est faux depuis
             que treize langues le sont. Il ne parle donc plus d'un nombre — qui se
             périmerait à nouveau au prochain ajout — mais de la RÈGLE : une langue
             traduite change l'interface, une autre enregistre seulement la préférence.
             Cette règle-là, elle, ne bougera pas. */
          description={t('Les langues traduites changent l’interface ; les autres enregistrent votre préférence en attendant leur traduction. Le sélecteur signale lesquelles le sont.')}
        >
          {/* `Button` de shadcn/ui en `outline` : le même bouton bordé, mais avec
              l'anneau de focus et l'état de survol du système plutôt qu'une chaîne de
              classes recopiée trois fois sur cette page. */}
          <Button size="sm" variant="outline" onClick={() => setTab('language')}>
            {LANGUAGE_LABELS[language] ?? 'Français'}
          </Button>
        </Row>

        <Row
          label={t('Devise d’affichage')}
          description={t('Les cours sont convertis depuis leur devise de cotation au taux de référence BCE, dont la date est rappelée sous chaque montant. Une conversion n’est pas un cours coté.')}
        >
          <Button size="sm" variant="outline" onClick={() => setTab('currency')}>
            {currency}
          </Button>
        </Row>

        <Row
          label={t('Thème')}
          description={t('« Système » suit le réglage de votre appareil, y compris sa bascule automatique le soir.')}
        >
          {/* `ToggleGroup` — le contrôle segmenté de shadcn/ui, monté sur celui de
              Radix. Il apporte ce que trois `<button
              aria-pressed>` indépendants ne donnaient pas : les flèches
              directionnelles, Origine/Fin, et un groupe que la synthèse vocale annonce
              comme un seul choix à trois options.

              Le thème n'a pas d'état « aucun » — recliquer l'option active la
              désélectionnait, laissant le contrôle muet sur un réglage qui, lui,
              n'avait pas bougé. Voir le garde posé dans `onValueChange`. */}
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
            {/* ⚠️ L'INDICE DE SURVOL A DISPARU, et ce n'est pas une perte. Un
                `title=""` n'existe ni au clavier ni au doigt, et les trois indices
                (« Toujours clair », « Suit votre appareil ») ne disaient de toute
                façon rien que la phrase de la ligne ne dise déjà, elle, à tout le
                monde. */}
            {THEMES.map((entry) => (
              <ToggleGroupItem key={entry.value} value={String(entry.value)}>
                {entry.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">{t('Ces trois réglages ne sont pas rattachés à votre compte : ils ne suivent donc pas d’un appareil à l’autre. Seule votre liste de suivi est synchronisée.')}</p>

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
