import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS } from '@zenith/data'

import { MarketPageView } from '@/components/market/MarketPageView'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Toutes les cryptomonnaies',
  description:
    'Le classement complet des cryptomonnaies : capitalisation, volume, variations et tendance sur sept jours, page par page.',
  alternates: { canonical: '/crypto/all-coins' },
}

/**
 * Classement crypto exhaustif.
 *
 * Distinct de `/crypto`, qui reste la page d'entrée de la classe d'actif : celle-ci
 * assume un format d'archive — 100 lignes par page, pagination profonde — pour qui
 * veut descendre au-delà des premiers rangs.
 *
 * Le `perPage` élevé est passé en paramètre d'URL plutôt qu'en propriété du
 * composant : `MarketPageView` lit déjà sa configuration par classe d'actif, et la
 * dupliquer pour une variante de page ferait diverger les deux au premier correctif.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <MarketPageView
      assetClass="crypto"
      title="Toutes les cryptomonnaies"
      subtitle="Le classement complet par capitalisation. Utilisez la pagination pour descendre dans les rangs, ou la recherche de l’en-tête pour aller droit à un actif."
      searchParams={await searchParams}
      perPage={100}
      basePath="/crypto/all-coins"
    />
  )
}
