import { NextResponse } from 'next/server'

import {
  ASSET_CLASSES,
  SUPPORTED_CURRENCIES,
  getAssetOhlc,
  type AssetClass,
} from '@zenith/data'

/**
 * Bougies OHLC, servies à la bascule vers la vue chandeliers d'une fiche actif.
 *
 * Route SÉPARÉE de `/api/historique`, et c'est le point important : chez CoinGecko
 * les bougies vivent derrière un endpoint distinct, donc un appel externe de plus.
 * Les fusionner obligerait chaque rendu de fiche à payer ce coût, y compris pour les
 * visiteurs qui ne quittent jamais la vue en ligne — sur un quota mesuré à
 * ~5 requêtes/minute sans clé, l'écart n'est pas théorique.
 *
 * Ici, seul un clic sur « Chandeliers » déclenche la dépense.
 */

/** Mêmes fenêtres que l'historique, pour que le sélecteur de période reste commun. */
const ALLOWED_DAYS = [1, 7, 30, 90, 365]

/** Même liste blanche que la route d'historique, et pour la même raison de cache. */
const ALLOWED_CURRENCIES = new Set(SUPPORTED_CURRENCIES.map((code) => code.toLowerCase()))

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const id = params.get('id')?.trim()
  const assetClass = params.get('classe')?.trim() as AssetClass | undefined
  const days = Number(params.get('jours'))
  const currency = params.get('devise')?.trim().toLowerCase() || 'eur'

  if (!id || !assetClass || !ASSET_CLASSES.includes(assetClass)) {
    return NextResponse.json({ erreur: 'Paramètres invalides' }, { status: 400 })
  }

  if (!ALLOWED_DAYS.includes(days)) {
    return NextResponse.json({ erreur: 'Période non supportée' }, { status: 400 })
  }

  if (!ALLOWED_CURRENCIES.has(currency)) {
    return NextResponse.json({ erreur: 'Devise non supportée' }, { status: 400 })
  }

  const ohlc = await getAssetOhlc(id, assetClass, days, currency)

  if (!ohlc.ok) {
    // 200 avec un corps explicite, comme pour l'historique : une source sans OHLC —
    // la BCE, qui ne publie qu'un taux de référence quotidien — est un cas prévu, pas
    // une panne. Le client retire alors l'option du sélecteur (§5).
    return NextResponse.json({ ok: false, raison: ohlc.reason }, { status: 200 })
  }

  return NextResponse.json(
    { ok: true, ...ohlc.data, source: ohlc.source },
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
