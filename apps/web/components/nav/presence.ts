/**
 * Machine à états de l'apparition et de la disparition d'un panneau flottant.
 *
 * ── POURQUOI UNE FONCTION PURE PLUTÔT QU'UN `useState` DANS LE COMPOSANT ──────
 *
 * Animer une SORTIE impose de garder l'élément monté pendant sa disparition : un
 * nœud retiré de l'arbre quitte le document avant que le navigateur n'ait peint la
 * première image de la transition, et l'animation est donc purement et simplement
 * sautée. Il faut par conséquent un troisième état, entre « ouvert » et « fermé ».
 *
 * C'est ce troisième état qui apporte les défauts — panneau bloqué à l'écran, ou
 * disparaissant sous le curseur quand on le rouvre trop vite. Trois états et trois
 * événements font neuf combinaisons, dont deux ne se découvrent qu'à l'usage et se
 * reproduisent mal à la main dans un navigateur. Isolée ici, sans React ni DOM, la
 * règle s'éprouve directement — voir `presence.test.ts`.
 */

export type PresenceState = 'closed' | 'open' | 'closing'

export type PresenceEvent = 'open' | 'close' | 'transitionEnd'

export function nextPresence(state: PresenceState, event: PresenceEvent): PresenceState {
  switch (event) {
    case 'open':
      /* Depuis « closing » aussi, et c'est l'intérêt principal de ce réducteur :
         rouvrir ANNULE la fermeture en cours. */
      return 'open'

    case 'close':
      /* Uniquement depuis « open ». Une fermeture demandée pendant une fermeture
         redémarrerait l'animation à mi-parcours, avec un saut visible. */
      return state === 'open' ? 'closing' : state

    case 'transitionEnd':
      /* `transitionend` est émis par l'animation d'ENTRÉE comme par celle de
         SORTIE. Seule la seconde démonte ; confondre les deux ferait disparaître le
         panneau juste après son apparition. */
      return state === 'closing' ? 'closed' : state
  }
}

/** Le panneau reste dans l'arbre pendant sa disparition — sans quoi rien à animer. */
export function isMounted(state: PresenceState): boolean {
  return state !== 'closed'
}
