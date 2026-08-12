import { NextResponse, type NextRequest } from 'next/server'

import { getNews } from '@zenkuu/data'
import { DB_ENABLED, NEWS_RETENTION_DAYS, archiveNews, purgeOldNews } from '@zenkuu/db'

/**
 * Tâche planifiée — archivage du fil d'actualités.
 *
 * ── POURQUOI UNE TÂCHE, ET PAS UNE ÉCRITURE AU RENDU ──────────────────────────
 *
 * Un flux RSS ne publie que ses ~30 derniers articles : ce qui en sort est perdu pour
 * quiconque ne l'a pas conservé. Le calendrier du fil ne peut donc exister sans une
 * collecte RÉGULIÈRE, indépendante des visites — un site peu fréquenté un dimanche
 * perdrait le dimanche.
 *
 * Écrire depuis le rendu d'une page aurait paru plus simple et aurait été faux à deux
 * titres : le rendu est mis en cache (donc n'a pas lieu à chaque visite), et il doit
 * rester en lecture seule pour être mis en cache sans effet de bord.
 *
 * ── CE QUE LA ROUTE NE FAIT PAS ───────────────────────────────────────────────
 *
 * Elle ne rattrape pas le passé. Un article publié pendant une interruption de la
 * tâche est définitivement perdu s'il est sorti de la fenêtre du flux entre-temps.
 * C'est une limite de la source, pas de cette route : aucune API gratuite ne permet
 * de rejouer l'historique d'un flux RSS.
 */

// La route lit une en-tête d'autorisation et écrit en base : aucun rendu statique
// possible, et Next.js doit le savoir.
export const dynamic = 'force-dynamic'

/** Marge confortable sous la limite d'exécution d'une tâche planifiée. */
export const maxDuration = 60

/**
 * Taille du lot collecté.
 *
 * Nettement plus large que ce que la page affiche : la tâche n'a pas à ménager le
 * lecteur, elle a à capturer tout ce que les vingt-neuf flux portent avant que leur
 * fenêtre ne l'évacue. Ce qui est déjà connu est écarté par l'index unique, à coût
 * quasi nul.
 */
const BATCH_SIZE = 200

export async function GET(request: NextRequest) {
  /*
   * REFUS PAR DÉFAUT, et non autorisation par défaut.
   *
   * Sans secret configuré, la route est FERMÉE plutôt qu'ouverte. Le raisonnement est
   * celui de `/api/cron/alertes` : une route ouverte permettrait à n'importe qui de
   * déclencher vingt-neuf requêtes sortantes et autant d'écritures, à volonté.
   */
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      { ok: false, reason: 'CRON_SECRET absent : la route est fermée.' },
      { status: 503 },
    )
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: 'Non autorisé.' }, { status: 401 })
  }

  if (!DB_ENABLED) {
    return NextResponse.json(
      { ok: false, reason: 'Base non configurée : rien à archiver.' },
      { status: 503 },
    )
  }

  const news = await getNews(BATCH_SIZE)

  const rows = news.ok
    ? news.data.map((item) => ({
        url: item.url,
        title: item.title,
        excerpt: item.excerpt ?? null,
        imageUrl: item.imageUrl ?? null,
        /* L'identifiant d'un article est préfixé du flux (`coindesk:https://…`) —
           voir `parseFeed`. On en récupère le préfixe, stable là où le libellé
           affiché peut être renommé. */
        sourceId: item.id.split(':')[0] ?? 'inconnu',
        sourceLabel: item.source,
        category: item.category ?? 'economie',
        lang: item.lang ?? 'en',
        author: item.author ?? null,
        publishedAt: new Date(item.publishedAt),
      }))
    : []

  const inserted = await archiveNews(rows)

  /* La purge suit la collecte dans le même passage : une tâche séparée serait une
     planification de plus à configurer et à surveiller, pour une opération qui dure
     quelques millisecondes. */
  const purged = await purgeOldNews()

  return NextResponse.json({
    ok: true,
    collectes: rows.length,
    nouveaux: inserted,
    purges: purged,
    retentionJours: NEWS_RETENTION_DAYS,
    // Une collecte qui ne rapporte rien de neuf est NORMALE (rien n'a été publié
    // depuis le dernier passage) ; une collecte à zéro article rapporté ne l'est pas.
    ...(news.ok ? {} : { avertissement: news.reason }),
  })
}
