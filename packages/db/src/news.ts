import { and, desc, gte, lt, sql } from 'drizzle-orm'

import { getDb } from './client'
import { newsArticles, type NewNewsArticle, type NewsArticle } from './schema'

/**
 * Archive des actualités — écriture par la tâche planifiée, lecture par le calendrier.
 *
 * Toutes les fonctions renvoient un résultat neutre quand la base n'est pas
 * configurée : liste vide, zéro inséré. C'est le même contrat que le reste du paquet
 * (§5) — l'appelant n'a pas à savoir si Turso existe, il constate simplement qu'il
 * n'y a rien à afficher, et l'interface le dit.
 */

/** Nombre de jours conservés. Au-delà, la tâche planifiée supprime. */
export const NEWS_RETENTION_DAYS = 90

/** L'archive est-elle prête à être lue ? Sert à l'interface, qui explique pourquoi non. */
export async function newsArchiveReady(): Promise<boolean> {
  return hasNewsTable()
}

/**
 * La table `news_articles` existe-t-elle vraiment ?
 *
 * ── POURQUOI CETTE QUESTION SE POSE ───────────────────────────────────────────
 *
 * `DB_ENABLED` dit qu'une base est CONFIGURÉE, pas qu'elle porte notre schéma. Les
 * deux se confondaient tant que le schéma ne bougeait pas ; ils se séparent dès
 * qu'une table est ajoutée, car appliquer une migration est un geste manuel
 * (`bun run db:push`) que rien n'oblige à faire avant de relancer le site.
 *
 * Le défaut a été observé : base connectée, table jamais créée, et la page
 * d'actualités tombait en erreur 500 — pour une fonctionnalité SECONDAIRE, alors que
 * le fil du jour, lui, n'avait besoin d'aucune base.
 *
 * Traiter l'absence de table comme une indisponibilité, et non comme une panne,
 * applique ici le principe du §5 : une brique non configurée se signale, elle ne
 * casse pas le reste.
 *
 * Le résultat est MÉMORISÉ par instance : une fois la réponse connue, la reposer à
 * chaque rendu coûterait une requête pour une information qui ne change qu'au
 * déploiement d'une migration.
 */
let tableExists: boolean | null = null

async function hasNewsTable(): Promise<boolean> {
  if (tableExists !== null) return tableExists

  const db = getDb()
  if (!db) {
    tableExists = false
    return false
  }

  try {
    /* On interroge le catalogue de SQLite plutôt que la table elle-même : un
       `select` sur une table absente lève, et distinguer cette erreur-là d'une panne
       réseau obligerait à analyser un message d'erreur — fragile par nature. */
    const rows = await db.all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' and name = 'news_articles'`,
    )
    tableExists = rows.length > 0
  } catch {
    // Base injoignable : on répond « pas de table » sans mémoriser, pour que la
    // question se repose au prochain appel plutôt que de rester fausse pour de bon.
    return false
  }

  return tableExists
}

/**
 * Normalise une URL pour servir de clé de déduplication.
 *
 * ── POURQUOI CE N'EST PAS FACULTATIF ──────────────────────────────────────────
 *
 * Le même article arrive avec des adresses différentes selon le flux qui le porte :
 * paramètres de campagne (`utm_source=rss`), identifiant de session, ancre de
 * partage. Comparées telles quelles, ces variantes sont autant d'articles distincts,
 * et le fil afficherait trois fois la même chose.
 *
 * Ce qui est retiré : les paramètres de suivi connus et le fragment. Ce qui est
 * CONSERVÉ : tous les autres paramètres, car ils peuvent porter l'identité de la page
 * — `?id=1234` distingue deux articles chez plus d'un éditeur, et les confondre en
 * perdrait un.
 */
const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_cid|mc_eid|ref$|source$|__twitter)/i

export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key)
    }
    // Barre oblique finale retirée : `/article` et `/article/` sont la même page,
    // et les éditeurs alternent entre les deux d'un flux à l'autre.
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.toString()
  } catch {
    return raw
  }
}

/**
 * Enregistre un lot d'articles, en ignorant ceux déjà connus.
 *
 * `onConflictDoNothing` plutôt qu'un `select` préalable : la vérification et
 * l'insertion seraient deux opérations séparées, et deux collectes simultanées
 * pourraient passer entre les deux. L'index unique tranche côté base, ce qui est le
 * seul endroit où la question puisse être tranchée sans course.
 *
 * Renvoie le nombre de lignes réellement insérées — utile au journal de la tâche,
 * qui distingue ainsi « rien de neuf » de « la collecte a échoué ».
 */
export async function archiveNews(items: NewNewsArticle[]): Promise<number> {
  const db = getDb()
  if (!db || items.length === 0) return 0
  if (!(await hasNewsTable())) return 0

  const rows = items.map((item) => ({ ...item, url: canonicalUrl(item.url) }))

  /* Dédoublonnage DANS LE LOT avant l'insertion : `onConflictDoNothing` gère les
     conflits avec les lignes existantes, mais SQLite refuse un lot qui se contredit
     lui-même — et un même article publié dans deux flux arrive bien deux fois. */
  const unique = new Map(rows.map((row) => [row.url, row]))

  const inserted = await db
    .insert(newsArticles)
    .values([...unique.values()])
    .onConflictDoNothing({ target: newsArticles.url })
    .returning({ id: newsArticles.id })

  return inserted.length
}

/**
 * Articles publiés un jour donné, du plus récent au plus ancien.
 *
 * Les bornes sont calculées par l'appelant et passées en `Date` : le fuseau est une
 * décision d'affichage, pas de stockage. Les calculer ici obligerait cette fonction à
 * connaître le fuseau du lecteur, qu'elle n'a aucun moyen de deviner.
 */
export async function listNewsBetween(from: Date, to: Date, limit = 100): Promise<NewsArticle[]> {
  const db = getDb()
  if (!db) return []
  if (!(await hasNewsTable())) return []

  return db
    .select()
    .from(newsArticles)
    .where(and(gte(newsArticles.publishedAt, from), lt(newsArticles.publishedAt, to)))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit)
}

/**
 * Date du plus ancien article conservé, ou `null` si l'archive est vide.
 *
 * L'interface en a besoin pour GRISER les dates antérieures dans le calendrier. Sans
 * cette borne, un lecteur choisirait une date d'avant la mise en service et
 * obtiendrait une page vide sans explication — ce qui se lit comme une panne.
 */
export async function oldestNewsDate(): Promise<Date | null> {
  const db = getDb()
  if (!db) return null
  if (!(await hasNewsTable())) return null

  const [row] = await db
    .select({ oldest: sql<number | null>`min(${newsArticles.publishedAt})` })
    .from(newsArticles)

  const value = row?.oldest
  if (value === null || value === undefined) return null

  /* Drizzle rend l'entier brut pour une fonction d'agrégat — le mode `timestamp` ne
     s'applique qu'aux colonnes sélectionnées telles quelles. Les timestamps SQLite
     sont en SECONDES. */
  return new Date(value * 1000)
}

/** Supprime les articles au-delà de la durée de conservation. Renvoie le compte. */
export async function purgeOldNews(retentionDays = NEWS_RETENTION_DAYS): Promise<number> {
  const db = getDb()
  if (!db) return 0
  if (!(await hasNewsTable())) return 0

  const cutoff = new Date(Date.now() - retentionDays * 86_400_000)
  const deleted = await db
    .delete(newsArticles)
    .where(lt(newsArticles.publishedAt, cutoff))
    .returning({ id: newsArticles.id })

  return deleted.length
}
