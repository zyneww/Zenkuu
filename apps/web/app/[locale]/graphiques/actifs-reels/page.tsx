import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { ChartsShell, LoadingNote } from '@/components/market/ChartsShell'
import { RealWorldAssetsSection } from '@/components/market/views/RealWorldAssetsSection'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLE = 'Actifs du monde réel'
const LEAD =
  'Les actions cotées répliquées en jetons sur chaîne : leur émetteur, leur prix, leur capitalisation et le volume qu’elles échangent.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: await pageAlternates('/graphiques/actifs-reels'),
  }
}

export default async function Page() {
  const t = await getPhrase()

  return (
    <ChartsShell current="/graphiques/actifs-reels" title={TITLE} lead={LEAD}>
      <Suspense fallback={<LoadingNote label={t('Lecture du catalogue des jetons…')} />}>
        <RealWorldAssetsSection />
      </Suspense>
    </ChartsShell>
  )
}
