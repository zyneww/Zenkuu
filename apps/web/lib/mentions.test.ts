import { describe, expect, it } from 'vitest'

import { mentions } from './mentions'

const HYPE = { name: 'Hyperliquid', symbol: 'HYPE' }

describe('mentions', () => {
  it('trouve le nom sans égard à la casse', () => {
    expect(mentions('HYPERLIQUID recognized as third-largest venue', HYPE)).toBe(true)
    expect(mentions('hyperliquid buybacks reduced', HYPE)).toBe(true)
  })

  /**
   * LE test de ce fichier. « hype » est un mot anglais courant : sans la contrainte
   * de casse sur le symbole, la moitié des titres crypto du monde remonteraient sur
   * la fiche de Hyperliquid.
   */
  it('ne confond pas le symbole avec le mot courant de même orthographe', () => {
    expect(mentions('The hype around AI tokens is fading', HYPE)).toBe(false)
    expect(mentions('Traders pile into HYPE ahead of unlock', HYPE)).toBe(true)
  })

  it('exige des frontières de mot pour le nom', () => {
    // « Sui » est le contre-exemple classique en français.
    const sui = { name: 'Sui', symbol: 'SUI' }
    expect(mentions('Je suis convaincu que la poursuite continue', sui)).toBe(false)
    expect(mentions('Sui grimpe de 12 %', sui)).toBe(true)
  })

  it('ignore les accents de part et d’autre', () => {
    expect(mentions('TERRA classic rebounds', { name: 'Térra' })).toBe(true)
  })

  it('écarte les symboles trop courts', () => {
    // « ON », « ID », « OP » sont des mots dans plusieurs langues : les chercher
    // ramènerait du bruit sans fin.
    expect(mentions('Turn ON the lights', { name: 'Toncoin', symbol: 'ON' })).toBe(false)
  })

  it('n’est pas trompé par la ponctuation collée', () => {
    expect(mentions('Bitcoin, Ethereum and HYPE: three to watch', HYPE)).toBe(true)
    expect(mentions('(Hyperliquid) leads the pack', HYPE)).toBe(true)
  })

  it('ne trouve rien dans un texte vide', () => {
    expect(mentions('', HYPE)).toBe(false)
  })

  it('traite les caractères spéciaux d’un nom comme du texte, pas comme un motif', () => {
    // Un nom contenant « . » ou « + » ne doit pas devenir un joker.
    expect(mentions('pumpfun rallies', { name: 'Pump.fun' })).toBe(false)
    expect(mentions('Pump.fun rallies', { name: 'Pump.fun' })).toBe(true)
  })
})
