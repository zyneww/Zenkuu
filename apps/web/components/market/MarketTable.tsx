'use client'

/*
 * Composant CLIENT, et il faut dire pourquoi — la directive n'a pas été ajoutée par
 * préférence mais par nécessité.
 *
 * `MarketBrowser` est marqué « use client » et importe ce tableau : il entre donc
 * dans le graphe client, que ce fichier le déclare ou non. Tant qu'il lisait un
 * dictionnaire figé, cela ne se voyait pas. Depuis qu'il lit le dictionnaire de la
 * requête, la version serveur (`await getContent()`) lève à l'exécution —
 * « getLocale is not supported in Client Components » — et fait tomber toutes les
 * pages de classement.
 *
 * Il lit donc le dictionnaire par contexte, comme les autres composants client. La
 * directive explicite évite en prime qu'un futur import depuis un composant serveur
 * ne recrée l'ambiguïté.
 */

import { Link } from '@/i18n/navigation'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { ChangeBadge, Sparkline } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { periodMeta, type ChangePeriod } from '@/components/market/crypto-views'
import { Pagination } from '@/components/ui/Pagination'
import { WatchlistStar } from '@/components/watchlist/WatchlistStar'
import { useContent } from '@/components/locale/ContentProvider'
import { assetHref } from '@/lib/asset-routes'

export type MarketSort = 'marketCap' | 'volume24h'
export type SortDirection = 'asc' | 'desc'

/** Liste de suivi de l'utilisateur, pour la colonne d'étoiles. */
export interface WatchlistContext {
  /** Faux sans compte ou sans base : l'étoile devient un lien vers la connexion. */
  available: boolean
  ids: string[]
}

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
  /**
   * Période de variation à afficher, quand la page en propose un sélecteur.
   *
   * Absente, le tableau garde ses DEUX colonnes historiques (24 h et 7 j) : c'est le
   * comportement des cinq autres classes d'actifs, qui n'ont pas de sélecteur et
   * gagnent à montrer les deux fenêtres d'un coup d'œil. Présente, elle les remplace
   * par une colonne unique — empiler un sélecteur ET deux colonnes fixes ferait
   * afficher trois fois la même nature d'information.
   */
  period?: ChangePeriod
  /** Fournie, une colonne d'étoiles de suivi est ajoutée en fin de ligne. */
  watchlist?: WatchlistContext
  /**
   * Position de la colonne graphique.
   *
   * `inline` la place juste après la variation, au milieu du tableau — la courbe
   * illustre alors la variation qu'elle jouxte. `end` la renvoie en fin de ligne,
   * où elle se lit comme une vignette de complément.
   */
  chartPosition?: 'inline' | 'end'
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
  period,
  watchlist,
  chartPosition = 'end',
}: MarketTableProps) {
  const fr = useContent()
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
  const showChart = has('sparkline7d')
  const showRank = has('rank')
  const isForex = assetClass === 'forex'

  /**
   * Colonne de variation : une seule pilotée par le sélecteur, ou les deux fenêtres
   * fixes historiques. La seconde branche reste le défaut des classes sans sélecteur.
   */
  const selected = period ? periodMeta(period) : null
  const show7d = !selected && has('change7d')

  // La colonne graphique se place à un seul des deux endroits, jamais aux deux.
  const chartInline = showChart && chartPosition === 'inline'
  const chartAtEnd = showChart && chartPosition === 'end'
  const followed = new Set(watchlist?.ids ?? [])

  /**
   * Amplitude 24 h — colonne propre aux classes SANS capitalisation.
   *
   * Yahoo ne publie pas la capitalisation des actions, ETF, indices et matières
   * premières (elle vit dans `quoteSummary`, fermé aux clients non authentifiés).
   * Leur tableau perdait donc une colonne sans rien gagner en échange. L'amplitude
   * du jour est en revanche disponible, et c'est une information utile sur ces
   * classes : elle situe le cours dans la séance.
   *
   * Elle n'est pas affichée en plus de la capitalisation mais À SA PLACE — empiler
   * les deux ferait déborder le tableau sur mobile sans bénéfice de lecture.
   */
  const showDayRange = !showMarketCap && has('high24h') && has('low24h')

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
                {selected
                  ? `${fr.market.columns.variation} (${selected.label})`
                  : fr.market.columns.change24h}
              </th>
              {show7d ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                  {fr.market.columns.change7d}
                </th>
              ) : null}
              {chartInline ? (
                <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">
                  {fr.market.columns.chart}
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
              {showDayRange ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                  {fr.market.columns.dayRange}
                </th>
              ) : null}
              {chartAtEnd ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">
                  {fr.market.columns.chart}
                </th>
              ) : null}
              {watchlist ? (
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  <span className="sr-only">{fr.market.columns.watch}</span>
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
                    <Money value={asset.price} from={asset.currency} asRate={isForex} />
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <ChangeBadge
                      value={selected ? asset[selected.field] : asset.change24h}
                      // Hors sélecteur, la source peut déclarer couvrir autre chose
                      // que 24 h (la BCE ne publie qu'un taux par jour ouvré) : on
                      // reprend alors son libellé plutôt que d'affirmer « 24 h ».
                      periodLabel={selected ? selected.longLabel : asset.changePeriodLabel}
                      size="sm"
                    />
                  </td>

                  {show7d ? (
                    <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                      <ChangeBadge value={asset.change7d} periodLabel="sur 7 jours" size="sm" />
                    </td>
                  ) : null}

                  {chartInline ? (
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                    </td>
                  ) : null}

                  {showVolume ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                      <Money value={asset.volume24h} from={asset.currency} compact />
                    </td>
                  ) : null}

                  {showMarketCap ? (
                    <td className="tabular px-3 py-2.5 text-right text-ink">
                      <Money value={asset.marketCap} from={asset.currency} compact />
                    </td>
                  ) : null}

                  {showDayRange ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-xs text-ink-muted md:table-cell">
                      {asset.low24h !== undefined && asset.high24h !== undefined ? (
                        <>
                          <Money value={asset.low24h} from={asset.currency} asRate={isForex} />
                          <span aria-hidden="true"> – </span>
                          <Money value={asset.high24h} from={asset.currency} asRate={isForex} />
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}

                  {chartAtEnd ? (
                    <td className="hidden px-3 py-2.5 text-right lg:table-cell">
                      <span className="inline-flex justify-end">
                        <Sparkline
                          values={asset.sparkline7d}
                          label={`Évolution de ${asset.name}`}
                        />
                      </span>
                    </td>
                  ) : null}

                  {watchlist ? (
                    <td className="px-3 py-2.5 text-right">
                      <WatchlistStar
                        assetClass={asset.assetClass}
                        assetId={asset.id}
                        label={asset.name}
                        symbol={asset.symbol}
                        path={basePath}
                        initialFollowing={followed.has(asset.id)}
                        available={watchlist.available}
                      />
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sortable ? <p className="text-xs text-ink-muted">{fr.market.sortNotSupported}</p> : null}

      {/*
        LE TOTAL EST INCONNU, ET LA BARRE LE SAIT.

        La source pagine elle-même et ne renvoie jamais le nombre d'actifs qu'elle
        détient. `Pagination` reçoit donc `count` + `hasNext` plutôt que `total` : elle
        n'écrit pas « sur 12 500 » et ne numérote que les pages démontrées.

        `hasNext` se lit sur la PLÉNITUDE de la page. Une page pleine implique une
        suivante ; une page incomplète est la dernière. C'est la seule déduction que la
        réponse autorise, et elle est exacte — sauf au cas où le total serait un multiple
        exact de la taille de page, où l'on proposera une dernière page vide. Elle
        s'annoncera alors elle-même comme telle, ce qui reste préférable à masquer une
        page qui existe.

        `hrefFor` et non un rappel : la page vit dans l'adresse, chaque cran est donc un
        vrai lien — ouvrable dans un onglet, indexable, fonctionnel sans JavaScript.
      */}
      {paginated ? (
        <Pagination
          page={page}
          perPage={perPage}
          count={assets.length}
          hasNext={assets.length >= perPage}
          unit="actif"
          hrefFor={(target) => buildHref(basePath, { page: target, sortBy, direction })}
        />
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
  const fr = useContent()
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

