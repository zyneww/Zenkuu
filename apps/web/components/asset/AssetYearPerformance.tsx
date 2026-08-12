'use client'

import { useEffect, useState } from 'react'

import type { AssetClass, AssetDetail, PriceHistory } from '@zenkuu/data'
import { ChangeBadge, EmptyState, formatCurrency } from '@zenkuu/ui'

import { useContent } from '@/components/locale/ContentProvider'
import { useCurrency } from '@/components/locale/CurrencyProvider'

/**
 * Performances sur un an et extrêmes de la période.
 *
 * ── POURQUOI CE BLOC A QUITTÉ LE PLAN DE TRAVAIL DU GRAPHIQUE ─────────────────
 *
 * Il y vivait sous un sous-onglet « Performances », dans une rangée
 * « Graphique / Performances / FAQ » posée AU-DESSUS de la barre d'outils du
 * graphique. Cette rangée était la dernière chose qui séparait notre fiche de la
 * disposition de la référence, chez qui la courbe démarre immédiatement sous les
 * onglets principaux.
 *
 * Le contenu, lui, n'a rien à faire dans un panneau de graphique : ce sont des
 * mesures dérivées d'une série, exactement comme les indicateurs techniques de
 * l'onglet « Analyse ». Il y rejoint donc sa famille, au lieu de se cacher derrière
 * un second niveau d'onglets.
 *
 * ── LA DEVISE VIENT DÉSORMAIS DU SITE, PLUS DU GRAPHIQUE ──────────────────────
 *
 * Le composant lisait le sélecteur LOCAL de la barre d'outils. Sorti du plan de
 * travail, il n'y a plus accès — et c'est un gain plutôt qu'une perte : ce sélecteur
 * est une commande du graphique, pas un réglage de page. Ces montants suivent
 * maintenant la devise choisie par le lecteur pour tout le site, comme chaque autre
 * nombre de la fiche (voir `Money`).
 *
 * ── POURQUOI IL CHARGE SA PROPRE SÉRIE ────────────────────────────────────────
 *
 * Une année de données est nécessaire pour calculer une performance sur un an, et le
 * graphique n'affiche par défaut que sept jours. Le chargement reste DIFFÉRÉ à la
 * première apparition à l'écran : la plupart des visiteurs n'ouvriront jamais cet
 * onglet, et l'appel serait alors payé pour rien.
 */
export function AssetYearPerformance({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: AssetClass
}) {
  const fr = useContent()
  const { currency, convert } = useCurrency()
  const [history, setHistory] = useState<PriceHistory | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/historique?classe=${assetClass}&id=${encodeURIComponent(asset.id)}&jours=365`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && payload.ok) setHistory(payload as PriceHistory)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [assetClass, asset.id])

  if (!history || history.points.length < 2) {
    return <EmptyState title={fr.asset.loadingSeries} compact />
  }

  const points = history.points
  const lastPoint = points[points.length - 1]
  // Toujours défini ici (garde `points.length < 2` ci-dessus) — le repli sur
  // `Date.now()` serait un appel impur pendant le rendu (react-hooks/purity) pour
  // un cas qui ne se produit jamais.
  if (!lastPoint) return <EmptyState title={fr.asset.loadingSeries} compact />
  const last = lastPoint.price
  const now = lastPoint.timestamp

  /** Performance sur une fenêtre, calculée depuis la série réellement chargée. */
  function performance(daysBack: number): number | undefined {
    const target = now - daysBack * 86_400_000
    // Premier point à ou après la borne : la série étant quotidienne au-delà de
    // 90 jours, viser exactement la date échouerait la plupart du temps.
    const reference = points.find((point) => point.timestamp >= target)
    if (!reference || reference.price === 0) return undefined
    return ((last - reference.price) / reference.price) * 100
  }

  const prices = points.map((point) => point.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)

  const rows = [
    // La variation 24 h vient de la SOURCE, pas de notre série : sur une année en pas
    // quotidien, deux points consécutifs ne représentent pas exactement 24 heures.
    { label: fr.asset.ranges.d1, value: asset.change24h },
    { label: fr.asset.ranges.d7, value: performance(7) },
    { label: fr.asset.ranges.d30, value: performance(30) },
    { label: fr.asset.ranges.d90, value: performance(90) },
    { label: fr.asset.ranges.y1, value: performance(365) },
  ]

  const money = (value: number) =>
    formatCurrency(convert(value, asset.currency), currency) ?? '—'

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">{fr.asset.performanceTitle}</h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-[0.6875rem] text-ink-muted">{row.label}</dt>
              <dd className="mt-0.5">
                <ChangeBadge value={row.value} size="sm" periodLabel={`sur ${row.label}`} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[0.6875rem] text-ink-muted">{fr.asset.performanceNote}</p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">{fr.asset.rangeYearTitle}</h3>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-muted px-3 py-2">
            <dt className="text-[0.6875rem] text-ink-muted">{fr.asset.lowest}</dt>
            <dd className="tabular text-sm font-semibold text-ink">{money(min)}</dd>
          </div>
          <div className="rounded-lg bg-surface-muted px-3 py-2">
            <dt className="text-[0.6875rem] text-ink-muted">{fr.asset.highest}</dt>
            <dd className="tabular text-sm font-semibold text-ink">{money(max)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
