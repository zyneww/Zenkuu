import { Spinner as HeroSpinner } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * INDICATEUR D'ATTENTE — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL ÉTAIT, ET POURQUOI CE N'ÉTAIT PAS ASSEZ ─────────────────────────
 *
 * Une icône `Loader2Icon` de lucide portant `animate-spin`, avec `role="status"` et
 * un libellé écrit EN ANGLAIS (« Loading ») sur un site entièrement français. Le
 * défaut n'était pas décoratif : c'est le seul texte que le lecteur d'écran annonce
 * quand la page attend.
 *
 * ── L'API PUBLIQUE N'A PAS BOUGÉ, ET C'EST DÉLIBÉRÉ ──────────────────────────
 *
 * Le composant garde son nom, sa signature et son `className`. C'est ce qui permet de
 * changer la mécanique sous les appelants sans en toucher un seul — le même parti que
 * pour les autres primitives reprises de HeroUI. Un consommateur qui écrivait
 * `<Spinner className="size-6" />` continue de fonctionner.
 *
 * ⚠️ LE TYPE DES PROPS CHANGE DE FAMILLE. L'ancien acceptait toutes les propriétés
 * d'un `<svg>` ; HeroUI rend un `<div>`. Les rares appelants qui passaient un attribut
 * SVG (`strokeWidth`…) ne compileraient plus — il n'y en a aucun, vérifié.
 */
export function Spinner({
  className,
  label = 'Chargement en cours',
  ...props
}: React.ComponentProps<typeof HeroSpinner> & {
  /**
   * Ce que le lecteur d'écran annonce.
   *
   * Il vaut un libellé français par défaut plutôt que rien : un `role="status"` muet
   * annonce l'attente sans dire de quoi. Les appelants qui décrivent déjà l'attente
   * dans leur propre texte peuvent le vider (`label=""`).
   */
  label?: string
}) {
  return (
    <span role="status" className="contents">
      <HeroSpinner className={cn(className)} {...props} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
