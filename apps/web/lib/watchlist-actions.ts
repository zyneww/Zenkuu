'use server'

import { revalidatePath } from 'next/cache'

import { ASSET_CLASSES, type AssetClass } from '@zenkuu/data'
import {
  DB_ENABLED,
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

import { WATCHLIST_ASSET_LIMIT, WATCHLIST_COUNT_LIMIT } from '@/lib/limits'
import { ensureOwnerId, ownerId } from '@/lib/session'

/**
 * Actions serveur de la liste de suivi.
 *
 * ── CE QUI A CHANGÉ AVEC L'ABANDON DU FOURNISSEUR D'IDENTITÉ ──────────────────
 *
 * Deux briques optionnelles se combinaient ici, l'authentification tierce et la base,
 * et chacune pouvait manquer indépendamment : d'où trois refus distincts — pas
 * d'authentification configurée, pas de session, pas de base.
 *
 * Il n'en reste qu'UN. Suivre un actif ne demande plus de compte : la première
 * écriture crée un cookie anonyme (`lib/visitor.ts`), et `lib/session.ts` choisit
 * entre ce cookie et le compte quand il y en a un. Seule la base peut manquer, et
 * c'est le seul message que l'exploitant ait à lire.
 *
 * Les plafonds, eux, subsistent — mais ils ne distinguent plus deux offres : voir
 * `lib/limits.ts`.
 */
export type WatchlistActionResult =
  | { ok: true; following: boolean }
  | {
      ok: false
      /**
       * `limit-reached` : le plafond d'ACTIFS est atteint.
       * `list-limit`    : le plafond de LISTES est atteint.
       *
       * Les deux restent distincts parce qu'ils appellent deux gestes différents —
       * retirer un actif, ou renoncer à une nouvelle liste — et parce qu'on peut
       * buter sur l'un sans jamais rencontrer l'autre.
       */
      reason: 'db-disabled' | 'error' | 'limit-reached' | 'list-limit'
    }

/** Résultat des opérations qui portent sur une liste entière. */
export type ListActionResult =
  | { ok: true }
  | { ok: false; reason: 'db-disabled' | 'list-limit' | 'invalid' | 'error' }

/**
 * La liste peut-elle encore accueillir un actif ?
 *
 * Plafond vérifié CÔTÉ SERVEUR et pas seulement dans l'interface : il porte sur une
 * ÉCRITURE en base, et une garde posée dans un composant se contourne en trois clics
 * dans un navigateur.
 *
 * Une liste qu'on ne parvient pas à lire (base indisponible) laisse passer : l'ajout
 * qui suit échouera de lui-même avec `db-disabled`, qui décrit la vraie panne. Refuser
 * ici afficherait « plafond atteint » à quelqu'un dont la liste est peut-être vide.
 */
async function canGrow(userId: string): Promise<boolean> {
  const current = await listWatchlist(userId)
  if (!current.ok) return true

  return current.data.length < WATCHLIST_ASSET_LIMIT
}

/**
 * Peut-on encore écrire dans CETTE liste ?
 *
 * Vrai si la liste existe déjà — y ajouter n'en crée pas une nouvelle —, ou si le
 * quota de listes n'est pas atteint.
 */
async function canUseList(userId: string, listName: string): Promise<boolean> {
  const names = await listWatchlistNames(userId)
  if (!names.ok) return true
  if (names.data.some((summary) => summary.name === listName)) return true

  return names.data.length < WATCHLIST_COUNT_LIMIT
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
  if (!DB_ENABLED) return { ok: false, reason: 'db-disabled' }

  /* Première écriture du visiteur ⇒ le cookie est créé ici. C'est la seule chose
     qui tienne lieu d'inscription sur ce site, et elle ne demande rien à personne. */
  const userId = await ensureOwnerId()

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

    // Le tableau de bord et la fiche affichent tous deux l'état : les revalider
    // évite qu'un retour arrière montre un bouton dans l'état précédent.
    revalidatePath('/tableau-de-bord')
    revalidatePath(input.path)

    return { ok: true, following: !already }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * État courant, lu par la fiche au rendu serveur.
 *
 * `available` ne décrit plus une session ouverte mais la seule chose dont le suivi
 * dépende encore : une base configurée. Un visiteur sans cookie a donc un bouton
 * ACTIF — c'est son clic qui créera son identité — là où il avait auparavant un lien
 * vers une page de connexion.
 */
export async function getWatchlistState(
  assetClass: string,
  assetId: string,
): Promise<{ available: boolean; following: boolean }> {
  if (!DB_ENABLED) return { available: false, following: false }

  const userId = await ownerId()
  if (!userId) return { available: true, following: false }

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
 * disponible » — c'est-à-dire, désormais, pas de base configurée. Ce cas appelle un
 * affichage différent de celui d'une liste simplement vide.
 */
export async function getWatchlistIds(
  assetClass: string,
): Promise<{ available: boolean; ids: string[] }> {
  if (!DB_ENABLED) return { available: false, ids: [] }

  const userId = await ownerId()
  if (!userId) return { available: true, ids: [] }

  const result = await listWatchlist(userId)
  if (!result.ok) return { available: false, ids: [] }

  return {
    available: true,
    ids: result.data.filter((item) => item.assetClass === assetClass).map((item) => item.assetId),
  }
}

/**
 * Les actifs suivis, AVEC de quoi les afficher.
 *
 * ── POURQUOI ELLE EXISTE À CÔTÉ DE `getWatchlistIds` ────────────────────────
 *
 * Celle-là ne rend que des identifiants, ce qui suffit à une ÉTOILE : la ligne est
 * déjà à l'écran, l'étoile n'a besoin que de savoir si elle est pleine ou vide.
 *
 * Le panneau de recherche, lui, doit DESSINER les lignes — nom, symbole, classe — et
 * n'a rien d'autre sous la main. Les recharger depuis la source coûterait un appel
 * réseau pour des libellés que la base porte déjà : `label` et `symbol` sont écrits en
 * même temps que l'actif est suivi, précisément pour ce cas.
 *
 * ⚠️ SANS VIGNETTE, ET C'EST UNE ABSENCE DE DONNÉE. La table ne stocke pas l'adresse
 * du logo — elle changerait chez la source sans que rien ne la mette à jour. Les
 * lignes tombent donc sur le monogramme, ce que `AssetThumb` fait déjà pour tout actif
 * sans image.
 */
export async function getWatchlistEntries(): Promise<{
  available: boolean
  entries: {
    assetClass: AssetClass
    assetId: string
    label: string
    symbol: string
  }[]
}> {
  if (!DB_ENABLED) return { available: false, entries: [] }

  const userId = await ownerId()
  if (!userId) return { available: true, entries: [] }

  const result = await listWatchlist(userId)
  if (!result.ok) return { available: false, entries: [] }

  return {
    available: true,
    /* `listWatchlist` rend déjà les lignes de la plus récente à la plus ancienne
       (`orderBy(desc(createdAt))`) : c'est l'ordre qu'un panneau « ma liste » doit
       avoir, et le retrier ici le contredirait. */
    entries: result.data.flatMap((item) => {
      /* ⚠️ LA COLONNE EST UN `text` LIBRE, PAS UNE ÉNUMÉRATION, et cette lecture est
         la première à en TIRER UN LIEN. `assetHref` interroge une table indexée par
         classe : une valeur qu'elle ne connaît pas rendrait une adresse `undefined`,
         donc une ligne cliquable qui ne mène nulle part. Une ligne écrite par une
         version antérieure du site suffirait à la produire. On la laisse tomber
         plutôt que de la servir cassée. */
      if (!ASSET_CLASSES.includes(item.assetClass as AssetClass)) return []

      return [
        {
          assetClass: item.assetClass as AssetClass,
          assetId: item.assetId,
          label: item.label,
          symbol: item.symbol ?? item.label,
        },
      ]
    }),
  }
}

/* ── Gestion des listes ─────────────────────────────────────────────────── */

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
  if (!DB_ENABLED) return { ok: false, reason: 'db-disabled' }
  const userId = await ensureOwnerId()

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

    revalidatePath('/tableau-de-bord')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export async function renameList(from: string, to: string): Promise<ListActionResult> {
  if (!DB_ENABLED) return { ok: false, reason: 'db-disabled' }
  const userId = await ensureOwnerId()

  const target = normalizeListName(to)
  if (target === from) return { ok: true }

  try {
    // Renommer ne crée pas de liste supplémentaire — il y en a une avant, une après.
    // Le quota n'est donc pas vérifié : le refuser à un utilisateur gratuit
    // l'empêcherait de baptiser sa liste unique, ce qui ne protège rien.
    const renamed = await renameWatchlist(userId, from, target)
    if (!renamed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/tableau-de-bord')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** Supprime une liste et tout ce qu'elle contient. */
export async function removeList(listName: string): Promise<ListActionResult> {
  const userId = await ownerId()
  if (!userId) return { ok: false, reason: 'db-disabled' }

  try {
    const removed = await deleteWatchlist(userId, listName)
    if (!removed.ok) return { ok: false, reason: 'db-disabled' }

    revalidatePath('/tableau-de-bord')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** Noms de listes de l'utilisateur, pour alimenter un sélecteur. */
export async function getListNames(): Promise<string[]> {
  const userId = await ownerId()
  if (!userId) return [DEFAULT_WATCHLIST]

  const names = await listWatchlistNames(userId)
  if (!names.ok || names.data.length === 0) return [DEFAULT_WATCHLIST]

  return names.data.map((summary) => summary.name)
}
