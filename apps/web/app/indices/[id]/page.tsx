import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenith/data'

import { AssetPageView } from '@/components/asset/AssetPageView'
import { buildAssetMetadata } from '@/lib/asset-metadata'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

interface RouteProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params
  return buildAssetMetadata('index', id)
}

export default async function Page({ params, searchParams }: RouteProps) {
  const { id } = await params
  return <AssetPageView assetClass="index" id={id} searchParams={await searchParams} />
}