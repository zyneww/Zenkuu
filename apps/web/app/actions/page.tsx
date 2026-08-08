import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenith/data'

import { MarketPageView } from '@/components/market/MarketPageView'
import { fr } from '@/content/fr'

// Litteral obligatoire (analyse statique de Next.js) ; le garde-fou empeche toute
// divergence avec le TTL du cache - cf. commentaire detaille dans app/page.tsx.
export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.pages.stocks,
  description: fr.stocks.subtitle,
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <MarketPageView
      assetClass="stock"
      title={fr.stocks.title}
      subtitle={fr.stocks.subtitle}
      searchParams={await searchParams}
    />
  )
}