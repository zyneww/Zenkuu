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
  const [globalStats, btc, eth, sentiment, pulse, mood, categories, exchanges] =
    await Promise.all([
      getCryptoGlobalStats('eur'),
      getAssetHistory('bitcoin', 'crypto', 365, 'eur'),
      getAssetHistory('ethereum', 'crypto', 365, 'eur'),
      getSentimentHistory(365),
      getCryptoOverview('eur', 5),
      getSentiment(),
      getCategories(),
      getSpotExchanges(250),
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
        ── LA COLONNE ÉTROITE ET LE GRAND CADRE, CÔTE À CÔTE ─────────────────

        Les indicateurs d'ambiance — sentiment, saison des altcoins — se lisent EN
        MÊME TEMPS que la courbe de capitalisation. C'est précisément leur usage : ils
        qualifient ce que la courbe montre.

        Sous `xl`, la colonne repasse au-dessus du cadre : à moins de mille pixels,
        une colonne de 280 px laisse au graphique une largeur où une année de relevés
        quotidiens n'est plus lisible.
      */}
      <div className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="space-y-4">
          {mood.ok ? <FearGreedDial index={mood.data} label={t(mood.data.classification)} /> : null}

          <Suspense fallback={null}>
            <AltseasonCard />
          </Suspense>
        </div>

        <Suspense fallback={<LoadingNote label={t('Assemblage du panier de capitalisations…')} />}>
          <BasketSection stats={stats} />
        </Suspense>
      </div>

      {/*
        ── LA LIGNE DE TOTAUX ────────────────────────────────────────────────

        C'est la bande que la référence pose sous son grand graphique.

        ⚠️ « Places de cotation » dit SUIVIES et non « au total ». La source ne publie
        pas de décompte global : elle rend une page de résultats, ici plafonnée à deux
        cent cinquante. Écrire « total » ferait passer notre plafond pour son
        inventaire (§5). Les deux autres chiffres, eux, sont bien des totaux publiés.
      */}
      <dl className="flex flex-wrap items-baseline justify-center gap-x-8 gap-y-2 rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted">
        {stats ? (
          <Total value={formatCompact(stats.activeAssets) ?? '—'} label={t('cryptomonnaies')} />
        ) : null}
        {exchanges.ok ? (
          <Total
            value={String(exchanges.data.length)}
            label={t('places de cotation suivies')}
          />
        ) : null}
        {categories.ok ? (
          <Total value={String(categories.data.length)} label={t('catégories')} />
        ) : null}
      </dl>

      {/*
        ── LA GRILLE À DEUX COLONNES ─────────────────────────────────────────

        Quatre cadres de même gabarit. Ce sont les séries que nos sources publient
        RÉELLEMENT sur un an — la référence y met les siennes (DeFi, stablecoins),
        que nous n'avons qu'en valeur courante, jamais en série.
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
                  /* `inline-flex` : le plancher tactile repose sur `min-height`, sans
                     effet sur une boîte en ligne — même remède que `SourceNote`. */
                  (href, label, key) => (
                    <Link
                      key={key}
                      href={href}
                      className="inline-flex min-h-8 items-center text-brand hover:underline"
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
          title="Courbes longues indisponibles"
          description={btc.ok ? null : btc.reason}
          tone="warning"
        />
      ) : null}

      <LatestReading />
    </div>
  )
}

function Total({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="tabular font-semibold text-ink">{value}</dd>
      <span>{label}</span>
    </div>
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
          <Link href="/blog" className="text-sm text-brand hover:underline">
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
        <Link href="/actualites" className="text-sm text-brand hover:underline">
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
