import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { ChartsShell } from '@/components/market/ChartsShell'
import { DominanceSection } from '@/components/market/views/DominanceSection'
import { getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLE = 'Dominance de Bitcoin'
const LEAD =
  'La part de la capitalisation mondiale que représente Bitcoin. Elle monte quand le marché se replie vers lui, et baisse quand le reste progresse plus vite.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: { canonical: '/graphiques/dominance' },
  }
}

export default function Page() {
  return (
    <ChartsShell current="/graphiques/dominance" title={TITLE} lead={LEAD}>
      <DominanceSection />
    </ChartsShell>
  )
}
