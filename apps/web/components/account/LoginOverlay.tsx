'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

import { LoginForm } from '@/components/account/LoginForm'

/**
 * Fenêtre de connexion — la COQUE, plus le formulaire.
 *
 * ── CE QUI A QUITTÉ CE FICHIER ────────────────────────────────────────────────
 *
 * Toute la mécanique du code à six chiffres vit désormais dans `LoginForm` : la
 * connexion se fait aussi depuis un panneau déroulant de l'en-tête, où une modale
 * plein écran serait disproportionnée. Ne restent ici que le voile, le cadre et la
 * croix de fermeture.
 *
 * ── QUI OUVRE ENCORE CETTE FENÊTRE ────────────────────────────────────────────
 *
 * La page de paramètres, et elle seule. L'en-tête ne l'appelle plus — son bouton de
 * compte déroule le formulaire sous lui. La modale reste justifiée sur `/parametres` :
 * elle y est déclenchée depuis le corps de la page, où il n'y a pas de bouton auquel
 * ancrer un panneau flottant.
 */
export function LoginOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto px-4 py-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Connexion"
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-canvas/80 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-card border border-border-subtle bg-overlay p-6 shadow-overlay">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <LoginForm visible={open} />
      </div>
    </div>
  )
}
