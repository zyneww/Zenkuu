import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { ChartsShell } from '@/components/market/ChartsShell'
import { AltseasonSection } from '@/components/market/views/AltseasonSection'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLE = 'Saison des altcoins'
const LEAD =
  'La part des cent premières capitalisations qui a fait mieux que Bitcoin sur trente jours. Au-dessus de 75 %, le marché favorise les altcoins ; en dessous de 25 %, il se replie sur Bitcoin.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: await pageAlternates('/graphiques/saison-altcoins'),
  }
}

export default function Page() {
  return (
    <ChartsShell current="/graphiques/saison-altcoins" title={TITLE} lead={LEAD}>
      <AltseasonSection />
    </ChartsShell>
  )
}
