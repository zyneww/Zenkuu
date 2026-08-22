import { describe, expect, it } from 'vitest'

import type { MarketAsset, MarketCategory } from '@zenkuu/data'

import { buildSectors, drift } from './explorer-sectors'

function asset(id: string, marketCap: number, volume24h?: number): MarketAsset {
  return {
    id,
    symbol: id.slice(0, 3),
    name: id,
    assetClass: 'crypto',
    price: 1,
    currency: 'EUR',
    marketCap,
    ...(volume24h === undefined ? {} : { volume24h }),
    lastUpdated: '2026-08-21T00:00:00.000Z',
  }
}

function category(id: string, marketCap: number, topAssetIds: string[]): MarketCategory {
  return { id, name: id, marketCap, topAssetIds }
}

const OPTIONS = { limit: 4, floor: 10_000_000 }

describe('buildSectors', () => {
  it('ne place un actif que dans le plus grand secteur qui le revendique', () => {
    /* Le cas réel : Bitcoin figure dans trois catégories de la source. Rendues telles
       quelles, la carte montrait trois grandes tuiles Bitcoin côte à côte. */
    const sectors = buildSectors(
      [
        category('grand', 3_000_000_000, ['btc', 'eth']),
        category('moyen', 2_000_000_000, ['btc', 'sol']),
      ],
      [asset('btc', 1_000), asset('eth', 500), asset('sol', 200)],
      OPTIONS,
    )

    expect(sectors.map((sector) => sector.assets.map((entry) => entry.id))).toEqual([
      ['btc', 'eth'],
      ['sol'],
    ])
  })

  it('saute un secteur dont tous les actifs sont déjà placés', () => {
    const sectors = buildSectors(
      [
        category('grand', 3_000_000_000, ['btc']),
        category('doublon', 2_000_000_000, ['btc']),
        category('autre', 1_000_000_000, ['eth']),
      ],
      [asset('btc', 1_000), asset('eth', 500)],
      OPTIONS,
    )

    expect(sectors.map((sector) => sector.id)).toEqual(['grand', 'autre'])
  })

  it('ne laisse pas un secteur écarté consommer les actifs du suivant', () => {
    /* Le piège de la règle précédente : marquer les actifs pendant la collecte plutôt
       qu'après la décision ferait disparaître « autre » aussi, mangé par un secteur
       qui ne s'affiche nulle part. */
    const sectors = buildSectors(
      [
        category('trop-petit', 1_000, ['eth']),
        category('grand', 3_000_000_000, ['btc']),
        category('autre', 1_000_000_000, ['eth']),
      ],
      [asset('btc', 1_000), asset('eth', 500)],
      OPTIONS,
    )

    expect(sectors.map((sector) => sector.id)).toEqual(['grand', 'autre'])
  })

  it('somme les tuiles au lieu de reprendre la capitalisation publiée du secteur', () => {
    const [sector] = buildSectors(
      [category('grand', 9_000_000_000, ['btc', 'eth'])],
      [asset('btc', 1_000, 7), asset('eth', 500, 3)],
      OPTIONS,
    )

    expect(sector?.marketCap).toBe(1_500)
    expect(sector?.volume24h).toBe(10)
  })

  it('écarte les secteurs sous le plancher et s’arrête à la limite demandée', () => {
    const sectors = buildSectors(
      [
        category('sous-plancher', 1_000, ['a']),
        category('un', 4_000_000_000, ['b']),
        category('deux', 3_000_000_000, ['c']),
        category('trois', 2_000_000_000, ['d']),
      ],
      [asset('a', 1), asset('b', 2), asset('c', 3), asset('d', 4)],
      { limit: 2, floor: 10_000_000 },
    )

    expect(sectors.map((sector) => sector.id)).toEqual(['un', 'deux'])
  })

  it('ignore un actif inconnu ou sans capitalisation', () => {
    const sectors = buildSectors(
      [category('grand', 3_000_000_000, ['fantome', 'vide', 'btc'])],
      [asset('vide', 0), asset('btc', 1_000)],
      OPTIONS,
    )

    expect(sectors[0]?.assets.map((entry) => entry.id)).toEqual(['btc'])
  })
})

describe('drift', () => {
  it('mesure l’écart du premier au dernier relevé', () => {
    expect(drift([100, 110])).toBeCloseTo(10)
    expect(drift([200, 150])).toBeCloseTo(-25)
  })

  it('rend undefined plutôt qu’un nombre inventé', () => {
    expect(drift([])).toBeUndefined()
    expect(drift([100])).toBeUndefined()
    expect(drift([0, 50])).toBeUndefined()
  })
})
