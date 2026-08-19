import { Suspense } from 'react'

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
  getSentiment,
  getTopNarratives,
  getTrendingCrypto,
  type AssetClass,
} from '@zenkuu/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenkuu/ui'

import { getLocale } from 'next-intl/server'

import { AssetList } from '@/components/AssetList'
import { CoverageList } from '@/components/CoverageList'
import { AssetClassSection } from '@/components/home/AssetClassSection'
import { ClassMoversGrid } from '@/components/home/ClassMoversGrid'
import { EconomyPreview } from '@/components/home/EconomyPreview'
import { ExploreTable } from '@/components/home/ExploreTable'
import { GlobalPulse } from '@/components/home/GlobalPulse'
import { GlobalStatsBar } from '@/components/home/GlobalStatsBar'
import { HighlightPanel } from '@/components/home/HighlightPanel'
import { HomeHeatmap } from '@/components/home/HomeHeatmap'
import { HomeMasthead } from '@/components/home/HomeMasthead'
import { MarketSummaryHero } from '@/components/home/MarketSummaryHero'
import { MarketTicker } from '@/components/home/MarketTicker'
import { RecentlyAdded } from '@/components/home/RecentlyAdded'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import { NarrativesPanel, NewsPanel, SentimentPanel } from '@/components/home/SidePanels'
import { getContent, getPhrase } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'
import { withDeadline } from '@/lib/deadline'

/**
 * Combien de temps l'accueil accepte d'attendre les taux de change.
 *
 * Deux secondes : dix fois plus que le temps de réponse ordinaire de la source
 * (moins de 200 ms), donc large pour un jour normal — et cent fois moins que son
 * délai d'expiration, donc invisible le jour où elle tombe. Voir le point d'appel.
 */
const FOREX_DEADLINE_MS = 2_000

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
 * Classes d'actifs recevant une section, DANS L'ORDRE DE LA PAGE.
 *
 * La crypto ouvre parce que c'est la couverture principale du site et la seule à
 * disposer de données propres (secteurs, sentiment, nouvelles cotations) ; les
 * classes Yahoo suivent, du plus consulté au moins consulté. Les devises ferment,
 * avec leur propre bloc — la BCE ne publiant qu'un taux par jour ouvré, un palmarès
 * de « plus fortes hausses » y serait vide la plupart du temps.
 */
const YAHOO_SECTIONS: readonly AssetClass[] = ['stock', 'etf', 'index', 'commodity']

/**
 * ACCUEIL — rangé par CLASSE D'ACTIF, comme TradingView.
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI ─────────────────────────────────────────────
 *
 * La page était rangée par TYPE D'ANALYSE : « Analyse des marchés », « Analyse
 * sectorielle », « Analyse du sentiment », « Analyse des flux ». La grammaire venait
 * de Tokenomist et elle résolvait un vrai problème — une page de dix cartes sans
 * titre de groupe se parcourt en diagonale.
 *
 * Elle en laissait un autre entier, et c'est celui qu'on corrige. Un lecteur arrive
 * en cherchant un MARCHÉ, pas une méthode : « je viens voir les actions » est une
 * intention courante, « je viens faire de l'analyse sectorielle » ne l'est pas. Les
 * quatre familles obligeaient à traverser la page pour rassembler ce qui concerne une
 * seule classe — les actions apparaissaient dans le tableau d'exploration, jamais
 * dans les hausses, jamais dans le sentiment.
 *
 * ── LES ONGLETS DE CLASSE ONT DISPARU, ET C'EST UN GAIN DOUBLE ───────────────
 *
 * Le filtre `?classe=` commutait un unique tableau : voir les actions FAISAIT
 * DISPARAÎTRE la crypto. On voyait donc toujours une classe et une seule, au prix
 * d'un aller-retour serveur à chaque bascule. Les sections montrent les six à la
 * suite, sans rien masquer.
 *
 * Second gain, invisible mais réel : la page ne lit plus `searchParams`. Elle
 * redevient donc STATIQUE, régénérée toutes les 180 secondes, là où la lecture d'un
 * paramètre de requête la faisait rendre à chaque visite.
 *
 * ── POURQUOI DU STREAMING PLUTÔT QU'UN `Promise.all` ─────────────────────────
 *
 * Chaque section de classe est un composant serveur asynchrone sous son propre
 * `<Suspense>`. Le haut de page s'affiche dès qu'il est prêt, et chaque classe arrive
 * ensuite indépendamment.
 *
 * Ce n'est pas une optimisation de confort. Les classes Yahoo échouent RÉGULIÈREMENT
 * — source non officielle, quota mesuré — et un `Promise.all` fait attendre la plus
 * lente avant de rendre quoi que ce soit : une classe muette retardait toute la page.
 * Là, elle ne retarde qu'elle-même et rend son propre état vide.
 */
export default async function HomePage() {
  const fr = await getContent()
  const t = await getPhrase()
  const locale = await getLocale()

  // Requêtes du HAUT DE PAGE seulement — celles dont le premier écran a besoin. Les
  // sections de classe font les leurs, chacune sous son `<Suspense>`, et n'ont donc
  // pas à être attendues ici.
  const [globalStats, trending, overview, forex, narratives, news, sentiment, newListings] =
    await Promise.all([
      getCryptoGlobalStats('eur'),
      getTrendingCrypto('eur'),
      getCryptoOverview('eur', 5),
      /*
       * LES DEVISES ONT UNE ÉCHÉANCE ICI, ET NULLE PART AILLEURS.
       *
       * Leur fournisseur s'accorde 25 secondes, à bon droit : la BCE ne publie qu'un
       * taux par jour ouvré, et une page qui PARLE de devises préfère attendre que se
       * déclarer vide. Mais sur cette page-ci, la donnée ne sert qu'à un ruban et à un
       * compteur de couverture — rien qui vaille de retenir le premier écran.
       *
       * Mesuré : 25,3 secondes de premier octet sur l'accueil, cache froid, pendant
       * que `api.frankfurter.dev` rendait 522. Le haut de page attendait une source
       * morte pour un bandeau décoratif.
       *
       * L'en-tête de ce fichier tirait déjà la leçon pour les classes Yahoo — « un
       * `Promise.all` fait attendre la plus lente avant de rendre quoi que ce soit » —
       * et la réglait par un `Suspense` par classe. Les devises étaient restées dans le
       * lot bloquant ; l'échéance les en sort sans démonter le haut de page, puisque le
       * compteur qu'elles alimentent est sur le premier écran.
       *
       * L'appel N'EST PAS annulé : il continue et remplit le cache pour la visite
       * suivante. Voir `withDeadline`.
       */
      withDeadline(
        getForexRates(),
        FOREX_DEADLINE_MS,
        'Les taux de change n’ont pas répondu à temps. Ils reviendront d’eux-mêmes.',
      ),
      getTopNarratives(6),
      getNews(6),
      getSentiment(),
      // `4` seulement : le panneau n'en montre que quatre, et cette requête part sur
      // un quota Coinpaprika distinct de celui de CoinGecko. La page complète
      // `/nouvelles-cotations` en demande cent, avec sa propre clé de cache.
      getNewListings(4),
    ])

  const cryptoTop = overview.ok ? overview.data.topByMarketCap : []

  // Lu APRÈS `getCryptoGlobalStats` : c'est cet appel qui vient d'ajouter le point
  // du jour à la série. L'ordre compte, sinon la carte afficherait un relevé de retard.
  const marketCapSeries = getMarketCapSeriesState('EUR')

  const availability = getAvailability()

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

  /*
   * LE RUBAN RÉUTILISE CE QUI EST DÉJÀ CHARGÉ, et n'ajoute aucun appel.
   *
   * Cinq cryptoactifs et cinq paires de devises viennent des deux requêtes que le
   * haut de page fait de toute façon. Y ajouter les indices coûterait un appel Yahoo
   * — la source la plus lente et la plus fragile du site — pour un bandeau décoratif
   * qui bloquerait le premier rendu. Le mélange crypto + devises suffit à dire de quoi
   * le site parle, qui est toute la fonction de ce ruban.
   */
  const tickerAssets = [...cryptoTop.slice(0, 6), ...(forex.ok ? forex.data.slice(0, 6) : [])]

  return (
    <div className="space-y-10">
      <h1 className="sr-only">{t('{site} — explorer les marchés').replace('{site}', fr.site.name)}</h1>

      {/* ── Le ruban, EN PLEINE LARGEUR et avant tout le reste ───────────────
          `-mt-*` annule l'espacement vertical de la disposition : un bandeau défilant
          qui flotte à quarante pixels sous l'en-tête se lit comme un élément de la
          page, alors qu'il en est la bordure haute. `shell-bleed` le fait déborder de
          la colonne centrée jusqu'aux bords de l'écran, comme chez la référence. */}
      <div className="shell-bleed -mt-6">
        <MarketTicker assets={tickerAssets} />
      </div>

      <HomeMasthead
        stats={globalStats.ok ? globalStats.data : null}
        trackedAssets={trackedAssets}
        locale={locale}
      />

      <GlobalStatsBar
        stats={globalStats.ok ? globalStats.data : null}
        sentiment={sentiment.ok ? sentiment.data : null}
      />

      {/* ── RÉSUMÉ DES MARCHÉS ────────────────────────────────────────────────
          Le tracé large de TradingView et la colonne d'indices. Ce bloc répond à
          « comment va le marché » avant qu'un seul chiffre n'ait été lu. */}
      <AssetClassSection title={fr.home.summaryTitle} id="resume">
        <MarketSummaryHero series={marketCapSeries} />

        {/*
          TROIS CARTES SOUS LE HÉRO — l'agrégat, ce qui vient d'arriver, ce qui se dit.

          `items-stretch` est le défaut de la grille et il est VOULU : ces trois cartes
          forment une bande, et une bande dont les cartes finissent à des hauteurs
          différentes se lit comme un défaut d'alignement. Aucun `h-full` n'est
          nécessaire — les éléments de grille s'étirent d'eux-mêmes.

          LARGEURS INÉGALES, 2/1/1. `GlobalPulse` n'est pas une carte mais DEUX, posées
          côte à côte — capitalisation et volume, chacune avec sa courbe. Dans un tiers
          de la largeur, ces deux-là tomberaient à un sixième chacune, soit une courbe
          de cent pixels de large.
        */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {globalStats.ok ? (
            /* 128 et non 56 : dans cette bande, les deux cartes sont étirées à la
               hauteur du panneau d'actualités. Une courbe basse y laisserait un vide au
               milieu de la carte ; une courbe haute occupe le bas comme un fond. */
            <GlobalPulse stats={globalStats.data} series={marketCapSeries} sparkHeight={128} />
          ) : (
            <EmptyState
              title={fr.states.unavailableTitle}
              description={globalStats.reason}
              compact
            />
          )}

          <RecentlyAdded result={newListings} />

          {/* `limit={5}` : la bande est étirée à la hauteur de sa carte la plus haute,
              et celle-ci l'est toujours. Un article de plus ici allonge les deux cartes
              d'agrégat de quarante pixels chacune, sans rien leur ajouter. */}
          <NewsPanel result={news} limit={5} />
        </div>
      </AssetClassSection>

      {/* ── CRYPTO ────────────────────────────────────────────────────────────

          La section la plus fournie, et c'est justifié : c'est la seule classe pour
          laquelle le site dispose de données PROPRES au-delà des cours — secteurs,
          indice de sentiment, nouvelles cotations. Les panneaux « Analyse
          sectorielle » et « Analyse du sentiment », qui formaient leurs propres
          familles, sont redescendus ici : ils ne parlaient que de crypto, et les
          présenter comme des familles autonomes le laissait croire général. */}
      <AssetClassSection
        title={fr.assetClass.crypto}
        href={marketHref('crypto')}
        moreLabel={fr.home.seeAll}
        id="crypto"
      >
        {cryptoTop.length > 0 ? (
          <>
            <ExploreTable
              assets={cryptoTop}
              title={`Explorer — ${fr.assetClass.crypto}`}
              moreHref={marketHref('crypto')}
            />
            <SourceNote
              label={overview.ok ? overview.source.label : ''}
              href={overview.ok ? overview.source.attributionUrl : '#'}
              updatedAt={cryptoTop[0]?.lastUpdated}
            />
          </>
        ) : (
          <EmptyState
            title={fr.states.unavailableTitle}
            description={overview.ok ? null : overview.reason}
            source={overview.source?.label ?? null}
            tone={overview.ok ? 'neutral' : 'warning'}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TrendingPanel
            assets={trending.ok ? trending.data : null}
            unavailableReason={trending.ok ? undefined : trending.reason}
          />

          <HighlightPanel
            title={fr.home.gainersTitle}
            hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
            assets={overview.ok ? overview.data.gainers : null}
            href="/points-marquants"
            unavailableReason={overview.ok ? undefined : overview.reason}
          />

          <HighlightPanel
            title={fr.home.losersTitle}
            hint={overview.ok ? fr.home.moversHint(overview.data.universeSize) : undefined}
            assets={overview.ok ? overview.data.losers : null}
            href="/points-marquants"
            unavailableReason={overview.ok ? undefined : overview.reason}
          />
        </div>

        {/* `items-start` — DEUX COLONNES DE HAUTEURS INDÉPENDANTES, DITES COMME
            TELLES. Sans lui, la grille étire chaque cellule à la hauteur de la plus
            haute, et le moindre `h-full` intérieur — inoffensif partout ailleurs —
            trouverait enfin un pourcentage auquel se raccrocher et déborderait. */}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <NarrativesPanel result={narratives} />
          <SentimentPanel result={sentiment} />
        </div>

        {/* ── La carte thermique ───────────────────────────────────────
            APRÈS les listes et non avant, et l'ordre est le raisonnement : les trois
            panneaux répondent à « qu'est-ce qui bouge », la carte à « dans quelles
            proportions ». La seconde question ne se pose qu'une fois la première
            répondue. Sous `<Suspense>` — voir l'en-tête de `HomeHeatmap`. */}
        <Suspense fallback={<HeatmapSkeleton />}>
          <HomeHeatmap />
        </Suspense>
      </AssetClassSection>

      {/* ── ACTIONS · ETF · INDICES · MATIÈRES PREMIÈRES ──────────────────────

          Chacune sous son propre `<Suspense>` : ces quatre classes viennent de Yahoo,
          dont un classement se construit SYMBOLE PAR SYMBOLE. Elles sont donc les plus
          lentes de la page et les plus susceptibles d'échouer. Isolées, une panne sur
          les ETF n'empêche ni les actions ni le reste de la page de s'afficher. */}
      {YAHOO_SECTIONS.map((assetClass) => (
        <AssetClassSection
          key={assetClass}
          title={fr.assetClass[assetClass]}
          href={marketHref(assetClass)}
          moreLabel={fr.home.seeAll}
          id={assetClass}
        >
          <Suspense fallback={<SectionSkeleton />}>
            <ClassMoversGrid assetClass={assetClass} />
          </Suspense>
        </AssetClassSection>
      ))}

      {/* ── DEVISES ───────────────────────────────────────────────────────────

          Pas de palmarès ici, contrairement aux autres classes, et c'est une
          contrainte de source assumée : la BCE ne publie qu'un taux de référence par
          jour ouvré. « Plus fortes hausses sur 24 h » serait vide le week-end et
          identique du lundi au vendredi. */}
      <AssetClassSection
        title={fr.assetClass.forex}
        href={marketHref('forex')}
        moreLabel={fr.home.seeAll}
        id="devises"
      >
        <Card>
          <CardHeader title={fr.home.forexTitle} hint={fr.home.forexHint} />
          {forex.ok && forex.data.length > 0 ? (
            <>
              <AssetList assets={forex.data.slice(0, 8)} />
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
      </AssetClassSection>

      {/* ── ÉCONOMIE ──────────────────────────────────────────────────────────
          Sous `<Suspense>` pour la même raison que les classes Yahoo : la Banque
          mondiale répond par à-coups, et une de ses absences ne doit pas retenir le
          reste de la page. */}
      <AssetClassSection title={fr.home.economyTitle} href="/macro" moreLabel={fr.home.seeAll} id="economie">
        <Suspense fallback={<SectionSkeleton />}>
          <EconomyPreview />
        </Suspense>
      </AssetClassSection>

      {/* Hors sections : la couverture ne décrit pas un marché mais le SITE. La ranger
          sous un intitulé de classe la ferait lire comme une donnée de marché. */}
      <Card>
        <CardHeader title={fr.home.coverageTitle} />
        <CoverageList availability={availability} />
      </Card>
    </div>
  )
}

/**
 * Substitut affiché pendant qu'une section charge.
 *
 * HAUTEUR PROCHE DU CONTENU RÉEL, délibérément. Un substitut plus court que ce qu'il
 * remplace fait sauter tout le bas de la page à l'arrivée des données — le décalage
 * de mise en page que mesure Core Web Vitals. Trois panneaux d'environ 200 pixels
 * correspondent à ce que rend `ClassMoversGrid`.
 */
function SectionSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-[200px] animate-pulse rounded-card border border-border-subtle bg-surface-muted"
        />
      ))}
    </div>
  )
}

/**
 * Substitut de la carte thermique.
 *
 * Distinct de `SectionSkeleton` parce qu'il remplace une figure d'un seul bloc, là où
 * l'autre remplace trois panneaux côte à côte. La hauteur reprend celle que
 * `GroupedTreemap` occupe réellement — même motif que ci-dessus : un substitut plus
 * court ferait sauter tout le bas de la page à l'arrivée des données.
 */
function HeatmapSkeleton() {
  return (
    <div
      className="h-[min(78vh,640px)] animate-pulse rounded-card border border-border-subtle bg-surface-muted"
      aria-hidden="true"
    />
  )
}
