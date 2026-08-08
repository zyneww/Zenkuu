import type { DataResult, GlobalMarketStats } from '@zenith/data'
import { ChangeBadge, EmptyState, formatCompact, formatCurrency, formatNumber } from '@zenith/ui'

import { fr } from '@/content/fr'

/**
 * Carte de synthèse du marché — équivalent du bloc « Market Cap » de CoinGecko.
 *
 * Une différence assumée avec le modèle : CoinGecko accompagne le chiffre d'une
 * courbe de la capitalisation mondiale. Cette série n'existe que sur leurs offres
 * payantes (`/global/market_cap_chart` répond 401 sur le palier gratuit). Plutôt
 * qu'un tracé approximatif — celui de Bitcoin, par exemple, présenté comme celui du
 * marché entier — la carte se concentre sur les chiffres réellement sourcés et
 * consacre la place gagnée à la dominance (§5).
 */
export function MarketOverviewCard({ result }: { result: DataResult<GlobalMarketStats> }) {
  if (!result.ok) {
    return (
      <EmptyState
        title={fr.globalStats.unavailable}
        description={result.reason}
        source={result.source?.label ?? null}
        compact
      />
    )
  }

  const stats = result.data
  const marketCap = formatCurrency(stats.totalMarketCap, stats.currency, { compact: true })
  const volume = formatCurrency(stats.totalVolume24h, stats.currency, { compact: true })
  const btc = stats.dominance['btc']
  const eth = stats.dominance['eth']

  return (
    <div className="flex h-full flex-col justify-between rounded-card border border-border-subtle bg-surface p-4">
      <div>
        <p className="text-xs text-ink-muted">{fr.home.marketCapCardTitle}</p>
        <p className="tabular mt-1 text-2xl font-bold text-ink">{marketCap ?? '—'}</p>
        <div className="mt-1">
          <ChangeBadge value={stats.marketCapChange24h} size="sm" />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border-subtle pt-3 text-xs">
        <div>
          <dt className="text-ink-muted">{fr.globalStats.volume}</dt>
          <dd className="tabular font-semibold text-ink">{volume ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr.globalStats.activeAssets}</dt>
          <dd className="tabular font-semibold text-ink">
            {formatCompact(stats.activeAssets) ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr.globalStats.dominanceBtc}</dt>
          <dd className="tabular font-semibold text-ink">
            {btc === undefined ? '—' : `${formatNumber(btc, 1)} %`}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr.globalStats.dominanceEth}</dt>
          <dd className="tabular font-semibold text-ink">
            {eth === undefined ? '—' : `${formatNumber(eth, 1)} %`}
          </dd>
        </div>
      </dl>
    </div>
  )
}
