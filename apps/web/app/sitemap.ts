import type { MetadataRoute } from 'next'

import { YAHOO_UNIVERSE, getCryptoRanking, toSlug } from '@zenith/data'

import { HELP_ARTICLES } from '@/content/aide'
import { LESSONS } from '@/content/apprendre'
import { absoluteUrl } from '@/lib/site'

/**
 * Sitemap dynamique (§9).
 *
 * Trois familles d'URL, obtenues par trois moyens de coût très différents :
 *
 *  1. les pages fixes et les contenus éditoriaux (aide, fiches Apprendre) — connus
 *     à la compilation, coût nul ;
 *  2. les fiches d'actifs de l'univers Yahoo — actions, ETF, indices et matières
 *     premières sont une LISTE STATIQUE dans le code, donc également gratuites ;
 *  3. les fiches crypto — seule famille qui exige un appel externe.
 *
 * Le point 3 est encapsulé dans un `DataResult` : si CoinGecko est indisponible ou
 * que le quota est atteint, le sitemap perd les URL crypto mais reste valide. Un
 * sitemap qui échoue est bien pire qu'un sitemap partiel — les moteurs le
 * redemandent moins souvent après une erreur.
 */

/** Combien de cryptos publier. Au-delà, la queue de classement n'a pas de trafic à capter. */
const CRYPTO_LIMIT = 100

/** Pages éditoriales et de navigation, avec leur rythme de changement réel. */
const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/crypto', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/actions', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/etf', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/indices', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/devises', changeFrequency: 'daily', priority: 0.8 },
  { path: '/matieres-premieres', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/categories', changeFrequency: 'daily', priority: 0.7 },
  { path: '/crypto/mouvements', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/actualites', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/sentiment', changeFrequency: 'daily', priority: 0.6 },
  { path: '/apprendre', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/aide', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/pourquoi-zenith', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/bien-demarrer', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/methodologie', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/developpeurs', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/a-propos', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/nouveautes', changeFrequency: 'weekly', priority: 0.4 },
]

/** Classes d'actifs dont l'univers est une liste statique — aucun appel réseau. */
const YAHOO_ROUTES: { assetClass: keyof typeof YAHOO_UNIVERSE; segment: string }[] = [
  { assetClass: 'stock', segment: 'actions' },
  { assetClass: 'etf', segment: 'etf' },
  { assetClass: 'index', segment: 'indices' },
  { assetClass: 'commodity', segment: 'matieres-premieres' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  for (const article of HELP_ARTICLES) {
    entries.push({
      url: absoluteUrl(`/aide/${article.slug}`),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    })
  }

  for (const lesson of LESSONS) {
    entries.push({
      url: absoluteUrl(`/apprendre/${lesson.slug}`),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    })
  }

  for (const { assetClass, segment } of YAHOO_ROUTES) {
    for (const entry of YAHOO_UNIVERSE[assetClass]) {
      entries.push({
        url: absoluteUrl(`/${segment}/${toSlug(entry.symbol)}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }
  }

  // Seule famille qui coûte un appel. Le classement est déjà en cache pour les pages
  // du site : à froid il consomme une requête, à chaud aucune.
  const ranking = await getCryptoRanking({ perPage: CRYPTO_LIMIT })

  if (ranking.ok) {
    for (const asset of ranking.data) {
      entries.push({
        url: absoluteUrl(`/crypto/${asset.id}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }
  }

  return entries
}
