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
  AssetDetail,
  ListAssetsParams,
  MarketAsset,
  MarketDataProvider,
  OhlcHistory,
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
            /* Métadonnées de SÉANCE, déjà présentes dans cette réponse et jusqu'ici
               ignorées. Elles ne coûtent donc rien de plus qu'une ligne de typage. */
            exchangeTimezoneName?: string
            gmtoffset?: number
            currentTradingPeriod?: {
              regular?: { start?: number; end?: number }
            }
          }
          timestamp?: number[]
          // Yahoo renvoie ouverture, extrêmes et volume dans la MÊME réponse que les
          // clôtures : les bougies ne coûtent donc aucun appel de plus ici, à la
          // différence de CoinGecko qui les sert par un endpoint séparé.
          indicators: {
            quote: {
              open?: (number | null)[]
              high?: (number | null)[]
              low?: (number | null)[]
              close?: (number | null)[]
              volume?: (number | null)[]
            }[]
          }
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
  /*
   * ── LES SÉANCES ÉTENDUES SONT INCLUSES SUR LES PAS INTRAJOURNALIERS ───────
   *
   * `includePrePost: false` écartait l'avant-bourse et l'après-bourse. Sur un pas
   * quotidien c'est sans effet — une bougie journalière les agrège de toute façon —
   * mais sur un pas de cinq minutes, cela ampute la journée de ses deux tiers.
   *
   * Mesuré sur une fenêtre de 5 jours, en ne gardant que les 24 dernières heures :
   *
   *     AAPL   includePrePost=false  →  32 points, 13:30 → 16:02 UTC  =  2,5 h
   *     AAPL   includePrePost=true   →  98 points, 08:00 → 16:02 UTC  =  8,0 h
   *     SPY    idem                  →  95 points                     =  8,0 h
   *
   * L'avant-bourse américain ouvre à 4 h à New York (08:00 UTC) : ce sont des
   * transactions RÉELLES, cotées, que la source publie. Les écarter pour n'afficher
   * que la séance régulière donnait un palier « 24 h » couvrant deux heures et demie.
   *
   * ⚠️ CE QUE CELA NE CORRIGE PAS, et il faut le dire : la nuit reste VIDE. Entre la
   * clôture étendue et l'ouverture suivante, aucune transaction n'existe — un palier
   * « 24 h » sur une action montre donc un trou, et c'est la réalité du marché, pas un
   * défaut d'affichage. `^GSPC` ne bouge pas du tout (2,5 h dans les deux cas) : un
   * indice n'est calculé que pendant la séance régulière, il n'a pas d'avant-bourse.
   *
   * ⚠️ RESTREINT AU PAS DE MINUTES, et ce n'est pas une précaution abstraite. La
   * première version acceptait aussi le pas horaire, donc la fenêtre de 7 jours : le
   * graphique s'est mis à porter des barres nocturnes à volume nul, et l'infobulle
   * affichait « Vol : 0 » à une heure du matin — constaté au navigateur. Sur 7 jours,
   * les séances régulières couvrent déjà toute la fenêtre ; les séances étendues n'y
   * ajoutent que du plat.
   *
   * Le pas quotidien est exclu pour une raison voisine : les séances étendues y
   * ajouteraient des bougies partielles en tête et en queue de série, aux extrêmes
   * faussés par la faible liquidité de ces plages.
   *
   * Le pas de minutes ne sert QUE la fenêtre de 24 heures — voir `windowFor`. La
   * condition dit donc exactement « le seul palier où la nuit manque ».
   */
  const intraday = interval.endsWith('m')

  const payload = await http.getJson<YahooChartResponse>(
    `chart/${encodeURIComponent(symbol)}`,
    { range, interval, includePrePost: intraday },
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

/**
 * SÉANCE DE COTATION, extraite des métadonnées de la réponse de cours.
 *
 * ── POURQUOI ELLE N'EST PAS POSÉE DANS `toMarketAsset` ────────────────────────
 *
 * Cette fonction-là sert AUSSI les classements, qui rendent jusqu'à deux cent
 * cinquante lignes. Y attacher quatre champs par ligne alourdirait chaque tableau
 * d'une information qu'aucune colonne n'affiche, et qui n'a de sens que sur une
 * fiche. Elle n'est donc appelée que par `getAsset`.
 *
 * ── LE FUSEAU CONDITIONNE TOUT LE RESTE ───────────────────────────────────────
 *
 * Sans lui, deux horodatages epoch ne disent pas à quelle heure LOCALE la bourse
 * ouvre — et c'est la seule chose que le lecteur veuille savoir. On ne construit donc
 * rien s'il manque, plutôt que de livrer des horaires implicitement rapportés au
 * fuseau du visiteur (§5).
 */
function sessionOf(
  meta: NonNullable<YahooChartResponse['chart']['result']>[number]['meta'],
): AssetDetail['session'] {
  if (!meta.exchangeTimezoneName) return undefined

  const regular = meta.currentTradingPeriod?.regular

  return {
    timezone: meta.exchangeTimezoneName,
    ...(typeof meta.gmtoffset === 'number' ? { utcOffsetSeconds: meta.gmtoffset } : {}),
    ...(typeof regular?.start === 'number'
      ? { opensAt: new Date(regular.start * 1000).toISOString() }
      : {}),
    ...(typeof regular?.end === 'number'
      ? { closesAt: new Date(regular.end * 1000).toISOString() }
      : {}),
  }
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

  /* UN MOIS DE CLÔTURES QUOTIDIENNES, ET NON SEPT JOURS. La fenêtre demandée à la
     source est `range=1mo, interval=1d` : trente séances au plus, donc environ six
     semaines calendaires puisque les marchés ferment le week-end. La durée est
     déclarée à côté de la série — sans elle, un appelant qui superpose deux classes
     tracerait un mois et une semaine sur le même axe. */
  if (closes.length > 1) {
    const kept = closes.slice(-30)
    asset.sparkline7d = kept
    asset.sparklineSpanDays = Math.round((kept.length / 5) * 7)
  }
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
    // `resolveEntry` plutôt qu'une recherche recopiée : les deux faisaient la même
    // chose, mais seule celle de `resolveEntry` marquait l'erreur comme une
    // inexistence. La copie locale renvoyait donc une erreur ordinaire, et les fiches
    // d'actions inconnues répondaient 200 là où les fiches crypto répondaient 404.
    // Deux implémentations d'une même règle finissent toujours par diverger — celle-ci
    // avait divergé sur le seul détail qui comptait.
    const entry = resolveEntry(id, assetClass)

    const result = await fetchChart(entry.symbol, '1mo', '1d')

    /* La séance ne rejoint QUE la fiche, jamais les classements — voir `sessionOf`. */
    const asset = toMarketAsset(result, entry, assetClass)
    const session = sessionOf(result.meta)
    if (!session) return asset

    /* Variable intermédiaire et non un littéral rendu directement : le contrat du
       fournisseur annonce `MarketAsset`, et TypeScript refuse un champ surnuméraire
       sur un objet créé à l'endroit du `return`. Le passer par une constante typée
       `AssetDetail` dit ce qu'on fait — enrichir, pas contourner. */
    const detail: AssetDetail = { ...asset, session }
    return detail
  },

  async getHistory(id: string, days: number, assetClass?: AssetClass): Promise<PriceHistory> {
    const entry = resolveEntry(id, assetClass)
    const { range, interval } = windowFor(days)

    const result = await fetchChart(entry.symbol, range, interval)
    const quote = result.indicators?.quote?.[0]
    const closes = quote?.close ?? []
    const volumes = quote?.volume ?? []
    const stamps = result.timestamp ?? []

    const points: PriceHistory['points'] = []
    for (const [index, timestamp] of stamps.entries()) {
      const price = closes[index]
      if (typeof price !== 'number' || !Number.isFinite(price)) continue

      const volume = volumes[index]
      points.push(
        typeof volume === 'number' && Number.isFinite(volume)
          ? { timestamp: timestamp * 1000, price, volume }
          : { timestamp: timestamp * 1000, price },
      )
    }

    if (points.length < 2) {
      throw new ProviderError(PROVIDER_ID, `Historique insuffisant pour « ${id} »`)
    }

    /* La plage demandée à Yahoo est plus large que la fenêtre voulue — c'est la seule
       façon de garantir 24 heures réelles sur un marché fermé la nuit. Voir
       `windowFor` et `trimToWindow`. */
    return {
      points: trimToWindow(points, days),
      currency: (result.meta.currency ?? 'USD').toUpperCase(),
      days,
    }
  },

  /**
   * Bougies réelles, extraites de la même réponse `v8/chart` que l'historique.
   *
   * Une bougie n'est retenue que si ses QUATRE valeurs sont présentes. Yahoo insère
   * des `null` sur les séances creuses et les périodes de suspension de cotation :
   * compléter un plus-haut manquant par la clôture produirait une bougie plate qui
   * ressemble à une vraie séance sans en être une (§5).
   */
  async getOhlc(id: string, days: number, assetClass?: AssetClass): Promise<OhlcHistory> {
    const entry = resolveEntry(id, assetClass)
    const { range, interval } = windowFor(days)

    const result = await fetchChart(entry.symbol, range, interval)
    const quote = result.indicators?.quote?.[0]
    const stamps = result.timestamp ?? []

    const candles: OhlcHistory['candles'] = []
    for (const [index, timestamp] of stamps.entries()) {
      const open = quote?.open?.[index]
      const high = quote?.high?.[index]
      const low = quote?.low?.[index]
      const close = quote?.close?.[index]

      if (![open, high, low, close].every((v) => typeof v === 'number' && Number.isFinite(v))) {
        continue
      }

      const volume = quote?.volume?.[index]
      const candle = {
        timestamp: timestamp * 1000,
        open: open as number,
        high: high as number,
        low: low as number,
        close: close as number,
      }
      candles.push(
        typeof volume === 'number' && Number.isFinite(volume) ? { ...candle, volume } : candle,
      )
    }

    if (candles.length < 2) {
      throw new ProviderError(PROVIDER_ID, `Bougies indisponibles pour « ${id} »`)
    }

    /* Même découpage que l'historique, et pour la même raison : les deux lisent la
       même réponse `v8/chart`, donc la même plage trop large. Les oublier ici ferait
       diverger la courbe et les chandeliers du même actif sur le même palier. */
    return {
      candles: trimToWindow(candles, days),
      currency: (result.meta.currency ?? 'USD').toUpperCase(),
      days,
    }
  },
}

/** Retrouve le symbole Yahoo derrière un identifiant de route ZENKUU. */
function resolveEntry(id: string, assetClass?: AssetClass): UniverseEntry {
  const classes: AssetClass[] = assetClass ? [assetClass] : SUPPORTED

  for (const candidate of classes) {
    const entry = YAHOO_UNIVERSE[candidate as keyof typeof YAHOO_UNIVERSE]?.find(
      (item) => toSlug(item.symbol) === id,
    )
    if (entry) return entry
  }
  // `notFound` : l'univers Yahoo est une liste FIXE. Un identifiant qui n'y figure
  // pas n'existe pas pour nous — ce n'est pas une panne passagère, et l'URL doit
  // répondre 404 plutôt que d'afficher un message d'indisponibilité indexable.
  throw new ProviderError(PROVIDER_ID, `Actif « ${id} » hors univers suivi`, { notFound: true })
}

/**
 * Granularité adaptée à la fenêtre : une journée en pas fin, une année en pas
 * quotidien. Demander un pas de 5 minutes sur un an renverrait des dizaines de
 * milliers de points pour un graphique large de 700 pixels.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ `range=1d` NE VEUT PAS DIRE « LES DERNIÈRES 24 HEURES »
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Yahoo compte en SÉANCES, pas en heures. `range=1d` rend la séance EN COURS, quelle
 * que soit son avancement. Mesuré un lundi à 15h26 UTC :
 *
 *     AAPL   range=1d  →  25 points, 13:30 → 15:26  =  1,9 h
 *     SPY    range=1d  →  25 points, 13:30 → 15:26  =  1,9 h
 *     ^GSPC  range=1d  →  25 points, 13:30 → 15:26  =  1,9 h
 *
 * Le palier « 24 h » affichait donc deux heures de courbe sur une action, et le
 * lecteur voyait un axe allant de 15:30 à 17:00 sous une étiquette « 24 h ». Le
 * cryptoactif, lui, rendait bien 23,9 h — d'où un défaut invisible sur la moitié du
 * site.
 *
 * ── ET `range=2d` NE LE CORRIGE PAS ─────────────────────────────────────────
 *
 * Même mesure : `2d` remonte au **14 août** pour un lundi, soit 73,9 heures. Deux
 * séances de bourse peuvent enjamber un week-end, et rien dans le paramètre ne borne
 * la durée réelle.
 *
 * ── CE QU'ON FAIT DONC : DEMANDER LARGE, DÉCOUPER JUSTE ─────────────────────
 *
 * `5d` couvre à coup sûr les 24 dernières heures, week-end et jours fériés compris ;
 * l'appelant découpe ensuite sur la durée demandée (voir `trimToWindow`). C'est le
 * seul moyen d'honorer le libellé : un palier « 24 h » doit montrer 24 heures.
 *
 * Le coût est du réseau, pas du quota : une requête, ~337 points au lieu de 25, et le
 * découpage a lieu chez nous. Sur les marchés continus (or, devises) la fenêtre était
 * déjà correcte — 11 à 16 h — et le découpage ne leur retire rien.
 */
function windowFor(days: number): { range: string; interval: string } {
  if (days <= 1) return { range: '5d', interval: '5m' }
  if (days <= 7) return { range: '1mo', interval: '60m' }
  if (days <= 30) return { range: '1mo', interval: '1d' }
  if (days <= 90) return { range: '3mo', interval: '1d' }
  return { range: '1y', interval: '1d' }
}

/**
 * Ne garde que les points des `days` derniers jours.
 *
 * ── POURQUOI CE DÉCOUPAGE EXISTE ────────────────────────────────────────────
 *
 * Parce que `windowFor` demande désormais PLUS LARGE que nécessaire — voir sa note :
 * les paramètres de plage de Yahoo comptent en séances, et aucun d'eux ne borne une
 * durée réelle. On rattrape donc ici ce que la source ne sait pas exprimer.
 *
 * ── LE GARDE-FOU QUI COMPTE ─────────────────────────────────────────────────
 *
 * Si le découpage laisse moins de deux points, on rend la série ENTIÈRE plutôt qu'une
 * série vide. Le cas se produit vraiment : un jour férié américain, les 24 dernières
 * heures ne contiennent aucune cotation, et un graphique vide sous une étiquette
 * « 24 h » serait pire que le défaut qu'on corrige — il laisserait croire à une panne.
 * Mieux vaut montrer la dernière séance connue, ce que la mention de source datée sous
 * le graphique permet de situer.
 *
 * Générique sur le type d'élément : la même règle sert aux points de prix et aux
 * bougies, qui ne partagent que leur horodatage.
 */
export function trimToWindow<T extends { timestamp: number }>(items: T[], days: number): T[] {
  if (items.length === 0) return items

  /* Compté depuis le DERNIER POINT et non depuis l'heure courante : sur un marché
     fermé depuis vendredi, compter depuis maintenant écarterait toute la séance de
     vendredi et ne laisserait rien. Le dernier point est la référence que le lecteur
     a sous les yeux. */
  const last = items[items.length - 1]?.timestamp ?? 0
  const cutoff = last - days * 86_400_000

  const kept = items.filter((item) => item.timestamp >= cutoff)
  return kept.length >= 2 ? kept : items
}
