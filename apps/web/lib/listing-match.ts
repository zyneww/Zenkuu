import type { MarketAsset, NewListing } from '@zenkuu/data'

/**
 * Rapprochement des cotations récentes avec l'univers des fiches.
 *
 * ── LE PROBLÈME ───────────────────────────────────────────────────────────────
 *
 * La liste des cotations récentes vient de Coinpaprika ; les fiches du site sont
 * bâties sur les identifiants CoinGecko. `btc-bitcoin` d'un côté, `bitcoin` de
 * l'autre. Aucun champ commun n'existe, et c'est la raison pour laquelle ces lignes
 * n'ont longtemps porté ni logo ni lien : fabriquer une URL par découpage de
 * l'identifiant revenait à parier, et une fiche sur deux serait tombée en 404.
 *
 * ── POURQUOI LE SYMBOLE SEUL NE SUFFIT PAS ────────────────────────────────────
 *
 * Le réflexe serait d'apparier par symbole. Il est faux, et dangereusement : les
 * symboles sont massivement RÉUTILISÉS. On compte plusieurs dizaines de jetons
 * « SOL », « BTC » ou « ETH » — souvent des copies dont le nom seul dit qu'il ne
 * s'agit pas de l'original. Un appariement par symbole enverrait donc le lecteur
 * d'une cotation obscure vers la fiche de Solana, avec son logo et son cours. Ce
 * n'est pas un lien mort, c'est pire : c'est un lien plausible et faux.
 *
 * On exige donc que le SYMBOLE ET LE NOM correspondent tous les deux, après
 * normalisation. Le prix de cette rigueur est connu et acceptable : les actifs dont
 * les deux sources orthographient le nom différemment restent sans lien — exactement
 * l'état d'avant, et pour eux seulement.
 *
 * ── CE QUE LE RAPPROCHEMENT NE COÛTE PAS ──────────────────────────────────────
 *
 * Aucun appel réseau. L'univers CoinGecko des 250 premières capitalisations est déjà
 * chargé et mis en cache pour l'accueil, le convertisseur et les pages de mouvements.
 * Cette page s'y branche.
 */

export interface ListingMatch {
  /** Identifiant CoinGecko — celui qui résout sur `/crypto/{id}`. */
  id: string
  /** Vignette publiée par CoinGecko, absente de la source des cotations récentes. */
  image?: string
}

/**
 * Normalisation de comparaison.
 *
 * Accents retirés, casse abaissée, et tout ce qui n'est ni lettre ni chiffre supprimé.
 * Ce dernier point compte plus qu'il n'en a l'air : « USD Coin » et « USD-Coin » sont
 * le même actif, « Curve DAO Token » et « Curve DAO » ne le sont pas, et la limite
 * entre les deux est précisément ce qu'on ne veut PAS avoir à trancher au cas par cas.
 * Retirer la ponctuation sans toucher aux mots laisse cette limite là où la source l'a
 * mise.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Clé d'appariement — symbole ET nom, jamais l'un sans l'autre. */
function key(symbol: string, name: string): string {
  return `${fold(symbol)}|${fold(name)}`
}

/**
 * Index de l'univers, construit UNE FOIS par rendu.
 *
 * Une recherche linéaire dans 250 actifs pour chacune des 300 cotations affichées
 * ferait 75 000 comparaisons de chaînes normalisées à chaque rendu. L'index les ramène
 * à 550 normalisations et 300 lectures de table.
 */
export function buildListingIndex(universe: MarketAsset[]): Map<string, ListingMatch> {
  const index = new Map<string, ListingMatch>()

  for (const asset of universe) {
    const entry: ListingMatch = { id: asset.id }
    if (asset.image) entry.image = asset.image

    /*
     * `set` sans garde d'écrasement, et c'est voulu : l'univers arrive TRIÉ par
     * capitalisation décroissante. En cas d'homonymie parfaite — même symbole, même
     * nom — la dernière écriture gagne, donc la plus petite capitalisation. On inverse
     * en n'écrivant que si la clé est libre : le premier vu, donc le plus gros, reste.
     */
    if (!index.has(key(asset.symbol, asset.name))) {
      index.set(key(asset.symbol, asset.name), entry)
    }
  }

  return index
}

/** Fiche correspondante, ou `undefined` — jamais une approximation. */
export function matchListing(
  listing: Pick<NewListing, 'symbol' | 'name'>,
  index: Map<string, ListingMatch>,
): ListingMatch | undefined {
  return index.get(key(listing.symbol, listing.name))
}
