import type { AssetClass } from '@zenith/data'
import { getRanking } from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { MarketTable, type MarketSort, type SortDirection } from '@/components/market/MarketTable'
import { fr } from '@/content/fr'
import { marketHref } from '@/lib/asset-routes'

/**
 * Corps commun à toutes les pages de classement.
 *
 * Les six classes d'actifs partagent exactement la même page ; seuls changent le
 * fournisseur interrogé, la taille de l'univers et les colonnes disponibles. Écrire
 * six pages quasi identiques garantirait qu'elles divergent au premier correctif —
 * on centralise donc ici, et chaque route ne fournit que ses libellés.
 */

/**
 * Réglages par classe.
 *
 * `sortable` traduit une réalité de la source : seul CoinGecko sait trier
 * l'intégralité du marché côté serveur. Les univers Yahoo sont récupérés en entier,
 * donc déjà complets — mais ils n'ont ni capitalisation ni pagination, ce qui rend
 * les en-têtes de tri sans objet.
 */
const CONFIG: Record<
  AssetClass,
  { perPage: number; sortable: boolean; paginated: boolean }
> = {
  crypto: { perPage: 50, sortable: true, paginated: true },
  forex: { perPage: 20, sortable: false, paginated: false },
  stock: { perPage: 20, sortable: false, paginated: false },
  etf: { perPage: 20, sortable: false, paginated: false },
  commodity: { perPage: 20, sortable: false, paginated: false },
  index: { perPage: 20, sortable: false, paginated: false },
  nft: { perPage: 20, sortable: false, paginated: false },
}

const MAX_PAGE = 100

export interface MarketPageViewProps {
  assetClass: AssetClass
  title: string
  subtitle: string
  searchParams: Record<string, string | string[] | undefined>
}

/** Lecture défensive des paramètres d'URL : ils sont saisissables à la main. */
function readPage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isInteger(value) || value < 1) return 1
  return Math.min(value, MAX_PAGE)
}

export async function MarketPageView({
  assetClass,
  title,
  subtitle,
  searchParams,
}: MarketPageViewProps) {
  const config = CONFIG[assetClass]
  const page = readPage(searchParams['page'])
  const sortBy: MarketSort = searchParams['tri'] === 'volume' ? 'volume24h' : 'marketCap'
  const direction: SortDirection = searchParams['sens'] === 'asc' ? 'asc' : 'desc'

  const ranking = await getRanking({
    assetClass,
    page,
    perPage: config.perPage,
    sortBy,
    sortDirection: direction,
    currency: 'eur',
  })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </header>

      {ranking.ok && ranking.data.length > 0 ? (
        <>
          <MarketTable
            assets={ranking.data}
            assetClass={assetClass}
            page={page}
            perPage={config.perPage}
            sortBy={sortBy}
            direction={direction}
            sortable={config.sortable}
            paginated={config.paginated}
            basePath={marketHref(assetClass)}
          />
          <SourceNote
            label={ranking.source.label}
            href={ranking.source.attributionUrl}
            updatedAt={ranking.data[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          // Une page vide au-delà du dernier rang n'est pas une panne : on le dit
          // plutôt que d'afficher un message d'erreur alarmant.
          description={ranking.ok ? fr.market.emptyPage : ranking.reason}
          source={ranking.source?.label ?? null}
          tone={ranking.ok ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}
