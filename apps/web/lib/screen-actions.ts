'use server'

import { revalidatePath } from 'next/cache'

import { DB_ENABLED, deleteScreen, listScreens, saveScreen } from '@zenkuu/db'

import { ensureOwnerId, ownerId } from '@/lib/session'

/**
 * Écrans de screener sauvegardés — actions serveur.
 *
 * ── CE QUI A CHANGÉ AVEC LE RETRAIT DES COMPTES ───────────────────────────────
 *
 * Sauvegarder un écran était réservé à l'abonnement, et le contrôle vivait ici plutôt
 * que dans l'interface parce qu'un écran est une ÉCRITURE persistante : il occupe de
 * la place et survit à la session, ce qu'une garde d'affichage ne protège pas.
 *
 * L'abonnement a disparu avec les comptes. Le contrôle d'appartenance, lui, reste
 * entier : chaque requête est filtrée sur l'identifiant du visiteur, faute de quoi un
 * entier modifié à la main dans la requête supprimerait l'écran de quelqu'un d'autre.
 */

/** Forme attendue des critères. Volontairement plate : elle est sérialisée telle quelle. */
export interface ScreenCriteria {
  preset: string
  minCapIndex: number
  minVolumeIndex: number
  minChange24h: number
  minChange7d: number
  minTurnoverIndex: number
  query: string
}

export type ScreenActionResult =
  | { ok: true }
  | { ok: false; reason: 'db-disabled' | 'invalid' | 'error' }

export interface SavedScreenRow {
  id: number
  name: string
  criteria: ScreenCriteria
}

/**
 * Relit des critères venus de la base.
 *
 * La colonne est du texte libre et la base ne valide rien (cf. le schéma) : un écran
 * enregistré avant l'ajout d'un critère, ou corrompu, doit être écarté plutôt que
 * rejoué tel quel. Chaque champ est donc revalidé un par un, avec un repli neutre —
 * un écran qui appliquerait `NaN` comme seuil viderait le tableau sans rien dire.
 */
function parseCriteria(raw: string): ScreenCriteria | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const source = parsed as Record<string, unknown>
    const num = (key: string, fallback: number) =>
      typeof source[key] === 'number' && Number.isFinite(source[key]) ? source[key] : fallback

    return {
      preset: typeof source['preset'] === 'string' ? source['preset'] : 'tout',
      minCapIndex: num('minCapIndex', 0),
      minVolumeIndex: num('minVolumeIndex', 0),
      minChange24h: num('minChange24h', -100),
      minChange7d: num('minChange7d', -100),
      minTurnoverIndex: num('minTurnoverIndex', 0),
      query: typeof source['query'] === 'string' ? source['query'] : '',
    }
  } catch {
    return null
  }
}

export async function listSavedScreens(): Promise<SavedScreenRow[]> {
  const userId = await ownerId()
  if (!userId) return []

  const result = await listScreens(userId)
  if (!result.ok) return []

  return result.data.flatMap((screen) => {
    const criteria = parseCriteria(screen.criteria)
    // Un écran illisible est simplement OMIS, pas signalé : le lecteur n'a aucun geste
    // à faire, et une ligne « écran corrompu » dans sa liste serait un déchet visuel.
    return criteria ? [{ id: screen.id, name: screen.name, criteria }] : []
  })
}

export async function storeScreen(
  name: string,
  criteria: ScreenCriteria,
): Promise<ScreenActionResult> {
  if (!DB_ENABLED) return { ok: false, reason: 'db-disabled' }
  const userId = await ensureOwnerId()

  const trimmed = name.trim()
  if (trimmed === '') return { ok: false, reason: 'invalid' }

  try {
    const saved = await saveScreen(userId, trimmed, JSON.stringify(criteria))
    if (!saved.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/screener')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Suppression.
 *
 * Elle ne crée jamais de cookie : sans identifiant, il n'y a aucun écran à effacer,
 * et ouvrir une identité pour un geste de suppression n'aurait aucun sens.
 */
export async function removeScreen(id: number): Promise<ScreenActionResult> {
  const userId = await ownerId()
  if (!userId) return { ok: false, reason: 'db-disabled' }

  try {
    const removed = await deleteScreen(userId, id)
    if (!removed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/screener')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
