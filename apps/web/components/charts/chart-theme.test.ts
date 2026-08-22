import { describe, expect, it } from 'vitest'

import { axisDigits } from './chart-theme'

/**
 * Le cas qui a motivé la fonction est le PREMIER : la capitalisation mondiale, dont
 * l'amplitude vaut quelques pour cent de son ordre de grandeur. À une décimale, ses
 * cinq graduations rendaient toutes « 2,3 Bn ».
 */
describe('axisDigits', () => {
  it('gradue une série étroite assez finement pour que deux crans diffèrent', () => {
    const values = [2.29e12, 2.3e12, 2.305e12, 2.31e12]
    const digits = axisDigits(values)

    const format = (value: number) =>
      new Intl.NumberFormat('fr-FR', {
        notation: 'compact',
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value)

    expect(new Set(values.map(format)).size).toBe(values.length)
  })

  it('laisse une série large à sa précision d’origine', () => {
    expect(axisDigits([20_000, 45_000, 70_000])).toBeLessThanOrEqual(2)
  })

  it('borne la précision, quelle que soit l’étroitesse de la série', () => {
    expect(axisDigits([1e12, 1e12 + 1])).toBeLessThanOrEqual(4)
  })

  it('retombe sur une décimale quand il n’y a pas d’amplitude à graduer', () => {
    expect(axisDigits([])).toBe(1)
    expect(axisDigits([42, 42, 42])).toBe(1)
    expect(axisDigits([0, 0])).toBe(1)
  })
})
