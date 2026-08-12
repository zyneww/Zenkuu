'use client'

import { Link } from '@/i18n/navigation'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, EmptyState, Sparkline } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'

/**
 * Tableau d'exploration de l'accueil.
 *
 * Onglets de tri, recherche et sélecteur de période, comme sur une page
 * d'exploration d'actifs. Tout est CÔTÉ CLIENT sur l'univers déjà chargé : ces
 * lignes sont dans le HTML initial, et un aller-retour serveur pour les réordonner
 * serait une latence sans contrepartie.
 *
 * La colonne de variation suit la période choisie, ce qui évite d'empiler trois
 * colonnes de pourcentages dont deux ne servent à rien à un instant donné.
 */

type Tab = 'marketCap' | 'gainers' | 'losers' | 'volume'

const TABS: { key: Tab; label: string }[] = [
  { key: 'marketCap', label: 'Capitalisation' },
  { key: 'gainers', label: 'En hausse' },
  { key: 'losers', label: 'En baisse' },
  { key: 'volume', label: 'Volume' },
]

const PERIODS: { key: string; label: string; field: keyof MarketAsset; long: string }[] = [
  { key: '1h', label: '1 h', field: 'change1h', long: 'sur 1 heure' },
  { key: '24h', label: '24 h', field: 'change24h', long: 'sur 24 heures' },
  { key: '7d', label: '7 j', field: 'change7d', long: 'sur 7 jours' },
]

const PAGE_SIZE = 15

export function ExploreTable({
  assets,
  title = 'Explorer les cryptomonnaies',
  moreHref = '/crypto',
}: {
  assets: MarketAsset[]
  /** Le tableau sert désormais toutes les classes d'actifs : le titre les suit. */
  title?: string
  /** Classement complet de la classe affichée — paginé et trié côté serveur. */
  moreHref?: string
}) {
  const [tab, setTab] = useState<Tab>('marketCap')
  const [periodKey, setPeriodKey] = useState('24h')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)

  const period = PERIODS.find((entry) => entry.key === periodKey) ?? PERIODS[1]!
  const field = period.field

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? assets.filter((asset) =>
          `${asset.name} ${asset.symbol}`.toLowerCase().includes(needle),
        )
      : assets

    const rated = filtered.filter((asset) => typeof asset[field] === 'number')

    switch (tab) {
      case 'gainers':
        // Filtrage par signe, comme partout : un actif en baisse n'a rien à faire
        // dans « en hausse », même s'il est le moins mauvais du lot.
        return [...rated]
          .filter((asset) => (asset[field] as number) > 0)
          .sort((a, b) => (b[field] as number) - (a[field] as number))
      case 'losers':
        return [...rated]
          .filter((asset) => (asset[field] as number) < 0)
          .sort((a, b) => (a[field] as number) - (b[field] as number))
      case 'volume':
        return [...filtered].sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      default:
        return [...filtered].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    }
  }, [assets, tab, field, query])

  const rows = visible.slice(0, shown)
  const remaining = visible.length - rows.length

  function selectTab(next: Tab) {
    setTab(next)
    setShown(PAGE_SIZE)
  }

  return (
    <section className="space-y-4" aria-labelledby="explorer-titre">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="explorer-titre" className="display-md text-ink">
          {title}
        </h2>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setShown(PAGE_SIZE)
            }}
            placeholder="Filtrer par nom ou symbole…"
            aria-label="Filtrer les actifs affichés"
            className="w-full rounded-card border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Classer par">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => selectTab(entry.key)}
              aria-pressed={tab === entry.key}
              className={`rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                tab === entry.key
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div
          className="ml-auto flex items-center gap-1 rounded-card border border-border-subtle bg-surface p-1"
          role="group"
          aria-label="Période de variation"
        >
          {PERIODS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setPeriodKey(entry.key)}
              aria-pressed={periodKey === entry.key}
              className={`tabular rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                periodKey === entry.key
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun actif ne correspond"
          description="Essayez un autre terme, ou revenez au classement par capitalisation."
          compact
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                  <th scope="col" className="px-3 py-2.5 font-medium">#</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Actif</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Prix</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Variation ({period.label})
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">
                    7 jours
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                    Volume 24 h
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Capitalisation</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-subtle">
                {rows.map((asset, index) => (
                  <tr key={asset.id} className="group transition-colors hover:bg-surface-muted/60">
                    <td className="tabular px-3 py-2.5 text-xs text-ink-muted">{index + 1}</td>

                    <th scope="row" className="px-3 py-2.5 text-left font-normal">
                      <Link
                        href={assetHref(asset.assetClass, asset.id)}
                        className="flex items-center gap-2"
                      >
                        <AssetLogo asset={asset} size={24} />
                        <span className="font-medium text-ink group-hover:text-brand-strong">
                          {asset.name}
                        </span>
                        <span className="text-xs uppercase text-ink-muted">{asset.symbol}</span>
                      </Link>
                    </th>

                    <td className="tabular px-3 py-2.5 text-right font-medium text-ink">
                      <Money value={asset.price} from={asset.currency} />
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <ChangeBadge
                        value={asset[field] as number | undefined}
                        periodLabel={period.long}
                        size="sm"
                      />
                    </td>

                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      {asset.sparkline7d ? (
                        <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                      ) : null}
                    </td>

                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                      <Money value={asset.volume24h} from={asset.currency} compact />
                    </td>

                    <td className="tabular px-3 py-2.5 text-right text-ink">
                      <Money value={asset.marketCap} from={asset.currency} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {remaining > 0 ? (
              <button
                type="button"
                onClick={() => setShown((current) => current + PAGE_SIZE)}
                className="rounded-card border border-border-subtle bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand-strong"
              >
                Afficher {Math.min(PAGE_SIZE, remaining)} actifs de plus
              </button>
            ) : (
              <span />
            )}

            <Link href={moreHref} className="text-sm font-medium text-brand hover:underline">
              Voir toutes les cotations
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
