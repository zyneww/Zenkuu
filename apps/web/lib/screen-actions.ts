'use server'

import { revalidatePath } from 'next/cache'

import { deleteScreen, listScreens, saveScreen } from '@zenkuu/db'

import { AUTH_ENABLED } from '@/lib/auth'
import { FEATURES } from '@/lib/billing'
import { hasFeature } from '@/lib/billing-server'

/**
 * Écrans de screener sauvegardés — actions serveur.
 *
 * ── LA SEULE GARDE QUI COMPTE VRAIMENT DANS CE FICHIER ────────────────────────
 *
 * Contrairement à l'export ou aux filtres avancés, un écran sauvegardé est une
 * ÉCRITURE persistante : il occupe de la place, il survit à la session, et le lecteur
 * s'attend à le retrouver. Le contrôle passe donc par `hasFeature()` côté serveur, et
 * pas seulement par `ProGate` côté interface — c'est la même frontière que le plafond
 * de la liste de suivi.
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
  | { ok: false; reason: 'signed-out' | 'db-disabled' | 'not-pro' | 'invalid' | 'error' }

export interface SavedScreenRow {
  id: number
  name: string
  criteria: ScreenCriteria
}

async function currentUserId(): Promise<string | null> {
  if (!AUTH_ENABLED) return null

  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  return userId ?? null
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
  const userId = await currentUserId()
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
  const userId = await currentUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }

  if (!(await hasFeature(FEATURES.savedScreens))) return { ok: false, reason: 'not-pro' }

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
 * Pas de contrôle d'abonnement : quelqu'un dont l'abonnement a pris fin doit pouvoir
 * faire le ménage dans ce qu'il a créé. Refuser la suppression aux non-abonnés
 * transformerait la fin d'un abonnement en données inamovibles.
 */
export async function removeScreen(id: number): Promise<ScreenActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }

  try {
    const removed = await deleteScreen(userId, id)
    if (!removed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/screener')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
