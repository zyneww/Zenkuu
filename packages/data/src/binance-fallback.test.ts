import { describe, expect, it } from 'vitest'

import { BINANCE_COVERAGE, binanceProvider } from './providers/binance'
import { getAvailability, getFallbackProviders, getProvider } from './registry'
import { ProviderError } from './types'

/**
 * Le secours Binance — tests de CONTRAT, sans aucun appel réseau.
 *
 * Chacun porte sur un défaut qui serait invisible autrement : la table de
 * correspondance compile quelle que soit son incohérence, et un secours mal
 * sélectionné ne se manifesterait qu'en production, pendant une panne CoinGecko —
 * c'est-à-dire au pire moment pour découvrir un bug.
 */

describe('table de correspondance Binance', () => {
  /*
   * UN SYMBOLE EN DOUBLE EST LE DÉFAUT LE PLUS GRAVE POSSIBLE ICI. L'index inverse
   * est construit en parcourant la table : deux entrées pointant sur « BTCUSDT » se
   * réduiraient à une seule, et le prix du bitcoin s'afficherait sous le nom de
   * l'autre actif. C'est exactement la donnée fausse que le §5 interdit — et elle
   * n'apparaîtrait qu'en pleine panne CoinGecko.
   */
  it('n’associe jamais deux actifs au même symbole', () => {
    const symbols = BINANCE_COVERAGE.map((entry) => entry.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })

  it('n’inscrit jamais deux fois le même identifiant', () => {
    const ids = BINANCE_COVERAGE.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  /*
   * Les identifiants sont ceux de CoinGecko, qui portent les URL du site. Un
   * identifiant mal formé ne serait jamais demandé, et le secours resterait
   * silencieusement inutile pour cet actif.
   */
  it('n’emploie que des identifiants CoinGecko bien formés', () => {
    for (const entry of BINANCE_COVERAGE) {
      expect(entry.id, `${entry.name} : identifiant douteux`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(entry.symbol, `${entry.name} : paire hors USDT`).toMatch(/^[A-Z0-9]+USDT$/)
      expect(entry.name.length, `${entry.id} sans nom`).toBeGreaterThan(0)
    }
  })

  it('refuse un actif hors table plutôt que de deviner son symbole', async () => {
    const error = await binanceProvider
      .getHistory!('un-jeton-inexistant', 7)
      .then(() => null)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ProviderError)
    expect((error as ProviderError).message).toContain('hors du secours')
  })

  it('refuse une classe d’actif qu’il ne couvre pas', async () => {
    const error = await binanceProvider
      .listAssets({ assetClass: 'stock' })
      .then(() => null)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ProviderError)
  })
})

describe('sélection du secours', () => {
  it('garde CoinGecko comme source principale de la crypto', () => {
    expect(getProvider('crypto')?.id).toBe('coingecko')
  })

  it('propose Binance en secours du classement', () => {
    const fallbacks = getFallbackProviders('crypto', 'listAssets')
    expect(fallbacks.map((provider) => provider.id)).toContain('binance')
  })

  /*
   * LE TEST QUI COMPTE LE PLUS. Binance ne publie pas de catégories. S'il était
   * proposé ici, un 429 CoinGecko sur `/categories` déclencherait un appel réseau
   * inutile pour finir sur « méthode non supportée » — un message plus obscur que
   * l'erreur d'origine, obtenu plus lentement.
   */
  it('n’offre aucun secours pour une donnée que Binance ne publie pas', () => {
    expect(getFallbackProviders('crypto', 'getCategories')).toEqual([])
    expect(getFallbackProviders('crypto', 'getTickers')).toEqual([])
    expect(getFallbackProviders('crypto', 'getGlobalStats')).toEqual([])
  })

  it('n’invente pas de secours pour les classes servies par une seule source', () => {
    expect(getFallbackProviders('forex', 'listAssets')).toEqual([])
    expect(getFallbackProviders('stock', 'listAssets')).toEqual([])
  })
})

describe('couverture annoncée', () => {
  /*
   * Les NFT n'ont plus AUCUN fournisseur déclaré depuis le retrait de Reservoir, dont
   * l'API a fermé le 15 octobre 2025. Le registre doit donc annoncer une absence de
   * source — et surtout pas nommer un fournisseur, ce qui laisserait croire qu'une clé
   * suffirait à débloquer la classe.
   */
  it('annonce les NFT comme sans source, sans nommer de fournisseur', () => {
    const nft = getAvailability().find((entry) => entry.assetClass === 'nft')

    expect(nft?.available).toBe(false)
    expect(nft?.providerLabel).toBeNull()
    expect(nft?.reason).toBe('Aucune source gratuite retenue à ce jour')
  })

  it('annonce toutes les autres classes comme couvertes', () => {
    const uncovered = getAvailability()
      .filter((entry) => !entry.available)
      .map((entry) => entry.assetClass)

    expect(uncovered).toEqual(['nft'])
  })
})
