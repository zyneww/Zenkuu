import { describe, expect, it } from 'vitest'

import { trimToWindow } from './providers/yahoo'

/** Point à `h` heures avant l'instant de référence, en millisecondes. */
const HEURE = 3_600_000
const REF = Date.UTC(2026, 7, 17, 15, 26) // lundi 17 août 2026, 15h26 UTC
const p = (heuresAvant: number) => ({ timestamp: REF - heuresAvant * HEURE })

/**
 * DÉCOUPAGE D'UNE FENÊTRE — le rattrapage de ce que Yahoo ne sait pas exprimer.
 *
 * Les paramètres de plage de Yahoo comptent en SÉANCES, pas en heures : `range=1d`
 * rend 1,9 h sur une action en cours de matinée, `range=2d` remonte à 73,9 h un lundi.
 * Aucun d'eux ne borne une durée réelle, d'où ce découpage — voir `windowFor`.
 */
describe('trimToWindow', () => {
  it('garde les points de la fenêtre et écarte les plus anciens', () => {
    // Une séance de bourse d'hier (t-25 h) et celle d'aujourd'hui.
    const points = [p(73), p(49), p(25), p(6), p(3), p(0)]
    const gardes = trimToWindow(points, 1)

    expect(gardes).toHaveLength(3)
    expect(gardes[0]).toEqual(p(6))
  })

  it('mesure depuis le DERNIER POINT, pas depuis maintenant', () => {
    /* LE test de ce fichier. Sur un marché fermé depuis vendredi, compter depuis
       l'heure courante écarterait toute la séance de vendredi et ne laisserait rien —
       or c'est exactement la donnée que le lecteur doit voir. */
    const vendrediSoir = [p(72), p(71), p(70), p(69)]
    const gardes = trimToWindow(vendrediSoir, 1)

    expect(gardes).toHaveLength(4)
  })

  it('rend la série ENTIÈRE plutôt qu’une série vide', () => {
    /* Jour férié américain : les 24 dernières heures ne contiennent aucune cotation.
       Un graphique vide sous une étiquette « 24 h » laisserait croire à une panne. */
    const isole = [p(100), p(99)]
    expect(trimToWindow(isole, 1)).toHaveLength(2)
  })

  it('ne garde pas un point unique — deux au minimum, ou tout', () => {
    // Le dernier point survit toujours au filtre (écart nul), donc un découpage qui
    // n'en garderait qu'un doit basculer sur la série entière : une courbe d'un point
    // ne se trace pas.
    const points = [p(200), p(150), p(0)]
    expect(trimToWindow(points, 1)).toHaveLength(3)
  })

  it('laisse une série déjà dans la fenêtre intacte', () => {
    const points = [p(20), p(10), p(0)]
    expect(trimToWindow(points, 1)).toEqual(points)
  })

  it('accepte une série vide sans lever', () => {
    expect(trimToWindow([], 1)).toEqual([])
  })

  /* Générique : la même règle sert aux points de prix et aux bougies, qui ne partagent
     que leur horodatage. Ce test fixe ce contrat. */
  it('préserve les champs supplémentaires des bougies', () => {
    const bougies = [
      { ...p(50), open: 1, high: 2, low: 0, close: 1.5 },
      { ...p(5), open: 2, high: 3, low: 1, close: 2.5 },
      { ...p(0), open: 3, high: 4, low: 2, close: 3.5 },
    ]
    const gardes = trimToWindow(bougies, 1)

    expect(gardes).toHaveLength(2)
    expect(gardes[0]?.close).toBe(2.5)
  })
})
