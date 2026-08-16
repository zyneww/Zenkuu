import { NextResponse } from 'next/server'

import { getTokenPools, knownNetworks } from '@zenkuu/data'

/**
 * Pools de liquidité d'un jeton, servis à l'ouverture de l'onglet « Écosystème ».
 *
 * ── POURQUOI UNE ROUTE, ALORS QUE LA FICHE EST RENDUE PAR LE SERVEUR ──────────
 *
 * Les cinq panneaux d'onglets sont TOUS dans le document dès le premier rendu — c'est
 * le choix de référencement que défend `AssetTabs`. Interroger la source on-chain
 * pendant ce rendu ferait donc payer cet appel à chaque visiteur, y compris à
 * l'immense majorité qui ne quittera jamais l'aperçu.
 *
 * La règle est la même que pour l'onglet « Analyse » et ses trois appels : ce qui
 * n'est pas regardé n'est pas chargé. La route existe pour rendre ce report possible.
 *
 * ── LA PLATEFORME EST VALIDÉE CONTRE NOTRE PROPRE TABLE ───────────────────────
 *
 * `plateforme` alimente la clé du cache applicatif, et vient d'une URL. Sans borne,
 * une suite d'appels sur des chaînes inventées créerait autant d'entrées et finirait
 * par évincer les entrées légitimes d'un cache plafonné. La liste blanche n'est pas
 * écrite ici mais LUE de la table de correspondance de l'adaptateur : deux listes à
 * tenir à jour finiraient par diverger, et la divergence se lirait comme « ce jeton
 * n'a pas de pool » — c'est-à-dire comme une donnée, alors que c'est une lacune.
 */
const ALLOWED_PLATFORMS = new Set(knownNetworks().map((entry) => entry.platform))

/**
 * Forme d'une adresse de contrat.
 *
 * Volontairement large : une adresse Ethereum fait 42 caractères hexadécimaux préfixés
 * de `0x`, une adresse Solana est en base58 sans préfixe, une adresse TON commence par
 * `EQ`. Vérifier chaque famille reviendrait à réimplémenter la validation de vingt-trois
 * chaînes pour un gain nul — la source rejette de toute façon ce qu'elle ne connaît
 * pas. Ce garde-fou n'a qu'un rôle : empêcher qu'une chaîne arbitrairement longue ou
 * porteuse de séparateurs ne serve de clé de cache.
 */
const ADDRESS_SHAPE = /^[a-zA-Z0-9:_-]{20,80}$/

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const platform = params.get('plateforme')?.trim() ?? ''
  const address = params.get('adresse')?.trim() ?? ''

  if (!ALLOWED_PLATFORMS.has(platform) || !ADDRESS_SHAPE.test(address)) {
    return NextResponse.json({ erreur: 'Paramètres invalides' }, { status: 400 })
  }

  const pools = await getTokenPools(platform, address)

  if (!pools.ok) {
    // 200 avec un corps explicite : côté client, l'absence de pool est un état
    // d'affichage normal — la plupart des jetons n'en ont aucun — et non une panne.
    return NextResponse.json({ ok: false, raison: pools.reason }, { status: 200 })
  }

  return NextResponse.json(
    { ok: true, pools: pools.data, source: pools.source },
    /*
     * Soixante secondes, alignées sur le cache applicatif de `getTokenPools`. Un pool
     * bouge à chaque bloc : le mettre en cache plus longtemps côté navigateur ferait
     * afficher une variation « 5 min » vieille de plusieurs minutes, c'est-à-dire un
     * chiffre faux et pas seulement tiède.
     */
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  )
}
