import { describe, expect, it } from 'vitest'

import type { AssetTicker } from '@zenkuu/data'

import { tradingViewMarketCapSymbol, tradingViewSymbol } from './tradingview-symbol'

/**
 * Le contrôle porte d'abord sur les cas qui doivent rendre `null`.
 *
 * Un symbole mal traduit ne casse rien de visible côté code : TradingView affiche son
 * propre « ce symbole n'existe pas » dans un cadre de six cents pixels, et l'on croit
 * à une panne de leur côté. C'est exactement le défaut qui a fait réserver ce moteur
 * à la crypto pendant des mois.
 */
/** Une cotation minimale : seuls les champs que la traduction regarde. */
function ticker(
  exchangeId: string,
  base: string,
  target: string,
  volume24h?: number,
): AssetTicker {
  return {
    exchange: exchangeId,
    exchangeId,
    base,
    target,
    price: 1,
    currency: 'usd',
    ...(volume24h !== undefined ? { volume24h } : {}),
  }
}

describe('crypto', () => {
  it('lit la place la plus active parmi celles que TradingView cote', () => {
    expect(
      tradingViewSymbol('crypto', 'HYPE', [
        ticker('kucoin', 'HYPE', 'USDT', 15_000_000),
        ticker('okex', 'HYPE', 'USDT', 70_000_000),
        ticker('gdax', 'HYPE', 'USD', 66_000_000),
      ]),
    ).toBe('OKX:HYPEUSDT')
  })

  it('préfère le dollar au reste, même sur une place moins active', () => {
    /* Une paire en bitcoin trace deux variations à la fois : elle est écartée quelle
       que soit sa taille, pas classée après. */
    expect(
      tradingViewSymbol('crypto', 'HYPE', [
        ticker('binance', 'HYPE', 'BTC', 900_000_000),
        ticker('kraken', 'HYPE', 'USD', 1_000),
      ]),
    ).toBe('KRAKEN:HYPEUSD')
  })

  it('classe USDT devant USD à volume moindre', () => {
    expect(
      tradingViewSymbol('crypto', 'BTC', [
        ticker('gdax', 'BTC', 'USD', 900_000_000),
        ticker('binance', 'BTC', 'USDT', 1_000),
      ]),
    ).toBe('BINANCE:BTCUSDT')
  })

  it('ne devine plus BINANCE quand aucune place ne convient', () => {
    /* ⚠️ C'EST LA RÉGRESSION QUE CE FICHIER SURVEILLE. La version précédente rendait
       `BINANCE:{SYM}USDT` sans rien vérifier, et l'interrupteur ouvrait un cadre vide
       portant « Ce symbole n'existe pas » pour tout jeton absent de Binance. */
    expect(tradingViewSymbol('crypto', 'HYPE', [])).toBeNull()
    expect(
      tradingViewSymbol('crypto', 'HYPE', [ticker('hyperliquid', 'HYPE', 'USDC', 9e8)]),
    ).toBeNull()
  })
})

describe('actions et ETF', () => {
  it('rend le ticker nu, que TradingView résout seul', () => {
    expect(tradingViewSymbol('stock', 'nvda')).toBe('NVDA')
    expect(tradingViewSymbol('etf', 'SPY')).toBe('SPY')
  })

  it('convertit le tiret de catégorie en point', () => {
    /* Yahoo écrit `BRK-B`, TradingView `BRK.B`. Sans cette règle, la seule action à
       catégories multiples de l'univers ouvrait un cadre vide. */
    expect(tradingViewSymbol('stock', 'BRK-B')).toBe('BRK.B')
  })
})

describe('devises', () => {
  it('retire le suffixe de Yahoo et préfixe la place', () => {
    expect(tradingViewSymbol('forex', 'EURUSD=X')).toBe('FX:EURUSD')
    expect(tradingViewSymbol('forex', 'usdjpy=x')).toBe('FX:USDJPY')
  })

  it('refuse ce qui n’est pas une paire à six lettres', () => {
    expect(tradingViewSymbol('forex', 'EUR=X')).toBeNull()
    expect(tradingViewSymbol('forex', 'EURUSDT=X')).toBeNull()
  })
})

describe('matières premières et indices', () => {
  it('traduit les contrats de l’univers', () => {
    expect(tradingViewSymbol('commodity', 'GC=F')).toBe('COMEX:GC1!')
    expect(tradingViewSymbol('commodity', 'CL=F')).toBe('NYMEX:CL1!')
    expect(tradingViewSymbol('commodity', 'KC=F')).toBe('ICEUS:KC1!')
  })

  it('traduit les indices de l’univers', () => {
    expect(tradingViewSymbol('index', '^GSPC')).toBe('SP:SPX')
    expect(tradingViewSymbol('index', '^FCHI')).toBe('EURONEXT:PX1')
  })

  it('ne devine pas un symbole absent de la table', () => {
    /* C'est LA garantie du fichier : un contrat ajouté à l'univers sans être ajouté à
       la table perd le moteur externe, il n'ouvre pas un graphique faux. */
    expect(tradingViewSymbol('commodity', 'ZZ=F')).toBeNull()
    expect(tradingViewSymbol('index', '^INCONNU')).toBeNull()
  })
})

describe('cas limites', () => {
  it('ne rend rien pour un symbole vide', () => {
    expect(tradingViewSymbol('crypto', '', [ticker('binance', 'BTC', 'USDT')])).toBeNull()
    expect(tradingViewSymbol('stock', '   ')).toBeNull()
  })

  it('ne rend rien pour une classe que TradingView ne cote pas', () => {
    expect(tradingViewSymbol('nft', 'punks')).toBeNull()
  })
})

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE SYMBOLE DE CAPITALISATION — ET SURTOUT LES CLASSES QUI N'EN ONT PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le contrôle porte d'abord sur les `null`, pour la raison écrite en tête de fichier :
 * un symbole inventé n'échoue pas côté code, il affiche « symbole inconnu » dans un
 * cadre de six cents pixels et se lit comme une panne du site.
 *
 * Ici le risque est précis : `CRYPTOCAP` n'existe QUE pour les cryptomonnaies. Le
 * préfixer à un code d'action produirait `CRYPTOCAP:AAPL`, qui a toutes les apparences
 * d'un symbole valide et n'en est pas un.
 */
describe('tradingViewMarketCapSymbol', () => {
  it('préfixe le code des cryptomonnaies', () => {
    expect(tradingViewMarketCapSymbol('crypto', 'btc')).toBe('CRYPTOCAP:BTC')
    expect(tradingViewMarketCapSymbol('crypto', 'ETH')).toBe('CRYPTOCAP:ETH')
  })

  it('ne rend rien pour les six autres classes', () => {
    /* Aucune ne cote sa capitalisation comme un instrument : celle d'une entreprise se
       déduit d'un cours et d'un nombre d'actions, elle ne se négocie pas. */
    for (const classe of ['stock', 'etf', 'index', 'commodity', 'forex', 'nft'] as const) {
      expect(tradingViewMarketCapSymbol(classe, 'AAPL')).toBeNull()
    }
  })

  it('écarte les codes que le jeu CRYPTOCAP ne peut pas porter', () => {
    /* Un tiret, un point ou un espace n'y figurent pas. Rendre `null` fait griser le
       sélecteur ; préfixer produirait un symbole introuvable, donc un cadre en erreur. */
    expect(tradingViewMarketCapSymbol('crypto', 'BRK-B')).toBeNull()
    expect(tradingViewMarketCapSymbol('crypto', 'EUR=X')).toBeNull()
    expect(tradingViewMarketCapSymbol('crypto', '')).toBeNull()
  })

  it('accepte les codes numériques et longs, dans la limite du jeu', () => {
    expect(tradingViewMarketCapSymbol('crypto', '1inch')).toBe('CRYPTOCAP:1INCH')
    expect(tradingViewMarketCapSymbol('crypto', 'abcdefghijklm')).toBeNull()
  })
})
