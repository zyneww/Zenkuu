/**
 * Adaptateur Yahoo Finance — actions, ETF, matières premières, indices.
 *
 * ⚠️ ENDPOINT NON OFFICIEL. Yahoo ne publie pas d'API pour ces données ; `v8/chart`
 * est l'endpoint qui alimente leurs propres pages web. Conséquences assumées :
 *
 *   • il exige un User-Agent de navigateur (sans lui, Yahoo répond 429 immédiatement) ;
 *   • il peut disparaître sans préavis ;
 *   • `v7/quote`, qui permettait d'interroger plusieurs symboles d'un coup, a DÉJÀ été
 *     fermé (401) — d'où une requête par symbole ici.
 *
 * C'est aujourd'hui la seule voie SANS CLÉ vers ces quatre classes d'actifs. Le
 * registre est donc construit pour lui préférer automatiquement un fournisseur sous
 * clé dès qu'une clé est renseignée : voir l'ordre de `PROVIDERS` dans registry.ts.
 * Si Yahoo ferme, ces classes basculent en état vide explicite — jamais en données
 * inventées (§5).
 */

import { createHttpClient } from '../http'
import type {
  AssetClass,
  ListAssetsParams,
  MarketAsset,
  MarketDataProvider,
  PriceHistory,
} from '../types'
import { ProviderError } from '../types'
import { YAHOO_UNIVERSE, toSlug, type UniverseEntry } from './yahoo-universe'

const PROVIDER_ID = 'yahoo-finance'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://query1.finance.yahoo.com/v8/finance',
  // Une requête par symbole : un classement de 18 valeurs consomme 18 appels. Le
  // cache 5 min et la déduplication des requêtes concurrentes ramènent le débit réel
  // très en deçà, mais la fenêtre doit rester assez large pour un premier rendu.
  maxRequestsPerWindow: 60,
  minIntervalMs: 60,
  timeoutMs: 12_000,
  headers: {
    // Indispensable : Yahoo renvoie 429 à tout client qui ne se présente pas comme
    // un navigateur. Vérifié — sans cet en-tête, aucune requête ne passe.
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  },
})

interface YahooChartResponse {
  chart: {
    result:
      | {
          meta: {
            symbol: string
            currency?: string
            regularMarketPrice?: number
            chartPreviousClose?: number
            regularMarketDayHigh?: number
            regularMarketDayLow?: number
            regularMarketVolume?: number
            fiftyTwoWeekHigh?: number
            fiftyTwoWeekLow?: number
            longName?: string
            shortName?: string
            fullExchangeName?: string
            regularMarketTime?: number
          }
          timestamp?: number[]
          indicators: { quote: { close?: (number | null)[] }[] }
        }[]
      | null
    error: { description?: string } | null
  }
}

/** Séries de clôtures, trous retirés — Yahoo insère des `null` sur les séances creuses. */
function closeSeries(result: NonNullable<YahooChartResponse['chart']['result']>[number]): number[] {
  const raw = result.indicators?.quote?.[0]?.close ?? []
  return raw.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function percentChange(from: number | undefined, to: number | undefined): number | undefined {
  if (from === undefined || to === undefined || from === 0) return undefined
  return ((to - from) / from) * 100
}

async function fetchChart(symbol: string, range: string, interval: string) {
  const payload = await http.getJson<YahooChartResponse>(
    `chart/${encodeURIComponent(symbol)}`,
    { range, interval, includePrePost: false },
  )

  const result = payload.chart?.result?.[0]
  if (!result) {
    throw new ProviderError(
      PROVIDER_ID,
      payload.chart?.error?.description ?? `Symbole « ${symbol} » inconnu de la source`,
    )
  }
  return result
}

function toMarketAsset(
  result: NonNullable<YahooChartResponse['chart']['result']>[number],
  entry: UniverseEntry,
  assetClass: AssetClass,
): MarketAsset {
  const meta = result.meta
  const closes = closeSeries(result)
  const price = meta.regularMarketPrice ?? closes[closes.length - 1]

  if (price === undefined) {
    throw new ProviderError(PROVIDER_ID, `Aucun cours pour « ${entry.symbol} »`)
  }

  const asset: MarketAsset = {
    id: toSlug(entry.symbol),
    symbol: entry.symbol,
    // On privilégie notre libellé : Yahoo renvoie « LVMH Moet Hennessy - Louis
    // Vuitton, Societe Europeenne », illisible dans un tableau.
    name: entry.name || meta.longName || meta.shortName || entry.symbol,
    assetClass,
    price,
    currency: (meta.currency ?? 'USD').toUpperCase(),
    lastUpdated: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
  }

  // Variation quotidienne : dernier cours contre clôture de la veille, prise dans la
  // série. `chartPreviousClose` désigne la clôture précédant la FENÊTRE demandée —
  // sur une plage d'un mois, l'utiliser afficherait une variation mensuelle sous le
  // libellé « 24 h ».
  const previous = closes[closes.length - 2]
  const change24h = percentChange(previous, price)
  if (change24h !== undefined) asset.change24h = change24h

  // 7 jours calendaires ≈ 5 séances de bourse.
  const weekAgo = closes[closes.length - 6]
  const change7d = percentChange(weekAgo, price)
  if (change7d !== undefined) asset.change7d = change7d

  if (closes.length > 1) asset.sparkline7d = closes.slice(-30)
  if (meta.regularMarketVolume !== undefined) asset.volume24h = meta.regularMarketVolume
  if (meta.regularMarketDayHigh !== undefined) asset.high24h = meta.regularMarketDayHigh
  if (meta.regularMarketDayLow !== undefined) asset.low24h = meta.regularMarketDayLow
  if (meta.fiftyTwoWeekHigh !== undefined) asset.ath = meta.fiftyTwoWeekHigh
  if (meta.fiftyTwoWeekLow !== undefined) asset.atl = meta.fiftyTwoWeekLow
  if (meta.fullExchangeName) asset.exchange = meta.fullExchangeName

  // Pas de capitalisation : elle vit dans `quoteSummary`, fermé aux clients non
  // authentifiés. Le champ reste absent et s'affiche « — » (§5).

  return asset
}

const SUPPORTED: AssetClass[] = ['stock', 'etf', 'commodity', 'index']

export const yahooProvider: MarketDataProvider = {
  id: PROVIDER_ID,
  label: 'Yahoo Finance',
  assetClasses: SUPPORTED,
  attributionUrl: 'https://finance.yahoo.com',

  isConfigured: () => true,
  unavailableReason: () => null,

  async listAssets(params: ListAssetsParams = {}): Promise<MarketAsset[]> {
    const assetClass = params.assetClass
    if (!assetClass || !SUPPORTED.includes(assetClass)) {
      throw new ProviderError(PROVIDER_ID, 'Classe d’actif non couverte par ce fournisseur')
    }

    const universe = YAHOO_UNIVERSE[assetClass as keyof typeof YAHOO_UNIVERSE] ?? []
    const wanted = universe.slice(0, params.perPage ?? universe.length)

    // Un symbole en échec ne doit pas emporter toute la page : on écarte la ligne
    // concernée et on affiche les autres, plutôt que de basculer le tableau entier
    // en état vide pour un seul contrat à terme illiquide.
    const settled = await Promise.allSettled(
      wanted.map(async (entry) => {
        const result = await fetchChart(entry.symbol, '1mo', '1d')
        return toMarketAsset(result, entry, assetClass)
      }),
    )

    const assets = settled
      .filter((outcome): outcome is PromiseFulfilledResult<MarketAsset> => outcome.status === 'fulfilled')
      .map((outcome) => outcome.value)

    if (assets.length === 0) {
      throw new ProviderError(PROVIDER_ID, 'Aucun symbole n’a répondu', { retryable: true })
    }

    const direction = params.sortDirection === 'asc' ? 1 : -1
    if (params.sortBy === 'change24h') {
      assets.sort((a, b) => direction * ((a.change24h ?? 0) - (b.change24h ?? 0)))
    } else if (params.sortBy === 'volume24h') {
      assets.sort((a, b) => direction * ((a.volume24h ?? 0) - (b.volume24h ?? 0)))
    }

    return assets.map((asset, index) => ({ ...asset, rank: index + 1 }))
  },

  async getAsset(id: string, assetClass: AssetClass): Promise<MarketAsset> {
    const universe = YAHOO_UNIVERSE[assetClass as keyof typeof YAHOO_UNIVERSE] ?? []
    const entry = universe.find((candidate) => toSlug(candidate.symbol) === id)
    if (!entry) throw new ProviderError(PROVIDER_ID, `Actif « ${id} » hors univers suivi`)

    const result = await fetchChart(entry.symbol, '1mo', '1d')
    return toMarketAsset(result, entry, assetClass)
  },

  async getHistory(id: string, days: number, assetClass?: AssetClass): Promise<PriceHistory> {
    const classes: AssetClass[] = assetClass ? [assetClass] : SUPPORTED
    let entry: UniverseEntry | undefined

    for (const candidate of classes) {
      entry = YAHOO_UNIVERSE[candidate as keyof typeof YAHOO_UNIVERSE]?.find(
        (item) => toSlug(item.symbol) === id,
      )
      if (entry) break
    }
    if (!entry) throw new ProviderError(PROVIDER_ID, `Actif « ${id} » hors univers suivi`)

    // Granularité adaptée à la fenêtre : une journée en pas horaire, une année en
    // pas quotidien. Demander un pas horaire sur un an renverrait des milliers de
    // points pour un graphique large de 700 pixels.
    const { range, interval } =
      days <= 1
        ? { range: '1d', interval: '5m' }
        : days <= 7
          ? { range: '7d', interval: '60m' }
          : days <= 30
            ? { range: '1mo', interval: '1d' }
            : days <= 90
              ? { range: '3mo', interval: '1d' }
              : { range: '1y', interval: '1d' }

    const result = await fetchChart(entry.symbol, range, interval)
    const closes = result.indicators?.quote?.[0]?.close ?? []
    const stamps = result.timestamp ?? []

    const points = stamps
      .map((timestamp, index) => ({ timestamp: timestamp * 1000, price: closes[index] }))
      .filter((point): point is { timestamp: number; price: number } =>
        typeof point.price === 'number' && Number.isFinite(point.price),
      )

    if (points.length < 2) {
      throw new ProviderError(PROVIDER_ID, `Historique insuffisant pour « ${id} »`)
    }

    return { points, currency: (result.meta.currency ?? 'USD').toUpperCase(), days }
  },
}
