'use client'

import { Globe } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
      {/* `Button` de shadcn/ui en `outline`, taille `sm` — 32 pixels de haut, le seuil
          sous lequel une cible se rate au doigt, ce que le `min-h-9` d'avant devait
          forcer à la main sur un bouton qui n'en faisait que 30. Celui-ci ouvre les
          préférences : le manquer envoie le lecteur au hasard dans le pied de page.

          AUCUNE MARGE ICI. Le badge en portait une (`mt-4`), héritée du temps où il se
          posait sous le bloc de marque ; il vit désormais dans la barre du bas du pied,
          alignée sur une ligne, où quatre pixels de retrait le décalaient seul vers le
          bas. L'espacement appartient au parent, qui sait ce qu'il y a autour — pas au
          bouton, qui ne le sait pas.

          `hint` passait par un `title`, qui n'existe ni au clavier ni au doigt. Il
          passe maintenant par le `Tooltip` de shadcn/ui, qui s'ouvre au survol ET au
          focus — l'explication devient réellement atteignable.

          ⚠️ `asChild` sur le déclencheur : sans lui, Radix rendrait son propre
          `<button>` autour du nôtre, ce que le HTML interdit. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="outline" onClick={() => setTab('language')}>
            <Globe />
            {LANGUAGE_LABELS[language] ?? 'Français'} · {currency}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{hint}</TooltipContent>
      </Tooltip>

      <PreferenceOverlay tab={tab} onTabChange={setTab} onClose={() => setTab(null)} />
    </>
  )
}
