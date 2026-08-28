import { describe, expect, it } from 'vitest'

import type { MarketAsset } from '@zenkuu/data'

import { fullyDilutedValuation, volatility7d } from './heatmap-metrics'

/** Le minimum qu'un `MarketAsset` doit porter pour que ces deux calculs aient un sens. */
function asset(overrides: Partial<MarketAsset>): MarketAsset {
  return {
    id: 'test',
    symbol: 'TST',
    name: 'Test',
    assetClass: 'crypto',
    price: 10,
    currency: 'eur',
    ...overrides,
  } as MarketAsset
}

describe('fullyDilutedValuation', () => {
  it('multiplie le prix par l’offre MAXIMALE quand elle existe', () => {
    expect(fullyDilutedValuation(asset({ price: 2, maxSupply: 1000, totalSupply: 500 }))).toBe(2000)
  })

  it('retombe sur l’offre totale quand il n’y a pas de plafond', () => {
    expect(fullyDilutedValuation(asset({ price: 2, totalSupply: 500 }))).toBe(1000)
  })

  it('ne retombe PAS sur l’offre en circulation', () => {
    /* Ce repli donnerait la capitalisation ordinaire sous le nom de capitalisation
       diluée : deux tuiles identiques sous deux étiquettes différentes. */
    expect(fullyDilutedValuation(asset({ price: 2, circulatingSupply: 400 }))).toBeUndefined()
  })

  it('rend indéfini plutôt que zéro sur une offre nulle ou un prix nul', () => {
    expect(fullyDilutedValuation(asset({ price: 2, maxSupply: 0 }))).toBeUndefined()
    expect(fullyDilutedValuation(asset({ price: 0, maxSupply: 100 }))).toBeUndefined()
  })
})

describe('volatility7d', () => {
  it('rend zéro sur une série parfaitement régulière', () => {
    /* Une croissance strictement géométrique a des variations identiques : leur
       dispersion est nulle, et c'est bien ce que la mesure doit dire. */
    const serie = [100, 110, 121, 133.1, 146.41]

    expect(volatility7d(asset({ sparkline7d: serie }))).toBeCloseTo(0, 6)
  })

  it('croît avec l’amplitude des secousses', () => {
    const calme = volatility7d(asset({ sparkline7d: [100, 101, 100, 101, 100] })) ?? 0
    const agite = volatility7d(asset({ sparkline7d: [100, 130, 90, 140, 80] })) ?? 0

    expect(agite).toBeGreaterThan(calme)
  })

  it('rend indéfini sans série, ou sur une série trop courte', () => {
    expect(volatility7d(asset({}))).toBeUndefined()
    expect(volatility7d(asset({ sparkline7d: [100, 110] }))).toBeUndefined()
  })

  it('saute un point nul au lieu de produire un infini', () => {
    /* Un zéro dans la série ferait diverger le rapport et écraserait l'échelle de
       couleur de TOUTE la carte, pas seulement de cette tuile. */
    const valeur = volatility7d(asset({ sparkline7d: [100, 0, 110, 105, 108] }))

    expect(valeur).toBeDefined()
    expect(Number.isFinite(valeur as number)).toBe(true)
  })
})
