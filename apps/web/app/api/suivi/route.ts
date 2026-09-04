import { NextResponse } from 'next/server'

import { getWatchlistIds } from '@/lib/watchlist-actions'

/**
 * Les actifs suivis, servis à la demande pour l'étoile de l'overlay de recherche.
 *
 * ── POURQUOI UNE ROUTE PLUTÔT QU'UNE LECTURE DANS LE LAYOUT ──────────────────
 *
 * L'overlay vit dans l'en-tête, donc dans le layout, donc sur CHAQUE page. Y lire
 * l'état de suivi ferait deux choses, toutes deux mauvaises :
 *
 *   · la liste de suivi est propre au visiteur, ce qui rendrait DYNAMIQUE le rendu de
 *     l'intégralité du site — les quelque neuf cents pages que le build prérend
 *     aujourd'hui devraient être calculées à chaque requête ;
 *   · le coût serait payé par tout le monde, alors que l'overlay ne s'ouvre presque
 *     jamais.
 *
 * C'est le raisonnement de `/api/tendances`, poussé d'un cran : là-bas on sortait un
 * appel du rendu pour ne pas contaminer le `revalidate` des pages ; ici on l'en sort
 * pour ne pas contaminer leur STATUT.
 *
 * ── ET POURQUOI L'ÉTOILE NE POUVAIT PAS EXISTER SANS ELLE ────────────────────
 *
 * `WatchlistStar` déclenche une BASCULE. Rendue à « non suivi » sur un actif déjà
 * suivi, elle le RETIRERAIT au premier clic — l'inverse de ce que le lecteur demande.
 * Une étoile sans son état de départ n'est pas une étoile approximative, c'est un
 * piège ; c'est pour cela que la fonctionnalité attendait cette route.
 *
 * ── LA CLASSE EST FIXE, ET C'EST HONNÊTE ────────────────────────────────────
 *
 * Seules les tendances portent une étoile, et les tendances sont toutes des
 * cryptomonnaies (`getTrendingCryptoAssets`). Accepter une classe en paramètre
 * laisserait croire à une généralité que rien n'appelle ; le jour où une autre classe
 * en a besoin, la question se posera avec son cas d'usage sous les yeux.
 */
export async function GET() {
  const suivi = await getWatchlistIds('crypto')

  return NextResponse.json(suivi, {
    /*
     * `private` : cette réponse dépend du cookie du visiteur. Un cache partagé qui la
     * retiendrait servirait la liste de suivi d'un inconnu à un autre.
     *
     * `no-store` plutôt qu'une courte durée : le lecteur qui suit un actif depuis un
     * tableau, puis ouvre la recherche, doit y voir son étoile pleine. Une fenêtre de
     * quelques secondes suffirait à la montrer vide, et c'est précisément le cas où
     * l'étoile ment.
     */
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
