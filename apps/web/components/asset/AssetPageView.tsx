import { Activity, LayoutGrid, Newspaper, Shapes, Store } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import type { AssetClass, AssetTicker } from '@zenkuu/data'
import {
  getAsset,
  getAssetHistory,
  getAssetProfile,
  getAssetTickers,
  getExchangeRates,
  getNews,
  getPeers,
  getSpotExchanges,
  getTrendingCryptoAssets,
  findUniverseEntryBySymbol,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { AssetConverter } from '@/components/asset/AssetConverter'
import { AssetGlobalPrices } from '@/components/asset/AssetGlobalPrices'
import { LiveBinancePrice } from '@/components/asset/LiveBinancePrice'
import { AssetMetricRail } from '@/components/asset/AssetMetricRail'
import { AssetMetricCatalogue } from '@/components/asset/AssetMetricCatalogue'
import { AssetAnalysis } from '@/components/asset/AssetAnalysis'
import { AssetChangeGrid } from '@/components/asset/AssetChangeGrid'
import { AssetCommunity } from '@/components/asset/AssetCommunity'
import { AssetFaq } from '@/components/asset/AssetFaq'
import { AssetYearPerformance } from '@/components/asset/AssetYearPerformance'
import { AssetNewsPanel } from '@/components/asset/AssetNewsPanel'
import { AssetOrderBook } from '@/components/asset/AssetOrderBook'
import { AssetHoldings, AssetProfileRail } from '@/components/asset/AssetHoldings'
import { AssetPeerGrid } from '@/components/asset/AssetPeerGrid'
import { AssetPools } from '@/components/asset/AssetPools'
import { AssetSectors } from '@/components/asset/AssetSectors'
import { AssetAnalystView } from '@/components/asset/AssetAnalystView'
import { AssetMarketSheet } from '@/components/asset/AssetMarketSheet'
import { AssetPageHeader } from '@/components/asset/AssetPageHeader'
import { AssetSentiment } from '@/components/asset/AssetSentiment'
import { AssetSimilarRail } from '@/components/asset/AssetSimilarRail'
import { AssetStickyBar } from '@/components/asset/AssetStickyBar'
import { AssetSupply } from '@/components/asset/AssetSupply'
import { AssetTrendingRail } from '@/components/asset/AssetTrendingRail'
import { AssetTabs, type AssetTab } from '@/components/asset/AssetTabs'
import { AssetIdentity } from '@/components/asset/AssetIdentity'
import { AssetTechSheet } from '@/components/asset/AssetTechSheet'
import { AssetTickers } from '@/components/asset/AssetTickers'
import { AssetTradingVenue } from '@/components/asset/AssetTradingVenue'
import { AssetWorkspace } from '@/components/asset/AssetWorkspace'
import { PriceHistoryTable } from '@/components/asset/PriceHistoryTable'
import { AssetTabFiller } from '@/components/asset/AssetTabFiller'
import { ShareDonut, type SharePart } from '@/components/asset/ShareDonut'
import { AssetJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { WatchlistButton } from '@/components/watchlist/WatchlistButton'
import { getContent } from '@/lib/content'
import { assetHref, marketHref } from '@/lib/asset-routes'
import type { MetricGroup } from '@/lib/asset-metrics'
import { AlertButton } from '@/components/alerts/AlertButton'
import { MAILER_ENABLED } from '@/lib/mailer'
import { getWatchlistState } from '@/lib/watchlist-actions'

/**
 * Fiche d'un actif.
 *
 * ── DISPOSITION : RAIL + ESPACE DE TRAVAIL, EN TROIS ONGLETS ──────────────────
 *
 * Une colonne étroite de repères chiffrés à gauche, le graphique et les
 * répartitions à droite, le tout réparti en trois onglets : Aperçu, Marchés,
 * Historique.
 *
 * C'EST UN RENVERSEMENT ASSUMÉ de la disposition précédente, et il faut le dire
 * clairement parce que ce fichier soutenait exactement l'inverse. Le graphique
 * occupait toute la largeur sous l'en-tête, au motif que « c'est lui qu'on vient
 * voir », et les repères se déroulaient en bandes horizontales dessous. Cette
 * conviction n'a pas été démentie — le graphique reste l'élément dominant — mais
 * elle ignorait une contrainte que l'usage a rendue visible : les repères
 * s'accumulent. Vingt chiffres en bandes horizontales, c'est trois écrans de
 * défilement, et plus aucune comparaison possible d'un seul regard. En colonne, les
 * mêmes vingt chiffres tiennent dans la hauteur du graphique.
 *
 * Ce qui est repris de la référence du secteur est donc une FORME — rail dense,
 * onglets, anneaux de répartition — parce qu'elle résout un problème que nous
 * avions réellement. Ce qui ne l'est pas : sa grammaire visuelle, ses métriques
 * propriétaires, son vocabulaire. Une convention qui marche se reprend ; un dessin
 * se réinvente.
 *
 * ── CE QUE LA RÉFÉRENCE MONTRE ET QUE NOUS NE MONTRERONS PAS ──────────────────
 *
 * Revenus, TVL on-chain, porteurs, expéditeurs, gaz consommé, émissions et rachats,
 * capitalisation par chaîne : aucune source gratuite ne publie ces séries. Les
 * afficher supposerait de les estimer (§5). Les anneaux de répartition sont donc
 * alimentés par ce que nous avons réellement — le volume par place de cotation et
 * par paire — ce qui répond à une question voisine : où se négocie cet actif, et
 * contre quoi.
 *
 * Aucun tunnel d'achat, toujours : c'est ce qui occupe la moitié droite des pages
 * de plateformes d'échange. L'espace libéré revient aux chiffres.
 *
 * ── LA GRAMMAIRE VISUELLE, ELLE, A CHANGÉ ─────────────────────────────────────
 *
 * Ce qui précède décrit une STRUCTURE, et elle tient. Ce qui suit décrit un DESSIN,
 * et il a été refait — les deux sont indépendants, ce qui est précisément pourquoi
 * l'un a pu bouger sans l'autre.
 *
 * Quatre décisions, dans l'ordre où elles se voient :
 *
 * 1. DEUX PLANS. La page vit sur un canvas sombre, les blocs de contenu sur un plan
 *    au-dessus (`bg-panel`). C'est un assouplissement de la surface unique du
 *    design system, pas son abandon : le second plan se réclame en le nommant, et
 *    un bloc qui ne le réclame pas reste au ras du canvas. Voir globals.css.
 *
 * 2. UN EN-TÊTE QUI CHIFFRE. Identité, actions et bandeau de six grandeurs dans un
 *    seul panneau. Le prix y perd son isolement — voir `AssetStatStrip`, dont
 *    l'en-tête défend ce choix en détail.
 *
 * 3. DES CARTES PLUTÔT QU'UN RUBAN. Le rail se découpe en panneaux titrés, et les
 *    frontières entre groupes passent du filet à l'intervalle.
 *
 * 4. UN CADRAGE EN HAUT DE PAGE. Le rappel « aucun ordre ici » quitte le pied de la
 *    colonne de droite pour une bande sous l'en-tête, au premier écran.
 *
 * Ce qui n'a PAS été repris de la référence : sa couleur. Le magenta de ZENKUU vient
 * de son propre logo, et le cramoisi de la référence lui appartient (§7). Une
 * convention de mise en page se reprend ; une identité chromatique, non.
 */

/**
 * Fenêtre rendue côté serveur.
 *
 * Une seule : le reste des périodes est chargé à la demande par le widget client.
 * Servir sept jours au premier rendu donne un graphique déjà peuplé pour le LCP,
 * sans dépenser cinq appels pour des périodes que le visiteur ne regardera peut-être
 * jamais (§9).
 */
const SERVER_RANGE_DAYS = 7

/**
 * Groupes laissés au rail.
 *
 * « supply » n'y figure plus : `AssetSupply` le rend en jauges juste en dessous, et
 * le faire apparaître aux deux endroits afficherait les mêmes quatre nombres deux
 * fois à quarante pixels d'intervalle. Le registre reste la source unique du
 * CONTENU ; cette constante ne décide que de la répartition entre composants.
 */
const RAIL_GROUPS = ['market', 'range', 'change'] as const satisfies readonly MetricGroup[]

/**
 * Références proposées en tête de liste de comparaison.
 *
 * Ces deux-là et pas d'autres : sur le marché crypto, « fait-il mieux que le
 * bitcoin ? » est la question que tout le monde pose en premier, et l'ether est le
 * seul second point de repère universellement compris. Une liste plus longue
 * transformerait un raccourci en travail de sélection.
 */
const BENCHMARK_OPTIONS = [
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'ethereum', label: 'Ethereum' },
]

export interface AssetPageViewProps {
  assetClass: AssetClass
  id: string
  searchParams: Record<string, string | string[] | undefined>
}

export async function AssetPageView({ assetClass, id }: AssetPageViewProps) {
  const fr = await getContent()
  const [asset, history, peers, rates, tickers, news, trending, exchanges, profileResult] =
    await Promise.all([
    getAsset(id, assetClass, 'eur'),
    getAssetHistory(id, assetClass, SERVER_RANGE_DAYS, 'eur'),
    // `getPeers` dérive de l'aperçu déjà mis en cache par l'accueil : les
    // comparables ne coûtent aucun appel réseau supplémentaire — ce qui compte,
    // puisque le palier gratuit de CoinGecko ne tolère qu'une poignée de requêtes
    // par minute (mesuré).
    getPeers(assetClass, id, 6),
    getExchangeRates(),
    // SEUL appel supplémentaire de la fiche, et il est mis en cache 30 minutes :
    // la liste des places et leur poids relatif bougent à l'échelle de la journée.
    // Un fournisseur sans `getTickers` fait disparaître la section.
    //
    // 100 et non 10 : la source renvoie cent lignes dans la même réponse. En jeter
    // quatre-vingt-dix côté serveur n'économisait aucun octet sur le réseau sortant,
    // et privait le tableau de sa pagination et de son filtre par devise. Ces cent
    // lignes alimentent désormais AUSSI les anneaux de répartition.
    getAssetTickers(id, assetClass, 'eur', 100),
    // Deux ajouts qui ne coûtent PRESQUE rien, et il faut dire pourquoi « presque » :
    // le fil d'actualités vient de nos propres flux (aucun rapport avec le quota
    // CoinGecko), et la tendance est déjà chargée et mise en cache par la page
    // d'accueil — la fiche se branche sur le même cache. Sur un cache froid, la
    // tendance coûte un appel ; il est partagé par TOUTES les fiches et par l'accueil,
    // ce qui le rend négligeable à l'échelle du site.
    // 200 et non 40 : la fiche cherche les articles qui NOMMENT cet actif, et le tour
    // à tour de `fetchNews` ne garde qu'un ou deux articles par source dans les
    // quarante premiers — assez pour un fil d'accueil, pas pour une recherche par nom.
    // Depuis que `getNews` met en cache un réservoir unique, demander plus ne coûte
    // strictement rien de plus au réseau (voir son en-tête).
    getNews(200),
    assetClass === 'crypto' ? getTrendingCryptoAssets('eur') : null,
    /*
     * Palmarès des places, uniquement pour en tirer les LOGOS du tableau « où se
     * négocie » : la réponse des cotations donne le nom de chaque place, jamais son
     * image.
     *
     * Le coût est négligeable et il faut dire pourquoi, ce fournisseur étant plafonné
     * à quelques appels par minute : la réponse est mise en cache une heure et la clé
     * ne dépend PAS de l'actif. Un seul appel sert donc toutes les fiches du site
     * pendant une heure, là où les cotations en coûtent un par actif.
     *
     * 250 est le plafond de l'endpoint. Une valeur plus basse laisserait sans icone
     * les places de second rang, qui sont précisément les moins reconnaissables au
     * seul nom — c'est-à-dire celles où l'icône sert le plus.
     */
    assetClass === 'crypto' ? getSpotExchanges(250) : null,
    /*
     * PROFIL BOURSIER — frais, composition, ratios.
     *
     * Actions, ETF et INDICES : les trois classes pour lesquelles la source publie
     * quelque chose. C'est ce qui donne enfin une matière propre aux fiches d'ETF, qui
     * n'avaient qu'un cours et un graphique — or un fonds n'est pas un actif mais un
     * PANIER, et sa question propre est ce qu'il contient.
     *
     * Les indices s'y ajoutent pour une raison mesurée : c'était la fiche la plus
     * pauvre du site (7 500 caractères de texte contre 19 200 pour le bitcoin). La
     * source ne leur donne ni ratio ni composition, mais elle donne la place de
     * cotation et la nature de l'instrument — de quoi remplir une fiche technique là
     * où il n'y avait rien.
     *
     * Mis en cache six heures : des frais changent une fois par an, une composition par
     * trimestre. L'appel exige une poignée de main en deux temps (voir son adaptateur),
     * que ce cache ramène à quatre par jour et par titre.
     */
    assetClass === 'stock' || assetClass === 'etf' || assetClass === 'index'
      ? getAssetProfile(id, assetClass)
      : null,
  ])

  // Identifiant inconnu de la source : c'est un 404 au sens propre, pas une panne.
  // Renvoyer une page d'erreur laisserait croire à un incident temporaire, et
  // laisserait surtout l'URL indexable pour un actif qui n'existe pas (§9).
  if (!asset.ok && asset.kind === 'notFound') notFound()

  if (!asset.ok) {
    return (
      <EmptyState
        title={fr.asset.notFoundTitle}
        description={asset.reason}
        source={asset.source?.label ?? null}
        tone="warning"
        action={
          <Link href={marketHref(assetClass)} className="text-sm font-medium text-brand-strong underline">
            {fr.asset.backToRanking}
          </Link>
        }
      />
    )
  }

  const data = asset.data
  const isForex = assetClass === 'forex'

  const comparables = peers.ok ? peers.data : []
  const tickerRows = tickers.ok ? tickers.data : []

  /* Un profil manquant n'est PAS une panne de la fiche : le cours, le graphique et
     l'historique viennent d'un autre endpoint. Les sections qu'il alimente disparaissent
     simplement, comme n'importe quel champ absent. */
  const profile = profileResult?.ok ? profileResult.data : null

  /* Table identifiant → logo. Construite ICI, une fois, plutôt que par une recherche
     dans un tableau de 250 entrées à chacune des cent lignes du tableau des places. */
  const exchangeImages: Record<string, string> = {}
  if (exchanges?.ok) {
    for (const place of exchanges.data) {
      if (place.image) exchangeImages[place.id] = place.image
    }
  }

  // État de suivi lu au rendu serveur : le bouton arrive déjà dans le bon état,
  // au lieu de basculer visiblement une fois la page hydratée.
  const watchlist = await getWatchlistState(assetClass, data.id)

  /*
   * ── TEXTE DE PRÉSENTATION : TROIS ORIGINES, UNE SEULE SECTION ───────────────
   *
   * Elles sont classées de la plus SOURCÉE à la moins, et l'ordre est le sujet :
   *
   *   1. `description` — la notice publiée par la source crypto, en français.
   *   2. `profile.summary` — le résumé d'activité publié par la source boursière,
   *      en anglais. Il était déjà chargé pour les ratios du rail et n'était branché
   *      nulle part ; c'est ce qui laissait une fiche d'action sans un mot de
   *      présentation.
   *   3. `entry.about` — une notice RÉDIGÉE PAR NOUS, qui n'existe que pour les
   *      indices et les matières premières. Aucune source n'en publie pour ces
   *      instruments, et leurs fiches se refermaient donc sur un cours.
   *
   * Chaque origine porte son ATTRIBUTION à l'affichage. C'est la seule chose qui
   * empêche la troisième d'être malhonnête : une notice maison présentée sous le nom
   * d'un fournisseur de cotation serait une fausse attribution, et le §5 ne distingue
   * pas le chiffre inventé de la paternité usurpée.
   */
  const universeEntry = findUniverseEntryBySymbol(data.symbol)

  const about: { text: string; credit: 'source' | 'source-en' | 'zenkuu' } | null =
    data.description
      ? { text: data.description, credit: 'source' }
      : profile?.summary
        ? { text: profile.summary, credit: 'source-en' }
        : universeEntry?.about
          ? { text: universeEntry.about, credit: 'zenkuu' }
          : null

  /*
   * ── LE VOLUME DOUTEUX NE COMPTE PAS DANS LES RÉPARTITIONS ─────────────────
   *
   * C'est une méthodologie reprise de CoinGecko, et elle change un chiffre plutôt
   * qu'un texte. Leur « Trust Score » note chaque paire au vert, au jaune ou au rouge
   * à partir du trafic de la plateforme, de l'écart et de la profondeur à ±2 %, de la
   * fréquence des transactions et d'un contrôle de valeurs aberrantes. Le rouge
   * signale un volume que la source elle-même juge non fiable.
   *
   * Le tableau des places l'affichait déjà en pastille — donc dans le détail — mais
   * les anneaux de répartition additionnaient TOUT. Une plateforme au volume gonflé y
   * apparaissait donc comme la première place de cotation d'un jeton, avec un
   * pourcentage à deux chiffres tiré d'échanges que personne ne considère réels.
   *
   * Les paires notées rouge sont donc écartées du calcul, et le nombre de paires
   * écartées est affiché sous l'anneau : retirer une donnée en silence serait la même
   * faute que l'inventer.
   */
  const untrusted = tickerRows.filter((ticker) => ticker.trust === 'red').length
  const trustedTickers = tickerRows.filter((ticker) => ticker.trust !== 'red')

  const byExchange = shareBy(trustedTickers, (ticker) => ticker.exchange)
  const byPair = shareBy(trustedTickers, (ticker) => ticker.target.toUpperCase())

  /* La mention n'apparaît que s'il y a réellement eu un retrait — sinon elle
     inquiéterait sur une page où rien n'a été écarté. */
  const trustNote =
    untrusted > 0
      ? ` ${untrusted} paire${untrusted > 1 ? 's' : ''} au volume jugé non fiable par la source ${untrusted > 1 ? 'sont écartées' : 'est écartée'} du calcul.`
      : ''

  // 18rem et non 16 : les groupes du rail sont devenus des panneaux, et un panneau
  // prélève 32px de marge interne sur la largeur utile. À 16rem, il ne restait que
  // 224px pour un libellé, une valeur et parfois un écart — d'où les « Plus haut
  // hi… » tronqués. La colonne s'élargit de la largeur exactement perdue, plus une
  // marge.
  const overview = (
    <div className="space-y-5">
        <section className="space-y-3">
          <AssetWorkspace
            asset={data}
            assetClass={assetClass}
            initialHistory={history.ok ? history.data : null}
            initialDays={SERVER_RANGE_DAYS}
            rates={rates.ok ? rates.data : null}
            /*
             * Comparables de la source, plus les deux références du marché.
             *
             * Réservé à la crypto : la route de comparaison interroge l'historique
             * crypto, et surtout rapporter une action au bitcoin ne dirait rien
             * d'utile. Quatre comparables au plus — au-delà, la liste déroulante
             * devient un annuaire.
             */
            compareOptions={
              assetClass === 'crypto'
                ? [
                    ...BENCHMARK_OPTIONS.filter((entry) => entry.id !== data.id),
                    ...comparables
                      .filter((peer) => !BENCHMARK_OPTIONS.some((entry) => entry.id === peer.id))
                      .slice(0, 4)
                      .map((peer) => ({ id: peer.id, label: peer.name })),
                  ]
                : []
            }
          />

          {/*
            LA GRILLE DE VARIATIONS, COLLÉE SOUS LE GRAPHIQUE.

            C'est le trait le plus reconnaissable de la référence, et il n'était pas
            repris : ces six fenêtres — 1 h, 24 h, 7 j, 14 j, 30 j, 1 an — vivaient
            dans un sous-onglet « Performances » du plan de travail, c'est-à-dire
            derrière un clic.

            Le composant existait DÉJÀ et n'était appelé nulle part. Les six valeurs
            arrivent dans la même réponse que le cours : la rangée ne coûte aucun
            appel réseau, elle exploite des champs jusqu'ici jetés.

            Sa place est ici et pas ailleurs : la question « et sur une semaine ? »
            se pose en regardant la courbe, pas après l'avoir quittée.
          */}
          <AssetChangeGrid asset={data} />

          {history.ok ? (
            <SourceNote
              label={history.source.label}
              href={history.source.attributionUrl}
              updatedAt={data.lastUpdated}
            />
          ) : null}
        </section>

        {/* Répartitions. Elles ne s'affichent que si la source a livré des places de
            cotation — donc jamais pour une paire de devises ou un indice, dont le
            concept même n'a pas de sens. `ShareDonut` se retire aussi de lui-même
            en dessous de deux parts. */}
        {byExchange.length > 0 || byPair.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/*
              `valueCurrency` fait apparaître le volume à côté de la part, comme la
              colonne « Latest » de la référence. Sans elle, l'anneau dit qu'une place
              pèse 17 % sans dire 17 % de quoi : deux actifs aux répartitions
              identiques mais aux volumes cent fois différents auraient exactement la
              même légende.

              On passe une DEVISE et non une fonction de rendu : une fonction ne
              traverse pas la frontière serveur → client. L'anneau formate lui-même,
              et suit donc la devise choisie par le lecteur.
            */}
            <ShareDonut
              title="Volume par place de cotation"
              subtitle={`Volume 24 h de ${data.name}, réparti entre les places qui le cotent.${trustNote}`}
              parts={byExchange}
              restNoun="places"
              valueHeader="Volume 24 h"
              valueCurrency="EUR"
            />
            <ShareDonut
              title="Volume par devise de cotation"
              subtitle={`Contre quoi cet actif se négocie réellement.${trustNote}`}
              parts={byPair}
              restNoun="paires"
              valueHeader="Volume 24 h"
              valueCurrency="EUR"
            />
          </div>
        ) : null}
    </div>
  )

  /*
   * ── PLACES ────────────────────────────────────────────────────────────────
   *
   * L'onglet s'appelait « Marchés » et portait TROIS sujets : le carnet d'ordres,
   * la table des places et la grille des actifs comparables. Les comparables en
   * sortent — ils ne décrivent pas où cet actif se négocie, mais à quoi il
   * ressemble, ce qui est une autre question et désormais un autre onglet.
   */
  const venues = (
    <div className="space-y-8">
      {/* Le carnet EN PREMIER : il décrit l'instant, là où la table des places décrit
          les vingt-quatre dernières heures. Crypto seulement — Binance ne tient de
          carnet ni pour une action, ni pour une paire de devises — et le composant se
          retire de lui-même si la paire n'y est pas cotée. */}
      {assetClass === 'crypto' ? <AssetOrderBook symbol={data.symbol} /> : null}

      {/*
        L'ONGLET N'EST PLUS VIDE POUR UNE VALEUR BOURSIÈRE.

        Il affichait « Aucune place de cotation publiée », ce qui était exact au mot
        près et faux dans ce qu'on en comprenait : une action n'a pas des places, elle
        en a UNE, connue et réglementée. Le message décrivait une absence de données là
        où il y a une différence de nature entre deux marchés — voir
        `AssetTradingVenue`, qui rend désormais la place, la devise et la séance.

        Le composant se retire de lui-même pour la crypto et le forex, dont l'onglet
        garde son tableau de plateformes.
      */}
      <AssetTradingVenue asset={data} assetClass={assetClass} />

      {tickerRows.length > 0 ? (
        <AssetTickers
          tickers={tickerRows}
          assetName={data.name}
          exchangeImages={exchangeImages}
        />
      ) : assetClass === 'crypto' || assetClass === 'forex' ? (
        <>
          <EmptyState
            title="Aucune place de cotation publiée"
            description="La source ne renseigne pas les places qui cotent cet actif."
            compact
          />
          {/* Le carnet d'ordres, lui, peut très bien être présent au-dessus : ce repli
              ne comble que le cas où la table des places manque AUSSI. */}
          <AssetTabFiller asset={data} />
        </>
      ) : null}
    </div>
  )

  /*
   * ── ÉCOSYSTÈME : LE TERRAIN DE L'ACTIF, SOUS QUATRE ANGLES ────────────────
   *
   * Deux onglets ont d'abord fusionné ici, « Similaires » et « Trésorerie ». Ils
   * posaient la même question sous deux angles — qui d'autre occupe ce terrain, et qui
   * en détient — et aucun des deux ne remplissait un onglet à lui seul : le premier
   * tient en une grille de six vignettes, le second n'a AUCUNE donnée à montrer, quelle
   * que soit la fiche. Deux onglets à moitié vides coûtent plus cher qu'un onglet plein.
   *
   * Deux sections s'y ajoutent, et elles répondent au reproche que la fusion laissait
   * intact : l'onglet restait le plus maigre des cinq — six vignettes et un encadré
   * d'absence.
   *
   *   SECTEURS. Les narratifs auxquels la source rattache l'actif, avec la taille de
   *   chacun et la part qu'il y occupe. C'est ce qui donne son échelle au reste de la
   *   page : soixante milliards ne veut pas la même chose selon qu'ils pèsent deux
   *   pour cent d'un secteur ou soixante. Gratuit — `getCategories` est déjà en cache
   *   pour tout le site.
   *
   *   POOLS DE LIQUIDITÉ. Notre équivalent honnête de l'« App ecosystem » de la
   *   référence : elle liste les applications déployées sur une chaîne, nous listons
   *   les réserves où le jeton s'échange sans intermédiaire. Chargés à l'ouverture de
   *   l'onglet seulement, et jamais rendus pour un actif sans contrat.
   *
   * L'ORDRE va du plus large au plus étroit : le secteur situe l'actif dans le marché,
   * les comparables le situent parmi ses pairs, les pools disent où il change de mains,
   * et les détentions institutionnelles — que personne ne publie — ferment la marche.
   */
  const ecosystem = (
    <div className="space-y-10">
      {assetClass === 'crypto' ? <AssetSectors asset={data} /> : null}

      {/*
        LA COMPOSITION D'UN FONDS OCCUPE ICI LA PLACE DES SECTEURS D'UNE CRYPTO.

        Les deux répondent à la même question — « de quoi ce terrain est-il fait » —
        avec la donnée que chaque classe publie réellement : des narratifs pondérés pour
        un jeton, des positions et des secteurs pour un tracker. Aucune fiche ne montre
        les deux, et aucune n'affiche de section vide : le composant se retire quand la
        source n'a rien livré.
      */}
      {profile ? <AssetHoldings profile={profile} assetName={data.name} /> : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="display-sm text-ink">{fr.asset.similarTitle}</h2>
          <Link
            href={marketHref(assetClass)}
            className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
          >
            {fr.home.seeAll}
          </Link>
        </div>

        {comparables.length > 0 ? (
          <AssetPeerGrid peers={comparables} />
        ) : (
          <EmptyState title={fr.states.unavailableTitle} compact />
        )}
      </section>

      {/* Réservé aux jetons portant une adresse de contrat : un actif natif — bitcoin,
          ether — n'a pas de pool, et le composant se retire de lui-même. */}
      {assetClass === 'crypto' && data.contracts ? (
        <AssetPools contracts={data.contracts} assetName={data.name} />
      ) : null}

      {/*
        ── DÉTENTIONS INSTITUTIONNELLES ────────────────────────────────────────

        La section ANNONCE QU'ELLE EST VIDE, ce qui est une position et non un oubli.
        La référence y liste les entreprises et fonds qui détiennent l'actif à leur
        bilan ; aucune de nos sources ne publie cette donnée — ni CoinGecko sur son
        palier gratuit, ni Yahoo, ni Binance.

        Deux façons de traiter ce manque, et une seule est honnête. La déduire — de la
        répartition de l'offre, des grands portefeuilles connus — reviendrait à publier
        une estimation maison sous couvert de fait, ce que le §5 interdit. Dire qu'on ne
        l'a pas apprend au moins au lecteur qu'il doit la chercher ailleurs.

        Elle n'appelle plus `AssetTabFiller` : ce bouche-trou existait parce que cet
        onglet-là était TOUJOURS réduit à son encadré d'absence. Adossée à la grille des
        comparables, l'absence occupe désormais la place qu'elle mérite : un paragraphe,
        pas un écran.
      */}
      <section className="space-y-3">
        <h2 className="display-sm text-ink">Détentions institutionnelles</h2>
        <EmptyState
          title="Non publiées par nos sources"
          description={`Aucune de nos sources ne publie les trésoreries d’entreprise exposées à ${data.name}. Nous préférons le dire plutôt que d’estimer : une détention déduite de la répartition de l’offre serait un chiffre inventé, pas un relevé.`}
          compact
        />
      </section>

      {/* Le bouche-trou ne subsiste que si la grille des comparables est vide elle
          aussi — c'est-à-dire quand l'onglet entier n'aurait rien à montrer. */}
      {comparables.length === 0 ? <AssetTabFiller asset={data} /> : null}
    </div>
  )

  /*
   * ── ACTUALITÉS ────────────────────────────────────────────────────────────
   *
   * Le fil quitte le rail de l'aperçu, où il était tronqué à six entrées, pour un
   * onglet qui peut en montrer trois fois plus. Ce sont NOS propres flux : cet
   * onglet ne coûte aucun appel supplémentaire, la réponse étant déjà chargée pour
   * la page.
   */
  const newsPanel = news.ok ? (
    <AssetNewsPanel
      news={news.data}
      name={data.name}
      {...(data.symbol ? { symbol: data.symbol } : {})}
      limit={20}
      // Aucun article ne cite l'actif : c'est fréquent hors des dix premières
      // capitalisations, et un onglet blanc y serait la règle plutôt que l'exception.
      fallback={
        <>
          <EmptyState
            title={`Aucun article ne mentionne ${data.name}`}
            description="Nos vingt-neuf sources n’ont pas écrit ce nom récemment. Ce n’est pas un silence du marché, seulement l’absence de couverture chez les médias que nous suivons."
            compact
          />
          <AssetTabFiller asset={data} />
        </>
      }
    />
  ) : (
    <>
      <EmptyState title={fr.states.unavailableTitle} compact />
      <AssetTabFiller asset={data} />
    </>
  )

  /*
   * ── L'HISTORIQUE, DEVENU UNE SECTION DE L'ANALYSE ─────────────────────────
   *
   * Il occupait un onglet à lui seul. Or un tableau de cours jour par jour n'est pas
   * une matière qu'on vient consulter : c'est une PIÈCE JUSTIFICATIVE, celle qu'on
   * ouvre après avoir lu un indicateur pour vérifier d'où il sort. Le ranger derrière
   * son propre onglet obligeait à quitter l'analyse pour aller chercher la série qui
   * la fonde, puis à revenir.
   *
   * Il ferme donc l'onglet Analyse, sous les mesures qu'il justifie. Le convertisseur
   * et les cours mondiaux le suivent : ils vivent de la même série.
   */
  const historySection = (
    <section className="space-y-4">
      <h2 className="display-sm text-ink">Historique des cours</h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {history.ok ? (
            <PriceHistoryTable
              history={history.data}
              currency={data.currency}
              assetName={data.name}
              isRate={isForex}
            />
          ) : (
            <EmptyState title={fr.states.unavailableTitle} compact />
          )}
        </div>

        <aside className="space-y-8">
          {data.pricesByCurrency ? (
            <>
              <AssetConverter symbol={data.symbol} pricesByCurrency={data.pricesByCurrency} />
              <AssetGlobalPrices symbol={data.symbol} pricesByCurrency={data.pricesByCurrency} />
            </>
          ) : null}
        </aside>
      </div>
    </section>
  )

  // Icônes à 14px et trait de 1,5 : à 16px avec un trait de 2, un pictogramme posé
  // à côté d'un libellé de 14px paraît plus gras que le mot qu'il accompagne.
  /*
   * L'onglet Analyse est rendu SANS ses données : `AssetAnalysis` est un composant
   * client qui charge une année d'historique et de bougies à sa première apparition
   * à l'écran. Le faire côté serveur coûterait deux appels externes de plus à CHAQUE
   * rendu de fiche, pour un onglet que la plupart des visiteurs n'ouvriront jamais.
   */
  const analysis = (
    <div className="space-y-8">
      {/*
        LES PERFORMANCES SUR UN AN REJOIGNENT L'ANALYSE.

        Elles vivaient dans un sous-onglet du panneau de graphique, sous une rangée
        « Graphique / Performances / FAQ » qui a été supprimée : c'était la dernière
        chose qui séparait la fiche de la disposition de la référence, chez qui la
        courbe démarre immédiatement sous les onglets principaux.

        Elles atterrissent ICI et pas ailleurs parce que c'est leur nature : des
        mesures dérivées d'une série, comme les indicateurs techniques et les mesures
        de risque qui suivent. Les deux blocs chargent d'ailleurs la même année de
        données, et à la même condition — à l'ouverture de l'onglet, jamais avant.
      */}
      <AssetYearPerformance asset={data} assetClass={assetClass} />

      <AssetAnalysis
        assetClass={assetClass}
        assetId={data.id}
        currency={data.currency}
        {...(data.ath !== undefined ? { ath: data.ath } : {})}
        {...(data.athDate ? { athDate: data.athDate } : {})}
        {...(data.atl !== undefined ? { atl: data.atl } : {})}
        {...(data.atlDate ? { atlDate: data.atlDate } : {})}
      />

      {/*
        ── LE CATALOGUE DE MÉTRIQUES ────────────────────────────────────────────

        C'est l'écran le plus dense de la référence, et il nous manquait : vingt mesures
        au registre, chacune avec son libellé et son explication, mais qui n'existaient
        qu'en lignes de texte dans le rail ou une par une sur leur page dédiée. La
        grille les montre TOUTES, avec leur courbe quand la source en publie une.

        Il est ici et non dans un sixième onglet : la rangée est passée de sept à cinq
        parce que sa longueur se paie à chaque visite, et ce contenu appartient au même
        geste que les indicateurs et le risque juste au-dessus — regarder l'actif de
        près. Son en-tête détaille le reste.

        Il ne coûte AUCUN appel supplémentaire : ses courbes viennent de la même année
        d'historique que `AssetAnalysis`, partagée par `useAssetSeries`.
      */}
      <AssetMetricCatalogue asset={data} assetClass={assetClass} />

      {/* La série qui fonde tout ce qui précède ferme l'onglet — voir sa note. */}
      {historySection}
    </div>
  )

  /*
   * ── LES CINQ ONGLETS ──────────────────────────────────────────────────────
   *
   * Ils étaient sept. La rangée est une NAVIGATION, pas un sommaire : sa longueur se
   * paie à chaque visite, en temps de lecture avant le premier clic, et sur un
   * téléphone en défilement latéral. Sept onglets dont deux ne remplissaient pas leur
   * écran coûtaient donc deux fois — une rangée plus longue, et deux déceptions à
   * l'ouverture.
   *
   * Les deux annexes ont rejoint le voisin dont elles répondaient déjà à la question :
   *
   *   Aperçu       le graphique et les chiffres qui l'accompagnent
   *   Places       où l'actif se négocie — carnet et table des paires
   *   Analyse      indicateurs, mesures de risque · ET la série jour par jour
   *   Actualités   le fil d'articles qui mentionnent l'actif
   *   Écosystème   les comparables de sa catégorie · ET les détenteurs
   *
   * Aucun contenu n'a disparu dans l'opération : « Historique » et « Trésorerie » sont
   * des SECTIONS titrées de leur onglet d'accueil, atteignables au défilement là où
   * elles l'étaient au clic.
   *
   * L'ORDRE n'est pas celui de la référence, et c'est délibéré. Elle range par
   * familiarité décroissante ; on range par PROXIMITÉ AU COURS. « Places » suit
   * « Aperçu » parce que la question qui vient après « combien » est « où », et
   * « Analyse » prend le troisième rang — chez la référence il n'existe pas, et le
   * reléguer en fin de rangée aurait caché le seul onglet que les concurrents n'ont
   * pas.
   *
   * Icônes à 14px et trait de 1,5 : à 16px avec un trait de 2, un pictogramme posé à
   * côté d'un libellé de 14px paraît plus gras que le mot qu'il accompagne.
   */
  const tabs: AssetTab[] = [
    { id: 'apercu', label: 'Aperçu', icon: <LayoutGrid size={14} strokeWidth={1.5} />, panel: overview },
    { id: 'places', label: 'Places', icon: <Store size={14} strokeWidth={1.5} />, panel: venues },
    { id: 'analyse', label: 'Analyse', icon: <Activity size={14} strokeWidth={1.5} />, panel: analysis },
    {
      id: 'actualites',
      label: 'Actualités',
      icon: <Newspaper size={14} strokeWidth={1.5} />,
      panel: newsPanel,
    },
    {
      id: 'ecosysteme',
      label: 'Écosystème',
      icon: <Shapes size={14} strokeWidth={1.5} />,
      panel: ecosystem,
    },
  ]

  return (
    <div className="space-y-5">
      {/*
        Données structurées : posées ici plutôt que dans chaque page de classe
        d'actif, puisque ce composant sert les six. `Dataset` et non `Product` —
        décrire un cours comme un produit assorti d'une offre ferait apparaître
        ZENKUU comme un point de vente dans les résultats de recherche, ce que le §7
        interdit.
      */}
      {asset.source ? (
        <AssetJsonLd
          name={data.name}
          symbol={data.symbol}
          path={assetHref(assetClass, data.id)}
          description={data.description}
          sourceName={asset.source.label}
          sourceUrl={asset.source.attributionUrl}
          updatedAt={data.lastUpdated}
        />
      ) : null}

      <BreadcrumbJsonLd
        items={[
          { name: fr.nav.home, path: '/' },
          { name: fr.assetClass[assetClass], path: marketHref(assetClass) },
          { name: data.name, path: assetHref(assetClass, data.id) },
        ]}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          L'EN-TÊTE REPASSE EN PLEINE LARGEUR.

          Il avait été enfoui dans le rail, au motif que la référence tient identité et
          chiffres dans une même colonne étroite. C'était une lecture erronée d'elle :
          elle pose son titre PLEINE LARGEUR au-dessus de tout, et ne met dans la
          colonne que les chiffres.

          L'erreur avait une conséquence mesurable. Dans 288 pixels, le `<h1>` tenait
          en 18 pixels — si bien que « Toutes les métriques », titre d'une sous-section
          d'onglet, s'affichait plus gros que le nom de l'actif sur sa propre fiche. La
          hiérarchie visuelle disait l'inverse de la hiérarchie réelle.

          Le gain de hauteur qui justifiait le rail est préservé : ce bloc ne reprend
          PAS la rangée de six chiffres ni les répartitions de l'ancien bandeau, qui
          restent dans la colonne et dans les onglets. Il porte une ligne d'identité,
          le cours, et les deux actions.
          ══════════════════════════════════════════════════════════════════════ */}
      <AssetPageHeader
        asset={data}
        assetClass={assetClass}
        rankLabel={fr.asset.stats.rank}
        breadcrumb={<Breadcrumb assetClass={assetClass} name={data.name} />}
        sourceLabel={asset.source?.label ?? null}
        price={
          <>
            {/*
              `Money` et non un montant formaté côté serveur.

              Ce cours était le DERNIER chiffre de la page à ignorer la devise choisie :
              il restait en euros pendant que le rail, les anneaux et les tableaux
              affichaient des dollars.

              Le coût est connu et assumé : ce montant n'est pas dans le HTML initial
              avec sa devise finale, il s'affiche en euros puis se convertit à
              l'hydratation. C'est déjà le comportement de toutes les autres cellules
              de montant du site (cf. `Money`), et l'euro affiché entre-temps est la
              devise dans laquelle la source cote réellement — jamais un chiffre faux.

              Binance en complément côté client — voir l'en-tête de `LiveBinancePrice` :
              ce n'est PAS une seconde source de vérité, juste un cours qui tique sans
              jamais toucher notre quota CoinGecko. Réservé au marché crypto (§5 —
              Binance ne cote ni forex, ni actions, ni ETF).
            */}
            {assetClass === 'crypto' ? (
              <LiveBinancePrice
                symbol={data.symbol}
                fallbackValue={data.price}
                fallbackCurrency={data.currency}
              />
            ) : (
              <Money value={data.price} from={data.currency} asRate={isForex} />
            )}
            {isForex ? (
              <span className="ml-1 text-base font-medium text-ink-muted">{data.currency}</span>
            ) : null}
          </>
        }
        actions={
          <>
            {/* L'alerte est proposée À CÔTÉ du suivi, et pas dans un menu : ce sont les
                deux seules actions que la fiche permet, et elles répondent à la même
                intention — « je veux garder un œil là-dessus ».

                `available` ne teste PLUS la session. Le retrait des comptes obligatoires
                a supprimé la seule raison qui la faisait entrer dans ce calcul : une
                alerte s'arme sans compte, rangée sous le cookie anonyme du navigateur.
                Ne restent que les deux briques d'exploitation — la base et le service
                d'envoi —, dont l'absence est une panne à annoncer et non un geste à
                demander au lecteur. */}
            <AlertButton
              assetClass={assetClass}
              assetId={data.id}
              label={data.name}
              {...(data.symbol ? { symbol: data.symbol } : {})}
              currency={data.currency}
              price={data.price}
              path={assetHref(assetClass, data.id)}
              available={watchlist.available && MAILER_ENABLED}
            />

            <WatchlistButton
              assetClass={assetClass}
              assetId={data.id}
              label={data.name}
              {...(data.symbol ? { symbol: data.symbol } : {})}
              path={assetHref(assetClass, data.id)}
              initialFollowing={watchlist.following}
              signedIn={watchlist.available}
            />
          </>
        }
      />

      {/*
        LE TIROIR DES MARCHÉS A ÉTÉ RETIRÉ.

        C'était une poignée `fixed` au bord gauche de l'écran, dépliant une liste de
        tendances par-dessus la page. Deux raisons de le supprimer, dans cet ordre :

        Il DOUBLAIT une navigation qui existe ailleurs et mieux. Les mêmes actifs sont
        dans la recherche d'en-tête, dans les menus, dans « Projets similaires » au pied
        du rail, et dans la grille de comparables de l'onglet Écosystème. Un cinquième
        chemin vers la même liste n'ajoute pas un accès, il ajoute une chose à ignorer.

        Il occupait le bord GAUCHE, c'est-à-dire le côté où le rail commence désormais
        à s'aligner sur le contenu. Une poignée collée à l'écran contredisait le
        centrage que toute la page vient d'adopter.

        `AssetMarketDrawer` reste dans le dépôt : le composant est correct, c'est sa
        présence sur la fiche qui ne l'était pas.
      */}

      {/* ══════════════════════════════════════════════════════════════════════
          LA FICHE TIENT SUR DEUX COLONNES, ET LE RAIL VIT HORS DES ONGLETS.

          C'est la disposition de la référence, et c'est la modification la plus
          structurante de cette page. Ce qui existait avant : un BANDEAU pleine
          largeur portant l'identité, les actions, une rangée horizontale de six
          chiffres et la barre d'amplitude, puis un bandeau d'information, puis une
          rangée d'onglets sur toute la largeur, et enfin seulement le graphique.

          Trois défauts, du plus visible au plus profond :

          1. Près de trois cents pixels étaient consommés avant que la courbe ne
             commence. Sur un écran d'ordinateur portable, le graphique — ce qu'on
             vient voir — n'apparaissait qu'à moitié au premier écran.

          2. Les chiffres et la courbe ne se lisaient jamais ENSEMBLE. Empilés, il
             faut mémoriser les uns pour interpréter l'autre ; côte à côte, l'œil
             fait l'aller-retour sans effort. C'est toute la raison d'être d'un rail.

          3. Le rail étant AU-DEDANS de l'onglet « Aperçu », le cours disparaissait
             dès qu'on ouvrait « Places » ou « Historique ». Sorti des onglets, il
             reste sous les yeux quel que soit l'onglet — ce que fait la référence, et
             ce que fait aussi la barre collante de ce site, à ceci près qu'elle ne se
             déclenche qu'au défilement.

          `items-start` : sans lui, la colonne courte s'étirerait à la hauteur de la
          longue, et le rail d'une paire de devises — qui n'a ni offre ni communauté —
          finirait par un vide de plusieurs centaines de pixels.

          18rem et non 16 : les groupes du rail sont des panneaux, et un panneau
          prélève 32px de marge interne. À 16rem il ne restait que 224px pour un
          libellé, une valeur et parfois un écart — d'où les « Plus haut hi… »
          tronqués.
          ══════════════════════════════════════════════════════════════════════ */}
      {/*
        C'EST `AssetTabs` QUI MONTE LA GRILLE, ET NON L'INVERSE.

        Ses proportions étaient écrites en dur ici. Le cadre n'est plus appelé
        directement : la barre de sommaire doit traverser la page ENTIÈRE — c'est la
        disposition de la référence — alors que les sections qu'elle désigne restent
        dans la colonne de droite. Les deux partagent l'état de section courante, qui
        vit dans `AssetTabs` ; c'est donc lui qui monte le cadre et lui passe sa barre.
        Voir l'en-tête de sa prop `rail`.

        LA COLONNE D'ACTUALITÉS A ÉTÉ RETIRÉE. Elle dépliait, sur un bouton, une
        troisième colonne portant les MÊMES articles que la section « Actualités » —
        présentés plus court, pour être parcourus EN REGARDANT le graphique et
        rattacher un décrochage à un événement daté. Cet argument valait tant que la
        section en question remplaçait le graphique ; il tombe avec le passage en page
        unique, où l'on descend de l'un à l'autre d'un simple défilement. `AssetNewsRail`
        reste dans le dépôt : c'est sa présence en doublon qui ne se justifiait plus.

        Le rail reste une arborescence SERVEUR, passée en nœud déjà rendu : un composant
        client ne peut pas la construire, il peut seulement la placer.
      */}
      <AssetTabs
        tabs={tabs}
        rail={
          /* Le rail passe EN PREMIER dans le document, et à gauche à l'écran. Sur
             téléphone, la grille s'effondre en une colonne et les chiffres arrivent
             donc avant le graphique — ce qui est le bon ordre : un graphique sans
             échelle lisible sur 375 pixels apprend moins que quatre nombres.

             IL NE PORTE PLUS L'IDENTITÉ : nom, cours, amplitude et actions sont remontés
             dans l'en-tête pleine largeur. La colonne ne garde que les CHIFFRES, ce qui
             est exactement la sidebar de la référence — et ce que ce rail aurait dû être
             depuis le début. */
          /* `space-y-6` et non 3 : les groupes n'ont plus de bordure, c'est donc le
             BLANC qui porte la frontière entre eux. Douze pixels suffisaient entre deux
             cartes qui se distinguaient déjà par leur bord ; entre deux listes nues, ils
             font une seule liste de vingt lignes. Voir `RailSection`. */
          <aside key="rail" className="space-y-6">

          {/*
            LA BARRE COLLANTE SE PLACE ICI, ET NULLE PART AILLEURS.

            Sa sentinelle est son PREMIER ENFANT : un `div` d'un pixel qu'un
            `IntersectionObserver` surveille, la barre s'affichant dès que ce point
            sort du champ. Sa position dans le flux N'EST DONC PAS un détail de mise
            en page — c'est elle qui définit le seuil de déclenchement.

            Posée sous la grille des deux colonnes, la sentinelle se retrouvait à mille
            cinq cents pixels du haut, donc hors champ DÈS LE CHARGEMENT : la barre
            s'affichait avant tout défilement, en double du cours qu'elle est censée
            remplacer. Constaté à l'écran après le passage au rail.

            Juste sous le bloc d'identité, elle retrouve son seuil exact : la barre
            prend le relais au moment précis où le cours quitte l'écran.
          */}
          <AssetStickyBar asset={data} assetClass={assetClass} isRate={isForex} />

          {/* La colonne empile ensuite QUATRE sources de nature différente : le
              registre de métriques, les jauges d'offre, le sondage communautaire et
              l'activité du dépôt. Chacune disparaît seule quand sa donnée manque, ce
              qui fait de cette colonne un accordéon : longue sur une grande
              cryptomonnaie, réduite à deux cartes sur une paire de devises. C'est le
              comportement voulu — une colonne de tirets serait pire qu'une colonne
              courte. */}
          {/* Le groupe « Offre » est CÉDÉ à `AssetSupply`, qui le rend en jauges. */}
          <AssetMetricRail asset={data} assetClass={assetClass} groups={RAIL_GROUPS} />

          {/* Repères propres à la bourse — frais et encours pour un fonds, ratios pour
              une action. Ils ne rejoignent pas le registre de métriques, qui décrit le
              contrat COMMUN aux six classes : y verser des champs qu'une seule
              renseigne en ferait l'union de tous les cas particuliers. */}
          {profile ? <AssetProfileRail profile={profile} /> : null}
          <AssetSupply asset={data} />

          {/*
            DEUX BLOCS SYMÉTRIQUES, UN PAR MONDE.

            `AssetSentiment` rend le sondage d'audience d'une cryptomonnaie ;
            `AssetAnalystView` rend le consensus d'analystes d'une action. Les deux
            répondent à « qu'en pensent les autres ? » avec la donnée que chaque marché
            publie réellement, et chacun se retire de lui-même quand la sienne manque —
            il n'y a donc aucune condition de classe à écrire ici.

            Le second ne coûte AUCUN appel supplémentaire : ses deux modules voyagent
            dans la même requête que les ratios déjà chargés au-dessus.
          */}
          <AssetSentiment asset={data} />
          <AssetAnalystView profile={profile} currency={data.currency} price={data.price} />

          <AssetCommunity asset={data} />

          {/*
            ── « PROJETS SIMILAIRES », AU PIED DES CHIFFRES ──────────────────────

            Comme chez la référence, et pour une raison qui n'est pas de style : un rang,
            une capitalisation, une variation ne veulent rien dire seuls — ils veulent
            dire quelque chose COMPARÉS. Les ranger derrière un onglet obligeait à
            quitter les chiffres pour aller chercher de quoi les juger.

            L'onglet « Écosystème » les garde en grille complète : quatre noms ici pour
            situer, la grille là-bas pour comparer.
          */}
          <AssetSimilarRail peers={comparables} />

          {/* Site officiel, explorateurs, portefeuilles et contrats ferment le rail,
              exactement comme le bloc « Info » de la référence. Ce sont des questions
              courtes, et ce rail est fait pour elles ; la liste de références est
              d'ailleurs étroite par nature — en bas de page, sur neuf cents pixels,
              chaque ligne traînait un vide entre son libellé et sa valeur.

              LES DEUX FICHES SONT EXCLUSIVES par construction : celle de gauche ne
              rend quelque chose que pour une cryptomonnaie (contrats, chaînes,
              explorateurs), celle de droite que pour une valeur boursière (place,
              secteur, siège, émetteur). Aucune fiche n'en affiche deux, et aucune n'en
              affiche zéro — ce qui était le cas des actions, des ETF et des indices
              jusqu'ici. */}
          <AssetTechSheet asset={data} />
          <AssetMarketSheet asset={data} assetClass={assetClass} profile={profile} />
          </aside>
        }
      />

      {/* ── Bandeau d'information ──────────────────────────────────────────────

          Le rappel « page d'information uniquement » DESCEND sous la grille.

          Il était placé juste sous l'en-tête, au motif qu'un lecteur venu d'un moteur
          de recherche se demande dans les deux premières secondes s'il peut acheter
          ici. L'intention reste juste ; le placement ne l'est plus. Entre l'en-tête et
          les onglets, il s'intercalait sur toute la largeur et repoussait le graphique
          d'une centaine de pixels supplémentaires — au moment précis où l'on vient de
          gagner de la hauteur en passant au rail.

          Teinté de marque plutôt que gris : la bande doit se distinguer des panneaux
          de données sans crier. `brand-soft` est le seul aplat du système qui porte
          une couleur sans porter d'alerte — un fond rouge ou orange ferait lire un
          avertissement là où il n'y a qu'un cadrage. À 55 % et non à plein : à pleine
          opacité, posé sur toute la largeur, il devenait le bloc le plus lumineux de
          l'écran, plus que le prix et plus que le graphique. */}
      <aside className="rounded-card border border-brand/25 bg-brand-soft/55 px-4 py-3">
        <h2 className="text-xs font-semibold text-ink">Information</h2>
        <p className="mt-1 max-w-4xl text-xs leading-relaxed text-ink-muted">
          {fr.asset.readOnly}
          {asset.source ? (
            <>
              {' '}
              Les chiffres de cette page proviennent de {asset.source.label} et sont
              rafraîchis périodiquement : ils décrivent l’état publié par la source, pas le
              carnet d’ordres à l’instant où vous lisez.
            </>
          ) : null}
        </p>
      </aside>

      {/* ── Hors onglets : identité de l'actif ───────────────────────────────
          Description et fiche technique restent SOUS les onglets, toujours
          visibles. Ce sont les seuls éléments de la page qui ne dépendent ni du
          marché ni de la période : les enfermer dans un onglet obligerait à
          chercher « qu'est-ce que c'est » après avoir trouvé « combien ça vaut ». */}
      {/* La grille de trois colonnes a disparu AVEC la fiche technique, qui en
          occupait la troisième et vit maintenant dans le rail de l'aperçu. Une
          grille dont une colonne sur trois est vide n'est plus une grille : c'est
          un texte artificiellement rétréci aux deux tiers de la page. */}
      <div className="space-y-8 border-t border-border-subtle pt-8">
        {/*
          ── « À PROPOS » NE MANQUE PLUS AUX VALEURS BOURSIÈRES ──────────────────

          Cette section ne s'affichait que si la source avait livré une `description`,
          champ que seule la source crypto renseigne. Résultat mesuré : la fiche du
          bitcoin portait trois paragraphes de présentation, celle d'Apple aucun — au
          moment précis où le lecteur venu d'un moteur de recherche se demande de quelle
          entreprise on parle.

          Or le résumé d'activité était DÉJÀ CHARGÉ, dans le profil qui alimente les
          ratios du rail. Il n'était simplement branché nulle part. Le repli le
          consomme, sans un appel de plus.

          ⚠️ Ce texte est en ANGLAIS chez la source, contrairement à la description
          crypto. On l'affiche tel quel plutôt que de le traduire à la volée : une
          traduction automatique d'un résumé d'activité réglementé introduirait des
          approximations que rien ne signalerait au lecteur (§5). La mention de langue
          sous le titre le dit.
        */}
        {about ? (
          <section className="space-y-3">
            <h2 className="display-sm text-ink">À propos {frenchOf(data.name)}</h2>
            {/* `whitespace-pre-line` : la source sépare ses paragraphes par des
                sauts de ligne, pas par du balisage. Sans cette règle, le texte
                arriverait en un seul pavé compact.

                La mesure reste bornée à `max-w-2xl` alors que le conteneur, lui,
                s'est élargi : une ligne de texte courant cesse d'être lisible
                au-delà d'environ quatre-vingts caractères, et ce n'est pas parce
                que la place existe qu'il faut la remplir. */}
            <p className="max-w-2xl whitespace-pre-line text-base leading-relaxed text-ink-muted">
              {about.text}
            </p>

            {/* L'attribution, systématique — voir le calcul de `about` plus haut. */}
            {about.credit === 'source-en' ? (
              <p className="text-micro text-ink-muted opacity-80">
                Résumé d’activité publié en anglais par {asset.source?.label ?? 'la source'},
                repris sans traduction.
              </p>
            ) : null}

            {about.credit === 'zenkuu' ? (
              <p className="text-micro text-ink-muted opacity-80">
                Présentation rédigée par ZENKUU : aucune source de cotation ne publie de
                notice pour cet instrument. Elle ne décrit que sa construction, jamais son
                niveau — le cours et les variations viennent, eux, de la source.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Identité d'une valeur boursière — secteur, pays, place. Absente pour
            une cryptomonnaie, qui a sa fiche technique dans le rail de l'aperçu. */}
        <AssetIdentity asset={data} assetClass={assetClass} />

        {/*
          LA FAQ FERME LA PAGE, comme chez la référence.

          Elle était le troisième d'une rangée de sous-onglets posée au-dessus de la
          barre d'outils du graphique — donc atteignable seulement en abandonnant la
          courbe, alors qu'elle répond à des questions qu'on se pose APRÈS l'avoir
          regardée.

          Ici, elle est aussi lue par les moteurs de recherche sans qu'un état React
          ait à être hydraté, ce qui n'est pas un détail : le §9 fait du référencement
          organique le premier moteur d'acquisition, et « combien vaut X » est
          exactement le genre de requête à laquelle ces réponses correspondent.
        */}
        <AssetFaq asset={data} />
      </div>

      {trending?.ok ? (
        <AssetTrendingRail assets={trending.data} currentId={data.id} />
      ) : null}
    </div>
  )
}

/**
 * Agrège les volumes des places de cotation selon une clé.
 *
 * Sert les deux anneaux : par place, et par devise de cotation.
 *
 * Les lignes sans volume publié sont ÉCARTÉES et non comptées pour zéro. Une place
 * dont la source ignore le volume n'a pas un volume nul — elle a un volume inconnu,
 * et l'inclure à zéro fausserait toutes les parts des autres (§5).
 *
 * ⚠️ Le filtrage par SCORE DE CONFIANCE n'a pas lieu ici mais chez l'appelant, et
 * c'est délibéré : cette fonction agrège ce qu'on lui donne, et le choix de ce qu'on
 * lui donne est une décision de méthodologie qui doit se lire à l'endroit où elle se
 * prend — avec le compte des lignes retirées, que l'interface affiche.
 */
function shareBy(tickers: AssetTicker[], key: (ticker: AssetTicker) => string): SharePart[] {
  const totals = new Map<string, number>()

  for (const ticker of tickers) {
    if (ticker.volume24h === undefined || !Number.isFinite(ticker.volume24h)) continue
    const label = key(ticker)
    if (!label) continue
    totals.set(label, (totals.get(label) ?? 0) + ticker.volume24h)
  }

  return [...totals].map(([label, value]) => ({ label, value }))
}

/**
 * Élision de « de » devant un nom d'actif.
 *
 * Les noms viennent de la source et couvrent des milliers d'actifs : « À propos de
 * Aave » se lit comme une chaîne assemblée par une machine, ce qui est précisément
 * l'impression à éviter. La règle porte sur le SON initial, d'où le « h » traité
 * comme une voyelle — « d'Hedera » et non « de Hedera ».
 */
function frenchOf(name: string): string {
  return /^[aeiouyàâéèêëîïôöûüh]/i.test(name) ? `d’${name}` : `de ${name}`
}

/*
 * `HeaderChips` A ÉTÉ SUPPRIMÉ AVEC L'EN-TÊTE PLEINE LARGEUR QU'IL SERVAIT.
 *
 * Il rendait la ligne de méta sous le nom — rang, place de cotation, jusqu'à trois
 * catégories — sur une largeur de neuf cents pixels. `AssetRailIdentity` reprend la
 * même information dans une colonne de 288 : le rang devient une pastille collée au
 * symbole, et les catégories tombent à deux, trois passant à la ligne et repoussant
 * le cours d'un cran.
 *
 * Ce qui est conservé de la règle d'origine : les pastilles ne sont toujours PAS
 * cliquables. La source publie des libellés (« Layer 1 (L1) »), pas les identifiants
 * qu'attend `/categories/[id]` — fabriquer un lien reviendrait à deviner l'URL depuis
 * le texte affiché, et un lien sur cinq tomberait sur une page inexistante.
 */

async function Breadcrumb({ assetClass, name }: { assetClass: AssetClass; name: string }) {
  const fr = await getContent()
  return (
    <nav aria-label="Fil d’Ariane" className="text-xs text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-brand-strong">
            {fr.nav.home}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href={marketHref(assetClass)} className="hover:text-brand-strong">
            {fr.assetClass[assetClass]}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="font-medium text-ink" aria-current="page">
          {name}
        </li>
      </ol>
    </nav>
  )
}
