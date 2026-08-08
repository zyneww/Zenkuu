/**
 * Fournisseurs sous clé, déclarés mais pas encore écrits (§5, §6).
 *
 * Ces entrées existent pour deux raisons. D'abord pour que l'indisponibilité d'une
 * source soit une DONNÉE du registre plutôt qu'un texte codé en dur dans une page.
 * Ensuite pour documenter le chemin de sortie de Yahoo : le jour où l'un de ces
 * adaptateurs est écrit, il prend automatiquement le pas sur l'endpoint non officiel,
 * puisque `PROVIDERS` les place avant lui.
 *
 * Point important : `isConfigured()` renvoie TOUJOURS `false` ici, même une clé
 * renseignée. Renvoyer `true` sur la seule présence d'une clé ferait élire par le
 * registre un fournisseur dont `listAssets` lève une exception — autrement dit,
 * ajouter une clé casserait la classe d'actif au lieu de l'améliorer. Un adaptateur
 * n'est sélectionnable que lorsqu'il est réellement implémenté.
 */

import type { AssetClass, MarketDataProvider } from '../types'
import { ProviderError } from '../types'

interface PendingProviderSpec {
  id: string
  label: string
  assetClasses: readonly AssetClass[]
  attributionUrl: string
  /** Variable d'environnement qui débloquera ce fournisseur, une fois écrit. */
  envVar: string
  /** Ce que cette source apportera de plus que la source actuelle. */
  benefit: string
}

function createPendingProvider(spec: PendingProviderSpec): MarketDataProvider {
  return {
    id: spec.id,
    label: spec.label,
    assetClasses: spec.assetClasses,
    attributionUrl: spec.attributionUrl,

    isConfigured: () => false,

    unavailableReason() {
      const hasKey = Boolean(process.env[spec.envVar]?.trim())
      return hasKey
        ? `Clé ${spec.label} détectée, mais l’adaptateur reste à écrire — ${spec.benefit}`
        : `Source ${spec.label} non configurée (${spec.envVar}) — ${spec.benefit}`
    },

    async listAssets() {
      throw new ProviderError(spec.id, `Adaptateur ${spec.label} pas encore implémenté`)
    },
  }
}

export const twelveDataProvider = createPendingProvider({
  id: 'twelve-data',
  label: 'Twelve Data',
  assetClasses: ['stock', 'etf', 'index'],
  attributionUrl: 'https://twelvedata.com',
  envVar: 'TWELVE_DATA_API_KEY',
  benefit: 'listings officiels et capitalisations, là où Yahoo impose un univers figé',
})

export const finnhubProvider = createPendingProvider({
  id: 'finnhub',
  label: 'Finnhub',
  assetClasses: ['stock'],
  attributionUrl: 'https://finnhub.io',
  envVar: 'FINNHUB_API_KEY',
  benefit: 'cotations temps réel et fondamentaux, sous contrat d’utilisation clair',
})

export const alphaVantageProvider = createPendingProvider({
  id: 'alpha-vantage',
  label: 'Alpha Vantage',
  assetClasses: ['commodity'],
  attributionUrl: 'https://www.alphavantage.co',
  envVar: 'ALPHA_VANTAGE_API_KEY',
  benefit: 'séries dédiées aux matières premières plutôt que des contrats à terme',
})

export const reservoirProvider = createPendingProvider({
  id: 'reservoir',
  label: 'Reservoir',
  assetClasses: ['nft'],
  attributionUrl: 'https://reservoir.tools',
  envVar: 'RESERVOIR_API_KEY',
  benefit: 'collections, floor price et volumes multi-marketplaces',
})
