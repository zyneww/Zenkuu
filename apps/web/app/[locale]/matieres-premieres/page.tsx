import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { ClassMarketPage, classMetadata } from '@/components/market/ClassMarketPage'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const generateMetadata = classMetadata('commodity')

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ClassMarketPage assetClass="commodity" searchParams={await searchParams} />
}
