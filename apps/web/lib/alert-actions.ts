'use server'

import { revalidatePath } from 'next/cache'

import {
  countActiveAlerts,
  createAlert,
  deleteAlert,
  isAlertDirection,
  rearmAlert,
} from '@zenkuu/db'

import { AUTH_ENABLED } from '@/lib/auth'
import { FEATURES, FREE_ALERT_LIMIT, PRO_ALERT_LIMIT } from '@/lib/billing'
import { hasFeature } from '@/lib/billing-server'
import { MAILER_ENABLED } from '@/lib/mailer'

/**
 * Actions serveur des alertes de prix.
 *
 * Quatre briques optionnelles se combinent ici — Clerk, Turso, la facturation et le
 * service d'envoi — et chacune peut manquer indépendamment. Le résultat les distingue
 * toutes plutôt que de renvoyer un échec unique : l'exploitant a quatre actions
 * différentes à mener selon le cas, et l'utilisateur quatre messages différents à
 * lire.
 */
export type AlertActionResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'auth-disabled'
        | 'signed-out'
        | 'db-disabled'
        | 'mailer-disabled'
        | 'limit-reached'
        | 'invalid'
        | 'error'
      /** Plafond effectivement appliqué — l'interface l'affiche dans son message. */
      limit?: number
    }

/**
 * Identité de l'utilisateur courant : son identifiant ET son adresse.
 *
 * L'adresse est lue ICI, à la création, et recopiée dans la ligne d'alerte. La tâche
 * planifiée s'exécute hors de toute session : elle n'a aucun contexte Clerk à
 * interroger, et un appel à l'API Clerk par alerte lui coûterait une requête réseau
 * par ligne à chaque passage.
 *
 * `currentUser()` est importé DYNAMIQUEMENT, comme partout ailleurs : sans clé Clerk,
 * `proxy.ts` ne monte pas le middleware et l'appel lèverait.
 */
async function currentIdentity(): Promise<{ userId: string; email: string } | null> {
  if (!AUTH_ENABLED) return null

  const { currentUser } = await import('@clerk/nextjs/server')
  const user = await currentUser()
  if (!user) return null

  // `primaryEmailAddress` peut manquer : un compte créé par un fournisseur tiers qui
  // ne communique pas d'adresse en est dépourvu. Sans adresse, pas d'alerte —
  // l'accepter donnerait une notification qui ne partirait jamais.
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress
  if (!email) return null

  return { userId: user.id, email }
}

/** Plafond applicable : celui de l'offre gratuite, ou celui de l'abonnement. */
async function alertLimit(): Promise<number> {
  return (await hasFeature(FEATURES.priceAlerts)) ? PRO_ALERT_LIMIT : FREE_ALERT_LIMIT
}

export async function createPriceAlert(input: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  direction: string
  threshold: number
  currency: string
  path: string
}): Promise<AlertActionResult> {
  if (!AUTH_ENABLED) return { ok: false, reason: 'auth-disabled' }

  // Le service d'envoi est vérifié AVANT toute écriture. Enregistrer une alerte que
  // rien ne pourra notifier reviendrait à promettre une surveillance qui n'existe
  // pas — la panne la plus trompeuse que cette fonction puisse produire.
  if (!MAILER_ENABLED) return { ok: false, reason: 'mailer-disabled' }

  const identity = await currentIdentity()
  if (!identity) return { ok: false, reason: 'signed-out' }

  // Les trois validations portent sur des valeurs venues du navigateur : un seuil
  // négatif, nul ou non fini produirait une alerte qui se déclenche à chaque passage
  // de la tâche, ou jamais.
  if (!isAlertDirection(input.direction)) return { ok: false, reason: 'invalid' }
  if (!Number.isFinite(input.threshold) || input.threshold <= 0) {
    return { ok: false, reason: 'invalid' }
  }
  if (!/^[a-z]{3}$/.test(input.currency)) return { ok: false, reason: 'invalid' }

  try {
    const limit = await alertLimit()
    const active = await countActiveAlerts(identity.userId)
    if (!active.ok) return { ok: false, reason: 'db-disabled' }
    if (active.data >= limit) return { ok: false, reason: 'limit-reached', limit }

    const created = await createAlert({
      userId: identity.userId,
      assetClass: input.assetClass,
      assetId: input.assetId,
      label: input.label,
      ...(input.symbol ? { symbol: input.symbol } : {}),
      direction: input.direction,
      threshold: input.threshold,
      currency: input.currency,
      email: identity.email,
    })

    if (!created.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/alertes')
    revalidatePath(input.path)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export async function removePriceAlert(id: number): Promise<AlertActionResult> {
  const identity = await currentIdentity()
  if (!identity) return { ok: false, reason: 'signed-out' }

  try {
    const removed = await deleteAlert(identity.userId, id)
    if (!removed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/alertes')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Réarme une alerte consommée.
 *
 * Le plafond est revérifié : une alerte désarmée ne compte pas dans le quota, la
 * réarmer peut donc franchir la limite si d'autres ont été créées entre-temps. Sans
 * ce contrôle, l'historique deviendrait un moyen de dépasser le quota indéfiniment.
 */
export async function rearmPriceAlert(id: number): Promise<AlertActionResult> {
  if (!MAILER_ENABLED) return { ok: false, reason: 'mailer-disabled' }

  const identity = await currentIdentity()
  if (!identity) return { ok: false, reason: 'signed-out' }

  try {
    const limit = await alertLimit()
    const active = await countActiveAlerts(identity.userId)
    if (!active.ok) return { ok: false, reason: 'db-disabled' }
    if (active.data >= limit) return { ok: false, reason: 'limit-reached', limit }

    const rearmed = await rearmAlert(identity.userId, id)
    if (!rearmed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/alertes')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
