/**
 * Recherche universelle d'actifs.
 *
 * Deux sources aux caractéristiques opposées, interrogées en parallèle :
 *
 *   • CoinGecko `/search` couvre ~18 000 cryptomonnaies. Endpoint réseau, donc
 *     soumis au quota — d'où la mise en cache par requête normalisée et la longueur
 *     minimale imposée côté appelant.
 *   • L'univers Yahoo est un tableau EN MÉMOIRE d'une soixantaine d'actifs boursiers.
 *     Le filtrer ne coûte rien : aucun appel réseau, réponse immédiate.
 *
 * Cette asymétrie est assumée : la recherche répond toujours quelque chose sur les
 * actions, ETF, indices et matières premières, même quand le quota crypto est saturé.
 */

import { cached } from './cache'
import { coinGeckoProvider } from './providers/coingecko'
import { YAHOO_UNIVERSE, toSlug } from './providers/yahoo-universe'
import type { AssetClass, SearchResult } from './types'

/** Les recherches se démodent lentement : un quart d'heure suffit largement. */
const SEARCH_TTL_SECONDS = 900

/** En deçà, la requête ramènerait trop de bruit pour un appel réseau. */
export const MIN_QUERY_LENGTH = 2

/** Retire accents et casse — « Matières » doit se trouver en tapant « matieres ». */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    // `\p{Diacritic}` plutôt qu'une plage de codes : la propriété Unicode nommée
    // se relit sans décoder, et couvre tous les signes combinants, pas seulement
    // le bloc latin.
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

/** Recherche dans l'univers boursier local. Aucun appel réseau. */
function searchLocalUniverse(query: string, limit: number): SearchResult[] {
  const needle = normalize(query)
  const results: SearchResult[] = []

  for (const [assetClass, entries] of Object.entries(YAHOO_UNIVERSE)) {
    for (const entry of entries) {
      const name = normalize(entry.name)
      const symbol = normalize(entry.symbol)
      if (!name.includes(needle) && !symbol.includes(needle)) continue

      results.push({
        id: toSlug(entry.symbol),
        name: entry.name,
        symbol: entry.symbol,
        assetClass: assetClass as AssetClass,
      })
    }
  }

  // Une correspondance en début de libellé prime : en tapant « or », on attend
  // « Or » avant « Pétrole Brent », qui ne contient ces deux lettres qu'au milieu.
  return results
    .sort((a, b) => {
      const aStarts = normalize(a.name).startsWith(needle) || normalize(a.symbol).startsWith(needle)
      const bStarts = normalize(b.name).startsWith(needle) || normalize(b.symbol).startsWith(needle)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.name.localeCompare(b.name, 'fr')
    })
    .slice(0, limit)
}

export interface SearchResponse {
  crypto: SearchResult[]
  autres: SearchResult[]
  /** Vrai lorsque la source crypto n'a pas répondu — l'UI le signale sans alarmer. */
  cryptoIndisponible: boolean
}

export async function searchAssets(query: string, limit = 8): Promise<SearchResponse> {
  const trimmed = query.trim()
  const autres = searchLocalUniverse(trimmed, limit)

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { crypto: [], autres, cryptoIndisponible: false }
  }

  try {
    const crypto = await cached(
      `search:crypto:${normalize(trimmed)}`,
      () => coinGeckoProvider.search!(trimmed, limit),
      SEARCH_TTL_SECONDS,
    )
    return { crypto, autres, cryptoIndisponible: false }
  } catch (error) {
    console.error(`[zenith:data] search:crypto:${trimmed} — ${String(error)}`)
    // Le volet boursier reste servi : une panne côté crypto ne doit pas rendre la
    // recherche entièrement muette.
    return { crypto: [], autres, cryptoIndisponible: true }
  }
}
