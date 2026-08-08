import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { AssetClass, MarketAsset } from '@zenith/data'
import { getAsset, getAssetHistory, getPeers } from '@zenith/data'
import {
  Card,
  CardHeader,
  ChangeBadge,
  EmptyState,
  PriceChart,
  SourceNote,
  formatCompact,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatRate,
} from '@zenith/ui'

import { AssetLogo } from '@/components/AssetTile'
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

/** Fenêtres proposées, en jours. */
const RANGES = [
  { key: '1', days: 1, label: fr.asset.ranges.d1 },
  { key: '7', days: 7, label: fr.asset.ranges.d7 },
  { key: '30', days: 30, label: fr.asset.ranges.d30 },
  { key: '90', days: 90, label: fr.asset.ranges.d90 },
  { key: '365', days: 365, label: fr.asset.ranges.y1 },
] as const

const DEFAULT_RANGE = '7'

export interface AssetPageViewProps {
  assetClass: AssetClass
  id: string
  searchParams: Record<string, string | string[] | undefined>
}

export async function AssetPageView({ assetClass, id, searchParams }: AssetPageViewProps) {
  const rangeParam = Array.isArray(searchParams['periode'])
    ? searchParams['periode'][0]
    : searchParams['periode']
  const range = RANGES.find((candidate) => candidate.key === rangeParam) ?? RANGES[1]

  const [asset, history, peers] = await Promise.all([
    getAsset(id, assetClass, 'eur'),
    getAssetHistory(id, assetClass, range.days, 'eur'),
    // `getPeers` dérive de l'aperçu déjà mis en cache par l'accueil : les
    // comparables ne coûtent aucun appel réseau supplémentaire — ce qui compte,
    // puisque le palier gratuit de CoinGecko ne tolère qu'une poignée de requêtes
    // par minute (mesuré).
    getPeers(assetClass, id, 6),
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
          {/* ── Graphique ────────────────────────────────────────────────────── */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">{fr.asset.priceLabel(data.name)}</h2>
              <RangeSelector assetClass={assetClass} id={data.id} active={range.key} />
            </div>

            {history.ok ? (
              <>
                <PriceChart
                  points={history.data.points}
                  currency={history.data.currency}
                  label={`${fr.asset.priceLabel(data.name)} sur ${range.label}`}
                  formatPrice={(value) =>
                    isForex ? formatRate(value) : formatCurrency(value, history.data.currency)
                  }
                  formatDate={(timestamp) => formatShortDate(timestamp, range.days)}
                />
                <SourceNote
                  label={history.source.label}
                  href={history.source.attributionUrl}
                  updatedAt={data.lastUpdated}
                />
              </>
            ) : (
              <EmptyState title={fr.asset.chartUnavailable} description={history.reason} compact />
            )}
          </Card>

          {/* ── Statistiques ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader title={fr.asset.statsTitle} />
            <StatGrid asset={data} isForex={isForex} />
          </Card>

          {/* ── Contexte éditorial ───────────────────────────────────────────── */}
          {data.description ? (
            <Card>
              <CardHeader title={fr.asset.aboutTitle(data.name)} />
              <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
                {data.description
                  .split('\n\n')
                  .slice(0, 4)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
              {data.homepageUrl ? (
                <p className="mt-3 text-xs">
                  <span className="text-ink-muted">{fr.asset.officialLinks} : </span>
                  <a
                    href={data.homepageUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-medium text-brand-strong underline underline-offset-2"
                  >
                    {fr.asset.website}
                  </a>
                </p>
              ) : null}
            </Card>
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

function RangeSelector({
  assetClass,
  id,
  active,
}: {
  assetClass: AssetClass
  id: string
  active: string
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={fr.asset.rangeTitle}>
      {RANGES.map((range) => {
        const isActive = range.key === active
        const href =
          range.key === DEFAULT_RANGE
            ? assetHref(assetClass, id)
            : `${assetHref(assetClass, id)}?periode=${range.key}`

        return (
          <Link
            key={range.key}
            href={href}
            aria-current={isActive ? 'true' : undefined}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-soft text-brand-strong'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
            }`}
          >
            {range.label}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * Grille de statistiques.
 *
 * Chaque entrée n'est rendue que si la source fournit la valeur : une paire de
 * devises n'a pas d'offre en circulation, une action Yahoo n'a pas de
 * capitalisation. Aucune case n'affiche « 0 » faute de donnée (§5).
 */
function StatGrid({ asset, isForex }: { asset: MarketAsset; isForex: boolean }) {
  const money = (value: number | undefined, compact = true) =>
    isForex ? formatRate(value) : formatCurrency(value, asset.currency, { compact })

  // Yahoo ne publie pas de plus haut absolu pour les actifs boursiers : ses champs
  // couvrent 52 semaines. On adapte donc le libellé plutôt que de laisser croire à
  // un record historique.
  const isCrypto = asset.assetClass === 'crypto'
  const highLabel = isCrypto ? fr.asset.stats.ath : 'Plus haut 52 semaines'
  const lowLabel = isCrypto ? fr.asset.stats.atl : 'Plus bas 52 semaines'

  const entries: { label: string; value: string | null; hint?: string }[] = [
    { label: fr.asset.stats.marketCap, value: money(asset.marketCap) },
    { label: fr.asset.stats.volume, value: money(asset.volume24h) },
    { label: fr.asset.stats.high24h, value: money(asset.high24h, false) },
    { label: fr.asset.stats.low24h, value: money(asset.low24h, false) },
    {
      label: highLabel,
      value: money(asset.ath, false),
      ...(asset.athDate ? { hint: formatDateTime(asset.athDate) ?? undefined } : {}),
    },
    {
      label: lowLabel,
      value: money(asset.atl, false),
      ...(asset.atlDate ? { hint: formatDateTime(asset.atlDate) ?? undefined } : {}),
    },
    {
      label: fr.asset.stats.circulating,
      value: formatCompact(asset.circulatingSupply),
      hint: asset.symbol,
    },
    { label: fr.asset.stats.total, value: formatCompact(asset.totalSupply), hint: asset.symbol },
    { label: fr.asset.stats.max, value: formatCompact(asset.maxSupply), hint: asset.symbol },
    { label: fr.asset.stats.rank, value: asset.rank ? `#${formatNumber(asset.rank, 0)}` : null },
  ]

  const visible = entries.filter((entry) => entry.value !== null)

  if (visible.length === 0) {
    return <EmptyState title={fr.states.unavailableTitle} compact />
  }

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {visible.map((entry) => (
        <div key={entry.label}>
          <dt className="text-xs text-ink-muted">{entry.label}</dt>
          <dd className="tabular text-sm font-semibold text-ink">
            {entry.value}
            {entry.hint ? (
              <span className="ml-1 text-xs font-normal text-ink-muted">{entry.hint}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Sur une fenêtre courte l'heure prime, sur une longue c'est la date. */
function formatShortDate(timestamp: number, days: number): string {
  const date = new Date(timestamp)
  return days <= 1
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}
