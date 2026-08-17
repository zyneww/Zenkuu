import { describe, expect, it } from 'vitest'

import { repairTradeUrl } from './providers/coingecko'

/**
 * RÉPARATION DES LIENS DE PAIRE — et surtout, refus de réparer au hasard.
 *
 * Le défaut d'origine était visible : `okex.com` n'a plus d'enregistrement DNS, et
 * les 464 paires d'OKX pointaient toutes vers la même adresse morte.
 *
 * Le défaut introduit EN LE CORRIGEANT l'était beaucoup moins, et ces tests existent
 * d'abord pour lui. Une première version recomposait l'adresse à partir de la paire
 * sans regarder le nombre de segments, et transformait le contrat à échéance
 * « BTC-USD-260925 » en `/trade-spot/btc-usd-260925-usd`. Cette adresse ne rend pas
 * une erreur : elle rend la page du COMPTANT BTC/USDT, avec un cours crédible. Un
 * lien qui mène ailleurs sans le dire est pire qu'un lien cassé.
 */
describe('repairTradeUrl', () => {
  it('laisse intact un lien dont le domaine est vivant', () => {
    const binance = 'https://www.binance.com/en/futures/0GUSDT'
    expect(repairTradeUrl(binance, '0GUSDT')).toBe(binance)

    const hyperliquid = 'https://app.hyperliquid.xyz/trade/0G'
    expect(repairTradeUrl(hyperliquid, '0G-USD')).toBe(hyperliquid)
  })

  it('reconstruit un contrat perpétuel OKX vers le domaine vivant', () => {
    expect(repairTradeUrl('https://www.okex.com/future/swap', '0G-USDT-SWAP')).toBe(
      'https://www.okx.com/trade-swap/0g-usdt-swap',
    )
  })

  /** LE test de ce fichier — voir l'en-tête. */
  it('envoie un contrat à échéance vers les futures, jamais vers le comptant', () => {
    expect(repairTradeUrl('https://www.okex.com/future/swap', 'BTC-USD-260925')).toBe(
      'https://www.okx.com/trade-futures/btc-usd-260925',
    )
  })

  it('reconstruit une paire au comptant', () => {
    expect(repairTradeUrl('https://www.okex.com/trade', 'BTC-USDT')).toBe(
      'https://www.okx.com/trade-spot/btc-usdt',
    )
  })

  it('ne propose rien plutôt que de deviner une forme inconnue', () => {
    // Quatre segments : aucune des trois formes connues d'OKX.
    expect(repairTradeUrl('https://www.okex.com/future/swap', 'BTC-USD-260925-C-70000')).toBeUndefined()
    // Un seul segment : impossible d'en tirer une paire.
    expect(repairTradeUrl('https://www.okex.com/future/swap', 'BTC')).toBeUndefined()
    // Aucun symbole du tout.
    expect(repairTradeUrl('https://www.okex.com/future/swap', undefined)).toBeUndefined()
  })

  it('écarte ce qui n’est pas une adresse absolue', () => {
    expect(repairTradeUrl('/trade/BTCUSDT', 'BTC-USDT')).toBeUndefined()
    expect(repairTradeUrl('', 'BTC-USDT')).toBeUndefined()
    expect(repairTradeUrl(null, 'BTC-USDT')).toBeUndefined()
  })

  /* Le test porte sur le domaine ENTIER et non sur une sous-chaîne : `notokex.com`
     ne doit pas être confondu avec `okex.com`, et `www.okex.com` doit l'être. */
  it('ne confond pas un domaine qui contient le nom avec le domaine lui-même', () => {
    const impostor = 'https://notokex.com/trade/BTC-USDT'
    expect(repairTradeUrl(impostor, 'BTC-USDT')).toBe(impostor)
  })
})
