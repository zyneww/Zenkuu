import {
  getCategories,
  getCryptoOverview,
  getDerivativeExchanges,
  getNewListings,
  getNews,
  getPoolUniverse,
  getSpotExchanges,
  getTrendingCryptoAssets,
  type DexPool,
  type MarketAsset,
  type NewsItem,
} from '@zenkuu/data'
import { ChangeBadge, EmptyState, formatCompact, formatNumber } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { BarFigure } from '@/components/charts/BarFigure'
import { dataColor } from '@/components/charts/chart-theme'
import { AnalysisCard, RankTable, ShareBar } from '@/components/home/AnalysisCard'
import { AssetRow } from '@/components/home/AssetRow'
import { RelativeTime } from '@/components/home/RelativeTime'
import { ROWS } from '@/components/home/overview-rows'
import { Money } from '@/components/locale/Money'
import { MarketHeatmap } from '@/components/tools/MarketHeatmap'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE BAS DE L'ACCUEIL — LES BLOCS DE LA RÉFÉRENCE, LES SOURCES DE ZENKUU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE FICHIER REMPLACE ──────────────────────────────────────────────
 *
 * `MarketPanorama` (quatre cartes de cotations multi-actifs) ET la section
 * « Analyses » qui portait `GlobalAnalyses` (cinq cartes). Les deux disparaissent de
 * l'accueil : la référence pose au même endroit une suite de blocs plus resserrés,
 * chacun répondant à une question unique, et c'est ce que la demande reprend.
 *
 * ── L'ORDRE EST CELUI DE CRYPTORANK, BLOC POUR BLOC ────────────────────────
 *
 *     RÉFÉRENCE                          ICI
 *     Trending / Recently Listed         rail à onglets, mêmes deux entrées
 *     Recent Funding Rounds          →   nouvelles cotations
 *     Crypto Fundraising Trend       →   capitalisation par secteur
 *     Upcoming IDO/ICO               →   pools d'échange les plus actifs
 *     IDO/IEO/ICO Monthly Raise      →   volume échangé par réseau
 *     Latest Insights and Reports        actualités — même bloc, vraie source
 *     Top Gainers / Top Losers           hausses et baisses — vraie source
 *     Top Launchpads ROI             →   places de cotation par volume
 *     Heatmaps                           carte thermique — vraie source
 *     New ATH / New ATL                  plus hauts et plus bas — vraie source
 *     24h BTC Futures / Open Interest    places de dérivés — vraie source
 *
 * Les cinq flèches marquent les blocs dont la donnée est PROPRE à la référence — tours
 * de table, calendriers de vente de jetons, classement de rampes de lancement. Aucune
 * de nos sources ne les publie, et les fabriquer serait de la donnée inventée (§5) ;
 * chacun porte donc l'équivalent le plus proche que nous documentons réellement, et
 * son titre dit ce qu'il montre, jamais ce qu'il remplace.
 *
 * ── HUIT LECTURES, DONT DEUX GRATUITES ─────────────────────────────────────
 *
 * `getCryptoOverview` partage sa clé avec le tableau du dessus ET avec la rangée de
 * repères : hausses, baisses, extrêmes et carte thermique en sortent sans un appel de
 * plus. `getNews` est celle de la colonne latérale. Restent six lectures, contre les
 * neuf que faisaient à elles deux les sections remplacées.
 *
 * ── UN BLOC DONT LA SOURCE MANQUE DISPARAÎT ────────────────────────────────
 *
 * Six fournisseurs distincts alimentent cette page. Une panne de l'un ne doit pas
 * emporter les autres : chaque carte se rabat sur SON état vide, à l'intérieur de son
 * propre cadre.
 */
export async function MarketWidgets() {
  const fr = await getContent()
  const t = await getPhrase()

  const [overview, trending, listings, categories, pools, news, spot, derivatives] =
    await Promise.all([
      getCryptoOverview('eur', ROWS),
      getTrendingCryptoAssets('eur'),
      /* CENT, comme `/points-marquants` : la clé de cache contient la limite, et une
         valeur à nous ferait un second appel pour un sous-ensemble du même jeu. */
      getNewListings(100),
      getCategories(8),
      getPoolUniverse(),
      getNews(8),
      getSpotExchanges(5),
      getDerivativeExchanges(5),
    ])

  const universe = overview.ok ? overview.data.topByMarketCap : []
  const poolRows = pools.ok ? pools.data : []

  return (
    <div className="flex flex-col gap-8 border-t border-border-subtle pt-8">
      <DiscoveryRail
        trending={trending.ok ? trending.data.slice(0, 10) : []}
        listings={listings.ok ? listings.data.slice(0, 10) : []}
        trendingLabel={t('Tendances')}
        listingsLabel={t('Nouvelles cotations')}
        emptyTitle={fr.states.unavailableTitle}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        {/* ── À LA PLACE DES TOURS DE TABLE ────────────────────────────────
            La référence liste les levées de fonds de la semaine : qui a levé, combien,
            quand. Nos sources ne couvrent pas le capital-risque ; ce qu'elles couvrent,
            c'est l'ARRIVÉE d'un actif sur le marché — la même question de « qui est
            nouveau », posée au niveau de la cotation plutôt que du financement. */}
        <AnalysisCard
          title={t('Nouvelles cotations')}
          hint={t('Actifs référencés pour la première fois par la source, du plus récent au plus ancien')}
          href="/nouvelles-cotations"
          action={t('Voir')}
        >
          {listings.ok && listings.data.length > 0 ? (
            <RankTable
              columns={[t('Actif'), t('Cours'), t('24 h'), t('Référencé')]}
              rows={listings.data.slice(0, 6).map((listing) => ({
                key: listing.id,
                cells: [
                  <span key="name" className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{listing.name}</span>
                    <span className="shrink-0 uppercase text-ink-muted">{listing.symbol}</span>
                  </span>,
                  <Money key="price" value={listing.price} from={listing.currency} />,
                  <ChangeBadge key="change" value={listing.change24h} size="sm" />,
                  <RelativeTime key="at" iso={listing.firstDataAt} />,
                ],
              }))}
            />
          ) : (
            <EmptyState
              title={fr.states.unavailableTitle}
              description={listings.ok ? null : listings.reason}
              compact
            />
          )}
        </AnalysisCard>

        {/* ── À LA PLACE DE LA COURBE DE LEVÉES ────────────────────────────
            Même figure — des barres, une par catégorie — pour la même question de
            répartition : où va l'argent. La référence la pose sur les levées ; nous la
            posons sur ce que le marché pèse déjà, secteur par secteur. */}
        <AnalysisCard
          title={t('Capitalisation par secteur')}
          hint={t('Somme des capitalisations des actifs de chaque catégorie')}
          href="/categories"
          action={t('Voir')}
        >
          {categories.ok && categories.data.length > 0 ? (
            <BarFigure
              /* Le nom ENTIER part dans la donnée ; `tickMaxChars` ne raccourcit que
                 la graduation, jamais l'infobulle. */
              data={categories.data.map((category) => ({
                label: category.name,
                cap: category.marketCap,
              }))}
              tickMaxChars={11}
              series={[
                { key: 'cap', label: t('Capitalisation'), color: dataColor(0), format: 'compact' },
              ]}
              height={220}
              grow
              ariaLabel={t('Capitalisation par secteur')}
            />
          ) : (
            <EmptyState
              title={fr.states.unavailableTitle}
              description={categories.ok ? null : categories.reason}
              compact
            />
          )}
        </AnalysisCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* ── À LA PLACE DES VENTES DE JETONS À VENIR ──────────────────────
            La référence annonce ce qui va s'ouvrir ; les échanges décentralisés
            publient ce qui s'échange EN CE MOMENT, avec sa profondeur et son volume.
            C'est le même appétit de marché, mesuré au lieu d'être annoncé. */}
        <AnalysisCard
          title={t('Pools de liquidité les plus actifs')}
          hint={t('Volume échangé sur 24 heures, rapporté à la profondeur du pool')}
          href="/screener"
          action={t('Voir')}
        >
          {poolRows.length > 0 ? (
            <RankTable
              columns={[t('Paire'), t('Liquidité'), t('Volume 24 h'), t('Rotation')]}
              rows={topPools(poolRows, 6).map((pool) => {
                const depth = pool.liquidityUsd ?? 0
                const rate = depth > 0 ? ((pool.volume24hUsd ?? 0) / depth) * 100 : undefined

                return {
                  key: pool.id,
                  cells: [
                    <Link
                      key="pair"
                      href={`/pool/${pool.network}/${pool.address}`}
                      prefetch={false}
                      className="truncate transition-colors hover:text-brand-strong"
                    >
                      {pool.name}
                    </Link>,
                    <span key="depth">
                      {pool.liquidityUsd === undefined ? '—' : formatCompact(pool.liquidityUsd)}
                    </span>,
                    <span key="vol">
                      {pool.volume24hUsd === undefined ? '—' : formatCompact(pool.volume24hUsd)}
                    </span>,
                    <span key="rate">
                      {rate === undefined ? '—' : `${formatNumber(Math.round(rate))} %`}
                    </span>,
                  ],
                }
              })}
            />
          ) : (
            <EmptyState
              title={fr.states.unavailableTitle}
              description={pools.ok ? null : pools.reason}
              compact
            />
          )}
        </AnalysisCard>

        {/* ── À LA PLACE DU CUMUL MENSUEL DES VENTES ───────────────────────
            La référence agrège ses ventes de jetons PAR MOIS. Nous n'avons pas
            d'historique mensuel de l'activité décentralisée — le classement des pools
            est un instantané — et un axe de mois y serait donc inventé. La même figure
            agrège alors sur l'autre dimension que la donnée porte vraiment : le RÉSEAU. */}
        <AnalysisCard
          title={t('Volume échangé par réseau')}
          hint={t('Somme des volumes 24 h des pools suivis, chaîne par chaîne')}
          href="/screener"
          action={t('Voir')}
        >
          {poolRows.length > 0 ? (
            <BarFigure
              data={volumeByNetwork(poolRows, 8).map((entry) => ({
                label: entry.network,
                volume: entry.volume,
              }))}
              tickMaxChars={10}
              series={[
                { key: 'volume', label: t('Volume 24 h'), color: dataColor(3), format: 'compact' },
              ]}
              height={220}
              grow
              ariaLabel={t('Volume échangé par réseau')}
            />
          ) : (
            <EmptyState
              title={fr.states.unavailableTitle}
              description={pools.ok ? null : pools.reason}
              compact
            />
          )}
        </AnalysisCard>
      </div>

      <NewsBlock
        articles={news.ok ? news.data.slice(0, 8) : []}
        title={t('Dernières analyses et actualités')}
        seeAll={fr.home.seeAll}
        emptyTitle={fr.states.unavailableTitle}
        reason={news.ok ? null : news.reason}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <MoversBlock
          assets={overview.ok ? overview.data.gainers : []}
          title={t('Plus fortes hausses')}
          hint={fr.home.moversHint(overview.ok ? overview.data.universeSize : 100)}
          href="/crypto?vue=gagnants"
          action={t('Voir')}
          emptyTitle={fr.states.unavailableTitle}
          reason={overview.ok ? null : overview.reason}
        />
        <MoversBlock
          assets={overview.ok ? overview.data.losers : []}
          title={t('Plus fortes baisses')}
          hint={fr.home.moversHint(overview.ok ? overview.data.universeSize : 100)}
          href="/crypto?vue=perdants"
          action={t('Voir')}
          emptyTitle={fr.states.unavailableTitle}
          reason={overview.ok ? null : overview.reason}
        />
      </div>

      {/* ── À LA PLACE DU CLASSEMENT DES RAMPES DE LANCEMENT ───────────────
          La référence classe les plateformes de vente initiale par rendement moyen de
          leurs jetons. Ce chiffre suppose un historique de ventes que nous n'avons pas.
          Le classement des PLACES par volume répond à la question voisine — où passe
          réellement l'activité — et il vient d'une source qui le publie. */}
      <AnalysisCard
        title={t('Places de cotation par volume')}
        hint={t('Volume sur 24 heures publié en bitcoin par la source, et part de l’ensemble')}
        href="/places"
        action={t('Voir')}
      >
        {spot.ok && spot.data.length > 0 ? (
          <RankTable
            columns={[t('Place'), t('Volume 24 h'), t('Part'), t('Confiance')]}
            rows={(() => {
              const total = spot.data.reduce((sum, exchange) => sum + exchange.volume24hBtc, 0)

              return spot.data.map((exchange) => ({
                key: exchange.id,
                cells: [
                  <span key="name" className="truncate font-medium">{exchange.name}</span>,
                  <span key="vol">{formatNumber(Math.round(exchange.volume24hBtc))} ₿</span>,
                  <span key="share" className="inline-flex items-center gap-2">
                    <ShareBar value={total > 0 ? (exchange.volume24hBtc / total) * 100 : 0} />
                    {total > 0 ? `${((exchange.volume24hBtc / total) * 100).toFixed(0)} %` : '—'}
                  </span>,
                  <span key="trust">
                    {exchange.trustScore === undefined ? '—' : `${exchange.trustScore}/10`}
                  </span>,
                ],
              }))
            })()}
          />
        ) : (
          <EmptyState
            title={fr.states.unavailableTitle}
            description={spot.ok ? null : spot.reason}
            compact
          />
        )}
      </AnalysisCard>

      {/* ── LA CARTE THERMIQUE ─────────────────────────────────────────────
          Rendue avec CINQUANTE actifs et SANS leurs courbes 7 jours. Le tableau du
          dessus est déjà un composant client qui emporte les cent lignes avec leurs
          séries ; laisser passer les mêmes séries une seconde fois doublerait la
          charge utile de la page pour une figure qui n'en dessine aucune. */}
      <AnalysisCard
        title={t('Carte thermique')}
        hint={t('Chaque tuile est un actif ; sa taille dit sa capitalisation, sa teinte sa variation')}
        href="/heatmap"
        action={t('Voir')}
      >
        {universe.length > 0 ? (
          <MarketHeatmap
            assets={universe.slice(0, 50).map(stripSparkline)}
            categories={categories.ok ? categories.data : []}
          />
        ) : (
          <EmptyState
            title={fr.states.unavailableTitle}
            description={overview.ok ? null : overview.reason}
            compact
          />
        )}
      </AnalysisCard>

      <div className="grid gap-3 xl:grid-cols-2">
        <ExtremesBlock
          assets={nearExtreme(universe, 'ath')}
          title={t('Au plus haut historique')}
          hint={t('Actifs cotant à moins de 3 % de leur plus haut jamais atteint')}
          emptyTitle={fr.states.unavailableTitle}
          reason={overview.ok ? null : overview.reason}
        />
        <ExtremesBlock
          assets={nearExtreme(universe, 'atl')}
          title={t('Au plus bas historique')}
          hint={t('Actifs cotant à moins de 3 % de leur plus bas jamais atteint')}
          emptyTitle={fr.states.unavailableTitle}
          reason={overview.ok ? null : overview.reason}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <DerivativesBlock
          rows={derivatives.ok ? derivatives.data : []}
          field="volume24hBtc"
          title={t('Volume des dérivés sur 24 h')}
          hint={t('Publié en bitcoin par la source — jamais converti (§5)')}
          emptyTitle={fr.states.unavailableTitle}
          reason={derivatives.ok ? null : derivatives.reason}
          columnLabel={t('Volume 24 h')}
          action={t('Voir')}
        />
        <DerivativesBlock
          rows={derivatives.ok ? derivatives.data : []}
          field="openInterestBtc"
          title={t('Intérêt ouvert')}
          hint={t('Position notionnelle ouverte, publiée en bitcoin par la source')}
          emptyTitle={fr.states.unavailableTitle}
          reason={derivatives.ok ? null : derivatives.reason}
          columnLabel={t('Intérêt ouvert')}
          action={t('Voir')}
        />
      </div>
    </div>
  )
}

/* ── LE RAIL DE DÉCOUVERTE ─────────────────────────────────────────────────── */

/**
 * Deux onglets, et PAS UNE LIGNE DE JAVASCRIPT.
 *
 * Deux boutons radio de même nom portent l'état ; les étiquettes les commandent, et
 * `peer-checked/…` montre le panneau correspondant. C'est le mécanisme d'onglets le
 * plus ancien du web, il est accessible au clavier par construction, et il évite
 * d'expédier un îlot client sur la page la plus visitée du site pour permuter deux
 * listes déjà rendues.
 *
 * ⚠️ LES DEUX `<input>` DOIVENT PRÉCÉDER étiquettes ET PANNEAUX. `peer-checked` est un
 * sélecteur de FRÈRE SUIVANT (`~`) : un panneau placé avant son bouton ne réagirait à
 * rien, et l'onglet paraîtrait mort sans qu'aucune erreur ne le signale.
 */
function DiscoveryRail({
  trending,
  listings,
  trendingLabel,
  listingsLabel,
  emptyTitle,
}: {
  trending: MarketAsset[]
  listings: { id: string; name: string; symbol: string; price: number; currency: string; change24h?: number }[]
  trendingLabel: string
  listingsLabel: string
  emptyTitle: string
}) {
  return (
    <section className="rounded-panel border border-border-subtle bg-panel p-4">
      <input
        type="radio"
        name="zenkuu-rail"
        id="zenkuu-rail-trending"
        defaultChecked
        className="peer/trending sr-only"
      />
      <input
        type="radio"
        name="zenkuu-rail"
        id="zenkuu-rail-listings"
        className="peer/listings sr-only"
      />

      {/*
        ⚠️ L'ONGLET ACTIF EST PEINT DEPUIS CE CONTENEUR, PAS DEPUIS L'ÉTIQUETTE.

        `peer-checked/x:` produit un sélecteur de FRÈRE SUIVANT (`~`), qui ne
        traverse pas un niveau : une classe posée sur le `<label>` — imbriqué dans
        cette rangée — ne serait jamais appliquée, et l'onglet actif n'aurait aucune
        marque sans qu'aucune erreur ne le signale. La rangée, elle, EST frère des
        deux boutons ; elle reçoit donc la variante et désigne son enfant.
      */}
      <div className="mb-3 flex gap-4 border-b border-border-subtle peer-checked/trending:[&>label:first-child]:border-brand peer-checked/trending:[&>label:first-child]:text-ink peer-checked/listings:[&>label:last-child]:border-brand peer-checked/listings:[&>label:last-child]:text-ink">
        <RailTab htmlFor="zenkuu-rail-trending" label={trendingLabel} />
        <RailTab htmlFor="zenkuu-rail-listings" label={listingsLabel} />
      </div>

      <div className="hidden peer-checked/trending:block">
        {trending.length > 0 ? (
          <ChipRail>
            {trending.map((asset) => (
              <Link
                key={asset.id}
                href={assetHref(asset.assetClass, asset.id)}
                prefetch={false}
                className="flex shrink-0 items-center gap-2 rounded-control border border-border-subtle bg-surface-muted/40 px-3 py-2 transition-colors duration-150 hover:border-ink-muted/35"
              >
                <AssetLogo asset={asset} size={20} />
                <span className="flex flex-col">
                  <span className="text-xs font-medium text-ink">{asset.name}</span>
                  <span className="tabular text-[0.625rem] text-ink-muted">
                    <Money value={asset.price} from={asset.currency} />
                  </span>
                </span>
                <ChangeBadge value={asset.change24h} size="sm" />
              </Link>
            ))}
          </ChipRail>
        ) : (
          <EmptyState title={emptyTitle} description={null} compact />
        )}
      </div>

      <div className="hidden peer-checked/listings:block">
        {listings.length > 0 ? (
          <ChipRail>
            {listings.map((listing) => (
              /* Pas de lien : les identifiants de cette source ne résolvent vers
                 aucune fiche du site — voir le type `NewListing`. */
              <span
                key={listing.id}
                className="flex shrink-0 items-center gap-2 rounded-control border border-border-subtle bg-surface-muted/40 px-3 py-2"
              >
                <span className="flex flex-col">
                  <span className="text-xs font-medium text-ink">{listing.name}</span>
                  <span className="tabular text-[0.625rem] text-ink-muted">
                    <Money value={listing.price} from={listing.currency} />
                  </span>
                </span>
                <ChangeBadge value={listing.change24h} size="sm" />
              </span>
            ))}
          </ChipRail>
        ) : (
          <EmptyState title={emptyTitle} description={null} compact />
        )}
      </div>
    </section>
  )
}

function RailTab({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="-mb-px cursor-pointer border-b-2 border-transparent pb-2 text-sm text-ink-muted transition-colors duration-150 hover:text-ink"
    >
      {label}
    </label>
  )
}

function ChipRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{children}</div>
  )
}

/* ── LES BLOCS ─────────────────────────────────────────────────────────────── */

function NewsBlock({
  articles,
  title,
  seeAll,
  emptyTitle,
  reason,
}: {
  articles: NewsItem[]
  title: string
  seeAll: string
  emptyTitle: string
  reason: string | null
}) {
  return (
    <AnalysisCard title={title} href="/actualites" action={seeAll}>
      {articles.length > 0 ? (
        /* Deux colonnes de titres, comme la référence : ce bloc est une TABLE DES
           MATIÈRES, pas un fil. Les vignettes vivent sur `/actualites` et dans la
           colonne latérale, qui sont les deux endroits où l'on vient lire. */
        <ul className="grid gap-x-6 gap-y-3 md:grid-cols-2">
          {articles.map((article) => (
            <li key={article.id} className="border-b border-border-subtle pb-3 last:border-b-0">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm leading-snug text-ink transition-colors hover:text-brand-strong"
              >
                {article.title}
              </a>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-micro text-ink-muted">
                {article.category ? (
                  <span className="rounded-pill bg-surface-muted px-1.5 py-0.5">
                    {article.category}
                  </span>
                ) : null}
                <span>{article.source}</span>
                <RelativeTime iso={article.publishedAt} />
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={emptyTitle} description={reason} compact />
      )}
    </AnalysisCard>
  )
}

function MoversBlock({
  assets,
  title,
  hint,
  href,
  action,
  emptyTitle,
  reason,
}: {
  assets: MarketAsset[]
  title: string
  hint: string
  href: string
  action: string
  emptyTitle: string
  reason: string | null
}) {
  return (
    <AnalysisCard title={title} hint={hint} href={href} action={action}>
      {assets.length > 0 ? (
        <ol className="flex-1 divide-y divide-border-subtle">
          {assets.map((asset, index) => (
            <li key={asset.id}>
              <AssetRow asset={asset} rank={index + 1} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title={emptyTitle} description={reason} compact />
      )}
    </AnalysisCard>
  )
}

/**
 * LES ACTIFS COLLÉS À LEUR EXTRÊME.
 *
 * La référence titre « New ATH » / « New ATL » — un ÉVÉNEMENT, daté du jour. Nous
 * n'avons pas de journal des franchissements : le classement porte le plus haut et le
 * plus bas historiques, pas la date à laquelle ils ont été refaits. Le bloc annonce
 * donc ce qu'il sait vraiment — « à moins de 3 % de son extrême » — plutôt que de
 * présenter une proximité comme un franchissement (§5).
 */
function ExtremesBlock({
  assets,
  title,
  hint,
  emptyTitle,
  reason,
}: {
  assets: MarketAsset[]
  title: string
  hint: string
  emptyTitle: string
  reason: string | null
}) {
  return (
    <AnalysisCard title={title} hint={hint}>
      {assets.length > 0 ? (
        <ol className="flex-1 divide-y divide-border-subtle">
          {assets.map((asset) => (
            <li key={asset.id}>
              <AssetRow asset={asset} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title={emptyTitle} description={reason} compact />
      )}
    </AnalysisCard>
  )
}

function DerivativesBlock({
  rows,
  field,
  title,
  hint,
  emptyTitle,
  reason,
  columnLabel,
  action,
}: {
  rows: { id: string; name: string; volume24hBtc?: number; openInterestBtc?: number }[]
  field: 'volume24hBtc' | 'openInterestBtc'
  title: string
  hint: string
  emptyTitle: string
  reason: string | null
  columnLabel: string
  action: string
}) {
  const usable = rows.filter((row) => typeof row[field] === 'number')

  return (
    <AnalysisCard title={title} hint={hint} href="/perpetuels" action={action}>
      {usable.length > 0 ? (
        <RankTable
          columns={['', columnLabel]}
          rows={usable
            .sort((left, right) => (right[field] as number) - (left[field] as number))
            .map((row) => ({
              key: row.id,
              cells: [
                <span key="name" className="truncate font-medium">{row.name}</span>,
                <span key="value">{formatNumber(Math.round(row[field] as number))} ₿</span>,
              ],
            }))}
        />
      ) : (
        <EmptyState title={emptyTitle} description={reason} compact />
      )}
    </AnalysisCard>
  )
}

/* ── OUTILS ────────────────────────────────────────────────────────────────── */

/** Les `n` pools au plus gros volume 24 h. Un pool sans volume est écarté, pas mis à zéro. */
function topPools(pools: DexPool[], n: number): DexPool[] {
  return pools
    .filter((pool) => typeof pool.volume24hUsd === 'number')
    .sort((left, right) => (right.volume24hUsd as number) - (left.volume24hUsd as number))
    .slice(0, n)
}

/** Volume 24 h cumulé par réseau, les `n` premiers. */
function volumeByNetwork(pools: DexPool[], n: number): { network: string; volume: number }[] {
  const totals = new Map<string, number>()

  for (const pool of pools) {
    if (typeof pool.volume24hUsd !== 'number') continue
    totals.set(pool.network, (totals.get(pool.network) ?? 0) + pool.volume24hUsd)
  }

  return [...totals.entries()]
    .map(([network, volume]) => ({ network, volume }))
    .sort((left, right) => right.volume - left.volume)
    .slice(0, n)
}

/** Écart maximal à l'extrême, en pourcentage, pour qu'un actif entre dans le bloc. */
const EXTREME_TOLERANCE = 3

/**
 * Les actifs cotant à portée de leur plus haut — ou de leur plus bas — historique.
 *
 * ⚠️ LE PLUS BAS EST UN RAPPORT, PAS UNE DIFFÉRENCE. Un actif à 0,000 002 € dont le
 * plus bas est 0,000 001 € cote au DOUBLE de son plancher : mesurer l'écart en points
 * de pourcentage du prix courant le classerait « au plus bas » avec tous les jetons à
 * huit décimales du marché. La distance est donc relative à l'extrême lui-même.
 */
function nearExtreme(assets: MarketAsset[], bound: 'ath' | 'atl'): MarketAsset[] {
  const scored = assets
    .map((asset) => {
      const extreme = asset[bound]
      if (extreme === undefined || !Number.isFinite(extreme) || extreme <= 0) return null

      const distance =
        bound === 'ath'
          ? ((extreme - asset.price) / extreme) * 100
          : ((asset.price - extreme) / extreme) * 100

      return distance >= 0 && distance <= EXTREME_TOLERANCE ? { asset, distance } : null
    })
    .filter((entry): entry is { asset: MarketAsset; distance: number } => entry !== null)

  return scored
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 5)
    .map((entry) => entry.asset)
}

/**
 * L'actif sans sa courbe 7 jours.
 *
 * La carte thermique est un composant CLIENT : tout ce qu'on lui passe traverse la
 * frontière serveur et part dans le paquet. Elle ne dessine aucune courbe ; les
 * cinquante tableaux de cent-soixante-huit points qu'elle recevrait sans ce filtre
 * seraient de la charge utile pure.
 */
function stripSparkline(asset: MarketAsset): MarketAsset {
  const copy = { ...asset }
  delete copy.sparkline7d
  return copy
}
