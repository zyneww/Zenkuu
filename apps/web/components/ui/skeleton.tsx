import { Skeleton as HeroSkeleton } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SQUELETTE DE CHARGEMENT — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE LE CHANGEMENT APPORTE ─────────────────────────────────────────────
 *
 * L'ancien était un `<div>` en `animate-pulse bg-accent`. Il clignotait, ce qui est la
 * forme la moins bonne des deux : une opacité qui va et vient se lit comme un élément
 * qui apparaît et disparaît, alors qu'un BALAYAGE dit « ça arrive », dans un sens de
 * lecture. HeroUI rend le second par défaut (`shimmer`), et garde le premier sous
 * `animationType="pulse"` pour qui préfère.
 *
 * Il corrige aussi une erreur de jeton : `bg-accent` désignait chez shadcn le gris de
 * survol, et le squelette empruntait donc la couleur d'un état d'interaction pour dire
 * une attente. HeroUI lit `--surface-tertiary`, alimenté par le pont de `globals.css`.
 *
 * ── LE MOUVEMENT RÉDUIT EST RESPECTÉ ─────────────────────────────────────────
 *
 * `prefers-reduced-motion` désactive l'animation par la règle globale du site, comme
 * pour toute autre transition. Rien à faire ici.
 *
 * L'API publique ne change pas : même nom, même `className`, mêmes appelants.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof HeroSkeleton>) {
  return <HeroSkeleton data-slot="skeleton" className={cn(className)} {...props} />
}
