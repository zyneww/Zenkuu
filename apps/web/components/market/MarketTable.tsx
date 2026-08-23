'use client'

/*
 * Composant CLIENT, et il faut dire pourquoi — la directive n'a pas été ajoutée par
 * préférence mais par nécessité.
 *
 * `MarketBrowser` est marqué « use client » et importe ce tableau : il entre donc
 * dans le graphe client, que ce fichier le déclare ou non. Tant qu'il lisait un
 * dictionnaire figé, cela ne se voyait pas. Depuis qu'il lit le dictionnaire de la
 * requête, la version serveur (`await getContent()`) lève à l'exécution —
 * « getLocale is not supported in Client Components » — et fait tomber toutes les
 * pages de classement.
 *
 * Il lit donc le dictionnaire par contexte, comme les autres composants client. La
 * directive explicite évite en prime qu'un futur import depuis un composant serveur
 * ne recrée l'ambiguïté.
 */

import { Link, useRouter } from '@/i18n/navigation'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Table, TableBody, TableHeader } from '@/components/ui/table'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { ChangeBadge, Sparkline } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { CHANGE_PERIODS, periodMeta, type ChangePeriod } from '@/components/market/crypto-views'
import { TablePagination } from '@/components/ui/TablePagination'
import {
  ColumnHeader,
  ColumnPicker,
  useColumnPreferences,
  type ColumnDef,
} from '@/components/ui/table-columns'
import { WatchlistStar } from '@/components/watchlist/WatchlistStar'
import { useContent } from '@/components/locale/ContentProvider'
import { assetHref } from '@/lib/asset-routes'
import { usePhrase } from '@/components/locale/ContentProvider'

export type MarketSort = 'marketCap' | 'volume24h'
export type SortDirection = 'asc' | 'desc'

/** Liste de suivi de l'utilisateur, pour la colonne d'étoiles. */
export interface WatchlistContext {
  /** Faux sans compte ou sans base : l'étoile devient un lien vers la connexion. */
  available: boolean
  ids: string[]
}

interface MarketTableProps {
  assets: MarketAsset[]
  assetClass: AssetClass
  page: number
  perPage: number
  sortBy: MarketSort
  direction: SortDirection
  /** Le fournisseur sait-il trier sur l'ensemble du classement ? */
  sortable: boolean
  /** Pagination masquée pour les univers courts (devises, indices…). */
  paginated: boolean
  basePath: string
  /**
   * Période de variation à afficher, quand la page en propose un sélecteur.
   *
   * Absente, le tableau garde ses DEUX colonnes historiques (24 h et 7 j) : c'est le
   * comportement des cinq autres classes d'actifs, qui n'ont pas de sélecteur et
   * gagnent à montrer les deux fenêtres d'un coup d'œil. Présente, elle les remplace
   * par une colonne unique — empiler un sélecteur ET deux colonnes fixes ferait
   * afficher trois fois la même nature d'information.
   */
  period?: ChangePeriod
  /** Fournie, une colonne d'étoiles de suivi est ajoutée en fin de ligne. */
  watchlist?: WatchlistContext
  /**
   * Position de la colonne graphique.
   *
   * `inline` la place juste après la variation, au milieu du tableau — la courbe
   * illustre alors la variation qu'elle jouxte. `end` la renvoie en fin de ligne,
   * où elle se lit comme une vignette de complément.
   */
  chartPosition?: 'inline' | 'end'

  /* ── PORTÉE « Échangeables / Tous les actifs » ───────────────────────

     Les quatre champs voyagent ENSEMBLE ou pas du tout : l'appelant ne les fournit
     que là où le partage distingue réellement des lignes (voir `MarketBrowser`). Ils
     sont donc tous optionnels, et le groupe ne se rend que si `onScopeChange` est là.

     L'ÉTAT RESTE CHEZ L'APPELANT : c'est lui qui filtre la liste, ce tableau ne fait
     que rendre les deux boutons à côté du sélecteur de colonnes — l'endroit où les
     réglages d'affichage se regroupent. */
  scope?: 'tradable' | 'all'
  onScopeChange?: (scope: 'tradable' | 'all') => void
  tradableCount?: number
  totalCount?: number

  /**
   * Ce qui tient la GAUCHE de la rangée d'affichage, à défaut des portées.
   *
   * La rangée porte « Colonnes » à droite, et les portées à gauche quand elles ont un
   * sens. Là où elles n'en ont pas — la moitié des classes d'actifs — elle n'avait
   * plus qu'un `<span />` vide à gauche : une rangée entière pour un seul bouton.
   *
   * Ce passe-plat la laisse accueillir ce que l'appelant a de mieux à y mettre. En
   * pratique les vues rapides, qui gagnent ainsi une rangée sur les pages où les
   * portées manquent — voir `MarketBrowser`.
   *
   * IGNORÉ quand les portées sont fournies : les deux se disputeraient la même place,
   * et c'est aux portées qu'elle revient (elles commandent CE TABLEAU, là où les vues
   * rapides commandent la liste qu'on lui passe).
   */
  leadingSlot?: React.ReactNode

  /**
   * Ce qui précède « Personnaliser », au bord DROIT de la rangée d'affichage.
   *
   * En pratique le sélecteur de période — « 1 H · 24 h · 7 J · 1 M · 1 A ». Il vivait
   * une rangée plus haut, à côté de la recherche, et c'était la mauvaise voisine : la
   * période qualifie une COLONNE du tableau, exactement comme le choix des colonnes.
   * Les deux réglages se cherchent donc au même endroit, et la rangée du dessus n'a
   * plus à exister quand elle ne porte que les vues rapides.
   */
  trailingSlot?: React.ReactNode

  /* ── PAGINATION LOCALE ───────────────────────────────────────────────

     Les trois champs voyagent ENSEMBLE, et remplacent alors la pagination par liens :
     les crans appellent `onPageChange` au lieu de naviguer, et le compteur connaît le
     total puisque toutes les lignes reçues sont déjà là.

     C'est le mode de l'ACCUEIL, et sa raison tient en une phrase : lire un numéro de
     page dans l'URL rendrait cette page dynamique, donc sans cache partagé, et un
     appel amont par visiteur et par page — voir `CryptoBoard`. Les pages qui paginent
     VRAIMENT gardent les liens : leur page 2 sert d'autres lignes, pas les mêmes
     redécoupées. */
  total?: number
  onPageChange?: (page: number) => void
  onPerPageChange?: (perPage: number) => void
}

function buildHref(
  basePath: string,
  params: { page: number; sortBy: MarketSort; direction: SortDirection },
): string {
  const query = new URLSearchParams()
  if (params.page > 1) query.set('page', String(params.page))
  if (params.sortBy !== 'marketCap') query.set('tri', 'volume')
  if (params.direction !== 'desc') query.set('sens', 'asc')

  const search = query.toString()
  return search ? `${basePath}?${search}` : basePath
}

export function MarketTable({
  assets,
  assetClass,
  page,
  perPage,
  sortBy,
  direction,
  sortable,
  paginated,
  basePath,
  period,
  watchlist,
  chartPosition = 'end',
  scope,
  onScopeChange,
  tradableCount,
  totalCount,
  leadingSlot,
  trailingSlot,
  total,
  onPageChange,
  onPerPageChange,
}: MarketTableProps) {
  const fr = useContent()
  const t = usePhrase()
  /**
   * Colonnes déduites de la donnée réellement présente.
   *
   * Une paire de devises n'a ni capitalisation ni volume, un contrat à terme n'a pas
   * de capitalisation. Plutôt que d'aligner des « — » sur toute une colonne, on ne
   * l'affiche pas du tout : c'est la traduction en tableau de la règle §5, et cela
   * évite d'écrire une exception par classe d'actif.
   */
  const has = (field: keyof MarketAsset) => assets.some((asset) => asset[field] !== undefined)
  const showMarketCap = has('marketCap')
  const showVolume = has('volume24h')
  const showChart = has('sparkline7d')
  const showRank = has('rank')
  const isForex = assetClass === 'forex'

  /**
   * Colonne de variation : une seule pilotée par le sélecteur, ou les deux fenêtres
   * fixes historiques. La seconde branche reste le défaut des classes sans sélecteur.
   */
  const selected = period ? periodMeta(period) : null
  const show7d = !selected && has('change7d')

  /**
   * FENÊTRES SECONDAIRES — 1 h, 7 j et 30 j À CÔTÉ de la variation principale.
   *
   * ── CE QUI MANQUAIT ────────────────────────────────────────────────────────
   *
   * Le tableau ne montrait qu'UNE variation à la fois, celle du sélecteur de période.
   * Comparer l'heure écoulée au mois écoulé — la lecture qui distingue un sursaut
   * d'une tendance — imposait deux allers-retours et de retenir les chiffres entre
   * les deux. C'est précisément ce qu'une colonne évite.
   *
   * ── DÉRIVÉES DE `CHANGE_PERIODS`, PAS REDÉCLARÉES ─────────────────────────
   *
   * Cette table porte déjà la clé, le libellé, le libellé long et le CHAMP de chaque
   * fenêtre. En réécrire trois ici aurait créé un second endroit où la période « 30 j »
   * est nommée, et les deux auraient divergé au premier renommage. Les intitulés de
   * colonnes sont donc EXACTEMENT ceux des puces du sélecteur, ce qui est aussi ce
   * qu'on veut à l'écran : le lecteur reconnaît « 1 H » d'un endroit à l'autre.
   *
   * ── LA PÉRIODE ACTIVE EST RETIRÉE, ET C'EST LE POINT DÉLICAT ──────────────
   *
   * La colonne principale porte déjà la fenêtre choisie. Sans ce retrait, choisir
   * « 7 J » afficherait « Variation (7 J) » suivie d'une colonne « 7 J » identique,
   * chiffre pour chiffre. Le doublon n'apparaîtrait que sur deux des cinq crans — le
   * genre de défaut qu'une relecture rapide ne voit pas.
   *
   * `1y` n'est pas proposée : à côté de trois fenêtres courtes, une variation annuelle
   * change d'ordre de grandeur et écrase la lecture des autres. Elle reste accessible
   * par le sélecteur, où elle est seule.
   */
  const extraPeriods = selected
    ? CHANGE_PERIODS.filter(
        (entry) => entry.key !== selected.key && entry.key !== '1y' && has(entry.field),
      )
    : []

  // La colonne graphique se place à un seul des deux endroits, jamais aux deux.
  const chartInline = showChart && chartPosition === 'inline'
  const chartAtEnd = showChart && chartPosition === 'end'
  const followed = new Set(watchlist?.ids ?? [])

  /**
   * Amplitude 24 h — colonne propre aux classes SANS capitalisation.
   *
   * Yahoo ne publie pas la capitalisation des actions, ETF, indices et matières
   * premières (elle vit dans `quoteSummary`, fermé aux clients non authentifiés).
   * Leur tableau perdait donc une colonne sans rien gagner en échange. L'amplitude
   * du jour est en revanche disponible, et c'est une information utile sur ces
   * classes : elle situe le cours dans la séance.
   *
   * Elle n'est pas affichée en plus de la capitalisation mais À SA PLACE — empiler
   * les deux ferait déborder le tableau sur mobile sans bénéfice de lecture.
   */
  const showDayRange = !showMarketCap && has('high24h') && has('low24h')

  /**
   * ── LES COLONNES DÉCLARÉES, ET CE QUE LA LISTE CONTIENT VRAIMENT ──────────
   *
   * Elle ne liste QUE les colonnes que cette classe d'actifs possède réellement :
   * une paire de devises n'a pas de capitalisation, et proposer de l'afficher
   * offrirait de cocher une case qui ne changerait rien. Le sélecteur décrit donc ce
   * tableau-ci, pas un tableau générique.
   *
   * `locked` sur le nom et le cours : ce sont les deux colonnes sans lesquelles une
   * ligne cesse d'identifier quoi que ce soit. On peut tout retirer autour.
   */
  const columns: ColumnDef[] = [
    ...(showRank ? [{ id: 'rank', label: fr.market.columns.rank }] : []),
    { id: 'name', label: fr.market.columns.name, locked: true },
    { id: 'price', label: fr.market.columns.price, locked: true },
    {
      id: 'change24h',
      label: selected
        ? `${fr.market.columns.variation} (${selected.label})`
        : fr.market.columns.change24h,
    },
    ...(show7d ? [{ id: 'change7d', label: fr.market.columns.change7d }] : []),
    /* `period:` en préfixe d'identifiant : la clé de préférence est partagée avec les
       autres colonnes, et un `id` nu valant « 7d » pourrait un jour heurter celui d'une
       colonne sans rapport. Le préfixe rend la famille reconnaissable au débogage. */
    ...extraPeriods.map((entry) => ({ id: `period:${entry.key}`, label: entry.label })),
    ...(showChart ? [{ id: 'chart', label: fr.market.columns.chart }] : []),
    ...(showVolume ? [{ id: 'volume', label: fr.market.columns.volume }] : []),
    ...(showMarketCap ? [{ id: 'marketCap', label: fr.market.columns.marketCap }] : []),
    ...(showDayRange ? [{ id: 'dayRange', label: fr.market.columns.dayRange }] : []),
  ]

  /* La clé porte la CLASSE D'ACTIF : quelqu'un qui masque la capitalisation sur les
     cryptomonnaies ne demande pas la même chose sur les devises, et une clé commune
     ferait voyager un choix d'un tableau à un autre sans qu'il l'ait dit. */
  const prefs = useColumnPreferences(`marches:${assetClass}`, columns)

  /* Le tri de ce tableau vit dans l'URL — la pagination est servie par le serveur,
     qui doit connaître le critère. Le menu d'en-tête NAVIGUE donc au lieu de trier en
     mémoire, ce qui préserve le partage par lien que les autres tableaux n'ont pas. */
  const router = useRouter()

  function onSort(key: string, nextDirection: 'asc' | 'desc') {
    router.push(
      buildHref(basePath, { page: 1, sortBy: key as MarketSort, direction: nextDirection }),
    )
  }

  const sortState = { key: sortBy as string, direction }

  const shows = {
    rank: showRank && prefs.isVisible('rank'),
    change7d: show7d && prefs.isVisible('change7d'),
    chartInline: chartInline && prefs.isVisible('chart'),
    chartAtEnd: chartAtEnd && prefs.isVisible('chart'),
    volume: showVolume && prefs.isVisible('volume'),
    marketCap: showMarketCap && prefs.isVisible('marketCap'),
    dayRange: showDayRange && prefs.isVisible('dayRange'),
    change24h: prefs.isVisible('change24h'),
  }

  /* Filtré ICI plutôt qu'au rendu : l'en-tête et le corps doivent parcourir
     EXACTEMENT la même liste, sinon les cellules se décalent d'une colonne sur les
     lignes où l'une des deux diverge. Une seule source, deux lectures. */
  const visibleExtras = extraPeriods.filter((entry) => prefs.isVisible(`period:${entry.key}`))

  return (
    <div className="space-y-3">
      {/* Les réglages d'affichage sur UNE rangée, au-dessus du tableau : la portée à
          gauche, les colonnes à droite. Tous deux disent ce qu'on montre — l'un en
          lignes, l'autre en colonnes — et se cherchent donc au même endroit. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onScopeChange ? (
          <div
            /* Fond plein et non contour — même raison que le groupe de périodes, voir
               `MarketBrowser`. */
            className="flex items-center gap-1 rounded-control bg-surface-muted p-0.5"
            role="group"
            aria-label="Portée"
          >
            <ScopeButton
              active={scope === 'tradable'}
              onClick={() => onScopeChange('tradable')}
              count={tradableCount ?? 0}
              title="Seuls les actifs dont la source publie un volume sur 24 heures"
            >
              {t("Échangeables")}
            </ScopeButton>
            <ScopeButton
              active={scope !== 'tradable'}
              onClick={() => onScopeChange('all')}
              count={totalCount ?? assets.length}
              title={t("Tous les actifs de cette page, volume publié ou non")}
            >
              {t("Tous les actifs")}
            </ScopeButton>
          </div>
        ) : (
          /* Sans portée, la gauche revient à ce que l'appelant y pose — en pratique
             les vues rapides, descendues d'une rangée (voir `leadingSlot`). Le
             `<span />` de repli n'est pas décoratif : `justify-between` sur un enfant
             unique collerait le sélecteur de colonnes à gauche, alors qu'on le cherche
             au bord droit. */
          (leadingSlot ?? <span />)
        )}

        {/* La période et le choix des colonnes forment un seul bloc à droite : ce sont
            les deux réglages qui décrivent CE QUE LE TABLEAU MONTRE, l'un en fenêtre
            de variation, l'autre en colonnes. */}
        <div className="flex flex-wrap items-center gap-2">
          {trailingSlot}
          <ColumnPicker prefs={prefs} scopeLabel={fr.assetClass[assetClass]} />
        </div>
      </div>
      {/*
        ── COLONNES PRIORITAIRES PLUTÔT QUE DÉFILEMENT HORIZONTAL ──────────────

        Le tableau imposait 640 px de large à toutes les tailles d'écran. Sur un
        téléphone de 393 px, cela voulait dire faire glisser le tableau pour lire le
        prix — un geste que beaucoup ne découvrent jamais, et que Safari iOS gère mal
        dès qu'il est imbriqué dans le défilement vertical de la page.

        Sous `sm`, le minimum tombe : le tableau TIENT dans l'écran, avec trois
        colonnes seulement — l'actif, son cours, sa variation. C'est ce que montrent
        OKX et CoinGecko sur mobile, et c'est ce que quelqu'un vient chercher.

        Rien n'est PERDU : chaque colonne masquée reste sur la fiche de l'actif, à un
        clic de là. Un tableau tronqué qui l'annonce vaut mieux qu'un tableau complet
        qu'on ne peut pas atteindre.
      */}
      {/*
        LE CONTOUR DE LA CARTE EST RETIRÉ, et ce n'est pas un simple allègement.

        Le tableau vivait dans un cadre bordé, posé dans une page elle-même bordée de
        sections : trois filets parallèles se croisaient à chaque coin sans qu'aucun
        ne sépare quoi que ce soit. Les lignes du tableau font déjà la grille, et
        c'est le rôle d'un tableau de la faire. Le fond `surface` suffit à détacher le
        bloc de la page.
      */}
      {/*
        `overflow-x-clip` ET NON `overflow-x-auto` — c'est ce qui rend l'en-tête
        collant possible, et le détail mérite d'être écrit parce qu'il se défait tout
        seul à la première relecture distraite.

        `overflow-x: auto` fait de ce bloc un CONTENEUR DE DÉFILEMENT, et sur les DEUX
        axes : la spécification impose que `overflow-y: visible` calcule en `auto` dès
        que l'autre axe ne l'est pas. Or un élément `sticky` se cale sur son plus
        proche ancêtre défilant. L'en-tête se serait donc collé au haut de CE bloc —
        qui ne défile jamais verticalement, sa hauteur épousant son contenu — et
        n'aurait bougé sur aucun défilement de page. Le réglage aurait été inerte, sans
        rien signaler.

        `clip` coupe le débordement horizontal sans créer de conteneur de défilement :
        l'ancêtre défilant redevient la PAGE, et `sticky top-0` fonctionne.

        ── `@container` : LES SEUILS DE COLONNE SUIVENT CE BLOC, PAS LA FENÊTRE ──

        Les colonnes secondaires se retiraient sur `sm:` / `md:` / `lg:`, c'est-à-dire
        sur la largeur de la FENÊTRE. Tant que ce tableau occupait toute la page, les
        deux largeurs se confondaient et la règle marchait par coïncidence.

        L'accueil le pose désormais dans une colonne, à côté du fil d'actualités : la
        fenêtre disait `xl` — donc toutes les colonnes — pendant que le bloc n'en avait
        pas la largeur. Le volume et la capitalisation passaient sous le `clip`, coupés
        net. Mesurer le CONTENEUR répond juste dans les deux cas : en pleine largeur il
        vaut la fenêtre et rien ne change, en colonne les colonnes cèdent quand la
        colonne rétrécit — ce qu'elles auraient toujours dû faire.

        ── LES QUATRE SEUILS SONT MESURÉS, PAS TRADUITS ───────────────────────

        790 / 870 / 1100 / 1240 ne sont PAS la conversion des anciens `sm` / `md` / `lg` :
        convertir un seuil de fenêtre en seuil de conteneur donne un nombre faux dans les
        deux sens. Ils sont relevés au navigateur, en bridant le conteneur à 200 px et en
        lisant la largeur min-content du tableau, groupe par groupe :

                                            accueil     /marches, /crypto
            actif, cours, variation           424 px          611 px
            + rang, capitalisation            557 px          756 px
            + volume 24 h                     644 px          842 px
            + 1 h, 7 j, 1 M, amplitude        871 px        1 076 px
            + courbe 7 jours                1 007 px        1 212 px

        ⚠️ LES SEUILS SUIVENT LA COLONNE DE DROITE, la plus large des deux. Un même
        composant sert les deux pages, et calibrer sur l'accueil couperait les colonnes
        de `/marches` — dont les en-têtes portent en plus des boutons de tri, d'où les
        ~190 px d'écart constant. La contrepartie est que l'accueil retire ses colonnes
        un peu plus tôt qu'il n'aurait besoin ; c'est le sens sûr de l'erreur, et le
        sélecteur « Colonnes » rend la main au lecteur qui préfère l'autre arbitrage.

        L'ORDRE des groupes est celui de la valeur d'usage : la capitalisation avant le
        volume, le volume avant les fenêtres de comparaison, la courbe en dernier —
        c'est la plus large et la plus redondante, la variation qu'elle jouxte dit déjà
        son sens.

        ⚠️ L'EN-TÊTE ET LE CORPS PORTENT LES MÊMES SEUILS, colonne par colonne. Ils
        vivent à deux endroits du fichier et rien ne les lie : les désaccorder décale les
        cellules d'une colonne sans erreur ni avertissement, et le tableau affiche alors
        un cours dans la colonne « volume ».

        Ce sont des mesures, pas une règle : ajouter une colonne demande de les reprendre.
      */}
      {/*
        ── LE FOND DU TABLEAU EST RETIRÉ, ET C'EST LE FOND DE PAGE QUI PORTE ──

        Le bloc posait une plaque `surface` sous les lignes, plus claire que la page.
        Sur une page qui aligne plusieurs listes, ces plaques se lisaient comme autant
        de cartes flottantes, et chacune redécoupait la largeur au lieu de la laisser
        courir. La référence — CoinGecko — ne pose aucune plaque : ses lignes sont
        posées à même la page, et ce sont les FILETS qui font la grille.

        Les filets sont déjà là (`divide-y` sur le corps, filet bas de l'en-tête), et
        rien ne dépendait de la plaque pour le contraste : le texte s'écrit sur `ink`,
        lisible sur `canvas` comme sur `surface`.

        ⚠️ L'EN-TÊTE COLLANT, LUI, GARDE UN FOND OPAQUE, et il doit désormais valoir
        `canvas` et non `surface` : c'est la page qui défile sous lui.
      */}
      <div className="@container overflow-x-clip">
        {/*
          LE DÉFILEMENT DE SECOURS VIT SUR CE BLOC-CI, ET SUR LUI SEUL.

          Le raisonnement du `clip` ci-dessus tenait pour autant que le tableau NE
          DÉBORDE PAS aux petites largeurs. `audit-responsive` dit le contraire, et le
          disait déjà : le jeu minimal — actif, cours, variation — réclame 424 px sur
          l'accueil et 611 px sur `/marches`, quand un téléphone en offre 350. Le cours
          et la variation passaient donc sous le `clip`, coupés net et sans rien pour les
          rattraper. Un tableau de cotations qui masque le cours n'en est plus un, et ces
          trois colonnes ne se compriment pas davantage : ce n'est pas un réglage à
          trouver, c'est la largeur du texte. Le seul choix restant est entre COUPER et
          FAIRE DÉFILER, et couper un cours n'est pas un choix.

          ⚠️ LES DEUX ÉTATS VIVENT SUR DEUX ÉLÉMENTS, et c'est obligatoire. Écrire
          `overflow-x-auto @min-[790px]:overflow-x-clip` sur le MÊME élément ne marche
          pas : les deux utilitaires ont la même spécificité, l'ordre d'émission décide,
          et la variante de conteneur arrive AVANT la règle nue. `overflow-x` valait donc
          `auto` à toutes les largeurs, `overflow-y` passait à `auto` avec lui, et
          l'en-tête collant — désormais calé sur un bloc qui ne défile pas verticalement
          — se posait en travers de la première ligne. Relevé à l'écran, pas déduit.

          Un seul utilitaire d'`overflow` par élément, donc : le bloc parent CLIPPE
          toujours, ce qui garde la page comme ancêtre défilant et l'en-tête collant
          fonctionnel ; celui-ci ne reçoit `auto` que sous 790 px, où il n'a rien à
          écraser. Sous ce seuil le collage cesse d'opérer, et c'est là qu'il ne coûte
          rien : sur un téléphone on défile la page, pas une grille de onze colonnes.
        */}
        <Table
          containerClassName="overflow-visible @max-[789px]:overflow-x-auto"
          className="border-collapse @min-[640px]:min-w-[640px]"
        >
          <caption className="sr-only">{fr.assetClass[assetClass]}</caption>

          {/*
            EN-TÊTE COLLANT — sur cinquante lignes, la question « quelle colonne est-ce
            déjà ? » se pose dès le vingtième actif, et y répondre imposait de remonter
            en haut puis de redescendre en cherchant sa ligne.

            LE DÉCALAGE N'EST PAS `top-0`, ET C'EST L'ERREUR À NE PAS REFAIRE.
            L'en-tête du site est lui-même `sticky top-0`, avec un `z-index` de 50 :
            posé à `top-0`, celui du tableau se collait EXACTEMENT DESSOUS, donc
            derrière, et restait invisible à tout défilement. Il fonctionnait, on ne le
            voyait jamais, et rien ne le disait.

            `--header-height` vient de globals.css et sert AUSSI de hauteur à `NavBar` :
            les deux ne peuvent pas diverger. Le `+ 1px` est le filet du bas de
            l'en-tête, hors de sa hauteur de boîte — sans lui, une lisière de ligne
            défilante affleure au-dessus des intitulés.

            `z-10` reste sous le 50 de l'en-tête du site : la hiérarchie de recouvrement
            suit celle des décalages.

            Le fond est OBLIGATOIRE et non décoratif : sans lui, les lignes défileraient
            visiblement sous un en-tête transparent.
          */}
          <TableHeader className="sticky top-[calc(var(--header-height)+1px)] z-10 bg-canvas [&_tr]:border-b-0">
            <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
              {/* Le rang coûte quarante pixels pour redire ce que l'ORDRE des lignes
                  dit déjà. Il part le premier. */}
              {/* L'étoile a sa propre colonne, sans en-tête : un intitulé « Suivi »
                  sur trente pixels serait tronqué, et la forme de l'étoile dit déjà ce
                  que la colonne fait. Le libellé vit dans le `aria-label` de chaque
                  bouton, où il est nominatif — « Suivre Bitcoin » plutôt que « Suivi ». */}
              {watchlist ? (
                <th scope="col" className="w-8 px-1 py-2.5">
                  <span className="sr-only">{fr.market.columns.watch}</span>
                </th>
              ) : null}

              {shows.rank ? (
                <ColumnHeader
                  label={fr.market.columns.rank}
                  columnId="rank"
                  columnPrefs={prefs}
                  align="left"
                  className="hidden @min-[790px]:table-cell"
                />
              ) : null}
              <ColumnHeader
                label={fr.market.columns.name}
                columnId="name"
                columnPrefs={prefs}
                align="left"
              />
              <ColumnHeader label={fr.market.columns.price} columnId="price" columnPrefs={prefs} />
              {shows.change24h ? (
                <ColumnHeader
                  label={
                    selected
                      ? `${fr.market.columns.variation} (${selected.label})`
                      : fr.market.columns.change24h
                  }
                  columnId="change24h"
                  columnPrefs={prefs}
                />
              ) : null}
              {shows.change7d ? (
                <ColumnHeader
                  label={fr.market.columns.change7d}
                  columnId="change7d"
                  columnPrefs={prefs}
                  className="hidden @min-[790px]:table-cell"
                />
              ) : null}
              {/* Masquées sous `md` et non sous `sm` : elles arrivent APRÈS la variation
                  principale, qui tient déjà la place disponible sur un téléphone. Ce
                  sont des colonnes de comparaison, les premières à céder. */}
              {visibleExtras.map((entry) => (
                <ColumnHeader
                  key={entry.key}
                  label={entry.label}
                  columnId={`period:${entry.key}`}
                  columnPrefs={prefs}
                  className="hidden @min-[1100px]:table-cell"
                />
              ))}
              {shows.chartInline ? (
                <ColumnHeader
                  label={fr.market.columns.chart}
                  columnId="chart"
                  columnPrefs={prefs}
                  align="left"
                  className="hidden @min-[1240px]:table-cell"
                />
              ) : null}
              {shows.volume ? (
                <ColumnHeader
                  label={fr.market.columns.volume}
                  columnId="volume"
                  columnPrefs={prefs}
                  /* `sortKey` n'est fourni que si le fournisseur sait trier sur
                     l'ENSEMBLE du classement. Sinon le menu n'offre pas le tri plutôt
                     que d'en offrir un qui ne réordonnerait que la page courante. */
                  sortKey={sortable ? 'volume24h' : undefined}
                  sort={sortable ? sortState : null}
                  onSort={onSort}
                  hint={fr.market.sortByVolume}
                  className="hidden @min-[870px]:table-cell"
                />
              ) : null}
              {shows.marketCap ? (
                <ColumnHeader
                  label={fr.market.columns.marketCap}
                  columnId="marketCap"
                  columnPrefs={prefs}
                  sortKey={sortable ? 'marketCap' : undefined}
                  sort={sortable ? sortState : null}
                  onSort={onSort}
                  hint={fr.market.sortByMarketCap}
                  className="hidden @min-[790px]:table-cell"
                />
              ) : null}
              {shows.dayRange ? (
                <ColumnHeader
                  label={fr.market.columns.dayRange}
                  columnId="dayRange"
                  columnPrefs={prefs}
                  className="hidden @min-[1100px]:table-cell"
                />
              ) : null}
              {shows.chartAtEnd ? (
                <ColumnHeader
                  label={fr.market.columns.chart}
                  columnId="chart"
                  columnPrefs={prefs}
                  className="hidden @min-[1240px]:table-cell"
                />
              ) : null}
            </tr>
          </TableHeader>

          <TableBody className="divide-y divide-border-subtle">
            {assets.map((asset) => {
              const href = assetHref(asset.assetClass, asset.id)

              return (
                /*
                  ── LE CLIC DROIT OUVRE LES ACTIONS DE LA LIGNE ────────────────

                  Le geste existe dans tous les tableurs et dans la plupart des
                  plateformes de marché, et il ne coûte rien à qui l'ignore : le menu
                  contextuel du navigateur reste accessible partout ailleurs sur la
                  page, et aucune commande n'existe ICI SEULEMENT.

                  C'est la règle qui rend l'ajout légitime plutôt que piégeux : les
                  trois entrées — ouvrir, ouvrir dans un onglet, copier le symbole —
                  ont toutes un équivalent atteignable au clavier et au doigt. Le menu
                  raccourcit un chemin, il n'en crée pas d'exclusif.

                  ⚠️ `asChild` SUR UN `<tr>` : Radix pose ses gestionnaires sur la
                  ligne elle-même. Sans lui, il rendrait un `<div>` entre le `<tbody>`
                  et le `<tr>`, ce que le modèle de tableau HTML interdit — le
                  navigateur le remonterait hors du tableau et la ligne perdrait son
                  alignement de colonnes.
                */
                <ContextMenu key={asset.id}>
                  <ContextMenuTrigger asChild>
                <tr className="group transition-colors hover:bg-surface-muted/60">
                  {/*
                    L'ÉTOILE OUVRE LA LIGNE, DEVANT LE RANG.

                    Elle fermait la ligne, tout à droite, après le graphique : c'est
                    l'endroit où CoinGecko la mettait autrefois et où plus personne ne
                    la met. Le geste « je garde un œil là-dessus » se fait en PARCOURANT
                    la colonne des noms, de haut en bas ; une commande placée à huit
                    cents pixels de là oblige à traverser le tableau pour chaque ligne.

                    Elle reste visible à toutes les largeurs, contrairement au rang :
                    c'est la seule cellule ACTIONNABLE de la ligne, et la masquer sur
                    téléphone retirerait la fonction plutôt qu'une information.
                  */}
                  {watchlist ? (
                    <td className="px-1 py-2.5">
                      <WatchlistStar
                        assetClass={asset.assetClass}
                        assetId={asset.id}
                        label={asset.name}
                        symbol={asset.symbol}
                        path={basePath}
                        initialFollowing={followed.has(asset.id)}
                        available={watchlist.available}
                      />
                    </td>
                  ) : null}

                  {shows.rank ? (
                    <td className="tabular hidden px-2 py-2.5 @min-[790px]:px-3 text-xs text-ink-muted @min-[790px]:table-cell">
                      {asset.rank ?? '—'}
                    </td>
                  ) : null}

                  <th scope="row" className="px-2 py-2.5 @min-[790px]:px-3 text-left font-normal">
                    {/* Le lien porte sur le nom plutôt que sur la ligne entière : une
                        ligne cliquable empêche de sélectionner un chiffre à la souris
                        et n'est pas atteignable proprement au clavier.

                        `min-w-0` + `truncate` : à 393 px, « Wrapped liquid staked Ether »
                        pousserait la colonne bien au-delà de l'écran. Le nom se coupe,
                        le SYMBOLE reste — c'est lui qui identifie à coup sûr. */}
                    {/*
                      L'ABRÉVIATION EST POUSSÉE À DROITE DE LA COLONNE, et c'est la
                      seule façon de les aligner.

                      Elle suivait le nom à une gouttière fixe. Comme les noms vont de
                      « XRP » à « Wrapped liquid staked Ether », les symboles formaient
                      une colonne en dents de scie, et l'œil devait les chercher un par
                      un au lieu de les balayer.

                      `flex-1` sur le nom lui fait prendre toute la place restante :
                      le symbole se cale contre le bord droit de la colonne, qui est
                      le MÊME pour toutes les lignes puisqu'un tableau partage la
                      largeur de ses colonnes. L'alignement découle de la structure,
                      sans largeur écrite à la main qui se périmerait au premier nom
                      plus long.
                    */}
                    {/*
                      `prefetch={false}` — CINQUANTE LIGNES, CINQUANTE RENDUS SERVEUR.

                      Next précharge tout lien entrant dans le champ de vision (en
                      production seulement, d'où l'invisibilité en développement). Chaque
                      ligne mène ici à une fiche d'actif, route dynamique dont le rendu
                      interroge la source — et par le MÊME limiteur de débit que la page
                      en cours de lecture. Sur une page de cinquante lignes, le
                      préchargement affame donc le tableau qu'il est censé accélérer.

                      Le calcul est net : au plus un de ces cinquante liens sera cliqué.
                      On échange une navigation un peu moins instantanée contre quarante-
                      neuf rendus serveur épargnés. Voir OPTIMISATION.md, section
                      « Réseau ».
                    */}
                    {/*
                      ── L'APERÇU AU SURVOL RÉPARE LA TRONCATURE ────────────────

                      Le nom se coupe à la colonne — c'est nécessaire, sans quoi
                      « Wrapped liquid staked Ether » pousserait le tableau hors de
                      l'écran. Mais un nom coupé est une information PERDUE, et rien
                      ne permettait de la retrouver sans ouvrir la fiche.

                      `HoverCard` la rend au survol comme au focus clavier, avec les
                      deux chiffres qui n'ont pas de colonne à cette largeur. Ce n'est
                      pas une infobulle : elle s'ouvre après un délai, se laisse
                      survoler, et peut contenir une mise en page — trois choses qu'un
                      `title=""` ne fait pas.

                      ⚠️ IL NE PORTE AUCUNE ACTION. Radix ne le rend pas atteignable au
                      clavier autrement que par le lien qu'il enveloppe : tout ce qu'il
                      contient doit donc exister ailleurs. C'est le cas — la fiche
                      porte ces chiffres, l'aperçu ne fait que les avancer.
                    */}
                    <HoverCard openDelay={400} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <Link href={href} prefetch={false} className="flex min-w-0 items-center gap-3">
                          <AssetLogo asset={asset} size={24} />
                          <span className="min-w-0 flex-1 truncate font-medium text-ink group-hover:text-brand-strong">
                            {asset.name}
                          </span>
                          <span className="shrink-0 text-right text-xs uppercase text-ink-muted">
                            {asset.symbol}
                          </span>
                        </Link>
                      </HoverCardTrigger>

                      <HoverCardContent
                        align="start"
                        className="w-64 border-border-subtle bg-overlay p-3 shadow-overlay"
                      >
                        <div className="flex items-center gap-2.5">
                          <AssetLogo asset={asset} size={28} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{asset.name}</p>
                            <p className="text-xs uppercase text-ink-muted">{asset.symbol}</p>
                          </div>
                        </div>

                        <dl className="mt-3 space-y-1.5 text-xs">
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-ink-muted">{fr.market.columns.price}</dt>
                            <dd className="tabular font-medium text-ink">
                              <Money value={asset.price} from={asset.currency} />
                            </dd>
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-ink-muted">{fr.market.columns.marketCap}</dt>
                            <dd className="tabular font-medium text-ink">
                              <Money value={asset.marketCap} from={asset.currency} compact />
                            </dd>
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-ink-muted">{fr.market.columns.volume}</dt>
                            <dd className="tabular font-medium text-ink">
                              <Money value={asset.volume24h} from={asset.currency} compact />
                            </dd>
                          </div>
                        </dl>
                      </HoverCardContent>
                    </HoverCard>
                  </th>

                  <td className="tabular px-2 py-2.5 @min-[790px]:px-3 text-right font-medium text-ink">
                    <Money value={asset.price} from={asset.currency} asRate={isForex} />
                  </td>

                  {shows.change24h ? (
                  <td className="px-2 py-2.5 @min-[790px]:px-3 text-right">
                    <ChangeBadge
                      value={selected ? asset[selected.field] : asset.change24h}
                      // Hors sélecteur, la source peut déclarer couvrir autre chose
                      // que 24 h (la BCE ne publie qu'un taux par jour ouvré) : on
                      // reprend alors son libellé plutôt que d'affirmer « 24 h ».
                      periodLabel={selected ? selected.longLabel : asset.changePeriodLabel}
                      size="sm"
                    />
                  </td>
                  ) : null}

                  {shows.change7d ? (
                    <td className="hidden px-2 py-2.5 @min-[790px]:px-3 text-right @min-[790px]:table-cell">
                      <ChangeBadge value={asset.change7d} periodLabel="sur 7 jours" size="sm" />
                    </td>
                  ) : null}

                  {visibleExtras.map((entry) => (
                    <td key={entry.key} className="hidden px-2 py-2.5 @min-[790px]:px-3 text-right @min-[1100px]:table-cell">
                      {/* `periodLabel` vient de la table, pas d'une chaîne recopiée : c'est
                          lui que lisent les lecteurs d'écran (« en hausse de 3 % sur 30
                          jours »), et une fenêtre mal nommée y serait invisible à l'œil. */}
                      <ChangeBadge
                        value={asset[entry.field]}
                        periodLabel={entry.longLabel}
                        size="sm"
                      />
                    </td>
                  ))}

                  {shows.chartInline ? (
                    <td className="hidden px-2 py-2.5 @min-[790px]:px-3 @min-[1240px]:table-cell">
                      <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                    </td>
                  ) : null}

                  {shows.volume ? (
                    <td className="tabular hidden px-2 py-2.5 @min-[790px]:px-3 text-right text-ink-muted @min-[870px]:table-cell">
                      <Money value={asset.volume24h} from={asset.currency} compact />
                    </td>
                  ) : null}

                  {shows.marketCap ? (
                    <td className="tabular hidden px-2 py-2.5 @min-[790px]:px-3 text-right text-ink @min-[790px]:table-cell">
                      <Money value={asset.marketCap} from={asset.currency} compact />
                    </td>
                  ) : null}

                  {shows.dayRange ? (
                    <td className="tabular hidden px-2 py-2.5 @min-[790px]:px-3 text-right text-xs text-ink-muted @min-[1100px]:table-cell">
                      {asset.low24h !== undefined && asset.high24h !== undefined ? (
                        <>
                          <Money value={asset.low24h} from={asset.currency} asRate={isForex} />
                          <span aria-hidden="true"> – </span>
                          <Money value={asset.high24h} from={asset.currency} asRate={isForex} />
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}

                  {shows.chartAtEnd ? (
                    <td className="hidden px-2 py-2.5 @min-[790px]:px-3 text-right @min-[1240px]:table-cell">
                      <span className="inline-flex justify-end">
                        <Sparkline
                          values={asset.sparkline7d}
                          label={`Évolution de ${asset.name}`}
                        />
                      </span>
                    </td>
                  ) : null}

                  {/* L'étoile qui fermait la ligne a REJOINT SON DÉBUT — voir la note
                      à la première cellule. Elle n'existe plus ici. */}
                </tr>
                  </ContextMenuTrigger>

                  <ContextMenuContent className="w-56 border-border-subtle bg-overlay">
                    <ContextMenuLabel className="truncate text-xs text-ink-muted">
                      {asset.name}
                    </ContextMenuLabel>
                    <ContextMenuSeparator />

                    <ContextMenuItem onSelect={() => router.push(href)}>
                      {t('Ouvrir la fiche')}
                    </ContextMenuItem>

                    {/* `window.open` et non un `<a target="_blank">` : l'entrée de menu
                        n'est pas un lien, et Radix la ferme au choix. `noopener` évite
                        que la page ouverte n'accède à `window.opener`. */}
                    <ContextMenuItem
                      onSelect={() => window.open(href, '_blank', 'noopener,noreferrer')}
                    >
                      {t('Ouvrir dans un nouvel onglet')}
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem
                      onSelect={() => {
                        void navigator.clipboard?.writeText(asset.symbol.toUpperCase())
                      }}
                    >
                      {t('Copier le symbole')}
                      <ContextMenuShortcut className="uppercase">{asset.symbol}</ContextMenuShortcut>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {sortable ? <p className="text-xs text-ink-muted">{fr.market.sortNotSupported}</p> : null}

      {/*
        ── LE PIED EXISTE MÊME SANS PAGINATION ────────────────────────────────

        Il ne se rendait QUE sur les classes paginées, c'est-à-dire la crypto. Les six
        autres — actions, ETF, indices, devises, matières premières — refermaient leur
        tableau sur rien : ni décompte, ni borne, rien qui dise si les douze lignes
        affichées sont tout ce qui existe ou le début d'une liste plus longue.

        C'est la question qu'un pied de tableau répond en premier, avant même de
        proposer de tourner la page. `Pagination` la traite déjà seule : sans
        `hrefFor` ni `onPageChange`, elle n'affiche aucun bouton — juste
        « 12 matières premières ». Voir `counterText`, qui raccourcit de lui-même sur
        une page unique.

        ── LE TOTAL EST INCONNU SUR LES CLASSES PAGINÉES, ET LA BARRE LE SAIT ──

        La source pagine elle-même et ne renvoie jamais le nombre d'actifs qu'elle
        détient. `Pagination` reçoit donc `count` + `hasNext` plutôt que `total` : elle
        n'écrit pas « sur 12 500 » et ne numérote que les pages démontrées.

        `hasNext` se lit sur la PLÉNITUDE de la page. Une page pleine implique une
        suivante ; une page incomplète est la dernière. C'est la seule déduction que la
        réponse autorise, et elle est exacte — sauf au cas où le total serait un multiple
        exact de la taille de page, où l'on proposera une dernière page vide. Elle
        s'annoncera alors elle-même comme telle, ce qui reste préférable à masquer une
        page qui existe.

        Sur les classes NON paginées, l'univers entier tient dans la réponse : `total`
        est donc connu, et le compteur peut l'écrire.

        `hrefFor` et non un rappel : la page vit dans l'adresse, chaque cran est donc un
        vrai lien — ouvrable dans un onglet, indexable, fonctionnel sans JavaScript.
      */}
      {onPageChange ? (
        /* PAGINATION LOCALE : toutes les lignes sont déjà là, `total` est donc connu et
           le compteur écrit « 1 à 25 sur 100 » sans conjecture. Les crans appellent
           l'appelant plutôt que de naviguer — aucune adresse ne change, aucun rendu
           serveur n'est demandé. */
        <TablePagination
          page={page}
          perPage={perPage}
          total={total ?? assets.length}
          unit="actif"
          onPageChange={onPageChange}
          {...(onPerPageChange ? { onPerPageChange } : {})}
        />
      ) : paginated ? (
        /*
          ── DEUX PAGINATIONS PAR LIENS, SELON QUE LE TOTAL SOIT CONNU ─────────

          Il ne l'est pas chez CoinGecko, qui pagine lui-même sans jamais publier
          combien d'actifs il détient : le pied se limite alors à ce qu'il peut
          prouver — les lignes de cette page, et l'existence de la suivante si
          celle-ci est PLEINE. C'est la seule déduction que la réponse autorise.

          Il l'est pour les univers Yahoo, qui sont des listes écrites au dépôt. Le
          compteur peut donc dire « sur 99 » et la barre numéroter jusqu'à la
          dernière page, au lieu de proposer un pas à pas qui oblige à cliquer pour
          découvrir s'il reste quelque chose.
        */
        total !== undefined ? (
          <TablePagination
            page={page}
            perPage={perPage}
            total={total}
            unit="actif"
            hrefFor={(target) => buildHref(basePath, { page: target, sortBy, direction })}
          />
        ) : (
          <TablePagination
            page={page}
            perPage={perPage}
            count={assets.length}
            hasNext={assets.length >= perPage}
            unit="actif"
            hrefFor={(target) => buildHref(basePath, { page: target, sortBy, direction })}
          />
        )
      ) : (
        <TablePagination page={1} perPage={assets.length} total={assets.length} unit="actif" />
      )}
    </div>
  )
}

/**
 * Bouton de portée — « Échangeables » / « Tous les actifs ».
 *
 * Il vivait dans `MarketBrowser`, qui rendait les deux boutons dans sa propre rangée.
 * Il descend avec eux : c'est ce tableau qui les affiche désormais, à côté du sélecteur
 * de colonnes. L'ÉTAT, lui, reste chez l'appelant — c'est lui qui filtre la liste.
 */
function ScopeButton({
  active,
  onClick,
  count,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
        active ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:text-ink'
      }`}
    >
      {children}
      {/* Le décompte est DANS le bouton, comme chez la référence : il transforme un
          choix abstrait en information — on voit avant de cliquer combien de lignes
          l'autre portée retirerait. */}
      <span className="tabular text-[0.6875rem] text-ink-muted">{count}</span>
    </button>
  )
}

/*
 * `SortableHeader` VIVAIT ICI, et a été remplacé par `ColumnHeader`.
 *
 * Il rendait un `<Link>` dans un `<th>` : le tri était donc partageable par URL, ce
 * que le nouvel en-tête conserve en naviguant depuis son menu. Ce qu'il ne savait pas
 * faire, c'était offrir autre chose que le tri — masquer une colonne n'avait aucun
 * geste, et le sens du tri se devinait à une flèche.
 *
 * La perte réelle est le clic sans JavaScript, qu'un `<Link>` autorisait. Elle est
 * assumée : ce tableau est déjà un composant client, ses étoiles de suivi et son
 * sélecteur de période le sont aussi, et personne n'atteint cette page avec
 * JavaScript désactivé pour y trier une colonne.
 */
