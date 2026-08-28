import { describe, expect, it } from 'vitest'

import { flashDirection } from './price-flash'

/**
 * Le défaut que ce test garde fermé : la teinte clignotait sur des tics INVISIBLES.
 *
 * Binance cote au dix-millième, l'affichage arrondit au centime. Sur un actif à moins de
 * dix dollars, 2,7420 → 2,7430 laisse « 2,74 » à l'écran — et allumait pourtant le vert.
 */
describe('flashDirection', () => {
  it("n'allume rien au premier relevé", () => {
    expect(flashDirection(null, { price: 2.742, label: '2,74 $US' })).toBeNull()
  })

  it("n'allume rien quand le mouvement est sous la précision affichée", () => {
    expect(
      flashDirection({ price: 2.742, label: '2,74 $US' }, { price: 2.743, label: '2,74 $US' }),
    ).toBeNull()
  })

  it("n'allume rien sur un tic de valeur identique", () => {
    expect(
      flashDirection({ price: 2.742, label: '2,74 $US' }, { price: 2.742, label: '2,74 $US' }),
    ).toBeNull()
  })

  it('allume dans le sens du mouvement quand le chiffre affiché change', () => {
    expect(
      flashDirection({ price: 2.742, label: '2,74 $US' }, { price: 2.751, label: '2,75 $US' }),
    ).toBe('up')
    expect(
      flashDirection({ price: 2.742, label: '2,74 $US' }, { price: 2.731, label: '2,73 $US' }),
    ).toBe('down')
  })
})
