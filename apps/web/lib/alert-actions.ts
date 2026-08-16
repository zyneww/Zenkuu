'use server'

import { revalidatePath } from 'next/cache'

import {
  countActiveAlerts,
  createAlert,
  deleteAlert,
  isAlertDirection,
  rearmAlert,
} from '@zenkuu/db'

import { ALERT_LIMIT } from '@/lib/limits'
import { MAILER_ENABLED } from '@/lib/mailer'
import { ensureOwnerId, ownerId } from '@/lib/session'

/**
 * Actions serveur des alertes de prix.
 *
 * ── CE QUI A CHANGÉ AVEC L'ABANDON DU FOURNISSEUR D'IDENTITÉ ──────────────────
 *
 * Quatre briques optionnelles se combinaient ici — l'authentification tierce, la
 * base, la facturation et le service d'envoi. La facturation a disparu avec
 * l'abonnement ; l'authentification tierce a été remplacée par un compte maison,
 * lui-même FACULTATIF (`lib/session.ts`).
 *
 * Il ne reste donc que DEUX refus possibles, et ils sont toujours distincts parce
 * qu'ils appellent deux gestes différents de la part de l'exploitant : pas de base
 * configurée, pas de service d'envoi configuré. « Pas connecté » n'en est plus un :
 * une alerte s'arme sans compte, rangée sous le cookie anonyme du visiteur.
 *
 * ── L'ADRESSE EST DÉSORMAIS SAISIE, ET C'EST TOUT LE SUJET ────────────────────
 *
 * Elle était recopiée depuis le compte tiers à la création de l'alerte. Elle est
 * maintenant demandée dans la fenêtre de création — ce qui est un GAIN : armer une
 * alerte ne suppose plus de s'inscrire, seulement de dire où l'on veut être prévenu.
 * Pour un visiteur connecté, la fenêtre la pré-remplit avec celle de son compte.
 */
export type AlertActionResult =
  | { ok: true }
  | {
      ok: false
      reason: 'db-disabled' | 'mailer-disabled' | 'limit-reached' | 'invalid' | 'error'
      /** Plafond effectivement appliqué — l'interface l'affiche dans son message. */
      limit?: number
    }

/**
 * Validation d'adresse, volontairement PERMISSIVE.
 *
 * Un motif strict conforme à la RFC 5322 fait une centaine de caractères et rejette
 * régulièrement des adresses valides. Ce qu'on cherche ici n'est pas de prouver
 * qu'une adresse existe — seul un envoi le prouve — mais d'écarter les saisies qui
 * ne sont manifestement pas des adresses, avant d'écrire une ligne qui ne notifiera
 * jamais personne.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

/**
 * Longueurs plafonnées.
 *
 * Ces deux champs arrivent du navigateur et repartent dans un courriel. Sans borne,
 * un envoi de dix mille caractères passerait tel quel dans la ligne d'objet.
 */
const TITLE_MAX = 80
const NOTE_MAX = 280

/** Horizon maximal d'une échéance : un an. Au-delà, « sans échéance » dit la même chose. */
const MAX_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000

export interface CreateAlertInput {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  direction: string
  threshold: number
  currency: string
  path: string
  /** Adresse de notification, saisie dans la fenêtre de création. */
  email: string
  /** Nom donné à l'alerte. Vide ⇒ la colonne reste nulle et la liste affiche l'actif. */
  title?: string
  /** Message recopié dans le courriel. */
  note?: string
  /** `true` : l'alerte se réarme après chaque déclenchement. */
  recurring?: boolean
  /** Échéance en millisecondes epoch. Absente ⇒ sans échéance. */
  expiresAt?: number
}

export async function createPriceAlert(input: CreateAlertInput): Promise<AlertActionResult> {
  // Le service d'envoi est vérifié AVANT toute écriture. Enregistrer une alerte que
  // rien ne pourra notifier reviendrait à promettre une surveillance qui n'existe
  // pas — la panne la plus trompeuse que cette fonction puisse produire.
  if (!MAILER_ENABLED) return { ok: false, reason: 'mailer-disabled' }

  /* Les validations portent toutes sur des valeurs venues du navigateur. Un seuil
     négatif, nul ou non fini produirait une alerte qui se déclenche à chaque passage
     de la tâche, ou jamais. */
  if (!isAlertDirection(input.direction)) return { ok: false, reason: 'invalid' }
  if (!Number.isFinite(input.threshold) || input.threshold <= 0) {
    return { ok: false, reason: 'invalid' }
  }
  if (!/^[a-z]{3}$/.test(input.currency)) return { ok: false, reason: 'invalid' }

  const email = input.email.trim()
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, reason: 'invalid' }

  const title = input.title?.trim().slice(0, TITLE_MAX)
  const note = input.note?.trim().slice(0, NOTE_MAX)

  /* Une échéance déjà passée, ou à plus d'un an, est REFUSÉE et non corrigée en
     silence : elle vient d'un champ de date que l'auteur a rempli, et ramener sa
     saisie à une autre valeur sans le dire lui ferait croire à une surveillance
     qu'il n'a pas demandée. */
  let expiresAt: Date | undefined
  if (input.expiresAt !== undefined) {
    if (!Number.isFinite(input.expiresAt)) return { ok: false, reason: 'invalid' }
    const delta = input.expiresAt - Date.now()
    if (delta <= 0 || delta > MAX_EXPIRY_MS) return { ok: false, reason: 'invalid' }
    expiresAt = new Date(input.expiresAt)
  }

  try {
    const userId = await ensureOwnerId()

    const active = await countActiveAlerts(userId)
    if (!active.ok) return { ok: false, reason: 'db-disabled' }
    if (active.data >= ALERT_LIMIT) {
      return { ok: false, reason: 'limit-reached', limit: ALERT_LIMIT }
    }

    const created = await createAlert({
      userId,
      assetClass: input.assetClass,
      assetId: input.assetId,
      label: input.label,
      ...(input.symbol ? { symbol: input.symbol } : {}),
      ...(title ? { title } : {}),
      ...(note ? { note } : {}),
      direction: input.direction,
      threshold: input.threshold,
      currency: input.currency,
      email,
      recurring: input.recurring === true,
      ...(expiresAt ? { expiresAt } : {}),
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
  const userId = await ownerId()
  // Pas de cookie ⇒ aucune alerte ne peut lui appartenir. On répond « invalide »
  // plutôt que d'en créer un : supprimer n'a aucune raison d'ouvrir une identité.
  if (!userId) return { ok: false, reason: 'invalid' }

  try {
    const removed = await deleteAlert(userId, id)
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

  const userId = await ownerId()
  if (!userId) return { ok: false, reason: 'invalid' }

  try {
    const active = await countActiveAlerts(userId)
    if (!active.ok) return { ok: false, reason: 'db-disabled' }
    if (active.data >= ALERT_LIMIT) {
      return { ok: false, reason: 'limit-reached', limit: ALERT_LIMIT }
    }

    const rearmed = await rearmAlert(userId, id)
    if (!rearmed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/alertes')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
