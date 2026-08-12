/**
 * Adaptateur Binance — crypto, EN SECOURS DE COINGECKO (§4, §5).
 *
 * ── CE QU'IL EST, ET CE QU'IL N'EST PAS ───────────────────────────────────────
 *
 * Binance cote des PAIRES D'ÉCHANGE, pas des actifs. Il publie un prix, un volume
 * et une variation sur 24 h ; il ne publie NI capitalisation, NI offre en
 * circulation, NI catégorie, NI fiche. Ce n'est donc pas un remplaçant de
 * CoinGecko : c'est un filet pour le seul cas où CoinGecko ne répond pas et où le
 * cache n'a rien de périmé à servir — typiquement un robot d'indexation qui ouvre
 * des pages froides en rafale, le scénario décrit dans `.env.example`.
 *
 * Les champs que Binance ignore restent ABSENTS (§5) : une ligne de secours affiche
 * « — » en capitalisation plutôt qu'un zéro. C'est visible, et c'est voulu.
 *
 * ── POURQUOI `data-api.binance.vision` ────────────────────────────────────────
 *
 * C'est le point d'entrée que Binance réserve aux données de marché publiques :
 * aucune clé, aucun compte. `api.binance.com` répondrait pareil, mais mêle données
 * publiques et endpoints de compte — autant ne jamais viser ces derniers.
 *
 * ⚠️ RESTRICTION GÉOGRAPHIQUE, VÉRIFIÉE ET STRUCTURANTE : Binance répond 451
 * (« Unavailable For Legal Reasons ») aux IP des États-Unis. La région d'exécution
 * est donc forcée en Europe dans `apps/web/vercel.json` — sans quoi cet adaptateur
 * fonctionnerait en développement et échouerait en production, c'est-à-dire au seul
 * moment où il sert à quelque chose. Si ce fichier change de région, ce secours
 * cesse silencieusement de fonctionner.
 *
 * ── DEVISE ────────────────────────────────────────────────────────────────────
 *
 * Les paires retenues sont libellées en USDT, qu'on annonce comme `usd`. Aucune
 * conversion n'est faite ici : comme Yahoo, cet adaptateur rend sa devise NATIVE et
 * laisse `<Money from={asset.currency} />` convertir à l'affichage. L'assimilation
 * USDT ≈ USD est une approximation assumée — l'écart d'ancrage se compte en
 * fractions de pour cent, très en deçà de l'amplitude des actifs cotés.
 */

import { createHttpClient } from '../http'
import type {
  ListAssetsParams,
  MarketAsset,
  MarketDataProvider,
  OhlcHistory,
  PriceHistory,
} from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'binance'

/** Devise de cotation réelle des paires suivies — voir l'en-tête. */
const QUOTE_CURRENCY = 'usd'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://data-api.binance.vision/api/v3',
  // Binance raisonne en POIDS par minute (1 200 par IP), pas en nombre d'appels :
  // `/ticker/24hr` ciblé pèse 2, `/klines` pèse 2. On reste très en deçà, et de
  // toute façon ce client ne s'active qu'en secours — quelques appels par incident.
  // Le plafond est là pour borner une boucle d'échec, pas pour exploiter un quota.
  maxRequestsPerWindow: 30,
  minIntervalMs: 100,
  timeoutMs: 8_000,
})

/**
 * Correspondance identifiant CoinGecko → symbole Binance.
 *
 * ── POURQUOI UNE TABLE ÉCRITE À LA MAIN ───────────────────────────────────────
 *
 * Les URL du site portent des identifiants CoinGecko (`/crypto/bitcoin`), et c'est
 * cette source qui fait autorité sur l'identité des actifs. Un secours doit donc
 * savoir traduire — et il ne peut pas demander la table à CoinGecko, puisqu'il ne
 * s'active QUE lorsque CoinGecko est muet.
 *
 * Deviner la correspondance depuis le symbole serait une faute, pas un raccourci :
 * les symboles se collisionnent massivement en crypto. « BTT » a désigné deux
 * jetons différents, et des dizaines de contrefaçons reprennent le symbole d'un
 * actif connu. Afficher le prix du mauvais jeton sous le nom d'un autre est
 * précisément le genre de donnée fausse que le §5 proscrit.
 *
 * La table est donc EXPLICITE et volontairement courte. Sa brièveté est une
 * propriété, pas une limite à combler : un secours qui couvre les trente premières
 * capitalisations rend la page utile, là où une table exhaustive et devinée la
 * rendrait fausse. Les actifs absents d'ici sont simplement absents du secours.
 */
export interface BinanceCoverageEntry {
  /** Identifiant CoinGecko — celui qui figure dans les URL du site. */
  id: string
  /** Paire Binance correspondante. */
  symbol: string
  /** Nom d'affichage : Binance ne publie que des symboles de paires. */
  name: string
}

/**
 * UNE SEULE table, et non trois.
 *
 * Une première version tenait identifiant→symbole et identifiant→nom dans deux
 * `Map` parallèles. Rien n'empêchait alors l'une d'oublier une ligne que l'autre
 * portait — le nom retombait silencieusement sur l'identifiant brut, et
 * « avalanche-2 » s'affichait comme nom d'actif. Une seule liste rend cette
 * divergence impossible plutôt que de la confier à un test.
 *
 * L'ordre est celui des capitalisations décroissantes : c'est lui qui fait le
 * classement de secours, puisque Binance ne publie aucune capitalisation.
 */
const COVERAGE: readonly BinanceCoverageEntry[] = [
  { id: 'bitcoin', symbol: 'BTCUSDT', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETHUSDT', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNBUSDT', name: 'BNB' },
  { id: 'solana', symbol: 'SOLUSDT', name: 'Solana' },
  { id: 'ripple', symbol: 'XRPUSDT', name: 'XRP' },
  { id: 'cardano', symbol: 'ADAUSDT', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'DOGEUSDT', name: 'Dogecoin' },
  { id: 'tron', symbol: 'TRXUSDT', name: 'TRON' },
  { id: 'avalanche-2', symbol: 'AVAXUSDT', name: 'Avalanche' },
  { id: 'chainlink', symbol: 'LINKUSDT', name: 'Chainlink' },
  { id: 'polkadot', symbol: 'DOTUSDT', name: 'Polkadot' },
  { id: 'litecoin', symbol: 'LTCUSDT', name: 'Litecoin' },
  { id: 'near', symbol: 'NEARUSDT', name: 'NEAR Protocol' },
  { id: 'internet-computer', symbol: 'ICPUSDT', name: 'Internet Computer' },
  { id: 'uniswap', symbol: 'UNIUSDT', name: 'Uniswap' },
  { id: 'aptos', symbol: 'APTUSDT', name: 'Aptos' },
  { id: 'stellar', symbol: 'XLMUSDT', name: 'Stellar' },
  { id: 'cosmos', symbol: 'ATOMUSDT', name: 'Cosmos Hub' },
  { id: 'filecoin', symbol: 'FILUSDT', name: 'Filecoin' },
  { id: 'hedera-hashgraph', symbol: 'HBARUSDT', name: 'Hedera' },
  { id: 'arbitrum', symbol: 'ARBUSDT', name: 'Arbitrum' },
  { id: 'vechain', symbol: 'VETUSDT', name: 'VeChain' },
  { id: 'optimism', symbol: 'OPUSDT', name: 'Optimism' },
  { id: 'injective-protocol', symbol: 'INJUSDT', name: 'Injective' },
  { id: 'the-graph', symbol: 'GRTUSDT', name: 'The Graph' },
  { id: 'algorand', symbol: 'ALGOUSDT', name: 'Algorand' },
  { id: 'sui', symbol: 'SUIUSDT', name: 'Sui' },
  { id: 'sei-network', symbol: 'SEIUSDT', name: 'Sei' },
]

const BY_ID: ReadonlyMap<string, BinanceCoverageEntry> = new Map(
  COVERAGE.map((entry) => [entry.id, entry]),
)

const BY_SYMBOL: ReadonlyMap<string, BinanceCoverageEntry> = new Map(
  COVERAGE.map((entry) => [entry.symbol, entry]),
)

/** Ordre de secours : la table est écrite par capitalisation décroissante. */
const DEFAULT_IDS: readonly string[] = COVERAGE.map((entry) => entry.id)

/** Réponse de `/ticker/24hr` — tous les nombres arrivent en CHAÎNE chez Binance. */
interface BinanceTicker {
  symbol?: string
  lastPrice?: string
  openPrice?: string
  highPrice?: string
  lowPrice?: string
  priceChangePercent?: string
  quoteVolume?: string
  closeTime?: number
}

/**
 * Bougie `/klines` — un TABLEAU POSITIONNEL, non un objet.
 *
 * Binance renvoie `[ouverture, open, high, low, close, volume, fermeture, …]`. Les
 * index sont donc porteurs de sens et nommés ici une fois pour toutes, plutôt que
 * répétés en littéraux dans le corps des fonctions.
 */
type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]]

const KLINE_OPEN_TIME = 0
const KLINE_OPEN = 1
const KLINE_HIGH = 2
const KLINE_LOW = 3
const KLINE_CLOSE = 4

/**
 * Nombre lu depuis une chaîne, ou `undefined`.
 *
 * `undefined` et non 0 : le §5 interdit de combler un champ manquant. Un volume
 * illisible doit s'afficher « — », jamais « 0 $ », qui se lirait comme un fait.
 */
function numeric(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toMarketAsset(ticker: BinanceTicker, rank: number): MarketAsset | null {
  const symbol = ticker.symbol
  if (!symbol) return null

  const entry = BY_SYMBOL.get(symbol)
  if (!entry) return null

  const price = numeric(ticker.lastPrice)
  // Sans prix, la ligne n'a aucune raison d'exister : on l'écarte plutôt que de
  // rendre une entrée vide qui occuperait un rang dans le classement.
  if (price === undefined) return null

  const asset: MarketAsset = {
    id: entry.id,
    symbol: symbol.replace(/USDT$/, ''),
    name: entry.name,
    assetClass: 'crypto',
    price,
    currency: QUOTE_CURRENCY,
    rank,
    lastUpdated: new Date(ticker.closeTime ?? Date.now()).toISOString(),
  }

  const change24h = numeric(ticker.priceChangePercent)
  if (change24h !== undefined) asset.change24h = change24h

  const volume24h = numeric(ticker.quoteVolume)
  if (volume24h !== undefined) asset.volume24h = volume24h

  const high24h = numeric(ticker.highPrice)
  if (high24h !== undefined) asset.high24h = high24h

  const low24h = numeric(ticker.lowPrice)
  if (low24h !== undefined) asset.low24h = low24h

  // Ni capitalisation, ni offre, ni courbe 7 jours : Binance ne les publie pas.
  // Les champs restent absents (§5).

  return asset
}

/**
 * Résolution du symbole Binance d'un identifiant CoinGecko.
 *
 * Lève plutôt que de renvoyer `null` : l'appelant est `run()` dans `queries.ts`, qui
 * traduit toute exception en état d'erreur explicite. Un actif hors table doit
 * produire « source indisponible », pas une page vide sans explication.
 */
function requireSymbol(id: string): string {
  const entry = BY_ID.get(id)
  if (!entry) {
    throw new ProviderError(PROVIDER_ID, `Actif « ${id} » hors du secours Binance`)
  }
  return entry.symbol
}

/**
 * Intervalle de bougie adapté à la profondeur demandée.
 *
 * Binance plafonne à 1 000 bougies par appel. Demander 365 jours en horaire
 * dépasserait la limite et renverrait une série TRONQUÉE — un graphique amputé de
 * son début, sans que rien ne le signale. On choisit donc le pas en fonction de la
 * fenêtre, comme le fait déjà l'adaptateur Yahoo.
 */
function intervalFor(days: number): { interval: string; limit: number; minutes: number } {
  if (days <= 1) return { interval: '5m', limit: 288, minutes: 5 }
  if (days <= 7) return { interval: '1h', limit: days * 24, minutes: 60 }
  if (days <= 90) return { interval: '4h', limit: days * 6, minutes: 240 }
  return { interval: '1d', limit: Math.min(days, 1000), minutes: 1440 }
}

async function fetchKlines(
  id: string,
  days: number,
): Promise<{ rows: BinanceKline[]; minutes: number }> {
  const { interval, limit, minutes } = intervalFor(days)
  const rows = await http.getJson<BinanceKline[]>('klines', {
    symbol: requireSymbol(id),
    interval,
    limit,
  })

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ProviderError(PROVIDER_ID, 'Aucune bougie renvoyée', { retryable: true })
  }

  return { rows, minutes }
}

export const binanceProvider: MarketDataProvider = {
  id: PROVIDER_ID,
  label: 'Binance',
  assetClasses: ['crypto'],
  attributionUrl: 'https://www.binance.com',

  isConfigured: () => true,
  unavailableReason: () => null,

  async listAssets(params: ListAssetsParams = {}): Promise<MarketAsset[]> {
    if (params.assetClass && params.assetClass !== 'crypto') {
      throw new ProviderError(PROVIDER_ID, 'Classe d’actif non couverte par ce fournisseur')
    }

    // Les identifiants demandés, restreints à ceux que la table connaît. Un
    // identifiant inconnu est ignoré, jamais deviné.
    const requested = params.ids?.filter((id) => BY_ID.has(id)) ?? DEFAULT_IDS
    const wanted = requested.slice(0, Math.max(params.perPage ?? requested.length, 1))

    if (wanted.length === 0) {
      throw new ProviderError(PROVIDER_ID, 'Aucun actif demandé n’est couvert par ce secours')
    }

    const symbols = wanted.map((id) => requireSymbol(id))

    // UN SEUL APPEL pour toute la liste. `/ticker/24hr` sans paramètre renverrait
    // les ~3 000 paires de la place, soit 1,9 Mo MESURÉ — le cache HTTP de Next
    // écrirait cette masse sur disque à chaque rafraîchissement, exactement la
    // pathologie documentée dans `http.ts` pour les flux RSS. Le paramètre
    // `symbols` borne la réponse aux lignes réellement affichées.
    const rows = await http.getJson<BinanceTicker[]>('ticker/24hr', {
      symbols: JSON.stringify(symbols),
    })

    if (!Array.isArray(rows)) {
      throw new ProviderError(PROVIDER_ID, 'Format de classement inattendu')
    }

    // L'ordre de la réponse suit celui de la requête, mais on ne s'y fie pas :
    // le rang affiché doit refléter l'ordre DEMANDÉ, qui porte le classement par
    // capitalisation hérité de la table.
    const byId = new Map<string, BinanceTicker>()
    for (const row of rows) {
      const entry = row.symbol ? BY_SYMBOL.get(row.symbol) : undefined
      if (entry) byId.set(entry.id, row)
    }

    const assets: MarketAsset[] = []
    for (const id of wanted) {
      const row = byId.get(id)
      if (!row) continue
      const asset = toMarketAsset(row, assets.length + 1)
      if (asset) assets.push(asset)
    }

    if (assets.length === 0) {
      throw new ProviderError(PROVIDER_ID, 'Aucune paire n’a répondu', { retryable: true })
    }

    // Tri explicite quand il est demandé. La capitalisation est ABSENTE de cette
    // source : un tri par capitalisation ne peut pas être honoré, et on conserve
    // alors l'ordre de la table plutôt que de trier sur un champ vide — ce qui
    // produirait un classement d'apparence valide et de contenu arbitraire.
    const direction = params.sortDirection === 'asc' ? 1 : -1
    if (params.sortBy === 'change24h') {
      assets.sort((a, b) => direction * ((a.change24h ?? 0) - (b.change24h ?? 0)))
    } else if (params.sortBy === 'volume24h') {
      assets.sort((a, b) => direction * ((a.volume24h ?? 0) - (b.volume24h ?? 0)))
    } else if (params.sortBy === 'price') {
      assets.sort((a, b) => direction * (a.price - b.price))
    }

    return assets.map((asset, index) => ({ ...asset, rank: index + 1 }))
  },

  async getHistory(id: string, days: number): Promise<PriceHistory> {
    const { rows } = await fetchKlines(id, days)

    const points = rows
      .map((row) => ({
        timestamp: Number(row[KLINE_OPEN_TIME]),
        price: Number(row[KLINE_CLOSE]),
      }))
      .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.price))

    return { points, currency: QUOTE_CURRENCY, days }
  },

  async getOhlc(id: string, days: number): Promise<OhlcHistory> {
    const { rows, minutes } = await fetchKlines(id, days)

    const candles = rows
      .map((row) => ({
        timestamp: Number(row[KLINE_OPEN_TIME]),
        open: Number(row[KLINE_OPEN]),
        high: Number(row[KLINE_HIGH]),
        low: Number(row[KLINE_LOW]),
        close: Number(row[KLINE_CLOSE]),
      }))
      .filter(
        (candle) =>
          Number.isFinite(candle.timestamp) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close),
      )

    return { candles, currency: QUOTE_CURRENCY, days, intervalMinutes: minutes }
  },
}

/** Les actifs réellement couverts par le secours — exposé pour les tests de contrat. */
export const BINANCE_COVERAGE = COVERAGE
