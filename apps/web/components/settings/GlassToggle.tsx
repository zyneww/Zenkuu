'use client'

import { Sparkles } from 'lucide-react'

import { useSettings } from '@/lib/stores/settings'

/**
 * Interrupteur du mode Liquid Glass, avec son avertissement.
 *
 * ── POURQUOI UN INTERRUPTEUR ET NON UN QUATRIÈME BOUTON DE THÈME ──────────────
 *
 * Les trois boutons de thème sont EXCLUSIFS : clair, sombre ou système. Ranger le
 * verre parmi eux en aurait fait un quatrième choix exclusif, c'est-à-dire qu'on
 * aurait perdu le réglage clair/sombre en l'activant. Or le verre se combine avec
 * les deux — c'est une matière de surface, pas une clarté de fond. Un interrupteur
 * dit exactement cela : un réglage à part, qui s'ajoute au thème au lieu de le
 * remplacer.
 *
 * ── L'AVERTISSEMENT EST AFFICHÉ EN PERMANENCE ────────────────────────────────
 *
 * Pas seulement à l'activation, et pas derrière une icône d'information. Quelqu'un
 * qui rouvre ce menu six mois plus tard et voit son interface translucide sans se
 * rappeler pourquoi doit pouvoir relier l'un à l'autre immédiatement. Un
 * avertissement qu'il faut aller chercher n'avertit personne.
 *
 * Il dit ce qui peut arriver, en français courant, plutôt que « fonctionnalité
 * expérimentale » : le coût est réel et il est graphique — le navigateur refloute à
 * chaque image tout ce qui passe derrière les surfaces.
 */
export function GlassToggle() {
  const { glass, setGlass } = useSettings()

  return (
    <div className="px-1 pb-1">
      <button
        type="button"
        role="switch"
        aria-checked={glass}
        onClick={() => setGlass(!glass)}
        className={`flex w-full items-start gap-2.5 rounded-card border px-2 py-2 text-left transition-colors duration-150 ${
          glass
            ? 'border-brand bg-brand-soft'
            : 'border-transparent hover:bg-surface-muted'
        }`}
      >
        <Sparkles
          className={`mt-0.5 h-4 w-4 shrink-0 transition-colors duration-150 ${
            glass ? 'text-brand-strong' : 'text-ink-muted'
          }`}
          aria-hidden="true"
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`text-[0.8125rem] font-medium ${glass ? 'text-brand-strong' : 'text-ink'}`}
            >
              Liquid Glass
            </span>
            <span className="rounded bg-surface-muted px-1 py-px text-[0.5625rem] font-semibold uppercase tracking-wide text-ink-muted">
              Bêta
            </span>
          </span>
          <span className="mt-0.5 block text-[0.6875rem] leading-snug text-ink-muted">
            Surfaces translucides. Peut ralentir l’affichage sur les appareils anciens.
          </span>
        </span>

        {/*
          Rail et pastille dessinés à la main plutôt qu'une case à cocher native :
          celle-ci ne se met pas aux couleurs de la marque sans `appearance: none`,
          qui la vide de tout style et oblige à la redessiner de toute façon.

          `aria-hidden` sur le rail, `role="switch"` sur le bouton : l'information
          d'état passe par `aria-checked`, et l'annoncer deux fois la ferait lire
          deux fois.
        */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 ${
            glass ? 'bg-brand' : 'bg-surface-muted'
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full bg-canvas transition-transform duration-150 ${
              glass ? 'translate-x-3' : 'translate-x-0'
            }`}
          />
        </span>
      </button>
    </div>
  )
}
