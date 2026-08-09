import Link from 'next/link'

import {
  CACHE_TTL_SECONDS,
  getAvailability,
  getCryptoGlobalStats,
  getCryptoOverview,
  getForexRates,
  getMarketCapSeriesState,
  getNews,
  getSentiment,
  getTopNarratives,
  getTrendingCrypto,
} from '@zenith/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenith/ui'

import { AssetList } from '@/components/AssetList'
import { CoverageList } from '@/components/CoverageList'
import { HighlightPanel } from '@/components/home/HighlightPanel'
import { MarketOverviewCard } from '@/components/home/MarketOverviewCard'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import {
  AssetClassChips,
  NarrativesPanel,
  NewsPanel,
  SentimentPanel,
} from '@/components/home/SidePanels'
import { MarketTable } from '@/components/market/MarketTable'
import { fr } from '@/content/fr'
import { marketHref } from '@/lib/asset-routes'

// Régénération alignée sur le TTL du cache applicatif : les deux durées de vie
// doivent coïncider, sinon la fraîcheur affichée devient imprévisible (§9).
//
// Next.js analyse `revalidate` statiquement et refuse une constante importée : la
// valeur doit donc être écrite en clair. Le garde-fou juste en dessous fait échouer
// le typecheck si CACHE_TTL_SECONDS s'en écarte — les deux ne peuvent pas diverger
// en silence.
export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Titre écrit en entier, contrairement aux autres pages.
 *
 * Le gabarit « Zenith | %s » du layout ne s'applique qu'aux segments ENFANTS.
 * `app/page.tsx` partageant le segment racine avec `app/layout.tsx`, un titre simple
 * y remplacerait le gabarit au lieu de le traverser — l'onglet afficherait « Accueil »
 * tout court. La forme `absolute` lève l'ambiguïté.
 */
export const metadata = {
  title: { absolute: `${fr.site.name} | ${fr.pages.home}` },
}

export default async function HomePage() {
  // Requêtes indépendantes lancées ensemble : les additionner en série ferait
  // patienter l'utilisateur pour rien. Le limiteur de débit les sérialise de toute
  // façon vers l'extérieur, sans que la page ait à s'en soucier.
  const [globalStats, trending, overview, forex, narratives, news, sentiment] =
    await Promise.all([
      getCryptoGlobalStats('eur'),
      getTrendingCrypto('eur'),
      getCryptoOverview('eur', 5),
      getForexRates(),
      getTopNarratives(6),
      getNews(6),
      getSentiment(),
    ])

  // Le tableau reprend l'aperçu déjà chargé plutôt qu'un classement séparé : c'est
  // le même top 10, courbes comprises, pour un appel réseau de moins (§9).
  const topCrypto = overview.ok ? overview.data.topByMarketCap : []

  // Lu APRÈS `getCryptoGlobalStats` : c'est cet appel qui vient d'ajouter le point
  // du jour à la série. L'ordre compte, sinon la carte afficherait un relevé de retard.
  const marketCapSeries = getMarketCapSeriesState('EUR')

  const availability = getAvailability()
  const chips = availability
    .filter((entry) => entry.assetClass !== 'nft')
    .map((entry) => ({
      label: fr.assetClass[entry.assetClass],
      href: marketHref(entry.assetClass),
      available: entry.available,
    }))

  return (
    <div className="space-y-6">
      {/* ── Rangée de synthèse : capitalisation, tendances, hausses ──────────── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MarketOverviewCard result={globalStats} series={marketCapSeries} />

        <TrendingPanel
          assets={trending.ok ? trending.data : null}
          unavailableReason={trending.ok ? undefined : trending.reason}
        />

        <HighlightPanel
          title={fr.home.gainersTitle}
          icon="🚀"
          hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
          assets={overview.ok ? overview.data.gainers : null}
          href="/crypto"
          unavailableReason={overview.ok ? undefined : overview.reason}
        />
      </section>

      <AssetClassChips items={chips} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Colonne principale ─────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-ink">{fr.crypto.title}</h1>
                <p className="text-xs text-ink-muted">{fr.crypto.subtitle}</p>
              </div>
              <Link
                href="/crypto"
                className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
              >
                {fr.home.seeAll}
              </Link>
            </div>

            {topCrypto.length > 0 ? (
              <>
                <MarketTable
                  assets={topCrypto}
                  assetClass="crypto"
                  page={1}
                  perPage={10}
                  sortBy="marketCap"
                  direction="desc"
                  sortable={false}
                  paginated={false}
                  basePath="/crypto"
                />
                <SourceNote
                  label={overview.ok ? overview.source.label : ''}
                  href={overview.ok ? overview.source.attributionUrl : '#'}
                  updatedAt={topCrypto[0]?.lastUpdated}
                />
              </>
            ) : (
              <EmptyState
                title={fr.states.unavailableTitle}
                description={overview.ok ? null : overview.reason}
              />
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <HighlightPanel
              title={fr.home.losersTitle}
              icon="📉"
              hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
              assets={overview.ok ? overview.data.losers : null}
              unavailableReason={overview.ok ? undefined : overview.reason}
            />
            <HighlightPanel
              title={fr.home.topMarketCapTitle}
              icon="🏔️"
              assets={overview.ok ? overview.data.topByMarketCap : null}
              href="/crypto"
              unavailableReason={overview.ok ? undefined : overview.reason}
            />
          </section>
        </div>

        {/* ── Colonne latérale — widgets compacts (§3.2) ──────────────────────── */}
        <aside className="space-y-6">
          <NarrativesPanel result={narratives} />
          <NewsPanel result={news} />
          <SentimentPanel result={sentiment} />

          <Card>
            <CardHeader title={fr.home.forexTitle} hint={fr.home.forexHint} />
            {forex.ok && forex.data.length > 0 ? (
              <>
                <AssetList assets={forex.data.slice(0, 6)} />
                <SourceNote
                  label={forex.source.label}
                  href={forex.source.attributionUrl}
                  updatedAt={forex.data[0]?.lastUpdated}
                />
              </>
            ) : (
              <EmptyState
                title={fr.states.unavailableTitle}
                description={forex.ok ? null : forex.reason}
                compact
              />
            )}
          </Card>

          <Card>
            <CardHeader title={fr.home.coverageTitle} hint={fr.home.coverageHint} />
            <CoverageList availability={availability} />
          </Card>

          <Card>
            <CardHeader title={fr.home.watchlistTitle} />
            <EmptyState
              title={fr.home.watchlistEmptyTitle}
              description={fr.home.watchlistEmptyBody}
              compact
            />
          </Card>
        </aside>
      </div>
    </div>
  )
}
