import { AssetPriceCard } from '@/components/asset/AssetPageHeader'
import { Link } from '@/i18n/navigation'
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
import { AssetCommunity } from '@/components/asset/AssetCommunity'
import { AssetFaq } from '@/components/asset/AssetFaq'
import { AssetNewsAside } from '@/components/asset/AssetNewsAside'
import { AssetNewsRail } from '@/components/asset/AssetNewsRail'
import { AssetProfileRail } from '@/components/asset/AssetHoldings'
import { AssetPeerGrid } from '@/components/asset/AssetPeerGrid'
import { AssetAnalystView } from '@/components/asset/AssetAnalystView'
import { AssetMarketSheet } from '@/components/asset/AssetMarketSheet'
import { ReadingProgress } from '@/components/ui/ReadingProgress'
import { AssetLiveRefresh } from '@/components/asset/AssetLiveRefresh'
import { AssetStickyBar } from '@/components/asset/AssetStickyBar'
import { AssetSupply } from '@/components/asset/AssetSupply'
import { AssetLayoutFrame } from '@/components/asset/AssetLayoutFrame'
import { AssetChangeStrip } from '@/components/asset/AssetChangeStrip'
import { AssetVsPeers } from '@/components/asset/AssetVsPeers'
import { AssetPerformanceMatrix } from '@/components/asset/AssetPerformanceMatrix'
import { AssetRecords } from '@/components/asset/AssetRecords'
import { AssetConverterCard } from '@/components/asset/AssetConverterCard'
import { AssetExchangeTable } from '@/components/asset/AssetExchangeTable'
import { PanelVisibilityProvider } from '@/components/asset/panel-visibility'
import { AssetWorkspace } from '@/components/asset/AssetWorkspace'
import { tradingViewMarketCapSymbol, tradingViewSymbol } from '@/components/asset/tradingview-symbol'
import { AssetJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { getContent } from '@/lib/content'
import { mentioning } from '@/lib/mentions'
import { assetPath, marketHref, marketPath } from '@/lib/asset-routes'
import type { MetricGroup } from '@/lib/asset-metrics'
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
  const overviewChart = (
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
        {/* ⚠️ `AssetPriceCard` N'EST PLUS ICI, ET N'EST PAS PARTIE POUR AUTANT.

            Elle a ouvert cette colonne — au-dessus du graphique —, puis a été retirée
            de la fiche, ses trois valeurs remontant dans la bande de l'en-tête. Elle
            est aujourd'hui RÉTABLIE, mais en tête du RAIL et non ici : c'est la place
            que lui donne Token Terminal, et c'est aussi celle qui laisse le graphique
            commencer haut — l'argument qui avait fait descendre la carte depuis
            l'en-tête vaut encore, il désigne simplement l'autre colonne.

            Voir l'appel dans la prop `rail`, plus bas. */}
        <section className="space-y-3">
          {/* ── LE PANNEAU DU GRAPHIQUE A ÉTÉ RETIRÉ, ET SON MOTIF AVEC LUI ───────

              Il venait d'être ajouté, avec cet argument : « le rail de gauche vient de
              reprendre ses cartes ; deux colonnes côte à côte, l'une cernée et l'autre
              non ». L'argument était bon et il s'est retourné — le rail a reperdu ses
              cartes en passant à la référence CoinGecko, et c'est donc le panneau qui
              dépareillait.

              Relevé au navigateur sur `coingecko.com/en/coins/hyperliquid` le
              2026-09-06 : aucun élément de sa colonne centrale ne porte de fond ni de
              bord. La barre d'outils, la courbe et la frise de navigation sont posées
              à plat sur le blanc de la page, et ce qui les tient ensemble est leur
              seule proximité.

              La bande de variations, elle, GARDE sa carte : la référence en a une
              aussi — un tableau à coins arrondis dont les en-têtes sont sur `#f1f5f9`
              — et c'est le seul objet cerné de sa page. */}
          <AssetWorkspace
            asset={data}
            assetClass={assetClass}
            /* La traduction TradingView se fait ICI parce qu'elle a besoin des PLACES
               de cotation, qui ne traversent pas jusqu'au widget. Une seule décision
               pour deux usages — l'interrupteur de la barre et le cadre lui-même. Voir
               `tradingview-symbol.ts` pour ce que ce changement corrige. */
            tradingViewSymbol={tradingViewSymbol(assetClass, data.symbol, tickerRows)}
            tradingViewMarketCapSymbol={tradingViewMarketCapSymbol(assetClass, data.symbol)}
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
          

          {/* ── LE BANDEAU DE VARIATIONS REVIENT, SOUS LA COURBE ────────────────

              Demandé d'après capture, dans la forme de CoinGecko : six fenêtres en
              rangée, l'intitulé au-dessus de sa variation.

              Il est posé ICI, dans `overviewChart`, et pas dans la moitié basse : sa
              raison d'être est d'être lu SANS quitter le graphique des yeux. Le
              descendre sous la coupure le mettrait à la place qu'occupe déjà le rail,
              c'est-à-dire loin. Voir l'en-tête de `AssetChangeStrip` pour le doublon
              assumé avec le bloc « Variations » du rail. */}
          <AssetChangeStrip asset={data} />
        </section>
    </div>
  )

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * TOUT CE QUI SUIT LE GRAPHIQUE PREND LA LARGEUR ENTIÈRE (demande explicite)
   * ══════════════════════════════════════════════════════════════════════════
   *
   * L'aperçu était UN SEUL nœud, rendu dans une boîte `.asset-section`. Cette
   * classe pose `display: flow-root`, ce qui ouvre un contexte de formatage : la
   * boîte se range À CÔTÉ du rail flottant et garde cette largeur réduite sur
   * TOUTE sa hauteur — y compris des milliers de pixels plus bas, là où le rail
   * s'est arrêté depuis longtemps.
   *
   * Résultat mesuré sur la fiche Bitcoin : sous « Bitcoin face à ses voisins », la
   * colonne de gauche est vide sur toute la hauteur restante pendant que les
   * tableaux se serrent dans les deux tiers de droite. C'est ce que montre la
   * capture 2.
   *
   * L'aperçu est donc coupé en DEUX nœuds :
   *
   *   `overviewChart`   le graphique seul, qui doit rester à côté du rail — c'est
   *                     tout l'intérêt d'un rail, lire les chiffres EN REGARDANT
   *                     la courbe.
   *   `overviewBelow`   tout le reste, rendu hors du contexte de formatage et
   *                     dégagé du flottant : il commence sous le rail et prend la
   *                     largeur de la colonne principale.
   *
   * ⚠️ LA LARGEUR S'ARRÊTE À LA COLONNE D'ACTUALITÉS, ET C'EST VOULU. Celle-ci est
   * la SŒUR de la colonne principale dans la rangée `flex` du cadre, pas un
   * flottant : rien ne peut passer dessous. La demande dit « jusqu'à en dessous du
   * panel gauche » — c'est bien le rail de gauche qui est récupéré, pas la colonne
   * de droite.
   */
  const overviewBelow = (
    <div className="space-y-5">
        <section className="space-y-3">
          {/* ⚠️ LE BANDEAU DE VARIATIONS A ÉTÉ RETIRÉ D'ICI (demande explicite).

              Il portait six fenêtres — 1 h, 24 h, 7 j, 14 j, 30 j, 1 an — sur une
              rangée collée sous le graphique. La note qui défendait sa place disait
              vrai de l'usage : « la question "et sur une semaine ?" se pose en
              regardant la courbe ».

              Mais elle omettait que le RAIL DE GAUCHE porte déjà ces six mêmes
              valeurs, sous le titre « Variations », en face du graphique et non
              sous lui. Les deux blocs lisaient les mêmes champs de la même réponse
              et les écrivaient à deux endroits de la même page.

              Rien n'a donc disparu de la fiche : c'est le doublon qui part, et le
              graphique gagne la hauteur d'une rangée. */}

          {/* ══════════════════════════════════════════════════════════════════
              LES SIX BLOCS DE dropstab.com, À LA PLACE DES « SÉRIES DU MARCHÉ »
              ══════════════════════════════════════════════════════════════════

              ── CE QUI PART ─────────────────────────────────────────────────────

              `AssetSeriesCards` : trois figures en barres — volume, capitalisation,
              variation — regroupables par jour, semaine ou mois. Elles tiraient leur
              forme de `blockworks.com` et leurs points de la réponse d'historique.

              Retrait DEMANDÉ, et il se défend : les trois séries qu'elles traçaient
              sont déjà dans le graphique du dessus, qui porte le volume en
              sous-panneau et les variations dans son bandeau de lecture. Ce qui les
              distinguait — la granularité — servait à corriger un défaut de leur propre
              forme, pas à répondre à une question.

              `BarFigure` reste : c'est une figure générique, et la page `/analytics`
              s'en sert pour ses frais mensuels.

              ⚠️ `series-grouping.ts` A ÉTÉ SUPPRIMÉ, APRÈS AVOIR ÉTÉ GARDÉ. Il l'avait
              été au motif qu'il était « générique » — il ne l'est pas : son type
              `SeriesPoint` porte un `price`, un `volume` et une `marketCap`, c'est-à-dire
              la forme exacte des cartes qui partent. Le seul appelant possible restant,
              la figure des frais de `/analytics`, aurait dû lui passer un prix nul pour
              obtenir une somme mensuelle. Ses six tests partent avec lui ; le
              raisonnement sur « le volume se somme, la capitalisation se prend à la
              fin » est repris là où il sert encore, dans `FeeSeries`.

              ── CE QUI ARRIVE, ET AVEC QUELLE DONNÉE ────────────────────────────

              Cinq des six blocs de la fiche `dropstab.com/coins/…`. Aucun ne coûte un
              appel de plus : les voisins, les cotations et les prix par devise sont
              déjà dans le `Promise.all` en tête de ce composant — les places de
              cotation étaient même chargées pour n'en tirer qu'un symbole TradingView.

              ⚠️ LE SIXIÈME — « ACTIVITIES » — N'EST PAS LIVRÉ, ET C'EST UNE ABSENCE DE
              SOURCE, PAS UN OUBLI. La référence y liste les campagnes de points et
              d'airdrops en cours sur le jeton ; c'est une donnée que DropsTab produit
              et publie lui-même. Aucun fournisseur du registre ne l'expose, et aucune
              API gratuite ne la couvre pour l'ensemble des actifs de ZENKUU. Un bloc
              vide, ou rempli d'exemples, serait exactement le placeholder que le cahier
              des charges interdit.

              ── L'ORDRE EST CELUI DE LA RÉFÉRENCE ───────────────────────────────

              On situe (voisins), on juge (performance), on outille (records et
              convertisseur), on va voir ailleurs (places). */}
          <AssetVsPeers asset={data} peers={comparables} />

          <AssetPerformanceMatrix
            asset={data}
            benchmarks={comparables.filter((peer) =>
              BENCHMARK_OPTIONS.some((entry) => entry.id === peer.id),
            )}
          />

          {/* Records et convertisseur côte à côte : deux blocs étroits par nature — un
              couple de chiffres, deux champs — qui laisseraient chacun la moitié de la
              largeur vide s'ils s'empilaient. */}
          <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
            <AssetRecords asset={data} assetClass={assetClass} />
            <AssetConverterCard asset={data} />
          </div>

          <AssetExchangeTable tickers={tickerRows} logos={exchangeImages} />

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
            ⚠️ `AssetSentiment` A ÉTÉ RETIRÉ DE LA FICHE (demande explicite).

            Il rendait le sondage d'audience d'une cryptomonnaie : une barre à deux
            parts, « 78,9 % haussier / 21,1 % baissier », et la mise en garde qui
            l'accompagnait — « vote des visiteurs de la source, et non une mesure de
            marché ».

            Cette mise en garde disait déjà l'essentiel : la donnée mesure un vote
            d'audience, pas une position. Elle vivait à côté du consensus d'analystes,
            qui répond à la même question sur une base autrement établie, et les deux
            se lisaient au même rang.

            Il ne reste donc que `AssetAnalystView`. La grille garde `xl:grid-cols-2` :
            elle se referme d'elle-même sur ce qui reste, et c'est déjà le comportement
            décrit plus haut pour les actifs dont un bloc manque.

            Le composant reste dans le dépôt — c'est sa présence sur la fiche qui a
            été retirée. Son import part en revanche, sans quoi le lint le signale.
          */}
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
          path={assetPath(assetClass, data.id)}
          description={data.description}
          sourceName={asset.source.label}
          sourceUrl={asset.source.attributionUrl}
          updatedAt={data.lastUpdated}
        />
      ) : null}

      <BreadcrumbJsonLd
        items={[
          { name: fr.nav.home, path: '/' },
          { name: fr.assetClass[assetClass], path: marketPath(assetClass) },
          { name: data.name, path: assetPath(assetClass, data.id) },
        ]}
      />

      {/* ⚠️ LE FIL D'ARIANE, L'IDENTITÉ ET LA RANGÉE D'ONGLETS ONT QUITTÉ CETTE VUE.
          Ils sont rendus par `AssetShell`, que le `layout.tsx` de la fiche pose au-dessus
          des quatre onglets — c'est ce qui les empêche d'être redessinés à chaque
          bascule. Les notes qui expliquaient leur géométrie les ont suivis. */}

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
      {/* ══════════════════════════════════════════════════════════════════════
          LE CADRE EST APPELÉ DIRECTEMENT — IL N'Y A PLUS QU'UNE SECTION
          ══════════════════════════════════════════════════════════════════════

          `AssetSections` posait une barre de sommaire au-dessus de QUATRE sections
          empilées, et suivait au défilement celle qu'on lisait. Trois de ces quatre
          sections ont été retirées de la fiche (demande explicite) : « Places »,
          « Analyse » et « Écosystème ».

          Une barre de sommaire à une seule entrée ne renseigne sur rien et ne mène
          nulle part — elle désignerait la page depuis la page. Le composant n'a donc
          plus d'objet ici : la fiche appelle `AssetLayoutFrame`, qui est ce que
          `AssetSections` enveloppait, et lui passe l'aperçu comme unique enfant.

          Les trois props qui restent — l'identité flottante, le rail de chiffres, la
          colonne d'actualités — traversaient déjà `AssetSections` sans qu'il les
          touche. Elles vont maintenant droit au cadre.
          ══════════════════════════════════════════════════════════════════════ */}
      <AssetLayoutFrame
        aside={newsAside}
        /* ⚠️ LES PROPS `tabs` ET `headline` ONT DISPARU DE CET APPEL, avec les deux
           blocs qu'elles portaient : la rangée d'onglets et la bande d'identité. Elles
           vivent dans `AssetShell`, au-dessus des quatre onglets — voir le `layout.tsx`
           de la fiche. Ce cadre n'enveloppe plus que l'APERÇU, ce qui est aussi la
           raison pour laquelle il commence désormais sous le filet d'identité. */
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
          /* ⚠️ `space-y-2` ET NON 6, POUR LA MÊME RAISON QU'À L'INTÉRIEUR DU RAIL.
             Cet écart séparait des blocs SANS bord ; ils en ont repris un. Huit pixels
             est l'écart que la référence met entre les cartes de sa colonne, et le
             garder à vingt-quatre ferait ici deux frontières superposées — le bord de
             la carte, puis un couloir de blanc trois fois plus large que le
             rembourrage de la carte elle-même. Voir `RailSection`.

             Commentaire nu : on est dans la prop `rail`, qui n'admet qu'une expression
             — c'est la forme qu'emploient tous les commentaires de ce bloc. */
          <aside className="space-y-2">
          {/* ══════════════════════════════════════════════════════════════════
              LA CARTE DE COURS OUVRE LE RAIL — RÉTABLIE SUR DEMANDE

              Elle avait été retirée de la fiche, et ses trois valeurs — cours,
              variation 24 h, amplitude du jour — étaient montées dans la bande de
              l'en-tête sous forme de cellules. Token Terminal pose son bloc
              « Price » en TÊTE DE COLONNE GAUCHE, juste au-dessus de la table de
              métriques ; c'est cette forme qui a été redemandée.

              ⚠️ LES CELLULES DE LA BANDE SONT PARTIES EN MÊME TEMPS, et c'était la
              condition. Deux cours sur un même écran, dont l'un branché sur le flux
              Binance et l'autre figé au rendu, ne se contredisent pas souvent — mais
              quand ils le font, rien ne dit lequel croire.

              Le cours reste néanmoins visible une fois la page descendue : c'est le
              rôle d'`AssetStickyBar`, la bande compacte qui apparaît au défilement.
              ══════════════════════════════════════════════════════════════════ */}
          <AssetPriceCard
            asset={data}
            assetClass={assetClass}
            price={
              assetClass === 'crypto' ? (
                <LiveBinancePrice
                  symbol={data.symbol}
                  fallbackValue={data.price}
                  fallbackCurrency={data.currency}
                />
              ) : (
                <Money value={data.price} from={data.currency} asRate={isForex} />
              )
            }
          />

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
          {/* ⚠️ `AssetMarketSheet` A QUITTÉ CE RAIL, ET C'EST CE QUI RÈGLE T2.
              La fiche technique d'une valeur boursière descend dans la colonne
              principale, sous « À propos ». Mesuré sur la fiche Apple : le rail faisait
              1023 px pour un budget de 857 — 166 px sous le lien « Revoir toute la
              période », que le brief pose comme limite. Son départ le ramène à 663.
              Voir l'en-tête du composant pour le choix de ce bloc plutôt que d'un autre. */}
          </aside>
        }
      >
        {/* ⚠️ `asset-section` EST INDISPENSABLE, ET SON ABSENCE A ÉTÉ VUE AVANT DE
            L'ÊTRE COMPRISE : le graphique se dessinait PAR-DESSUS le rail de chiffres.

            Le rail n'est pas une colonne de grille — il FLOTTE. À partir de `lg`,
            `globals.css` lui pose un `float: left` de 19,5 rem, et c'est
            `display: flow-root` sur la section voisine qui ouvre le contexte de
            formatage lui faisant longer le flottant plutôt que couler dessous.

            Cette classe était posée par `AssetSections`, sur chacune des quatre
            sections qu'il rendait. Elle est partie avec lui. Mesuré au navigateur :
            la toile amCharts s'étendait de 457 à 1713 px alors que le rail occupe
            457 → 720 — les deux se superposaient exactement sur sa largeur.

            L'aperçu n'a en revanche PAS besoin d'un `<section id>` : cet identifiant
            n'existait que pour être visé par la barre de sommaire.

            `PanelVisibilityProvider` vaut `true` sans condition — il ne chargeait une
            section qu'à son approche, ce qui n'a plus de sens pour la seule section de
            la page, visible dès l'ouverture. */}
        <div className="asset-section">
          <PanelVisibilityProvider visible>{overviewChart}</PanelVisibilityProvider>
        </div>

        {/* ── LA MOITIÉ BASSE, HORS DU CONTEXTE DE FORMATAGE ────────────────────

            Pas de `asset-section` ici, et c'est TOUT le correctif : cette classe
            pose `flow-root`, et c'est `flow-root` qui tenait ces blocs à côté du
            rail au lieu de les laisser reprendre la largeur sous lui. Voir la note
            de `overviewBelow`.

            `clear-left` plutôt que rien : sans lui, un rail plus HAUT que le
            graphique — le cas d'une grande cryptomonnaie, dont le rail empile
            fondamentaux, amplitude, variations, offre et fiche — laisserait ces
            blocs commencer À CÔTÉ de sa fin, dans une largeur amputée, puis
            s'élargir en cours de route. Une section dont la largeur change au
            milieu se lit comme un défaut de rendu. Dégagée, elle commence sous le
            rail et garde une seule largeur.

            `mt-5` reprend l'écart que `space-y-5` posait entre ces deux moitiés
            quand elles vivaient dans le même parent : la coupe ne doit pas se voir. */}
        <div className="clear-left mt-5">
          <PanelVisibilityProvider visible>{overviewBelow}</PanelVisibilityProvider>
        </div>
      </AssetLayoutFrame>

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
            {/* ⚠️ 13 PX ET NON 16 — ET L'INTERLIGNE, LUI, NE SUIT PAS.

                Relevé le 4 septembre 2026 sur la fiche Bitcoin de CoinGecko : ses
                paragraphes — « Bitcoin was created by an individual… », « Nakamoto
                actively developed Bitcoin… » — sortent tous en 13/18,525/400. Celui-ci
                était en 16/26 : trois pixels au-dessus, sur le seul bloc de la page où
                l'on lit vraiment des phrases.

                ⚠️ L'INTERLIGNE SUIT AUSSI, APRÈS AVOIR ÉTÉ GARDÉ. Il est resté un temps
                à `leading-relaxed` — 21 px contre leurs 18,5 — au motif qu'à treize
                pixels ces deux points et demi séparent un paragraphe qu'on lit d'un
                paragraphe qu'on parcourt. C'était une préférence, pas une mesure, et la
                consigne du chantier est que la référence l'emporte. `leading-[1.425]`
                rend les 18,525 px relevés.

                ── ET LA MESURE SUIT LA TAILLE ─────────────────────────────────────
                `max-w-lg` et non `max-w-2xl`. La note ci-dessus fixe la règle — « une
                ligne de texte courant cesse d'être lisible au-delà d'environ
                quatre-vingts caractères » — et la largeur de 672 px la respectait À
                SEIZE PIXELS. À treize, la même largeur porte une centaine de signes :
                réduire le corps sans réduire la mesure aurait cassé la règle que le
                bloc énonce, mesuré au navigateur avant correction. 512 px rendent les
                quatre-vingts signes. */}
            <p className="max-w-lg whitespace-pre-line text-xs leading-[1.425] text-ink-muted">
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

        {/* Identité d'une valeur boursière — nature, place, devise, secteur, siège,
            effectif, site officiel. Le composant se retire seul pour une cryptomonnaie,
            qui a sa propre fiche technique.

            ⚠️ IL REMPLACE `AssetIdentity`, SUPPRIMÉ, QUI TENAIT CETTE PLACE ET NE
            RENDAIT QUE DEUX LIGNES — « Secteur » et « Pays du siège » — toutes deux
            déjà présentes ici, avec la même source et le même repli. Sur une fiche
            d'action, le secteur s'affichait donc deux fois sous deux intitulés. */}
        <AssetMarketSheet asset={data} assetClass={assetClass} profile={profile} />
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

      {/* ── LA PROGRESSION DE LECTURE FERME LA PAGE ──────────────────────────

          La fiche d'actif est la page la plus longue du site : en-tête, graphique,
          widgets, « À propos », FAQ et tendances. C'est le premier des types que le
          brief nomme, et le seul où l'on descend sans savoir combien il reste.

          Elle est posée EN DERNIER dans l'arbre, mais sa position est `fixed` : sa
          place dans le document n'a d'effet que sur l'ordre de tabulation, où elle
          arrive après le contenu — ce qui est le bon rang pour un indicateur. */}
      <ReadingProgress />
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

