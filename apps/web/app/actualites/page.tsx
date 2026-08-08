import type { Metadata } from 'next'

import { getNews } from '@zenith/data'
import { EmptyState } from '@zenith/ui'

import { fr } from '@/content/fr'

// Les actualités se renouvellent plus vite que les cours : régénération à 3 minutes,
// alignée sur le TTL propre au fil (`NEWS_TTL_SECONDS`).
export const revalidate = 180

export const metadata: Metadata = {
  title: fr.pages.news,
  description: fr.news.subtitle,
}

export default async function NewsPage() {
  const news = await getNews(30)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.news.title}</h1>
        <p className="text-sm text-ink-muted">{fr.news.subtitle}</p>
      </header>

      {news.ok && news.data.length > 0 ? (
        <>
          <ul className="space-y-3">
            {news.data.map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  // `nofollow` : on cite des articles tiers sans leur transmettre
                  // d'autorité de référencement, et sans se faire passer pour leur
                  // éditeur (§8, positionnement d'agrégateur).
                  rel="noopener noreferrer nofollow"
                  className="group block rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-brand/40"
                >
                  <h2 className="text-sm font-medium leading-snug text-ink group-hover:text-brand-strong">
                    {item.title}
                  </h2>
                  {item.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                      {item.excerpt}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[0.6875rem] text-ink-muted">
                    {item.source} · <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>{' '}
                    · {fr.news.readOn(item.source)}
                  </p>
                </a>
              </li>
            ))}
          </ul>

          <p className="text-xs text-ink-muted">
            Agrégé depuis les flux publics de {news.source.label}. ZENITH ne republie
            aucun article : les liens ouvrent la page de l’éditeur d’origine.
          </p>
        </>
      ) : (
        <EmptyState
          title={fr.news.unavailable}
          description={news.ok ? null : news.reason}
          source={news.source?.label ?? null}
        />
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}
