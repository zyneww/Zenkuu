import { and, desc, eq, gt, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm'

import { getDb } from './client'
import { priceAlerts, type NewPriceAlert, type PriceAlert } from './schema'
import type { WatchlistResult } from './watchlist'

/**
 * Alertes de prix — accès base.
 *
 * Le type de résultat est partagé avec la watchlist : les deux distinguent « base non
 * configurée » d'un ensemble vide, et inventer un second type pour la même distinction
 * obligerait chaque appelant à traiter deux formes du même cas.
 */

const UNAVAILABLE = 'Base de données non configurée'

export type AlertDirection = 'above' | 'below'

/** Garde de saisie — la colonne est du texte libre, le code ne doit pas s'y fier. */
export function isAlertDirection(value: unknown): value is AlertDirection {
  return value === 'above' || value === 'below'
}

export async function listAlerts(userId: string): Promise<WatchlistResult<PriceAlert[]>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.userId, userId))
    .orderBy(desc(priceAlerts.createdAt))

  return { ok: true, data: rows }
}

/** Nombre d'alertes ARMÉES — c'est ce que plafonne l'offre, pas l'historique. */
export async function countActiveAlerts(userId: string): Promise<WatchlistResult<number>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select({ id: priceAlerts.id })
    .from(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.active, true)))

  return { ok: true, data: rows.length }
}

export async function createAlert(
  alert: NewPriceAlert,
): Promise<WatchlistResult<{ id: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const inserted = await db.insert(priceAlerts).values(alert).returning({ id: priceAlerts.id })

  const id = inserted[0]?.id
  if (id === undefined) return { ok: false, reason: 'Insertion refusée' }

  return { ok: true, data: { id } }
}

/**
 * Suppression, TOUJOURS filtrée sur `userId`.
 *
 * L'identifiant d'alerte vient du navigateur : sans ce second prédicat, un entier
 * modifié à la main dans la requête supprimerait l'alerte de quelqu'un d'autre. Le
 * filtre n'est pas une précaution de style, c'est le contrôle d'accès lui-même.
 */
export async function deleteAlert(
  userId: string,
  id: number,
): Promise<WatchlistResult<{ removed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const deleted = await db
    .delete(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, id)))
    .returning({ id: priceAlerts.id })

  return { ok: true, data: { removed: deleted.length > 0 } }
}

/** Réarme une alerte consommée. Même règle de filtrage que la suppression. */
export async function rearmAlert(
  userId: string,
  id: number,
): Promise<WatchlistResult<{ rearmed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const updated = await db
    .update(priceAlerts)
    .set({ active: true, triggeredAt: null, triggeredPrice: null })
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, id)))
    .returning({ id: priceAlerts.id })

  return { ok: true, data: { rearmed: updated.length > 0 } }
}

/**
 * Toutes les alertes armées, tous utilisateurs confondus — lecture de la tâche planifiée.
 *
 * ⚠️ Cette fonction ignore délibérément `userId` : c'est la seule du paquet dans ce
 * cas, et elle ne doit être appelée que depuis la route de tâche planifiée, elle-même
 * protégée par un secret. Un appel depuis une page exposerait les seuils de tous les
 * abonnés.
 */
export async function listArmedAlerts(now: Date = new Date()): Promise<WatchlistResult<PriceAlert[]>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  /* Les alertes ÉCHUES sont écartées ici plutôt que filtrées par l'appelant : leur
     seuil ne doit plus être comparé à quoi que ce soit, et les laisser remonter
     ferait porter au code de la tâche une règle qui appartient à la donnée. */
  const rows = await db
    .select()
    .from(priceAlerts)
    .where(
      and(
        eq(priceAlerts.active, true),
        or(isNull(priceAlerts.expiresAt), gt(priceAlerts.expiresAt, now)),
      ),
    )

  return { ok: true, data: rows }
}

/**
 * Efface les alertes dont l'échéance est passée.
 *
 * Appelée par la tâche planifiée, au même passage que la vérification des seuils. Une
 * alerte échue est déjà ignorée par `listArmedAlerts` ; la purge ne change donc rien
 * au comportement, elle empêche seulement la table de conserver indéfiniment des
 * lignes que plus personne ne lira.
 */
export async function purgeExpiredAlerts(
  now: Date = new Date(),
): Promise<WatchlistResult<{ removed: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const removed = await db
    .delete(priceAlerts)
    .where(and(isNotNull(priceAlerts.expiresAt), lte(priceAlerts.expiresAt, now)))
    .returning({ id: priceAlerts.id })

  return { ok: true, data: { removed: removed.length } }
}

/**
 * Désarme en LOT les alertes qui viennent de se déclencher.
 *
 * Écriture groupée et non une par alerte : la tâche planifiée peut en consommer
 * plusieurs dizaines d'un coup lors d'un mouvement de marché, et Turso facture — et
 * surtout, latence — à la requête.
 *
 * Le prix de déclenchement est le MÊME pour tout le lot par construction : la fonction
 * est appelée une fois par actif relevé.
 */
export async function markAlertsTriggered(
  ids: number[],
  price: number,
  at: Date,
  /**
   * Laisser l'alerte ARMÉE après le déclenchement — les alertes « à chaque fois ».
   *
   * Le paramètre est un booléen et non une lecture de la colonne `recurring` de
   * chaque ligne, parce que l'écriture est GROUPÉE : un `UPDATE` unique ne peut pas
   * poser deux valeurs différentes de `active` selon la ligne. L'appelant partage
   * donc son lot en deux et appelle deux fois, ce qui reste deux requêtes au lieu
   * d'une par alerte.
   */
  keepArmed = false,
): Promise<WatchlistResult<{ updated: number }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }
  if (ids.length === 0) return { ok: true, data: { updated: 0 } }

  const updated = await db
    .update(priceAlerts)
    .set({ active: keepArmed, triggeredAt: at, triggeredPrice: price })
    .where(inArray(priceAlerts.id, ids))
    .returning({ id: priceAlerts.id })

  return { ok: true, data: { updated: updated.length } }
}
