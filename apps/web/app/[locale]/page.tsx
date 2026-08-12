import {
  CACHE_TTL_SECONDS,
  getAvailability,
  getCryptoGlobalStats,
  getCryptoOverview,
  getForexRates,
  getMarketCapSeriesState,
  getNews,
  getRanking,
  getSentiment,
  getTopNarratives,
  getTrendingCrypto,
  type AssetClass,
  type MarketAsset,
} from '@zenkuu/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetList } from '@/components/AssetList'
import { CoverageList } from '@/components/CoverageList'
import { ExploreTable } from '@/components/home/ExploreTable'
import { GlobalPulse } from '@/components/home/GlobalPulse'
import { GlobalStatsBar } from '@/components/home/GlobalStatsBar'
import { HighlightPanel } from '@/components/home/HighlightPanel'
import { MarketOverviewCard } from '@/components/home/MarketOverviewCard'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import { AssetClassChips, NarrativesPanel, NewsPanel } from '@/components/home/SidePanels'
import { getContent } from '@/lib/content'
import { assetClassFromSegment, marketHref } from '@/lib/asset-routes'

// Régénération alignée sur le TTL du cache applicatif : les deux durées de vie
// doivent coïncider, sinon la fraîcheur affichée devient imprévisible (§9).
//
// Next.js analyse `revalidate` statiquement et refuse une constante importée : la
// valeur doit donc être écrite en clair. Le garde-fou juste en dessous fait échouer
// le typecheck si CACHE_TTL_SECONDS s'en écarte — les deux ne peuvent pas diverger
// en silence.
export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Titre écrit en entier, contrairement aux autres pages.
 *
 * Le gabarit « Zenkuu | %s » du layout ne s'applique qu'aux segments ENFANTS.
 * `app/page.tsx` partageant le segment racine avec `app/layout.tsx`, un titre simple
 * y remplacerait le gabarit au lieu de le traverser — l'onglet afficherait « Accueil »
 * tout court. La forme `absolute` lève l'ambiguïté.
 */
export async function generateMetadata() {
  const fr = await getContent()
  return {
    title: { absolute: `${fr.site.name} | ${fr.pages.home}` },
  }
}

/**
 * Classe d'actif demandée par l'URL.
 *
 * Lecture DÉFENSIVE : le paramètre est saisissable à la main et arrive tel quel dans
 * une clé de cache côté données. Une valeur inconnue retombe donc sur la crypto plutôt
 * que d'ouvrir une requête sur une classe inexistante.
 */
function readAssetClass(raw: string | string[] | undefined): AssetClass {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 'crypto'
  return assetClassFromSegment(value) ?? 'crypto'
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const fr = await getContent()
  const params = await searchParams
  const assetClass = readAssetClass(params['classe'])

  // Requêtes indépendantes lancées ensemble : les additionner en série ferait
  // patienter l'utilisateur pour rien. Le limiteur de débit les sérialise de toute
  // façon vers l'extérieur, sans que la page ait à s'en soucier.
  //
  // La dernière est CONDITIONNELLE : la crypto est déjà couverte par l'aperçu, qui
  // porte le même top 10 avec ses courbes. Une requête de plus pour la même donnée
  // serait payée sur un quota mesuré.
  const [globalStats, trending, overview, forex, narratives, news, sentiment, otherClass] =
    await Promise.all([
      getCryptoGlobalStats('eur'),
      getTrendingCrypto('eur'),
      getCryptoOverview('eur', 5),
      getForexRates(),
      getTopNarratives(6),
      getNews(6),
      getSentiment(),
      assetClass === 'crypto'
        ? Promise.resolve(null)
        : // `perPage: 20` est celui des pages de classement de ces classes : la clé de
          // cache est donc PARTAGÉE avec `/actions`, `/etf`, `/indices` et
          // `/matieres-premieres`. Une taille propre à l'accueil ouvrirait une seconde
          // entrée pour la même donnée — et chez Yahoo, un classement se construit
          // symbole par symbole, soit une requête sortante par ligne.
          getRanking({ assetClass, currency: 'eur', perPage: 20 }),
    ])

  const cryptoTop = overview.ok ? overview.data.topByMarketCap : []
  const tableAssets: MarketAsset[] =
    assetClass === 'crypto' ? cryptoTop : otherClass?.ok ? otherClass.data : []

  const tableSource = assetClass === 'crypto' ? overview : otherClass
  const tableReason =
    tableSource && !tableSource.ok ? tableSource.reason : null

  // Lu APRÈS `getCryptoGlobalStats` : c'est cet appel qui vient d'ajouter le point
  // du jour à la série. L'ordre compte, sinon la carte afficherait un relevé de retard.
  const marketCapSeries = getMarketCapSeriesState('EUR')

  const availability = getAvailability()
  const chips = availability
    .filter((entry) => entry.assetClass !== 'nft')
    .map((entry) => ({
      label: fr.assetClass[entry.assetClass],
      // Le filtre reste SUR l'accueil : `?classe=actions` plutôt que `/actions`.
      // La page de classement dédiée garde tout son sens — elle est paginée et
      // triable côté serveur — mais ce n'est pas ce que demande un clic depuis un
      // tableau d'exploration.
      href: entry.assetClass === 'crypto' ? '/' : `/?classe=${marketHref(entry.assetClass).slice(1)}`,
      available: entry.available,
    }))

  const activeHref =
    assetClass === 'crypto' ? '/' : `/?classe=${marketHref(assetClass).slice(1)}`

  return (
    <div className="space-y-8">
      {/*
        ── Repères, PULSATION DU MARCHÉ, puis tableau dominant ────────────────────

        L'ordre suit le parcours du regard : où en est le marché (une ligne), à quoi
        ressemble son mouvement (deux courbes et deux palmarès), puis les actifs
        eux-mêmes. Les widgets de complément passent en colonne latérale — ils
        prolongent la lecture au lieu de la précéder.
      */}
      <h1 className="sr-only">{fr.site.name} — explorer les marchés</h1>

      <GlobalStatsBar
        stats={globalStats.ok ? globalStats.data : null}
        sentiment={sentiment.ok ? sentiment.data : null}
      />

      {/*
        Bandeau de tête : deux agrégats à courbe, puis ce qui monte et ce qu'on
        regarde. Il remplace les quatre cartes de cours qui occupaient cette place et
        redisaient les quatre premières lignes du tableau juste en dessous.
      */}
      <section aria-label="Pulsation du marché" className="grid gap-4 lg:grid-cols-2">
        {globalStats.ok ? (
          <GlobalPulse stats={globalStats.data} series={marketCapSeries} />
        ) : (
          <EmptyState
            title={fr.states.unavailableTitle}
            description={globalStats.reason}
            compact
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TrendingPanel
            assets={trending.ok ? trending.data : null}
            unavailableReason={trending.ok ? undefined : trending.reason}
          />

          <HighlightPanel
            title={fr.home.gainersTitle}
            hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
            assets={overview.ok ? overview.data.gainers : null}
            href="/crypto/highlights"
            unavailableReason={overview.ok ? undefined : overview.reason}
          />
        </div>
      </section>

      <AssetClassChips items={chips} activeHref={activeHref} />

      {/*
        `items-start` — DEUX COLONNES DE HAUTEURS INDÉPENDANTES, DITES COMME TELLES.

        Sans lui, une grille étire chacune de ses cellules à la hauteur de la plus
        haute. La colonne latérale porte cinq widgets empilés et dépasse largement la
        principale : cette dernière se voyait donc attribuer une hauteur DÉFINIE
        qu'aucun de ses contenus n'avait demandée.

        C'est ce qui a fait exploser la carte de synthèse en bas de page. Elle portait
        un `h-full` inoffensif partout ailleurs ; ici, ce `100 %` avait enfin une
        hauteur à laquelle se raccrocher, et la carte s'est mise à déborder de sa
        colonne, à recouvrir le pied de page et à traîner un millier de pixels de vide
        derrière elle.

        L'étirement ne servait à rien — les deux colonnes n'ont aucune raison de finir
        à la même ligne, elles ne portent pas le même nombre de blocs. Le retirer
        supprime la classe de défaut entière, pas seulement son unique symptôme connu.
      */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          {tableAssets.length > 0 ? (
            <>
              <ExploreTable
                assets={tableAssets}
                title={`Explorer — ${fr.assetClass[assetClass]}`}
                moreHref={marketHref(assetClass)}
              />
              <SourceNote
                label={tableSource?.ok ? tableSource.source.label : ''}
                href={tableSource?.ok ? tableSource.source.attributionUrl : '#'}
                updatedAt={tableAssets[0]?.lastUpdated}
              />
            </>
          ) : (
            <EmptyState
              title={fr.states.unavailableTitle}
              description={tableReason}
              source={tableSource?.source?.label ?? null}
              tone={tableReason ? 'warning' : 'neutral'}
            />
          )}

          <MarketOverviewCard result={globalStats} series={marketCapSeries} />
        </div>

        {/* ── Colonne latérale — widgets condensés ────────────────────────────── */}
        <aside className="space-y-6">
          <HighlightPanel
            title={fr.home.losersTitle}
            hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
            assets={overview.ok ? overview.data.losers : null}
            href="/crypto/highlights"
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
