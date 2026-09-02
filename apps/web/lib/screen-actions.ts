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

/**
 * Forme attendue des critères. Volontairement plate : elle est sérialisée telle quelle.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ELLE A CHANGÉ AVEC L'ARRIVÉE DES SIX MARCHÉS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elle portait sept champs nommés — `minCapIndex`, `minVolumeIndex`,
 * `minChange24h`… — qui décrivaient les sept curseurs d'un screener crypto. Ce n'est
 * plus tenable à six marchés : les frais d'un ETF, le PER d'une action et la réserve
 * d'un pool ne se rangent dans aucun de ces champs, et en ajouter un par filtre de
 * chaque marché ferait une trentaine de colonnes dont chaque écran n'en renseignerait
 * que cinq.
 *
 * `thresholds` est donc une table clé → seuil, où la clé est celle du filtre.
 *
 * ── LES VALEURS SONT DES GRANDEURS, PLUS DES INDICES ─────────────────────────
 *
 * `minCapIndex: 3` signifiait « le troisième cran du barème ». Un écran enregistré
 * survivait mal à l'ajout d'un cran : tous les seuils se décalaient d'un rang, en
 * silence. `{ marketCap: 1000000000 }` dit ce qu'il veut dire et reste juste quel que
 * soit le barème.
 *
 * ── LES ÉCRANS DÉJÀ ENREGISTRÉS SONT MIGRÉS À LA LECTURE ─────────────────────
 *
 * Voir `parseCriteria` : un écran de l'ancienne forme est traduit en seuils crypto
 * plutôt qu'écarté. Les écarter aurait été plus simple et se serait vu — un lecteur
 * qui retrouve sa liste vide après un déploiement ne sait pas que c'était voulu.
 */
export interface ScreenCriteria {
  /** Marché auquel l'écran s'applique — `crypto`, `actions`, `dex`… */
  market: string
  preset: string
  query: string
  /** Seuil par clé de filtre, exprimé dans l'unité de la grandeur. */
  /**
   * Le seuil d'un filtre : un nombre, ou une PAIRE pour une fourchette.
   *
   * ⚠️ CE TYPE EST RELU DEPUIS UN STOCKAGE, DONC IL EST VALIDÉ. Un écran sauvegardé
   * survit aux versions du site : une paire écrite aujourd'hui doit être reconnue
   * demain, et un nombre écrit hier doit rester lisible. La validation plus bas
   * accepte les deux formes et refuse tout le reste.
   */
  thresholds: Record<string, number | [number, number]>
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
/**
 * Barèmes de l'ANCIENNE forme, conservés pour la seule migration.
 *
 * Ils traduisent un indice de cran en grandeur. Ils sont figés : ce sont les barèmes
 * qui existaient au moment où ces écrans ont été enregistrés, et les faire suivre les
 * barèmes actuels décalerait les seuils de tous les écrans anciens.
 */
const LEGACY_CAP_STEPS = [0, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000]
const LEGACY_VOLUME_STEPS = [0, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000]
const LEGACY_TURNOVER_STEPS = [0, 1, 5, 10, 25, 50]

function parseCriteria(raw: string): ScreenCriteria | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const source = parsed as Record<string, unknown>
    const preset = typeof source['preset'] === 'string' ? source['preset'] : 'tout'
    const query = typeof source['query'] === 'string' ? source['query'] : ''

    const thresholds: Record<string, number | [number, number]> = {}
    const table = source['thresholds']
    if (typeof table === 'object' && table !== null) {
      for (const [key, value] of Object.entries(table as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          thresholds[key] = value
        } else if (
          /* Une FOURCHETTE : exactement deux nombres finis, dans cet ordre. Un tableau
             de trois valeurs ou contenant `null` vient d'un stockage corrompu ou d'une
             autre version — on le laisse tomber plutôt que de le charger à moitié. */
          Array.isArray(value) &&
          value.length === 2 &&
          value.every((n) => typeof n === 'number' && Number.isFinite(n))
        ) {
          thresholds[key] = [value[0] as number, value[1] as number]
        }
      }

      return {
        market: typeof source['market'] === 'string' ? source['market'] : 'crypto',
        preset,
        query,
        thresholds,
      }
    }

    /*
     * ── MIGRATION DE L'ANCIENNE FORME ────────────────────────────────────────
     *
     * Ces écrans ont été enregistrés quand le screener n'était que crypto. On les
     * traduit plutôt que de les écarter : un lecteur qui retrouve sa liste vide après
     * un déploiement ne sait pas que c'était voulu.
     *
     * Les seuils NEUTRES ne sont pas reportés. `minChange24h: -100` signifiait « aucun
     * filtre » dans l'ancienne forme ; le reporter tel quel poserait un seuil de −100 %
     * dans la nouvelle, qui ne retient rien de plus mais allume le curseur — et fait
     * croire à un filtre là où il n'y en a pas.
     */
    const index = (key: string, steps: number[]) => {
      const position = source[key]
      if (typeof position !== 'number' || !Number.isFinite(position)) return
      const value = steps[Math.min(Math.max(Math.round(position), 0), steps.length - 1)]
      if (value !== undefined && value > 0) thresholds[keyOf(key)] = value
    }

    const percent = (key: string, neutral: number, target: string) => {
      const value = source[key]
      if (typeof value === 'number' && Number.isFinite(value) && value !== neutral) {
        thresholds[target] = value
      }
    }

    index('minCapIndex', LEGACY_CAP_STEPS)
    index('minVolumeIndex', LEGACY_VOLUME_STEPS)
    index('minTurnoverIndex', LEGACY_TURNOVER_STEPS)
    percent('minChange24h', -100, 'change24h')
    percent('minChange7d', -100, 'change7d')

    return { market: 'crypto', preset, query, thresholds }
  } catch {
    return null
  }
}

/** Correspondance ancien champ → clé de filtre actuelle. */
function keyOf(legacy: string): string {
  if (legacy === 'minCapIndex') return 'marketCap'
  if (legacy === 'minVolumeIndex') return 'volume24h'
  return 'turnover'
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
