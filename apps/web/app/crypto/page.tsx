import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenith/data'

import { CryptoPricesView } from '@/components/market/CryptoPricesView'
import { fr } from '@/content/fr'

// Litteral obligatoire (analyse statique de Next.js) ; le garde-fou empeche toute
// divergence avec le TTL du cache - cf. commentaire detaille dans app/page.tsx.
export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.pages.crypto,
  description: fr.crypto.subtitle,
  alternates: { canonical: '/crypto' },
}

/**
 * Cotations crypto.
 *
 * Seule des six pages de classement à ne pas passer par `MarketPageView` : son
 * bandeau de synthèse, ses onglets de vue et son sélecteur de période reposent sur
 * des requêtes propres à la crypto (capitalisation mondiale, sentiment, tendances).
 * Le détail du choix est documenté dans `CryptoPricesView`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <CryptoPricesView searchParams={await searchParams} />
}
