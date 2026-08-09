import { describe, expect, it } from 'vitest'

import { rankMovers } from './queries'
import type { MarketAsset } from './types'

/**
 * Tests de `rankMovers` — la logique de classement des « mouvements ».
 *
 * On teste la fonction PURE plutôt que la page : le tri par période et l'exclusion
 * des données absentes sont les deux endroits où une erreur produirait un classement
 * faux sans rien casser visiblement. Le reste de la page (rendu, filtres d'URL) est
 * couvert par le typage et par la vérification HTTP.
 */

function asset(id: string, changes: Partial<MarketAsset>): MarketAsset {
  return {
    id,
    symbol: id.toUpperCase(),
    name: id,
    assetClass: 'crypto',
    price: 1,
    currency: 'EUR',
    lastUpdated: '2026-08-09T00:00:00.000Z',
    ...changes,
  }
}

describe('rankMovers', () => {
  it('classe sur la période demandée, pas sur 24 h', () => {
    const assets = [
      asset('a', { change24h: 50, change7d: -10 }),
      asset('b', { change24h: -50, change7d: 30 }),
    ]

    const on7d = rankMovers(assets, '7d', 1)
    expect(on7d.gainers[0]?.id).toBe('b')
    expect(on7d.field).toBe('change7d')

    const on24h = rankMovers(assets, '24h', 1)
    expect(on24h.gainers[0]?.id).toBe('a')
  })

  it('écarte les actifs sans variation sur la période au lieu de les traiter comme 0 %', () => {
    const assets = [
      asset('avec', { change30d: -5 }),
      asset('sans', {}),
    ]

    const ranked = rankMovers(assets, '30d', 10)

    // « sans » n'a pas de variation à 30 jours : le compter comme 0 % le placerait
    // devant « avec » et inventerait une stabilité que la source n'affirme pas.
    expect(ranked.gainers.map((entry) => entry.id)).toEqual(['avec'])
    expect(ranked.losers.map((entry) => entry.id)).toEqual(['avec'])
  })

  it('renvoie les hausses en tête et les baisses en queue, dans l’ordre', () => {
    const assets = [
      asset('haut', { change1h: 9 }),
      asset('milieu', { change1h: 1 }),
      asset('bas', { change1h: -9 }),
    ]

    const ranked = rankMovers(assets, '1h', 2)

    expect(ranked.gainers.map((entry) => entry.id)).toEqual(['haut', 'milieu'])
    // Les baisses sont les derniers du tri, réordonnés du plus négatif au moins.
    expect(ranked.losers.map((entry) => entry.id)).toEqual(['bas', 'milieu'])
  })

  it('ne mute pas le tableau reçu', () => {
    const assets = [asset('a', { change24h: 1 }), asset('b', { change24h: 2 })]
    const order = assets.map((entry) => entry.id)

    rankMovers(assets, '24h', 2)

    expect(assets.map((entry) => entry.id)).toEqual(order)
  })
})
