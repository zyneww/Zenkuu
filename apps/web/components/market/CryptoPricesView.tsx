import {
  getCryptoGlobalStats,
  getCryptoOverview,
  getRanking,
  getSentiment,
  getTrendingCrypto,
  getTrendingCryptoAssets,
  type DataResult,
  type MarketAsset,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { GlobalStatsBar } from '@/components/home/GlobalStatsBar'
import { Money } from '@/components/locale/Money'
import { CryptoSummaryCards } from '@/components/market/CryptoSummaryCards'
import { CryptoViewControls } from '@/components/market/CryptoViewControls'
import {
  periodMeta,
  readPeriod,
  readView,
  type CryptoView,
} from '@/components/market/crypto-views'
import { MarketBrowser } from '@/components/market/MarketBrowser'
import { getContent } from '@/lib/content'
import { getWatchlistIds } from '@/lib/watchlist-actions'
import { getPhrase } from '@/lib/content'

const PER_PAGE = 50
const MAX_PAGE = 100
const BASE_PATH = '/crypto'

/**
 * Page de cotation crypto.
 *
 * Elle NE PASSE PLUS par `MarketPageView`, le corps commun aux six classes d'actifs,
 * et c'est délibéré : tout ce qui fait cette page — capitalisation mondiale,
 * sentiment, tendances, plus fortes hausses — repose sur des requêtes qui n'existent
 * que pour la crypto. Les glisser dans le corps commun aurait imposé cinq gardes
 * conditionnelles à des pages qui n'en ont que faire. Les cinq autres classes
 * continuent d'utiliser `MarketPageView` inchangé.
 *
 * Les onglets de classes d'actifs disparaissent également ici : la page ne parle que
 * de crypto, comme sa référence. Le passage vers les autres classes reste assuré par
 * le menu de l'en-tête.
 */
export async function CryptoPricesView({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const t = await getPhrase()
  const fr = await getContent()
  const view = readView(searchParams['vue'])
  const period = readPeriod(searchParams['periode'])
  const page = readPage(searchParams['page'])

  // Les quatre requêtes du bandeau sont lancées EN PARALLÈLE avec le classement :
  // séquentielles, leurs latences s'additionneraient sur le rendu de la page.
  // Chacune peut échouer seule — sa carte disparaît alors sans emporter le reste.
  const [stats, sentiment, trending, listing, watchlist] = await Promise.all([
    getCryptoGlobalStats('eur'),
    getSentiment(),
    getTrendingCrypto('eur'),
    loadListing(view, page),
    getWatchlistIds('crypto'),
  ])

  return (
    <div className="space-y-8">
      <CryptoHeader stats={stats} />

      {/* Barre de repères partagée avec l'accueil : capitalisation, volume,
          dominances et sentiment sur une ligne. Le même composant aux deux endroits
          garantit que les deux pages annoncent les mêmes chiffres — deux
          implémentations auraient divergé au premier ajustement. */}
      <GlobalStatsBar
        stats={stats.ok ? stats.data : null}
        sentiment={sentiment.ok ? sentiment.data : null}
      />

      <CryptoSummaryCards
        stats={stats}
        sentiment={sentiment}
        trending={trending}
        gainers={listing.gainers}
      />

      <div className="space-y-4">
        <CryptoViewControls basePath={BASE_PATH} view={view} period={period} />

        {listing.result.ok && listing.result.data.length > 0 ? (
          <>
            <MarketBrowser
              assets={listing.result.data}
              assetClass="crypto"
              page={page}
              perPage={PER_PAGE}
              sortBy="marketCap"
              direction="desc"
              // Le tri par en-tête n'a de sens que sur la vue paginée : les trois
              // autres sont des CLASSEMENTS, dont l'ordre est le propos. Trier
              // « Gagnants » par capitalisation en effacerait la raison d'être.
              sortable={false}
              paginated={listing.paginated}
              basePath={BASE_PATH}
              period={period}
              watchlist={watchlist}
              chartPosition="inline"
              quickViews={false}
            />

            <p className="text-xs text-ink-muted">{listing.scopeNote}</p>
          </>
        ) : (
          <EmptyState
            title={fr.states.unavailableTitle}
            description={listing.result.ok ? fr.market.emptyPage : listing.result.reason}
            source={listing.result.source?.label ?? null}
            tone={listing.result.ok ? 'neutral' : 'warning'}
          />
        )}
      </div>

      {listing.result.ok && listing.result.data.length > 0 ? (
        <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
          label={listing.result.source.label}
          href={listing.result.source.attributionUrl}
          updatedAt={listing.result.data[0]?.lastUpdated}
        />
      ) : null}

      <PeriodFootnote period={period} assets={listing.result.ok ? listing.result.data : []} />
    </div>
  )
}

/** Lecture défensive du numéro de page : il est saisissable à la main dans l'URL. */
function readPage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isInteger(value) || value < 1) return 1
  return Math.min(value, MAX_PAGE)
}

interface Listing {
  result: DataResult<MarketAsset[]>
  paginated: boolean
  scopeNote: string
  /** Alimente la carte « meilleures performances », qui doit exister sur toutes les vues. */
  gainers: MarketAsset[]
}

/**
 * Charge la liste correspondant à la vue demandée.
 *
 * Les trois vues classées partagent UN SEUL appel — `getCryptoOverview` trie côté
 * ZENKUU les 250 premières capitalisations, faute pour CoinGecko de savoir trier par
 * variation. La portée réelle de ce classement est donc écrite sous le tableau :
 * « parmi les N plus grandes capitalisations », et non « du marché ». Une hausse de
 * +900 % sur un jeton illiquide n'a pas le même sens qu'un classement filtré, et
 * taire ce filtre reviendrait à le laisser croire (§5).
 */
async function loadListing(view: CryptoView, page: number): Promise<Listing> {
  if (view === 'tendance') {
    // Deux appels indépendants : le classement de tendance n'a pas de lien avec les
    // plus fortes hausses, mais la carte « meilleures performances » doit exister sur
    // TOUTES les vues (cf. l'interface `Listing` ci-dessus) — d'où ce second appel,
    // identique à celui de la vue par défaut plus bas.
    const [result, overview] = await Promise.all([
      getTrendingCryptoAssets('eur'),
      getCryptoOverview('eur', 3),
    ])
    return {
      result,
      paginated: false,
      scopeNote:
        'Actifs les plus consultés sur la source ces dernières 24 heures, dans son ordre de popularité.',
      gainers: overview.ok ? overview.data.gainers : [],
    }
  }

  if (view === 'gagnants' || view === 'perdants') {
    const overview = await getCryptoOverview('eur', PER_PAGE)

    /*
     * Le filtrage par signe a été REMONTÉ dans `getCryptoOverview` : il y profite à
     * tous les appelants, l'accueil comme cette page, au lieu d'être refait — ou
     * oublié — à chaque point d'affichage. Les listes reçues ici ne contiennent donc
     * déjà que des variations du bon signe.
     */
    const scope = overview.ok
      ? `Classement établi parmi les ${overview.data.universeSize} plus grandes capitalisations, et non sur l’ensemble du marché. Seuls les actifs réellement ${view === 'gagnants' ? 'en hausse' : 'en baisse'} sur 24 h y figurent.`
      : ''

    return {
      result: overview.ok
        ? {
            ...overview,
            data: view === 'gagnants' ? overview.data.gainers : overview.data.losers,
          }
        : overview,
      paginated: false,
      scopeNote: scope,
      gainers: overview.ok ? overview.data.gainers : [],
    }
  }

  // Vue par défaut : le classement par capitalisation, paginé côté source.
  const [result, overview] = await Promise.all([
    getRanking({ assetClass: 'crypto', page, perPage: PER_PAGE, currency: 'eur' }),
    getCryptoOverview('eur', 3),
  ])

  return {
    result,
    paginated: true,
    scopeNote: `Classement par capitalisation, ${PER_PAGE} actifs par page.`,
    gainers: overview.ok ? overview.data.gainers : [],
  }
}

/**
 * Bandeau de tête, centré comme sa référence.
 *
 * La phrase d'accroche porte le chiffre plutôt qu'un slogan : le lecteur qui arrive
 * ici veut savoir où en est le marché, et l'apprend en une phrase avant tout tableau.
 * Sans statistiques globales, la phrase disparaît — elle n'est pas remplacée par une
 * formule vague, qui occuperait la place sans rien dire.
 */
async function CryptoHeader({
  stats,
}: {
  stats: Awaited<ReturnType<typeof getCryptoGlobalStats>>
}) {
  const fr = await getContent()
  return (
    <header className="mx-auto max-w-3xl space-y-4 text-center">
      <h1 className="display-mega text-ink">{fr.crypto.title}</h1>

      {stats.ok ? (
        <p className="text-base leading-relaxed text-ink-muted">
          La capitalisation boursière mondiale des cryptomonnaies s’élève à{' '}
          <strong className="tabular font-semibold text-ink">
            <Money value={stats.data.totalMarketCap} from={stats.data.currency} compact />
          </strong>
          , soit une variation de{' '}
          <strong
            className={`tabular font-semibold ${
              stats.data.marketCapChange24h >= 0 ? 'text-up' : 'text-down'
            }`}
          >
            {stats.data.marketCapChange24h >= 0 ? '+' : ''}
            {stats.data.marketCapChange24h.toFixed(2).replace('.', ',')} %
          </strong>{' '}
          sur les dernières 24 heures.
        </p>
      ) : (
        <p className="text-base leading-relaxed text-ink-muted">{fr.crypto.subtitle}</p>
      )}
    </header>
  )
}

/**
 * Note de bas de tableau sur la période choisie.
 *
 * Toutes les fenêtres ne sont pas renseignées pour tous les actifs — un jeton récent
 * n'a pas d'antériorité d'un an. Plutôt que d'aligner des tirets sans explication, on
 * compte les valeurs manquantes et on le dit. La note disparaît quand tout est
 * renseigné, pour ne pas devenir un bruit permanent.
 */
function PeriodFootnote({
  period,
  assets,
}: {
  period: ReturnType<typeof readPeriod>
  assets: MarketAsset[]
}) {
  if (assets.length === 0) return null

  const meta = periodMeta(period)
  const missing = assets.filter((asset) => asset[meta.field] === undefined).length
  if (missing === 0) return null

  return (
    <p className="text-xs text-ink-muted">
      {missing} actif{missing > 1 ? 's' : ''} sur {assets.length} n’
      {missing > 1 ? 'ont' : 'a'} pas de variation {meta.longLabel} publiée par la source —
      leur cellule reste vide plutôt que d’afficher zéro.
    </p>
  )
}
