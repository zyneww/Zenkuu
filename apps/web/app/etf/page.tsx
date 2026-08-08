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
  title: fr.pages.etf,
  description: fr.etf.subtitle,
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <MarketPageView
      assetClass="etf"
      title={fr.etf.title}
      subtitle={fr.etf.subtitle}
      searchParams={await searchParams}
    />
  )
}