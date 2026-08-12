'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import type { ChangePeriod } from '@/components/market/crypto-views'
import {
  MarketTable,
  type MarketSort,
  type SortDirection,
  type WatchlistContext,
} from '@/components/market/MarketTable'

type QuickView = 'all' | 'gainers' | 'losers'

const QUICK_VIEWS: { key: QuickView; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'gainers', label: 'En hausse' },
  { key: 'losers', label: 'En baisse' },
]

interface MarketBrowserProps {
  assets: MarketAsset[]
  assetClass: AssetClass
  page: number
  perPage: number
  sortBy: MarketSort
  direction: SortDirection
  sortable: boolean
  paginated: boolean
  basePath: string
  period?: ChangePeriod
  watchlist?: WatchlistContext
  chartPosition?: 'inline' | 'end'
  /**
   * Vues rapides « Tous / En hausse / En baisse ».
   *
   * Désactivées sur la page crypto, où des onglets « Gagnants » et « Perdants »
   * remplissent déjà ce rôle — et le remplissent MIEUX : ils classent l'univers
   * entier côté serveur, là où ces boutons ne filtrent que les lignes de la page
   * affichée. Laisser les deux offrirait au lecteur deux réponses différentes à la
   * même question.
   */
  quickViews?: boolean
}

/**
 * Barre d'outils du classement : recherche et vues rapides.
 *
 * Portée VOLONTAIREMENT limitée à la page affichée, et c'est dit à l'écran. Un
 * filtre qui ne porte que sur 50 lignes sur plusieurs milliers serait trompeur s'il
 * se présentait comme une recherche globale : la recherche universelle de l'en-tête
 * existe précisément pour ça, et le message renvoie vers elle quand rien ne
 * correspond.
 *
 * Le tri, lui, reste côté serveur via l'URL : c'est le seul moyen de trier
 * réellement l'ensemble du classement, et cela garde les vues triées partageables et
 * indexables.
 *
 * Ce composant est client, donc `MarketTable` l'est aussi par transitivité. Aucun
 * effet sur le référencement : Next.js rend les composants client dans le HTML
 * initial — le tableau part complet, la recherche s'y greffe après hydratation.
 */
export function MarketBrowser({
  assets,
  quickViews = true,
  ...tableProps
}: MarketBrowserProps) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<QuickView>('all')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return assets.filter((asset) => {
      if (needle) {
        const haystack = `${asset.name} ${asset.symbol}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }

      // Une variation absente n'est ni une hausse ni une baisse : elle sort des deux
      // vues filtrées plutôt que d'être comptée arbitrairement comme nulle.
      if (view === 'gainers') return (asset.change24h ?? 0) > 0
      if (view === 'losers') return (asset.change24h ?? 0) < 0
      return true
    })
  }, [assets, query, view])

  const filtering = query.trim().length > 0 || view !== 'all'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer cette page…"
            aria-label="Filtrer les actifs affichés sur cette page"
            className="w-full rounded-card border border-border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>

        {quickViews ? (
          <div className="flex items-center gap-1" role="group" aria-label="Vue rapide">
            {QUICK_VIEWS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setView(entry.key)}
                aria-pressed={view === entry.key}
                className={`rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  view === entry.key
                    ? 'bg-brand-soft text-brand-strong'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {filtering ? (
        <p className="text-xs text-ink-muted" aria-live="polite">
          {visible.length} sur {assets.length} actif{assets.length > 1 ? 's' : ''} de cette page.
          Le filtre ne porte pas sur l’ensemble du classement.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="Aucun actif ne correspond sur cette page"
          description="Le filtre ne s’applique qu’aux lignes affichées. Utilisez la recherche de l’en-tête pour chercher dans l’ensemble des actifs suivis."
          compact
        />
      ) : (
        <MarketTable assets={visible} {...tableProps} />
      )}
    </div>
  )
}
