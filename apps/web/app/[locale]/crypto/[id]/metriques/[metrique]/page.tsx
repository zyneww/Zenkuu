import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { MetricPageView } from '@/components/asset/MetricPageView'
import { buildMetricMetadata } from '@/lib/asset-metadata'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

interface RouteProps {
  params: Promise<{ id: string; metrique: string }>
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id, metrique } = await params
  return buildMetricMetadata('crypto', id, metrique)
}

export default async function Page({ params }: RouteProps) {
  const { id, metrique } = await params
  return <MetricPageView assetClass="crypto" id={id} slug={metrique} />
}
