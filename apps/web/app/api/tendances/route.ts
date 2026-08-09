import { NextResponse } from 'next/server'

import { getTrendingCrypto } from '@zenith/data'

/**
 * Tendances servies à la demande, pour l'état par défaut de l'overlay de recherche.
 *
 * Pourquoi une route plutôt qu'un chargement dans le layout ? Parce que Next.js
 * retient le PLUS COURT des `revalidate` de tous les appels d'un rendu : une seule
 * requête à 5 minutes placée dans le layout ramenait toutes les pages du site à
 * 5 minutes, y compris celles qui n'avaient besoin d'être régénérées qu'une fois par
 * demi-heure. Sortir cet appel du rendu rend à chaque page sa propre fréquence.
 *
 * Le coût est nul côté quota : la réponse vient du même cache applicatif que
 * l'accueil, avec un TTL de 10 minutes.
 */
export async function GET() {
  const trending = await getTrendingCrypto('eur')

  return NextResponse.json(
    { trending: trending.ok ? trending.data : [], indisponible: !trending.ok },
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
