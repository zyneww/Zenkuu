'use client'

import { useEffect, useState } from 'react'

import type { SeriesPoint } from '@/lib/series-stats'

/**
 * Série longue d'un actif, partagée entre les panneaux qui en vivent.
 *
 * ── POURQUOI UN CACHE DE PROMESSES, ET PAS UN CACHE DE RÉSULTATS ──────────────
 *
 * L'onglet « Analyse » contient désormais DEUX consommateurs de la même année de
 * cours : les indicateurs et mesures de risque d'un côté, le catalogue de métriques
 * de l'autre. Chacun avec son `useEffect`, cela fait deux appels pour une seule
 * donnée.
 *
 * Un cache de résultats ne suffirait pas. Les deux panneaux deviennent visibles au
 * MÊME instant — l'onglet s'ouvre d'un clic — donc leurs effets partent dans le même
 * tour de boucle, avant que la première réponse ne soit revenue : au moment où le
 * second consulte le cache, il est encore vide. Ce qu'on met en cache est donc la
 * PROMESSE, dès son émission. Le second consommateur se greffe sur l'appel en vol du
 * premier au lieu d'en lancer un second.
 *
 * L'enjeu n'est pas la milliseconde : le fournisseur plafonne à quelques requêtes par
 * minute, et une requête doublée est une requête qui manquera ailleurs.
 *
 * ── LA DURÉE DE VIE EST CELLE DE L'ONGLET DU NAVIGATEUR ───────────────────────
 *
 * Le cache vit dans le module, donc il survit aux démontages de composants mais pas à
 * un rechargement de page. C'est exactement la bonne portée : deux panneaux d'une même
 * fiche partagent, deux visites successives repassent par le cache HTTP de la route
 * (`max-age=120`) puis par le cache applicatif du serveur. Trois étages, chacun à sa
 * bonne échelle, et aucun n'a besoin d'être invalidé à la main.
 */

export interface AssetSeries {
  points: SeriesPoint[]
  currency: string
}

const inflight = new Map<string, Promise<AssetSeries | null>>()

/**
 * Charge la série, ou rend celle déjà en vol pour le même triplet.
 *
 * Exportée pour les composants qui gèrent eux-mêmes leur état de chargement —
 * `AssetAnalysis` orchestre quatre panneaux qui s'affichent à mesure qu'ils
 * arrivent, un `useState` de plus ne l'aiderait pas. Les autres passent par
 * `useAssetSeries`.
 */
export function loadAssetSeries(
  assetClass: string,
  assetId: string,
  days: number,
): Promise<AssetSeries | null> {
  const key = `${assetClass}:${assetId}:${days}`
  const known = inflight.get(key)
  if (known) return known

  const request = fetch(
    `/api/historique?classe=${assetClass}&id=${encodeURIComponent(assetId)}&jours=${days}`,
  )
    .then((response) => response.json())
    .then((payload: unknown) => {
      const body = payload as { ok?: boolean; points?: SeriesPoint[]; currency?: string }
      if (!body?.ok || !Array.isArray(body.points)) return null
      return { points: body.points, currency: body.currency ?? 'EUR' }
    })
    .catch(() => null)

  inflight.set(key, request)
  return request
}

/**
 * Charge la série une fois `enabled` passé à vrai, et jamais avant.
 *
 * Le drapeau vient de la visibilité de l'onglet (`usePanelVisible`) : les panneaux
 * inactifs sont dans le document mais masqués — c'est le choix de référencement
 * défendu par `AssetTabs` — et un chargement au montage ferait payer cet appel à
 * l'immense majorité des visiteurs qui n'ouvriront jamais l'onglet.
 *
 * `settled` distingue « pas encore demandé » de « demandé, rien reçu ». Sans lui, un
 * actif sans historique afficherait un squelette pour toujours.
 */
export function useAssetSeries(
  assetClass: string,
  assetId: string,
  days: number,
  enabled: boolean,
): { series: AssetSeries | null; settled: boolean } {
  const [series, setSeries] = useState<AssetSeries | null>(null)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    void loadAssetSeries(assetClass, assetId, days).then((result) => {
      if (cancelled) return
      setSeries(result)
      setSettled(true)
    })

    return () => {
      cancelled = true
    }
  }, [assetClass, assetId, days, enabled])

  return { series, settled }
}
