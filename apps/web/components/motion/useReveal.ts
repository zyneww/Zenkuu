'use client'

import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'APPARITION EN CASCADE — LE SEUL EMPLOI D'ANIME.JS SUR LE SITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UNE LIBRAIRIE ICI, ALORS QUE TOUT LE RESTE EST EN CSS ──────────
 *
 * Le mouvement du site est en CSS, et doit le rester : une transition composée par le
 * GPU tient le 60 im/s sans réveiller le fil principal, celui qui porte déjà un tableau
 * de cent lignes. Rien de ce qui répond à un survol ou à un clic n'a besoin d'autre
 * chose, et `globals.css` le pose une fois pour tout le site.
 *
 * Une chose échappe à ce raisonnement : le DÉCALAGE entre plusieurs éléments. Faire
 * apparaître huit cartes l'une après l'autre à 60 ms d'intervalle demande huit délais
 * différents. En CSS cela s'écrit soit en huit règles nommées, soit en variables
 * posées à la main dans le balisage — dans les deux cas, un nombre qui doit suivre le
 * nombre d'éléments, et qui se désaccorde dès qu'on en ajoute un.
 *
 * `stagger()` calcule ce décalage. C'est l'unique raison de cette dépendance, et c'est
 * le seul endroit du site où elle est importée.
 *
 * ── IL NE FAIT RIEN SI L'ON N'EN VEUT PAS ───────────────────────────────────
 *
 * `prefers-reduced-motion` court-circuite l'animation ENTIÈREMENT : les éléments sont
 * posés à leur état final, sans transition, avant la première peinture. Ce n'est pas
 * une version dégradée — c'est la page sans le mouvement, ce que ce réglage demande.
 *
 * ── ET IL N'ANIME QUE CE QU'ON REGARDE ──────────────────────────────────────
 *
 * `IntersectionObserver` déclenche à l'entrée dans le champ, une seule fois. Sans lui,
 * une cascade posée sur un bloc situé à trois mille pixels du haut se jouerait pendant
 * le chargement, hors de l'écran, et serait finie avant qu'on y arrive — un coût sans
 * contrepartie.
 *
 * ── L'ÉTAT DE DÉPART EST POSÉ EN JAVASCRIPT, PAS EN CSS ─────────────────────
 *
 * Et c'est délibéré : écrit en CSS, il s'appliquerait AVANT que ce crochet ne tourne,
 * donc aussi quand JavaScript échoue ou tarde — et les cartes resteraient invisibles.
 * Posé ici, il n'existe que si l'animation qui le lève existe aussi.
 */
export function useReveal<T extends HTMLElement>(options?: {
  /** Sélecteur des enfants à faire apparaître. Absent, ce sont les enfants directs. */
  selector?: string
  /** Décalage entre deux éléments, en millisecondes. */
  delay?: number
}) {
  const ref = useRef<T>(null)
  const selector = options?.selector
  const delay = options?.delay ?? 60

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const cibles = selector
      ? Array.from(root.querySelectorAll<HTMLElement>(selector))
      : Array.from(root.children).filter((n): n is HTMLElement => n instanceof HTMLElement)

    if (cibles.length === 0) return

    /* Le réglage système gagne, et il gagne AVANT qu'on ait rien touché : les éléments
       n'ont jamais été déplacés, il n'y a donc rien à remettre en place. */
    const calme = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (calme.matches) return

    for (const cible of cibles) {
      cible.style.opacity = '0'
      cible.style.transform = 'translateY(8px)'
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        obs.disconnect()

        animate(cibles, {
          opacity: [0, 1],
          translateY: [8, 0],
          /* 420 ms : assez pour que la cascade se lise, assez court pour qu'elle soit
             finie avant qu'on ait décidé de lire. Au-delà, elle retarde la lecture au
             lieu de l'accompagner. */
          duration: 420,
          /* `out(3)` — une sortie douce, sans rebond. Un rebond conviendrait à un objet
             qu'on manipule ; une carte qui se révèle n'a pas de masse. */
          ease: 'out(3)',
          delay: stagger(delay),
          onComplete: () => {
            /* Les styles en ligne sont RETIRÉS à la fin. Laissés en place, ils
               figeraient une opacité et une transformation sur des éléments qui
               peuvent ensuite être animés par autre chose — un survol, par exemple. */
            for (const cible of cibles) {
              cible.style.removeProperty('opacity')
              cible.style.removeProperty('transform')
            }
          },
        })
      },
      /* `-40px` en bas : la cascade part quand le bloc est franchement entré, pas
         quand son premier pixel affleure. */
      { rootMargin: '0px 0px -40px 0px', threshold: 0 },
    )

    observer.observe(root)
    return () => observer.disconnect()
  }, [selector, delay])

  return ref
}
