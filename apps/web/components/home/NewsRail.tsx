'use client'

import type { ReactNode } from 'react'

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { RailFade } from '@/components/home/RailFade'
import { useCarousel } from '@/components/ui/carousel'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE RAIL D'ACTUALITÉS — LA COQUE CLIENT D'UN CONTENU SERVEUR
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CE COMPOSANT EXISTE SÉPARÉMENT ─────────────────────────────────
 *
 * `HomeNewsGrid` lit le dictionnaire (`await getContent()`) : c'est un composant
 * SERVEUR, et il doit le rester — les articles viennent d'un flux, pas d'un état.
 *
 * Un carrousel, lui, a besoin du client : ses deux boutons se désactivent selon la
 * position de défilement, ce qu'aucun rendu serveur ne peut connaître.
 *
 * D'où ce partage : la coque est cliente et ne sait rien des articles ; les cartes
 * arrivent en `children`, déjà rendues côté serveur. Le contexte d'embla les atteint
 * quand même — React fournit le contexte aux enfants passés en propriété comme à ceux
 * écrits sur place.
 *
 * ── LES BOUTONS CONNAISSENT DÉJÀ LEUR ÉTAT ──────────────────────────────────
 *
 * C'est ce qui rend ce fichier court. `CarouselPrevious` se désactive tout seul au
 * début du rail, `CarouselNext` à la fin — donc la flèche gauche ne devient utile
 * qu'une fois parti vers la droite, exactement le comportement demandé, sans une
 * ligne d'état à tenir ici.
 *
 * Ils sont `static` et non posés en absolu : par défaut `Carousel` les fait flotter
 * SUR le contenu, ce qui recouvrirait la première et la dernière carte. Rangés dans le
 * flux, ils encadrent le rail — même choix que `CategoryRail`, pour la même raison.
 */
export function NewsRail({
  label,
  previousLabel,
  nextLabel,
  children,
}: {
  /** Nom du rail pour la synthèse vocale — le titre de la section. */
  label: string
  previousLabel: string
  nextLabel: string
  /** Les `CarouselItem`, rendus par l'appelant serveur. */
  children: ReactNode
}) {
  return (
    <Carousel
      /* `dragFree` : un rail d'articles se pousse au doigt sans devoir s'aligner sur
         une carte. `align: 'start'` cale la première au bord gauche du bloc, sur la
         même verticale que le titre au-dessus. `containScroll: 'trimSnaps'` empêche
         embla d'ajouter du vide aux deux bouts. */
      opts={{ align: 'start', containScroll: 'trimSnaps', dragFree: true }}
      aria-label={label}
      className="relative flex min-w-0 items-center gap-2"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          LES FLÈCHES S'EFFACENT EN BOUT DE COURSE, ELLES NE SE CONTENTENT PAS
          DE SE DÉSACTIVER

          `CarouselPrevious` se grise tout seul au début du rail — c'est déjà juste,
          et c'était l'état précédent. Mais un bouton grisé occupe toujours sa place
          et invite encore au clic : on l'essaie, il ne se passe rien, et on se demande
          si l'interface est en panne.

          ── POURQUOI `opacity` ET NON UN DÉMONTAGE ────────────────────────────

          Retirer le bouton du DOM ferait sauter la mise en page de 40 px à chaque
          bout de course — le rail se décalerait sous le curseur au moment précis où
          l'on vise la flèche opposée.

          `opacity-0` avec `w-0` et `-mr-2` retire sa LARGEUR sans le démonter : la
          transition porte alors sur les deux à la fois, et le rail glisse au lieu de
          sauter. `pointer-events-none` empêche de cliquer un bouton invisible, et
          `aria-hidden` le retire de la synthèse vocale — un bouton effacé qu'un
          lecteur d'écran annoncerait encore serait pire qu'un bouton grisé.
          ══════════════════════════════════════════════════════════════════════ */}
      <FlecheEffacable cote="prev">
        <CarouselPrevious
          variant="outline"
          className="static size-8 shrink-0 translate-y-0"
          aria-label={previousLabel}
        />
      </FlecheEffacable>

      {/* ── LE FONDU DE BORD ENVELOPPE LE RAIL ────────────────────────────────

          `RailFade` doit être DANS `Carousel` et non autour : il lit `canScrollPrev`
          et `canScrollNext` dans le contexte d'embla, pour n'effacer que le côté où il
          reste des cartes. Voir sa note.

          `-ml-5` compense le `pl-5` de chaque élément : la gouttière de 20 px vit entre
          les cartes et non avant la première, qui doit rester alignée sur le titre. */}
      <RailFade>
        <CarouselContent className="-ml-5">{children}</CarouselContent>
      </RailFade>

      <FlecheEffacable cote="next">
        <CarouselNext
          variant="outline"
          className="static size-8 shrink-0 translate-y-0"
          aria-label={nextLabel}
        />
      </FlecheEffacable>
    </Carousel>
  )
}

/**
 * Enveloppe une flèche pour l'effacer quand elle ne sert plus.
 *
 * Elle lit `canScrollPrev` / `canScrollNext` dans le contexte d'embla — la même source
 * que le fondu de bord et que l'état désactivé du bouton lui-même. Les trois disent
 * donc toujours la même chose, sans qu'aucun état ne soit tenu en double.
 */
function FlecheEffacable({ cote, children }: { cote: 'prev' | 'next'; children: ReactNode }) {
  const { canScrollPrev, canScrollNext } = useCarousel()
  const utile = cote === 'prev' ? canScrollPrev : canScrollNext

  return (
    <div
      aria-hidden={!utile}
      /* `w-0` retire la largeur, `-mr-2`/`-ml-2` absorbe la gouttière que le parent
         pose encore : sans elle, une flèche effacée laisserait huit pixels de vide.
         La transition porte sur les deux, donc le rail GLISSE au lieu de sauter. */
      className={`overflow-hidden transition-all duration-200 ease-[var(--ease-standard)] motion-reduce:transition-none ${
        utile
          ? 'w-8 opacity-100'
          : `pointer-events-none w-0 opacity-0 ${cote === 'prev' ? '-mr-2' : '-ml-2'}`
      }`}
    >
      {children}
    </div>
  )
}
