import type { AssetClass } from '@zenkuu/data'
import { getRanking } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetClassTabs } from '@/components/market/AssetClassTabs'
import { MarketBrowser } from '@/components/market/MarketBrowser'
import { MarketHighlights } from '@/components/market/MarketHighlights'
import { MarketStatsStrip } from '@/components/market/MarketStatsStrip'
import type { MarketSort, SortDirection } from '@/components/market/MarketTable'
import { getContent } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'
import { getWatchlistIds } from '@/lib/watchlist-actions'

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
  /** Surcharge la taille de page par défaut de la classe (voir `/classements`). */
  perPage?: number
  /** Surcharge la base des liens de tri et de pagination, pour les pages dérivées. */
  basePath?: string
  /** Destination des onglets de classe — voir `AssetClassTabs`. */
  classHref?: (assetClass: AssetClass) => string
  /**
   * Barre d'onglets de REMPLACEMENT.
   *
   * Les six pages de classement veulent `AssetClassTabs`, qui renvoie vers les pages
   * dédiées. « Parcourir » veut la sienne, qui reste sur place et porte un onglet
   * supplémentaire (les dérivés) dont `AssetClassTabs` ne sait rien — et ne doit rien
   * savoir, puisqu'il énumère des CLASSES et qu'un contrat n'en est pas une.
   *
   * Un nœud déjà rendu plutôt qu'un drapeau : ce composant n'a pas à connaître la
   * liste des barres possibles, seulement où poser celle qu'on lui donne.
   *
   * `null` SUPPRIME la barre au lieu d'en poser une. C'est ce dont « Parcourir » a
   * besoin : sa barre porte un trait qui GLISSE d'un onglet à l'autre, et un trait ne
   * glisse que si son nœud survit à la navigation. Rendue ici, elle serait remontée
   * puis démontée à chaque passage entre les dérivés et une classe d'actif, qui ne
   * traversent pas le même arbre — le trait sauterait au lieu de parcourir.
   *
   * D'où la distinction entre `undefined` (aucun avis, on met la barre par défaut) et
   * `null` (avis explicite : pas de barre ici).
   */
  tabs?: React.ReactNode | null
  /** Inséré entre les onglets et le bandeau de points saillants. */
  children?: React.ReactNode
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
  perPage,
  basePath,
  classHref,
  tabs,
  children,
}: MarketPageViewProps) {
  const fr = await getContent()
  const base = CONFIG[assetClass]
  const config = { ...base, perPage: perPage ?? base.perPage }
  const listPath = basePath ?? marketHref(assetClass)
  const page = readPage(searchParams['page'])
  const sortBy: MarketSort = searchParams['tri'] === 'volume' ? 'volume24h' : 'marketCap'
  const direction: SortDirection = searchParams['sens'] === 'asc' ? 'asc' : 'desc'

  /*
   * LE CLASSEMENT ET LA LISTE DE SUIVI PARTENT ENSEMBLE.
   *
   * `getWatchlistIds` lit la liste complète de la classe en UNE requête — voir son
   * en-tête, qui explique pourquoi `getWatchlistState` (un appel par actif) serait
   * ruineux ici. Sans base configurée, elle rend `available: false` et les étoiles se
   * rendent inertes plutôt que d'apparaître puis d'échouer au clic.
   *
   * `Promise.all` et non deux `await` : la liste de suivi vit dans notre base, le
   * classement chez un fournisseur distant. Les enchaîner ferait attendre l'un pour
   * l'autre sans qu'aucun ne dépende du résultat du premier.
   */
  const [ranking, watchlist] = await Promise.all([
    getRanking({
      assetClass,
      page,
      perPage: config.perPage,
      sortBy,
      sortDirection: direction,
      currency: 'eur',
    }),
    getWatchlistIds(assetClass),
  ])

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>
      </header>

      {/* Navigation inter-classes : le passage de /crypto à /actions ne devrait pas
          imposer un détour par le menu de l'en-tête. */}
      {tabs === undefined ? (
        <AssetClassTabs current={assetClass} {...(classHref ? { hrefFor: classHref } : {})} />
      ) : (
        tabs
      )}

      {children}

      {ranking.ok && ranking.data.length > 0 ? (
        <>
          {/* Bandeau AVANT la bande de statistiques : il répond à « que s'est-il
              passé ? », elle à « sur quoi porte ce que je lis ? ». La question du
              lecteur vient dans cet ordre. */}
          <MarketHighlights assets={ranking.data} assetClass={assetClass} />

          <MarketStatsStrip
            assets={ranking.data}
            scopeLabel={
              config.paginated
                ? `les ${ranking.data.length} actifs de cette page`
                : `les ${ranking.data.length} actifs suivis dans cette classe`
            }
          />

          <MarketBrowser
            assets={ranking.data}
            assetClass={assetClass}
            page={page}
            perPage={config.perPage}
            sortBy={sortBy}
            direction={direction}
            sortable={config.sortable}
            paginated={config.paginated}
            basePath={listPath}
            watchlist={watchlist}
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
