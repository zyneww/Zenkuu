'use client'

import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { useHoverDismiss } from '@/components/nav/useHoverDismiss'

/**
 * Infobulle explicative — l'icône « ⓘ » posée à côté d'une métrique.
 *
 * ── POURQUOI CE N'EST PAS UN `title=""` ───────────────────────────────────────
 *
 * L'attribut natif serait une ligne de code au lieu de cinquante, et il est
 * tentant. Il a trois défauts rédhibitoires ici : il n'apparaît qu'après une longue
 * temporisation imposée par le navigateur, il est INACCESSIBLE au clavier et au
 * tactile, et son rendu ne peut pas être mis en forme — nos explications font deux
 * phrases, elles seraient illisibles en une ligne système.
 *
 * ── SURVOL *ET* FOCUS *ET* CLIC ───────────────────────────────────────────────
 *
 * Les trois, et c'est le cœur du composant. Le survol seul exclut le clavier et le
 * tactile — sur téléphone, une infobulle au survol n'existe tout simplement pas. Le
 * déclencheur est donc un vrai `<button>` : il entre dans l'ordre de tabulation, il
 * s'ouvre à Entrée et à Espace, et le tactile le traite comme un clic.
 *
 * ── LE CONTENU EST DANS LE DOM, TOUJOURS ──────────────────────────────────────
 *
 * Le texte est rendu en permanence et seulement masqué visuellement quand il est
 * fermé. Deux bénéfices d'un coup : `aria-describedby` peut le désigner (un lecteur
 * d'écran annonce donc l'explication avec la métrique), et le contenu reste dans le
 * HTML initial — sur une page dont l'acquisition passe d'abord par la recherche
 * (§9), ces définitions sont du texte unique qu'il serait dommage de cacher aux
 * robots derrière un état React.
 */
export function InfoTip({
  /** Texte de l'explication. Deux phrases au plus — au-delà, c'est une page, pas une bulle. */
  content,
  /** Décrit ce que l'icône explique, pour les lecteurs d'écran. */
  label,
}: {
  content: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const container = useRef<HTMLSpanElement>(null)

  /* Délai raccourci : une bulle d'aide n'a pas de vide à franchir comme un menu —
     elle touche presque son icône — et doit s'effacer vite pour ne pas gêner la
     lecture du tableau qu'elle recouvre. */
  const hoverDismiss = useHoverDismiss(() => setOpen(false), open, 120)

  // Fermeture au clic extérieur et à Échap : sans elles, une bulle ouverte au clic
  // sur tactile resterait affichée jusqu'au prochain clic sur l'icône elle-même,
  // qu'elle recouvre en partie.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    /*
     * LE SURVOL SE JOUE SUR LE CONTENEUR, PAS SUR L'ICÔNE.
     *
     * Les deux gestionnaires vivaient sur le bouton : la bulle disparaissait donc dès
     * qu'on déplaçait le curseur vers elle, ce qui rendait son texte impossible à
     * lire jusqu'au bout à la souris, et impossible à sélectionner. Posés sur le
     * conteneur, ils couvrent l'icône ET la bulle, qui en est un descendant.
     *
     * La temporisation du crochet règle au passage les quelques pixels de vide entre
     * les deux, que l'ancienne fermeture sèche interprétait comme un départ.
     */
    <span ref={container} className="relative inline-flex items-center" {...hoverDismiss}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-none text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <span
        id={id}
        role="tooltip"
        /* `hidden` plutôt qu'un démontage conditionnel : `aria-describedby` doit
           pouvoir désigner un nœud existant même bulle fermée, sinon l'explication
           n'est jamais annoncée. */
        hidden={!open}
        className="absolute left-1/2 top-full z-50 mt-1.5 w-64 -translate-x-1/2 rounded-card border border-border-subtle bg-overlay px-3 py-2 text-xs font-normal leading-relaxed text-ink shadow-overlay"
      >
        {content}
      </span>
    </span>
  )
}
