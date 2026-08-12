import {
  CACHE_TTL_SECONDS,
  YAHOO_UNIVERSE,
  getAvailability,
  getCryptoGlobalStats,
  getCryptoOverview,
  getForexRates,
  getMarketCapSeriesState,
  getNewListings,
  getNews,
  getRanking,
  getSentiment,
  getTopNarratives,
  getTrendingCrypto,
  type AssetClass,
  type MarketAsset,
} from '@zenkuu/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenkuu/ui'

import { getLocale } from 'next-intl/server'

import { AssetList } from '@/components/AssetList'
import { CoverageList } from '@/components/CoverageList'
import { AnalysisSection } from '@/components/home/AnalysisSection'
import { ExploreTable } from '@/components/home/ExploreTable'
import { GlobalPulse } from '@/components/home/GlobalPulse'
import { GlobalStatsBar } from '@/components/home/GlobalStatsBar'
import { HighlightPanel } from '@/components/home/HighlightPanel'
import { HomeMasthead } from '@/components/home/HomeMasthead'
import { MarketOverviewCard } from '@/components/home/MarketOverviewCard'
import { RecentlyAdded } from '@/components/home/RecentlyAdded'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import {
  AssetClassChips,
  NarrativesPanel,
  NewsPanel,
  SentimentPanel,
} from '@/components/home/SidePanels'
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

/**
 * ACCUEIL — quatre familles d'analyse, rangées par question posée.
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI ─────────────────────────────────────────────
 *
 * La page empilait dix cartes sans les nommer. Chacune se défendait, mais rien ne
 * disait pourquoi elles se suivaient : une page de dix blocs sans titres de groupe se
 * parcourt en diagonale, faute de repère autorisant à sauter ce qu'on ne cherche pas.
 *
 * La structure vient de Tokenomist, dont le vrai apport n'est pas graphique : c'est le
 * rangement par INTENTION — « Emission Analysis », « Buyback Analysis », « Unlocks
 * Analysis ». Leurs familles portent sur des données de tokenomics que nos sources ne
 * publient pas ; on garde donc la grammaire et on la remplit avec ce qu'on sait
 * réellement dire, et sur les six classes d'actifs plutôt que sur la seule crypto :
 *
 *   · Analyse des marchés    — le classement, la capitalisation, le volume
 *   · Analyse sectorielle    — les narratifs et leur performance relative
 *   · Analyse du sentiment   — l'indice de peur et d'avidité
 *   · Analyse des flux       — ce qui bouge : tendances, hausses, baisses, devises
 *
 * ── L'ORDRE DE LA PAGE ───────────────────────────────────────────────────────
 *
 * Bandeau de couverture (de quoi parle ce site), repères mouvants (où en est le
 * marché), trois cartes de tête (l'agrégat, ce qui vient d'arriver, ce qui se dit),
 * puis les familles. Il va du permanent au volatil, ce qui est l'ordre dans lequel on
 * a besoin des choses en arrivant.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const fr = await getContent()
  const locale = await getLocale()
  const params = await searchParams
  const assetClass = readAssetClass(params['classe'])

  // Requêtes indépendantes lancées ensemble : les additionner en série ferait
  // patienter l'utilisateur pour rien. Le limiteur de débit les sérialise de toute
  // façon vers l'extérieur, sans que la page ait à s'en soucier.
  //
  // La dernière est CONDITIONNELLE : la crypto est déjà couverte par l'aperçu, qui
  // porte le même top 10 avec ses courbes. Une requête de plus pour la même donnée
  // serait payée sur un quota mesuré.
  const [
    globalStats,
    trending,
    overview,
    forex,
    narratives,
    news,
    sentiment,
    newListings,
    otherClass,
  ] = await Promise.all([
    getCryptoGlobalStats('eur'),
    getTrendingCrypto('eur'),
    getCryptoOverview('eur', 5),
    getForexRates(),
    getTopNarratives(6),
    getNews(6),
    getSentiment(),
    // `4` seulement : le panneau n'en montre que quatre, et cette requête part sur un
    // quota Coinpaprika distinct de celui de CoinGecko. La page complète
    // `/crypto/nouvelles` en demande cent, avec sa propre clé de cache.
    getNewListings(4),
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
  const tableReason = tableSource && !tableSource.ok ? tableSource.reason : null

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

  const activeHref = assetClass === 'crypto' ? '/' : `/?classe=${marketHref(assetClass).slice(1)}`

  /*
   * COMPTEUR DE COUVERTURE — additionné, pas inventé.
   *
   * Les cryptoactifs sont comptés par la source (`activeAssets`) ; les actions, ETF,
   * indices et matières premières le sont par notre propre univers Yahoo, qui EST la
   * liste des symboles réellement interrogeables ; les devises par la table de change
   * effectivement servie. Un chiffre rond « 20 000+ » aurait été plus flatteur et
   * aurait contrevenu au §5 — on n'affiche que ce qu'on peut justifier ligne à ligne.
   */
  const yahooSymbols = Object.values(YAHOO_UNIVERSE).reduce(
    (total, entries) => total + entries.length,
    0,
  )

  const trackedAssets =
    (globalStats.ok ? globalStats.data.activeAssets : 0) +
    yahooSymbols +
    (forex.ok ? forex.data.length : 0)

  return (
    <div className="space-y-10">
      <h1 className="sr-only">{fr.site.name} — explorer les marchés</h1>

      <HomeMasthead
        stats={globalStats.ok ? globalStats.data : null}
        trackedAssets={trackedAssets}
        locale={locale}
      />

      <GlobalStatsBar
        stats={globalStats.ok ? globalStats.data : null}
        sentiment={sentiment.ok ? sentiment.data : null}
      />

      {/*
        ── TROIS CARTES DE TÊTE ──────────────────────────────────────────────────

        L'agrégat, ce qui vient d'arriver, ce qui se dit. Elles répondent aux trois
        questions qu'on se pose en arrivant, et aucune n'appartient à une famille
        d'analyse en particulier — d'où leur place au-dessus, hors sections.

        `items-stretch` est le défaut de la grille et il est VOULU ici, à l'inverse du
        bloc à deux colonnes plus bas : ces trois cartes forment une bande, et une
        bande dont les cartes finissent à des hauteurs différentes se lit comme un
        défaut d'alignement. Aucun `h-full` n'est nécessaire pour cela — les éléments
        de grille s'étirent d'eux-mêmes ; c'est seulement quand on DÉSACTIVE
        l'étirement, comme plus bas, qu'il faut y regarder à deux fois.

        LARGEURS INÉGALES, 2/1/1. `GlobalPulse` n'est pas une carte mais DEUX, posées
        côte à côte — capitalisation et volume, chacune avec sa courbe. Dans un tiers
        de la largeur, ces deux-là tomberaient à un sixième chacune, soit une courbe
        de cent pixels de large. Le tiroir de tête de Tokenomist a d'ailleurs les
        mêmes proportions, et pour la même raison.
      */}
      <section
        aria-label="Aperçu du jour"
        className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        {globalStats.ok ? (
          /* 128 et non 56 : dans cette bande, les deux cartes sont étirées à la
             hauteur du panneau d'actualités. Une courbe basse y laisserait un vide au
             milieu de la carte ; une courbe haute occupe le bas comme un fond, ce qui
             est le motif d'origine. */
          <GlobalPulse stats={globalStats.data} series={marketCapSeries} sparkHeight={128} />
        ) : (
          <EmptyState title={fr.states.unavailableTitle} description={globalStats.reason} compact />
        )}

        <RecentlyAdded result={newListings} />

        {/* `limit={5}` : la bande est étirée à la hauteur de sa carte la plus haute,
            et celle-ci l'est toujours. Un article de plus ici allonge les deux cartes
            d'agrégat de quarante pixels chacune, sans rien leur ajouter. */}
        <NewsPanel result={news} limit={5} />
      </section>

      <AssetClassChips items={chips} activeHref={activeHref} />

      {/* ── FAMILLE 1 — pleine largeur, parce qu'un classement l'exige ────────────

          Les trois autres familles tiennent en colonne ; celle-ci porte un tableau de
          six colonnes chiffrées, qu'une demi-largeur rendrait illisible. Le
          découpage en deux colonnes commence donc APRÈS. */}
      <AnalysisSection title="Analyse des marchés" href={marketHref(assetClass)}>
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
      </AnalysisSection>

      {/*
        `items-start` — DEUX COLONNES DE HAUTEURS INDÉPENDANTES, DITES COMME TELLES.

        Sans lui, une grille étire chacune de ses cellules à la hauteur de la plus
        haute. « Analyse des flux » porte quatre panneaux et dépasse largement la
        colonne de gauche : cette dernière se verrait donc attribuer une hauteur
        DÉFINIE qu'aucun de ses contenus n'a demandée, et le moindre `h-full` d'un
        panneau intérieur — inoffensif partout ailleurs — trouverait enfin un
        pourcentage auquel se raccrocher et déborderait.
      */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
        <div className="min-w-0 space-y-10">
          <AnalysisSection title="Analyse sectorielle" href="/categories">
            <NarrativesPanel result={narratives} />
          </AnalysisSection>

          <AnalysisSection title="Analyse du sentiment" href="/sentiment">
            <SentimentPanel result={sentiment} />
          </AnalysisSection>
        </div>

        <div className="min-w-0 space-y-4">
          <AnalysisSection title="Analyse des flux" href="/crypto/mouvements">
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

            <HighlightPanel
              title={fr.home.losersTitle}
              hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
              assets={overview.ok ? overview.data.losers : null}
              href="/crypto/highlights"
              unavailableReason={overview.ok ? undefined : overview.reason}
            />

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
          </AnalysisSection>
        </div>
      </div>

      {/* Hors familles : la couverture ne décrit pas le marché mais le SITE. La ranger
          sous un intitulé d'analyse la ferait lire comme une donnée de marché. */}
      <Card>
        <CardHeader title={fr.home.coverageTitle} />
        <CoverageList availability={availability} />
      </Card>
    </div>
  )
}
