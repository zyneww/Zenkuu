import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { AssetClass } from '@zenith/data'
import {
  getAsset,
  getAssetHistory,
  getAssetTickers,
  getExchangeRates,
  getPeers,
} from '@zenith/data'
import {
  ChangeBadge,
  EmptyState,
  SourceNote,
  formatCurrency,
  formatRate,
} from '@zenith/ui'

import { AssetLogo } from '@/components/AssetTile'
import { AssetChangeGrid } from '@/components/asset/AssetChangeGrid'
import { AssetConverter } from '@/components/asset/AssetConverter'
import { AssetGlobalPrices } from '@/components/asset/AssetGlobalPrices'
import { AssetKeyStats } from '@/components/asset/AssetKeyStats'
import { AssetMetricCatalogue } from '@/components/asset/AssetMetricCatalogue'
import { AssetRangeBar } from '@/components/asset/AssetRangeBar'
import { AssetTechSheet } from '@/components/asset/AssetTechSheet'
import { AssetTickers } from '@/components/asset/AssetTickers'
import { AssetWorkspace } from '@/components/asset/AssetWorkspace'
import { PriceHistoryTable } from '@/components/asset/PriceHistoryTable'
import { AssetJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { WatchlistButton } from '@/components/watchlist/WatchlistButton'
import { fr } from '@/content/fr'
import { assetHref, marketHref } from '@/lib/asset-routes'
import { getWatchlistState } from '@/lib/watchlist-actions'

/**
 * Fiche d'un actif.
 *
 * DISPOSITION DÉLIBÉRÉMENT DIFFÉRENTE de la référence du secteur, qui empile trois
 * colonnes — rail de statistiques à gauche, graphique au centre, actualités à
 * droite. Ici le graphique passe en bandeau PLEINE LARGEUR juste sous l'en-tête,
 * parce que c'est lui qu'on vient voir ; les repères se déroulent en grille
 * horizontale dessous, puis le contexte se répartit en deux colonnes. Le rail
 * vertical est donc renversé en bandes horizontales : même information, ordre de
 * lecture inverse.
 *
 * Ce qui est repris de la référence, ce sont les FONCTIONNALITÉS — amplitude 24 h,
 * variations multi-fenêtres, valorisation diluée, contrats par chaîne,
 * explorateurs, convertisseur, cours mondiaux, places de cotation. Une convention
 * de contenu se reprend ; une mise en page se réinvente.
 *
 * Trois onglets de la référence sont ABSENTS et le resteront : Tokenomics, Holders
 * et Financials reposent sur des données propriétaires qu'aucune source gratuite ne
 * publie. Les afficher supposerait de les estimer (§5).
 *
 * Aucun tunnel d'achat non plus — c'est ce qui occupe la moitié droite des pages de
 * plateformes d'échange. L'espace libéré revient au graphique et aux repères.
 */

/**
 * Fenêtre rendue côté serveur.
 *
 * Une seule : le reste des périodes est chargé à la demande par le widget client.
 * Servir sept jours au premier rendu donne un graphique déjà peuplé pour le LCP,
 * sans dépenser cinq appels pour des périodes que le visiteur ne regardera peut-être
 * jamais (§9).
 */
const SERVER_RANGE_DAYS = 7

export interface AssetPageViewProps {
  assetClass: AssetClass
  id: string
  searchParams: Record<string, string | string[] | undefined>
}

export async function AssetPageView({ assetClass, id, searchParams }: AssetPageViewProps) {
  const [asset, history, peers, rates, tickers] = await Promise.all([
    getAsset(id, assetClass, 'eur'),
    getAssetHistory(id, assetClass, SERVER_RANGE_DAYS, 'eur'),
    // `getPeers` dérive de l'aperçu déjà mis en cache par l'accueil : les
    // comparables ne coûtent aucun appel réseau supplémentaire — ce qui compte,
    // puisque le palier gratuit de CoinGecko ne tolère qu'une poignée de requêtes
    // par minute (mesuré).
    getPeers(assetClass, id, 6),
    getExchangeRates(),
    // SEUL appel supplémentaire de la fiche, et il est mis en cache 30 minutes :
    // la liste des places et leur poids relatif bougent à l'échelle de la journée.
    // Un fournisseur sans `getTickers` fait disparaître la section.
    //
    // 100 et non 10 : la source renvoie cent lignes dans la même réponse. En jeter
    // quatre-vingt-dix côté serveur n'économisait aucun octet sur le réseau sortant,
    // et privait le tableau de sa pagination et de son filtre par devise.
    getAssetTickers(id, assetClass, 'eur', 100),
  ])

  // Identifiant inconnu de la source : c'est un 404 au sens propre, pas une panne.
  // Renvoyer une page d'erreur laisserait croire à un incident temporaire, et
  // laisserait surtout l'URL indexable pour un actif qui n'existe pas (§9).
  //
  // La condition portait auparavant sur la PRÉSENCE DU MOT « introuvable » dans le
  // message — un test qui ne pouvait jamais réussir, la couche données remplaçant ce
  // message par une phrase générique avant de le remonter. Résultat : toute URL
  // inventée répondait 200. L'état est désormais porté par le type.
  if (!asset.ok && asset.kind === 'notFound') notFound()

  if (!asset.ok) {
    return (
      <EmptyState
        title={fr.asset.notFoundTitle}
        description={asset.reason}
        source={asset.source?.label ?? null}
        tone="warning"
        action={
          <Link href={marketHref(assetClass)} className="text-sm font-medium text-brand-strong underline">
            {fr.asset.backToRanking}
          </Link>
        }
      />
    )
  }

  const data = asset.data
  const isForex = assetClass === 'forex'
  const priceLabel = isForex
    ? formatRate(data.price)
    : formatCurrency(data.price, data.currency)

  const comparables = peers.ok ? peers.data : []

  // État de suivi lu au rendu serveur : le bouton arrive déjà dans le bon état,
  // au lieu de basculer visiblement une fois la page hydratée.
  const watchlist = await getWatchlistState(assetClass, data.id)

  return (
    <div className="space-y-6">
      {/*
        Données structurées : posées ici plutôt que dans chaque page de classe
        d'actif, puisque ce composant sert les six. `Dataset` et non `Product` —
        décrire un cours comme un produit assorti d'une offre ferait apparaître
        ZENITH comme un point de vente dans les résultats de recherche, ce que le §7
        interdit.
      */}
      {asset.source ? (
        <AssetJsonLd
          name={data.name}
          symbol={data.symbol}
          path={assetHref(assetClass, data.id)}
          description={data.description}
          sourceName={asset.source.label}
          sourceUrl={asset.source.attributionUrl}
          updatedAt={data.lastUpdated}
        />
      ) : null}

      <BreadcrumbJsonLd
        items={[
          { name: fr.nav.home, path: '/' },
          { name: fr.assetClass[assetClass], path: marketHref(assetClass) },
          { name: data.name, path: assetHref(assetClass, data.id) },
        ]}
      />

      <Breadcrumb assetClass={assetClass} name={data.name} />

      {/* ── En-tête : identité et cours ─────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <AssetLogo asset={data} size={48} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {data.name}{' '}
              <span className="text-lg font-medium uppercase text-ink-muted">{data.symbol}</span>
            </h1>
            {data.rank !== undefined ? (
              <p className="text-xs text-ink-muted">
                {fr.asset.stats.rank} #{data.rank}
                {data.exchange ? ` · ${data.exchange}` : ''}
              </p>
            ) : data.exchange ? (
              <p className="text-xs text-ink-muted">{data.exchange}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="tabular text-3xl font-bold text-ink">
            {priceLabel}
            {isForex ? <span className="ml-1 text-base text-ink-muted">{data.currency}</span> : null}
          </p>
          <ChangeBadge value={data.change24h} periodLabel={data.changePeriodLabel} filled />

          <WatchlistButton
            assetClass={assetClass}
            assetId={data.id}
            label={data.name}
            {...(data.symbol ? { symbol: data.symbol } : {})}
            path={assetHref(assetClass, data.id)}
            initialFollowing={watchlist.following}
            signedIn={watchlist.available}
          />
        </div>
      </header>

      {/* Position du cours dans son amplitude, accolée au prix : c'est le seul
          élément dont l'emplacement est dicté par la lecture et non par le style —
          un curseur ne situe rien s'il est éloigné du chiffre qu'il situe. */}
      <AssetRangeBar asset={data} isRate={isForex} />

      {/* ── Graphique PLEINE LARGEUR ────────────────────────────────────────────
          C'est le renversement principal par rapport aux fiches du secteur, qui le
          coincent dans une colonne centrale entre deux rails. Il occupe ici toute
          la largeur parce que c'est l'élément qu'on vient consulter ; le reste se
          lit après lui, jamais à côté. */}
      <section className="space-y-3">
        <AssetWorkspace
          asset={data}
          assetClass={assetClass}
          initialHistory={history.ok ? history.data : null}
          initialDays={SERVER_RANGE_DAYS}
          rates={rates.ok ? rates.data : null}
        />

        {history.ok ? (
          <SourceNote
            label={history.source.label}
            href={history.source.attributionUrl}
            updatedAt={data.lastUpdated}
          />
        ) : null}
      </section>

      {/* Variations puis repères, en bandes horizontales : le rail vertical de la
          référence, couché. Même information, ordre de lecture inverse. */}
      <AssetChangeGrid asset={data} />

      <AssetKeyStats asset={data} assetClass={assetClass} />

      {tickers.ok && tickers.data.length > 0 ? (
        <AssetTickers tickers={tickers.data} assetName={data.name} />
      ) : null}

      {/* ── Contexte : deux colonnes ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {data.description ? (
            <section className="space-y-3">
              <h2 className="display-sm text-ink">À propos {frenchOf(data.name)}</h2>
              {/* `whitespace-pre-line` : la source sépare ses paragraphes par des
                  sauts de ligne, pas par du balisage. Sans cette règle, le texte
                  arriverait en un seul pavé compact. */}
              <p className="max-w-2xl whitespace-pre-line text-base leading-relaxed text-ink-muted">
                {data.description}
              </p>
            </section>
          ) : null}

          <AssetTechSheet asset={data} />

          {/* Le graphique donne une forme, ce tableau donne les nombres. */}
          {history.ok ? (
            <PriceHistoryTable
              history={history.data}
              currency={data.currency}
              isRate={isForex}
            />
          ) : null}
        </div>

        <aside className="space-y-8">
          {data.pricesByCurrency ? (
            <>
              <AssetConverter symbol={data.symbol} pricesByCurrency={data.pricesByCurrency} />
              <AssetGlobalPrices symbol={data.symbol} pricesByCurrency={data.pricesByCurrency} />
            </>
          ) : null}

          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">{fr.asset.similarTitle}</h2>
              <Link
                href={marketHref(assetClass)}
                className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
              >
                {fr.home.seeAll}
              </Link>
            </div>

            {comparables.length > 0 ? (
              <ul className="divide-y divide-border-subtle">
                {comparables.map((peer) => (
                  <li key={peer.id}>
                    <Link
                      href={assetHref(peer.assetClass, peer.id)}
                      className="flex items-center gap-3 py-2 transition-opacity hover:opacity-75"
                    >
                      <AssetLogo asset={peer} size={22} />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{peer.name}</span>
                      <span className="shrink-0 text-right">
                        <span className="tabular block text-xs text-ink">
                          {peer.assetClass === 'forex'
                            ? formatRate(peer.price)
                            : formatCurrency(peer.price, peer.currency)}
                        </span>
                        <ChangeBadge value={peer.change24h} size="sm" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={fr.states.unavailableTitle} compact />
            )}
          </section>

          {/* Rappel du positionnement : sur une page de cotation, c'est exactement
              là que les plateformes d'échange placent leur bouton d'achat. */}
          <p className="rounded-card border border-border-subtle bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
            {fr.asset.readOnly}
          </p>
        </aside>
      </div>
    </div>
  )
}

/**
 * Élision de « de » devant un nom d'actif.
 *
 * Les noms viennent de la source et couvrent des milliers d'actifs : « À propos de
 * Aave » se lit comme une chaîne assemblée par une machine, ce qui est précisément
 * l'impression à éviter. La règle porte sur le SON initial, d'où le « h » traité
 * comme une voyelle — « d'Hedera » et non « de Hedera ».
 */
function frenchOf(name: string): string {
  return /^[aeiouyàâéèêëîïôöûüh]/i.test(name) ? `d’${name}` : `de ${name}`
}

function Breadcrumb({ assetClass, name }: { assetClass: AssetClass; name: string }) {
  return (
    <nav aria-label="Fil d’Ariane" className="text-xs text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-brand-strong">
            {fr.nav.home}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href={marketHref(assetClass)} className="hover:text-brand-strong">
            {fr.assetClass[assetClass]}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="font-medium text-ink" aria-current="page">
          {name}
        </li>
      </ol>
    </nav>
  )
}
