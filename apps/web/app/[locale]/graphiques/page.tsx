import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'

import {
  CACHE_TTL_SECONDS,
  getAssetHistory,
  getCategories,
  getCryptoGlobalStats,
  getCryptoOverview,
  getNews,
  getSentiment,
  getSentimentHistory,
  getSpotExchanges,
  getStablecoinHistory,
  type PriceHistory,
} from '@zenkuu/data'
import { EmptyState, SourceNote, formatCompact, formatCurrency, formatPercent } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { fill, weave } from '@/components/locale/emphasise'
import { FearGreedDial } from '@/components/market/FearGreedDial'
import { MarketPulseCards } from '@/components/market/MarketPulseCards'
import { ChartsShell, LoadingNote } from '@/components/market/ChartsShell'
import { GlobalChartCard } from '@/components/market/GlobalChartCard'
import { AltseasonCard } from '@/components/market/views/AltseasonSection'
import { BasketSection } from '@/components/market/views/BasketSection'
import { ARTICLES, formatArticleDate, sortedArticles } from '@/content/blog'
import { getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

const TITLE = 'Vue d’ensemble du marché'
const LEAD =
  'L’état du marché dans la durée : agrégats mondiaux, capitalisation et volumes des deux plus grandes cryptomonnaies, puis l’indice de sentiment sur un an.'

/**
 * Anciennes adresses `?vue=` → nouvelles routes.
 *
 * Ces vues ont vécu un temps sur cette seule route (voir `charts-nav`). Les liens
 * partagés, les signets et l'index des moteurs de recherche pointent encore dessus :
 * les laisser retomber silencieusement sur la vue générale ferait arriver sur une
 * page qui n'est pas celle demandée, sans le dire. Une redirection PERMANENTE
 * transmet en plus au moteur que l'adresse a changé pour de bon.
 */
const LEGACY_VIEWS: Record<string, string> = {
  dominance: '/graphiques/dominance',
  altseason: '/graphiques/saison-altcoins',
  tresoreries: '/graphiques/tresoreries',
  nft: '/graphiques/nft',
  secteurs: '/heatmap',
  categories: '/categories',
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: { canonical: '/graphiques' },
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * VUE D'ENSEMBLE DU MARCHÉ — LA DISPOSITION DE `coingecko.com/en/charts`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 *   1. un TITRE suivi d'une phrase qui chiffre l'état du marché ;
 *   2. un GRAND CADRE avec ses paliers de période et sa ligne de totaux ;
 *   3. une GRILLE de cadres identiques, un par série ;
 *   4. les derniers articles.
 *
 * ── CE QUE CETTE PAGE NE PEUT PAS MONTRER, ET POURQUOI ─────────────────────
 *
 * La référence ouvre sur une courbe de la capitalisation MONDIALE sur plusieurs
 * années. Aucune source gratuite ne la publie : l'endpoint correspondant de CoinGecko
 * répond 401 hors abonnement, et la reconstituer depuis la capitalisation de Bitcoin
 * divisée par sa dominance actuelle serait une estimation présentée comme une mesure
 * (§5), d'autant que la dominance a bougé sur toute période un peu longue.
 *
 * Le grand cadre trace donc le PANIER SUIVI — neuf actifs additionnés — et il le dit,
 * dans son titre comme dans sa note. L'appeler « capitalisation totale » ferait passer
 * neuf actifs pour dix-huit mille.
 *
 * Même raison pour les cadres « DeFi », « Stablecoins » et « Altcoins » de la
 * référence : la source publie leur capitalisation COURANTE par catégorie, jamais leur
 * série. Ils sont donc absents plutôt que tracés depuis un seul point.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = (await searchParams)['vue']
  const legacy = Array.isArray(raw) ? raw[0] : raw
  if (legacy && LEGACY_VIEWS[legacy]) permanentRedirect(LEGACY_VIEWS[legacy] as string)

  return (
    <ChartsShell current="/graphiques" title={TITLE} lead={LEAD}>
      <GlobalView />
    </ChartsShell>
  )
}

async function GlobalView() {
  const t = await getPhrase()
  /*
   * ── LES APPELS SONT TOUS DÉJÀ PAYÉS AILLEURS ──────────────────────────────
   *
   * `getCryptoOverview` alimente le tableau de l'accueil, `getSentiment` la page
   * dédiée et le rail, `getCategories` la page des catégories, `getSpotExchanges` la
   * page des places. Leurs clés de cache ne dépendent d'aucun actif : la rangée de
   * tête, la phrase et la ligne de totaux sont composées à partir de réponses que le
   * site a déjà.
   */
  const [globalStats, btc, eth, sentiment, pulse, mood, categories, exchanges, stablecoins] =
    await Promise.all([
      getCryptoGlobalStats('eur'),
      getAssetHistory('bitcoin', 'crypto', 365, 'eur'),
      getAssetHistory('ethereum', 'crypto', 365, 'eur'),
      getSentimentHistory(365),
      getCryptoOverview('eur', 5),
      getSentiment(),
      getCategories(),
      getSpotExchanges(250),
      getStablecoinHistory(),
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
        il sert de résumé aux moteurs de recherche.
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
        ── LE GRAPHIQUE OCCUPE TOUTE LA LARGEUR ──────────────────────────────

        ⚠️ CORRECTION DE DISPOSITION. Une colonne étroite d'indicateurs — sentiment,
        saison des altcoins — était collée à sa gauche, héritée de la version
        précédente de la page. La référence n'en a pas : sa courbe de capitalisation
        prend la largeur entière, et c'est ce qui lui donne sa lisibilité, une année de
        relevés quotidiens ne tenant pas dans huit cents pixels.

        Les deux indicateurs n'ont pas disparu : ils sont passés dans la GRILLE plus
        bas, avec les autres cadres. Ils y répondent à la même question qu'avant — dans
        quel état d'esprit est le marché — sans occuper la place de la figure
        principale.

        La ligne de totaux est passée DANS la carte, comme sur la référence. Elle
        était en double : la carte en portait déjà une, et la page en posait une
        seconde trois lignes plus bas.

        ⚠️ « Places de cotation » dit SUIVIES et non « au total ». La source ne publie
        pas de décompte global : elle rend une page de résultats, ici plafonnée à deux
        cent cinquante. Écrire « total » ferait passer notre plafond pour son
        inventaire (§5). Les deux autres chiffres, eux, sont bien des totaux publiés.
      */}
      <Suspense fallback={<LoadingNote label={t('Assemblage du panier de capitalisations…')} />}>
        <BasketSection
          stats={stats}
          footer={
            <span className="inline-flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
              {stats ? (
                <Total
                  value={formatCompact(stats.activeAssets) ?? '—'}
                  label={t('cryptomonnaies')}
                />
              ) : null}
              {exchanges.ok ? (
                <>
                  <Separator />
                  <Total
                    value={String(exchanges.data.length)}
                    label={t('places de cotation suivies')}
                  />
                </>
              ) : null}
              {categories.ok ? (
                <>
                  <Separator />
                  <Total value={String(categories.data.length)} label={t('catégories')} />
                </>
              ) : null}
            </span>
          }
        />
      </Suspense>

      {/*
        ── LA GRILLE À DEUX COLONNES ─────────────────────────────────────────

        Quatre cadres de même gabarit. Ce sont les séries que nos sources publient
        RÉELLEMENT sur un an — la référence y met les siennes (DeFi, stablecoins),
        que nous n'avons qu'en valeur courante, jamais en série.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* La DOMINANCE ouvre la grille, comme sur la référence — c'est la première
            question qu'on se pose après avoir vu la capitalisation. */}
        <div className="lg:col-span-1">
          {mood.ok ? <FearGreedDial index={mood.data} label={t(mood.data.classification)} /> : null}
        </div>

        <Suspense fallback={null}>
          <AltseasonCard />
        </Suspense>

        {/* ── LA SEULE COURBE LONGUE DE LA RÉFÉRENCE QUE NOS SOURCES PUBLIENT ──
            DefiLlama diffuse librement l'historique agrégé des stablecoins depuis
            2017. Ses deux voisines chez la référence — DeFi et altcoins — n'existent
            qu'en valeur courante chez nous, et ne sont donc pas tracées (§5).

            ⚠️ VÉRIFIÉ LE 2026-08-31, ET LA RÉSERVE TIENT. Leur page « charts » porte
            cinq sections : Total Crypto Market Cap, Bitcoin Dominance, DeFi Market
            Cap, Stablecoin Market Cap, Altcoin Market Cap. Les cinq sont des COURBES,
            pas des valeurs — leur section DeFi annonce « the market cap and volume of
            all DeFi coins » sur la durée.

            La capitalisation DeFi du jour est calculable : c'est une catégorie, et
            `getCategories` est déjà en cache. Son HISTORIQUE ne l'est pas. Tracer une
            courbe depuis le jour où ZENKUU commence à relever donnerait un graphique
            qui démarre aujourd'hui à côté de quatre autres qui remontent à 2017 — ce
            que fait déjà la série de capitalisation globale, avec sa mention. */}
        {stablecoins.ok && stablecoins.data.length > 1 ? (
          <GlobalChartCard
            title={t('Capitalisation des stablecoins')}
            hint="La somme des stablecoins en circulation, toutes chaînes confondues."
            info="Somme des jetons indexés en circulation, relevée chaque jour depuis 2017. Elle mesure l’argent stationné dans la crypto plutôt que le prix des actifs."
            embedId="stablecoins"
            format="money"
            currency="USD"
            colorIndex={3}
            points={stablecoins.data.map((point) => ({ t: point.timestamp, y: point.value }))}
            note={
              <SourceNote
                label={stablecoins.source.label}
                href={stablecoins.source.attributionUrl}
                strings={{ source: t('Source :'), dated: t('données du {date}') }}
              />
            }
          />
        ) : null}

        {btc.ok ? (
          <GlobalChartCard
            title={t('Capitalisation de Bitcoin')}
            hint="Publiée par la source, jour par jour."
            format="money"
            currency={btc.data.currency}
            colorIndex={1}
            points={seriesOf(btc.data, 'marketCap')}
          />
        ) : null}

        {eth.ok ? (
          <GlobalChartCard
            title={t('Capitalisation d’Ethereum')}
            hint="Même relevé, même profondeur."
            format="money"
            currency={eth.data.currency}
            colorIndex={0}
            points={seriesOf(eth.data, 'marketCap')}
          />
        ) : null}

        {btc.ok ? (
          <GlobalChartCard
            title={t('Volume 24 h de Bitcoin')}
            hint="Le volume échangé sur l’ensemble des places, tel que la source l’agrège."
            format="money"
            currency={btc.data.currency}
            colorIndex={4}
            points={seriesOf(btc.data, 'volume')}
          />
        ) : null}

        {sentiment.ok && sentiment.data.length > 1 ? (
          <GlobalChartCard
            title={t('Indice de sentiment')}
            hint="0 = peur extrême, 100 = avidité extrême."
            embedId="sentiment"
            format="plain"
            colorIndex={2}
            points={sentiment.data.map((point) => ({ t: point.timestamp, y: point.value }))}
            note={
              <>
                {weave(
                  t(
                    'L’indice et sa méthode sont détaillés sur la [page dédiée au sentiment](/sentiment).',
                  ),
                  /* `inline-flex` : le plancher tactile repose sur `min-height`, sans
                     effet sur une boîte en ligne — même remède que `SourceNote`. */
                  (href, label, key) => (
                    <Link
                      key={key}
                      href={href}
                      className="inline-flex min-h-8 items-center text-ink hover:underline"
                    >
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
          title={t('Courbes longues indisponibles')}
          description={btc.ok ? null : btc.reason}
          tone="warning"
        />
      ) : null}

      <LatestReading />
    </div>
  )
}

/* Un total et son libellé. En `span` et non en `div` : cette ligne vit à l'intérieur
   du pied de carte, qui est lui-même en ligne. */
function Total({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="tabular font-semibold text-ink">{value}</span>
      <span>{label}</span>
    </span>
  )
}

/** La barre verticale qui sépare les totaux chez la référence. */
function Separator() {
  return (
    <span aria-hidden="true" className="text-border-subtle">
      |
    </span>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DERNIÈRES LECTURES — ARTICLES SI NOUS EN AVONS, ACTUALITÉS SINON
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La référence ferme sa page sur « Latest research articles ». Nous avons la place
 * prévue pour les nôtres — `content/blog.ts` — mais elle est VIDE à ce jour.
 *
 * Deux mauvaises réponses, et une bonne. Publier des titres fictifs est exclu (§5).
 * Ne rien afficher ferait un trou là où la référence informe. Le bloc bascule donc :
 * dès qu'un article existe, il montre les articles sous le titre attendu ; tant qu'il
 * n'y en a pas, il montre les dernières actualités du marché — de la vraie donnée,
 * sous un titre qui dit ce qu'elle est, et non « recherche ».
 *
 * Le jour où le blog se remplit, ce bloc change de contenu sans qu'on y touche.
 */
async function LatestReading() {
  const t = await getPhrase()

  if (ARTICLES.length > 0) {
    const articles = sortedArticles().slice(0, 4)
    return (
      <section className="space-y-4" aria-labelledby="lectures-titre">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="lectures-titre" className="display-sm text-ink">
            {t('Derniers articles de recherche')}
          </h2>
          <Link href="/blog" className="text-sm text-ink hover:underline">
            {t('Tous les articles')}
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/blog/${article.slug}`}
                className="block rounded-card border border-border-subtle bg-surface px-4 py-3 transition-colors hover:border-brand/40 hover:bg-surface-muted"
              >
                <p className="text-sm font-semibold text-ink">{article.title}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatArticleDate(article.publishedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const news = await getNews(4)
  if (!news.ok || news.data.length === 0) return null

  return (
    <section className="space-y-4" aria-labelledby="lectures-titre">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="lectures-titre" className="display-sm text-ink">
          {t('Dernières actualités du marché')}
        </h2>
        <Link href="/actualites" className="text-sm text-ink hover:underline">
          {t('Toutes les actualités')}
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {news.data.map((item) => (
          <li key={item.url}>
            {/* Lien EXTERNE : ZENKUU republie des titres et renvoie vers l'éditeur,
                jamais le texte intégral. `rel` obligatoire sur une cible `_blank`. */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-card border border-border-subtle bg-surface px-4 py-3 transition-colors hover:border-brand/40 hover:bg-surface-muted"
            >
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-xs text-ink-muted">{item.source}</p>
            </a>
          </li>
        ))}
      </ul>

      <SourceNote
        strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={news.source.label}
        href={news.source.attributionUrl}
      />
    </section>
  )
}

/**
 * Une grandeur d'un historique, en points de courbe.
 *
 * Les points sans la grandeur demandée sont ÉCARTÉS et non ramenés à zéro : une
 * capitalisation absente n'est pas une capitalisation nulle, et le §5 interdit de les
 * confondre — une chute à zéro au milieu d'une courbe se lirait comme un effondrement.
 */
function seriesOf(history: PriceHistory, key: 'marketCap' | 'volume'): { t: number; y: number }[] {
  const rows: { t: number; y: number }[] = []
  for (const point of history.points) {
    const value = point[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      rows.push({ t: point.timestamp, y: value })
    }
  }
  return rows
}
