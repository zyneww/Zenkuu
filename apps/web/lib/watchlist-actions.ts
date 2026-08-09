'use server'

import { revalidatePath } from 'next/cache'

import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '@zenith/db'

import { AUTH_ENABLED } from '@/lib/auth'

/**
 * Actions serveur de la watchlist.
 *
 * Deux briques optionnelles se combinent ici — Clerk et Turso — et chacune peut
 * manquer indépendamment. Le résultat renvoyé distingue donc les trois refus
 * possibles : pas d'authentification configurée, pas de session, pas de base. Un
 * booléen `false` unique aurait produit le même message pour trois causes qui
 * appellent trois actions différentes de la part de l'exploitant.
 */
export type WatchlistActionResult =
  | { ok: true; following: boolean }
  | { ok: false; reason: 'auth-disabled' | 'signed-out' | 'db-disabled' | 'error' }

/**
 * Identifiant de l'utilisateur courant, ou `null`.
 *
 * `auth()` est importé DYNAMIQUEMENT : sans clé Clerk, le module n'est jamais chargé,
 * et le middleware qui installe son contexte n'est pas monté non plus. Un import
 * statique lèverait au chargement du module, avant même que la condition soit lue.
 */
async function currentUserId(): Promise<string | null> {
  if (!AUTH_ENABLED) return null

  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  return userId ?? null
}

export async function toggleWatchlist(input: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  path: string
}): Promise<WatchlistActionResult> {
  if (!AUTH_ENABLED) return { ok: false, reason: 'auth-disabled' }

  const userId = await currentUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }

  try {
    const already = await isInWatchlist(userId, input.assetClass, input.assetId)

    const result = already
      ? await removeFromWatchlist(userId, input.assetClass, input.assetId)
      : await addToWatchlist({
          userId,
          assetClass: input.assetClass,
          assetId: input.assetId,
          label: input.label,
          ...(input.symbol ? { symbol: input.symbol } : {}),
        })

    if (!result.ok) return { ok: false, reason: 'db-disabled' }

    // La page de suivi et la fiche affichent toutes deux l'état : les revalider
    // évite qu'un retour arrière montre un bouton dans l'état précédent.
    revalidatePath('/suivi')
    revalidatePath(input.path)

    return { ok: true, following: !already }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** État courant, lu par la fiche au rendu serveur. */
export async function getWatchlistState(
  assetClass: string,
  assetId: string,
): Promise<{ available: boolean; following: boolean }> {
  const userId = await currentUserId()
  if (!userId) return { available: false, following: false }

  return { available: true, following: await isInWatchlist(userId, assetClass, assetId) }
}
