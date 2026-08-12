import { Link } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'

/**
 * Bandeau de cotations défilant.
 *
 * Équivalent natif d'un widget de ticker, construit sur `@zenkuu/data` plutôt que
 * sur une iframe tierce : il suit le thème clair/sombre, ne charge aucun JavaScript
 * externe, et n'impose pas de watermark.
 *
 * Le défilement est fait en CSS et non en JavaScript, et il s'arrête au survol comme
 * sous `prefers-reduced-motion` : une animation infinie non interruptible est un
 * problème d'accessibilité, pas un effet de style (§9).
 */
export function TickerWidget({ assets }: { assets: MarketAsset[] }) {
  if (assets.length === 0) return null

  // La liste est dupliquée pour que la translation de -50 % boucle sans saut visible.
  const loop = [...assets, ...assets]

  return (
    <div className="group relative overflow-hidden rounded-card border border-border-subtle bg-surface">
      <div className="flex w-max animate-[zenkuu-ticker_60s_linear_infinite] gap-6 py-2.5 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((asset, index) => (
          <Link
            key={`${asset.id}-${index}`}
            href={assetHref(asset.assetClass, asset.id)}
            // Seule la première moitié est atteignable au clavier : la copie n'existe
            // que pour la boucle visuelle et doublerait sinon chaque tabulation.
            tabIndex={index < assets.length ? undefined : -1}
            aria-hidden={index >= assets.length}
            className="flex shrink-0 items-center gap-2 px-1"
          >
            <AssetLogo asset={asset} size={18} />
            <span className="text-xs font-medium uppercase text-ink">{asset.symbol}</span>
            <span className="tabular text-xs text-ink-muted">
              <Money value={asset.price} from={asset.currency} />
            </span>
            <ChangeBadge value={asset.change24h} size="sm" />
          </Link>
        ))}
      </div>
    </div>
  )
}
