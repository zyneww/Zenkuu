/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DEFILLAMA — LA CAPITALISATION DES STABLECOINS, EN SÉRIE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UN FOURNISSEUR DE PLUS ────────────────────────────────────────
 *
 * La référence trace quatre courbes longues : capitalisation totale, dominance,
 * DeFi et stablecoins. Nos sources n'en publient AUCUNE en série — CoinGecko réserve
 * ses agrégats historiques à son offre payante, et ne rend en gratuit que la valeur
 * du jour par catégorie.
 *
 * DefiLlama publie celle des stablecoins, librement, sans clé, depuis novembre 2017.
 * C'est la seule des quatre qu'on peut tracer honnêtement, et c'est la seule qui est
 * reprise ici.
 *
 * ── CE QUI N'EST PAS IMPORTÉ, ET POURQUOI ──────────────────────────────────
 *
 * ⚠️ DefiLlama publie aussi un historique de TVL — la valeur immobilisée dans les
 * protocoles. Ce N'EST PAS une capitalisation : le TVL compte des capitaux DÉPOSÉS,
 * la capitalisation compte la valeur des jetons émis. Les deux se ressemblent en
 * ordre de grandeur et racontent des choses différentes ; poser le TVL sous un titre
 * « DeFi Market Cap » serait une fausse étiquette, aussi trompeuse qu'un faux chiffre
 * (§5). Il faudra un cadre à lui, nommé pour ce qu'il est, le jour où on le voudra.
 *
 * ── LA RÉPONSE EST GROSSE, ET C'EST CE QUI DICTE LE CACHE ──────────────────
 *
 * `stablecoincharts/all` rend un point par JOUR depuis 2017, soit près de trois mille
 * entrées. La série ne bouge qu'une fois par jour : un TTL d'une heure suffit, et
 * évite de retélécharger un mégaoctet à chaque rendu de page.
 */

import { createHttpClient } from '../http'
import { ProviderError } from '../types'

const PROVIDER_ID = 'defillama'

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://stablecoins.llama.fi',
  /* Aucune limite annoncée par la source. Le plafond est le nôtre : cette série est
     demandée par une seule page, et un cache d'une heure la protège déjà. */
  maxRequestsPerWindow: 20,
  minIntervalMs: 250,
  revalidateSeconds: 3_600,
})

/** Un point de la série agrégée des stablecoins. */
export interface StablecoinPoint {
  timestamp: number
  /** Capitalisation en circulation, en dollars. */
  value: number
}

/**
 * Réponse brute, réduite aux deux champs utilisés.
 *
 * ⚠️ `date` est une chaîne de SECONDES, pas un nombre de millisecondes. La source la
 * publie ainsi (`"1511913600"`), et la passer telle quelle à `new Date()` produirait
 * une date en 1970 — vérifié sur la réponse.
 */
interface RawStablecoinPoint {
  date?: string | number
  totalCirculatingUSD?: { peggedUSD?: number } | number
}

export async function fetchStablecoinHistory(): Promise<StablecoinPoint[]> {
  const rows = await http.getJson<RawStablecoinPoint[]>('/stablecoincharts/all')

  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, 'Historique des stablecoins illisible')
  }

  const points: StablecoinPoint[] = []

  for (const row of rows) {
    const seconds = Number(row.date)
    /* La source a publié ce champ sous deux formes au fil du temps : un objet
       `{ peggedUSD }` aujourd'hui, un nombre nu dans d'anciennes entrées. On accepte
       les deux plutôt que de perdre le début de la série. */
    const raw =
      typeof row.totalCirculatingUSD === 'number'
        ? row.totalCirculatingUSD
        : row.totalCirculatingUSD?.peggedUSD

    const value = Number(raw)

    // Un point sans valeur ou sans horodatage exploitable est ÉCARTÉ, jamais
    // remplacé : une interpolation inventerait une capitalisation qui n'a pas été
    // mesurée.
    if (!Number.isFinite(seconds) || !Number.isFinite(value) || value <= 0) continue

    points.push({ timestamp: seconds * 1000, value })
  }

  if (points.length === 0) {
    throw new ProviderError(PROVIDER_ID, 'Aucun point de stablecoin exploitable')
  }

  /* Du plus ANCIEN au plus récent : un graphique se lit de gauche à droite dans le
     sens du temps, et laisser le tri à chaque appelant garantirait qu'un l'oublie. */
  return points.sort((left, right) => left.timestamp - right.timestamp)
}

export const DEFILLAMA_SOURCE = {
  label: 'DefiLlama',
  attributionUrl: 'https://defillama.com/stablecoins',
}
