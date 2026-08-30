import type { Metadata } from 'next'

import {
  NEWS_CATEGORY_LABELS,
  getNews,
  type NewsCategory,
  type NewsItem,
} from '@zenkuu/data'
import { listNewsBetween } from '@zenkuu/db'
import { EmptyState } from '@zenkuu/ui'

import { RelativeTime } from '@/components/home/RelativeTime'
import { Thumbnail } from '@/components/news/NewsFeed'
import { Link } from '@/i18n/navigation'
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
 * ══════════════════════════════════════════════════════════════════════════════
 * FIL D'ACTUALITÉS — UNE, PUIS UNE SECTION PAR RUBRIQUE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LA COMPOSITION EST CELLE DE cryptoradar.com/guide ───────────────────────
 *
 * Titre de page, un article de une flanqué de trois brèves, puis une bande par
 * rubrique — en-tête à gauche, « Tout voir » à droite, rangée de cartes en dessous —
 * et enfin la totalité du fil en grille.
 *
 * ── CE QUE CETTE REFONTE REMPLACE ───────────────────────────────────────────
 *
 * La page montait `NewsFeed`, un composant client à filtres (rubrique, langue, source,
 * actif mentionné) doublé d'une colonne « les plus cités aujourd'hui ». Deux choses
 * disparaissent donc ici, et il faut le dire clairement :
 *
 *   · LA COLONNE DES PLUS CITÉS. Elle exigeait cinq lectures d'univers de marché à
 *     chaque rendu — l'univers crypto plus quatre classements — pour alimenter des
 *     pastilles de variation. La maquette reprise n'a pas de colonne latérale.
 *   · LES FILTRES EN BARRE. Ils sont remplacés par les rubriques elles-mêmes : chaque
 *     bande porte son « Tout voir », qui ouvre `?rubrique=…` — la même sélection, mais
 *     à une adresse partageable, indexable, et lisible sans JavaScript.
 *
 * `NewsFeed` n'est PAS supprimé : la fiche d'actif s'en sert toujours pour son propre
 * fil (`AssetNewsPanel`), avec le filtre par mention qui n'a de sens que là-bas.
 *
 * ── LES RUBRIQUES SONT RÉELLES ──────────────────────────────────────────────
 *
 * Elles proviennent du périmètre éditorial de chaque FLUX, jamais d'une devinette sur
 * le titre — voir `NEWS_CATEGORY_LABELS`, qui explique pourquoi elles s'appellent
 * « Presse crypto » et non « Cryptomonnaies ».
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

/**
 * Lecture défensive du paramètre de rubrique.
 *
 * Il est saisissable à la main comme la date, et il sert à SÉLECTIONNER des articles :
 * une valeur inconnue doit retomber sur le fil entier, jamais produire une page vide
 * qui laisserait croire que la rubrique existe et n'a rien publié.
 */
function readCategory(raw: string | string[] | undefined): NewsCategory | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return null

  return value in NEWS_CATEGORY_LABELS ? (value as NewsCategory) : null
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const fr = await getContent()
  const t = await getPhrase()

  const params = await searchParams
  const requestedDate = readDate(params['date'])
  const requestedCategory = readCategory(params['rubrique'])

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
   * une bonne moitié des sources n'apparaissait jamais, et les rubriques ne
   * proposaient qu'elles. 72 garantit près de trois tours complets, donc toutes les
   * sources représentées et des bandes qui portent sur un fil réel.
   */
  const news = requestedDate ? null : await getNews(72)
  const articles = archive ? archive.articles : news?.ok ? news.data : []

  if (articles.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeading title={fr.news.title} subtitle={fr.news.subtitle} />

        <EmptyState
          title={requestedDate ? 'Aucune actualité ce jour-là' : fr.states.unavailableTitle}
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
      </div>
    )
  }

  /*
   * ── UNE RUBRIQUE DEMANDÉE REND UNE PAGE, PAS UN FIL FILTRÉ ────────────────
   *
   * `?rubrique=crypto` sert la grille de cette seule rubrique, sous son propre titre.
   * C'est la destination des « Tout voir » des bandes ci-dessous : une adresse, un
   * titre, un contenu — donc partageable et indexable, ce qu'un filtre tenu en état
   * React n'est jamais.
   */
  if (requestedCategory) {
    const selection = articles.filter((article) => article.category === requestedCategory)

    return (
      <div className="space-y-8">
        <PageHeading
          title={NEWS_CATEGORY_LABELS[requestedCategory]}
          subtitle={fr.news.subtitle}
        />

        <p>
          <Link
            href="/actualites"
            className="text-sm font-medium text-ink transition-colors duration-150 hover:text-brand"
          >
            ← {t('Toutes les rubriques')}
          </Link>
        </p>

        {selection.length > 0 ? (
          <ArticleGrid articles={selection} />
        ) : (
          <EmptyState
            title={t('Aucun article dans cette rubrique pour l’instant')}
            description={t(
              'Le fil est reconstitué toutes les trois minutes à partir des flux des éditeurs. Cette rubrique n’a rien publié dans le lot courant.',
            )}
            tone="neutral"
          />
        )}

        <Attribution note={t(ATTRIBUTION)} />
      </div>
    )
  }

  const [lead, ...rest] = articles
  const asides = rest.slice(0, 3)

  /*
   * Les bandes suivent l'ORDRE DES RUBRIQUES DÉCLARÉES, et non celui d'apparition
   * dans le lot : sans cela, la page changerait de plan toutes les trois minutes au
   * gré des publications, et le lecteur ne retrouverait pas la bande qu'il lisait.
   *
   * Une rubrique sans article dans le lot courant ne produit PAS de bande vide.
   */
  const sections = (Object.keys(NEWS_CATEGORY_LABELS) as NewsCategory[])
    .map((category) => ({
      category,
      label: NEWS_CATEGORY_LABELS[category],
      articles: articles.filter((article) => article.category === category),
    }))
    .filter((section) => section.articles.length > 0)

  return (
    <div className="space-y-12">
      <PageHeading title={fr.news.title} subtitle={fr.news.subtitle} />

      {/* ── LA UNE ────────────────────────────────────────────────────────
          Un article large à gauche, trois brèves à droite. Le rapport de colonnes
          (3/2) est celui de la référence : la couverture de la une doit rester
          nettement plus grande que les vignettes qui l'accompagnent, sinon les
          quatre articles se lisent comme quatre égaux et la hiérarchie disparaît. */}
      {lead ? (
        <section className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <LeadArticle article={lead} />

          <div className="flex flex-col divide-y divide-border-subtle">
            {asides.map((article) => (
              <AsideArticle key={article.id} article={article} />
            ))}
          </div>
        </section>
      ) : null}

      {sections.map((section) => (
        <CategoryRow
          key={section.category}
          label={section.label}
          href={`/actualites?rubrique=${section.category}`}
          seeAll={t('Tout voir')}
          articles={section.articles.slice(0, 8)}
        />
      ))}

      <section className="space-y-5">
        <SectionHeading label={t('Toutes les actualités')} />
        <ArticleGrid articles={rest} />
      </section>

      <Attribution note={t(ATTRIBUTION)} />
    </div>
  )
}

/**
 * Mention légale du fil, identique sur les deux vues.
 *
 * Elle n'est pas décorative : ZENKUU republie des TITRES et renvoie vers les articles.
 * L'écrire est ce qui distingue une revue de presse d'une reprise de contenu.
 */
const ATTRIBUTION =
  'ZENKUU agrège des titres publiés par des éditeurs tiers et renvoie vers leurs articles. Aucun texte intégral n’est republié, et ZENKUU n’est l’auteur d’aucun de ces contenus.'

function Attribution({ note }: { note: string }) {
  return <p className="text-[0.6875rem] leading-relaxed text-ink-muted">{note}</p>
}

/**
 * Titre de page, CENTRÉ comme sur la référence.
 *
 * Le centrage est le seul endroit où cette page s'écarte de la composition du reste
 * du site, qui aligne ses titres à gauche. Il est repris tel quel : c'est ce qui
 * annonce une page à LIRE plutôt qu'un tableau de bord à consulter, et la bascule est
 * immédiate à l'œil.
 */
function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="space-y-3 text-center">
      <h1 className="display-lg text-ink">{title}</h1>
      <p className="mx-auto max-w-2xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>
    </header>
  )
}

/** En-tête d'une bande : le nom à gauche, et rien d'autre quand il n'y a pas de suite. */
function SectionHeading({
  label,
  href,
  seeAll,
}: {
  label: string
  href?: string
  seeAll?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{label}</h2>

      {href && seeAll ? (
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-ink transition-colors duration-150 hover:text-brand"
        >
          {seeAll} →
        </Link>
      ) : null}
    </div>
  )
}

/**
 * Une bande de rubrique : en-tête, puis une rangée de cartes qui DÉFILE.
 *
 * ── POURQUOI UN DÉFILEMENT HORIZONTAL ET NON UNE GRILLE QUI RETOURNE ────────
 *
 * C'est la référence, et le motif tient : une bande est un ÉCHANTILLON de sa
 * rubrique, pas son inventaire. Une grille qui retourne à la ligne dit « voici
 * tout », et pousse la bande suivante hors de l'écran ; une rangée qui déborde dit
 * « il y en a d'autres », et la page garde son plan lisible d'un coup d'œil.
 *
 * L'inventaire, lui, est à un clic : c'est le « Tout voir » de l'en-tête.
 *
 * `snap-x` aligne l'arrêt du défilement sur le bord des cartes, pour qu'on ne
 * s'arrête jamais au milieu d'une image.
 */
function CategoryRow({
  label,
  href,
  seeAll,
  articles,
}: {
  label: string
  href: string
  seeAll: string
  articles: NewsItem[]
}) {
  return (
    <section className="space-y-5">
      <SectionHeading label={label} href={href} seeAll={seeAll} />

      {/* `-mx-4 px-4` : la rangée déborde jusqu'aux bords de la coquille au lieu de
          s'arrêter net sur sa marge, ce qui montre qu'elle continue. */}
      <ul className="thin-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2">
        {articles.map((article) => (
          <li key={article.id} className="w-[280px] shrink-0 snap-start sm:w-[300px]">
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** La grille complète — quatre cartes par rangée au plus large, une sur téléphone. */
function ArticleGrid({ articles }: { articles: NewsItem[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Étiquettes d'un article : sa rubrique, puis son éditeur.
 *
 * Les deux, et dans cet ordre, parce qu'elles ne disent pas la même chose : la
 * rubrique dit d'où vient le FLUX, l'éditeur dit qui a écrit. La référence n'affiche
 * que des rubriques — elle publie ses propres articles et n'a personne d'autre à
 * créditer. Ici, le nom de l'éditeur est ce qui rend l'étiquette de rubrique honnête.
 */
function Badges({ article }: { article: NewsItem }) {
  const category = article.category as NewsCategory | undefined
  const label = category && category in NEWS_CATEGORY_LABELS ? NEWS_CATEGORY_LABELS[category] : null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label ? (
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-medium text-brand-strong">
          {label}
        </span>
      ) : null}
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[0.6875rem] font-medium text-ink-muted">
        {article.source}
      </span>
    </div>
  )
}

/**
 * La date d'un article, en ÂGE relatif.
 *
 * La référence affiche « May 11, 2026 » : ses articles sont des guides intemporels,
 * publiés sur plusieurs années. Un fil d'actualités est l'inverse — la quasi-totalité
 * du lot date du jour, et douze cartes portant la même date ne renseignent personne.
 * `RelativeTime` répond à la question qu'on se pose ici, « est-ce récent », et garde
 * la date exacte dans son attribut `dateTime`, au survol et pour la synthèse vocale.
 */
function PublishedAt({ iso }: { iso: string }) {
  return (
    <span className="text-xs text-ink-muted">
      <RelativeTime iso={iso} />
    </span>
  )
}

/** L'article de une : grande couverture, titre en gros, extrait entier. */
function LeadArticle({ article }: { article: NewsItem }) {
  return (
    <article>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block space-y-4"
      >
        <Thumbnail url={article.imageUrl ?? ''} source={article.source} wide />

        <div className="space-y-3">
          <Badges article={article} />

          <h2 className="text-2xl font-bold leading-tight tracking-tight text-ink transition-colors duration-150 group-hover:text-brand">
            {article.title}
          </h2>

          {article.excerpt ? (
            <p className="line-clamp-4 text-sm leading-relaxed text-ink-muted">{article.excerpt}</p>
          ) : null}

          <PublishedAt iso={article.publishedAt} />
        </div>
      </a>
    </article>
  )
}

/** Une brève de la colonne de droite : vignette à gauche, texte à droite. */
function AsideArticle({ article }: { article: NewsItem }) {
  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="group flex gap-4">
        <span className="w-28 shrink-0">
          <Thumbnail url={article.imageUrl ?? ''} source={article.source} />
        </span>

        <span className="min-w-0 flex-1 space-y-1.5">
          <Badges article={article} />

          <span className="block text-sm font-semibold leading-snug text-ink transition-colors duration-150 group-hover:text-brand">
            {article.title}
          </span>

          {article.excerpt ? (
            <span className="line-clamp-2 block text-xs leading-relaxed text-ink-muted">
              {article.excerpt}
            </span>
          ) : null}

          <PublishedAt iso={article.publishedAt} />
        </span>
      </a>
    </article>
  )
}

/**
 * La carte d'article — couverture, étiquette, titre, extrait, date.
 *
 * `h-full` et la colonne flexible : dans une grille, deux cartes voisines dont les
 * titres n'ont pas le même nombre de lignes doivent quand même finir à la même
 * hauteur, sinon les dates dansent d'une colonne à l'autre. La date est poussée en
 * pied par `mt-auto`.
 */
function ArticleCard({ article }: { article: NewsItem }) {
  return (
    <article className="h-full">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-full flex-col gap-3 rounded-card border border-border-subtle bg-panel p-3 transition-colors duration-150 hover:border-brand/40"
      >
        <Thumbnail url={article.imageUrl ?? ''} source={article.source} />

        <Badges article={article} />

        <h3 className="line-clamp-3 text-sm font-semibold leading-snug text-ink transition-colors duration-150 group-hover:text-brand">
          {article.title}
        </h3>

        {article.excerpt ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-ink-muted">{article.excerpt}</p>
        ) : null}

        <span className="mt-auto">
          <PublishedAt iso={article.publishedAt} />
        </span>
      </a>
    </article>
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
