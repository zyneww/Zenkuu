'use client'

import { Info } from 'lucide-react'
import { useId } from 'react'

import { Tooltip } from '@/components/ui/tooltip'

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
 * ── CE QUI A REMPLACÉ LES CINQUANTE LIGNES ────────────────────────────────────
 *
 * Le `Tooltip` de shadcn/ui, c'est-à-dire celui de Radix. Il fait de lui-même tout ce
 * que ce fichier écrivait à la main, et le fait mieux :
 *
 *   · SURVOL, FOCUS ET TACTILE — les trois, comme avant. Le déclencheur est un vrai
 *     bouton : il entre dans l'ordre de tabulation et s'ouvre au focus.
 *   · LE COULOIR ENTRE L'ICÔNE ET LA BULLE — l'ancienne version le couvrait par un
 *     sursis de 120 ms posé sur le conteneur (`useHoverDismiss`). Radix le gère par
 *     son `delayDuration` et par un survol qui reste valide sur la bulle elle-même.
 *   · ÉCHAP ET CLIC EXTÉRIEUR — deux `useEffect` et quatre écouteurs de document en
 *     moins. Ils étaient corrects ; ils n'étaient simplement plus à écrire ici.
 *   · LE PLACEMENT — c'est le seul vrai GAIN de comportement. La bulle était posée en
 *     `absolute left-1/2 top-full`, donc toujours dessous et toujours centrée : sur
 *     une métrique en bord droit de la grille, ses 256 pixels débordaient de la carte.
 *     Radix mesure la fenêtre et retourne la bulle quand elle ne tient pas.
 *
 * ⚠️ IL FAUT UN `TooltipProvider` AU-DESSUS. Celui de shadcn/ui n'en pose pas un
 * implicitement : sans lui, Radix lève à l'exécution. Le projet en met UN SEUL, dans
 * `app/[locale]/layout.tsx`, ce qui donne au passage un seul réglage de temporisation
 * pour toutes les bulles du site.
 *
 * ── CE QU'IL FAUT CONSERVER, ET QUE LE COMPOSANT NE FAIT PAS ─────────────────
 *
 * ⚠️ LE TEXTE DOIT RESTER DANS LE HTML INITIAL. La bulle de Radix vit dans un PORTAIL
 * et n'existe que lorsqu'elle est ouverte : sans précaution, l'explication
 * disparaîtrait du document. Deux choses en dépendent, et aucune n'est décorative —
 * `aria-describedby`, qui fait annoncer l'explication AVEC la métrique par un lecteur
 * d'écran, et l'indexation, sur une page dont l'acquisition passe d'abord par la
 * recherche (§9) et dont ces définitions sont le texte le plus unique.
 *
 * D'où le `<span className="sr-only">` conservé sous le déclencheur : le même texte,
 * rendu par le serveur, invisible à l'œil, désigné par `aria-describedby`.
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
  const id = useId()

  return (
    <span className="relative inline-flex items-center">
      <Tooltip delay={120}>
        <Tooltip.Trigger
          aria-label={label}
          aria-describedby={id}
          className="inline-flex size-4 items-center justify-center text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" className="max-w-64 text-pretty">
          {content}
        </Tooltip.Content>
      </Tooltip>

      <span id={id} className="sr-only">
        {content}
      </span>
    </span>
  )
}
