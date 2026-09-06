import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { MetricIndexView } from '@/components/asset/MetricIndexView'
import { buildMetricsIndexMetadata } from '@/lib/asset-metadata'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params
  return buildMetricsIndexMetadata('commodity', id)
}

export default async function Page({ params }: RouteProps) {
  const { id } = await params
  return <MetricIndexView assetClass="commodity" id={id} />
}
