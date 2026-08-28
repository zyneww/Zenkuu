import type { Metadata } from 'next'

import {
  CACHE_TTL_SECONDS,
  getMarketCapBasket,
  getStablecoinHistory,
  getSentimentHistory,
} from '@zenkuu/data'

import { GlobalChartCard } from '@/components/market/GlobalChartCard'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GRAPHIQUE INTÉGRABLE — LA CIBLE DU BOUTON `</>`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE ROUTE EXISTE ────────────────────────────────────────────
 *
 * Le bouton de code d'intégration ne peut proposer une adresse que si elle répond.
 * Offrir un `<iframe>` vers une page inexistante aurait été pire que ne rien offrir :
 * le code se copie, se colle, et échoue chez l'hôte — c'est-à-dire loin d'ici, sans
 * qu'on le sache.
 *
 * ── TROIS SÉRIES, ET PAS UNE DE PLUS ───────────────────────────────────────
 *
 * Seules celles que le site trace déjà sur une fenêtre longue. Un identifiant inconnu
 * ne rend RIEN plutôt qu'un cadre vide : une iframe blanche chez un hôte tiers ne dit
 * pas d'où vient le problème.
 *
 * ── PAS D'HABILLAGE ────────────────────────────────────────────────────────
 *
 * `embed/layout.tsx` retire la navigation, le pied de page et le conteneur centré ;
 * le fond reste transparent pour que le cadre prenne la couleur de la page hôte.
 *
 * `noindex` : cette page est un composant destiné à une iframe, pas une destination.
 * Indexée, elle concurrencerait `/graphiques` sur les mêmes contenus.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = (await searchParams)['serie']
  const serie = Array.isArray(raw) ? raw[0] : raw

  if (serie === 'panier') {
    const basket = await getMarketCapBasket('eur', 365)
    if (!basket.ok) return null
    return (
      <GlobalChartCard
        title="Capitalisation du panier suivi"
        format="money"
        currency={basket.data.currency}
        colorIndex={5}
        points={basket.data.points.map((point) => ({ t: point.timestamp, y: point.total }))}
      />
    )
  }

  if (serie === 'stablecoins') {
    const history = await getStablecoinHistory()
    if (!history.ok) return null
    return (
      <GlobalChartCard
        title="Capitalisation des stablecoins"
        format="money"
        currency="USD"
        colorIndex={3}
        points={history.data.map((point) => ({ t: point.timestamp, y: point.value }))}
      />
    )
  }

  if (serie === 'sentiment') {
    const history = await getSentimentHistory(365)
    if (!history.ok) return null
    return (
      <GlobalChartCard
        title="Indice de sentiment"
        format="plain"
        colorIndex={2}
        points={history.data.map((point) => ({ t: point.timestamp, y: point.value }))}
      />
    )
  }

  return null
}
