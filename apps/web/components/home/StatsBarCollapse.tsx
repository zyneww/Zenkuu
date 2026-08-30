'use client'

import { ChevronDown } from 'lucide-react'

import { usePhrase } from '@/components/locale/ContentProvider'
import { useSettings } from '@/lib/stores/settings'

/**
 * Commutateur afficher/masquer autour du bandeau de repères du marché.
 *
 * ── LE MÉCANISME DE PERSISTANCE EST CELUI DÉJÀ EN PLACE, PAS UN NOUVEAU ──────────
 *
 * Le réglage rejoint `useSettings` (`zustand/persist`, clé `zenkuu-settings`), comme
 * le thème, la devise ou la largeur des fiches. Voir `lib/stores/settings.ts` pour la
 * raison pour laquelle ce réglage-ci NE PASSE PAS par le script d'amorçage qui évite
 * le flash de thème : replier le bandeau ne fait pas sauter la mise en page.
 *
 * ── LA CIBLE TACTILE ──────────────────────────────────────────────────────────
 *
 * 32×32 px (`h-8 w-8`), le plancher du projet — vérifié par `audit-responsive.mjs`.
 */
export function StatsBarCollapse({
  label,
  children,
}: {
  /** Nom du bandeau, pour l'étiquette accessible du bouton. */
  label: string
  children: React.ReactNode
}) {
  const t = usePhrase()
  const { statsBarCollapsed, setStatsBarCollapsed } = useSettings()

  return (
    <div>
      <div className="flex justify-end pb-1">
        <button
          type="button"
          onClick={() => setStatsBarCollapsed(!statsBarCollapsed)}
          aria-expanded={!statsBarCollapsed}
          aria-label={
            statsBarCollapsed
              ? t('Afficher {bandeau}').replace('{bandeau}', label)
              : t('Masquer {bandeau}').replace('{bandeau}', label)
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${
              statsBarCollapsed ? '-rotate-90' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {statsBarCollapsed ? null : children}
    </div>
  )
}
