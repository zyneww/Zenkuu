'use client'

import { useEffect, useState } from 'react'

/**
 * L'utilisateur demande-t-il à réduire les animations ?
 *
 * Le site respecte déjà `prefers-reduced-motion` en CSS (voir `globals.css`), mais
 * les animations de Recharts sont pilotées en JavaScript et ignorent complètement la
 * feuille de style. Sans ce crochet, une courbe continuerait de se tracer pendant
 * 800 ms chez quelqu'un qui a explicitement demandé le contraire — un réglage que
 * l'on active souvent pour des raisons vestibulaires, pas par préférence esthétique.
 *
 * L'état initial est `false` et non la valeur réelle : le serveur ne connaît pas la
 * préférence du navigateur, et renvoyer autre chose provoquerait un écart
 * d'hydratation. La correction survient au premier effet, avant que l'animation
 * d'entrée n'ait le temps de se dérouler.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}
