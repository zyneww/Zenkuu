'use client'

import { useEffect, useRef, useState } from 'react'
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

  /*
   * ── LA HAUTEUR EST MESURÉE, PAS DEVINÉE ──────────────────────────────────
   *
   * `scrollHeight` donne la hauteur que le contenu OCCUPERAIT sans le rognage. On la
   * pose en pixels, et la transition interpole entre deux longueurs — ce que tout
   * moteur anime, contrairement aux quatre formes essayées avant (voir la note de
   * `.collapse-height` dans globals.css).
   *
   * ⚠️ `undefined` TANT QU'ON N'A PAS MESURÉ, et non zéro. Au premier rendu serveur il
   * n'y a pas de DOM : une hauteur à zéro replierait le bandeau pour tout le monde
   * jusqu'à l'hydratation, y compris pour qui ne l'a jamais replié. `undefined` laisse
   * la hauteur à `auto`, donc déplié — le bon défaut.
   */
  const boite = useRef<HTMLDivElement>(null)
  const [hauteur, setHauteur] = useState<number | undefined>(undefined)

  useEffect(() => {
    const element = boite.current
    if (!element) return

    const mesurer = () => setHauteur(element.scrollHeight)
    mesurer()

    /* Le contenu du bandeau change — les courbes arrivent après le premier rendu, les
       montants se rafraîchissent toutes les trois minutes. Sans observateur, la
       hauteur mesurée au montage deviendrait fausse au premier rafraîchissement, et le
       bandeau se rognerait ou laisserait un vide. */
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

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
            /* MÊME durée que le bandeau, et non 150 ms. Deux gestes simultanés qui
               ne durent pas pareil se lisent comme un défaut : le chevron finissait
               sa rotation quand le bandeau était encore à mi-course. */
            className={`h-4 w-4 transition-transform duration-300 ease-[var(--ease-standard)] motion-reduce:transition-none ${
              statsBarCollapsed ? '-rotate-90' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Le dépliage s'anime vers la hauteur RÉELLE du contenu — voir
          `.collapse-height` dans globals.css, qui porte les trois tentatives qu'il a
          fallu pour y arriver et pourquoi les deux premières échouaient.

          `aria-hidden` quand c'est replié : la boîte fait zéro pixel mais le contenu
          reste dans le DOM, et un lecteur d'écran l'annoncerait encore. */}
      <div
        className="collapse-height"
        data-collapsed={statsBarCollapsed}
        aria-hidden={statsBarCollapsed}
        /* Replié : zéro. Déplié : la hauteur mesurée, ou `auto` tant qu'on ne l'a pas
           encore — voir la note ci-dessus sur le premier rendu. */
        style={{ height: statsBarCollapsed ? 0 : hauteur }}
      >
        <div ref={boite}>{children}</div>
      </div>
    </div>
  )
}
