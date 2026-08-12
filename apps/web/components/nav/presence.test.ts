import { describe, expect, it } from 'vitest'

import { isMounted, nextPresence } from './presence'

describe('nextPresence', () => {
  it("ouvre depuis l'état fermé", () => {
    expect(nextPresence('closed', 'open')).toBe('open')
  })

  it('passe par « closing » et non directement par « closed »', () => {
    expect(nextPresence('open', 'close')).toBe('closing')
  })

  it('démonte à la fin de la transition de fermeture', () => {
    expect(nextPresence('closing', 'transitionEnd')).toBe('closed')
  })

  /*
   * Le cas qui motive tout ce réducteur : le curseur ressort du menu puis y revient
   * aussitôt. Sans cette règle, la fermeture se poursuit et le panneau disparaît
   * sous le pointeur — le défaut le plus irritant d'un menu au survol.
   */
  it('annule la fermeture si on rouvre pendant la disparition', () => {
    expect(nextPresence('closing', 'open')).toBe('open')
  })

  /*
   * `transitionend` est émis par l'animation d'ENTRÉE aussi. Le traiter comme un
   * signal de démontage ferait disparaître le panneau juste après son apparition.
   */
  it("ignore la fin de la transition d'entrée", () => {
    expect(nextPresence('open', 'transitionEnd')).toBe('open')
  })

  it('ignore une fermeture déjà en cours', () => {
    expect(nextPresence('closing', 'close')).toBe('closing')
  })

  it('ignore une fermeture demandée alors que tout est déjà fermé', () => {
    expect(nextPresence('closed', 'close')).toBe('closed')
  })

  it("ignore un transitionEnd reçu à l'état fermé", () => {
    expect(nextPresence('closed', 'transitionEnd')).toBe('closed')
  })
})

describe('isMounted', () => {
  it('garde le panneau monté pendant la fermeture', () => {
    expect(isMounted('closing')).toBe(true)
  })

  it('monte le panneau ouvert', () => {
    expect(isMounted('open')).toBe(true)
  })

  it('démonte le panneau fermé', () => {
    expect(isMounted('closed')).toBe(false)
  })
})
