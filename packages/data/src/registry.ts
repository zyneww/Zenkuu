/**
 * Registre des fournisseurs : classe d'actif → adaptateur.
 *
 * Seul endroit de l'application qui connaît la liste des fournisseurs. Ajouter une
 * source revient à écrire son adaptateur puis à l'inscrire ici (§4).
 */

import { binanceProvider } from './providers/binance'
import { coinGeckoProvider } from './providers/coingecko'
import { frankfurterProvider } from './providers/frankfurter'
import { yahooProvider } from './providers/yahoo'
import type { AssetClass, MarketDataProvider } from './types'
import { ASSET_CLASSES } from './types'

/**
 * L'ORDRE FAIT LA POLITIQUE DE SÉLECTION.
 *
 * `getProvider` retient le premier fournisseur configuré qui couvre la classe
 * demandée ; les suivants qui la couvrent aussi deviennent ses SECOURS, dans cet
 * ordre (voir `getFallbackProviders`).
 *
 * Politique retenue, et elle est volontairement courte :
 *   • crypto      → CoinGecko, secouru par Binance
 *   • devises     → Frankfurter (BCE)
 *   • actions,
 *     ETF, indices,
 *     mat. premières → Yahoo Finance
 *   • NFT         → aucune source retenue, la classe reste en état vide (§5)
 *
 * Les fournisseurs sous clé qui figuraient ici (Twelve Data, Alpha Vantage, Finnhub,
 * Reservoir) ont été RETIRÉS, pour trois raisons distinctes qu'il vaut mieux ne pas
 * confondre :
 *   · Finnhub interdit la redistribution hors accord écrit — or afficher des
 *     cotations à des visiteurs publics EST une redistribution ;
 *   · Reservoir a fermé son API le 15 octobre 2025, et les créations de compte
 *     étaient closes avant : sa clé ne pouvait donc plus être obtenue, et l'annoncer
 *     comme configurable était une promesse intenable ;
 *   · Twelve Data et Alpha Vantage n'ont simplement pas été retenus.
 *
 * Conséquence assumée pour les NFT : `getDeclaredProvider` ne trouve plus rien, et
 * `getAvailability` retombe sur « Aucune source gratuite retenue à ce jour ». C'est
 * exactement l'état réel — mieux vaut cette phrase qu'un nom de fournisseur qui
 * ferait croire à une clé à renseigner.
 */
const PROVIDERS: readonly MarketDataProvider[] = [
  coinGeckoProvider,
  binanceProvider,
  frankfurterProvider,
  yahooProvider,
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

/**
 * Méthodes de `MarketDataProvider` sur lesquelles un secours peut être tenté.
 *
 * Le type est restreint aux MÉTHODES DE DONNÉES, à l'exclusion des métadonnées et
 * de `isConfigured` : demander un secours sur `label` n'a aucun sens, et le typage
 * doit le rendre impossible plutôt que de compter sur la relecture.
 */
export type ProviderCapability = Extract<
  keyof MarketDataProvider,
  | 'listAssets'
  | 'getGlobalStats'
  | 'getTrending'
  | 'getAsset'
  | 'getHistory'
  | 'getOhlc'
  | 'getCategories'
  | 'getTickers'
  | 'getDerivatives'
  | 'getDerivativeExchanges'
  | 'getExchanges'
  | 'getExchangeProfile'
  | 'search'
>

/**
 * Les fournisseurs de secours pour cette classe, dans l'ordre de préférence.
 *
 * ── POURQUOI LA CAPACITÉ EST UN PARAMÈTRE OBLIGATOIRE ─────────────────────────
 *
 * Un secours n'est pas un clone. Binance sait lister des paires et rendre des
 * bougies ; il ne connaît ni les catégories, ni les places de cotation, ni la
 * capitalisation. Basculer aveuglément vers lui sur une requête qu'il ne sait pas
 * servir transformerait « CoinGecko a renvoyé 429 » en « méthode non supportée » —
 * un message plus obscur pour l'utilisateur, et une requête réseau gâchée.
 *
 * On ne retourne donc que les fournisseurs qui IMPLÉMENTENT RÉELLEMENT la méthode
 * visée. Le reste des requêtes conserve le comportement d'origine : erreur franche,
 * ou dernière valeur connue servie par le cache.
 */
export function getFallbackProviders(
  assetClass: AssetClass,
  capability: ProviderCapability,
): MarketDataProvider[] {
  const primary = getProvider(assetClass)
  if (!primary) return []

  return PROVIDERS.filter(
    (provider) =>
      provider !== primary &&
      provider.assetClasses.includes(assetClass) &&
      provider.isConfigured() &&
      typeof provider[capability] === 'function',
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
