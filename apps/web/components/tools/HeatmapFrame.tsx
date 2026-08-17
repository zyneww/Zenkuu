'use client'

import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * CADRE PLEIN ÉCRAN D'UNE CARTE THERMIQUE.
 *
 * ── POURQUOI LE PLEIN ÉCRAN COMPTE ICI PLUS QU'AILLEURS ─────────────────────
 *
 * Une carte thermique est la seule figure du site dont la LISIBILITÉ dépend
 * directement de sa surface. Un graphique de cours reste lisible à toute taille — il
 * a deux axes et une courbe. Une carte de cent tuiles, non : à 640 pixels de haut, la
 * moitié des tuiles n'a plus la place d'afficher son montant, et le tiers inférieur du
 * classement devient une mosaïque anonyme.
 *
 * Le plein écran n'ajoute donc pas du confort, il rend visible une donnée qui était
 * déjà là et qu'on ne pouvait pas lire.
 *
 * ── L'ÉTAT SUIT LE DOCUMENT, IL NE LE COMMANDE PAS ──────────────────────────
 *
 * Même raisonnement que pour la carte macroéconomique : on sort du plein écran par
 * Échap, par le bouton du navigateur ou en changeant d'onglet — trois chemins que
 * notre bouton ne voit pas. Un booléen posé au clic finirait désynchronisé.
 */
export function HeatmapFrame({
  children,
  tools,
}: {
  children: React.ReactNode
  /** Contrôles posés à gauche du bouton de plein écran. */
  tools?: React.ReactNode
}) {
  const [fullscreen, setFullscreen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function sync() {
      setFullscreen(document.fullscreenElement === ref.current)
    }

    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  return (
    <div
      ref={ref}
      /*
       * `bg-canvas` explicite ET `flex-col` : en plein écran, l'élément est extrait de
       * son contexte, le navigateur peint un fond noir par défaut, et la hauteur
       * `min(78vh, 640px)` de la figure ne remplirait plus l'écran.
       *
       * `[&>*:last-child]:!h-full` force la figure à occuper la place restante SANS
       * que celle-ci ait à connaître son cadre : elle garde sa hauteur bornée en
       * lecture normale, et s'étire seulement une fois le plein écran demandé.
       */
      className="relative flex flex-col data-[fullscreen=true]:h-screen data-[fullscreen=true]:bg-canvas data-[fullscreen=true]:p-3 data-[fullscreen=true]:[&>*:last-child]:!h-full"
      data-fullscreen={fullscreen}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        {tools}

        <button
          type="button"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen()
            else void ref.current?.requestFullscreen()
          }}
          aria-label={fullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'}
          title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-subtle bg-surface text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          {fullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {children}
    </div>
  )
}
