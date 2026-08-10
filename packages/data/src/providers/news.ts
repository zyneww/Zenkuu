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
  /**
   * Rubrique du flux.
   *
   * Elle est portée par le FLUX, pas déduite de l'article. C'est la différence entre
   * une catégorie vraie et une catégorie devinée : un flux « marchés actions » ne
   * publie que de l'actualité actions, tandis que deviner la rubrique en cherchant
   * des mots-clés dans un titre produirait des étiquettes fausses — donc de la
   * donnée inventée, que le §5 proscrit au même titre qu'un chiffre inventé.
   */
  category: NewsCategory
}

export type NewsCategory = 'crypto' | 'marches' | 'economie'

/** Libellés affichés — définis ici pour rester alignés sur les flux eux-mêmes. */
export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  crypto: 'Cryptomonnaies',
  marches: 'Marchés & entreprises',
  economie: 'Économie & macro',
}

const FEEDS: FeedSource[] = [
  {
    id: 'cointelegraph',
    label: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    category: 'crypto',
  },
  {
    id: 'coindesk',
    label: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    category: 'crypto',
  },
  // Flux non-crypto : jusqu'ici le fil ne couvrait que la crypto alors que le site
  // suit six classes d'actifs. Ces deux-là sont publics, sans clé et sans quota.
  {
    id: 'yahoo-finance',
    label: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/news/rssindex',
    category: 'marches',
  },
  {
    id: 'ft-economie',
    label: 'France Info éco',
    url: 'https://www.francetvinfo.fr/economie.rss',
    category: 'economie',
  },
]

const http = createHttpClient({
  providerId: 'rss-news',
  // Les flux vivent sur des domaines différents : on passe l'URL absolue à chaque appel.
  baseUrl: 'https://example.invalid',
  maxRequestsPerWindow: 20,
  minIntervalMs: 200,
  timeoutMs: 12_000,
  // Aligné sur le TTL du fil d'actualités, plus court que le défaut.
  revalidateSeconds: 180,
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

/**
 * Décodage des entités HTML d'un flux.
 *
 * Les entités NUMÉRIQUES sont traitées d'abord et de façon générique, décimales
 * (`&#8217;`) comme hexadécimales (`&#x2019;`). La liste nommée qui suit ne couvre
 * que ce qui n'a pas de forme numérique évidente.
 *
 * Le cas hexadécimal manquait, et le défaut était visible à l'écran : le flux de
 * France Info encode ses accents ainsi, et les titres s'affichaient « Face &#xE0; la
 * crise du logement ». Une liste d'entités énumérées à la main est condamnée à
 * rater celles qu'on n'a pas prévues — d'où la conversion par code de caractère.
 *
 * `&amp;` est décodé EN DERNIER, après les autres : le faire avant transformerait
 * « &amp;#233; » en « &#233; », qu'une passe ultérieure décoderait à tort en « é »
 * alors que le flux voulait écrire le texte littéral.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => safeCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;|&apos;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Caractère correspondant à un point de code, ou chaîne vide s'il est invalide.
 *
 * `String.fromCodePoint` LÈVE sur une valeur hors plage — un flux mal formé ferait
 * alors échouer l'analyse de tout le lot, et le fil entier disparaîtrait à cause
 * d'un caractère. On préfère perdre le caractère.
 */
function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ''
  try {
    return String.fromCodePoint(code)
  } catch {
    return ''
  }
}

/**
 * Vignette d'un article, extraite du flux.
 *
 * Trois emplacements possibles, essayés dans cet ordre parce qu'ils vont du plus
 * fiable au plus approximatif :
 *  1. `<media:content url="…">` — la convention Media RSS, celle de Cointelegraph ;
 *  2. `<enclosure url="…">` — la balise RSS 2.0 d'origine, encore très répandue ;
 *  3. le premier `<img src="…">` du corps HTML de la description.
 *
 * La troisième est un repli assumé : un flux met parfois un pixel de suivi en tête
 * de sa description, d'où le filtre sur l'extension d'image. Une URL non reconnue
 * est ignorée plutôt que rendue — une vignette cassée est pire qu'aucune vignette.
 */
function extractImage(block: string): string | undefined {
  const candidates = [
    block.match(/<media:content[^>]+url="([^"]+)"/i)?.[1],
    block.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image\//i)?.[1],
    block.match(/<enclosure[^>]+type="image\/[^"]*"[^>]*url="([^"]+)"/i)?.[1],
    block.match(/<img[^>]+src="([^"]+)"/i)?.[1],
  ]

  for (const candidate of candidates) {
    if (!candidate?.startsWith('http')) continue
    // Les URL sans extension d'image reconnaissable sont souvent des pixels de
    // suivi ou des redirections de comptage, pas des illustrations.
    if (!/\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(candidate)) continue
    return candidate.replace(/&amp;/g, '&')
  }

  return undefined
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
      category: source.category,
      publishedAt:
        parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString(),
    }

    const description = extractTag(block, 'description')
    if (description) {
      item.excerpt = description.length > 220 ? `${description.slice(0, 217)}…` : description
    }

    const image = extractImage(block)
    if (image) item.imageUrl = image

    const author = extractTag(block, 'dc:creator')
    if (author) item.author = author

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

  // Chaque flux garde sa propre pile, triée par fraîcheur. Les fusionner tout de
  // suite empêcherait de garantir la représentation de chacun.
  const perFeed = results
    .filter((outcome): outcome is PromiseFulfilledResult<NewsItem[]> => outcome.status === 'fulfilled')
    .map((outcome) =>
      [...outcome.value].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
    )
    .filter((items) => items.length > 0)

  if (perFeed.length === 0) {
    throw new ProviderError('rss-news', 'Aucun flux d’actualités n’a répondu', { retryable: true })
  }

  /*
   * TOUR À TOUR entre les flux, et non tri chronologique global.
   *
   * Le tri global paraissait évident et produisait pourtant un fil monosource :
   * mesuré, les 36 articles affichés venaient TOUS de Yahoo Finance, qui publie
   * plusieurs fois par heure là où Cointelegraph publie quelques fois par jour. Le
   * plus bavard raflait la totalité, et un site de suivi crypto affichait zéro
   * actualité crypto — un défaut invisible au typage comme au test HTTP.
   *
   * On prend donc le plus récent de chaque flux, puis le deuxième de chaque flux, et
   * ainsi de suite. Chaque source est représentée dès les premiers rangs, et un flux
   * épuisé cède simplement son tour.
   */
  const merged: NewsItem[] = []
  for (let rank = 0; merged.length < limit; rank += 1) {
    const round = perFeed.map((items) => items[rank]).filter(Boolean) as NewsItem[]
    if (round.length === 0) break

    // À l'intérieur d'un tour, l'ordre reste chronologique : la lecture garde une
    // cohérence de fraîcheur, sans qu'un flux puisse monopoliser les premiers rangs.
    round.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    merged.push(...round)
  }

  return merged.slice(0, limit)
}

export const NEWS_SOURCES = FEEDS.map((feed) => feed.label).join(', ')
