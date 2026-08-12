import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { MarketPageView } from '@/components/market/MarketPageView'
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
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  title: fr.pages.indices,
  description: fr.indices.subtitle,
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const fr = await getContent()
  return (
    <MarketPageView
      assetClass="index"
      title={fr.indices.title}
      subtitle={fr.indices.subtitle}
      searchParams={await searchParams}
    />
  )
}