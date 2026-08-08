/**
 * Adaptateur Frankfurter — forex, taux de référence BCE (§5).
 *
 * Aucune clé, aucun quota annoncé, données publiées par la Banque centrale
 * européenne. En contrepartie : un seul taux par jour ouvré, pas d'intraday et pas
 * de volume. C'est le fournisseur qui, dans ce socle, exerce le chemin « champs
 * réellement absents » — capitalisation et volume restent `undefined` et l'UI doit
 * les rendre comme absents plutôt que comme zéro.
 */

import { createHttpClient } from '../http'
import type { ListAssetsParams, MarketAsset, MarketDataProvider } from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'frankfurter'
const BASE_CURRENCY = 'EUR'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.frankfurter.dev/v1',
  maxRequestsPerWindow: 20,
  minIntervalMs: 200,
})

/** Paires majeures cotées contre l'euro, dans l'ordre d'affichage. */
const MAJOR_PAIRS = [
  { code: 'USD', name: 'Dollar américain' },
  { code: 'GBP', name: 'Livre sterling' },
  { code: 'JPY', name: 'Yen japonais' },
  { code: 'CHF', name: 'Franc suisse' },
  { code: 'CAD', name: 'Dollar canadien' },
  { code: 'AUD', name: 'Dollar australien' },
  { code: 'CNY', name: 'Yuan chinois' },
  { code: 'SEK', name: 'Couronne suédoise' },
] as const

interface FrankfurterTimeSeries {
  base: string
  start_date: string
  end_date: string
  rates: Record<string, Record<string, number>>
}

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export const frankfurterProvider: MarketDataProvider = {
  id: PROVIDER_ID,
  label: 'Frankfurter (BCE)',
  assetClasses: ['forex'],
  attributionUrl: 'https://frankfurter.dev',

  isConfigured: () => true,
  unavailableReason: () => null,

  async listAssets(params: ListAssetsParams = {}): Promise<MarketAsset[]> {
    const symbols = MAJOR_PAIRS.map((pair) => pair.code)

    // Une seule requête pour la série : elle fournit à la fois le dernier taux,
    // le taux précédent (pour la variation) et le tracé du graphique.
    const series = await http.getJson<FrankfurterTimeSeries>(`${isoDaysAgo(12)}..`, {
      base: BASE_CURRENCY,
      symbols: symbols.join(','),
    })

    const dates = Object.keys(series.rates ?? {}).sort()
    if (dates.length === 0) {
      throw new ProviderError(PROVIDER_ID, 'Aucun taux publié sur la période')
    }

    const lastDate = dates[dates.length - 1] as string
    const previousDate = dates.length > 1 ? (dates[dates.length - 2] as string) : undefined

    const assets: MarketAsset[] = []

    for (const pair of MAJOR_PAIRS) {
      const rate = series.rates[lastDate]?.[pair.code]
      if (rate === undefined) continue

      const asset: MarketAsset = {
        id: `eur-${pair.code.toLowerCase()}`,
        symbol: `${BASE_CURRENCY}/${pair.code}`,
        name: `Euro / ${pair.name}`,
        assetClass: 'forex',
        price: rate,
        currency: pair.code,
        lastUpdated: `${lastDate}T00:00:00.000Z`,
      }

      const previousRate = previousDate ? series.rates[previousDate]?.[pair.code] : undefined
      if (previousRate !== undefined && previousRate !== 0) {
        asset.change24h = ((rate - previousRate) / previousRate) * 100
        asset.changePeriodLabel = 'depuis le taux BCE précédent'
      }

      const history = dates
        .map((date) => series.rates[date]?.[pair.code])
        .filter((value): value is number => value !== undefined)
      if (history.length > 1) asset.sparkline7d = history

      assets.push(asset)
    }

    const perPage = params.perPage ?? assets.length
    return assets.slice(0, perPage)
  },
}
