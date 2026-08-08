/**
 * Agrégation d'actualités depuis des flux RSS publics.
 *
 * Pourquoi du RSS plutôt qu'une API d'actualités ? Parce que toutes celles testées
 * exigent désormais une clé : `/news` de CoinGecko renvoie 401 sur le palier gratuit,
 * CryptoCompare aussi, et NewsData.io plafonne bas. Le RSS, lui, est publié par les
 * éditeurs POUR être syndiqué : c'est gratuit, stable depuis vingt ans, et sans quota.
 *
 * On n'affiche que titre, extrait, source et horodatage, avec un lien sortant vers
 * l'article d'origine. On ne republie jamais le texte intégral : la syndication
 * autorise l'annonce, pas la reprise.
 */

import { createHttpClient } from '../http'
import type { NewsItem } from '../types'
import { ProviderError } from '../types'

interface FeedSource {
  id: string
  label: string
  url: string
}

const FEEDS: FeedSource[] = [
  { id: 'cointelegraph', label: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { id: 'coindesk', label: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
]

const http = createHttpClient({
  providerId: 'rss-news',
  // Les flux vivent sur des domaines différents : on passe l'URL absolue à chaque appel.
  baseUrl: 'https://example.invalid',
  maxRequestsPerWindow: 20,
  minIntervalMs: 200,
  timeoutMs: 12_000,
  headers: {
    Accept: 'application/rss+xml, application/xml, text/xml',
    'User-Agent': 'ZenithBot/1.0 (+https://zenith.example; agrégateur RSS)',
  },
})

/**
 * Extraction du premier contenu d'une balise.
 *
 * Un vrai parseur XML serait plus robuste, mais ajouterait une dépendance pour lire
 * cinq champs dans un format très stable. Le compromis est explicite : si un flux
 * change de forme au point de casser ces expressions, l'article est simplement
 * ignoré — jamais rendu à moitié.
 */
function extractTag(xml: string, tag: string): string | undefined {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'),
  )
  if (!match?.[1]) return undefined

  return decodeEntities(
    match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim(),
  )
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;|&#8221;|&rdquo;/g, '"')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, '’')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseFeed(xml: string, source: FeedSource): NewsItem[] {
  const items: NewsItem[] = []
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? []

  for (const block of blocks) {
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link') ?? extractTag(block, 'guid')
    if (!title || !link || !link.startsWith('http')) continue

    const published = extractTag(block, 'pubDate') ?? extractTag(block, 'dc:date')
    const parsed = published ? new Date(published) : null

    const item: NewsItem = {
      id: `${source.id}:${link}`,
      title,
      url: link,
      source: source.label,
      publishedAt:
        parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString(),
    }

    const description = extractTag(block, 'description')
    if (description) {
      item.excerpt = description.length > 220 ? `${description.slice(0, 217)}…` : description
    }

    items.push(item)
  }

  return items
}

export async function fetchNews(limit = 12): Promise<NewsItem[]> {
  // Un éditeur en panne ne doit pas vider tout le fil : on garde ce qui répond.
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const xml = await http.getText(feed.url)
      return parseFeed(xml, feed)
    }),
  )

  const articles = results
    .filter((outcome): outcome is PromiseFulfilledResult<NewsItem[]> => outcome.status === 'fulfilled')
    .flatMap((outcome) => outcome.value)

  if (articles.length === 0) {
    throw new ProviderError('rss-news', 'Aucun flux d’actualités n’a répondu', { retryable: true })
  }

  // Entrelacement chronologique : sans tri global, le fil afficherait tout
  // Cointelegraph puis tout CoinDesk, ce qui ne se lit pas comme une actualité.
  return articles
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit)
}

export const NEWS_SOURCES = FEEDS.map((feed) => feed.label).join(', ')
