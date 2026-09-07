import { NextResponse } from 'next/server'

import { getTopNarratives, getTrendingCryptoAssets } from '@zenkuu/data'

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
 *
 * ── LA VERSION ENRICHIE, ET CE QU'ELLE COÛTE ────────────────────────────────
 *
 * `getTrendingCrypto` ne rend qu'un nom, un rang et une variation : c'est tout ce que
 * publie l'endpoint des tendances, d'où la pauvreté assumée de `TrendingAsset`. Le
 * panneau de recherche affiche désormais un COURS à côté de chaque ligne, ce que
 * cette forme ne permet pas.
 *
 * `getTrendingCryptoAssets` recharge les mêmes identifiants par `listAssets` — un
 * appel de plus, mis en cache au même TTL, et déjà partagé avec l'onglet « Tendance »
 * des classements. Sur cache chaud il ne touche donc aucune source externe.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LES CATÉGORIES VOYAGENT AVEC LES TENDANCES, DANS LA MÊME RÉPONSE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Le panneau de recherche ouvre désormais sur DEUX sections — les tendances, puis
 * les catégories en vue. Une seconde route les aurait servies au prix d'un second
 * aller-retour à chaque première ouverture du panneau, pour une donnée qui s'affiche
 * dans le même écran et au même instant.
 *
 * ⚠️ LES DEUX APPELS SONT SIMULTANÉS, ET C'EST LA RAISON DU `Promise.all`. Enchaînés,
 * la réponse aurait attendu la somme des deux latences ; ils ne dépendent pas l'un de
 * l'autre et n'ont aucune raison de se suivre.
 *
 * ⚠️ UNE PANNE DE L'UN NE FAIT PAS TOMBER L'AUTRE. `DataResult` porte son propre
 * `ok` : la réponse rend donc deux listes indépendantes, et le panneau affiche celle
 * qui est revenue. Un `Promise.all` sur des promesses qui REJETTENT aurait, lui,
 * perdu les deux — ce n'est pas le cas ici, `run()` ne rejette pas.
 *
 * Cinq catégories et non six : la section vit sous les tendances dans un panneau de
 * 26 rem, et la sixième ligne poussait la légende des touches hors de vue sur un
 * portable. Le panneau de l'accueil, lui, en garde six — il a la hauteur pour.
 */
export async function GET() {
  const [trending, categories] = await Promise.all([
    getTrendingCryptoAssets('eur'),
    getTopNarratives(5),
  ])

  return NextResponse.json(
    {
      trending: trending.ok ? trending.data : [],
      indisponible: !trending.ok,
      categories: categories.ok ? categories.data : [],
    },
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
