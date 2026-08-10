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
import type {
  ListAssetsParams,
  MarketAsset,
  MarketDataProvider,
  PriceHistory,
} from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'frankfurter'
const BASE_CURRENCY = 'EUR'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.frankfurter.dev/v1',
  maxRequestsPerWindow: 20,
  minIntervalMs: 200,
  /*
   * Délai porté de 10 à 25 secondes — POUR CETTE SOURCE SEULEMENT.
   *
   * Frankfurter est un service public bénévole, sans clé et sans quota annoncé. Il
   * répond d'ordinaire en moins d'une seconde, mais traverse des périodes où il monte
   * à quinze ou vingt (mesuré : 13,6 s et 20,9 s sur deux appels consécutifs). Le
   * délai commun de dix secondes le déclarait alors en panne, et le bandeau de
   * devises disparaissait de l'accueil alors que la source finissait par répondre.
   *
   * Attendre est ici sans conséquence, et c'est ce qui rend le réglage défendable :
   * la BCE ne publie qu'un taux par jour ouvré, ces valeurs sont mises en cache une
   * heure, et l'attente ne concerne donc qu'un rendu par heure. Le même délai sur la
   * source crypto, sollicitée à chaque page, serait au contraire inacceptable.
   */
  timeoutMs: 25_000,
  // Pas de reprise après délai dépassé : elle porterait le pire cas à cinquante
  // secondes d'attente pour un visiteur, alors qu'une source qui vient d'ignorer
  // vingt-cinq secondes n'a guère de chances de répondre dans les vingt-cinq
  // suivantes. Le filet, ici, c'est la dernière valeur connue (voir `cache.ts`).
  retryOnTimeout: false,
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

/**
 * Retrouve la paire derrière un identifiant de route ZENITH (`eur-usd` → USD).
 *
 * Point UNIQUE de résolution, volontairement : chez Yahoo, deux copies de cette même
 * règle avaient divergé, et seule l'une des deux marquait l'erreur comme une
 * inexistence — les fiches d'actions inconnues répondaient donc 200 quand les fiches
 * crypto répondaient 404. Une seule fonction, un seul comportement.
 */
function resolvePair(id: string): (typeof MAJOR_PAIRS)[number] {
  const code = id.replace(/^eur-/, '').toUpperCase()
  const pair = MAJOR_PAIRS.find((candidate) => candidate.code === code)

  if (!pair) {
    throw new ProviderError(PROVIDER_ID, `Paire « ${id} » hors des majeures suivies`, {
      notFound: true,
    })
  }

  return pair
}

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

/**
 * Taux de change bruts, base euro.
 *
 * Sert au sélecteur de devise des fiches actif. On expose ici les taux plutôt que de
 * refaire un appel marché dans chaque devise : CoinGecko coterait certes nativement
 * en dollars, mais cela coûterait deux requêtes par changement de devise sur un
 * quota qui n'en tolère que cinq par minute. Un seul taux BCE, mis en cache, permet
 * de convertir toute la page instantanément — à condition de le DIRE à l'utilisateur,
 * ce que fait la fiche en affichant la date du taux appliqué.
 */
export async function fetchExchangeRates(
  symbols: string[],
): Promise<{ base: string; date: string; rates: Record<string, number> }> {
  const payload = await http.getJson<{ base: string; date: string; rates: Record<string, number> }>(
    'latest',
    { base: BASE_CURRENCY, symbols: symbols.filter((code) => code !== BASE_CURRENCY).join(',') },
  )

  if (!payload?.rates) {
    throw new ProviderError(PROVIDER_ID, 'Taux de change illisibles')
  }

  // L'euro n'est pas renvoyé par l'API puisqu'il est la base : on l'ajoute pour que
  // l'appelant dispose d'une table complète et n'ait pas à traiter ce cas à part.
  return {
    base: BASE_CURRENCY,
    date: payload.date,
    rates: { [BASE_CURRENCY]: 1, ...payload.rates },
  }
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

  /**
   * Fiche d'une paire.
   *
   * ⚠️ CETTE MÉTHODE MANQUAIT, et son absence rendait mortes TOUTES les fiches
   * devises : la page de classement listait huit paires cliquables dont chacune
   * menait à « Actif introuvable ». Le défaut ne se voyait pas dans un audit de
   * statut HTTP — la page répondait bien 200 — ni dans le typage, `getAsset` étant
   * facultatif sur le contrat de fournisseur. Il fallait suivre un lien.
   *
   * L'implémentation ne coûte RIEN de plus : `listAssets` construit déjà la paire
   * complète, en un seul appel qui les couvre toutes. On la réutilise donc plutôt
   * que d'écrire une seconde façon de bâtir le même objet — c'est exactement la
   * divergence qui, chez Yahoo, faisait répondre 200 aux actions inconnues.
   */
  async getAsset(id: string): Promise<MarketAsset> {
    // Identifiant validé AVANT toute requête : un identifiant fabriqué ne doit pas
    // déclencher d'appel sortant. C'est la différence entre une URL inventée qui
    // coûte zéro et une qui consomme du quota — et sur une page indexable, les URLs
    // inventées arrivent par paquets.
    resolvePair(id)

    const assets = await frankfurterProvider.listAssets({ assetClass: 'forex' })
    const asset = assets.find((candidate) => candidate.id === id)

    if (!asset) {
      throw new ProviderError(PROVIDER_ID, `Paire « ${id} » sans taux publié aujourd’hui`)
    }

    return asset
  },

  /**
   * Série historique d'une paire.
   *
   * La BCE ne publie qu'un taux par JOUR OUVRÉ : une fenêtre d'un jour ne contient
   * donc qu'un point, parfois zéro le week-end. On élargit la fenêtre demandée d'une
   * marge fixe pour que « 7 jours » rende bien sept relevés et non cinq — sans quoi
   * le graphique le plus court paraîtrait vide le samedi.
   *
   * Aucune donnée n'est inventée pour combler les jours fermés : les points manquants
   * restent manquants, et la courbe relie les relevés réels.
   */
  async getHistory(id: string, days: number): Promise<PriceHistory> {
    const pair = resolvePair(id)

    // Marge de 40 % : c'est un peu plus que la proportion de jours non ouvrés d'une
    // semaine (2/7 ≈ 29 %), de quoi absorber aussi un jour férié.
    const span = Math.max(2, Math.ceil(days * 1.4))
    const series = await http.getJson<FrankfurterTimeSeries>(`${isoDaysAgo(span)}..`, {
      base: BASE_CURRENCY,
      symbols: pair.code,
    })

    const points = Object.entries(series.rates ?? {})
      .map(([date, rates]) => ({ date, rate: rates[pair.code] }))
      .filter((entry): entry is { date: string; rate: number } => entry.rate !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({ timestamp: Date.parse(`${entry.date}T00:00:00.000Z`), price: entry.rate }))

    if (points.length < 2) {
      throw new ProviderError(PROVIDER_ID, `Historique insuffisant pour « ${id} »`)
    }

    return { points, currency: pair.code, days }
  },
}
