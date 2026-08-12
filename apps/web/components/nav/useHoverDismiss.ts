'use client'

import { useCallback, useEffect, useRef, type MouseEvent } from 'react'

/**
 * Referme un panneau flottant dès que le curseur le quitte.
 *
 * ── POURQUOI UNE TEMPORISATION, ET NON UNE FERMETURE SÈCHE ────────────────────
 *
 * Le panneau est posé SOUS son bouton, à quelques pixels de lui. Ces pixels
 * n'appartiennent ni à l'un ni à l'autre : le curseur qui descend du bouton vers le
 * panneau sort donc de la zone une fraction de seconde. Fermer immédiatement rendrait
 * le menu inatteignable à la souris — le défaut le plus classique du genre.
 *
 * Le délai laisse à l'entrée dans le panneau le temps d'annuler la fermeture. Il est
 * volontairement court : au-delà, le panneau semble coller au curseur.
 *
 * ── CE QUE CE CROCHET NE FAIT PAS ─────────────────────────────────────────────
 *
 * Il ne remplace ni la fermeture au clic extérieur ni celle à la touche Échap : un
 * menu ouvert au CLAVIER n'a jamais de curseur au-dessus de lui, et ne recevrait donc
 * jamais l'événement de sortie. Les trois voies coexistent, chacune pour un usage.
 *
 * ── LE GARDE-FOU DU CLAVIER, ET POURQUOI IL CHANGE LA PORTÉE DU CROCHET ───────
 *
 * Ce crochet portait jusqu'ici une restriction : « il ne convient pas aux panneaux
 * qui contiennent un champ de saisie — on y tape en regardant ailleurs, et la souris
 * qui dérive fermerait la liste en pleine frappe ». La restriction était juste, et
 * elle coûtait cher : sur dix panneaux flottants du site, SIX s'en trouvaient exclus
 * ou simplement oubliés, et restaient donc ouverts quand le curseur les quittait.
 * C'est le défaut signalé — « le menu reste affiché parfois », sur n'importe lequel.
 *
 * La restriction tombe parce que la condition qu'elle décrivait est OBSERVABLE : on
 * tape dans un champ quand le FOCUS y est. Le compte à rebours vérifie donc, au
 * moment d'échoir, si le clavier travaille encore à l'intérieur du panneau — et
 * renonce si c'est le cas. Une saisie en cours n'est plus interrompue, et le crochet
 * devient applicable à TOUS les panneaux, ce qui était la seule façon de régler le
 * défaut à un seul endroit plutôt qu'en dix.
 *
 * La vérification est faite À L'ÉCHÉANCE et non à la sortie du curseur : c'est
 * l'instant qui compte, et l'utilisateur peut très bien cliquer dans un champ pendant
 * les 220 ms du sursis.
 */
export function useHoverDismiss(close: () => void, active: boolean, delay = 220) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* La fermeture est lue dans une référence plutôt que capturée : les appelants la
     déclarent en ligne (`() => setOpen(false)`), donc neuve à chaque rendu, et la
     capturer obligerait chacun d'eux à la mémoriser pour que les gestionnaires
     restent stables.

     Le report se fait dans un effet et non pendant le rendu : écrire dans une
     référence au fil du rendu la rendrait dépendante du nombre de fois où React
     choisit de le rejouer, ce qu'il ne garantit pas. */
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  }, [close])

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  // Un compte à rebours survivant au démontage appellerait une fermeture sur un
  // composant disparu.
  useEffect(() => cancel, [cancel])

  const onMouseEnter = useCallback(() => cancel(), [cancel])

  const onMouseLeave = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!active) return
      cancel()

      /*
       * `currentTarget` est CAPTURÉ MAINTENANT, dans une variable locale.
       *
       * React remet ce champ à `null` dès que le gestionnaire rend la main : le lire
       * depuis le compte à rebours, 220 ms plus tard, donnerait `null` et ferait
       * lever la vérification ci-dessous. La valeur, elle, est une simple référence
       * de nœud, parfaitement valide une fois recopiée.
       */
      const root = event.currentTarget

      timer.current = setTimeout(() => {
        // Le clavier travaille dans le panneau : on ne ferme pas sous les doigts.
        if (root.contains(document.activeElement)) return
        closeRef.current()
      }, delay)
    },
    [active, cancel, delay],
  )

  return { onMouseEnter, onMouseLeave }
}
