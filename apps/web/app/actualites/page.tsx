import type { Metadata } from 'next'

import { getNews } from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { NewsFeed } from '@/components/news/NewsFeed'
import { fr } from '@/content/fr'

// Les actualités se renouvellent plus vite que les cours : régénération à 3 minutes,
// alignée sur le TTL propre au fil (`NEWS_TTL_SECONDS`).
export const revalidate = 180

export const metadata: Metadata = {
  title: fr.pages.news,
  description: fr.news.subtitle,
  alternates: { canonical: '/actualites' },
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
export default async function NewsPage() {
  const news = await getNews(36)

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <h1 className="display-xl text-ink">{fr.news.title}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{fr.news.subtitle}</p>
      </header>

      {news.ok && news.data.length > 0 ? (
        <>
          <NewsFeed articles={news.data} />

          <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
            ZENITH agrège des titres publiés par des éditeurs tiers et renvoie vers
            leurs articles. Aucun texte intégral n’est republié, et ZENITH n’est
            l’auteur d’aucun de ces contenus.
          </p>

          <SourceNote label={news.source.label} href={news.source.attributionUrl} />
        </>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={news.ok ? null : news.reason}
          source={news.source?.label ?? null}
        />
      )}
    </div>
  )
}
