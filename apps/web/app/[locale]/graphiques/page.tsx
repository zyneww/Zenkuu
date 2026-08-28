import type { Metadata } from 'next'
import { Suspense } from 'react'

import {
  CACHE_TTL_SECONDS,
  getAssetHistory,
  getCategories,
  getCryptoGlobalStats,
  getCryptoOverview,
  getMarketCapBasket,
  getMoversUniverse,
  getMarketCapSeriesState,
  getNftCollections,
  getSentiment,
  getSentimentHistory,
  getTreasuries,
  type GlobalMarketStats,
  type PriceHistory,
} from '@zenkuu/data'
import { EmptyState, SourceNote, formatCompact, formatCurrency, formatPercent } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { fill, weave } from '@/components/locale/emphasise'
import { AltcoinSeasonGauge } from '@/components/market/AltcoinSeasonGauge'
import { FearGreedDial } from '@/components/market/FearGreedDial'
import { MarketPulseCards } from '@/components/market/MarketPulseCards'
import { CategoryExplorer } from '@/components/categories/CategoryExplorer'
import { CategoryStatBand } from '@/components/categories/CategoryStatBand'
import { ChartsSidebar } from '@/components/market/ChartsSidebar'
import {
  ChartsTabs,
  readChartView,
  type ChartView,
} from '@/components/market/ChartsTabs'
import { DominanceView } from '@/components/market/DominanceView'
import { GlobalChartCard } from '@/components/market/GlobalChartCard'
import { NftCollectionGrid } from '@/components/market/NftCollectionGrid'
import { NftOverview } from '@/components/market/NftOverview'
import { MarketHeatmap } from '@/components/tools/MarketHeatmap'
import { TreasuryOverview } from '@/components/market/TreasuryOverview'
import { TreasuryTable } from '@/components/market/TreasuryTable'
import { computeAltcoinSeason } from '@/lib/altcoin-season'
import { getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLES: Record<ChartView, { title: string; lead: string }> = {
  global: {
    title: 'Vue d’ensemble du marché',
    lead: 'L’état du marché dans la durée : agrégats mondiaux, capitalisation et volumes des deux plus grandes cryptomonnaies, puis l’indice de sentiment sur un an.',
  },
  dominance: {
    title: 'Dominance de Bitcoin',
    lead: 'La part de la capitalisation mondiale que représente Bitcoin. Elle monte quand le marché se replie vers lui, et baisse quand le reste progresse plus vite.',
  },
  altseason: {
    title: 'Saison des altcoins',
    lead: 'La part des cent premières capitalisations qui a fait mieux que Bitcoin sur trente jours. Au-dessus de 75 %, le marché favorise les altcoins ; en dessous de 25 %, il se replie sur Bitcoin.',
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
  const t = await getPhrase()
  const view = readChartView((await searchParams)['vue'])
  const entry = TITLES[view]

  return {
    title: t(entry.title),
    description: t(entry.lead),
    alternates: { canonical: '/graphiques' },
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
  const t = await getPhrase()
  const view = readChartView((await searchParams)['vue'])
  const entry = TITLES[view]

  return (
    /*
      ── DEUX COLONNES : LE RAIL, PUIS LA VUE ────────────────────────────────
      C'est la disposition de la référence. Le rail est `sticky` et disparaît sous
      `lg` (voir `ChartsSidebar`) ; `min-w-0` sur la colonne de droite est
      OBLIGATOIRE, sans quoi la largeur minimale d'une piste flexible est celle de
      son contenu — un tableau large y pousserait le rail hors de l'écran au lieu de
      défiler dans sa propre boîte.
    */
    <div className="flex gap-8">
      <ChartsSidebar current={view} />

      <div className="min-w-0 flex-1 space-y-8">
        <ChartsTabs current={view} />

        <header className="max-w-3xl space-y-3">
          <h1 className="display-xl text-ink">{t(entry.title)}</h1>
          <p className="text-lg leading-relaxed text-ink-muted">{t(entry.lead)}</p>
        </header>

        {view === 'global' ? <GlobalView /> : null}
        {view === 'dominance' ? <DominanceSection /> : null}
        {view === 'altseason' ? <AltseasonSection /> : null}
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
          <Suspense fallback={<LoadingNote label={t('Lecture des registres de trésorerie…')} />}>
            <TreasuriesSection />
          </Suspense>
        ) : null}

        {view === 'nft' ? (
          <Suspense fallback={<LoadingNote label={t('Lecture des collections…')} />}>
            <NftSection />
          </Suspense>
        ) : null}
      </div>
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
async function LoadingNote({ label }: { label: string }) {
  const t = await getPhrase()
  return (
    <p className="rounded-card border border-border-subtle bg-surface px-4 py-6 text-sm text-ink-muted">
      {label}
      <span className="block pt-1 text-xs">{t('Cette source se demande une entrée à la fois et limite fortement les appels gratuits : le premier chargement peut prendre plusieurs dizaines de secondes. Les suivants sont servis depuis le cache pendant une heure.')}</span>
    </p>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * VUE GÉNÉRALE — REFAITE EN CADRES, À LA MANIÈRE DE COINGECKO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI CE N'EST PAS UN HABILLAGE ───────────────────
 *
 * La vue empilait cinq blocs de natures différentes : une bande de chiffres, une
 * carte d'aperçu, un panier à quatre onglets, un explorateur à trois sélecteurs
 * partagés, une courbe de sentiment. Chacun avait sa forme et ses commandes ; deux
 * séries ne se comparaient qu'en faisant défiler, et aucun bloc ne disait de quelle
 * ASSIETTE il parlait.
 *
 * La référence (`coingecko.com/en/charts`) pose au contraire :
 *
 *   1. un TITRE suivi d'une phrase qui chiffre l'état du marché ;
 *   2. un GRAND CADRE — capitalisation totale, ses propres paliers de période, sa
 *      courbe, et une ligne de totaux qui dit ce que la courbe compte ;
 *   3. une GRILLE À DEUX COLONNES de cadres identiques, un par série.
 *
 * C'est cette structure qui est reprise, cadre par cadre. Ce qui ne l'est pas : sa
 * barre latérale gauche — les onglets du haut sont conservés, comme demandé.
 *
 * ── CE QUE LES CADRES TRACENT RÉELLEMENT ─────────────────────────────────────
 *
 * ⚠️ La capitalisation MONDIALE n'est pas accessible gratuitement en série (voir
 * l'en-tête du fichier). Le grand cadre trace donc le PANIER SUIVI — neuf actifs
 * additionnés — et il le dit, dans son titre comme dans sa ligne de composition.
 * L'appeler « capitalisation totale » ferait passer neuf actifs pour dix-huit mille.
 */
async function GlobalView() {
  const t = await getPhrase()
  /*
   * ── LES DEUX APPELS AJOUTÉS NE COÛTENT RIEN DE PLUS ───────────────────────
   *
   * `getSentiment()` alimente déjà `/sentiment` et le rail de l'accueil.
   *
   * `getCryptoOverview()` alimente déjà le TABLEAU DE L'ACCUEIL, et c'est pour cela
   * qu'il est choisi ici plutôt que `getMoversUniverse` : lui seul demande les
   * COURBES MINIATURES à la source (`withSparkline`). Passer par l'univers des
   * variations aurait rendu cinq cartes sans tracé — ou obligé à un second appel
   * pour les obtenir, sur un budget qui n'en autorise qu'une poignée.
   *
   * Les clés de cache des deux ne dépendent d'aucun actif : la rangée de tête et le
   * cadran sont donc composés à partir de réponses que le site a déjà.
   */
  const [globalStats, btc, eth, sentiment, pulse, mood] = await Promise.all([
    getCryptoGlobalStats('eur'),
    getAssetHistory('bitcoin', 'crypto', 365, 'eur'),
    getAssetHistory('ethereum', 'crypto', 365, 'eur'),
    getSentimentHistory(365),
    getCryptoOverview('eur', 5),
    getSentiment(),
  ])

  const stats = globalStats.ok ? globalStats.data : null

  return (
    <div className="space-y-6">
      {/* ── LA RANGÉE DE TÊTE ────────────────────────────────────────────
          Les cinq premières capitalisations, dans l'ordre où la source les classe —
          et non une liste arrêtée à la main : un classement figé finirait par citer
          un actif sorti du haut de tableau depuis deux ans. */}
      {pulse.ok ? <MarketPulseCards assets={pulse.data.topByMarketCap.slice(0, 5)} /> : null}

      {/*
        ── LA PHRASE D'OUVERTURE, CHIFFRÉE ───────────────────────────────────

        C'est le paragraphe que la référence place sous son titre, et il fait deux
        choses qu'aucun cadre ne fait : il donne l'état du marché en une lecture, et
        il sert de résumé aux moteurs de recherche. Les nombres viennent de la même
        réponse que la bande de chiffres qu'il remplace.
      */}
      {stats ? (
        <p className="max-w-4xl text-sm leading-relaxed text-ink-muted">
          {fill(
            t(
              'La capitalisation des cryptomonnaies suivies s’élève aujourd’hui à {cap}, en variation de {change} sur vingt-quatre heures, pour un volume échangé de {volume}. Bitcoin en représente {btc}, Ethereum {eth}. Le site suit {count} cryptomonnaies.',
            ),
            {
              cap: (
                <span className="font-semibold text-ink">
                  {formatCurrency(stats.totalMarketCap, stats.currency, { compact: true })}
                </span>
              ),
              change: (
                <span className={stats.marketCapChange24h >= 0 ? 'text-up' : 'text-down'}>
                  {formatPercent(stats.marketCapChange24h) ?? '—'}
                </span>
              ),
              volume: (
                <span className="font-semibold text-ink">
                  {formatCurrency(stats.totalVolume24h, stats.currency, { compact: true })}
                </span>
              ),
              btc: (
                <span className="font-semibold text-ink">
                  {(stats.dominance.btc ?? 0).toFixed(1)} %
                </span>
              ),
              eth: (
                <span className="font-semibold text-ink">
                  {(stats.dominance.eth ?? 0).toFixed(1)} %
                </span>
              ),
              count: (
                <span className="font-semibold text-ink">{formatCompact(stats.activeAssets)}</span>
              ),
            },
          )}
        </p>
      ) : (
        <EmptyState
          title={t('Agrégats mondiaux indisponibles')}
          description={globalStats.ok ? null : globalStats.reason}
        />
      )}

      {/*
        ── LA COLONNE ÉTROITE ET LE GRAND CADRE, CÔTE À CÔTE ─────────────────

        C'est la disposition de la référence, et elle vaut mieux que l'empilement
        qu'elle remplace : les indicateurs d'ambiance — sentiment, saison des
        altcoins — se lisent EN MÊME TEMPS que la courbe de capitalisation, et non
        trois écrans plus bas. C'est précisément leur usage : ils qualifient ce que
        la courbe montre.

        Sous `xl`, la colonne repasse au-dessus du cadre plutôt qu'à côté : à moins
        de mille pixels, une colonne de 280 px laisse au graphique une largeur où
        une année de relevés quotidiens n'est plus lisible.

        LE GRAND CADRE est mis en flux : le panier coûte neuf séries d'un an sur une
        source plafonnée à quelques appels par minute, et sans `Suspense` tout ce qui
        précède — déjà en cache — resterait retenu jusqu'au dernier appel.
      */}
      <div className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="space-y-4">
          {mood.ok ? (
            <FearGreedDial index={mood.data} label={t(mood.data.classification)} />
          ) : null}

          <Suspense fallback={null}>
            <AltseasonCard />
          </Suspense>
        </div>

        <Suspense fallback={<LoadingNote label={t('Assemblage du panier de capitalisations…')} />}>
          <BasketSection stats={stats} />
        </Suspense>
      </div>

      {/*
        ── LA GRILLE À DEUX COLONNES ─────────────────────────────────────────

        Quatre cadres de même gabarit : deux capitalisations, un volume, le sentiment.
        Ce sont les séries que nos sources publient RÉELLEMENT sur un an — la
        référence y met les siennes (DeFi, stablecoins), que nous n'avons pas en série.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
        {btc.ok ? (
          <GlobalChartCard
            title="Capitalisation de Bitcoin"
            hint="Publiée par la source, jour par jour."
            format="money"
            currency={btc.data.currency}
            colorIndex={1}
            points={seriesOf(btc.data, 'marketCap')}
          />
        ) : null}

        {eth.ok ? (
          <GlobalChartCard
            title="Capitalisation d’Ethereum"
            hint="Même relevé, même profondeur."
            format="money"
            currency={eth.data.currency}
            colorIndex={0}
            points={seriesOf(eth.data, 'marketCap')}
          />
        ) : null}

        {btc.ok ? (
          <GlobalChartCard
            title="Volume 24 h de Bitcoin"
            hint="Le volume échangé sur l’ensemble des places, tel que la source l’agrège."
            format="money"
            currency={btc.data.currency}
            colorIndex={4}
            points={seriesOf(btc.data, 'volume')}
          />
        ) : null}

        {sentiment.ok && sentiment.data.length > 1 ? (
          <GlobalChartCard
            title="Indice de sentiment"
            hint="0 = peur extrême, 100 = avidité extrême."
            format="plain"
            colorIndex={2}
            points={sentiment.data.map((point) => ({ t: point.timestamp, y: point.value }))}
            note={
              <>
                {weave(
                  t(
                    'L’indice et sa méthode sont détaillés sur la [page dédiée au sentiment](/sentiment).',
                  ),
                  (href, label, key) => (
                    <Link key={key} href={href} className="text-brand hover:underline">
                      {label}
                    </Link>
                  ),
                )}{' '}
                <SourceNote
                  label={sentiment.source.label}
                  href={sentiment.source.attributionUrl}
                  strings={{ source: t('Source :'), dated: t('données du {date}') }}
                />
              </>
            }
          />
        ) : null}
      </div>

      {!btc.ok && !eth.ok ? (
        <EmptyState
          title="Courbes longues indisponibles"
          description={btc.ok ? null : btc.reason}
          tone="warning"
        />
      ) : null}
    </div>
  )
}

/**
 * Une grandeur d'un historique, en points de courbe.
 *
 * Les points sans la grandeur demandée sont ÉCARTÉS et non ramenés à zéro : une
 * capitalisation absente n'est pas une capitalisation nulle, et le §5 interdit de les
 * confondre — une chute à zéro au milieu d'une courbe se lirait comme un effondrement.
 */
function seriesOf(
  history: PriceHistory,
  key: 'marketCap' | 'volume',
): { t: number; y: number }[] {
  const rows: { t: number; y: number }[] = []
  for (const point of history.points) {
    const value = point[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      rows.push({ t: point.timestamp, y: value })
    }
  }
  return rows
}

/**
 * LE GRAND CADRE — le panier, sa part de Bitcoin, et la ligne de totaux.
 *
 * Mis en flux pour la raison décrite plus haut. Il ne rend rien si le panier n'a pas
 * abouti : la phrase d'ouverture dit déjà l'état de la source, et un second encadré
 * d'échec n'apprendrait rien.
 */
async function BasketSection({ stats }: { stats: GlobalMarketStats | null }) {
  const t = await getPhrase()
  const basket = await getMarketCapBasket('eur', 365)
  if (!basket.ok) return null

  const points = basket.data.points.map((point) => ({ t: point.timestamp, y: point.total }))

  /* La part de Bitcoin DANS LE PANIER, et le mot compte : ce n'est pas la dominance,
     qui se rapporte au marché entier. Le titre du cadre le dit, sa phrase aussi. */
  const share = basket.data.points
    .map((point) => {
      const bitcoin = point.byId.bitcoin
      if (typeof bitcoin !== 'number' || point.total <= 0) return null
      return { t: point.timestamp, y: (bitcoin / point.total) * 100 }
    })
    .filter((point): point is { t: number; y: number } => point !== null)

  return (
    <div className="space-y-4">
      <GlobalChartCard
        large
        title="Capitalisation du panier suivi"
        hint="La somme de neuf grandes capitalisations, additionnées jour par jour — pas le marché entier."
        format="money"
        currency={basket.data.currency}
        colorIndex={5}
        points={points}
        footer={
          <>
            <span className="font-semibold text-ink">{basket.data.members.length}</span>{' '}
            {t('actifs dans le panier')}
            {stats ? (
              <>
                {' · '}
                <span className="font-semibold text-ink">
                  {formatCompact(stats.activeAssets)}
                </span>{' '}
                {t('cryptomonnaies suivies')}
                {' · '}
                <span className="font-semibold text-ink">
                  {(stats.dominance.btc ?? 0).toFixed(1)} %
                </span>{' '}
                {t('de dominance Bitcoin')}
              </>
            ) : null}
          </>
        }
        note={
          <>
            {t(
              'Le panier est figé : il ne suit pas les entrées et sorties du classement. Sa courbe décrit ces neuf actifs, et rien d’autre.',
            )}{' '}
            <SourceNote
              label={basket.source.label}
              href={basket.source.attributionUrl}
              strings={{ source: t('Source :'), dated: t('données du {date}') }}
            />
          </>
        }
      />

      {share.length > 1 ? (
        <GlobalChartCard
          title="Part de Bitcoin dans le panier"
          hint="À ne pas confondre avec la dominance, qui se rapporte au marché entier."
          format="percent"
          colorIndex={3}
          points={share}
        />
      ) : null}
    </div>
  )
}

/* ── DOMINANCE ──────────────────────────────────────────────────────────────── */

async function DominanceSection() {
  const t = await getPhrase()
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
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={globalStats.source.label}
            href={globalStats.source.attributionUrl}
            updatedAt={globalStats.data.lastUpdated}
          />
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="rounded-card border border-brand/25 bg-brand-soft/55 px-4 py-3">
          <h2 className="text-xs font-semibold text-ink">{t('Et sur un an ?')}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">{t('La dominance ci-dessus est la vraie : Bitcoin rapporté au marché entier, tel que la source le publie. Sa profondeur est celle de nos propres relevés, c’est-à-dire quelques heures. Pour voir la tendance sur douze mois, il faut accepter une mesure approchante — la part de Bitcoin dans un panier de neuf actifs, dont la composition est listée sous les courbes. Elle est tracée dans le cadre « Part de Bitcoin dans le panier », juste en dessous.')}</p>
        </div>

        <Suspense fallback={<LoadingNote label={t('Assemblage du panier de capitalisations…')} />}>
          <BasketSection stats={null} />
        </Suspense>
      </div>
    </div>
  )
}

/* ── SAISON DES ALTCOINS ────────────────────────────────────────────────────── */

/**
 * La carte compacte de la vue d'ensemble.
 *
 * Elle ne rend RIEN si l'indice n'est pas calculable, là où la vue complète affiche
 * un état vide expliqué. La différence est voulue : sur la vue dédiée, l'absence est
 * le sujet — on est venu pour cet indice — alors qu'ici c'est une carte parmi
 * d'autres, et un encadré d'échec dans une colonne d'indicateurs occupe la place
 * d'une information au lieu d'en apporter une.
 */
async function AltseasonCard() {
  const t = await getPhrase()
  const universe = await getMoversUniverse(100, 'eur')
  if (!universe.ok) return null

  const season = computeAltcoinSeason(universe.data)
  if (!season) return null

  return (
    <section className="rounded-card border border-border-subtle bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{t('Saison des altcoins')}</h2>

      <p className="tabular display-sm mt-3 leading-none text-ink">
        {Math.round(season.value)}
        <span className="text-base font-normal text-ink-muted"> /100</span>
      </p>

      <div className="mt-4 h-1.5 rounded-pill bg-gradient-to-r from-down via-ink-muted/40 to-brand">
        <div className="relative h-full">
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-canvas bg-ink"
            style={{ left: `${Math.min(100, Math.max(0, season.value))}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[0.6875rem] text-ink-muted">
        <span>{t('Saison de Bitcoin')}</span>
        <span>{t('Saison des altcoins')}</span>
      </div>

      <p className="mt-4 border-t border-border-subtle pt-3 text-xs leading-relaxed text-ink-muted">
        {t('Part des cent premières capitalisations qui font mieux que Bitcoin sur trente jours.')}{' '}
        <Link
          href="/graphiques?vue=altseason"
          className="underline underline-offset-2 hover:text-ink"
        >
          {t('Voir le détail')}
        </Link>
      </p>
    </section>
  )
}

async function AltseasonSection() {
  const t = await getPhrase()
  /* AUCUN APPEL SUPPLÉMENTAIRE : `getMoversUniverse(100)` alimente déjà la carte
     thermique d'à côté et la page `/mouvements`, et sa clé de cache ne dépend
     d'aucun actif. La « saison des altcoins » est un comptage sur une donnée que le
     site a déjà — c'est précisément ce qui la rend calculable ici. */
  const universe = await getMoversUniverse(100, 'eur')

  if (!universe.ok || universe.data.length === 0) {
    return (
      <EmptyState
        title={t('Classement indisponible')}
        description={universe.ok ? null : universe.reason}
        source={universe.source?.label ?? null}
        tone={universe.ok ? 'neutral' : 'warning'}
      />
    )
  }

  const season = computeAltcoinSeason(universe.data)

  if (!season) {
    return (
      <EmptyState
        title={t('Indice incalculable')}
        description={t(
          'La source ne publie pas la variation de Bitcoin sur trente jours pour le moment. L’indice compte les actifs qui font mieux que lui : sans cette valeur, il n’a pas de point de comparaison.',
        )}
        tone="warning"
      />
    )
  }

  const { value, ahead, contenders, reference } = season

  /* Les dix plus gros écarts À BITCOIN, et non les dix plus fortes hausses : c'est
     l'écart qui fait l'indice, et un actif en baisse de 2 % pendant que Bitcoin perd
     20 % est en tête du comptage sans figurer nulle part dans un classement de
     hausses. */
  const ranked = [...contenders].sort(
    (left, right) => (right.change30d as number) - (left.change30d as number),
  )

  return (
    <div className="space-y-6">
      <AltcoinSeasonGauge
        value={value}
        outperformers={ahead.length}
        universe={contenders.length}
        windowDays={30}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpreadList
          title={t('Les dix plus gros écarts en tête')}
          rows={ranked.slice(0, 10)}
          reference={reference}
        />
        <SpreadList
          title={t('Les dix plus gros écarts en queue')}
          rows={ranked.slice(-10).reverse()}
          reference={reference}
        />
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        {t('Variation de Bitcoin sur la même fenêtre :')}{' '}
        <span className={reference >= 0 ? 'text-up' : 'text-down'}>
          {formatPercent(reference) ?? '—'}
        </span>
        {'. '}
        <SourceNote
          label={universe.source.label}
          href={universe.source.attributionUrl}
          strings={{ source: t('Source :'), dated: t('données du {date}') }}
        />
      </p>
    </div>
  )
}

/**
 * Une colonne d'actifs et leur écart à Bitcoin.
 *
 * L'ÉCART est la colonne principale, la variation brute la seconde : c'est l'écart
 * qui décide de l'indice, et le lire à côté de la variation évite d'avoir à faire la
 * soustraction de tête pour comprendre pourquoi une ligne est là.
 */
function SpreadList({
  title,
  rows,
  reference,
}: {
  title: string
  rows: { id: string; name: string; symbol: string; change30d?: number }[]
  reference: number
}) {
  return (
    <section className="rounded-card border border-border-subtle bg-surface">
      <h2 className="border-b border-border-subtle px-4 py-2.5 text-xs font-semibold text-ink">
        {title}
      </h2>
      <ul>
        {rows.map((asset) => {
          const change = asset.change30d as number
          const spread = change - reference
          return (
            <li
              key={asset.id}
              className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2 last:border-b-0"
            >
              <Link
                href={`/crypto/${asset.id}`}
                className="min-w-0 flex-1 truncate text-sm text-ink hover:text-brand-strong"
              >
                {asset.name}{' '}
                <span className="text-xs uppercase text-ink-muted">{asset.symbol}</span>
              </Link>

              <span className={`tabular text-sm font-medium ${spread >= 0 ? 'text-up' : 'text-down'}`}>
                {spread >= 0 ? '+' : '−'}
                {Math.abs(spread).toFixed(1).replace('.', ',')} pts
              </span>
              <span className="tabular w-16 text-right text-xs text-ink-muted">
                {formatPercent(change) ?? '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ── SECTEURS ───────────────────────────────────────────────────────────────── */

async function HeatmapSection() {
  const t = await getPhrase()
  /*
   * Les deux découpages — par pièce et par secteur — sont servis ensemble, et ni l'un
   * ni l'autre ne coûte d'appel : `getCategories` alimente déjà `/categories` et la vue
   * « Catégories » d'à côté, `getMoversUniverse` alimente déjà `/mouvements`.
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
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
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
  const t = await getPhrase()
  /* La capitalisation mondiale n'est là que pour la colonne de dominance du tableau —
     voir `CategoryExplorer`. En DOLLARS, comme les agrégats sectoriels de la source :
     un rapport entre deux devises ne voudrait rien dire. */
  const [categories, globalStats] = await Promise.all([
    getCategories(),
    getCryptoGlobalStats('usd'),
  ])

  if (!categories.ok || categories.data.length === 0) {
    return (
      <EmptyState
        title={t('Catégories indisponibles')}
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
        <CategoryExplorer
          categories={categories.data}
          totalMarketCap={globalStats.ok ? globalStats.data.totalMarketCap : null}
        />
        <SourceNote label={categories.source.label} href={categories.source.attributionUrl} strings={{ source: t('Source :'), dated: t('données du {date}') }} />
      </div>
    </div>
  )
}

/* ── TRÉSORERIES ────────────────────────────────────────────────────────────── */

async function TreasuriesSection() {
  const t = await getPhrase()
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
        title={t('Registres de trésorerie indisponibles')}
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
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={`${(bitcoin.ok ? bitcoin.source : ethereum.source)?.label ?? ''} · montants en USD`}
        href={(bitcoin.ok ? bitcoin.source : ethereum.source)?.attributionUrl ?? '#'}
      />
    </div>
  )
}

/* ── NFT ────────────────────────────────────────────────────────────────────── */

async function NftSection() {
  const t = await getPhrase()
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
        <strong className="text-ink">{t('Sélection, et non classement.')}</strong>{t('La source réserve son classement des collections à son offre payante ; seule la fiche d’une collection nommée est gratuite. Cette liste est donc arrêtée à la main sur des collections de référence, et l’ordre d’affichage n’est qu’un tri par capitalisation — d’autres collections plus grandes peuvent exister sans figurer ici.')}</p>

      <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={`${collections.source.label} · montants en USD`}
        href={collections.source.attributionUrl}
      />
    </div>
  )
}
