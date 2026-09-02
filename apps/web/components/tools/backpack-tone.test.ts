import { describe, expect, it } from 'vitest'

import { backpackTone } from './treemap'

/**
 * Les valeurs attendues ne sont pas calculées par moi : elles sont RELEVÉES sur
 * backpack.exchange/markets le 2026-09-02, en lisant le `background-color` calculé de
 * leurs tuiles et la variation qu'elles affichaient.
 *
 * C'est ce qui donne son intérêt au test : il ne vérifie pas que la fonction fait ce
 * que son code dit, il vérifie qu'elle reproduit une RÉFÉRENCE EXTERNE. Si quelqu'un
 * change l'espace d'interpolation ou le plafond, ces cas tombent — et c'est exactement
 * le moment où il faut s'arrêter, parce que la carte aura cessé de ressembler à celle
 * qu'on copie.
 */
describe('backpackTone', () => {
  it('reproduit les teintes relevées à l’écran', () => {
    // Les cinq points de contrôle, du plus baissier au plus haussier.
    expect(backpackTone(-10.43)).toBe('rgb(120 46 49)') // au-delà du plafond : saturé
    expect(backpackTone(-0.88)).toBe('rgb(54 34 39)')
    expect(backpackTone(0.02)).toBe('rgb(26 30 35)')
    expect(backpackTone(1.13)).toBe('rgb(25 57 49)')
    expect(backpackTone(4.64)).toBe('rgb(24 104 72)') // au-delà du plafond : saturé
  })

  it('borne à ±3 %, donc +3 et +50 donnent la même teinte', () => {
    expect(backpackTone(3)).toBe(backpackTone(50))
    expect(backpackTone(-3)).toBe(backpackTone(-50))
  })

  it('rend le neutre exact à zéro et pour une donnée absente', () => {
    // Une variation NULLE est une mesure, une variation ABSENTE n'en est pas une — mais
    // les deux se peignent en neutre, parce que ni l'une ni l'autre n'a de sens à
    // signaler. C'est le seul endroit où la rampe les confond volontairement.
    expect(backpackTone(0)).toBe('rgb(26 29 35)')
    expect(backpackTone(undefined)).toBe('rgb(26 29 35)')
  })

  it('reste monotone : plus la hausse est forte, plus le vert l’est', () => {
    const vert = (change: number) => Number(backpackTone(change).match(/\d+ (\d+)/)![1])
    expect(vert(0.5)).toBeLessThan(vert(1.5))
    expect(vert(1.5)).toBeLessThan(vert(2.5))
    expect(vert(2.5)).toBeLessThan(vert(3))
  })
})
