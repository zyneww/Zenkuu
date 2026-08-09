import Image from 'next/image'

import type { MarketAsset } from '@zenith/data'
import { ChangeBadge, formatCurrency } from '@zenith/ui'

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
        <ChangeBadge
          value={asset.change24h}
          periodLabel={asset.changePeriodLabel}
          size="sm"
        />
      </div>
    </article>
  )
}

/**
 * Logo de l'actif, avec repli typographique.
 *
 * Toutes les sources ne fournissent pas d'image (le forex n'en a pas du tout). Le
 * repli affiche les initiales du symbole plutôt qu'une icône générique, ce qui
 * reste lisible et n'invente aucune identité visuelle.
 *
 * Le paramètre est typé par les DEUX champs réellement lus, et non par `MarketAsset`
 * entier : c'est ce qui permet d'afficher aussi le logo d'un `TrendingAsset`, plus
 * pauvre par conception puisque sa source ne publie ni prix ni devise. Exiger un
 * type complet pour en lire deux propriétés obligerait à fabriquer un actif factice.
 */
export function AssetLogo({
  asset,
  size = 24,
}: {
  asset: Pick<MarketAsset, 'symbol'> & Partial<Pick<MarketAsset, 'image' | 'name'>>
  size?: number
}) {
  if (!asset.image) {
    // Pour une paire de devises, c'est la contrepartie qui distingue les lignes :
    // « EUR/USD » et « EUR/GBP » afficheraient sinon le même « EUR » partout.
    const initials = asset.symbol.includes('/')
      ? (asset.symbol.split('/')[1] ?? asset.symbol)
      : asset.symbol.slice(0, 3)

    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-[0.625rem] font-bold text-brand-strong"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {initials}
      </span>
    )
  }

  return (
    <Image
      src={asset.image}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full"
      unoptimized={false}
    />
  )
}
