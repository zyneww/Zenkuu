import type { Metadata } from 'next'
import Link from 'next/link'

import {
  CACHE_TTL_SECONDS,
  getCryptoGlobalStats,
  getMoversUniverse,
  getNewListings,
  getTopNarratives,
  getTrendingCrypto,
  rankMovers,
  type MarketAsset,
} from '@zenith/data'
import { ChangeBadge, EmptyState, SourceNote, formatCurrency } from '@zenith/ui'

import { MetricCard } from '@/components/charts/MetricCard'
import { dataColor } from '@/components/charts/chart-theme'
import { HighlightPanel } from '@/components/home/HighlightPanel'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import { MacroBand } from '@/components/market/MacroBand'
import { Money } from '@/components/locale/Money'
import { fr } from '@/content/fr'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Points marquants',
  description:
    'Ce qui bouge aujourd’hui sur le marché crypto : tendances, plus fortes hausses et baisses, volumes les plus élevés, secteurs en tête et cotations récentes.',
  alternates: { canonical: '/crypto/highlights' },
}

/**
 * Points marquants.
 *
 * Une page de synthèse tire sa valeur de ce qu'elle rapproche, pas de ce qu'elle
 * additionne. Le fil suivi ici est celui d'une question unique — « qu'est-ce qui sort
 * de l'ordinaire aujourd'hui ? » — déclinée en quatre angles : ce qu'on regarde
 * (tendances), ce qui bouge (hausses, baisses), ce qui s'échange (volumes), ce qui
 * apparaît (cotations récentes). Les secteurs ferment la page parce qu'ils
 * REGROUPENT les trois premiers : un narratif en tête explique souvent la présence
 * d'une demi-douzaine de jetons dans les palmarès au-dessus.
 *
 * UN SEUL APPEL alimente les palmarès de hausse, de baisse et de volume : ce sont
 * trois classements du même univers de 250 actifs, déjà chargé. Les demander
 * séparément coûterait trois fois plus sur un quota mesuré, pour exactement la même
 * donnée.
 */
export default async function HighlightsPage() {
  const [universe, trending, narratives, listings, globalStats] = await Promise.all([
    getMoversUniverse(250, 'eur'),
    getTrendingCrypto('eur'),
    getTopNarratives(6),
    getNewListings(100),
    getCryptoGlobalStats('eur'),
  ])

  const assets: MarketAsset[] = universe.ok ? universe.data : []
  const ranked = assets.length > 0 ? rankMovers(assets, '24h', 5) : null

  const byVolume = [...assets]
    .filter((asset) => (asset.volume24h ?? 0) > 0)
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .slice(0, 5)

  const byMarketCap = assets.slice(0, 5)

  // Le rapport volume / capitalisation isole les actifs qui changent de mains bien
  // plus vite que leur taille ne le laisserait attendre. Ce n'est pas une donnée
  // inventée mais le RAPPORT de deux chiffres publiés — et il dit quelque chose
  // qu'aucun des deux ne dit seul. Le plancher de capitalisation évite qu'un jeton
  // minuscule à fort passage occupe les cinq places.
  const byRotation = assets
    .filter((asset) => (asset.marketCap ?? 0) > 50_000_000 && (asset.volume24h ?? 0) > 0)
    .map((asset) => ({
      asset,
      ratio: (asset.volume24h as number) / (asset.marketCap as number),
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5)

  const recent = listings.ok ? listings.data.slice(0, 5) : []

  return (
    <div className="space-y-12 sm:space-y-16">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Points marquants</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Ce qui sort de l’ordinaire aujourd’hui : ce qu’on regarde, ce qui bouge, ce qui
          s’échange, ce qui apparaît.
        </p>
      </header>

      {globalStats.ok ? <MacroBand stats={globalStats.data} /> : null}

      {/* Rangée de cartes : les quatre plus fortes hausses, courbe 7 jours en fond.
          La série est celle déjà chargée pour les palmarès — aucun appel de plus. */}
      {ranked && ranked.gainers.length >= 4 ? (
        <section aria-label="Plus fortes hausses du jour" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ranked.gainers.slice(0, 4).map((asset, index) => (
            <MetricCard
              key={asset.id}
              label={`${asset.name} · ${asset.symbol}`}
              color={dataColor(index)}
              value={<Money value={asset.price} from={asset.currency} />}
              hint={<ChangeBadge value={asset.change24h} size="sm" />}
              series={(asset.sparkline7d ?? []).map((y, x) => ({ x, y }))}
              format="currency"
            />
          ))}
        </section>
      ) : null}

      {universe.ok && assets.length > 0 ? (
        <section className="space-y-5" aria-labelledby="palmares-titre">
          <h2 id="palmares-titre" className="display-md text-ink">
            Palmarès du jour
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <TrendingPanel
              assets={trending.ok ? trending.data : null}
              unavailableReason={trending.ok ? undefined : trending.reason}
            />

            <HighlightPanel
              title={fr.home.gainersTitle}
              hint={`Parmi les ${assets.length} plus grandes capitalisations`}
              assets={ranked?.gainers ?? null}
              href="/crypto/mouvements"
            />

            <HighlightPanel
              title={fr.home.losersTitle}
              hint={`Parmi les ${assets.length} plus grandes capitalisations`}
              assets={ranked?.losers ?? null}
              href="/crypto/mouvements"
            />

            <HighlightPanel
              title="Volumes les plus élevés"
              hint="Montants échangés sur 24 h"
              assets={byVolume}
              href="/crypto/all-coins?tri=volume24h"
            />

            <HighlightPanel
              title="Plus grandes capitalisations"
              assets={byMarketCap}
              href="/crypto/all-coins"
            />

            <RotationPanel entries={byRotation} />
          </div>

          <SourceNote
            label={universe.source.label}
            href={universe.source.attributionUrl}
            updatedAt={assets[0]?.lastUpdated}
          />
        </section>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={universe.ok ? null : universe.reason}
          tone="warning"
        />
      )}

      <section className="space-y-5" aria-labelledby="nouveautes-titre">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="nouveautes-titre" className="display-md text-ink">
            Ce qui vient d’apparaître
          </h2>
          <Link href="/crypto/nouvelles" className="text-sm font-medium text-brand-strong hover:underline">
            Toutes les cotations récentes
          </Link>
        </div>

        {recent.length > 0 && listings.ok ? (
          <>
            <ul className="grid grid-cols-1 gap-px overflow-hidden border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-5">
              {recent.map((item) => (
                <li key={item.id} className="bg-surface p-3">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="tabular text-xs text-ink-muted">{item.symbol}</p>
                  <p className="tabular mt-2 text-sm text-ink">
                    {formatCurrency(item.price, 'USD') ?? '—'}
                  </p>
                  <div className="mt-1">
                    <ChangeBadge value={item.change24h} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
            <SourceNote
              label={`${listings.source.label} · montants en USD`}
              href={listings.source.attributionUrl}
            />
          </>
        ) : (
          <EmptyState
            title="Cotations récentes indisponibles"
            description={listings.ok ? null : listings.reason}
            compact
          />
        )}
      </section>

      <section className="space-y-5" aria-labelledby="secteurs-titre">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="secteurs-titre" className="display-md text-ink">
              Secteurs en tête
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
              Un narratif en tête explique souvent la présence d’une demi-douzaine de
              jetons dans les palmarès ci-dessus.
            </p>
          </div>
          <Link href="/categories" className="text-sm font-medium text-brand-strong hover:underline">
            Toutes les catégories
          </Link>
        </div>

        {narratives.ok && narratives.data.length > 0 ? (
          <>
            <ul className="grid grid-cols-1 gap-px overflow-hidden border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
              {narratives.data.map((category) => (
                <li key={category.id} className="bg-surface p-3">
                  <Link href={`/categories?secteur=${encodeURIComponent(category.id)}`} className="group block">
                    <p className="truncate text-sm font-medium text-ink group-hover:text-brand-strong">
                      {category.name}
                    </p>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="tabular text-xs text-ink-muted">
                        {formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
                      </span>
                      <ChangeBadge value={category.marketCapChange24h} size="sm" filled />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <SourceNote
              label={`${narratives.source.label} · en USD`}
              href={narratives.source.attributionUrl}
            />
          </>
        ) : (
          <EmptyState
            title={fr.states.unavailableTitle}
            description={narratives.ok ? null : narratives.reason}
            compact
          />
        )}
      </section>
    </div>
  )
}

/**
 * Rotation : volume 24 h rapporté à la capitalisation.
 *
 * Panneau à part et non un `HighlightPanel` de plus, parce que la valeur affichée
 * n'est ni un prix ni une variation : c'est un rapport sans unité, qu'aucune des
 * colonnes du panneau générique ne sait présenter.
 */
function RotationPanel({ entries }: { entries: { asset: MarketAsset; ratio: number }[] }) {
  return (
    <section className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-ink">Rotation la plus rapide</h2>
        <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
          Volume 24 h rapporté à la capitalisation, au-dessus de 50 M$
        </p>
      </div>

      {entries.length > 0 ? (
        <ol className="flex-1 divide-y divide-border-subtle">
          {entries.map((entry, index) => (
            <li key={entry.asset.id} className="flex items-center gap-2 py-1.5">
              <span className="tabular w-3 shrink-0 text-[0.6875rem] text-ink-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                {entry.asset.name}
              </span>
              <span className="tabular shrink-0 text-xs text-ink">
                {(entry.ratio * 100).toFixed(0).replace('.', ',')}&#8239;%
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title={fr.states.unavailableTitle} compact />
      )}
    </section>
  )
}
