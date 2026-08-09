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
    expect(ranked.losers.map((entry) => entry.id)).toEqual(['avec'])

    // `avec` recule de 5 % : il n'a rien à faire parmi les hausses. Cette assertion
    // attendait auparavant `['avec']` — elle CONSACRAIT le défaut de chevauchement,
    // où un même actif figurait dans les deux listes.
    expect(ranked.gainers).toEqual([])
  })

  it('sépare hausses et baisses PAR SIGNE, sans les faire se rejoindre', () => {
    const assets = [
      asset('haut', { change1h: 9 }),
      asset('milieu', { change1h: 1 }),
      asset('bas', { change1h: -9 }),
    ]

    const ranked = rankMovers(assets, '1h', 2)

    expect(ranked.gainers.map((entry) => entry.id)).toEqual(['haut', 'milieu'])

    // `milieu` progresse de 1 % : c'est une hausse, même modeste. L'ancienne version
    // découpait les deux extrémités du tri (`slice(0, 2)` et `slice(-2)`), si bien
    // que sur trois actifs les tranches se recouvraient et que « plus fortes
    // baisses » affichait un actif EN HAUSSE. Le test l'attendait explicitement —
    // il consacrait le défaut au lieu de le détecter.
    expect(ranked.losers.map((entry) => entry.id)).toEqual(['bas'])
  })

  it('renvoie une liste vide plutôt que d’inventer des baisses quand tout monte', () => {
    const assets = [asset('a', { change24h: 5 }), asset('b', { change24h: 2 })]

    const ranked = rankMovers(assets, '24h', 5)

    expect(ranked.gainers.map((entry) => entry.id)).toEqual(['a', 'b'])
    // Une liste courte dit la vérité du marché ; une liste de longueur fixe la masque.
    expect(ranked.losers).toEqual([])
  })

  it('ne mute pas le tableau reçu', () => {
    const assets = [asset('a', { change24h: 1 }), asset('b', { change24h: 2 })]
    const order = assets.map((entry) => entry.id)

    rankMovers(assets, '24h', 2)

    expect(assets.map((entry) => entry.id)).toEqual(order)
  })
})
