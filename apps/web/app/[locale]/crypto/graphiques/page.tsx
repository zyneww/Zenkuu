import type { Metadata } from 'next'
import { Suspense } from 'react'

import {
  CACHE_TTL_SECONDS,
  getAssetHistory,
  getCategories,
  getCryptoGlobalStats,
  getMarketCapBasket,
  getMoversUniverse,
  getMarketCapSeriesState,
  getNftCollections,
  getSentimentHistory,
  getTreasuries,
  type PriceHistory,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { BasketCharts } from '@/components/market/BasketCharts'
import { CategoryExplorer } from '@/components/categories/CategoryExplorer'
import { CategoryStatBand } from '@/components/categories/CategoryStatBand'
import {
  ChartsTabs,
  readChartView,
  type ChartView,
} from '@/components/market/ChartsTabs'
import { DominanceView } from '@/components/market/DominanceView'
import { GlobalChartsView } from '@/components/market/GlobalChartsView'
import { MacroBand } from '@/components/market/MacroBand'
import { MarketOverviewCard } from '@/components/home/MarketOverviewCard'
import { NftCollectionGrid } from '@/components/market/NftCollectionGrid'
import { NftOverview } from '@/components/market/NftOverview'
import { MarketHeatmap } from '@/components/tools/MarketHeatmap'
import { SentimentHistoryView } from '@/components/sentiment/SentimentHistoryView'
import { TreasuryOverview } from '@/components/market/TreasuryOverview'
import { TreasuryTable } from '@/components/market/TreasuryTable'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLES: Record<ChartView, { title: string; lead: string }> = {
  global: {
    title: 'Graphiques globaux',
    lead: 'L’état du marché dans la durée : agrégats mondiaux, capitalisation et volumes des deux plus grandes cryptomonnaies, puis l’indice de sentiment sur un an.',
  },
  dominance: {
    title: 'Dominance de Bitcoin',
    lead: 'La part de la capitalisation mondiale que représente Bitcoin. Elle monte quand le marché se replie vers lui, et baisse quand le reste progresse plus vite.',
  },
  secteurs: {
    title: 'Carte thermique',
    lead: 'Chaque rectangle est une pièce ou un narratif, sa taille sa capitalisation, sa couleur sa variation. Par pièce on voit qui bouge, par secteur on voit où ça bouge.',
  },
  categories: {
    title: 'Catégories & secteurs',
    lead: 'Les narratifs du marché, triables et filtrables — capitalisation, volume et performance de chacun.',
  },
  tresoreries: {
    title: 'Trésoreries d’entreprise',
    lead: 'Les sociétés cotées qui déclarent détenir du bitcoin ou de l’ether à leur bilan, ce qu’elles ont payé et ce que cela vaut aujourd’hui.',
  },
  nft: {
    title: 'Collections NFT',
    lead: 'Une sélection de collections de référence : prix plancher, capitalisation et volume. Ce n’est pas un classement — voir la note en bas de page.',
  },
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const view = readChartView((await searchParams)['vue'])
  const entry = TITLES[view]

  return {
    title: entry.title,
    description: entry.lead,
    alternates: { canonical: '/crypto/graphiques' },
  }
}

/**
 * GRAPHIQUES GLOBAUX — six vues du marché pris de loin.
 *
 * ── CE QUE CETTE PAGE NE PEUT PAS MONTRER, ET POURQUOI ───────────────────────
 *
 * La référence ouvre sur une courbe de la capitalisation MONDIALE sur plusieurs
 * années. Aucune source gratuite ne la publie : l'endpoint correspondant de CoinGecko
 * répond 401 hors abonnement, et la reconstituer depuis la capitalisation de Bitcoin
 * divisée par sa dominance actuelle serait une estimation présentée comme une mesure —
 * précisément ce que le §5 interdit, d'autant que la dominance a bougé sur toute
 * période un peu longue.
 *
 * Trois réponses honnêtes, toutes retenues ici :
 *  · la capitalisation totale et la dominance sont tracées sur NOS PROPRES RELEVÉS,
 *    avec leur profondeur réelle affichée — courte, mais chaque point a été lu chez la
 *    source ;
 *  · les courbes longues portent sur Bitcoin et Ethereum, dont la source publie
 *    réellement un an de capitalisation, de volume et de cours ;
 *  · le sentiment remonte à un an, parce que sa source le publie.
 *
 * ── CHAQUE VUE CHARGE CE QU'ELLE MONTRE, ET RIEN D'AUTRE ─────────────────────
 *
 * Les six vues vivent sur une seule route mais NE PARTAGENT PAS leurs appels. Les
 * trésoreries et les collections en coûtent six à huit chacune, sur un fournisseur
 * plafonné à huit par minute ; les charger à chaque ouverture de la page ferait payer
 * ce coût à quelqu'un venu regarder la dominance. Les conditions portent donc les
 * APPELS, pas seulement l'affichage — un composant non rendu n'est jamais invoqué.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const view = readChartView((await searchParams)['vue'])
  const entry = TITLES[view]

  return (
    <div className="space-y-8">
      <ChartsTabs current={view} />

      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{entry.title}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{entry.lead}</p>
      </header>

      {view === 'global' ? <GlobalView /> : null}
      {view === 'dominance' ? <DominanceSection /> : null}
      {view === 'secteurs' ? <HeatmapSection /> : null}
      {view === 'categories' ? <CategoriesSection /> : null}

      {/*
        ── LES DEUX VUES LENTES SONT MISES EN FLUX ────────────────────────────

        Ces deux-là ne coûtent pas un appel mais SIX à HUIT, sur un fournisseur limité
        à huit par minute. Sur un cache froid, la réponse se compte en dizaines de
        secondes — mesuré, et c'est irréductible : ces endpoints ne se demandent qu'un
        par un.

        Ce qui est réductible, c'est l'ATTENTE AVANT LE PREMIER PIXEL. Sans `Suspense`,
        le serveur retient la page entière jusqu'au dernier appel : le lecteur regarde
        un écran blanc, sans titre, sans onglets, sans savoir si le site répond. Avec,
        l'en-tête et les onglets partent immédiatement et le contenu arrive ensuite —
        même durée totale, mais une page qui existe pendant qu'elle se remplit.

        Les quatre autres vues n'en ont pas besoin : un ou deux appels déjà partagés
        avec le reste du site, donc pratiquement toujours en cache.
      */}
      {view === 'tresoreries' ? (
        <Suspense fallback={<LoadingNote label="Lecture des registres de trésorerie…" />}>
          <TreasuriesSection />
        </Suspense>
      ) : null}

      {view === 'nft' ? (
        <Suspense fallback={<LoadingNote label="Lecture des collections…" />}>
          <NftSection />
        </Suspense>
      ) : null}
    </div>
  )
}

/* ── VUE GÉNÉRALE ───────────────────────────────────────────────────────────── */

/**
 * Repère d'attente des vues mises en flux.
 *
 * Une PHRASE et non une silhouette grise. Un squelette animé promet une forme, et se
 * justifie quand l'attente dure une seconde ; celle-ci peut durer trente sur un cache
 * froid, et une silhouette qui palpite une demi-minute se lit comme un blocage. Dire ce
 * qu'on attend, et pourquoi c'est long, informe là où une animation décore.
 */
function LoadingNote({ label }: { label: string }) {
  return (
    <p className="rounded-card border border-border-subtle bg-surface px-4 py-6 text-sm text-ink-muted">
      {label}
      <span className="block pt-1 text-xs">
        Cette source se demande une entrée à la fois et limite fortement les appels
        gratuits : le premier chargement peut prendre plusieurs dizaines de secondes. Les
        suivants sont servis depuis le cache pendant une heure.
      </span>
    </p>
  )
}

async function GlobalView() {
  const [globalStats, btc, eth, sentiment] = await Promise.all([
    getCryptoGlobalStats('eur'),
    getAssetHistory('bitcoin', 'crypto', 365, 'eur'),
    getAssetHistory('ethereum', 'crypto', 365, 'eur'),
    getSentimentHistory(365),
  ])


  // Lu APRÈS `getCryptoGlobalStats` : c'est cet appel qui vient d'ajouter le point du
  // jour à la série enregistrée.
  const marketCapSeries = getMarketCapSeriesState('EUR')

  const histories: Partial<Record<'bitcoin' | 'ethereum', PriceHistory>> = {}
  if (btc.ok) histories.bitcoin = btc.data
  if (eth.ok) histories.ethereum = eth.data

  return (
    <div className="space-y-12 sm:space-y-16">
      {globalStats.ok ? (
        <>
          <MacroBand stats={globalStats.data} />
          <SourceNote
            label={globalStats.source.label}
            href={globalStats.source.attributionUrl}
            updatedAt={globalStats.data.lastUpdated}
          />
        </>
      ) : (
        <EmptyState title="Agrégats mondiaux indisponibles" description={globalStats.reason} />
      )}

      <MarketOverviewCard result={globalStats} series={marketCapSeries} />

      {/*
        ── LE PANIER, ENTRE NOS RELEVÉS DE 24 H ET LES COURBES PAR ACTIF ────────

        Sa place dans la page est un argument à elle seule. Au-dessus, la carte
        d'aperçu montre ce que nous avons MESURÉ nous-mêmes : vingt-quatre heures, pas
        une de plus. En dessous, les courbes longues montrent Bitcoin et Ethereum, un
        actif à la fois. Le panier est exactement ce qui manquait entre les deux — une
        profondeur d'un an sur un agrégat — et il est posé là pour qu'on lise dans cet
        ordre : ce qu'on a relevé, ce qu'on a additionné, ce que la source publie
        directement.

        Il n'apparaît que s'il a abouti. Un encadré d'échec de plus n'apprendrait rien
        que la carte d'aperçu juste au-dessus ne dise déjà.
      */}
      <Suspense fallback={<LoadingNote label="Assemblage du panier de capitalisations…" />}>
        <BasketSection />
      </Suspense>

      {btc.ok || eth.ok ? (
        <>
          <GlobalChartsView histories={histories} />
          <SourceNote
            label={(btc.ok ? btc.source : eth.ok ? eth.source : { label: '' }).label}
            href={
              (btc.ok ? btc.source : eth.ok ? eth.source : { attributionUrl: '#' }).attributionUrl
            }
          />
        </>
      ) : (
        <EmptyState
          title="Courbes longues indisponibles"
          description={btc.ok ? null : btc.reason}
          tone="warning"
        />
      )}

      {sentiment.ok && sentiment.data.length > 1 ? (
        <div className="space-y-4">
          <SentimentHistoryView points={sentiment.data} />
          <p className="text-sm text-ink-muted">
            L’indice et sa méthode sont détaillés sur la{' '}
            <Link href="/sentiment" className="text-brand hover:underline">
              page dédiée au sentiment
            </Link>
            .
          </p>
          <SourceNote label={sentiment.source.label} href={sentiment.source.attributionUrl} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Panier de capitalisations — MIS EN FLUX, comme les trésoreries et les collections.
 *
 * Neuf séries d'un an, dont sept que la page n'a pas déjà chargées. Sur un cache froid
 * et un palier gratuit plafonné à quelques appels par minute, l'assemblage se compte en
 * dizaines de secondes.
 *
 * Ce qui est réductible n'est pas cette durée mais l'ATTENTE AVANT LE PREMIER PIXEL :
 * sans `Suspense`, la vue macro et la carte d'aperçu — toutes deux servies depuis un
 * cache partagé avec le reste du site, donc instantanées — resteraient retenues jusqu'au
 * dernier appel du panier.
 *
 * L'ordre de la page ne change pas, seulement l'ordre d'ARRIVÉE.
 */
async function BasketSection() {
  const basket = await getMarketCapBasket('eur', 365)

  // Un encadré d'échec de plus n'apprendrait rien que la carte d'aperçu, juste
  // au-dessus, ne dise déjà de l'état de la source.
  if (!basket.ok) return null

  return (
    <div className="space-y-4">
      <BasketCharts basket={basket.data} />
      <SourceNote label={basket.source.label} href={basket.source.attributionUrl} />
    </div>
  )
}

/* ── DOMINANCE ──────────────────────────────────────────────────────────────── */

async function DominanceSection() {
  const globalStats = await getCryptoGlobalStats('eur')
  const series = getMarketCapSeriesState('EUR')

  /*
   * LE PANIER DONNE À CETTE VUE LA PROFONDEUR QU'ELLE N'AVAIT PAS.
   *
   * Elle reposait entièrement sur nos propres relevés — vingt-quatre heures au mieux,
   * repartant de zéro à chaque redéploiement. C'était honnête et à peu près inutile :
   * la dominance se lit sur des mois, et une courbe d'une journée n'en montre que le
   * bruit.
   *
   * La vue « Répartition » du panier couvre un an. Ce n'est PAS la dominance au sens
   * strict — c'est une part dans neuf actifs, pas dans dix-huit mille — et les deux
   * blocs cohabitent pour cette raison précise plutôt que l'un remplaçant l'autre :
   * celui du haut donne la vraie mesure sur une fenêtre courte, celui du bas une
   * mesure approchante sur une fenêtre longue. Chacun dit lequel il est.
   */
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <DominanceView
          series={series}
          current={globalStats.ok ? globalStats.data.dominance : undefined}
        />
        {globalStats.ok ? (
          <SourceNote
            label={globalStats.source.label}
            href={globalStats.source.attributionUrl}
            updatedAt={globalStats.data.lastUpdated}
          />
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="rounded-card border border-brand/25 bg-brand-soft/55 px-4 py-3">
          <h2 className="text-xs font-semibold text-ink">Et sur un an ?</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">
            La dominance ci-dessus est la vraie : Bitcoin rapporté au marché entier, tel que
            la source le publie. Sa profondeur est celle de nos propres relevés, c’est-à-dire
            quelques heures. Pour voir la tendance sur douze mois, il faut accepter une
            mesure approchante — la part de Bitcoin dans un panier de neuf actifs, dont la
            composition est listée sous les courbes. Choisissez la vue
            «&nbsp;Répartition&nbsp;».
          </p>
        </div>

        <Suspense fallback={<LoadingNote label="Assemblage du panier de capitalisations…" />}>
          <BasketSection />
        </Suspense>
      </div>
    </div>
  )
}

/* ── SECTEURS ───────────────────────────────────────────────────────────────── */

async function HeatmapSection() {
  /*
   * Les deux découpages — par pièce et par secteur — sont servis ensemble, et ni l'un
   * ni l'autre ne coûte d'appel : `getCategories` alimente déjà `/categories` et la vue
   * « Catégories » d'à côté, `getMoversUniverse` alimente déjà `/crypto/mouvements`.
   * Leurs clés de cache ne dépendent d'aucun actif.
   */
  const [categories, assets] = await Promise.all([getCategories(), getMoversUniverse(100, 'eur')])

  const hasSectors = categories.ok && categories.data.length > 0
  const hasAssets = assets.ok && assets.data.length > 0

  if (!hasSectors && !hasAssets) {
    return (
      <EmptyState
        title="Carte indisponible"
        description={categories.ok ? null : categories.reason}
        source={categories.source?.label ?? null}
        tone={categories.ok ? 'neutral' : 'warning'}
      />
    )
  }

  return (
    <div className="space-y-4">
      <MarketHeatmap
        assets={assets.ok ? assets.data : []}
        categories={categories.ok ? categories.data : []}
      />
      <SourceNote
        label={(categories.ok ? categories.source : assets.source)?.label ?? 'CoinGecko'}
        href={
          (categories.ok ? categories.source : assets.source)?.attributionUrl ??
          'https://www.coingecko.com'
        }
      />
    </div>
  )
}

/* ── CATÉGORIES ─────────────────────────────────────────────────────────────── */

async function CategoriesSection() {
  const categories = await getCategories()

  if (!categories.ok || categories.data.length === 0) {
    return (
      <EmptyState
        title="Catégories indisponibles"
        description={categories.ok ? null : categories.reason}
        source={categories.source?.label ?? null}
        tone={categories.ok ? 'neutral' : 'warning'}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* La bande AVANT le tableau : trois cent soixante lignes ne disent pas quel
          secteur domine ni lequel bouge tant qu'on ne les a pas triées trois fois. Elle
          porte aussi l'aveu sur les courbes sectorielles que nous ne pouvons pas
          tracer — voir son en-tête. Aucun appel supplémentaire, même donnée. */}
      <CategoryStatBand categories={categories.data} />

      <div className="space-y-4">
        <CategoryExplorer categories={categories.data} />
        <SourceNote label={categories.source.label} href={categories.source.attributionUrl} />
      </div>
    </div>
  )
}

/* ── TRÉSORERIES ────────────────────────────────────────────────────────────── */

async function TreasuriesSection() {
  /*
   * Les deux registres partent ENSEMBLE, et chacun peut échouer seul : le fournisseur
   * est plafonné à cinq appels par minute, et il est normal que le second attende. Un
   * `Promise.all` classique suffit ici — `runStandalone` ne rejette jamais, il rend un
   * résultat en échec.
   */
  const [bitcoin, ethereum] = await Promise.all([
    getTreasuries('bitcoin'),
    getTreasuries('ethereum'),
  ])

  if (!bitcoin.ok && !ethereum.ok) {
    return (
      <EmptyState
        title="Registres de trésorerie indisponibles"
        description={bitcoin.reason}
        source={bitcoin.source?.label ?? null}
        tone="warning"
      />
    )
  }

  /*
   * La vue d'ensemble passe AVANT les deux registres, et elle est construite à partir
   * d'eux — aucun appel supplémentaire. Les tableaux répondent à « qui détient quoi » ;
   * les quatre compteurs et la carte répondent à « combien sont-ils, et à quel point
   * est-ce concentré », question que deux cents lignes triées laissent deviner sans
   * jamais la montrer.
   */
  const reports = [
    ...(bitcoin.ok ? [{ coin: 'bitcoin', label: 'Bitcoin', unit: 'BTC', report: bitcoin.data }] : []),
    ...(ethereum.ok
      ? [{ coin: 'ethereum', label: 'Ethereum', unit: 'ETH', report: ethereum.data }]
      : []),
  ]

  return (
    <div className="space-y-10">
      <TreasuryOverview reports={reports} />

      {bitcoin.ok ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display-sm text-ink">Bitcoin</h2>
            <p className="tabular text-sm text-ink-muted">
              {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                bitcoin.data.totalHoldings,
              )}{' '}
              BTC détenus
              {bitcoin.data.percentOfMarketCap !== undefined
                ? ` · ${bitcoin.data.percentOfMarketCap.toFixed(2).replace('.', ',')} % de la capitalisation`
                : ''}
            </p>
          </div>
          <TreasuryTable report={bitcoin.data} unit="BTC" />
        </section>
      ) : null}

      {ethereum.ok ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display-sm text-ink">Ethereum</h2>
            <p className="tabular text-sm text-ink-muted">
              {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                ethereum.data.totalHoldings,
              )}{' '}
              ETH détenus
              {ethereum.data.percentOfMarketCap !== undefined
                ? ` · ${ethereum.data.percentOfMarketCap.toFixed(2).replace('.', ',')} % de la capitalisation`
                : ''}
            </p>
          </div>
          <TreasuryTable report={ethereum.data} unit="ETH" />
        </section>
      ) : null}

      <SourceNote
        label={`${(bitcoin.ok ? bitcoin.source : ethereum.source)?.label ?? ''} · montants en USD`}
        href={(bitcoin.ok ? bitcoin.source : ethereum.source)?.attributionUrl ?? '#'}
      />
    </div>
  )
}

/* ── NFT ────────────────────────────────────────────────────────────────────── */

async function NftSection() {
  const collections = await getNftCollections()

  if (!collections.ok) {
    return (
      <EmptyState
        title="Collections indisponibles"
        description={collections.reason}
        source={collections.source?.label ?? null}
        tone="warning"
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* La vue d'ensemble AVANT la grille : dix vignettes triées ne disent pas que la
          première pèse plus que les cinq suivantes réunies, et c'est la première chose
          à savoir sur ce marché. Aucun appel supplémentaire — même réponse. */}
      <NftOverview collections={collections.data} />

      <NftCollectionGrid collections={collections.data} />

      {/*
        L'AVERTISSEMENT N'EST PAS UNE FORMULE DE PRUDENCE.

        Une grille ordonnée par capitalisation ressemble exactement à un classement.
        Le lecteur qui la prendrait pour tel en conclurait que rien n'existe hors de
        ces dix collections — alors que la vraie raison de leur présence est qu'elles
        sont les seules que nous interrogeons nommément, l'endpoint de classement étant
        réservé à l'offre payante.
      */}
      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        <strong className="text-ink">Sélection, et non classement.</strong> La source
        réserve son classement des collections à son offre payante ; seule la fiche d’une
        collection nommée est gratuite. Cette liste est donc arrêtée à la main sur des
        collections de référence, et l’ordre d’affichage n’est qu’un tri par
        capitalisation — d’autres collections plus grandes peuvent exister sans figurer ici.
      </p>

      <SourceNote
        label={`${collections.source.label} · montants en USD`}
        href={collections.source.attributionUrl}
      />
    </div>
  )
}
