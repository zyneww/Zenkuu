'use server'

import { revalidatePath } from 'next/cache'

import {
  DEFAULT_WATCHLIST,
  addToWatchlist,
  deleteWatchlist,
  isInWatchlist,
  listWatchlist,
  listWatchlistNames,
  normalizeListName,
  removeFromWatchlist,
  renameWatchlist,
} from '@zenkuu/db'

import { AUTH_ENABLED } from '@/lib/auth'
import { FEATURES, FREE_WATCHLIST_COUNT, FREE_WATCHLIST_LIMIT } from '@/lib/billing'
import { hasFeature } from '@/lib/billing-server'

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
  | {
      ok: false
      /**
       * `limit-reached` : le plafond d'ACTIFS est atteint.
       * `list-limit`    : le plafond de LISTES est atteint.
       *
       * Les deux sont distincts parce qu'ils appellent deux gestes différents —
       * retirer un actif, ou renoncer à une nouvelle liste — et parce qu'ils ne
       * disparaissent pas ensemble : un abonné libère les deux, mais un utilisateur
       * gratuit peut buter sur l'un sans jamais rencontrer l'autre.
       */
      reason:
        | 'auth-disabled'
        | 'signed-out'
        | 'db-disabled'
        | 'error'
        | 'limit-reached'
        | 'list-limit'
    }

/** Résultat des opérations qui portent sur une liste entière. */
export type ListActionResult =
  | { ok: true }
  | { ok: false; reason: 'signed-out' | 'db-disabled' | 'list-limit' | 'invalid' | 'error' }

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

/**
 * La liste peut-elle encore accueillir un actif ?
 *
 * Plafond de l'offre gratuite, vérifié CÔTÉ SERVEUR et pas seulement dans l'interface.
 * C'est la différence entre les deux gardes du projet : `ProGate` masque un bouton, ce
 * qui relève de la présentation et se contourne en trois clics dans un navigateur. Ce
 * contrôle-ci porte sur une ÉCRITURE en base — la seule chose que l'abonnement achète
 * réellement de ce côté — et ne peut donc pas vivre dans un composant.
 *
 * Une liste qu'on ne parvient pas à lire (base indisponible) laisse passer : l'ajout
 * qui suit échouera de lui-même avec `db-disabled`, qui décrit la vraie panne. Refuser
 * ici afficherait « plafond atteint » à quelqu'un dont la liste est peut-être vide.
 */
async function canGrow(userId: string): Promise<boolean> {
  if (await hasFeature(FEATURES.unlimitedWatchlist)) return true

  const current = await listWatchlist(userId)
  if (!current.ok) return true

  return current.data.length < FREE_WATCHLIST_LIMIT
}

/**
 * L'utilisateur peut-il écrire dans CETTE liste ?
 *
 * Vrai si la liste existe déjà — y ajouter n'en crée pas une nouvelle —, ou si le
 * quota de listes n'est pas atteint. C'est le seul contrôle qui distingue réellement
 * l'offre gratuite de l'offre Pro sur la liste de suivi : le nombre d'ACTIFS est
 * généreux des deux côtés, c'est l'ORGANISATION qui se vend.
 */
async function canUseList(userId: string, listName: string): Promise<boolean> {
  if (await hasFeature(FEATURES.unlimitedWatchlist)) return true

  const names = await listWatchlistNames(userId)
  if (!names.ok) return true
  if (names.data.some((summary) => summary.name === listName)) return true

  return names.data.length < FREE_WATCHLIST_COUNT
}

export async function toggleWatchlist(input: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  path: string
  /** Liste cible. Omise — depuis une étoile de tableau —, c'est la liste par défaut. */
  listName?: string
}): Promise<WatchlistActionResult> {
  if (!AUTH_ENABLED) return { ok: false, reason: 'auth-disabled' }

  const userId = await currentUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }

  const listName = normalizeListName(input.listName)

  try {
    // Sans liste explicite, la présence est cherchée dans TOUTES les listes : c'est
    // ce que montre l'étoile d'un tableau, qui ne sait pas dans laquelle l'actif se
    // trouve. Avec une liste explicite, la question porte sur elle seule.
    const scope = input.listName ? listName : undefined
    const already = await isInWatchlist(userId, input.assetClass, input.assetId, scope)

    // Le retrait n'est jamais soumis à un plafond : c'est le geste qui permet d'y
    // revenir. Seul l'ajout est vérifié.
    if (!already) {
      if (!(await canUseList(userId, listName))) return { ok: false, reason: 'list-limit' }
      if (!(await canGrow(userId))) return { ok: false, reason: 'limit-reached' }
    }

    const result = already
      ? await removeFromWatchlist(userId, input.assetClass, input.assetId, scope)
      : await addToWatchlist({
          userId,
          listName,
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

/**
 * Identifiants suivis pour une classe d'actif — lecture GROUPÉE.
 *
 * `getWatchlistState` interroge la base par actif : correct sur une fiche, ruineux
 * dans un tableau de cinquante lignes, où il produirait cinquante allers-retours
 * pour un état qu'une seule requête suffit à connaître. On lit donc la liste
 * complète une fois et on la réduit à un ensemble d'identifiants.
 *
 * `available: false` ne signifie pas « rien de suivi » mais « le suivi n'est pas
 * disponible » — pas de compte, ou pas de base configurée. Les deux cas appellent un
 * affichage différent de celui d'une liste simplement vide.
 */
export async function getWatchlistIds(
  assetClass: string,
): Promise<{ available: boolean; ids: string[] }> {
  const userId = await currentUserId()
  if (!userId) return { available: false, ids: [] }

  const result = await listWatchlist(userId)
  if (!result.ok) return { available: false, ids: [] }

  return {
    available: true,
    ids: result.data.filter((item) => item.assetClass === assetClass).map((item) => item.assetId),
  }
}

/* ── Gestion des listes — offre Zenkuu Pro ──────────────────────────────── */

/**
 * Déplace un actif d'une liste vers une autre.
 *
 * Un déplacement n'est pas un ajout : il ne fait pas grandir le total d'actifs, et le
 * plafond de comptage n'a donc pas à être vérifié. Le plafond de LISTES, lui, l'est —
 * déplacer vers une liste qui n'existe pas encore, c'est la créer.
 */
export async function moveToList(input: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  from: string
  to: string
}): Promise<ListActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }

  const target = normalizeListName(input.to)
  if (target === input.from) return { ok: true }

  try {
    if (!(await canUseList(userId, target))) return { ok: false, reason: 'list-limit' }

    const added = await addToWatchlist({
      userId,
      listName: target,
      assetClass: input.assetClass,
      assetId: input.assetId,
      label: input.label,
      ...(input.symbol ? { symbol: input.symbol } : {}),
    })
    if (!added.ok) return { ok: false, reason: 'db-disabled' }

    // Le retrait de la source vient APRÈS l'ajout à la cible. Dans l'autre ordre, une
    // interruption entre les deux ferait disparaître l'actif ; dans celui-ci, elle le
    // laisse dans les deux listes — visible, et corrigeable d'un clic.
    await removeFromWatchlist(userId, input.assetClass, input.assetId, input.from)

    revalidatePath('/suivi')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export async function renameList(from: string, to: string): Promise<ListActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }

  const target = normalizeListName(to)
  if (target === from) return { ok: true }

  try {
    // Renommer ne crée pas de liste supplémentaire — il y en a une avant, une après.
    // Le quota n'est donc pas vérifié : le refuser à un utilisateur gratuit
    // l'empêcherait de baptiser sa liste unique, ce qui ne protège rien.
    const renamed = await renameWatchlist(userId, from, target)
    if (!renamed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/suivi')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** Supprime une liste et tout ce qu'elle contient. */
export async function removeList(listName: string): Promise<ListActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }

  try {
    const removed = await deleteWatchlist(userId, listName)
    if (!removed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/suivi')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** Noms de listes de l'utilisateur, pour alimenter un sélecteur. */
export async function getListNames(): Promise<string[]> {
  const userId = await currentUserId()
  if (!userId) return []

  const names = await listWatchlistNames(userId)
  if (!names.ok || names.data.length === 0) return [DEFAULT_WATCHLIST]

  return names.data.map((summary) => summary.name)
}
