import { NextResponse, type NextRequest } from 'next/server'

import { getAsset, getRanking, type AssetClass } from '@zenkuu/data'
import { listArmedAlerts, markAlertsTriggered, type PriceAlert } from '@zenkuu/db'

import { assetHref } from '@/lib/asset-routes'
import { alertEmail, MAILER_ENABLED, sendMail } from '@/lib/mailer'
import { SITE_URL } from '@/lib/site'

/**
 * Tâche planifiée — vérification des alertes de prix.
 *
 * ── LE PROBLÈME CENTRAL : LE QUOTA ────────────────────────────────────────────
 *
 * Une implémentation naïve interroge la source une fois par alerte. Avec cent alertes
 * et un plafond MESURÉ à cinq requêtes par minute chez CoinGecko sans clé (§9), un
 * seul passage prendrait vingt minutes et se ferait refuser en chemin. La stratégie
 * ci-dessous inverse le rapport : on part des DONNÉES DISPONIBLES en un appel, et on
 * ne descend au cas par cas que pour le reliquat, sous plafond dur.
 *
 *   1. Un appel par devise ramène les 250 premières capitalisations crypto. Il couvre
 *      la quasi-totalité des alertes réelles — on n'arme pas une alerte sur un jeton
 *      qu'on ne suit pas.
 *   2. Le reliquat (actions, ETF, indices, matières premières, et les cryptos hors
 *      des 250) passe par des appels individuels, bornés par `MAX_LOOKUPS`.
 *   3. Ce qui dépasse ce plafond n'est pas perdu : simplement reporté au passage
 *      suivant, un quart d'heure plus tard.
 *
 * ── CE QUE LA ROUTE NE FAIT PAS ───────────────────────────────────────────────
 *
 * Elle ne réessaie pas un envoi échoué et ne conserve pas de file d'attente. Une
 * alerte dont le courriel échoue reste ARMÉE : elle repartira au passage suivant. Ce
 * choix privilégie le doublon possible à la perte silencieuse — sur une notification
 * de prix, recevoir deux fois est un désagrément, ne pas recevoir est une panne.
 */

// Le rendu statique est impossible ici et Next.js doit le savoir : la route lit une
// en-tête d'autorisation et écrit en base.
export const dynamic = 'force-dynamic'

/** Marge confortable sous la limite des plateformes d'hébergement pour une tâche. */
export const maxDuration = 60

/** Appels individuels autorisés par passage — cf. le raisonnement sur le quota. */
const MAX_LOOKUPS = 12

/** Courriels envoyés par passage. Une salve plus large ressemblerait à du publipostage. */
const MAX_EMAILS = 50

/** Taille de l'univers ramené en un appel, alignée sur celle des autres pages. */
const BULK_SIZE = 250

type PriceKey = string

const priceKey = (assetClass: string, assetId: string, currency: string): PriceKey =>
  `${assetClass}|${assetId}|${currency.toLowerCase()}`

/**
 * L'alerte est-elle franchie ?
 *
 * Comparaison LARGE (`>=` / `<=`) : un seuil posé à 50 000 doit se déclencher à
 * exactement 50 000. Une comparaison stricte laisserait passer le cas précis que
 * l'utilisateur a saisi.
 */
function isCrossed(alert: PriceAlert, price: number): boolean {
  return alert.direction === 'above' ? price >= alert.threshold : price <= alert.threshold
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value)
  } catch {
    // Une devise inconnue d'Intl ne doit pas faire échouer la tâche entière : on
    // retombe sur un affichage brut plutôt que de laisser lever le formateur.
    return `${value} ${currency.toUpperCase()}`
  }
}

export async function GET(request: NextRequest) {
  /*
   * Authentification par secret partagé.
   *
   * Vercel Cron envoie automatiquement `Authorization: Bearer $CRON_SECRET` dès que
   * la variable existe. Sans secret configuré, la route REFUSE tout le monde plutôt
   * que d'accepter tout le monde : une route ouverte permettrait à n'importe qui de
   * vider notre quota de requêtes et notre crédit d'envoi de courriels.
   */
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!MAILER_ENABLED) {
    return NextResponse.json({ error: 'Service d’envoi non configuré' }, { status: 503 })
  }

  const armed = await listArmedAlerts()
  if (!armed.ok) return NextResponse.json({ error: armed.reason }, { status: 503 })
  if (armed.data.length === 0) {
    return NextResponse.json({ checked: 0, triggered: 0, sent: 0, deferred: 0 })
  }

  /* ── 1. Regroupement ────────────────────────────────────────────────────── */

  const groups = new Map<PriceKey, PriceAlert[]>()
  for (const alert of armed.data) {
    const key = priceKey(alert.assetClass, alert.assetId, alert.currency)
    const bucket = groups.get(key)
    if (bucket) bucket.push(alert)
    else groups.set(key, [alert])
  }

  const prices = new Map<PriceKey, number>()

  /* ── 2. Un appel groupé par devise, pour la crypto ──────────────────────── */

  const cryptoCurrencies = new Set(
    armed.data
      .filter((alert) => alert.assetClass === 'crypto')
      .map((alert) => alert.currency.toLowerCase()),
  )

  for (const currency of cryptoCurrencies) {
    const ranking = await getRanking({ assetClass: 'crypto', perPage: BULK_SIZE, currency })
    if (!ranking.ok) continue

    for (const asset of ranking.data) {
      prices.set(priceKey('crypto', asset.id, currency), asset.price)
    }
  }

  /* ── 3. Reliquat, au cas par cas et sous plafond ────────────────────────── */

  let lookups = 0
  let deferred = 0

  for (const [key, alerts] of groups) {
    if (prices.has(key)) continue

    if (lookups >= MAX_LOOKUPS) {
      deferred += alerts.length
      continue
    }

    const sample = alerts[0]
    if (!sample) continue

    lookups += 1
    const detail = await getAsset(
      sample.assetId,
      sample.assetClass as AssetClass,
      sample.currency,
    )
    if (detail.ok) prices.set(key, detail.data.price)
  }

  /* ── 4. Évaluation, désarmement, notification ───────────────────────────── */

  const now = new Date()
  let triggered = 0
  let sent = 0

  for (const [key, alerts] of groups) {
    const price = prices.get(key)
    if (price === undefined || !Number.isFinite(price)) continue

    const crossed = alerts.filter((alert) => isCrossed(alert, price))
    if (crossed.length === 0) continue

    /*
     * Le désarmement précède l'envoi, et l'ordre compte.
     *
     * Si la tâche s'interrompt entre les deux — dépassement du temps imparti,
     * redémarrage de l'instance —, l'utilisateur ne reçoit pas son courriel mais
     * l'alerte est consommée. L'inverse enverrait la notification à chaque passage
     * jusqu'à ce que l'écriture aboutisse, c'est-à-dire potentiellement des dizaines
     * de fois. Entre une notification manquée et une avalanche, on choisit la
     * première : elle est visible dans la liste des alertes, l'autre remplit une
     * boîte de réception.
     */
    const marked = await markAlertsTriggered(
      crossed.map((alert) => alert.id),
      price,
      now,
    )
    if (!marked.ok) continue
    triggered += crossed.length

    for (const alert of crossed) {
      if (sent >= MAX_EMAILS) break

      const message = alertEmail({
        label: alert.label,
        symbol: alert.symbol,
        direction: alert.direction === 'above' ? 'above' : 'below',
        threshold: formatMoney(alert.threshold, alert.currency),
        price: formatMoney(price, alert.currency),
        url: `${SITE_URL}${assetHref(alert.assetClass as AssetClass, alert.assetId)}`,
      })

      const result = await sendMail({ to: alert.email, ...message })
      if (result.ok) sent += 1
    }
  }

  // Le compte rendu est renvoyé en clair : c'est ce qui apparaît dans le journal
  // d'exécution de la tâche, et le seul moyen de diagnostiquer un passage sans
  // ouvrir la base.
  return NextResponse.json({
    checked: armed.data.length,
    groups: groups.size,
    lookups,
    triggered,
    sent,
    deferred,
  })
}
