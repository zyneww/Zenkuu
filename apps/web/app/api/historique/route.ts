import { NextResponse } from 'next/server'

import {
  ASSET_CLASSES,
  SUPPORTED_CURRENCIES,
  getAssetHistory,
  type AssetClass,
} from '@zenkuu/data'

/**
 * Historique de cours, servi au changement de période sur une fiche actif.
 *
 * Le changement de période était auparavant une navigation (`?periode=30`), donc un
 * rechargement complet de la page pour ne remplacer qu'un graphique. Cette route
 * permet de ne recharger que la série — le reste de la fiche ne bouge pas.
 *
 * Le cache applicatif fait que rebasculer sur une période déjà consultée ne coûte
 * aucun appel externe : c'est ce qui rend le va-et-vient entre 7 j et 30 j gratuit.
 */

/**
 * Fenêtres autorisées. Une valeur libre ouvrirait autant de clés de cache que d'entiers.
 *
 * QUATRE PALIERS ONT ÉTÉ AJOUTÉS — 180, 730, 1825 et 3650 jours — pour servir les
 * périodes « Depuis janvier », « Max » et les bornes libres du calendrier, qu'aucune
 * valeur existante ne couvrait : la fiche s'arrêtait à un an.
 *
 * La liste blanche est CONSERVÉE, et son élargissement reste borné : neuf valeurs
 * possibles au lieu de cinq. C'est l'appelant qui arrondit sa profondeur au palier
 * immédiatement supérieur (voir `snapToAllowedDepth`), plutôt que le service qui
 * accepte n'importe quel entier — sans quoi le garde-fou de cache tomberait, avec
 * les conséquences décrites juste en dessous pour les devises.
 */
const ALLOWED_DAYS = [1, 7, 30, 90, 180, 365, 730, 1825, 3650]

/**
 * Devises autorisées — même raison que `ALLOWED_DAYS`, et le garde-fou manquait.
 *
 * `devise` alimente lui aussi la clé du cache applicatif. Sans liste blanche, une
 * suite d'appels `?devise=aaa`, `?devise=aab`… crée autant d'entrées et finit par
 * évincer les entrées légitimes d'un cache borné à 500 éléments. Le service resterait
 * debout, mais chaque page se remettrait à taper la source externe, sur un quota
 * mesuré à cinq requêtes par minute.
 */
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

  const history = await getAssetHistory(id, assetClass, days, currency)

  if (!history.ok) {
    // 200 avec un corps explicite plutôt qu'un 5xx : côté client, l'absence de série
    // est un état d'affichage normal, pas une panne à signaler comme telle (§5).
    return NextResponse.json({ ok: false, raison: history.reason }, { status: 200 })
  }

  return NextResponse.json(
    { ok: true, ...history.data, source: history.source },
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
