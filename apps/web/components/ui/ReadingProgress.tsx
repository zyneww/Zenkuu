'use client'

import { ScrollProgress } from '@/components/ui/scroll-progress'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA PROGRESSION DE LECTURE, POSÉE OÙ ELLE NE GÊNE PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UNE ENVELOPPE PLUTÔT QUE LE COMPOSANT DIRECTEMENT ───────────────
 *
 * `ScrollProgress` vient du registre Rare UI et se pose en `fixed bottom-6
 * left-1/2` : une pastille flottante, centrée en bas de la fenêtre. C'est le bon
 * endroit sur un site qui n'a rien là.
 *
 * ⚠️ ZENKUU A QUELQUE CHOSE LÀ. `MobileTabBar` occupe `fixed inset-x-0 bottom-0`
 * jusqu'à `lg` — accueil, recherche, favoris, menu. La pastille se poserait dessus,
 * et recouvrirait la navigation principale du téléphone par un indicateur de
 * lecture. D'où le `lg:block` : elle n'existe qu'au-dessus du seuil où la barre
 * d'onglets disparaît, c'est-à-dire exactement là où le bas de l'écran est libre.
 *
 * Le brief demande une position « non intrusive » et qu'elle « ne cache pas le
 * header » ; celle-ci ne cache ni l'un ni l'autre parce qu'elle n'apparaît que
 * lorsque les deux sont hors de son chemin.
 *
 * ── LES COULEURS SONT DÉJÀ LES NÔTRES ────────────────────────────────────────
 *
 * Le composant s'habille de `bg-background`, `border-border` et `text-foreground` —
 * les jetons du pont shadcn, tous les quatre déclarés dans `globals.css` et suivis
 * par les deux thèmes. Rien à repeindre : vérifié avant de l'installer.
 *
 * ── PAS DE SECTIONS, ET C'EST UN CHOIX ───────────────────────────────────────
 *
 * Le composant sait afficher un sommaire cliquable si on lui passe des `sections`.
 * On ne lui en passe pas : cela demanderait que chaque page déclare ses ancres, et
 * une liste qui vieillirait en silence à chaque section ajoutée. Sans sections, il
 * reste ce que le brief demande — « une fine progression de lecture ».
 */
export function ReadingProgress() {
  return <ScrollProgress className="hidden lg:block" />
}
