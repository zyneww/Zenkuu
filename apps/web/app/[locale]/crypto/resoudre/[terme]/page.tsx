import { notFound, redirect } from 'next/navigation'

import { searchAssets } from '@zenkuu/data'

import { assetHref } from '@/lib/asset-routes'

/**
 * RÉSOLVEUR — d'un nom d'actif vers sa fiche, quand l'identifiant ne correspond pas.
 *
 * ── LE PROBLÈME QU'IL RÈGLE ──────────────────────────────────────────────────
 *
 * Les cotations récentes viennent de Coinpaprika (`apr-apriori`), les fiches de
 * CoinGecko (`apriori`). `lib/listing-match.ts` rapproche les deux quand l'actif
 * figure dans nos 250 premières capitalisations — soit une ligne sur deux. Les autres
 * restaient inertes, et c'est précisément le cas le plus fréquent sur une page dont
 * le sujet EST le nouvel arrivant : un actif coté il y a trois jours n'est presque
 * jamais dans les 250 premiers.
 *
 * Cette route résout à la demande : elle cherche, prend le premier cryptoactif trouvé,
 * et redirige. Un appel de recherche par CLIC, mis en cache, au lieu de trois cents
 * résolutions à chaque rendu de page.
 *
 * ── POURQUOI UNE PAGE ET NON UNE ROUTE D'API ─────────────────────────────────
 *
 * `redirect()` d'une page produit une vraie navigation : l'adresse finale s'affiche
 * dans la barre, le bouton « précédent » revient à la liste, et le lien se partage.
 * Une route d'API obligerait le composant à devenir client, à attendre la réponse et
 * à pousser lui-même l'historique — trois mécanismes pour ce que le serveur fait en
 * une ligne.
 *
 * ── LA REDIRECTION EST TEMPORAIRE, ET C'EST VOULU ────────────────────────────
 *
 * `redirect()` émet un 307 par défaut. C'est le bon code ici : la correspondance
 * dépend de ce que la recherche trouve aujourd'hui, pas d'une équivalence permanente
 * entre deux identifiants. Un 308 ferait mémoriser au navigateur — et aux moteurs —
 * une association qui peut changer.
 */

export default async function Page({ params }: { params: Promise<{ terme: string }> }) {
  const { terme } = await params
  const query = decodeURIComponent(terme).trim()

  // Sous deux caractères, la recherche ne part pas en réseau (voir `MIN_QUERY_LENGTH`)
  // et renverrait de toute façon un résultat vide. On le dit tout de suite.
  if (query.length < 2) notFound()

  const found = await searchAssets(query)

  /*
   * On ne retient que les CRYPTOACTIFS.
   *
   * Cette route n'est appelée que depuis les cotations crypto récentes. Rediriger vers
   * une action homonyme — « Mantle » l'entreprise plutôt que « Mantle » le jeton —
   * serait une erreur silencieuse et parfaitement plausible, donc du même ordre que
   * l'appariement par symbole que `listing-match.ts` refuse.
   */
  const target = found.crypto[0]
  if (!target) notFound()

  redirect(assetHref(target.assetClass, target.id))
}
