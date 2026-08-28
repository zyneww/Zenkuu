import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { ChartsShell, LoadingNote } from '@/components/market/ChartsShell'
import { NftSection } from '@/components/market/views/NftSection'
import { getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLE = 'Collections NFT'
const LEAD =
  'Une sélection de collections de référence : prix plancher, capitalisation et volume. Ce n’est pas un classement — voir la note en bas de page.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: { canonical: '/graphiques/nft' },
  }
}

export default async function Page() {
  const t = await getPhrase()

  return (
    <ChartsShell current="/graphiques/nft" title={TITLE} lead={LEAD}>
      {/* Un appel PAR COLLECTION, derrière un limiteur — voir `getNftCollections`. */}
      <Suspense fallback={<LoadingNote label={t('Lecture des collections…')} />}>
        <NftSection />
      </Suspense>
    </ChartsShell>
  )
}
