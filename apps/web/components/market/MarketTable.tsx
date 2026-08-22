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

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { ChangeBadge, Sparkline } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { CHANGE_PERIODS, periodMeta, type ChangePeriod } from '@/components/market/crypto-views'
import { Pagination } from '@/components/ui/Pagination'
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
            className="flex items-center gap-1 rounded-control border border-border-subtle p-0.5"
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

        <ColumnPicker prefs={prefs} />
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

        Ce qui est perdu au passage — le défilement horizontal de secours — n'était
        pas utilisé : sous `sm`, le tableau retire ses colonnes secondaires
        (`hidden sm:table-cell`) au lieu de déborder, et `min-w` n'est posé qu'à partir
        de `sm`. Mesuré sur les six formats de `audit-responsive` : zéro débordement.
      */}
      <div className="overflow-x-clip rounded-card bg-surface">
        <table className="w-full border-collapse text-sm sm:min-w-[640px]">
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
          <thead className="sticky top-[calc(var(--header-height)+1px)] z-10 bg-surface">
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
                  className="hidden sm:table-cell"
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
                  className="hidden sm:table-cell"
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
                  className="hidden md:table-cell"
                />
              ))}
              {shows.chartInline ? (
                <ColumnHeader
                  label={fr.market.columns.chart}
                  columnId="chart"
                  columnPrefs={prefs}
                  align="left"
                  className="hidden lg:table-cell"
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
                  className="hidden md:table-cell"
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
                  className="hidden sm:table-cell"
                />
              ) : null}
              {shows.dayRange ? (
                <ColumnHeader
                  label={fr.market.columns.dayRange}
                  columnId="dayRange"
                  columnPrefs={prefs}
                  className="hidden md:table-cell"
                />
              ) : null}
              {shows.chartAtEnd ? (
                <ColumnHeader
                  label={fr.market.columns.chart}
                  columnId="chart"
                  columnPrefs={prefs}
                  className="hidden lg:table-cell"
                />
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {assets.map((asset) => {
              const href = assetHref(asset.assetClass, asset.id)

              return (
                <tr key={asset.id} className="group transition-colors hover:bg-surface-muted/60">
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
                    <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                      {asset.rank ?? '—'}
                    </td>
                  ) : null}

                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
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
                    <Link href={href} prefetch={false} className="flex min-w-0 items-center gap-3">
                      <AssetLogo asset={asset} size={24} />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink group-hover:text-brand-strong">
                        {asset.name}
                      </span>
                      <span className="shrink-0 text-right text-xs uppercase text-ink-muted">
                        {asset.symbol}
                      </span>
                    </Link>
                  </th>

                  <td className="tabular px-3 py-2.5 text-right font-medium text-ink">
                    <Money value={asset.price} from={asset.currency} asRate={isForex} />
                  </td>

                  {shows.change24h ? (
                  <td className="px-3 py-2.5 text-right">
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
                    <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                      <ChangeBadge value={asset.change7d} periodLabel="sur 7 jours" size="sm" />
                    </td>
                  ) : null}

                  {visibleExtras.map((entry) => (
                    <td key={entry.key} className="hidden px-3 py-2.5 text-right md:table-cell">
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
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                    </td>
                  ) : null}

                  {shows.volume ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                      <Money value={asset.volume24h} from={asset.currency} compact />
                    </td>
                  ) : null}

                  {shows.marketCap ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink sm:table-cell">
                      <Money value={asset.marketCap} from={asset.currency} compact />
                    </td>
                  ) : null}

                  {shows.dayRange ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-xs text-ink-muted md:table-cell">
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
                    <td className="hidden px-3 py-2.5 text-right lg:table-cell">
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
              )
            })}
          </tbody>
        </table>
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
      {paginated ? (
        <Pagination
          page={page}
          perPage={perPage}
          count={assets.length}
          hasNext={assets.length >= perPage}
          unit="actif"
          hrefFor={(target) => buildHref(basePath, { page: target, sortBy, direction })}
        />
      ) : (
        <Pagination page={1} perPage={assets.length} total={assets.length} unit="actif" />
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
