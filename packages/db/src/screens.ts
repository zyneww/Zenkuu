import { and, desc, eq } from 'drizzle-orm'

import { getDb } from './client'
import { savedScreens, type SavedScreen } from './schema'
import type { WatchlistResult } from './watchlist'

/**
 * Écrans de screener sauvegardés — accès base.
 *
 * Les critères circulent ici en CHAÎNE, jamais en objet. C'est délibéré : ce paquet
 * n'a pas à connaître la forme des critères du screener, qui appartient à
 * l'application web et change avec l'outil. Sérialiser et valider est le travail de
 * l'appelant, qui seul sait ce qu'est un critère valide aujourd'hui.
 */

const UNAVAILABLE = 'Base de données non configurée'

export const SCREEN_NAME_MAX = 40

export async function listScreens(userId: string): Promise<WatchlistResult<SavedScreen[]>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const rows = await db
    .select()
    .from(savedScreens)
    .where(eq(savedScreens.userId, userId))
    .orderBy(desc(savedScreens.createdAt))

  return { ok: true, data: rows }
}

/**
 * Enregistre un écran, ou ÉCRASE celui du même nom.
 *
 * L'écrasement est le comportement attendu : réenregistrer sous un nom déjà pris veut
 * dire « mets à jour cet écran », jamais « crée un doublon ». `onConflictDoUpdate`
 * s'appuie sur l'index unique (userId, name) du schéma, ce qui rend l'opération
 * atomique — deux enregistrements simultanés ne peuvent pas produire deux lignes.
 */
export async function saveScreen(
  userId: string,
  name: string,
  criteria: string,
): Promise<WatchlistResult<{ saved: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  const trimmed = name.trim().slice(0, SCREEN_NAME_MAX)
  if (trimmed === '') return { ok: false, reason: 'Nom d’écran vide' }

  await db
    .insert(savedScreens)
    .values({ userId, name: trimmed, criteria })
    .onConflictDoUpdate({
      target: [savedScreens.userId, savedScreens.name],
      set: { criteria },
    })

  return { ok: true, data: { saved: true } }
}

export async function deleteScreen(
  userId: string,
  id: number,
): Promise<WatchlistResult<{ removed: boolean }>> {
  const db = getDb()
  if (!db) return { ok: false, reason: UNAVAILABLE }

  // Filtre sur `userId` obligatoire : l'identifiant vient du navigateur (cf. `alerts.ts`).
  const deleted = await db
    .delete(savedScreens)
    .where(and(eq(savedScreens.userId, userId), eq(savedScreens.id, id)))
    .returning({ id: savedScreens.id })

  return { ok: true, data: { removed: deleted.length > 0 } }
}
