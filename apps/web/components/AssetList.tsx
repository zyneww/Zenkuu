import Link from 'next/link'

import type { MarketAsset } from '@zenith/data'
import { ChangeBadge, formatCurrency, formatRate } from '@zenith/ui'

import { AssetLogo } from '@/components/AssetTile'
import { assetHref } from '@/lib/asset-routes'

interface AssetListProps {
  assets: MarketAsset[]
  /** Affiche le rang par capitalisation à gauche. */
  showRank?: boolean
}

/** Liste dense pour les widgets de la colonne latérale (§3.2). */
export function AssetList({ assets, showRank = false }: AssetListProps) {
  return (
    <ul className="divide-y divide-border-subtle">
      {assets.map((asset) => (
        <li key={asset.id}>
          <Link
            href={assetHref(asset.assetClass, asset.id)}
            className="group flex items-center gap-3 py-2 transition-opacity hover:opacity-75"
          >
            {showRank ? (
              <span className="tabular w-5 shrink-0 text-xs text-ink-muted">
                {asset.rank ?? '—'}
              </span>
            ) : null}

            <AssetLogo asset={asset} size={24} />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink group-hover:text-brand-strong">
                {asset.name}
              </span>
              <span className="block text-[0.6875rem] uppercase text-ink-muted">
                {asset.symbol}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="tabular block text-sm text-ink">
                {/* Une paire de devises se lit comme un taux, pas comme un prix en
                    euros : « 1,1535 » et non « 1,15 € », qui suggérerait un montant. */}
                {asset.assetClass === 'forex'
                  ? formatRate(asset.price)
                  : formatCurrency(asset.price, asset.currency)}
              </span>
              <ChangeBadge
                value={asset.change24h}
                periodLabel={asset.changePeriodLabel}
                size="sm"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
