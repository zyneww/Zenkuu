/**
 * Coinpaprika — date de première cotation.
 *
 * Pourquoi une source de plus alors que CoinGecko couvre déjà la crypto : la liste
 * des actifs RÉCEMMENT RÉFÉRENCÉS est, chez CoinGecko, derrière l'offre payante
 * (`/coins/list/new` répond 401 sans clé Pro — vérifié). Aucun champ de l'API
 * gratuite ne permet de la reconstituer : `/coins/markets` ne transporte aucune date
 * d'entrée, et `genesis_date` est la date de création du PROTOCOLE, pas celle de son
 * référencement — Bitcoin y figure en 2009 quel que soit le moment où on le lit.
 *
 * Coinpaprika, lui, publie `first_data_at` — l'instant du premier relevé de prix —
 * dans `/v1/tickers`, sans clé et en un seul appel, avec le prix, la capitalisation,
 * le volume et les variations dans la même réponse. C'est donc une donnée MESURÉE,
 * pas une estimation : la seule qui autorise une page « nouvelles cryptomonnaies »
 * sans enfreindre le §5.
 *
 * ⚠️ CE QUE `first_data_at` SIGNIFIE EXACTEMENT : la première fois que Coinpaprika a
 * relevé un prix, pas la date de création du jeton ni celle de son premier échange
 * ailleurs. Les deux coïncident souvent, jamais par construction. L'interface reprend
 * donc le libellé « suivi depuis », et non « créé le ».
 *
 * On ne l'inscrit PAS au registre des fournisseurs : il ne remplace CoinGecko sur
 * aucune classe d'actif, il répond à une question que CoinGecko ne répond pas. Le
 * registre arbitre entre sources interchangeables ; celle-ci est complémentaire.
 */

import { createHttpClient } from '../http'
import type { NewListing } from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'coinpaprika'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.coinpaprika.com/v1',
  // Le palier gratuit annonce 20 000 appels par mois. Le cache applicatif en fait
  // consommer quelques dizaines par jour : la marge est large, la garde reste basse
  // pour éviter qu'un incident de cache ne se transforme en rafale.
  maxRequestsPerWindow: 10,
  minIntervalMs: 500,
  revalidateSeconds: 1_800,

  /*
   * ── LE CACHE DE NEXT REFUSAIT CETTE RÉPONSE, ET LE DISAIT À CHAQUE BUILD ───
   *
   * `/v1/tickers` rend environ 2,17 Mo pour deux mille lignes. Next plafonne son
   * cache de données à 2 Mo : chaque appel produisait donc
   *
   *     Failed to set Next.js data cache for …/v1/tickers?quotes=USD,
   *     items over 2MB can not be cached (2173919 bytes)
   *
   * Relevé deux fois par build de production, et à chaque expiration du cache
   * applicatif en service. Ce n'était pas qu'un message : Next tamponnait deux
   * méga-octets pour tenter une écriture qu'il allait refuser, à chaque fois.
   *
   * ── POURQUOI LE CONTOURNEMENT EST SÛR ICI ─────────────────────────────────
   *
   * `bypassNextCache` a un coût connu — `no-store` rend dynamique toute page qui en
   * dépend — et il n'est acceptable que si un AUTRE cache prend le relais. C'est le
   * cas : `fetchNewListings` réduit les deux mille lignes à cent AVANT la mise en
   * cache applicatif, et c'est ce résultat parsé, incomparablement plus léger, que
   * `getNewListings` mémorise. Exactement le raisonnement des flux RSS et de la
   * Banque mondiale, les deux autres fournisseurs qui l'utilisent.
   */
  bypassNextCache: true,
})

interface PaprikaQuote {
  price?: number
  volume_24h?: number
  market_cap?: number
  percent_change_24h?: number
  percent_change_7d?: number
  percent_change_30d?: number
}

interface PaprikaTicker {
  id?: string
  name?: string
  symbol?: string
  rank?: number
  first_data_at?: string
  last_updated?: string
  quotes?: Record<string, PaprikaQuote>
}

function optional(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Les actifs référencés le plus récemment, du plus récent au plus ancien.
 *
 * La réponse complète pèse environ 1,6 Mo pour deux mille lignes. On la réduit ICI,
 * avant la mise en cache : garder les deux mille objets en mémoire pour n'en afficher
 * cent serait payer le stockage d'une donnée que personne ne lira.
 *
 * Le tri se fait sur `first_data_at` en COMPARAISON DE CHAÎNES, ce qui est correct et
 * non paresseux : la source horodate en ISO 8601 UTC, format dont l'ordre
 * lexicographique coïncide avec l'ordre chronologique. Passer par `Date.parse` sur
 * deux mille lignes n'apporterait rien de plus qu'un coût.
 */
export async function fetchNewListings(limit: number): Promise<NewListing[]> {
  const payload = await http.getJson<PaprikaTicker[]>('tickers', { quotes: 'USD' })

  if (!Array.isArray(payload)) {
    throw new ProviderError(PROVIDER_ID, 'Liste de cotations illisible')
  }

  const dated = payload.filter(
    (ticker): ticker is PaprikaTicker & { id: string; first_data_at: string } =>
      typeof ticker.id === 'string' && typeof ticker.first_data_at === 'string',
  )

  dated.sort((a, b) => b.first_data_at.localeCompare(a.first_data_at))

  const listings: NewListing[] = []

  for (const ticker of dated) {
    if (listings.length >= limit) break

    const quote = ticker.quotes?.['USD']
    const price = optional(quote?.price)
    // Un actif dont la source ne cote pas le prix n'a rien à faire dans un tableau
    // de marché : la ligne serait vide sur toutes ses colonnes chiffrées (§5).
    if (price === undefined) continue

    const listing: NewListing = {
      id: ticker.id,
      symbol: (ticker.symbol ?? '').toUpperCase(),
      name: ticker.name ?? ticker.id,
      price,
      currency: 'USD',
      firstDataAt: ticker.first_data_at,
      lastUpdated: ticker.last_updated ?? new Date().toISOString(),
      /*
       * LOGO DÉDUIT DE L'IDENTIFIANT, ET NON DEMANDÉ.
       *
       * L'endpoint des cotations ne publie pas d'image ; celui d'un actif isolé le
       * fait, mais il faudrait alors trois cents appels supplémentaires pour une
       * page — sur une source qui en tolère quelques-uns par minute. Or le chemin est
       * PRÉVISIBLE : `static.coinpaprika.com/coin/{id}/logo.png`, vérifié sur un
       * échantillon.
       *
       * ⚠️ Il n'est pas garanti. Un actif sur quelques dizaines n'a pas d'image à cette
       * adresse et rend un 404 — l'affichage DOIT donc prévoir un repli, et c'est le
       * monogramme de `NewListingsTable`. Fabriquer une URL sans prévoir son échec
       * remplacerait des vignettes manquantes par des icônes d'image cassée, ce qui
       * est pire que rien.
       */
      logo: `https://static.coinpaprika.com/coin/${ticker.id}/logo.png`,
    }

    // `rank: 0` chez Coinpaprika signifie « non classé », pas « premier ». Le laisser
    // passer tel quel afficherait un rang 0 en tête de tableau.
    const rank = optional(ticker.rank)
    if (rank !== undefined && rank > 0) listing.rank = rank

    const marketCap = optional(quote?.market_cap)
    if (marketCap !== undefined && marketCap > 0) listing.marketCap = marketCap

    const volume = optional(quote?.volume_24h)
    if (volume !== undefined && volume > 0) listing.volume24h = volume

    const change24h = optional(quote?.percent_change_24h)
    if (change24h !== undefined) listing.change24h = change24h

    const change7d = optional(quote?.percent_change_7d)
    if (change7d !== undefined) listing.change7d = change7d

    const change30d = optional(quote?.percent_change_30d)
    if (change30d !== undefined) listing.change30d = change30d

    listings.push(listing)
  }

  if (listings.length === 0) {
    throw new ProviderError(PROVIDER_ID, 'Aucune cotation récente exploitable')
  }

  return listings
}

export const COINPAPRIKA_SOURCE = {
  label: 'Coinpaprika',
  attributionUrl: 'https://coinpaprika.com/',
}
