import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, type AssetClass } from '@zenith/data'

import { MarketPageView } from '@/components/market/MarketPageView'
import { fr } from '@/content/fr'
import { assetClassFromSegment } from '@/lib/asset-routes'

// Litteral obligatoire (analyse statique de Next.js) ; le garde-fou empeche toute
// divergence avec le TTL du cache — cf. commentaire detaille dans app/page.tsx.
export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.marches.title,
  description: fr.marches.subtitle,
}

const VALID_CLASSES: AssetClass[] = ['crypto', 'forex', 'stock', 'etf', 'commodity', 'index']

function readAssetClass(raw: string | string[] | undefined): AssetClass {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 'crypto'
  const parsed = assetClassFromSegment(value) ?? (VALID_CLASSES.includes(value as AssetClass) ? (value as AssetClass) : null)
  return parsed ?? 'crypto'
}

export default async function Page({
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const assetClass = readAssetClass(params['classe'])

  return (
    <MarketPageView
      assetClass={assetClass}
      title={fr.marches.title}
      subtitle={fr.marches.subtitle}
      searchParams={params}
    />
  )
}
