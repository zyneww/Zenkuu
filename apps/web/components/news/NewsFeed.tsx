'use client'

import { ArrowUpRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { NEWS_CATEGORY_LABELS, type NewsItem } from '@zenith/data'
import { EmptyState } from '@zenith/ui'

/**
 * Fil d'actualités : rubriques, sources, recherche, vignettes.
 *
 * Disposition VOLONTAIREMENT DIFFÉRENTE de la référence, qui aligne une liste
 * uniforme de rangées « vignette à gauche, texte à droite ». Ici : un article en
 * tête sur deux colonnes, une grille de cartes à vignette haute, puis le reste en
 * liste compacte SANS vignette. La dégressivité est le propos — tout ne mérite pas
 * le même poids, et une liste de trente rangées identiques ne hiérarchise rien.
 *
 * VIGNETTES : hébergées par l'éditeur, jamais recopiées. Elles proviennent des
 * balises `media:content` et `enclosure` que les flux publient PRÉCISÉMENT pour être
 * reprises par les agrégateurs — c'est la fonction de ces balises. Deux précautions
 * accompagnent l'affichage : `referrerPolicy="no-referrer"`, qui empêche l'éditeur
 * de savoir depuis quelle page l'image est chargée, et `loading="lazy"`, qui évite
 * de déclencher trente requêtes tierces au premier rendu.
 *
 * Aucun texte intégral n'est repris : titre, extrait fourni par le flux, source et
 * date, avec lien sortant. La syndication autorise l'annonce, pas la reprise.
 */

const GRID_SIZE = 6

export function NewsFeed({ articles }: { articles: NewsItem[] }) {
  const [category, setCategory] = useState<string>('all')
  const [source, setSource] = useState<string>('all')
  const [query, setQuery] = useState('')

  // Seules les rubriques et sources réellement présentes dans le lot sont
  // proposées : un filtre qui ne renverrait jamais rien vaut moins qu'un filtre absent.
  const categories = useMemo(
    () => [
      ...new Set(
        articles
          .map((article) => article.category)
          .filter((value): value is string => Boolean(value)),
      ),
    ],
    [articles],
  )

  const sources = useMemo(
    () => [...new Set(articles.map((article) => article.source))].sort(),
    [articles],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return articles.filter((article) => {
      if (category !== 'all' && article.category !== category) return false
      if (source !== 'all' && article.source !== source) return false
      if (!needle) return true
      return `${article.title} ${article.excerpt ?? ''}`.toLowerCase().includes(needle)
    })
  }, [articles, category, source, query])

  const [featured, ...rest] = visible
  const grid = rest.slice(0, GRID_SIZE)
  const list = rest.slice(GRID_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {categories.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rubriques">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="Tout" />
            {categories.map((entry) => (
              <FilterChip
                key={entry}
                active={category === entry}
                onClick={() => setCategory(entry)}
                label={NEWS_CATEGORY_LABELS[entry as keyof typeof NEWS_CATEGORY_LABELS] ?? entry}
              />
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {sources.length > 1 ? (
            <>
              <label htmlFor="filtre-source" className="sr-only">
                Filtrer par source
              </label>
              <select
                id="filtre-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="rounded-card border border-border-subtle bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="all">Toutes les sources</option>
                {sources.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <div className="relative w-full sm:w-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher dans les actualités"
              className="w-full rounded-card border border-border-subtle bg-surface py-2 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-muted" aria-live="polite">
        {visible.length} article{visible.length > 1 ? 's' : ''}
      </p>

      {!featured ? (
        <EmptyState
          title="Aucun article ne correspond"
          description="Essayez un autre terme, une autre rubrique ou une autre source."
          compact
        />
      ) : (
        <>
          <FeaturedArticle article={featured} />

          {grid.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          ) : null}

          {list.length > 0 ? (
            <section className="space-y-3" aria-labelledby="suite-titre">
              <h2 id="suite-titre" className="display-sm text-ink">
                Plus d’actualités
              </h2>
              <ul className="divide-y divide-border-subtle">
                {list.map((article) => (
                  <li key={article.id}>
                    <CompactRow article={article} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

function FeaturedArticle({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group grid gap-5 rounded-card border border-border-subtle bg-surface p-5 transition-colors hover:border-brand sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:items-center"
    >
      {article.imageUrl ? <Thumbnail url={article.imageUrl} tall /> : null}

      <div className="min-w-0 space-y-2">
        <ArticleMeta article={article} />
        <h2 className="text-xl font-semibold leading-snug text-ink group-hover:text-brand-strong">
          {article.title}
        </h2>
        {article.excerpt ? (
          <p className="text-sm leading-relaxed text-ink-muted">{article.excerpt}</p>
        ) : null}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
          Lire chez {article.source}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(nouvelle fenêtre)</span>
        </span>
      </div>
    </a>
  )
}

function ArticleCard({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-surface transition-colors hover:border-brand"
    >
      {article.imageUrl ? <Thumbnail url={article.imageUrl} /> : null}

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <ArticleMeta article={article} />
        <h3 className="text-sm font-semibold leading-snug text-ink group-hover:text-brand-strong">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-ink-muted">{article.excerpt}</p>
        ) : null}
      </div>
    </a>
  )
}

function CompactRow({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex flex-col gap-1 py-3 transition-opacity hover:opacity-80"
    >
      <ArticleMeta article={article} />
      <span className="text-sm font-medium leading-snug text-ink group-hover:text-brand-strong">
        {article.title}
      </span>
    </a>
  )
}

/**
 * Vignette d'article.
 *
 * `<img>` natif et non `next/image` : l'optimiseur exigerait de déclarer chaque
 * domaine d'éditeur dans la configuration, et la liste changerait à chaque flux
 * ajouté. Le rapport 16/9 est imposé par le conteneur pour que la grille reste
 * alignée quelles que soient les dimensions d'origine.
 */
function Thumbnail({ url, tall = false }: { url: string; tall?: boolean }) {
  return (
    <span
      className={`block shrink-0 overflow-hidden bg-surface-muted ${
        tall ? 'aspect-[16/10] rounded-card' : 'aspect-[16/9]'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- vignettes distantes, domaines variables */}
      <img
        src={url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
    </span>
  )
}

function ArticleMeta({ article }: { article: NewsItem }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-ink-muted">
      {article.category ? (
        <span className="font-medium text-brand">
          {NEWS_CATEGORY_LABELS[article.category as keyof typeof NEWS_CATEGORY_LABELS] ??
            article.category}
        </span>
      ) : null}
      <span>{article.source}</span>
      {article.author ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="truncate">{article.author}</span>
        </>
      ) : null}
      <span aria-hidden="true">·</span>
      <time dateTime={article.publishedAt} title={formatAbsolute(article.publishedAt)}>
        {formatRelative(article.publishedAt)}
      </time>
    </p>
  )
}

/**
 * Ancienneté relative — « il y a 2 h ».
 *
 * Sur un fil d'actualité, c'est la fraîcheur qui compte, pas l'horodatage : « il y a
 * 2 h » se saisit sans calcul mental, « 14:32 » demande de connaître l'heure qu'il
 * est. La date absolue reste accessible en infobulle et dans `dateTime`, pour qui
 * veut la précision.
 *
 * Calculé côté CLIENT uniquement : rendu sur le serveur, ce libellé serait figé à
 * l'instant de la génération de la page et vieillirait en silence. Le composant qui
 * l'appelle porte donc `'use client'`.
 */
function formatRelative(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`

  const days = Math.round(hours / 24)
  if (days < 7) return `il y a ${days} j`

  return formatAbsolute(iso)
}

function formatAbsolute(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
