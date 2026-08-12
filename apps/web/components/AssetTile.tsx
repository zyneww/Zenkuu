import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, formatCurrency } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'

/** Carte compacte réutilisée par les tendances (§3.2, grilles de cartes homogènes). */
export function AssetTile({ asset }: { asset: MarketAsset }) {
  return (
    <article className="flex items-center gap-3 rounded-card border border-border-subtle bg-surface p-3 transition-colors hover:border-brand/40">
      <AssetLogo asset={asset} size={32} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
        <p className="text-xs text-ink-muted">{asset.symbol}</p>
      </div>

      <div className="text-right">
        <p className="tabular text-sm font-semibold text-ink">
          {formatCurrency(asset.price, asset.currency)}
        </p>
        <ChangeBadge value={asset.change24h} periodLabel={asset.changePeriodLabel} size="sm" />
      </div>
    </article>
  )
}
