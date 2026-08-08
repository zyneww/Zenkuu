/**
 * Indice Fear & Greed du marché crypto — alternative.me.
 *
 * Sans clé, sans quota annoncé, publié une fois par jour. C'est l'indicateur que le
 * §2 range parmi les fonctionnalités attendues.
 *
 * Un mot sur la nature de la donnée : cet indice est une COMPOSITION propriétaire
 * (volatilité, volume, réseaux sociaux, dominance, tendances de recherche) publiée
 * par un tiers. On l'affiche donc tel quel, attribué à sa source, sans le présenter
 * comme un signal d'achat ou de vente — ce que le positionnement lecture seule du
 * §1 interdit de toute façon.
 */

import { createHttpClient } from '../http'
import type { SentimentIndex } from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'alternative-me'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.alternative.me',
  maxRequestsPerWindow: 20,
  minIntervalMs: 200,
})

interface FearGreedResponse {
  data?: { value?: string; value_classification?: string; timestamp?: string }[]
}

export async function fetchSentiment(): Promise<SentimentIndex> {
  // Deux points : la valeur du jour et celle de la veille, pour montrer le sens du
  // mouvement. Un indice de sentiment sans sa variation ne dit pas grand-chose.
  const payload = await http.getJson<FearGreedResponse>('fng/', { limit: 2, format: 'json' })

  const today = payload.data?.[0]
  const value = Number(today?.value)

  if (!today || !Number.isFinite(value)) {
    throw new ProviderError(PROVIDER_ID, 'Indice de sentiment illisible')
  }

  const index: SentimentIndex = {
    value,
    classification: today.value_classification ?? '',
    updatedAt: today.timestamp
      ? new Date(Number(today.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
  }

  const previous = Number(payload.data?.[1]?.value)
  if (Number.isFinite(previous)) index.previousValue = previous

  return index
}

export const SENTIMENT_SOURCE = {
  label: 'Alternative.me',
  attributionUrl: 'https://alternative.me/crypto/fear-and-greed-index/',
}
