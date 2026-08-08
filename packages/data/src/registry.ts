/**
 * Registre des fournisseurs : classe d'actif → adaptateur.
 *
 * Seul endroit de l'application qui connaît la liste des fournisseurs. Ajouter une
 * source revient à écrire son adaptateur puis à l'inscrire ici (§4).
 */

import { coinGeckoProvider } from './providers/coingecko'
import { frankfurterProvider } from './providers/frankfurter'
import {
  alphaVantageProvider,
  finnhubProvider,
  reservoirProvider,
  twelveDataProvider,
} from './providers/pending'
import { yahooProvider } from './providers/yahoo'
import type { AssetClass, MarketDataProvider } from './types'
import { ASSET_CLASSES } from './types'

/**
 * L'ORDRE FAIT LA POLITIQUE DE SÉLECTION.
 *
 * `getProvider` retient le premier fournisseur configuré qui couvre la classe
 * demandée. Les sources sous clé sont donc placées AVANT Yahoo : le jour où l'une
 * d'elles est écrite et sa clé renseignée, elle supplante l'endpoint non officiel
 * sans qu'aucune page ne change. Yahoo joue le rôle de filet — il permet au site de
 * fonctionner sans aucune clé aujourd'hui, tout en restant remplaçable demain.
 */
const PROVIDERS: readonly MarketDataProvider[] = [
  coinGeckoProvider,
  frankfurterProvider,
  finnhubProvider,
  twelveDataProvider,
  alphaVantageProvider,
  yahooProvider,
  reservoirProvider,
]

/**
 * Le fournisseur utilisable pour cette classe d'actif, ou `null`.
 *
 * `null` n'est pas une erreur : c'est l'état normal d'une classe dont la source
 * n'est pas encore configurée. L'appelant doit rendre un état vide (§5).
 */
export function getProvider(assetClass: AssetClass): MarketDataProvider | null {
  return (
    PROVIDERS.find(
      (provider) => provider.assetClasses.includes(assetClass) && provider.isConfigured(),
    ) ?? null
  )
}

/** Le fournisseur déclaré pour cette classe, configuré ou non — pour expliquer l'absence. */
export function getDeclaredProvider(assetClass: AssetClass): MarketDataProvider | null {
  return (
    getProvider(assetClass) ??
    PROVIDERS.find((provider) => provider.assetClasses.includes(assetClass)) ??
    null
  )
}

export interface AssetClassAvailability {
  assetClass: AssetClass
  available: boolean
  providerLabel: string | null
  attributionUrl: string | null
  /** Renseigné uniquement lorsque `available` vaut `false`. */
  reason: string | null
}

/** État de couverture de chaque classe d'actif — alimente l'aperçu de l'accueil. */
export function getAvailability(): AssetClassAvailability[] {
  return ASSET_CLASSES.map((assetClass) => {
    const active = getProvider(assetClass)

    if (active) {
      return {
        assetClass,
        available: true,
        providerLabel: active.label,
        attributionUrl: active.attributionUrl,
        reason: null,
      }
    }

    const declared = PROVIDERS.find((provider) => provider.assetClasses.includes(assetClass))
    return {
      assetClass,
      available: false,
      providerLabel: declared?.label ?? null,
      attributionUrl: declared?.attributionUrl ?? null,
      reason: declared?.unavailableReason() ?? 'Aucune source gratuite retenue à ce jour',
    }
  })
}
