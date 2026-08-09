'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Bouton de copie d'une valeur technique — typiquement une adresse de contrat.
 *
 * La confirmation est VISUELLE et TEXTUELLE : l'icône bascule en coche, et un
 * `role="status"` en lecture d'écran seule annonce la copie. Sans le second, un
 * utilisateur non voyant n'a aucun retour — le presse-papiers est silencieux.
 *
 * Le minuteur est nettoyé au démontage : sans cela, un composant retiré pendant les
 * deux secondes déclencherait un `setState` sur un composant démonté.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // `clipboard` est refusé hors contexte sécurisé et sans geste utilisateur.
      // On laisse l'état inchangé : l'adresse reste affichée en entier et
      // sélectionnable à la main, ce qui rend l'échec sans conséquence.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className="shrink-0 rounded-card p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-up" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Adresse copiée dans le presse-papiers' : ''}
      </span>
    </>
  )
}
