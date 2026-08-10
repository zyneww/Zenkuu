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
import type { SentimentIndex, SentimentPoint } from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'alternative-me'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.alternative.me',
  maxRequestsPerWindow: 20,
  minIntervalMs: 200,
  // Aligné sur le TTL applicatif de cet indice (30 min). Sans cela, le client HTTP
  // appliquerait son défaut de 5 minutes, et Next.js — qui retient le plus court
  // `revalidate` d'un rendu — ramènerait la page /sentiment à 5 minutes malgré son
  // `export const revalidate = 1800`.
  revalidateSeconds: 1_800,
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

/**
 * Historique de l'indice.
 *
 * Le même endpoint accepte un paramètre `limit` et remonte l'historique complet
 * jour par jour — vérifié à 400 points. Un graphique d'évolution ne coûte donc
 * AUCUNE source supplémentaire : c'est le même appel avec un autre `limit`, et
 * l'indice n'étant publié qu'une fois par jour, la série est naturellement propre.
 *
 * Les points sont renvoyés du plus ANCIEN au plus récent, à l'inverse de l'ordre de
 * la source : un graphique se lit de gauche à droite dans le sens du temps, et
 * laisser l'inversion à chaque appelant garantirait qu'un seul l'oublie.
 */
export async function fetchSentimentHistory(days: number): Promise<SentimentPoint[]> {
  // Borné : `limit` est repris tel quel dans l'URL, donc dans la clé de cache. Un
  // paramètre libre ouvrirait autant d'entrées que d'entiers.
  const limit = Math.min(Math.max(Math.trunc(days), 2), 730)
  const payload = await http.getJson<FearGreedResponse>('fng/', { limit, format: 'json' })

  if (!Array.isArray(payload.data)) {
    throw new ProviderError(PROVIDER_ID, 'Historique de sentiment illisible')
  }

  const points: SentimentPoint[] = []

  for (const entry of payload.data) {
    const value = Number(entry.value)
    const seconds = Number(entry.timestamp)
    // Un point sans valeur ou sans horodatage exploitable est ÉCARTÉ, jamais
    // remplacé : une interpolation inventerait un sentiment qui n'a pas été mesuré.
    if (!Number.isFinite(value) || !Number.isFinite(seconds)) continue

    points.push({
      timestamp: seconds * 1000,
      value,
      classification: entry.value_classification ?? '',
    })
  }

  if (points.length === 0) {
    throw new ProviderError(PROVIDER_ID, 'Aucun point de sentiment exploitable')
  }

  return points.reverse()
}

export const SENTIMENT_SOURCE = {
  label: 'Alternative.me',
  attributionUrl: 'https://alternative.me/crypto/fear-and-greed-index/',
}
