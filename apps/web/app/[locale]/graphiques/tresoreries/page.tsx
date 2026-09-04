import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { ChartsShell, LoadingNote } from '@/components/market/ChartsShell'
import { TreasuriesSection } from '@/components/market/views/TreasuriesSection'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLE = 'Trésoreries d’entreprise'
const LEAD =
  'Les sociétés cotées qui déclarent détenir du bitcoin ou de l’ether à leur bilan, ce qu’elles ont payé et ce que cela vaut aujourd’hui.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: await pageAlternates('/graphiques/tresoreries'),
  }
}

export default async function Page() {
  const t = await getPhrase()

  return (
    <ChartsShell current="/graphiques/tresoreries" title={TITLE} lead={LEAD}>
      {/*
        MISE EN FLUX : ces registres ne coûtent pas un appel mais plusieurs, sur un
        fournisseur limité à cinq par minute. Sans `Suspense`, le serveur retiendrait
        la page entière jusqu'au dernier — le lecteur regarderait un écran blanc, sans
        titre, sans savoir si le site répond.
      */}
      <Suspense fallback={<LoadingNote label={t('Lecture des registres de trésorerie…')} />}>
        <TreasuriesSection />
      </Suspense>
    </ChartsShell>
  )
}
