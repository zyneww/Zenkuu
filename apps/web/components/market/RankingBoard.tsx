'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenith/data'
import { ChangeBadge, EmptyState, Sparkline } from '@zenith/ui'

import { AssetLogo } from '@/components/AssetTile'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'

/**
 * Tableau de classements — plusieurs palmarès CÔTE À CÔTE.
 *
 * C'est ce qui distingue cette page de `/crypto` : là-bas un tableau unique que l'on
 * trie, ici plusieurs classements simultanés que l'on compare. Voir les hausses, les
 * baisses et les volumes du même coup d'œil dit quelque chose qu'aucun des trois ne
 * dit isolément — par exemple qu'une forte hausse se fait sans volume.
 *
 * La période s'applique à TOUS les classements en même temps, et c'est délibéré :
 * comparer des hausses sur 1 h à des baisses sur 7 j n'aurait aucun sens, et laisser
 * une période par colonne rendrait l'erreur facile.
 */

type Period = '1h' | '24h' | '7d' | '30d'

const PERIODS: { key: Period; label: string; field: keyof MarketAsset; long: string }[] = [
  { key: '1h', label: '1 h', field: 'change1h', long: 'sur 1 heure' },
  { key: '24h', label: '24 h', field: 'change24h', long: 'sur 24 heures' },
  { key: '7d', label: '7 j', field: 'change7d', long: 'sur 7 jours' },
  { key: '30d', label: '30 j', field: 'change30d', long: 'sur 30 jours' },
]

const ROWS = 10

export function RankingBoard({ assets }: { assets: MarketAsset[] }) {
  const [period, setPeriod] = useState<Period>('24h')

  const meta = PERIODS.find((entry) => entry.key === period) ?? PERIODS[1]!
  const field = meta.field

  const boards = useMemo(() => {
    const rated = assets.filter((asset) => typeof asset[field] === 'number')
    const sorted = [...rated].sort((a, b) => (b[field] as number) - (a[field] as number))

    // Filtrage PAR SIGNE, comme partout ailleurs sur le site : sans lui, « plus
    // fortes baisses » se remplirait d'actifs en hausse les jours où tout monte.
    const gainers = sorted.filter((asset) => (asset[field] as number) > 0).slice(0, ROWS)
    const losers = sorted
      .filter((asset) => (asset[field] as number) < 0)
      .slice(-ROWS)
      .reverse()

    const byVolume = [...assets]
      .filter((asset) => typeof asset.volume24h === 'number')
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, ROWS)

    /**
     * Rotation : volume rapporté à la capitalisation.
     *
     * Ce n'est pas une donnée de la source mais un RAPPORT de deux valeurs qu'elle
     * publie — ce qui est légitime, contrairement à une estimation. Il révèle les
     * actifs qui s'échangent beaucoup au regard de leur taille, information qu'aucun
     * des deux nombres ne donne seul.
     */
    const byTurnover = [...assets]
      .filter((asset) => (asset.marketCap ?? 0) > 0 && (asset.volume24h ?? 0) > 0)
      .map((asset) => ({
        asset,
        ratio: ((asset.volume24h as number) / (asset.marketCap as number)) * 100,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, ROWS)

    return { gainers, losers, byVolume, byTurnover }
  }, [assets, field])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Classements calculés sur les {assets.length} plus grandes capitalisations.
        </p>

        <div
          className="flex items-center gap-1 rounded-card border border-border-subtle bg-surface p-1"
          role="group"
          aria-label="Période des classements"
        >
          {PERIODS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setPeriod(entry.key)}
              aria-pressed={period === entry.key}
              className={`tabular rounded-[0.5rem] px-2.5 py-1 text-xs font-medium transition-colors ${
                period === entry.key
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Board
          title="Plus fortes hausses"
          hint={meta.long}
          assets={boards.gainers}
          field={field}
          periodLabel={meta.long}
        />
        <Board
          title="Plus fortes baisses"
          hint={meta.long}
          assets={boards.losers}
          field={field}
          periodLabel={meta.long}
        />
        <Board
          title="Volumes les plus élevés"
          hint="sur 24 heures"
          assets={boards.byVolume}
          field={field}
          periodLabel={meta.long}
          showVolume
        />
        <TurnoverBoard rows={boards.byTurnover} field={field} periodLabel={meta.long} />
      </div>
    </div>
  )
}

function Board({
  title,
  hint,
  assets,
  field,
  periodLabel,
  showVolume = false,
}: {
  title: string
  hint: string
  assets: MarketAsset[]
  field: keyof MarketAsset
  periodLabel: string
  showVolume?: boolean
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs text-ink-muted">{hint}</span>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          title="Rien à classer"
          description="Aucun actif ne remplit ce critère sur la période choisie."
          compact
        />
      ) : (
        <ol className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
          {assets.map((asset, index) => (
            <li key={asset.id}>
              <Link
                href={assetHref(asset.assetClass, asset.id)}
                className="group flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-muted/60"
              >
                <span className="tabular w-4 shrink-0 text-xs text-ink-muted">{index + 1}</span>
                <AssetLogo asset={asset} size={22} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-brand-strong">
                  {asset.name}
                  <span className="ml-1.5 text-xs uppercase text-ink-muted">{asset.symbol}</span>
                </span>

                {asset.sparkline7d ? (
                  <span className="hidden shrink-0 sm:block">
                    <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                  </span>
                ) : null}

                <span className="tabular w-24 shrink-0 text-right text-xs text-ink">
                  {showVolume ? (
                    <Money value={asset.volume24h} from={asset.currency} compact />
                  ) : (
                    <Money value={asset.price} from={asset.currency} />
                  )}
                </span>

                <span className="w-20 shrink-0 text-right">
                  <ChangeBadge
                    value={asset[field] as number | undefined}
                    periodLabel={periodLabel}
                    size="sm"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function TurnoverBoard({
  rows,
  field,
  periodLabel,
}: {
  rows: { asset: MarketAsset; ratio: number }[]
  field: keyof MarketAsset
  periodLabel: string
}) {
  return (
    <section className="space-y-3" aria-label="Rotation la plus forte">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Rotation la plus forte</h3>
        <span className="text-xs text-ink-muted">volume / capitalisation</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Rien à classer" compact />
      ) : (
        <ol className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
          {rows.map((row, index) => (
            <li key={row.asset.id}>
              <Link
                href={assetHref(row.asset.assetClass, row.asset.id)}
                className="group flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-muted/60"
              >
                <span className="tabular w-4 shrink-0 text-xs text-ink-muted">{index + 1}</span>
                <AssetLogo asset={row.asset} size={22} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-brand-strong">
                  {row.asset.name}
                </span>
                <span className="tabular w-16 shrink-0 text-right text-xs font-medium text-ink">
                  {row.ratio.toFixed(0)} %
                </span>
                <span className="w-20 shrink-0 text-right">
                  <ChangeBadge
                    value={row.asset[field] as number | undefined}
                    periodLabel={periodLabel}
                    size="sm"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
