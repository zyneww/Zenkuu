import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { AssetClass, MarketAsset } from '@zenith/data'
import { getAsset, getAssetHistory, getExchangeRates, getPeers } from '@zenith/data'
import {
  Card,
  CardHeader,
  ChangeBadge,
  EmptyState,
  SourceNote,
  formatCurrency,
  formatRate,
} from '@zenith/ui'

import { AssetLogo } from '@/components/AssetTile'
import { AssetWorkspace } from '@/components/asset/AssetWorkspace'
import { fr } from '@/content/fr'
import { assetHref, marketHref } from '@/lib/asset-routes'

/**
 * Fiche d'un actif — structure inspirée des pages de cotation de Kraken.
 *
 * On en reprend l'ordre de lecture, qui est le bon : identité et prix d'abord,
 * graphique ensuite, statistiques, puis contexte éditorial et comparables. On en
 * retire évidemment tout le tunnel d'achat — ZENITH n'exécute aucun ordre (§7), et
 * c'est précisément cette partie-là qui occupe la moitié droite de leurs pages.
 * L'espace ainsi libéré revient au graphique et aux statistiques.
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
  const [asset, history, peers, rates] = await Promise.all([
    getAsset(id, assetClass, 'eur'),
    getAssetHistory(id, assetClass, SERVER_RANGE_DAYS, 'eur'),
    // `getPeers` dérive de l'aperçu déjà mis en cache par l'accueil : les
    // comparables ne coûtent aucun appel réseau supplémentaire — ce qui compte,
    // puisque le palier gratuit de CoinGecko ne tolère qu'une poignée de requêtes
    // par minute (mesuré).
    getPeers(assetClass, id, 6),
    getExchangeRates(),
  ])

  // Identifiant inconnu de la source : c'est un 404 au sens propre, pas une panne.
  // Renvoyer une page d'erreur laisserait croire à un incident temporaire, et
  // laisserait surtout l'URL indexable pour un actif qui n'existe pas (§9).
  if (!asset.ok && asset.kind === 'error') {
    const detail = asset.reason
    if (detail.includes('introuvable') || detail.includes('inconnu')) notFound()
  }

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

  return (
    <div className="space-y-6">
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

        <div className="text-right">
          <p className="tabular text-3xl font-bold text-ink">
            {priceLabel}
            {isForex ? <span className="ml-1 text-base text-ink-muted">{data.currency}</span> : null}
          </p>
          <ChangeBadge value={data.change24h} periodLabel={data.changePeriodLabel} filled />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Widget central : onglets, période et devise, tous pilotés côté client.
              Le graphique de la première période arrive déjà rendu depuis le
              serveur, de sorte que la page n'attend pas le JavaScript pour montrer
              quelque chose d'utile. */}
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
        </div>

        {/* ── Colonne latérale : comparables ──────────────────────────────────── */}
        <aside className="space-y-6">
          <Card>
            <CardHeader
              title={fr.asset.similarTitle}
              action={
                <Link
                  href={marketHref(assetClass)}
                  className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
                >
                  {fr.home.seeAll}
                </Link>
              }
            />
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
          </Card>

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
