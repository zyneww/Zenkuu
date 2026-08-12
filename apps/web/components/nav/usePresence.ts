'use client'

import { useEffect, useRef, useState } from 'react'

import { isMounted, nextPresence, type PresenceState } from './presence'

/**
 * Traduit un booléen d'ouverture en état d'apparition animable.
 *
 * La logique des transitions vit dans `presence.ts`, éprouvée par ses propres
 * tests ; ce crochet ne fait que la brancher sur React et sur l'horloge.
 */
export function usePresence(isOpen: boolean) {
  const [state, setState] = useState<PresenceState>(isOpen ? 'open' : 'closed')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /*
   * AJUSTEMENT PENDANT LE RENDU, et surtout pas dans un `useEffect`.
   *
   * La version évidente — un effet qui observe `isOpen` et appelle `setState` —
   * enchaîne deux rendus : React peint d'abord le panneau avec l'état précédent,
   * puis l'effet le corrige. Le compilateur React la refuse pour cette raison, et il
   * a raison ici plus qu'ailleurs : le rendu intermédiaire porterait un `data-state`
   * périmé, c'est-à-dire précisément l'attribut dont dépend l'animation.
   *
   * Le motif ci-dessous est celui que documente react.dev sous « ajuster l'état
   * quand une prop change » : on compare la prop à sa valeur précédente PENDANT le
   * rendu. React interrompt alors ce rendu et le relance immédiatement avec le
   * nouvel état, sans rien peindre entre les deux.
   */
  const [previousOpen, setPreviousOpen] = useState(isOpen)
  if (previousOpen !== isOpen) {
    setPreviousOpen(isOpen)
    setState((current) => nextPresence(current, isOpen ? 'open' : 'close'))
  }

  /*
   * GARDE-FOU — `transitionend` n'est PAS garanti.
   *
   * Il n'est pas émis si l'élément est masqué en cours d'animation, si l'onglet
   * passe en arrière-plan, ou si une règle CSS annule la transition. Sans ce filet,
   * le panneau resterait monté et invisible tout en continuant de capturer les
   * clics — un défaut invisible en développement et bien réel à l'usage.
   *
   * 400 ms : très au-delà des 120 ms de la fermeture, donc jamais atteint en
   * fonctionnement normal.
   */
  useEffect(() => {
    if (state !== 'closing') return

    timer.current = setTimeout(() => {
      setState((current) => nextPresence(current, 'transitionEnd'))
    }, 400)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [state])

  return {
    state,
    mounted: isMounted(state),
    onTransitionEnd: () => {
      setState((current) => nextPresence(current, 'transitionEnd'))
    },
  }
}
