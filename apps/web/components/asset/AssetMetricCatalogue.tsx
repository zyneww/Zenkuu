import type { AssetClass, AssetDetail } from '@zenith/data'
import { formatPercent } from '@zenith/ui'

import { Money } from '@/components/locale/Money'

/**
 * Catalogue de métriques dérivées d'un actif.
 *
 * Complète `AssetKeyStats` en exposant des indicateurs de performance calculés
 * plutôt que des données brutes de marché : ratios, variations multi-fenêtres
 * et mesures de liquidité. Chaque cellule n'est rendue que si la donnée existe,
 * afin d'éviter les tirets sur les actifs dont la source ne publie pas tous les
 * champs.
 */
export function AssetMetricCatalogue({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: AssetClass
}) {
  const isForex = assetClass === 'forex'

  const cells: { label: string; node: React.ReactNode }[] = []

  if (asset.change7d !== undefined) {
    cells.push({
      label: 'Variation 7 j',
      node: (
        <span className={asset.change7d >= 0 ? 'text-positive' : 'text-negative'}>
          {formatPercent(asset.change7d)}
        </span>
      ),
    })
  }

  if (asset.change30d !== undefined) {
    cells.push({
      label: 'Variation 30 j',
      node: (
        <span className={asset.change30d >= 0 ? 'text-positive' : 'text-negative'}>
          {formatPercent(asset.change30d)}
        </span>
      ),
    })
  }

  if (asset.change1y !== undefined) {
    cells.push({
      label: 'Variation 1 an',
      node: (
        <span className={asset.change1y >= 0 ? 'text-positive' : 'text-negative'}>
          {formatPercent(asset.change1y)}
        </span>
      ),
    })
  }

  // Ratio volume / capitalisation : mesure la liquidité relative de l'actif.
  // Un ratio élevé indique un fort intérêt du marché par rapport à sa taille.
  if (asset.volume24h !== undefined && asset.marketCap !== undefined && asset.marketCap > 0) {
    const ratio = asset.volume24h / asset.marketCap
    cells.push({
      label: 'Volume / Capitalisation',
      node: formatPercent(ratio),
    })
  }

  if (asset.priceChangeYtd !== undefined) {
    cells.push({
      label: 'Variation YTD',
      node: (
        <span className={asset.priceChangeYtd >= 0 ? 'text-positive' : 'text-negative'}>
          {formatPercent(asset.priceChangeYtd)}
        </span>
      ),
    })
  }

  if (asset.high52w !== undefined) {
    cells.push({
      label: 'Plus haut 52 sem.',
      node: <Money value={asset.high52w} from={asset.currency} asRate={isForex} />,
    })
  }

  if (asset.low52w !== undefined) {
    cells.push({
      label: 'Plus bas 52 sem.',
      node: <Money value={asset.low52w} from={asset.currency} asRate={isForex} />,
    })
  }

  if (cells.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-surface px-3 py-2.5">
          <dt className="text-[0.6875rem] text-ink-muted">{cell.label}</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold text-ink">{cell.node}</dd>
        </div>
      ))}
    </dl>
  )
}
