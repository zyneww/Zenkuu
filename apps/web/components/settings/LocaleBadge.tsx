'use client'

import { Globe } from 'lucide-react'
import { useState } from 'react'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import {
  PreferenceOverlay,
  type PreferenceTab,
} from '@/components/settings/PreferenceOverlay'
import { useSettings } from '@/lib/stores/settings'

/**
 * Badge de langue et devise, en pied de page.
 *
 * ⚠️ IL AFFICHAIT UNE MENTION FIGÉE — « Français · EUR » écrite en dur. C'était
 * défendable tant qu'aucun sélecteur n'existait : mieux vaut une mention qu'un menu
 * qui n'ouvre rien. Ça ne l'est plus depuis qu'on peut réellement changer de devise :
 * le badge annonçait EUR à quelqu'un dont tous les montants s'affichaient en dollars.
 * Une mention fausse est pire qu'une absence de mention.
 *
 * Il lit donc l'état réel, et devient le raccourci que sa forme promettait déjà.
 */

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

export function LocaleBadge({ hint }: { hint: string }) {
  const [tab, setTab] = useState<PreferenceTab | null>(null)
  const { language } = useSettings()
  const { currency } = useCurrency()

  return (
    <>
      <button
        type="button"
        onClick={() => setTab('language')}
        title={hint}
        className="mt-4 inline-flex items-center gap-1.5 border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {LANGUAGE_LABELS[language] ?? 'Français'} · {currency}
      </button>

      <PreferenceOverlay tab={tab} onTabChange={setTab} onClose={() => setTab(null)} />
    </>
  )
}
