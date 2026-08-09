import { ARTICLES, categoryLabel, sortedArticles } from '@/content/blog'
import { SITE_URL } from '@/lib/site'

/**
 * Flux RSS du blog.
 *
 * Servi même quand aucun article n'est publié, et c'est volontaire : un lecteur de
 * flux qui s'abonne aujourd'hui recevra les articles du jour où ils paraîtront. Un
 * flux qui répondrait 404 en attendant obligerait à se réabonner plus tard — soit
 * exactement l'inverse de ce à quoi sert un abonnement.
 *
 * RSS 2.0 plutôt qu'Atom : c'est le format que tous les lecteurs acceptent sans
 * exception, et le blog n'utilise aucune des finesses qu'Atom apporterait.
 */

/** Échappement XML. Sans lui, une apostrophe ou un `&` dans un titre casse le flux. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Date au format RFC 822, qu'impose la spécification RSS.
 *
 * `toUTCString()` produit « Sun, 10 Aug 2026 00:00:00 GMT », qui est conforme.
 * Surtout, la locale n'intervient pas : un flux daté en français serait rejeté par
 * la plupart des lecteurs.
 */
function rfc822(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? new Date(0).toUTCString() : date.toUTCString()
}

export async function GET(): Promise<Response> {
  const articles = sortedArticles()

  const items = articles
    .map((article) => {
      const url = `${SITE_URL}/blog/${article.slug}`

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(article.summary)}</description>
      <category>${escapeXml(categoryLabel(article.category))}</category>
      ${/* `dc:creator` et non `author` : la spécification RSS 2.0 attend une ADRESSE
           e-mail dans `<author>`, et y mettre un nom rend le flux non conforme.
           Dublin Core est la convention retenue par tous les lecteurs pour un nom. */ ''}
      <dc:creator>${escapeXml(article.author)}</dc:creator>
      <pubDate>${rfc822(article.publishedAt)}</pubDate>
    </item>`
    })
    .join('\n')

  // `lastBuildDate` reflète le dernier article, pas l'heure de la requête : sinon le
  // flux paraîtrait modifié à chaque appel et empêcherait toute mise en cache côté
  // lecteur. Sans article, le champ est simplement omis.
  const lastBuild = articles[0] ? `\n    <lastBuildDate>${rfc822(articles[0].publishedAt)}</lastBuildDate>` : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Blog ZENITH</title>
    <link>${SITE_URL}/blog</link>
    <description>Comment les chiffres affichés sur ZENITH sont collectés, vérifiés et présentés.</description>
    <language>fr-FR</language>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />${lastBuild}
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Une heure de cache, revalidation silencieuse pendant un jour : un lecteur de
      // flux interroge souvent, et le contenu ne change qu'à la publication.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}

/**
 * Route STATIQUE : sans article, `ARTICLES` est une constante du module et le flux
 * ne dépend d'aucune requête. La marquer dynamique ferait exécuter du code serveur
 * à chaque appel pour produire une chaîne toujours identique.
 */
export const dynamic = 'force-static'
export const revalidate = 3600

// Garde-fou de typage : `ARTICLES` est référencé pour que toute évolution du modèle
// de contenu casse ici plutôt qu'à l'exécution.
void ARTICLES
