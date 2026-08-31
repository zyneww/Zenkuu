'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

import { usePhrase } from '@/components/locale/ContentProvider'
import { IconButton } from '@/components/ui/IconButton'

/**
 * Bouton de copie d'une valeur technique — typiquement une adresse de contrat.
 *
 * La confirmation est VISUELLE et TEXTUELLE : l'icône bascule en coche, et un
 * `role="status"` en lecture d'écran seule annonce la copie. Sans le second, un
 * utilisateur non voyant n'a aucun retour — le presse-papiers est silencieux.
 *
 * Le minuteur est nettoyé au démontage : sans cela, un composant retiré pendant les
 * deux secondes déclencherait un `setState` sur un composant démonté.
 *

 * ── LE BOUTON EST `IconButton` ───────────────────────────────────────────────
 *
 * Le bouton-icône du site, bâti sur le `Button` et le `Tooltip` de shadcn/ui : il
 * porte le carré de survol, l'anneau de focus, le plancher tactile — et surtout
 * l'INFOBULLE. Le `title=""` d'avant n'apparaissait qu'après la temporisation du
 * navigateur et n'existait ni au clavier ni au doigt ; la bulle s'ouvre au survol ET
 * au focus. L'`aria-label` vient de la même chaîne, que le type rend obligatoire —
 * voir `components/ui/IconButton.tsx`.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const t = usePhrase()
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
      <IconButton
        size="icon-xs"
        variant="ghost"
        onClick={onClick}
        label={label}
        icon={copied ? Check : Copy}
        className="shrink-0"
      />
      <span role="status" className="sr-only">
        {copied ? t('Adresse copiée dans le presse-papiers') : ''}
      </span>
    </>
  )
}
