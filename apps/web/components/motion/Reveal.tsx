'use client'

import type { ReactNode } from 'react'

import { useReveal } from '@/components/motion/useReveal'

/**
 * Enveloppe cliente pour `useReveal` — voir son en-tête pour le raisonnement complet.
 *
 * ── POURQUOI UNE ENVELOPPE, ET NON LE CROCHET DIRECTEMENT ───────────────────
 *
 * Les blocs qui gagnent à apparaître en cascade — le ruban d'accueil, les cartes de
 * tête — sont des composants SERVEUR : ils lisent des sources et le dictionnaire. Un
 * crochet leur est interdit.
 *
 * Cette enveloppe ne sait rien de leur contenu. Elle reçoit des enfants DÉJÀ RENDUS et
 * ne fait qu'attacher une référence sur le conteneur qui les porte. Le coût côté client
 * est ce fichier et le crochet, pas les cartes.
 *
 * ⚠️ ELLE REMPLACE LE CONTENEUR, ELLE NE S'AJOUTE PAS À LUI. `className` reçoit la
 * grille de l'appelant : sans cela on empilerait deux boîtes, et la grille intérieure
 * ne verrait plus la largeur de l'extérieure.
 */
export function Reveal({
  children,
  className,
  selector,
  delay,
}: {
  children: ReactNode
  /** Les classes du conteneur remplacé — la grille, l'espacement. */
  className?: string
  /** Sélecteur des enfants à animer. Absent, ce sont les enfants directs. */
  selector?: string
  /** Décalage entre deux éléments, en millisecondes. */
  delay?: number
}) {
  const ref = useReveal<HTMLDivElement>({
    ...(selector !== undefined ? { selector } : {}),
    ...(delay !== undefined ? { delay } : {}),
  })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
