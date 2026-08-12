import { Link } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'

interface AssetListProps {
  assets: MarketAsset[]
  /** Affiche le rang par capitalisation à gauche. */
  showRank?: boolean
  /**
   * Champ de variation à afficher.
   *
   * Par défaut la variation sur 24 h. Les « mouvements » filtrables classent sur
   * d'autres fenêtres : afficher la variation 24 h à côté d'un classement établi
   * sur un an ferait paraître le tri incohérent, alors qu'il serait simplement
   * calculé sur une autre colonne.
   */
  changeField?: 'change1h' | 'change24h' | 'change7d' | 'change14d' | 'change30d' | 'change1y'
  /** Libellé de période associé à `changeField`, pour l'accessibilité du badge. */
  changeLabel?: string
}

/** Liste dense pour les widgets de la colonne latérale (§3.2). */
export function AssetList({
  assets,
  showRank = false,
  changeField = 'change24h',
  changeLabel,
}: AssetListProps) {
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
                <Money
                  value={asset.price}
                  from={asset.currency}
                  asRate={asset.assetClass === 'forex'}
                />
              </span>
              <ChangeBadge
                value={asset[changeField]}
                periodLabel={changeLabel ?? asset.changePeriodLabel}
                size="sm"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
