import Link from 'next/link'

import type { AssetClass, MarketAsset } from '@zenith/data'
import { ChangeBadge, Sparkline, formatCurrency, formatRate } from '@zenith/ui'

import { AssetLogo } from '@/components/AssetTile'
import { fr } from '@/content/fr'
import { assetHref } from '@/lib/asset-routes'

export type MarketSort = 'marketCap' | 'volume24h'
export type SortDirection = 'asc' | 'desc'

interface MarketTableProps {
  assets: MarketAsset[]
  assetClass: AssetClass
  page: number
  perPage: number
  sortBy: MarketSort
  direction: SortDirection
  /** Le fournisseur sait-il trier sur l'ensemble du classement ? */
  sortable: boolean
  /** Pagination masquée pour les univers courts (devises, indices…). */
  paginated: boolean
  basePath: string
}

function buildHref(
  basePath: string,
  params: { page: number; sortBy: MarketSort; direction: SortDirection },
): string {
  const query = new URLSearchParams()
  if (params.page > 1) query.set('page', String(params.page))
  if (params.sortBy !== 'marketCap') query.set('tri', 'volume')
  if (params.direction !== 'desc') query.set('sens', 'asc')

  const search = query.toString()
  return search ? `${basePath}?${search}` : basePath
}

export function MarketTable({
  assets,
  assetClass,
  page,
  perPage,
  sortBy,
  direction,
  sortable,
  paginated,
  basePath,
}: MarketTableProps) {
  /**
   * Colonnes déduites de la donnée réellement présente.
   *
   * Une paire de devises n'a ni capitalisation ni volume, un contrat à terme n'a pas
   * de capitalisation. Plutôt que d'aligner des « — » sur toute une colonne, on ne
   * l'affiche pas du tout : c'est la traduction en tableau de la règle §5, et cela
   * évite d'écrire une exception par classe d'actif.
   */
  const has = (field: keyof MarketAsset) => assets.some((asset) => asset[field] !== undefined)
  const showMarketCap = has('marketCap')
  const showVolume = has('volume24h')
  const show7d = has('change7d')
  const showChart = has('sparkline7d')
  const showRank = has('rank')
  const isForex = assetClass === 'forex'

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{fr.assetClass[assetClass]}</caption>

          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
              {showRank ? (
                <th scope="col" className="px-3 py-2.5 font-medium">
                  {fr.market.columns.rank}
                </th>
              ) : null}
              <th scope="col" className="px-3 py-2.5 font-medium">
                {fr.market.columns.name}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                {fr.market.columns.price}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                {fr.market.columns.change24h}
              </th>
              {show7d ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                  {fr.market.columns.change7d}
                </th>
              ) : null}
              {showVolume ? (
                <SortableHeader
                  label={fr.market.columns.volume}
                  field="volume24h"
                  activeField={sortBy}
                  direction={direction}
                  sortable={sortable}
                  basePath={basePath}
                  className="hidden md:table-cell"
                />
              ) : null}
              {showMarketCap ? (
                <SortableHeader
                  label={fr.market.columns.marketCap}
                  field="marketCap"
                  activeField={sortBy}
                  direction={direction}
                  sortable={sortable}
                  basePath={basePath}
                />
              ) : null}
              {showChart ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">
                  {fr.market.columns.chart}
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {assets.map((asset) => {
              const href = assetHref(asset.assetClass, asset.id)

              return (
                <tr key={asset.id} className="group transition-colors hover:bg-surface-muted/60">
                  {showRank ? (
                    <td className="tabular px-3 py-2.5 text-xs text-ink-muted">
                      {asset.rank ?? '—'}
                    </td>
                  ) : null}

                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    {/* Le lien porte sur le nom plutôt que sur la ligne entière : une
                        ligne cliquable empêche de sélectionner un chiffre à la souris
                        et n'est pas atteignable proprement au clavier. */}
                    <Link href={href} className="flex items-center gap-2">
                      <AssetLogo asset={asset} size={24} />
                      <span className="font-medium text-ink group-hover:text-brand-strong">
                        {asset.name}
                      </span>
                      <span className="text-xs uppercase text-ink-muted">{asset.symbol}</span>
                    </Link>
                  </th>

                  <td className="tabular px-3 py-2.5 text-right font-medium text-ink">
                    {isForex
                      ? formatRate(asset.price)
                      : formatCurrency(asset.price, asset.currency)}
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <ChangeBadge
                      value={asset.change24h}
                      periodLabel={asset.changePeriodLabel}
                      size="sm"
                    />
                  </td>

                  {show7d ? (
                    <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                      <ChangeBadge value={asset.change7d} periodLabel="sur 7 jours" size="sm" />
                    </td>
                  ) : null}

                  {showVolume ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                      {formatCurrency(asset.volume24h, asset.currency, { compact: true }) ?? '—'}
                    </td>
                  ) : null}

                  {showMarketCap ? (
                    <td className="tabular px-3 py-2.5 text-right text-ink">
                      {formatCurrency(asset.marketCap, asset.currency, { compact: true }) ?? '—'}
                    </td>
                  ) : null}

                  {showChart ? (
                    <td className="hidden px-3 py-2.5 text-right lg:table-cell">
                      <span className="inline-flex justify-end">
                        <Sparkline
                          values={asset.sparkline7d}
                          label={`Évolution de ${asset.name}`}
                        />
                      </span>
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sortable ? <p className="text-xs text-ink-muted">{fr.market.sortNotSupported}</p> : null}

      {paginated ? (
        <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
          <PaginationLink
            href={buildHref(basePath, { page: page - 1, sortBy, direction })}
            disabled={page <= 1}
            label={fr.market.previous}
          />
          <span className="tabular text-sm text-ink-muted">{fr.market.pageLabel(page)}</span>
          <PaginationLink
            // On ne connaît pas le nombre total de pages : la source ne le renvoie
            // pas. On propose « suivant » tant que la page est pleine, plutôt que
            // d'afficher un total estimé qui serait faux.
            href={buildHref(basePath, { page: page + 1, sortBy, direction })}
            disabled={assets.length < perPage}
            label={fr.market.next}
          />
        </nav>
      ) : null}
    </div>
  )
}

interface SortableHeaderProps {
  label: string
  field: MarketSort
  activeField: MarketSort
  direction: SortDirection
  sortable: boolean
  basePath: string
  className?: string
}

function SortableHeader({
  label,
  field,
  activeField,
  direction,
  sortable,
  basePath,
  className = '',
}: SortableHeaderProps) {
  if (!sortable) {
    return (
      <th scope="col" className={`px-3 py-2.5 text-right font-medium ${className}`}>
        {label}
      </th>
    )
  }

  const isActive = activeField === field
  // Cliquer sur la colonne active inverse le sens ; changer de colonne repart en
  // décroissant, l'ordre attendu par défaut pour un classement de marché.
  const nextDirection: SortDirection = isActive && direction === 'desc' ? 'asc' : 'desc'

  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-right font-medium ${className}`}
      aria-sort={isActive ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <Link
        // Le tri renvoie toujours en page 1 : rester en page 7 après un changement de
        // critère afficherait un extrait arbitraire d'un classement différent.
        href={buildHref(basePath, { page: 1, sortBy: field, direction: nextDirection })}
        className={`inline-flex items-center gap-1 hover:text-brand-strong ${isActive ? 'text-ink' : ''}`}
        title={field === 'marketCap' ? fr.market.sortByMarketCap : fr.market.sortByVolume}
      >
        {label}
        <span aria-hidden="true" className="text-[0.6em]">
          {isActive ? (direction === 'desc' ? '▼' : '▲') : '⇅'}
        </span>
      </Link>
    </th>
  )
}

function PaginationLink({
  href,
  disabled,
  label,
}: {
  href: string
  disabled: boolean
  label: string
}) {
  if (disabled) {
    return (
      <span className="rounded-card border border-border-subtle px-3 py-1.5 text-sm text-ink-muted/50">
        {label}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className="rounded-card border border-border-subtle bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:text-brand-strong"
    >
      {label}
    </Link>
  )
}
