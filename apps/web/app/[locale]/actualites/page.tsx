import type { Metadata } from 'next'

import { getMoversUniverse, getNews, type NewsItem } from '@zenkuu/data'
import { DB_ENABLED, listNewsBetween, newsArchiveReady, oldestNewsDate } from '@zenkuu/db'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { NewsDatePicker } from '@/components/news/NewsDatePicker'
import { NewsFeed } from '@/components/news/NewsFeed'
import { getContent, getPhrase } from '@/lib/content'

// Les actualités se renouvellent plus vite que les cours : régénération à 3 minutes,
// alignée sur le TTL propre au fil (`NEWS_TTL_SECONDS`).
export const revalidate = 180

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  title: fr.pages.news,
  description: fr.news.subtitle,
  alternates: { canonical: '/actualites' },
  }
}

/**
 * Fil d'actualités.
 *
 * Refonte : la page servait une liste plate de liens, tous de même poids, et ne
 * couvrait que la crypto alors que le site suit six classes d'actifs. Elle suit
 * désormais l'organisation d'un hub d'actualités — un article en tête, des filtres
 * de rubrique, puis une grille de cartes.
 *
 * Les rubriques sont RÉELLES : elles proviennent du périmètre éditorial de chaque
 * flux, pas d'une devinette sur le titre de l'article. Deux flux non-crypto ont été
 * ajoutés pour que ces filtres aient un sens.
 */
/** Lecture défensive du paramètre de date : il est saisissable à la main dans l'URL. */
function readDate(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null

  // Une date à venir n'a pas d'articles et ne peut pas en avoir : on retombe sur le
  // direct plutôt que d'afficher un jour vide inexplicable.
  return parsed > new Date() ? null : value
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const fr = await getContent()
  const t = await getPhrase()
  const requestedDate = readDate((await searchParams)['date'])

  /*
   * DEUX SOURCES, selon la date demandée.
   *
   * Aujourd'hui vient des flux en DIRECT : c'est plus frais que l'archive, dont la
   * dernière collecte peut remonter à une heure. Toute date antérieure vient de la
   * BASE, car les flux ne portent plus ces articles — c'est précisément la raison
   * d'être de l'archive.
   */
  const archive = requestedDate ? await readArchivedDay(requestedDate) : null

  /*
   * 72 et non 36, relevé EN MÊME TEMPS que la liste des flux passait de 4 à 29.
   *
   * La fusion se fait tour à tour — un article de chaque flux, puis le deuxième de
   * chacun (voir `fetchNews`). À 36, le lot s'arrêtait donc au premier tour et demi :
   * une bonne moitié des sources n'apparaissait jamais, et les filtres par source ne
   * proposaient qu'elles. 72 garantit près de trois tours complets, donc toutes les
   * sources représentées et des filtres qui portent sur un fil réel.
   */
  /*
   * L'UNIVERS EST CHARGÉ EN PARALLÈLE, POUR LES PASTILLES D'ACTIF.
   *
   * Chaque article porte la variation des actifs qu'il cite — c'est le meilleur trait
   * de la référence : un titre dit ce qui s'est passé, la pastille dit si le marché y
   * a réagi. Sans elle, la réponse est à deux clics et personne ne la cherche.
   *
   * ZÉRO APPEL SUPPLÉMENTAIRE : `getMoversUniverse(250)` est déjà chargé pour
   * l'accueil, le convertisseur, les mouvements et les cotations récentes. Il est ici
   * la cinquième lecture de la même entrée de cache.
   */
  const [news, universe] = await Promise.all([
    requestedDate ? Promise.resolve(null) : getNews(72),
    getMoversUniverse(250, 'eur'),
  ])

  /*
   * Table `identifiant → variation 24 h`, réduite aux actifs que les pastilles savent
   * nommer. La construire ici plutôt que de passer l'univers entier au composant
   * client évite d'expédier 250 objets complets dans le paquet de la page pour en lire
   * neuf nombres.
   */
  const quotes: Record<string, number> = {}
  if (universe.ok) {
    for (const asset of universe.data) {
      if (asset.change24h !== undefined) quotes[asset.id] = asset.change24h
    }
  }

  const articles = archive ? archive.articles : (news?.ok ? news.data : [])
  const oldest = await archiveStart()

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <h1 className="display-xl text-ink">{fr.news.title}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{fr.news.subtitle}</p>
      </header>

      <NewsDatePicker
        {...(requestedDate ? { selected: requestedDate } : {})}
        {...(oldest.iso ? { oldestAvailable: oldest.iso } : {})}
        {...(oldest.reason ? { unavailableReason: oldest.reason } : {})}
      />

      {articles.length > 0 ? (
        <>
          <NewsFeed articles={articles} quotes={quotes} />

          <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
            {t(
              'ZENKUU agrège des titres publiés par des éditeurs tiers et renvoie vers leurs articles. Aucun texte intégral n’est republié, et ZENKUU n’est l’auteur d’aucun de ces contenus.',
            )}
          </p>

          {news?.source ? (
            <SourceNote label={news.source.label} href={news.source.attributionUrl} strings={{ source: t('Source :'), dated: t('données du {date}') }} />
          ) : null}
        </>
      ) : (
        <EmptyState
          title={
            requestedDate ? 'Aucune actualité ce jour-là' : fr.states.unavailableTitle
          }
          /*
           * Un jour d'archive vide N'EST PAS UNE PANNE, et le dire importe : c'est la
           * différence entre « le site est cassé » et « rien n'a été conservé ce
           * jour-là ». Le ton du bloc suit — neutre pour une date sans article,
           * avertissement pour une source qui ne répond pas.
           */
          description={
            requestedDate
              ? 'Aucun article n’a été archivé pour cette date. L’archive ne remonte pas avant la mise en service de la collecte.'
              : news && !news.ok
                ? news.reason
                : null
          }
          source={news?.source?.label ?? null}
          tone={requestedDate ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}

/**
 * Articles archivés pour un jour donné.
 *
 * Les bornes sont calculées en heure LOCALE DU SERVEUR et non en UTC. C'est un choix
 * assumé et imparfait : un lecteur à Tokyo qui demande le 10 verra le 10 parisien.
 * L'alternative — déduire son fuseau — exigerait de rendre la page côté client ou de
 * la sortir du cache, pour un décalage de quelques heures sur une frange d'articles.
 */
async function readArchivedDay(iso: string) {
  const from = new Date(`${iso}T00:00:00`)
  const to = new Date(from.getTime() + 86_400_000)

  const rows = await listNewsBetween(from, to, 200)

  return {
    articles: rows.map(
      (row): NewsItem => ({
        id: `archive:${row.id}`,
        title: row.title,
        url: row.url,
        source: row.sourceLabel,
        category: row.category,
        lang: row.lang,
        publishedAt: row.publishedAt.toISOString(),
        ...(row.excerpt ? { excerpt: row.excerpt } : {}),
        ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
        ...(row.author ? { author: row.author } : {}),
      }),
    ),
  }
}

/**
 * Bornes de l'archive, pour que le calendrier sache ce qu'il peut proposer.
 *
 * Trois états distincts, et chacun mérite son message : base absente, base présente
 * mais vide, base alimentée. Les confondre ferait dire « aucune actualité archivée »
 * là où la cause est « la base n'est pas configurée » — un lecteur ne peut rien faire
 * de la première information, un administrateur beaucoup de la seconde.
 */
async function archiveStart(): Promise<{ iso?: string; reason?: string }> {
  if (!DB_ENABLED) {
    return {
      reason:
        'Le calendrier demande une base de données, non configurée sur cette instance. Le fil du jour reste disponible.',
    }
  }

  /*
   * Base configurée ne veut pas dire schéma appliqué : ajouter une table au schéma
   * ne la crée pas, `bun run db:push` le fait. Distinguer les deux cas est ce qui
   * permet d'indiquer la commande à lancer, là où un message générique laisserait
   * chercher.
   */
  if (!(await newsArchiveReady())) {
    return {
      reason:
        'La table d’archive n’existe pas encore dans la base. Appliquez le schéma avec « bun run db:push » depuis packages/db. Le fil du jour reste disponible.',
    }
  }

  const oldest = await oldestNewsDate()
  if (!oldest) {
    return {
      reason:
        'L’archive est encore vide : elle se remplit à chaque passage de la collecte. Le fil du jour reste disponible.',
    }
  }

  const month = String(oldest.getMonth() + 1).padStart(2, '0')
  const day = String(oldest.getDate()).padStart(2, '0')
  return { iso: `${oldest.getFullYear()}-${month}-${day}` }
}
