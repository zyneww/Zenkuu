import { Activity, LayoutGrid, Shapes, Store } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import {
  Breadcrumb as UiBreadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { notFound } from 'next/navigation'

import type { AssetClass } from '@zenkuu/data'
import {
  getAsset,
  getAssetHistory,
  getAssetProfile,
  getAssetTickers,
  getExchangeRates,
  getAssetNews,
  getNews,
  NEWS_POOL,
  getPeers,
  getSpotExchanges,
  getTrendingCryptoAssets,
  findUniverseEntryBySymbol,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { LiveBinancePrice } from '@/components/asset/LiveBinancePrice'
import { AssetMetricRail } from '@/components/asset/AssetMetricRail'
import { AssetChangeGrid } from '@/components/asset/AssetChangeGrid'
import { AssetCommunity } from '@/components/asset/AssetCommunity'
import { AssetFaq } from '@/components/asset/AssetFaq'
import { AssetNewsAside } from '@/components/asset/AssetNewsAside'
import { AssetNewsRail } from '@/components/asset/AssetNewsRail'
import { AssetHoldings, AssetProfileRail } from '@/components/asset/AssetHoldings'
import { AssetOwnership } from '@/components/asset/AssetOwnership'
import { AssetPeerGrid } from '@/components/asset/AssetPeerGrid'
import { AssetSectors } from '@/components/asset/AssetSectors'
import { AssetAnalystView } from '@/components/asset/AssetAnalystView'
import { AssetMarketSheet } from '@/components/asset/AssetMarketSheet'
import { AssetHeadline, AssetPriceCard } from '@/components/asset/AssetPageHeader'
import { AssetSentiment } from '@/components/asset/AssetSentiment'
import { AssetLiveRefresh } from '@/components/asset/AssetLiveRefresh'
import { AssetStickyBar } from '@/components/asset/AssetStickyBar'
import { AssetSupply } from '@/components/asset/AssetSupply'
import { AssetSections, type AssetTab } from '@/components/asset/AssetSections'
import { AssetIdentity } from '@/components/asset/AssetIdentity'
import { AssetContractTable } from '@/components/asset/AssetContractTable'
import { AssetTickers } from '@/components/asset/AssetTickers'
import { AssetTokenizedStocks } from '@/components/asset/AssetTokenizedStocks'
import { AssetTreasuries } from '@/components/asset/AssetTreasuries'
import { AssetTradingVenue } from '@/components/asset/AssetTradingVenue'
import { AssetWorkspace } from '@/components/asset/AssetWorkspace'
import { tradingViewSymbol } from '@/components/asset/tradingview-symbol'
import { AssetTabFiller } from '@/components/asset/AssetTabFiller'
import { AssetJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { WatchlistStar } from '@/components/watchlist/WatchlistStar'
import { getContent } from '@/lib/content'
import { mentioning } from '@/lib/mentions'
import { assetHref, marketHref } from '@/lib/asset-routes'
import type { MetricGroup } from '@/lib/asset-metrics'
import { getWatchlistState } from '@/lib/watchlist-actions'
import { getLocale } from 'next-intl/server'

import { getPhrase } from '@/lib/content'

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
 * Classes pour lesquelles `AssetTradingVenue` rend quelque chose.
 *
 * ⚠️ DOUBLON ASSUMÉ de sa table `HEADINGS`, et il n'y a pas d'alternative : un parent
 * ne peut pas savoir si son enfant a rendu. La copie sert UNIQUEMENT à décider si
 * l'onglet « Places » se retrouverait vide — voir son repli. La divergence est bornée :
 * elle ferait apparaître un repli en trop, jamais un onglet vide.
 */
const VENUE_CLASSES: readonly AssetClass[] = ['stock', 'etf', 'index', 'commodity']

/**
 * Références proposées en tête de liste de comparaison.
 *
 * Ces deux-là et pas d'autres : sur le marché crypto, « fait-il mieux que le
 * bitcoin ? » est la question que tout le monde pose en premier, et l'ether est le
 * seul second point de repère universellement compris. Une liste plus longue
 * transformerait un raccourci en travail de sélection.
 */
const BENCHMARK_OPTIONS = [
  { id: 'bitcoin', label: 'Bitcoin', symbol: 'BTC' },
  { id: 'ethereum', label: 'Ethereum', symbol: 'ETH' },
]

export interface AssetPageViewProps {
  assetClass: AssetClass
  id: string
  searchParams: Record<string, string | string[] | undefined>
}

export async function AssetPageView({ assetClass, id }: AssetPageViewProps) {
  const t = await getPhrase()
  /* Sert au seul titre « À propos de … », dont l'élision est une règle française —
     voir la note à son endroit de rendu. */
  const locale = await getLocale()
  const fr = await getContent()
  const [
    asset,
    history,
    peers,
    rates,
    tickers,
    news,
    trending,
    exchanges,
    profileResult,
  ] = await Promise.all([
    getAsset(id, assetClass, 'eur'),
    getAssetHistory(id, assetClass, SERVER_RANGE_DAYS, 'eur'),
    // `getPeers` dérive de l'aperçu déjà mis en cache par l'accueil : les
    // comparables ne coûtent aucun appel réseau supplémentaire — ce qui compte,
    // puisque le palier gratuit de CoinGecko ne tolère qu'une poignée de requêtes
    // par minute (mesuré).
    /*
     * ⚠️ 24 ET NON 6, ET CE N'EST PAS UN CONFORT : LE PANNEAU « COMPARER » ÉTAIT MUET.
     *
     * `ChartToolbar` réserve à sa liste une hauteur FIXE de six rangées, avec un
     * ascenseur censé dire qu'il en reste. Avec six comparables — dont Bitcoin et
     * Ethereum, déjà comptés dans les six — la liste faisait exactement la hauteur du
     * cadre : aucun ascenseur, aucun défilement, et le lecteur voyait un panneau qui
     * paraissait tronqué sans qu'on puisse en sortir. Relevé au navigateur sur
     * `/crypto/hyperliquid` : `scrollHeight` et `clientHeight` tous deux à 192.
     *
     * LA BORNE NE PROTÉGEAIT DE RIEN. `getPeers` découpe dans un tableau DÉJÀ EN
     * MÉMOIRE — les cent premières capitalisations pour la crypto, le classement de
     * vingt lignes pour les autres classes — et ne déclenche aucun appel réseau. Passer
     * de six à vingt-quatre ne coûte donc que la sérialisation de dix-huit lignes vers
     * le client.
     *
     * Les affichages qui veulent SIX vignettes les redécoupent à leur point d'appel
     * (`AssetPeerGrid`, `AssetSimilarRail`) : c'est une contrainte de grille, pas une
     * contrainte de donnée, et elle n'a rien à faire dans la requête.
     */
    getPeers(assetClass, id, 24),
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
    /*
     * LE RÉSERVOIR ENTIER, et le chiffre n'est pas choisi au jugé.
     *
     * La fiche ne cherche pas « les dernières actualités » : elle cherche les articles
     * qui NOMMENT cet actif. Ce sont deux besoins opposés — le premier veut les plus
     * récents, le second veut la plus grande profondeur possible, parce qu'un actif
     * hors des dix premières capitalisations n'est nommé qu'une fois toutes les
     * centaines d'articles.
     *
     * 40, puis 200, puis le réservoir complet. Mesuré sur la fiche du SPDR S&P 500 :
     * à 200, un seul article remontait ; le tour à tour de `fetchNews` n'avait alors
     * gardé que quatre ou cinq articles par source sur quarante-deux flux.
     *
     * DEMANDER PLUS NE COÛTE RIEN AU RÉSEAU, et c'est ce qui rend l'arbitrage évident :
     * `getNews` met en cache un réservoir UNIQUE, constitué en interrogeant tous les
     * flux quelle que soit la limite. Celle-ci ne fait que trancher à la sortie du
     * cache — voir l'en-tête de `NEWS_POOL`.
     */
    getNews(NEWS_POOL),
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
          <Link href={marketHref(assetClass)} className="text-sm font-medium text-ink underline">
            {fr.asset.backToRanking}
          </Link>
        }
      />
    )
  }

  const data = asset.data
  const isForex = assetClass === 'forex'

  const comparables = peers.ok ? peers.data : []

  /*
   * ⚠️ DEUX CLASSEMENTS DE PLUS ONT ÉTÉ RETIRÉS DU RENDU DE CHAQUE FICHE.
   *
   * Matières premières et actions étaient demandés ici pour alimenter la table « face à
   * la finance traditionnelle » de l'onglet Analyse. Cette table a été remplacée (voir
   * `analysis`), et les deux appels ne servaient plus rien : ils continuaient pourtant
   * de s'exécuter à CHAQUE rendu de fiche, sur un quota mesuré à huit requêtes par
   * minute — dont ils prenaient deux, y compris sur les fiches crypto que ces
   * classements ne concernent en rien.
   *
   * Le cache les rendait souvent gratuits, jamais toujours : sur cache froid, ils
   * s'ajoutaient au chemin critique de la page.
   */
  const tickerRows = tickers.ok ? tickers.data : []

  /* Ce que l'onglet « Places » peut rendre, testé ICI parce qu'un parent ne peut pas
     savoir si son enfant a rendu quelque chose. Les deux valeurs recopient le contrat
     des composants concernés — voir la note du repli, plus bas. */
  const contractCount = Object.entries(data.contracts ?? {}).filter(
    ([chain, address]) => chain && address,
  ).length

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
  /*
   * ⚠️ LE FILTRAGE PAR CONFIANCE A DISPARU AVEC LES ANNEAUX DE VOLUME, ET C'EST JUSTE.
   *
   * `byExchange`, `byPair`, `trustNote`, `untrusted` et `trustedTickers` ne servaient
   * qu'eux. Le long commentaire ci-dessus explique pourquoi une PART calculée sur des
   * volumes jugés non fiables est trompeuse — un pourcentage à deux chiffres tiré
   * d'échanges que personne ne considère réels — et l'argument reste entièrement vrai
   * pour un anneau.
   *
   * Il ne l'est PAS pour la table qui l'a remplacé. Un anneau agrège : la ligne
   * douteuse disparaît dans un total, et rien ne signale qu'elle l'a faussé. Une table
   * énumère, et celle-ci porte une PASTILLE DE CONFIANCE sur chaque ligne — la note de
   * la source, reprise telle quelle. Le lecteur voit donc la place, son volume annoncé,
   * et le jugement porté dessus, ce qui est strictement plus d'information que de la
   * retirer en silence.
   *
   * Autrement dit : on écarte d'un CALCUL, jamais d'une LISTE. Voir `AssetTickers`,
   * qui rend la pastille.
   */

  // 18rem et non 16 : les groupes du rail sont devenus des panneaux, et un panneau
  // prélève 32px de marge interne sur la largeur utile. À 16rem, il ne restait que
  // 224px pour un libellé, une valeur et parfois un écart — d'où les « Plus haut
  // hi… » tronqués. La colonne s'élargit de la largeur exactement perdue, plus une
  // marge.
  const overview = (
    <div className="space-y-5">
        {/* ══════════════════════════════════════════════════════════════════
            LA CARTE DE COURS OUVRE LA COLONNE, JUSTE AU-DESSUS DE LA COURBE

            Le cours vivait dans l'en-tête, en haut à DROITE de la page — à huit
            cents pixels de la courbe qu'il chiffre, sur un grand écran. La
            référence (dropstab.com) le pose ici, dans un encadré collé au
            graphique : on lit le nombre et la forme d'un même regard, sans
            traverser la page.

            C'est aussi ce qui rend l'amplitude 24 h lisible : la barre Bas/Haut
            désigne les mêmes bornes que les extrêmes de la courbe, et les deux se
            répondent quand elles se touchent.
            ══════════════════════════════════════════════════════════════════ */}
        <AssetPriceCard
          asset={data}
          assetClass={assetClass}
          price={
            <>
              {/* Binance en complément côté client — voir l'en-tête de
                  `LiveBinancePrice` : ce n'est PAS une seconde source de vérité, juste
                  un cours qui tique sans jamais toucher notre quota CoinGecko. Réservé
                  au marché crypto (§5 — Binance ne cote ni forex, ni actions, ni ETF). */}
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
        />

        <section className="space-y-3">
          <AssetWorkspace
            asset={data}
            assetClass={assetClass}
            /* La traduction TradingView se fait ICI parce qu'elle a besoin des PLACES
               de cotation, qui ne traversent pas jusqu'au widget. Une seule décision
               pour deux usages — l'interrupteur de la barre et le cadre lui-même. Voir
               `tradingview-symbol.ts` pour ce que ce changement corrige. */
            tradingViewSymbol={tradingViewSymbol(assetClass, data.symbol, tickerRows)}
            initialHistory={history.ok ? history.data : null}
            initialDays={SERVER_RANGE_DAYS}
            rates={rates.ok ? rates.data : null}
            /*
             * Comparables de la source, plus les deux références du marché.
             *
             * Réservé à la crypto : la route de comparaison interroge l'historique
             * crypto, et surtout rapporter une action au bitcoin ne dirait rien d'utile.
             *
             * ── LA LISTE N'EST PLUS BORNÉE À QUATRE ─────────────────────────
             *
             * Elle l'était au motif qu'« au-delà, la liste déroulante devient un
             * annuaire ». C'était vrai d'un MENU, qu'on parcourt à l'œil. Le panneau de
             * comparaison a un champ de recherche et fait défiler sa liste : la borne
             * ne protégeait plus de rien et privait au contraire d'une vingtaine de
             * comparables déjà chargés, sans un appel de plus.
             *
             * Le symbole et la vignette accompagnent chaque entrée — le panneau les
             * affiche, et la recherche cherche AUSSI dans le symbole : on tape « sol »
             * plus volontiers que « Solana ».
             */
            /*
             * ⚠️ LA COMPARAISON N'EST PLUS RÉSERVÉE À LA CRYPTO.
             *
             * Ce champ valait `[]` pour cinq classes d'actifs sur six, ce qui retirait
             * le bouton « Comparer » de leur barre — relevé au navigateur sur
             * `/actions/nvda`, dont la barre n'avait plus AUCUNE commande à gauche.
             *
             * Rien ne justifiait la borne : `comparables` est peuplé pour toutes les
             * classes (c'est lui qui alimente « Projets similaires », visible sur la
             * même page), et les courbes sont indexées en base 100 avant superposition
             * — une action et un ETF se comparent donc exactement comme deux jetons.
             *
             * Les deux REPÈRES restent propres à la crypto : « fait-il mieux que le
             * bitcoin ? » est la question de ce marché-là. Les proposer sur une action
             * mettrait en tête de liste deux actifs sans rapport avec elle.
             */
            compareOptions={[
              /*
                ⚠️ LES DEUX REPÈRES EMPRUNTENT LEUR VIGNETTE AUX COMPARABLES.

                `BENCHMARK_OPTIONS` ne porte qu'un identifiant, un nom et un symbole :
                la liste est écrite au dépôt, et y coder une URL d'image reviendrait à
                figer une adresse de CDN que la source peut changer. Résultat visible
                au navigateur : Bitcoin et Ethereum s'affichaient en pastille grise au
                milieu d'une liste de logos.

                `comparables` vient du classement et porte les vraies vignettes. Quand
                le repère s'y trouve — c'est le cas dès que l'actif consulté partage une
                catégorie avec lui, donc souvent — on lui prend son image. Sinon la
                pastille de repli reste, et elle est le comportement correct : mieux
                vaut un disque neutre qu'une URL devinée.
              */
              ...(assetClass === 'crypto'
                ? BENCHMARK_OPTIONS.filter((entry) => entry.id !== data.id).map((entry) => {
                    const known = comparables.find((peer) => peer.id === entry.id)
                    return known?.image ? { ...entry, image: known.image } : entry
                  })
                : []),
              ...comparables
                .filter(
                  (peer) =>
                    peer.id !== data.id &&
                    !BENCHMARK_OPTIONS.some((entry) => entry.id === peer.id),
                )
                .map((peer) => ({
                  id: peer.id,
                  label: peer.name,
                  ...(peer.symbol ? { symbol: peer.symbol } : {}),
                  ...(peer.image ? { image: peer.image } : {}),
                })),
            ]}
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
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
              label={history.source.label}
              href={history.source.attributionUrl}
              updatedAt={data.lastUpdated}
            />
          ) : null}
        </section>

        {/*
          ══════════════════════════════════════════════════════════════════════
          LA QUEUE DU RAIL, EN GRILLE DE DEUX COLONNES
          ══════════════════════════════════════════════════════════════════════

          Ces quatre blocs vivaient dans le rail de gauche, empilés sur 288 pixels de
          large. Chacun y était à l'étroit pour une raison différente : le sondage de
          sentiment est une barre à deux parts, le consensus d'analystes une grille de
          notes, la communauté une rangée de liens, les projets similaires quatre lignes
          à logo.

          QUATRE et non six : les deux fiches sont restées au rail, où leur forme en
          couples « libellé → valeur » tient mieux. C'est aussi ce qui rend ce compte
          PAIR, donc la grille pleine — à six, la dernière rangée laissait une moitié
          vide.

          Ils prennent la largeur laissée par les anneaux de volume, en deux colonnes.
          Chacun se retire toujours de lui-même quand sa donnée manque — une paire de
          devises n'a ni sondage, ni communauté, ni contrat — et la grille se referme
          alors sur ce qui reste, sans trou.
        */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0">
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
            ⚠️ « PROJETS SIMILAIRES » A ÉTÉ RETIRÉ D'ICI (demande explicite).

            La liste des pairs reste servie par `comparables`, qui alimente toujours le
            panneau « Comparer » de la barre du graphique et la grille de l'onglet
            « Écosystème ». Ce n'est donc pas la donnée qui part, mais le bloc qui la
            répétait au pied des chiffres.
          */}

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
        </div>

        {/*
          ══════════════════════════════════════════════════════════════════════
          LES DEUX ANNEAUX DE VOLUME SONT PARTIS, ET LA PLACE EST RENDUE AU RAIL
          ══════════════════════════════════════════════════════════════════════

          « Volume par place de cotation » et « Volume par devise de cotation » tenaient
          ici deux colonnes pleine largeur. Ils disaient une chose vraie et étroite —
          comment le volume du jour se répartit — pour un encombrement que rien ne
          justifiait au milieu de l'aperçu : deux camemberts de trois cents pixels de
          haut entre le graphique et le bas de page.

          Ce que cela retire est nommé : la répartition du volume n'est plus dessinée
          sur l'aperçu. Elle n'est pas perdue pour autant, l'onglet « Places » porte la
          table complète des places avec la part de volume de chacune — c'est la MÊME
          information, chiffrée plutôt qu'en anneau, et à l'endroit où on la cherche.

          La hauteur libérée revient au RAIL de gauche : sa moitié basse (du sondage de
          sentiment à la fiche technique) s'y installe en grille, plutôt que de
          poursuivre une colonne de 288 pixels sur deux écrans de haut. Voir plus bas.
        */}
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
      {/*
        ⚠️ LE CARNET D'ORDRES A ÉTÉ RETIRÉ, ET AVEC LUI LE FLUX DES TRANSACTIONS.

        Il ouvrait cette section : les offres et demandes Binance à gauche, les dernières
        transactions à droite. Retiré sur demande. Ce que cela retire vraiment, dit
        clairement : la fiche ne montre plus l'instant d'une place unique — elle décrit
        l'actif sur la durée, ce que fait déjà la table ci-dessous. Ce qu'elle y gagne :
        le carnet tenait seul un sondage permanent vers Binance derrière un contenu situé
        à plusieurs écrans de défilement, et une section atteinte n'est jamais relâchée
        (voir `AssetTabs`) — il sondait donc jusqu'à la fermeture de l'onglet.
      */}

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

      {/*
        ══════════════════════════════════════════════════════════════════════════
        ⚠️ LA TABLE DES PLACES A DÉMÉNAGÉ DANS L'ONGLET « ANALYSE »
        ══════════════════════════════════════════════════════════════════════════

        Elle occupait le cœur de cet onglet. Elle ouvre désormais « Analyse », où elle
        forme la première des trois tables de la référence — Marchés, Jetons,
        Trésoreries — qui se lisent ensemble.

        Ce qui reste ici répond toujours à « où cet actif existe-t-il » : la place de
        cotation officielle pour une valeur boursière, et les CONTRATS par chaîne pour un
        jeton. Ce sont deux faits d'identité, pas des cours ; ils n'ont rien à faire au
        milieu d'une analyse de liquidité.

        Ce que cela coûte, et il faut le dire : l'onglet est plus court qu'avant, et sur
        une cryptomonnaie sans contrat publié il ne porte plus rien — d'où le bouche-trou
        ci-dessous, qui couvrait déjà ce cas.
      */}

      {/* Sur quelles CHAÎNES ce jeton existe, et à quelle adresse. Se retire d'elle-même
          sous deux contrats — voir son en-tête, où le seuil est motivé. */}
      <AssetContractTable asset={data} />

      {/*
        ⚠️ CETTE CONDITION TESTE CE QUI EST RÉELLEMENT RENDU, ET C'EST TOUT L'ENJEU.

        Elle portait sur `tickerRows.length`, ce qui n'a plus de sens depuis que la
        table des places a rejoint « Analyse » : sur une cryptomonnaie à soixante-dix
        places et UN SEUL contrat — Hyperliquid, mesuré au navigateur — les deux
        composants ci-dessus se retiraient d'eux-mêmes, le test passait à faux, et
        l'onglet rendait une section de HAUTEUR NULLE. Un onglet cliquable qui ne mène
        à rien est pire qu'un onglet absent.

        Les deux conditions sont donc recopiées depuis les composants qu'elles décrivent
        — la classe pour la place de cotation, le seuil de deux chaînes pour la table de
        contrats. C'est un doublon assumé : un parent ne peut pas savoir si son enfant a
        rendu quelque chose, et le seul moyen de l'éviter serait de faire remonter les
        deux tests, ce qui déplacerait la logique sans la supprimer.
      */}
      {!VENUE_CLASSES.includes(assetClass) && contractCount < 2 ? (
        tickerRows.length > 0 ? /* ⚠️ LE RENVOI « N PLACES COTENT … » A ÉTÉ RETIRÉ (demande explicite).
             Il annonçait que la table des places vit dans « Analyse ». La barre de
             sommaire porte déjà ce renvoi, et la table est à un onglet de là. */
        null : (
          <>
            <EmptyState
              title={t('Aucune place de cotation publiée')}
              description={t('La source ne renseigne pas les places qui cotent cet actif.')}
              compact
            />
            <AssetTabFiller asset={data} />
          </>
        )
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
            className="shrink-0 text-xs font-medium text-ink hover:underline"
          >
            {fr.home.seeAll}
          </Link>
        </div>

        {comparables.length > 0 ? (
          <AssetPeerGrid peers={comparables.slice(0, 6)} />
        ) : (
          <EmptyState title={fr.states.unavailableTitle} compact />
        )}
      </section>

      {/*
        ⚠️ « TENDANCES DU MOMENT » A QUITTÉ CET ONGLET POUR LE PIED DE PAGE.

        Elle s'y trouvait comme SECONDE rangée, sous les comparables : ceux-ci disent
        « qui d'autre occupe ce terrain », elle disait « que regarde-t-on en ce moment ».
        Deux lectures voisines, et c'est justement ce qui la rendait déplacée ici —
        l'onglet décrit l'ÉCOSYSTÈME DE CET ACTIF, et elle est le seul bloc de la fiche
        qui ne parle pas de lui.

        Elle vit désormais après « À propos » et la FAQ, à la place qui lui revient :
        celle du « et ensuite ? ». Voir la fin de ce composant.
      */}
      {/*
        ⚠️ LES POOLS DE LIQUIDITÉ ONT ÉTÉ RETIRÉS.

        Ils listaient les réserves on-chain du jeton — paire, prix, réserve, volume,
        acheteurs/vendeurs — chargées à l'approche de la section. Retirés sur demande.

        Ce que cela retire : la seule vue on-chain de la fiche. Ce qui la remplace : rien
        ici. La table des places de cotation, deux sections plus haut, répond déjà à
        « où cet actif change-t-il de mains », et `/marches/pool` garde la vue complète
        pour qui la cherche. La section perd aussi son appel réseau propre.
      */}

      {/*
        ── QUI DÉTIENT L'ACTIF ─────────────────────────────────────────────────

        DEUX RÉPONSES, ET UNE SEULE S'AFFICHE.

        Cette section a longtemps annoncé qu'elle était vide : « Détentions
        institutionnelles — non publiées par nos sources ». C'était une position
        assumée, et elle reste exacte POUR LA CRYPTO — ni CoinGecko sur son palier
        gratuit, ni Binance ne publient les trésoreries d'entreprise exposées à un
        jeton, et les déduire de la répartition de l'offre reviendrait à publier une
        estimation maison sous couvert de fait (§5).

        Elle était en revanche fausse pour la bourse. La donnée y est réglementaire,
        déclarée trimestriellement, et elle voyage dans la MÊME requête que les ratios
        déjà chargés : nous ne l'avions simplement jamais demandée. `AssetOwnership`
        la rend, et l'aveu d'ignorance ne subsiste que là où il dit vrai.

        ── L'AVEU D'IGNORANCE A ÉTÉ RETIRÉ ──────────────────────────────────

        Il occupait un titre de section et un encadré de cent pixels sur TOUTES les
        fiches crypto, pour dire qu'il n'y avait rien à dire. Un lecteur y voyait une
        section vide, jamais une position éditoriale. Quand la donnée manque, la
        section n'existe pas — c'est la règle du reste de la page (`AssetHoldings`,
        `AssetPools`, `AssetOwnership` se retirent tous de la même façon).
      */}
      {profile?.ownership ? <AssetOwnership profile={profile} assetName={data.name} /> : null}

      {/* Le bouche-trou ne subsiste que si la grille des comparables est vide elle
          aussi — c'est-à-dire quand l'onglet entier n'aurait rien à montrer. */}
      {comparables.length === 0 ? <AssetTabFiller asset={data} /> : null}
    </div>
  )

  /*
   * ── ACTUALITÉS : UNE COLONNE, PLUS UNE SECTION ────────────────────────────
   *
   * Le fil a occupé successivement trois places : le rail de l'aperçu (tronqué à six
   * entrées), un onglet plein écran, puis une section pleine largeur. Il revient à ce
   * qu'il aurait dû être — une colonne à droite, lisible EN MÊME TEMPS que le
   * graphique.
   *
   * C'est la seule position qui serve l'usage réel : on consulte une chronologie pour
   * rattacher un décrochage de la courbe à un événement daté. Toute présentation qui
   * oblige à quitter la courbe des yeux annule ce geste, et c'est ce que faisaient les
   * trois précédentes.
   *
   * Ce sont NOS propres flux, déjà chargés pour la page : la colonne ne coûte aucun
   * appel supplémentaire. La sélection passe par `mentioning`, la règle partagée avec
   * `/actualites` — deux listes censées être identiques ne peuvent pas se permettre
   * deux implémentations.
   */
  /*
   * ── DEUX FILS, FUSIONNÉS — ET L'ORDRE DE FUSION PORTE UN ARBITRAGE ────────
   *
   * Le fil de Yahoo est DEMANDÉ pour cet actif : c'est la source qui a fait
   * l'appariement, et elle connaît les relations qu'aucun titre ne révèle — qu'un
   * article sur le S&P 500 concerne le fonds qui le réplique, par exemple. Il passe
   * donc en premier.
   *
   * Le fil agrégé apporte ce que Yahoo n'a pas : le français, la presse crypto
   * spécialisée, les sources européennes. Il complète, il ne double pas.
   *
   * ── LA DÉDUPLICATION SE FAIT SUR L'URL, PAS SUR L'IDENTIFIANT ─────────────
   *
   * Les identifiants portent le flux d'origine (`yahoo-spy:…` contre `investing:…`),
   * si bien que le MÊME article repris par deux agrégateurs en porte deux. L'adresse,
   * elle, désigne l'article. Sans cela, la colonne afficherait deux fois le même
   * titre à quelques lignes d'écart — ce qui se lit comme un défaut, pas comme deux
   * sources.
   *
   * Le tri chronologique est fait plus bas, par `AssetNewsRail` : le faire ici aussi
   * serait un doublon, et le rail en a besoin de toute façon pour couper par journée.
   */
  /*
   * ── CET APPEL EST SÉQUENTIEL, ET IL DOIT L'ÊTRE ───────────────────────────
   *
   * Tout le reste de la fiche part en parallèle plus haut. Celui-ci ne le peut pas :
   * il lui faut le SYMBOLE de l'actif, que seule la réponse de `getAsset` porte.
   *
   * Pour la crypto, Yahoo cote `HYPE-USD` et non `hyperliquid-USD` — l'identifiant
   * CoinGecko, qui est ce que l'URL transporte, ne lui dit rien. Pour les autres
   * classes, notre univers accepte les deux formes ; on lui passe donc le symbole
   * dans tous les cas plutôt que d'écrire deux chemins.
   *
   * Le coût est UNE requête RSS, mise en cache trois minutes et partagée par tous les
   * visiteurs de la fiche. C'est le prix d'un fil qui passe de deux articles à une
   * vingtaine sur les classes qui n'en avaient pas — voir `fetchSymbolNews`.
   */
  const symbolNews = await getAssetNews(assetClass, data.symbol)

  const mentioned = news.ok
    ? mentioning(news.data, {
        name: data.name,
        ...(data.symbol ? { symbol: data.symbol } : {}),
      })
    : []

  const seenUrls = new Set<string>()
  const assetNews = [...(symbolNews.ok ? symbolNews.data : []), ...mentioned]
    .filter((item) => {
      if (seenUrls.has(item.url)) return false
      seenUrls.add(item.url)
      return true
    })
    .slice(0, 40)

  const newsAside = (
    <AssetNewsAside count={assetNews.length}>
      <AssetNewsRail news={assetNews} name={data.name} />
    </AssetNewsAside>
  )

  /*
   * ⚠️ `historySection` A ÉTÉ SUPPRIMÉ AVEC LE CONTENU DE L'ONGLET ANALYSE.
   *
   * Il rendait la série jour par jour en table paginée, flanquée du convertisseur et
   * des cours par devise. Le convertisseur a survécu — il vit maintenant dans la
   * colonne de droite du nouvel onglet ; les deux autres sont partis. Voir la note du
   * bloc `analysis`, qui nomme chaque retrait et son motif.
   */

  // Icônes à 14px et trait de 1,5 : à 16px avec un trait de 2, un pictogramme posé
  // à côté d'un libellé de 14px paraît plus gras que le mot qu'il accompagne.
  /*
   * L'onglet Analyse est rendu SANS ses données : `AssetAnalysis` est un composant
   * client qui charge une année d'historique et de bougies à sa première apparition
   * à l'écran. Le faire côté serveur coûterait deux appels externes de plus à CHAQUE
   * rendu de fiche, pour un onglet que la plupart des visiteurs n'ouvriront jamais.
   */
  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * ANALYSE — L'ONGLET A ÉTÉ ENTIÈREMENT REMPLACÉ
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * ── CE QUI EN SORT, ET POURQUOI CHACUN SORT ─────────────────────────────────
   *
   *   `AssetYearPerformance`  — six pastilles de variation sur un an, plus les deux
   *     extrêmes de la période. Redisait le rail de gauche, qui porte déjà les six
   *     mêmes fenêtres, et la carte d'historique qui arrive porte les deux extrêmes.
   *
   *   `AssetFundamentals`     — marges, dette, calendrier de publication d'une société
   *     cotée. Vraie donnée, mais elle décrit l'ENTREPRISE quand cet onglet compare
   *     des TAILLES et des PERFORMANCES. Elle n'a pas d'équivalent chez la référence.
   *
   *   `AssetAnalysis`         — synthèse « technique » à trois cadrans, gradués de
   *     « vente forte » à « achat fort ». C'était le seul endroit du site qui émettait
   *     une RECOMMANDATION, ce que le §5 interdit — et son départ règle une
   *     contradiction qui traînait entre ce bloc et le reste de la fiche.
   *
   *   `PriceHistoryTable`     — la série jour par jour, en table paginée. C'est une
   *     pièce justificative, pas une analyse ; elle reste servie par l'export du
   *     graphique.
   *
   *   `AssetGlobalPrices`     — le cours dans une vingtaine de devises. Le sélecteur de
   *     devise du site fait déjà cela pour la devise qu'on a choisie.
   *
   * ── CE QUI ENTRE, ET DANS QUEL ORDRE ────────────────────────────────────────
   *
   * La disposition de la référence : deux colonnes, le raisonnement à gauche, les
   * outils à droite.
   *
   *   GAUCHE   « face à la finance traditionnelle » donne l'ÉCHELLE — cet actif est-il
   *            gros ou petit, et par rapport à quoi. Puis la matrice de performance
   *            par paire donne la LECTURE RELATIVE — a-t-il fait mieux que le marché.
   *            L'ordre compte : on situe avant de juger.
   *
   *   DROITE   le convertisseur et l'historique des extrêmes. Deux outils qu'on
   *            consulte ponctuellement, sans lesquels le raisonnement de gauche tient
   *            debout — d'où la colonne étroite.
   */
  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * ⚠️ L'ONGLET ANALYSE A ÉTÉ REMPLACÉ UNE SECONDE FOIS — TROIS TABLES DE MARCHÉ
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * ── CE QUI EN SORT, ET IL FAUT LE NOMMER ────────────────────────────────────
   *
   * Quatre blocs, retirés sur demande au profit des trois tables de la référence :
   *
   *   `AssetVsTradFi`          — l'actif comparé aux repères de la finance classique.
   *   `AssetPerformanceMatrix` — sa performance face à trois comparables.
   *   `AssetConverter`         — le convertisseur multi-devises.
   *   `AssetPriceHistoryCard`  — les extrêmes historiques en carte.
   *
   * Les quatre composants restent au dépôt et n'ont plus d'appelant sur la fiche. Ce
   * que la page perd est réel : la mise à l'échelle contre l'or et le S&P, et la
   * lecture relative face aux pairs. Ce qu'elle gagne est ce qui manquait — où l'actif
   * s'échange réellement, et qui le détient.
   *
   * ── LES TROIS TABLES, ET CE QUI DÉCIDE LAQUELLE S'AFFICHE ───────────────────
   *
   *   MARCHÉS      les places qui cotent l'actif. Servies par la donnée déjà chargée
   *                pour la fiche, donc SANS appel de plus. Elles ouvraient l'onglet
   *                « Places » ; elles ouvrent celui-ci.
   *
   *   JETONS       les versions tokenisées d'une action ou d'un ETF, avec leur écart au
   *                cours du titre. Chargées à l'approche de la section.
   *
   *   TRÉSORERIES  les sociétés cotées qui détiennent la cryptomonnaie à leur bilan.
   *                Chargées à l'approche de la section.
   *
   * Chacune se retire d'elle-même quand sa source ne publie rien — une devise n'a ni
   * jetons ni trésoreries, et son onglet se réduit alors à ses places de cotation.
   */
  const analysis = (
    <div className="space-y-10">
      {tickerRows.length > 0 ? (
        <AssetTickers
          tickers={tickerRows}
          assetName={data.name}
          exchangeImages={exchangeImages}
          title={`${t('Marchés')} ${data.name}`}
        />
      ) : null}

      {/* Les deux tables tokenisées ne concernent que les titres : une cryptomonnaie
          n'a pas de version tokenisée d'elle-même, et un indice ne s'émet pas. */}
      {assetClass === 'stock' || assetClass === 'etf' ? (
        <AssetTokenizedStocks
          symbol={data.symbol}
          assetName={data.name}
          {...(data.price !== undefined ? { referencePrice: data.price } : {})}
          referenceCurrency={data.currency}
        />
      ) : null}

      {assetClass === 'crypto' ? (
        <AssetTreasuries assetId={data.id} assetName={data.name} symbol={data.symbol} />
      ) : null}

      {/* Le bouche-trou ne subsiste que si AUCUNE des trois tables ne peut se rendre :
          c'est le cas d'une devise ou d'un indice, dont aucune source ne publie ni
          places, ni jetons, ni détenteurs. */}
      {tickerRows.length === 0 && assetClass !== 'crypto' && assetClass !== 'stock' && assetClass !== 'etf' ? (
        <AssetTabFiller asset={data} />
      ) : null}
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
    { id: 'apercu', label: t('Aperçu'), icon: <LayoutGrid size={14} strokeWidth={1.5} />, panel: overview },
    { id: 'places', label: t('Places'), icon: <Store size={14} strokeWidth={1.5} />, panel: venues },
    { id: 'analyse', label: t('Analyse'), icon: <Activity size={14} strokeWidth={1.5} />, panel: analysis },
    /*
     * ── L'ONGLET « ACTUALITÉS » A ÉTÉ RETIRÉ ──────────────────────────
     *
     * Il rendait « Articles mentionnant X » sur toute la largeur : une vignette de
     * trois cents pixels, un article en vedette, puis une grille de cartes. Le
     * PANNEAU DROIT porte désormais le même fil, au même instant, en colonne
     * permanente — c'est-à-dire lisible EN REGARDANT le graphique, ce qui est
     * l'usage réel : on rattache un décrochage à un événement daté.
     *
     * Garder les deux aurait donné les mêmes articles à deux endroits, dont l'un
     * exigeait de quitter la courbe pour les lire. `AssetNewsPanel` reste dans le
     * dépôt : c'est son emploi EN SECTION qui ne se justifiait plus.
     */
    {
      id: 'ecosysteme',
      label: t('Écosystème'),
      icon: <Shapes size={14} strokeWidth={1.5} />,
      panel: ecosystem,
    },
  ]

  return (
    /* `space-y-3` et non 5 : cette valeur ne sépare que DEUX choses — l'en-tête
       d'identité et la barre de sommaire — et cette dernière porte déjà son propre
       filet. Vingt pixels de blanc PLUS un trait pour dire la même séparation, c'est
       la dire deux fois ; douze suffisent, et la courbe commence d'autant plus haut. */
    /* `data-asset-page` : marqueur lu par la feuille de style pour le réglage
       « Affichage : Étirée », qui retire le plafond de largeur des FICHES et d'elles
       seules — voir `.shell:has([data-asset-page])` dans `globals.css`. */
    <div className="space-y-3" data-asset-page="">
      {/*
        ── LA FICHE SE RAFRAÎCHIT SEULE ───────────────────────────────────────

        Le cours de l'en-tête et la fin de la courbe vivaient déjà en direct, poussés
        par le WebSocket de Binance. Tout le reste — capitalisation, volume 24 h,
        amplitude, rang, places de cotation — était figé à l'instant du rendu, et le
        restait tant qu'on ne rechargeait pas. Un onglet ouvert une heure affichait
        donc un « Volume 24 h » d'il y a une heure, avec la même autorité qu'un chiffre
        juste.

        Il ne rend rien : c'est un minuteur, posé en tête pour qu'on le voie. Voir son
        fichier pour la cadence et pourquoi un onglet caché ne déclenche rien.
      */}
      <AssetLiveRefresh />

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
          ⚠️ L'EN-TÊTE N'EST PLUS UNE RANGÉE — IL A REJOINT CELLE DES ONGLETS.

          Il occupait ici une rangée pleine largeur : identité à gauche, cours à droite.
          La rangée de sommaire venait dessous, avec quatre onglets centrés laissant
          plusieurs centaines de pixels de vide de chaque côté.

          Les deux ont fusionné. Ses deux moitiés — `AssetHeadline` et `AssetQuote` —
          sont passées à `AssetTabs` plus bas, qui les place aux deux bouts de sa rangée
          collante. Le vide latéral du sommaire est comblé, et la fiche gagne toute la
          hauteur de la rangée supprimée.

          Ne subsiste ICI que le FIL D'ARIANE : il ne défile pas avec la rangée collante
          et n'a donc rien à y faire. Il garde sa ligne propre, au-dessus de tout.
          ══════════════════════════════════════════════════════════════════════ */}
      {/*
        ── LE FIL D'ARIANE RESPIRE PLUS EN HAUT QU'EN BAS, ET C'EST VOULU ─────────

        Il était collé au filet de l'en-tête du site : douze pixels sous lui, aucun
        au-dessus. Un fil d'Ariane n'appartient ni à la barre de navigation ni au titre
        qui le suit — c'est une ligne de situation, et elle a besoin d'un blanc de
        chaque côté pour se lire comme telle.

        `pt-5` contre `pb-3` : le blanc du haut est plus large parce qu'il sépare deux
        CHOSES DIFFÉRENTES — la barre du site et la page — quand celui du bas sépare
        deux parties d'un même en-tête. Un interligne symétrique rattacherait
        visuellement le fil à la barre.

        Mesuré : le texte tombe à 109 px du haut de la fenêtre, soit 44 px sous le
        filet de l'en-tête.
      */}
      <div className="pb-3 pt-5">
        <Breadcrumb assetClass={assetClass} name={data.name} />
      </div>

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
      {/* ══════════════════════════════════════════════════════════════════════
          L'EN-TÊTE REDEVIENT UNE RANGÉE ORDINAIRE, AU-DESSUS DU CADRE

          Il vivait DANS la rangée collante, à côté de la barre de sommaire et du
          bloc de cours. Les trois y étaient tenus par une hauteur mesurée au pixel
          et par un jeu de superpositions en fondu.

          La barre de sommaire et le bloc de cours ont été retirés de cette rangée
          (demande explicite) ; il ne restait qu'un en-tête seul dans un mécanisme
          construit pour trois. Il reprend donc sa place naturelle : une ligne dans
          le flux, sous le fil d'Ariane, comme sur la référence.

          Ce qu'il gagne au passage — et c'est le vrai apport de la refonte — la
          rangée de liens officiels et l'étoile de suivi contre le logo. Voir
          `AssetHeadline`.
          ══════════════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════════════
          LE FILET SOUS L'EN-TÊTE — DEMANDE EXPLICITE, ET IL MANQUAIT VRAIMENT

          L'en-tête et la zone de travail ne se séparaient que par du BLANC : vingt
          pixels entre la rangée de liens officiels et la carte de cours. C'est assez
          pour deux blocs de même nature, pas pour deux blocs de natures opposées —
          au-dessus, l'identité de l'actif, qui ne bouge pas ; en dessous, des chiffres
          qui tiquent et un graphique qu'on manipule.

          Le filet dit lequel des deux on regarde. Il traverse toute la largeur, avant
          la grille à deux colonnes : posé DANS l'une des colonnes il s'arrêterait à
          son bord, et la page porterait deux traits de longueurs différentes — le
          défaut exact que la barre de sommaire a déjà connu (voir `AssetLayoutFrame`).

          `mb-5` remplace la moitié basse de l'ancien `pb-5` : un trait a besoin d'air
          des deux côtés, sans quoi il se lit comme le soulignement de la ligne de
          liens plutôt que comme une frontière.
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-5 border-b border-border-subtle pb-5">
        <AssetHeadline
          asset={data}
          assetClass={assetClass}
          rankLabel={fr.asset.stats.rank}
          watchAction={
            <WatchlistStar
              assetClass={assetClass}
              assetId={data.id}
              label={data.name}
              {...(data.symbol ? { symbol: data.symbol } : {})}
              path={assetHref(assetClass, data.id)}
              initialFollowing={watchlist.following}
              available={watchlist.available}
            />
          }
        />
      </div>

      <AssetSections
        tabs={tabs}
        aside={newsAside}
        /* L'IDENTITÉ COMPACTE EST LE SEUL CONTENU DE LA BANDE D'ACCOMPAGNEMENT.

           Elle vivait dans le rail, où sa sentinelle — son premier enfant — définissait
           le seuil d'apparition. Cette sentinelle n'existe plus : le cadre a la sienne,
           et c'est l'état « défilé » qu'elle mesure qui révèle la bande.

           C'est ce qui reste du cours en haut de page une fois qu'on a descendu la
           fiche : la bande le porte en direct, à côté du nom. */
        identity={<AssetStickyBar asset={data} assetClass={assetClass} isRate={isForex} />}
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
          /* Pas de `key` : elle datait d'une époque où le rail voyageait dans un
             tableau. Sur un élément passé en prop unique elle est ignorée, et sa
             présence à côté d'un frère dynamique — la colonne d'actualités — faisait
             croire à React qu'il rendait une liste, d'où un avertissement de clé
             manquante pointant sur `AssetLayoutFrame`.

             ⚠️ Un commentaire JSX `{/* … *​/}` serait une SECONDE expression dans cette
             prop, qui n'en admet qu'une : d'où la forme bloc, comme les autres
             commentaires de ce bloc. */
          <aside className="space-y-6">

          {/* La colonne empile QUATRE sources de nature différente : le
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
            ⚠️ LA MOITIÉ BASSE DU RAIL A DÉMÉNAGÉ, MAIS PAS LES DEUX FICHES.

            Sondage de sentiment, consensus d'analystes, communauté et projets
            similaires ont rejoint l'aperçu, dans la largeur libérée par les anneaux de
            volume : ce sont des BLOCS — barres, grilles, listes à logos — que 288
            pixels étiraient sur toute la hauteur de la page.

            Les DEUX FICHES restent ici, et c'est le mouvement inverse pour la raison
            inverse. Une fiche est une suite de couples « libellé → valeur » : place de
            cotation, secteur, contrats par chaîne, explorateurs, liens officiels. Cette
            forme-là VEUT une colonne étroite — c'est en pleine largeur qu'elle se casse,
            chaque ligne traînant un vide de six cents pixels entre son libellé et sa
            valeur.

            Et elles comblent un trou réel : le rail s'arrêtait à « Reste à émettre »,
            laissant sous lui une colonne vide de plusieurs centaines de pixels pendant
            que la grille du bas, en nombre impair de blocs, en laissait un second à
            droite. Les deux fiches ferment le premier, et leur départ rend la grille
            paire — voir la note de `railTail`.

            LES DEUX SONT EXCLUSIVES par construction : celle du haut ne rend quelque
            chose que pour une cryptomonnaie (contrats, chaînes, explorateurs), celle du
            bas que pour une valeur boursière (place, secteur, siège, émetteur).
          */}
          {/* ⚠️ `AssetTechSheet` A ÉTÉ RETIRÉ DE LA FICHE (demande explicite).

              Il rendait la « fiche technique » d'une cryptomonnaie : la liste de ses
              contrats par chaîne, avec l'adresse à copier et le lien vers
              l'explorateur de chacune. Deux à cinq lignes d'adresses hexadécimales
              tronquées, en tête de la moitié basse du rail.

              Ce qu'elle apportait vraiment — atteindre l'explorateur du jeton — n'est
              pas perdu : la rangée de liens de l'en-tête le porte, à côté du site
              officiel et des comptes sociaux (voir `AssetHeadline`). C'est la forme de
              la référence, et elle tient en une icône là où la fiche prenait cent
              cinquante pixels de hauteur.

              Le composant reste dans le dépôt : c'est sa présence sur la fiche qui a
              été retirée, pas son code. */}
          <AssetMarketSheet asset={data} assetClass={assetClass} profile={profile} />
          </aside>
        }
      />

      {/* ⚠️ LE BANDEAU « INFORMATION » A ÉTÉ RETIRÉ DE LA FICHE (demande explicite).
          La clause « aucun ordre ici » reste écrite dans le pied de page, où elle vaut
          pour tout le site, et la provenance des chiffres reste sous chaque bloc via
          `SourceNote`. Rien de ce que ce bandeau disait n'a disparu du site. */}

      {/* ── Hors onglets : identité de l'actif ───────────────────────────────
          Description et fiche technique restent SOUS les onglets, toujours
          visibles. Ce sont les seuls éléments de la page qui ne dépendent ni du
          marché ni de la période : les enfermer dans un onglet obligerait à
          chercher « qu'est-ce que c'est » après avoir trouvé « combien ça vaut ». */}
      {/* La grille de trois colonnes a disparu AVEC la fiche technique, qui en
          occupait la troisième et vit maintenant dans le rail de l'aperçu. Une
          grille dont une colonne sur trois est vide n'est plus une grille : c'est
          un texte artificiellement rétréci aux deux tiers de la page. */}
      {/* Deux colonnes : « À propos » (+ fiche d'identité) à gauche, la FAQ à
          droite. Le texte de présentation et les questions se lisent en parallèle
          au lieu de s'empiler sur deux écrans de haut. Une seule colonne sous `lg`,
          où deux colonnes de texte courant deviennent illisibles. */}
      <div className="grid gap-8 border-t border-border-subtle pt-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-8">
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
            {/* ⚠️ CE TITRE ÉTAIT ASSEMBLÉ PAR UNE RÈGLE DE GRAMMAIRE FRANÇAISE, ET
                S'APPLIQUAIT AUX TREIZE LANGUES. `frenchOf` élide « de » devant une
                voyelle — « d'Aave », « de Bitcoin » — ce qui est juste en français et
                n'a aucun sens ailleurs : un lecteur allemand lisait « À propos de
                Bitcoin » sur une page par ailleurs entièrement traduite.

                La phrase devient un gabarit à substituant, traduit comme les autres.
                Le français garde son élision : il est le REPLI de la table, donc le
                seul cas où le gabarit ne serait pas remplacé — d'où la branche
                explicite sur la locale plutôt qu'une comparaison entre la clé et sa
                traduction, qui reviendrait au même en moins lisible. */}
            <h2 className="display-sm text-ink">
              {locale === 'fr'
                ? `À propos ${frenchOf(data.name)}`
                : t('À propos de {nom}').replace('{nom}', data.name)}
            </h2>
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
                {t('Résumé d’activité publié en anglais par {source}, repris sans traduction.').replace(
                  '{source}',
                  asset.source?.label ?? t('la source'),
                )}
              </p>
            ) : null}

            {about.credit === 'zenkuu' ? (
              <p className="text-micro text-ink-muted opacity-80">{t('Présentation rédigée par ZENKUU : aucune source de cotation ne publie de notice pour cet instrument. Elle ne décrit que sa construction, jamais son niveau — le cours et les variations viennent, eux, de la source.')}</p>
            ) : null}
          </section>
        ) : null}

        {/* Identité d'une valeur boursière — secteur, pays, place. Absente pour
            une cryptomonnaie, qui a sa fiche technique dans le rail de l'aperçu. */}
        <AssetIdentity asset={data} assetClass={assetClass} />
        </div>

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

      {/*
        ══════════════════════════════════════════════════════════════════════════
        « TENDANCES DU MOMENT » FERME LA PAGE, APRÈS « À PROPOS » ET LA FAQ
        ══════════════════════════════════════════════════════════════════════════

        C'est le seul bloc de la fiche qui ne parle PAS de l'actif consulté : ce sont
        les actifs les plus regardés du site, quels qu'ils soient. Sa place est donc
        après tout ce qui décrit celui-ci — le « et ensuite ? ».

        ⚠️ `AssetTrendingRail` A ÉTÉ RETIRÉ D'ICI, ET C'EST UNE SUPPRESSION DE DOUBLON.
        Il rendait EXACTEMENT cette donnée, au même endroit, sous une autre forme —
        une rangée de huit vignettes intitulée « En tendance ». Deux blocs de tendances
        à quatre-vingts pixels d'écart n'apprennent rien de plus que l'un des deux ; on
        garde celui que le lecteur a demandé, avec son titre, son renvoi vers les
        classements et la phrase qui dit ce que « tendance » mesure. Le composant reste
        au dépôt, il n'a simplement plus d'appelant sur la fiche.

        AUCUN APPEL SUPPLÉMENTAIRE : `trending` est déjà chargé par le `Promise.all` en
        tête de ce composant.

        L'actif consulté est retiré de la liste — se voir soi-même dans « les tendances
        du moment » n'est pas faux, mais n'apprend rien : on est déjà sur sa page.
      */}
      {trending?.ok && trending.data.some((entry) => entry.id !== data.id) ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="display-sm text-ink">{t('Tendances du moment')}</h2>
            <Link
              href="/classements"
              className="shrink-0 text-xs font-medium text-ink hover:underline"
            >
              {fr.home.seeAll}
            </Link>
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            {t(
              'Les actifs les plus consultés du moment, tous secteurs confondus. Une mesure d’ATTENTION, pas de performance : un actif peut être très regardé parce qu’il chute.',
            )}
          </p>

          <AssetPeerGrid peers={trending.data.filter((entry) => entry.id !== data.id).slice(0, 6)} />
        </section>
      ) : null}
    </div>
  )
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

/**
 * Le fil d'Ariane de la fiche.
 *
 * ── CE QUE `Breadcrumb` DE SHADCN/UI APPORTE À TROIS `<li>` ─────────────────
 *
 * La structure était déjà correcte — un `<nav aria-label>`, une `<ol>`, un
 * `aria-current="page"` sur le dernier maillon. Ce que la version maison n'avait pas,
 * et qui se remarque à l'oreille plus qu'à l'œil :
 *
 *   · LE SÉPARATEUR N'EST PLUS UN CARACTÈRE. C'était un `<li aria-hidden>/</li>` :
 *     une barre oblique dans le flux du texte, que certaines synthèses vocales lisent
 *     malgré `aria-hidden` lorsqu'elles parcourent caractère par caractère.
 *     `BreadcrumbSeparator` rend un chevron SVG, marqué `presentation`.
 *   · LE DERNIER MAILLON EST UN `BreadcrumbPage`, c'est-à-dire un `<span
 *     role="link" aria-disabled>` : il est annoncé comme un lien COURANT et non
 *     comme du texte ordinaire, ce qui situe la page dans la hiérarchie.
 *
 * ⚠️ `asChild` SUR CHAQUE MAILLON. `BreadcrumbLink` rend un `<a>` en dur ; le site
 * sert treize langues et ses chemins sont préfixés par la locale, que seul le `Link`
 * de next-intl pose. Sans `asChild`, chaque maillon renverrait le lecteur anglophone
 * vers la version française de la page.
 */
async function Breadcrumb({ assetClass, name }: { assetClass: AssetClass; name: string }) {
  const t = await getPhrase()
  const fr = await getContent()
  return (
    <UiBreadcrumb aria-label={t('Fil d’Ariane')} className="text-xs text-ink-muted">
      <BreadcrumbList className="gap-1.5 text-xs sm:gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="hover:text-brand">
            <Link href="/">{fr.nav.home}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="hover:text-brand">
            <Link href={marketHref(assetClass)}>{fr.assetClass[assetClass]}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium text-ink">{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </UiBreadcrumb>
  )
}
