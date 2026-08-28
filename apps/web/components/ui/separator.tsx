'use client'

import { Separator as HeroSeparator } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FILET DE SÉPARATION — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * C'est la primitive la plus employée du lot : six fichiers, dont la barre d'outils du
 * graphique et les menus. Elle ne « fait » presque rien — un pixel de haut ou de large —
 * et c'est justement pourquoi elle vaut d'être partagée : ce pixel doit être le MÊME
 * partout, et prendre sa couleur au même endroit.
 *
 * ── LE `decorative` A DISPARU, ET CE N'EST PAS UNE PERTE ─────────────────────
 *
 * Radix exposait `decorative` pour choisir entre `role="separator"` et `role="none"`.
 * AUCUN appelant du dépôt ne le passait — vérifié sur `components/` et `app/` — et tous
 * s'en remettaient donc à sa valeur par défaut, « purement visuel ». C'est exactement ce
 * que HeroUI rend, sans réglage.
 *
 * Il est retiré du type plutôt que gardé et ignoré : une propriété acceptée mais sans
 * effet finit par être écrite en croyant qu'elle agit, et celle-ci se serait en plus
 * échappée vers le DOM par le `...props`, où React l'aurait signalée comme attribut
 * inconnu. Mieux vaut une erreur de compilation franche le jour où quelqu'un en a
 * réellement besoin.
 *
 * ── CE QUE HEROUI AJOUTE ─────────────────────────────────────────────────────
 *
 * Trois `variant` de contraste (`default`, `secondary`, `tertiary`), là où le filet
 * n'avait qu'un ton. Utile sur les panneaux, où un filet calé sur le fond de page
 * disparaît — c'est le défaut que plusieurs appelants corrigeaient à la main par un
 * `bg-border-subtle` dans leur `className`.
 */
export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof HeroSeparator>) {
  return (
    <HeroSeparator
      data-slot="separator"
      orientation={orientation}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}
