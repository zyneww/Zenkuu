import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { CryptoPricesView } from '@/components/market/CryptoPricesView'
import { getContent } from '@/lib/content'

// Litteral obligatoire (analyse statique de Next.js) ; le garde-fou empeche toute
// divergence avec le TTL du cache - cf. commentaire detaille dans app/page.tsx.
export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  title: fr.pages.crypto,
  description: fr.crypto.subtitle,
  alternates: { canonical: '/crypto' },
  }
}

/**
 * Cotations crypto.
 *
 * Seule des six pages de classement à ne pas passer par `MarketPageView` : son
 * bandeau de synthèse, ses onglets de vue et son sélecteur de période reposent sur
 * des requêtes propres à la crypto (capitalisation mondiale, sentiment, tendances).
 * Le détail du choix est documenté dans `CryptoPricesView`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <CryptoPricesView searchParams={await searchParams} />
}
