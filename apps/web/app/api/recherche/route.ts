import { NextResponse } from 'next/server'

import { guard } from '@/lib/rate-limit'

import { MIN_QUERY_LENGTH, searchAssets } from '@zenkuu/data'

/**
 * Route de recherche, appelée par l'overlay du header à chaque frappe (débattue).
 *
 * Pourquoi une route interne plutôt qu'un appel direct à CoinGecko depuis le
 * navigateur ? Trois raisons :
 *   • la clé d'API, si elle existe un jour, ne doit jamais partir côté client (§9) ;
 *   • le cache serveur est partagé par tous les visiteurs — une recherche déjà faite
 *     par quelqu'un d'autre ne consomme aucun quota ;
 *   • le limiteur de débit s'applique globalement, alors que des appels depuis les
 *     navigateurs seraient impossibles à borner.
 */

/** Bornes de la réponse : au-delà, la liste devient un mur de texte. */
const MAX_RESULTS = 8

export async function GET(request: Request) {
  /*
    ── GARDE-FOU DE DÉBIT ────────────────────────────────────────────────────

    Cette route sert un cache PARTAGÉ alimenté par une source gratuite : une boucle
    qui fait varier ses paramètres ouvre autant d'entrées de cache que d'appels
    sortants, et dégrade le site pour tout le monde. Le plafond borne l'entrée plutôt
    que la sortie — voir `lib/rate-limit.ts`, qui dit aussi ce que cette approche ne
    couvre pas.
  */
  const limited = guard(request, 'recherche', 60)
  if (limited) return limited

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  // Une chaîne trop courte n'est pas une erreur : c'est l'état normal pendant la
  // frappe. On renvoie une réponse vide plutôt qu'un 400, et surtout SANS toucher
  // au réseau — c'est ce qui empêche « b », « bi », « bit » de consommer trois
  // requêtes CoinGecko pour un seul mot tapé.
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { crypto: [], autres: [], cryptoIndisponible: false, requeteTropCourte: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const results = await searchAssets(query, MAX_RESULTS)

  return NextResponse.json(
    { ...results, requeteTropCourte: false },
    {
      // Le cache applicatif fait déjà le gros du travail côté serveur ; cet en-tête
      // évite en plus qu'un aller-retour identique reparte du navigateur.
      headers: { 'Cache-Control': 'private, max-age=60' },
    },
  )
}
