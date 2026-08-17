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

/**
 * ALIAS DE FONDS — la raison pour laquelle les fiches d'ETF étaient vides.
 *
 * Aucune rédaction n'écrit « SPDR S&P 500 » ; toutes écrivent « le S&P 500 ». Ces
 * tests fixent les deux bornes du compromis : ce qu'on accepte d'élargir, et ce qu'on
 * refuse d'élargir même si cela laisse une fiche courte.
 */
describe('mentions — alias de fonds et d’indices', () => {
  it('retrouve un indice sous son nom d’usage, sans son émetteur', () => {
    const spy = { name: 'SPDR S&P 500', symbol: 'SPY' }
    expect(mentions('Le S&P 500 termine en hausse de 0,4 %', spy)).toBe(true)

    const iwm = { name: 'iShares Russell 2000', symbol: 'IWM' }
    expect(mentions('Small caps: Russell 2000 breaks out', iwm)).toBe(true)
  })

  it('lit le sujet écrit entre parenthèses', () => {
    const qqq = { name: 'Invesco QQQ (Nasdaq 100)', symbol: 'QQQ' }
    expect(mentions('Nasdaq 100: the bounce has to prove itself', qqq)).toBe(true)
  })

  it('retire aussi les mots de structure du véhicule', () => {
    const iwda = { name: 'iShares Core MSCI World (UCITS)', symbol: 'IWDA' }
    expect(mentions('MSCI World hits a record high', iwda)).toBe(true)
  })

  /**
   * LE test de ce bloc. « SPDR Gold Shares » dépouillé donnerait « Gold », et la
   * fiche remonterait alors tout article citant l'or — un fil qui ne parlerait plus
   * de l'actif mais de sa matière. Le garde-fou « deux mots ou un chiffre » est ce
   * qui l'empêche, et il doit tenir.
   */
  it('refuse un alias d’un seul mot sans chiffre', () => {
    const gld = { name: 'SPDR Gold Shares', symbol: 'GLD' }
    expect(mentions('Gold edges higher near $4,400', gld)).toBe(false)
    // Le symbole, lui, reste cherchable — en capitales, comme toujours.
    expect(mentions('GLD sees record inflows', gld)).toBe(true)
  })

  it('laisse intact un nom qui ne porte aucun émetteur connu', () => {
    const btc = { name: 'Bitcoin', symbol: 'BTC' }
    expect(mentions('Bitcoin tops $64,000', btc)).toBe(true)
    expect(mentions('Ethereum tops $4,000', btc)).toBe(false)
  })

  /* Un alias ne doit pas rendre la recherche PLUS permissive sur le nom entier : un
     fonds « Vanguard Total Stock Market » ne doit pas remonter sur un article qui ne
     cite que « Vanguard ». */
  it('ne remonte pas sur le seul nom de l’émetteur', () => {
    const vti = { name: 'Vanguard Total Stock Market', symbol: 'VTI' }
    expect(mentions('Vanguard lowers its fees', vti)).toBe(false)
    expect(mentions('Total Stock Market funds gather assets', vti)).toBe(true)
  })
})
