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
import { Card, CardHeader, ChangeBadge, EmptyState, SourceNote } from '@zenith/ui'

import { AssetList } from '@/components/AssetList'
import { dataColor } from '@/components/charts/chart-theme'
import { MetricCard } from '@/components/charts/MetricCard'
import { CoverageList } from '@/components/CoverageList'
import { Money } from '@/components/locale/Money'
import { ExploreTable } from '@/components/home/ExploreTable'
import { GlobalStatsBar } from '@/components/home/GlobalStatsBar'
import { HighlightPanel } from '@/components/home/HighlightPanel'
import { MarketOverviewCard } from '@/components/home/MarketOverviewCard'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import { AssetClassChips, NarrativesPanel, NewsPanel } from '@/components/home/SidePanels'
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
    <div className="space-y-8">
      {/*
        ── Barre de repères, puis TABLEAU DOMINANT ───────────────────────────────

        Renversement par rapport à la version précédente, qui ouvrait sur trois
        cartes de widgets et reléguait le tableau en dessous. Une page d'exploration
        d'actifs a pour sujet les actifs : la barre situe le marché en une ligne, le
        tableau occupe l'espace, et les widgets passent en colonne latérale — ils
        complètent la lecture au lieu de la précéder.
      */}
      <h1 className="sr-only">{fr.site.name} — explorer les marchés</h1>

      <GlobalStatsBar
        stats={globalStats.ok ? globalStats.data : null}
        sentiment={sentiment.ok ? sentiment.data : null}
      />

      {/* Rangée de cartes de métrique — le widget signature du design system.
          Les quatre premières capitalisations, chacune dans sa teinte de données,
          avec leur courbe 7 jours en fond de carte. La série est celle déjà chargée
          pour le tableau : aucune requête supplémentaire. */}
      {topCrypto.length >= 4 ? (
        <section aria-label="Principales capitalisations" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topCrypto.slice(0, 4).map((asset, index) => (
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

      <AssetClassChips items={chips} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          {topCrypto.length > 0 ? (
            <>
              <ExploreTable assets={topCrypto} />
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

          <MarketOverviewCard result={globalStats} series={marketCapSeries} />
        </div>

        {/* ── Colonne latérale — widgets condensés ────────────────────────────── */}
        <aside className="space-y-6">
          <TrendingPanel
            assets={trending.ok ? trending.data : null}
            unavailableReason={trending.ok ? undefined : trending.reason}
          />

          <HighlightPanel
            title={fr.home.gainersTitle}
            hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
            assets={overview.ok ? overview.data.gainers : null}
            href="/crypto?vue=gagnants"
            unavailableReason={overview.ok ? undefined : overview.reason}
          />

          <HighlightPanel
            title={fr.home.losersTitle}
            hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
            assets={overview.ok ? overview.data.losers : null}
            href="/crypto?vue=perdants"
            unavailableReason={overview.ok ? undefined : overview.reason}
          />

          <NarrativesPanel result={narratives} />
          <NewsPanel result={news} />

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
            <CardHeader title={fr.home.coverageTitle} />
            <CoverageList availability={availability} />
          </Card>
        </aside>
      </div>
    </div>
  )
}
