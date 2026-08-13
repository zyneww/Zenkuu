import { describe, expect, test } from 'vitest'

import type { MarketAsset } from '@zenkuu/data'

import { buildListingIndex, matchListing } from './listing-match'

function asset(id: string, symbol: string, name: string, image?: string): MarketAsset {
  return {
    id,
    symbol,
    name,
    assetClass: 'crypto',
    price: 1,
    currency: 'eur',
    lastUpdated: '2026-08-13T00:00:00Z',
    ...(image ? { image } : {}),
  } as MarketAsset
}

describe('rapprochement des cotations récentes', () => {
  const index = buildListingIndex([
    asset('solana', 'SOL', 'Solana', 'https://img/sol.png'),
    asset('bitcoin', 'BTC', 'Bitcoin'),
    asset('usd-coin', 'USDC', 'USDC'),
  ])

  test('apparie sur symbole ET nom', () => {
    expect(matchListing({ symbol: 'SOL', name: 'Solana' }, index)).toEqual({
      id: 'solana',
      image: 'https://img/sol.png',
    })
  })

  /*
   * LE TEST QUI JUSTIFIE TOUT LE MODULE.
   *
   * Des dizaines de jetons réutilisent le symbole d'un actif majeur. Un appariement
   * par symbole seul enverrait cette copie vers la fiche de Solana — un lien
   * plausible et faux, ce qui est pire qu'un lien absent.
   */
  test('refuse un symbole réutilisé par un autre jeton', () => {
    expect(matchListing({ symbol: 'SOL', name: 'Solana Fork Staccana' }, index)).toBeUndefined()
  })

  test('refuse un nom identique porté par un autre symbole', () => {
    expect(matchListing({ symbol: 'SOLX', name: 'Solana' }, index)).toBeUndefined()
  })

  /*
   * La ponctuation et la casse sont IGNORÉES, les mots ne le sont pas. C'est la
   * limite que la normalisation trace : « USD-C » et « usdc » sont le même actif écrit
   * de deux façons, « USDC Bridged » en est un autre.
   */
  test('ignore casse et ponctuation, pas les mots', () => {
    expect(matchListing({ symbol: 'usdc', name: 'USD-C' }, index)?.id).toBe('usd-coin')
    expect(matchListing({ symbol: 'USDC', name: 'usdc' }, index)?.id).toBe('usd-coin')
    expect(matchListing({ symbol: 'USDC', name: 'USDC Bridged' }, index)).toBeUndefined()
  })

  test('rend undefined plutôt qu’une approximation', () => {
    expect(matchListing({ symbol: 'ZZZ', name: 'Inconnu' }, index)).toBeUndefined()
  })

  /*
   * L'univers arrive trié par capitalisation décroissante. Sur une homonymie
   * parfaite, c'est le PREMIER vu — donc le plus gros — qui doit l'emporter, sans
   * quoi un lecteur cliquant « BTC / Bitcoin » atterrirait sur la copie.
   */
  test('garde le premier en cas d’homonymie parfaite', () => {
    const collided = buildListingIndex([
      asset('bitcoin', 'BTC', 'Bitcoin'),
      asset('bitcoin-copie', 'BTC', 'Bitcoin'),
    ])
    expect(matchListing({ symbol: 'BTC', name: 'Bitcoin' }, collided)?.id).toBe('bitcoin')
  })
})
