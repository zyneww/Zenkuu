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
import { Table, TableBody, TableHeader } from '@/components/ui/table'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { ChangeBadge, Sparkline, formatCompact, formatShare } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import type { BoardColumnSet } from '@/components/market/BoardTabs'
import { CHANGE_PERIODS, periodMeta, type ChangePeriod } from '@/components/market/crypto-views'
import { RowsPerPage, TablePagination } from '@/components/ui/TablePagination'
import { ColumnHeader } from '@/components/ui/table-columns'
import { WatchlistStar } from '@/components/watchlist/WatchlistStar'
import { useContent } from '@/components/locale/ContentProvider'
import { assetHref } from '@/lib/asset-routes'
import { fullyDilutedValuation, marketCapToFdvShare } from '@/lib/heatmap-metrics'
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

  /*
   * ── LA PORTÉE « Échangeables / Tous les actifs » A ÉTÉ RETIRÉE ──────────
   *
   * Deux boutons qui partageaient la page entre les actifs dont la source publie un
   * volume et les autres. Retirés sur demande : sur la moitié des classes d'actifs ils
   * ne séparaient rien (les deux décomptes étaient égaux), et sur les autres ils
   * occupaient à eux seuls le bord gauche d'une rangée qu'ils étaient les seuls à
   * remplir.
   */

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

  /* ── TRI EN MÉMOIRE ──────────────────────────────────────────────────
   *
   * Le tri de ce tableau passait UNIQUEMENT par l'URL : cliquer un en-tête naviguait,
   * le serveur retriait l'univers entier, la page revenait. C'est le bon mode pour un
   * classement paginé par la source — et le seul possible, puisque la page n'a qu'une
   * tranche des lignes sous la main.
   *
   * L'ACCUEIL est dans l'autre cas : ses cent lignes sont TOUTES là, et sa page ne lit
   * aucun paramètre d'adresse (voir `CryptoBoard` — c'est ce qui lui garde son cache
   * partagé). Les en-têtes y étaient donc muets, faute d'un tri qui ne recharge rien.
   *
   * Fournir `onSortChange` bascule le tableau dans ce mode : TOUTE colonne devient
   * triable, l'appelant garde l'état et réordonne la liste qu'il passe. `activeSort`
   * est ce qu'il a retenu — il colore le bon double chevron.
   */
  activeSort?: { key: string; direction: SortDirection } | null
  onSortChange?: (key: string, direction: SortDirection) => void

  /**
   * JEU DE COLONNES demandé par l'onglet actif — voir `BoardTabs`.
   *
   * ── CE QUE CHACUN MONTRE, ET CE QU'IL CACHE ────────────────────────────
   *
   *   `apercu`       le tableau d'origine : cours, variation, courbe, volume,
   *                  capitalisation. C'est le défaut, et les appelants qui n'ont pas
   *                  d'onglets n'ont rien à passer.
   *   `cotations`    la grille de MARCHÉ de la référence : rang, cours, variations
   *                  1 h / 24 h / 7 j / 1 M, volume, capitalisation, FDV, ratio et
   *                  courbe 7 jours. ⚠️ Elle décrivait une grille de SÉANCE — « haut
   *                  et bas du jour [...] le rang, la capitalisation, la courbe et les
   *                  fenêtres de comparaison s'effacent » — modelée sur MEXC. Voir la
   *                  note de `quotes` plus bas pour le relevé qui l'a corrigée.
   *   `performance`  les CINQ fenêtres de variation côte à côte — 1 h, 24 h, 7 j,
   *                  30 j, 1 an. Le volume s'efface pour leur faire de la place :
   *                  onze colonnes sur un écran de portable n'en affichent que six,
   *                  et ce sont les variations qu'on vient lire sur cet onglet.
   *   `ath`          le plus haut de tous les temps, sa date, et l'ÉCART qui l'en
   *                  sépare aujourd'hui. La variation 24 h et la courbe s'effacent :
   *                  cet onglet parle d'une échelle de plusieurs années, où une
   *                  vignette de sept jours n'apprend rien.
   *
   * ⚠️ L'écart au sommet est CALCULÉ, et c'est la seule valeur de ce tableau qui le
   * soit. Il l'est à partir de deux valeurs publiées par la source et exprimées dans
   * la même devise — c'est donc un rapport exact, du même ordre que la dominance de
   * la page des secteurs, et non une estimation.
   */
  /* Le type vient de `BoardTabs`, où les onglets le produisent, plutôt que d'être
     recopié ici : deux unions à tenir d'accord divergent au premier jeu ajouté, et la
     divergence se voit à la compilation d'un seul des deux côtés. */
  columnSet?: BoardColumnSet

  /**
   * Lignes sur lesquelles DÉDUIRE les colonnes, quand ce ne sont pas celles rendues.
   *
   * Les colonnes de ce tableau se déduisent de la donnée réellement présente : une
   * paire de devises n'a pas de capitalisation, on ne lui affiche pas la colonne.
   * Tant qu'un tableau rendait tout ce qu'il possédait, `assets` répondait.
   *
   * Il ne répond plus dès que l'appelant en pagine une TRANCHE. Deux défauts, et le
   * second est le plus visible : une page dont aucun actif ne publie de volume perd
   * la colonne pour cette page seulement — l'alignement change d'une page à l'autre ;
   * et une page distante encore vide n'a AUCUNE colonne, si bien que le tableau se
   * réduit à trois colonnes puis reprend sa largeur sous les yeux du lecteur.
   *
   * L'appelant passe donc l'univers entier, qui est ce dont il dispose. Absent, on
   * retombe sur les lignes rendues — le comportement d'origine.
   */
  columnSource?: MarketAsset[]
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
  leadingSlot,
  trailingSlot,
  total,
  onPageChange,
  onPerPageChange,
  activeSort,
  onSortChange,
  columnSet = 'apercu',
  columnSource,
}: MarketTableProps) {
  const fr = useContent()
  const t = usePhrase()

  const performance = columnSet === 'performance'
  const athView = columnSet === 'ath'
  /**
   * Grille de MARCHÉ — celle de la référence, colonne pour colonne.
   *
   * ⚠️ CETTE GRILLE ÉTAIT MODELÉE SUR MEXC, ET LA NOTE LE DISAIT. Elle affirmait :
   * « Relevée sur MEXC, dont c'est l'écran de place de marché », puis justifiait de
   * retirer le rang — « la référence n'en affiche pas » —, la capitalisation, la
   * courbe et les fenêtres 1 h / 7 j / 1 M.
   *
   * Relevé le 2026-08-30 sur le tableau d'accueil de coingecko.com, largeurs
   * comprises :
   *
   *     étoile 49 · # 66 · Coin 360 · Price 130 · 1h 99 · 24h 106 · 7d 110 ·
   *     30d · 24h Volume 208 · Market Cap 208 · FDV · Market Cap/FDV ·
   *     Last 7 Days 249
   *
   * Le rang EST là. La capitalisation aussi — et c'est la colonne la plus importante
   * d'une liste crypto, celle qui donne son sens au tri par défaut. La courbe
   * 7 jours ferme chaque ligne. Les quatre fenêtres de variation sont côte à côte.
   *
   * Ce qui PART, parce que la référence ne l'a pas : les deux bornes de séance
   * (haut et bas du jour). C'était l'apport revendiqué de la grille MEXC ; il n'a
   * pas d'équivalent ici, et les garder ajouterait deux colonnes à une ligne qui en
   * porte déjà douze.
   */
  const quotes = columnSet === 'cotations'
  /**
   * Grille de CATALOGUE — les classes d'actif NON crypto.
   *
   * Employée par les actions et les devises (voir `CryptoBoard`) et par
   * `MarketPageView` : une action n'a ni offre en circulation ni courbe 7 jours, et la
   * grille crypto lui alignerait des tirets.
   *
   * ⚠️ CETTE NOTE CITAIT CRYPTORANK COMME RÉFÉRENCE, et affirmait que « huit colonnes
   * est déjà ce que la référence aligne » pour justifier d'effacer les fenêtres 1 h,
   * 7 j et 1 M. C'était vrai de Cryptorank, pas de CoinGecko :
   * `/en/all-cryptocurrencies`, relevée le 2026-08-31, aligne DIX colonnes — rang,
   * monnaie, cours, 1 h, 24 h, 7 j, 30 j, volume, offre en circulation, offre TOTALE.
   *
   * Ce jeu n'est pas pour autant faux : il ne sert PAS la crypto, et les fenêtres
   * secondaires n'ont pas d'équivalent chez un fournisseur d'actions. Ce qui reste à
   * faire est ailleurs — `/crypto` emploie `cotations`, qui porte les fenêtres mais
   * pas l'offre. Voir `MIGRATION_RAPPORT.md`, section « Partiel ».
   */
  const catalogue = columnSet === 'catalogue'
  /**
   * Colonnes déduites de la donnée réellement présente.
   *
   * Une paire de devises n'a ni capitalisation ni volume, un contrat à terme n'a pas
   * de capitalisation. Plutôt que d'aligner des « — » sur toute une colonne, on ne
   * l'affiche pas du tout : c'est la traduction en tableau de la règle §5, et cela
   * évite d'écrire une exception par classe d'actif.
   */
  const detectOn = columnSource ?? assets
  const has = (field: keyof MarketAsset) => detectOn.some((asset) => asset[field] !== undefined)
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
        (entry) =>
          entry.key !== selected.key &&
          /* `1y` REVIENT SUR L'ONGLET « PERFORMANCE », et nulle part ailleurs.
             L'argument d'origine tient toujours pour l'aperçu : à côté de trois
             fenêtres courtes, une variation annuelle change d'ordre de grandeur et
             écrase la lecture des autres. Sur un onglet dont c'est le SUJET, la
             comparaison des échelles est justement ce qu'on vient chercher. */
          (performance || entry.key !== '1y') &&
          has(entry.field),
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
   * TROIS COLONNES POUR COMBLER L'ÉCART RELEVÉ FACE À COINGECKO — 30 j, FDV,
   * ratio capitalisation/FDV.
   *
   * ── POURQUOI `cotations` ET `apercu` SEULEMENT ──────────────────────────────
   *
   * `cotations` est la grille par défaut de l'accueil (voir `BoardTabs`), et c'est
   * exactement la vue que l'audit a lue en constatant l'écart. `apercu` est son
   * ancêtre direct, gardé pour les cinq classes non crypto. Ni `performance` (qui
   * affiche déjà les cinq fenêtres, 30 j comprise, via `extraPeriods`), ni `ath`, ni
   * `catalogue` — dont les huit colonnes reprennent délibérément la référence
   * Cryptorank — n'ont besoin de ce complément.
   *
   * ── 30 j : LA MÊME TABLE `CHANGE_PERIODS` QUE LE SÉLECTEUR, PAS UN LIBELLÉ RÉÉCRIT ─
   *
   * Redéclarer « 30 j » ici créerait un second endroit où cette fenêtre est nommée.
   * `visibleExtras` peut déjà porter la fenêtre 30 j quand un sélecteur de période est
   * actif hors `cotations`/`catalogue`/`ath` — on ne l'ajoute donc PAS deux fois.
   *
   * ── FDV ET RATIO SONT RÉUTILISÉS, PAS RÉÉCRITS ──────────────────────────────
   *
   * `fullyDilutedValuation` vit déjà dans `lib/heatmap-metrics.ts`, testée pour ses
   * cas limites (offre manquante, prix nul). Le ratio n'est qu'un rapport des deux,
   * et hérite donc de son `undefined` dès qu'un des deux termes manque — jamais un
   * zéro qui affirmerait « aucune dilution restante ».
   */
  const period30d = CHANGE_PERIODS.find((entry) => entry.key === '30d')!
  const wantsValuationExtras = (quotes || columnSet === 'apercu') && !catalogue
  const shows30d =
    wantsValuationExtras &&
    has('change30d') &&
    selected?.key !== '30d' &&
    /* ⚠️ LA GARDE EST INCONDITIONNELLE DEPUIS QUE `cotations` REND LES FENÊTRES.
       Elle visait `apercu` seul, et se justifiait ainsi : « `cotations` ne rend
       jamais `extraPeriods` (`visibleExtras` la vide), donc cette clause n'y change
       rien ». C'était vrai jusqu'au 2026-08-30 — la grille de marché rend désormais
       les quatre fenêtres de la référence, et l'invariant est tombé : la colonne
       « 1 M » s'affichait DEUX FOIS, une par `shows30d` et une par les fenêtres.
       Constaté au navigateur.

       La condition ne regarde donc plus le jeu de colonnes, mais le seul fait qui
       compte : cette fenêtre est-elle déjà servie ailleurs ? */
    !extraPeriods.some((entry) => entry.key === '30d')
  const showFdv =
    wantsValuationExtras && detectOn.some((asset) => fullyDilutedValuation(asset) !== undefined)
  const showFdvRatio = showFdv

  /*
   * ── LE SÉLECTEUR DE COLONNES A QUITTÉ CE TABLEAU ──────────────────────────
   *
   * « Personnaliser » ouvrait une modale à deux volets où l'on cochait les colonnes à
   * garder, et le choix survivait dans `localStorage`. Le bouton cède sa place au
   * SÉLECTEUR DE LIGNES, remonté du pied de tableau (demande explicite) — deux
   * réglages d'affichage ne pouvaient pas tenir le même bord.
   *
   * Ce qui décide des colonnes reste donc ce qui décidait déjà en pratique : la
   * largeur disponible, par les seuils `@min-[…]` plus bas. Le mécanisme lui-même
   * survit dans `table-columns.tsx` pour les tableaux qui l'emploient encore
   * (palmarès, trésoreries, places de dérivés).
   */

  /* Le tri de ce tableau vit dans l'URL quand la source pagine — elle doit connaître
     le critère pour trier l'univers entier et non la page affichée. L'en-tête NAVIGUE
     donc, ce qui garde les vues triées partageables et indexables. */
  const router = useRouter()

  function onSortViaUrl(key: string, nextDirection: 'asc' | 'desc') {
    router.push(
      buildHref(basePath, { page: 1, sortBy: key as MarketSort, direction: nextDirection }),
    )
  }

  const urlSortState = { key: sortBy as string, direction }

  /**
   * Ce qu'une colonne reçoit pour devenir triable — ou rien.
   *
   * ── TROIS RÉGIMES, ET UN SEUL ENDROIT QUI EN DÉCIDE ────────────────────────
   *
   * 1. `onSortChange` fourni : TOUTES les colonnes sont triables, en mémoire, chez
   *    l'appelant. C'est le régime de l'accueil, où les cent lignes sont déjà là.
   * 2. `sortable` : seules la capitalisation et le volume le sont, par l'URL — ce sont
   *    les deux seuls critères que la source sait appliquer à l'univers entier.
   * 3. Ni l'un ni l'autre : aucun en-tête ne bouge. Offrir un tri qui ne réordonnerait
   *    que la page affichée ferait passer « la plus forte hausse de cette page » pour
   *    « la plus forte hausse du classement ».
   *
   * ⚠️ Rendre l'objet plutôt qu'étaler trois props à chaque appel : quinze en-têtes
   * répéteraient la même condition, et la première oubliée deviendrait une colonne
   * silencieusement inerte.
   */
  function sortFor(key: string | undefined) {
    if (key === undefined) return {}
    if (onSortChange) return { sortKey: key, sort: activeSort ?? null, onSort: onSortChange }
    if (sortable && (key === 'marketCap' || key === 'volume24h')) {
      return { sortKey: key, sort: urlSortState, onSort: onSortViaUrl }
    }
    return {}
  }

  /** Champ de la variation principale — celui que trie la colonne du même nom. */
  const mainChangeField = selected ? selected.field : 'change24h'

  /*
   * ── LES TROIS JEUX DE COLONNES, DÉCIDÉS EN UN SEUL ENDROIT ────────────────
   *
   * Chaque ligne combine « la donnée existe-t-elle ? » et « cet onglet la veut-il ? ».
   * Les deux questions sont distinctes et doivent le rester : une colonne absente
   * faute de donnée et une colonne écartée par l'onglet se ressemblent à l'écran, mais
   * la première est une propriété de la source et la seconde un choix d'affichage.
   * Les mélanger plus haut ferait disparaître des colonnes pour la mauvaise raison.
   */
  const shows = {
    rank: showRank,
    change7d: show7d && !athView && !catalogue,
    chartInline: chartInline && !athView,
    chartAtEnd: chartAtEnd && !athView,
    volume: showVolume && !performance && !athView,
    marketCap: showMarketCap && !performance,
    dayRange: showDayRange && !performance && !athView && !quotes && !catalogue,
    /*
      L'OFFRE EN CIRCULATION N'EST PAS UN MONTANT, et c'est pourquoi elle ne passe pas
      par `Money`. C'est un NOMBRE DE JETONS — « 20,07 M » de bitcoins, pas vingt
      millions d'euros. Lui coller un symbole de devise en ferait la troisième colonne
      d'argent de la ligne, à côté de deux qui le sont vraiment, et un lecteur pressé
      lirait une capitalisation bis.

      Elle n'existe que pour la crypto : Yahoo ne publie pas d'offre pour les actions,
      les indices ou les devises. `has()` la retire donc d'elle-même sur les cinq
      autres classes, sans qu'une exception par classe soit écrite ici.
    */
    /* ⚠️ L'OFFRE RESTE AU SEUL `catalogue`, ET J'AI ESSAYÉ L'INVERSE. Je l'ai étendue
       à `quotes` en lisant que `/en/all-cryptocurrencies` la porte. Vérification au
       navigateur : elle est alors apparue sur l'ACCUEIL, qui emploie ce jeu — et leur
       accueil, lui, ne la porte pas. Quinze colonnes au lieu de treize.

       La bonne lecture : l'offre appartient à leur page de CATALOGUE
       (`/all-cryptocurrencies`), pas à leur accueil. Chez ZENKUU, `/crypto` emploie
       déjà `catalogue` et l'affiche donc — l'écart que je croyais combler n'existait
       pas. Vérifié : Bitcoin y rend « 20,1 M BTC ».

       Ce qui manque VRAIMENT est l'offre TOTALE, que leur catalogue porte en plus. Le
       champ existe (`totalSupply`) ; l'écart entre les deux offres est la dilution à
       venir, que `Cap./FDV` exprime déjà autrement. */
    supply: catalogue && has('circulatingSupply'),
    change24h: !athView,
    ath: athView && has('ath'),
    athDate: athView && has('athDate'),
    /*
      Les deux bornes de séance sont des colonnes SÉPARÉES ici, là où `dayRange` les
      réunit en « bas – haut » sur une seule. Ce n'est pas un doublon : `dayRange`
      existe pour les classes SANS capitalisation, où elle occupe la colonne libérée
      et où une fourchette compacte suffit. La grille de séance, elle, les aligne en
      deux colonnes triables — c'est ce que fait la référence, et c'est ce qui permet
      de classer par plus haut du jour.

      Les deux ne coexistent jamais : `dayRange` est éteinte ci-dessus quand `quotes`
      est vrai.
    */
    high24h: false,
    low24h: false,
    /*
      ── LA COLONNE « ACTION » N'EST PAS UN BOUTON D'ACHAT ────────────────────

      La référence y pose « **Buy** » — pas « Trade », comme cette note le disait
      avant le relevé du 2026-08-31 — et le place en TROISIÈME colonne, juste après
      le nom de l'actif. C'est un lien d'affiliation vers une plateforme d'échange.

      ZENKUU ne passe aucun ordre et n'en passera pas. Reprendre le mot serait
      promettre une fonction qui n'existe pas, et sa POSITION — troisième colonne,
      avant même le cours — dirait que l'achat est la première chose à faire d'une
      ligne de cotation. Le §7 du projet interdit tout signal d'achat ou de vente ;
      c'est le seul endroit du tableau où la fidélité de mise en page entre
      frontalement en conflit avec lui.

      L'action que cette ligne permet réellement est d'ouvrir la fiche de l'actif.
      Le bouton le dit — « Fiche » — c'est un LIEN, et il ferme la ligne au lieu de
      l'ouvrir.
    */
    action: quotes,
  }

  const visibleExtras = athView || catalogue ? [] : extraPeriods

  /*
   * ── L'ORDRE DES DEUX COLONNES D'AGRÉGAT, DÉCIDÉ ICI ET NULLE PART AILLEURS ──
   *
   * Cryptorank pose la capitalisation avant le volume, CoinGecko l'inverse, et les
   * deux jeux de colonnes de ce tableau suivent chacun sa référence. Écrire les deux
   * ordres à la main donnerait quatre blocs de JSX — deux en-têtes et deux cellules,
   * en double — dont la paire du bas se désaccorderait de celle du haut à la première
   * retouche. C'est exactement la faute que la note des seuils, plus bas, décrit.
   *
   * Un tableau de deux clés parcouru aux deux endroits rend la divergence impossible :
   * l'en-tête et la cellule lisent la MÊME liste, dans le même ordre.
   */
  const aggregates = (catalogue ? ['marketCap', 'volume'] : ['volume', 'marketCap']).filter(
    (key) => (key === 'volume' ? shows.volume : shows.marketCap),
  ) as ('volume' | 'marketCap')[]

  /* Le seuil de chaque colonne reste celui qu'elle avait — 870 px pour le volume,
     790 px pour la capitalisation — et il suit la colonne quand l'ordre s'inverse.
     C'est voulu : le seuil dit ce qu'une colonne COÛTE en largeur, pas où elle est
     posée. L'encre atténuée du volume aussi : la capitalisation ordonne la page, le
     volume la commente. */
  const aggregateMeta = {
    volume: {
      field: 'volume24h' as const,
      label: fr.market.columns.volume,
      hint: fr.market.sortByVolume,
      className: 'hidden @min-[870px]:table-cell',
      tone: 'text-ink-muted',
    },
    marketCap: {
      field: 'marketCap' as const,
      label: fr.market.columns.marketCap,
      hint: fr.market.sortByMarketCap,
      className: 'hidden @min-[790px]:table-cell',
      tone: 'text-ink',
    },
  }

  /*
   * Seuil d'apparition des fenêtres secondaires.
   *
   * Elles cèdent à 1 100 px sur l'aperçu, où elles sont un COMPLÉMENT posé à côté du
   * volume et de la capitalisation. Sur l'onglet « Performance » elles sont le
   * contenu : les masquer jusqu'à 1 100 px y afficherait un tableau à trois colonnes,
   * c'est-à-dire un onglet vide de ce qu'il annonce. Le volume et la capitalisation
   * ayant cédé leur place, la largeur est là.
   */
  const extraClass = performance
    ? 'hidden @min-[790px]:table-cell'
    : 'hidden @min-[1100px]:table-cell'

  /*
   * ── LES SEUILS DE LA GRILLE DE SÉANCE, ÉCRITS UNE FOIS ────────────────────
   *
   * ⚠️ L'en-tête et le corps DOIVENT porter la même chaîne, colonne par colonne :
   * ils vivent à cinq cents lignes d'écart et rien ne les lie. Les désaccorder décale
   * les cellules d'une colonne sans erreur ni avertissement — le tableau afficherait
   * alors un plus bas dans la colonne « volume ». D'où ces constantes plutôt que la
   * classe recopiée aux deux endroits, qui est la façon dont la faute arrive.
   *
   * L'ordre de cession suit la valeur d'usage. Le volume garde son seuil de 870 px,
   * partagé avec l'aperçu. Les deux bornes de séance cèdent plus tôt qu'elles ne le
   * pourraient — ce sont DEUX colonnes, et les faire apparaître une par une donnerait
   * une fourchette amputée, qui se lit plus mal qu'une fourchette absente.
   *
   * « Fiche » tient jusqu'à 790 px puis se retire : sous ce seuil la ligne entière est
   * déjà un lien par son nom, et la colonne ne ferait que reprendre 90 px à un cours.
   */
  const rangeClass = 'hidden @min-[1000px]:table-cell'
  const actionClass = 'hidden @min-[790px]:table-cell'
  /* L'offre cède avant la courbe (1 240 px) et après le volume (870) : c'est la
     colonne la moins consultée des huit, et la seule dont l'absence ne change pas la
     lecture des autres. */
  const supplyClass = 'hidden @min-[1100px]:table-cell'

  return (
    <div className="space-y-3">
      {/*
        ── LA RANGÉE D'OUTILS ────────────────────────────────────────────────

        Ce que l'appelant y pose à gauche — en pratique les vues rapides — et le
        SÉLECTEUR DE LIGNES à droite, remonté du pied de tableau à la place qu'y tenait
        « Personnaliser ».

        C'est un déplacement, pas un ajout : le pied ne porte plus que le compteur et
        les crans de page, c'est-à-dire les deux seules choses qui disent OÙ L'ON EN
        EST. Combien de lignes afficher est un réglage, et les réglages sont en haut.

        La rangée disparaît ENTIÈREMENT quand elle n'a rien à porter — ni vue rapide,
        ni période, ni sélecteur de lignes. Une bande vide au-dessus d'un tableau se
        lit comme un bloc qui n'a pas chargé.
      */}
      {leadingSlot || trailingSlot || onPerPageChange ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Le `<span />` de repli n'est pas décoratif : `justify-between` sur un
              enfant unique collerait le sélecteur de lignes à gauche, alors qu'on le
              cherche au bord droit. */}
          {leadingSlot ?? <span />}

          <div className="flex flex-wrap items-center gap-2">
            {trailingSlot}
            {onPerPageChange ? (
              <RowsPerPage perPage={perPage} onPerPageChange={onPerPageChange} />
            ) : null}
          </div>
        </div>
      ) : null}
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
        {/* ══════════════════════════════════════════════════════════════════════
            `table-fixed` — LE TABLEAU CESSE DE SAUTER AU CLIC

            Il était en disposition AUTOMATIQUE, celle du navigateur par défaut : chaque
            colonne se mesure alors sur son contenu, en parcourant toutes les lignes.
            Trier par « Variation (24 h) » remonte les extrêmes — « +1 876,98 % » là où
            se trouvait « 0,00 % » —, donc remesure les onze colonnes, donc décale la
            grille ENTIÈRE sous les yeux, au moment précis du clic. L'en-tête bougeait
            avec elle, et « Variation (24 h) » se repliait en deux lignes en changeant la
            hauteur de la rangée.

            En disposition FIXE, les largeurs se lisent sur la première rangée — les
            en-têtes — et le corps ne peut plus les faire bouger. Le tri réordonne les
            lignes sans toucher à la grille.

            Les largeurs viennent du relevé de la référence noté plus haut (étoile 49 ·
            # 66 · Coin 360 · Price 130 · 1h 99 · 24h 106 · 7d 110 · Volume 208 ·
            Market Cap 208), ramenées à l'échelle d'ici. Les colonnes qui n'en déclarent
            pas se partagent ce qui reste.

            `min-w-[980px]` et non 640 : en disposition fixe, une colonne trop étroite ne
            s'élargit plus pour son contenu — elle le tronque. Le seuil monte donc à la
            largeur que les onze colonnes demandent vraiment, et en dessous le conteneur
            défile, ce qu'il faisait déjà.
            ══════════════════════════════════════════════════════════════════════ */}
        <Table
          containerClassName="overflow-visible @max-[789px]:overflow-x-auto"
          className="table-fixed border-collapse @min-[640px]:min-w-[980px]"
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

            ⚠️ CET EN-TÊTE COLLANT EST UNE DIVERGENCE ASSUMÉE : LA RÉFÉRENCE N'EN A PAS.

            Relevé le 2026-08-31 sur leur accueil. Leur `thead` est en `position: static`
            (avec un `top: -1px` résiduel qui ne sert à rien), et leurs `th` portent bien
            `position: sticky` — mais avec `left: auto` et `top: auto`, donc sans ancrage :
            la déclaration est morte. Vérifié par le comportement plutôt que par la
            propriété, seul test qui tranche : après 2 500 px de défilement, leur en-tête
            est à −1 992 px. Il sort de l'écran.

            Leur `sticky` visait le figement HORIZONTAL des premières colonnes — étoile,
            rang, nom — et NON un en-tête collant. Deux mécaniques distinctes qu'il serait
            facile de confondre.

            ⚠️ MAIS IL NE S'ARME À AUCUNE LARGEUR, ET LA CAUSE EST UNE VARIABLE MANQUANTE.
            Leur feuille de style pose :

              .gecko-sticky-table td.gecko-sticky, .gecko-sticky-table th.gecko-sticky {
                left: calc(var(--gecko-prev-col-offset) + var(--gecko-sticky-offset));
                position: sticky;
              }

            `--gecko-sticky-offset` existe bien : il vaut 0px sur la table, et leur script
            l'ajuste en ligne par colonne (`--gecko-sticky-offset: -8px` sur « Coin »).
            `--gecko-prev-col-offset`, LUI, N'EST DÉFINI NULLE PART — ni dans les
            feuilles de style, ni en ligne. Un `calc()` dont une variable est absente est
            invalide au calcul, et `left` retombe sur sa valeur initiale : `auto`. Or un
            `position: sticky` sans ancrage ne fait rien.

            Vérifié des deux côtés, le 2026-08-31 : les 303 cellules porteuses de
            `.gecko-sticky` calculent toutes `left: auto` ; et en contraignant leur
            conteneur à 360 px puis en défilant de 300 px à l'horizontale, les cinq
            premières colonnes se déplacent de −300 px exactement, comme les autres. Rien
            ne tient.

            La fonctionnalité est donc entièrement construite chez eux — la classe est
            posée sur 303 cellules, le conteneur a son `overflow-x: auto`, le script
            renseigne une des deux variables — et elle ne produit rien. C'est un défaut de
            leur côté, pas une intention de mise en page. Il n'y a rien à reproduire ici.

            Le choix est gardé quand même. Sur cent lignes et quatorze colonnes, un
            intitulé qu'on ne voit plus oblige à remonter pour savoir ce qu'on lit ; rien
            dans la fidélité visuelle ne se perd puisque, tableau au repos, les deux sont
            identiques au pixel. La reproduire ici reviendrait à recopier une déclaration
            que la référence elle-même n'exécute pas.
          */}
          <TableHeader className="sticky top-[calc(var(--header-height)+1px)] z-10 bg-canvas [&_tr]:border-b-0">
            {/* ⚠️ L'APLAT A ÉTÉ RETIRÉ : LA RÉFÉRENCE N'EN POSE AUCUN, ET LA NOTE QUI
                TENAIT ICI DISAIT LE CONTRAIRE.

                Elle affirmait : « LA BANDE D'EN-TÊTE SE DÉTACHE DES LIGNES, et c'est ce
                que la référence fait : un aplat léger sous les intitulés ». Mesuré le
                2026-08-31 sur leur accueil, dans les deux thèmes, le fond de leur `th`
                est le CANVAS EXACT — rgb(255, 255, 255) en clair, rgb(13, 18, 23) en
                sombre. Pas de teinte, pas d'opacité intermédiaire.

                Le `bg-canvas` du `TableHeader` juste au-dessus suffit donc, et il est
                déjà là pour le défilement. Le reste du raisonnement tombe avec sa
                prémisse : les filets verticaux de `ColumnHeader` se lisent très bien sur
                le canvas, qui est le fond des lignes elles-mêmes.

                Ce que la référence pose à la place, c'est un trait sous l'en-tête —
                `box-shadow: 0 1px 0 0` sur le `thead`, et non une bordure. Cette parade
                contourne un défaut connu des cellules `sticky`, dont les bordures ne
                suivent pas au défilement dans plusieurs moteurs. Le `border-b` d'ici
                dessine le même trait d'un pixel sans avoir besoin de la parade : la
                bordure est portée par la rangée, qui n'est pas `sticky`. */}
            {/* 12 px et graisse 600 : la taille des en-têtes de colonne de la
                référence. `text-xs` vaut 13 dans l'échelle ZENKUU, et
                `--v2-text-2xs` est le seul cran à 12. `font-semibold` sur la rangée
                plutôt que sur chaque cellule : un `<th>` sans graisse déclarée
                retombe sur le gras du navigateur (700), ce qui laissait la colonne de
                suivi en 700 quand toutes ses voisines étaient en 600.

                `text-ink` ET NON `text-ink-muted`. Leurs quatorze en-têtes de colonne
                partagent une seule et même couleur, et c'est l'encre PLEINE :
                rgb(15, 23, 42) en clair, rgb(223, 229, 236) en sombre — les valeurs
                exactes de `--color-ink` dans les deux thèmes. Un intitulé de colonne
                n'est pas une mention secondaire chez eux : c'est une commande de tri,
                et elle se lit comme telle. */}
            <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink">
              {/* Le rang coûte quarante pixels pour redire ce que l'ORDRE des lignes
                  dit déjà. Il part le premier. */}
              {/* L'étoile a sa propre colonne, sans en-tête : un intitulé « Suivi »
                  sur trente pixels serait tronqué, et la forme de l'étoile dit déjà ce
                  que la colonne fait. Le libellé vit dans le `aria-label` de chaque
                  bouton, où il est nominatif — « Suivre Bitcoin » plutôt que « Suivi ». */}
              {watchlist ? (
                <th scope="col" className="w-8 px-1 py-2.5 font-semibold">
                  <span className="sr-only">{fr.market.columns.watch}</span>
                </th>
              ) : null}

              {shows.rank ? (
                <ColumnHeader
                  label={fr.market.columns.rank}
                  {...sortFor('rank')}
                  align="left"
                  width="w-[64px]"
                  className="hidden @min-[790px]:table-cell"
                />
              ) : null}
              <ColumnHeader
                label={fr.market.columns.name}
                {...sortFor('name')}
                align="left"
                width="w-[240px]"
              />
              <ColumnHeader label={fr.market.columns.price} {...sortFor('price')} width="w-[120px]" />
              {shows.change24h ? (
                <ColumnHeader
                  label={
                    selected
                      ? `${fr.market.columns.variation} (${selected.label})`
                      : fr.market.columns.change24h
                  }
                  {...sortFor(mainChangeField)}
                  width="w-[124px]"
                />
              ) : null}
              {shows.change7d ? (
                <ColumnHeader
                  label={fr.market.columns.change7d}
                  {...sortFor('change7d')}
                  width="w-[92px]"
                  className="hidden @min-[790px]:table-cell"
                />
              ) : null}
              {/* Comble l'écart relevé face à CoinGecko — voir `shows30d` plus haut. Même
                  seuil que les fenêtres secondaires (`extraClass`) : c'est la même
                  nature de colonne, une variation de comparaison qui cède la première
                  sur un téléphone. */}
              {shows30d ? (
                <ColumnHeader
                  label={period30d.label}
                  {...sortFor(period30d.field)}
                  width="w-[92px]"
                  className={extraClass}
                />
              ) : null}
              {/* Masquées sous `md` et non sous `sm` : elles arrivent APRÈS la variation
                  principale, qui tient déjà la place disponible sur un téléphone. Ce
                  sont des colonnes de comparaison, les premières à céder. */}
              {visibleExtras.map((entry) => (
                <ColumnHeader
                  key={entry.key}
                  label={entry.label}
                  {...sortFor(entry.field)}
                  width="w-[92px]"
                  className={extraClass}
                />
              ))}

              {/* ── LES TROIS COLONNES DE L'ONGLET « SOMMET HISTORIQUE » ──────────
                  Le sommet, l'écart qui l'en sépare, sa date. L'ordre n'est pas
                  indifférent : l'écart est la RÉPONSE — « à combien du plus haut
                  sommes-nous ? » — et se lit donc contre le sommet qu'il commente,
                  pas après une date qui l'en éloigne.

                  ⚠️ LE MÊME CHAMP NE PORTE PAS LA MÊME CHOSE SELON LA CLASSE, et
                  l'intitulé doit le dire. `ath` est le plus haut de TOUS LES TEMPS pour
                  une crypto ; pour une action, Yahoo ne le publie pas et le champ porte
                  le plus haut des 52 SEMAINES — c'est écrit dans le type, et
                  `AssetKeyStats` adaptait déjà son libellé pour cette raison.

                  Cette grille ne s'affichait jusqu'ici que sur la crypto, alors la
                  question ne se posait pas. Elle s'affiche maintenant sur les actions,
                  et un « plus haut de tous les temps » posé sur un chiffre de douze mois
                  serait le genre de faux qu'aucune source ne rattrape (§5). */}
              {shows.ath ? (
                <ColumnHeader
                  label={assetClass === 'crypto' ? t('Sommet') : t('Haut 52 sem.')}
                  {...sortFor('ath')}
                />
              ) : null}
              {shows.ath ? (
                <ColumnHeader
                  label={t('Écart au sommet')}
                  hint={
                    assetClass === 'crypto'
                      ? t('Écart entre le cours actuel et le plus haut de tous les temps')
                      : t('Écart entre le cours actuel et le plus haut des 52 dernières semaines')
                  }
                />
              ) : null}
              {shows.athDate ? (
                <ColumnHeader
                  label={t('Date du sommet')}
                  {...sortFor('athDate')}
                  className="hidden @min-[1100px]:table-cell"
                />
              ) : null}
              {/* ── LES DEUX BORNES DE LA SÉANCE ─────────────────────────────────
                  Le haut AVANT le bas, comme sur la référence : on lit une fourchette
                  du plafond vers le plancher, et c'est aussi l'ordre dans lequel le
                  cours de la colonne précédente se situe naturellement. */}
              {shows.high24h ? (
                <ColumnHeader
                  label={t('Haut 24 h')}
                  hint={t('Cours le plus élevé des vingt-quatre dernières heures')}
                  {...sortFor('high24h')}
                  className={rangeClass}
                />
              ) : null}
              {shows.low24h ? (
                <ColumnHeader
                  label={t('Bas 24 h')}
                  hint={t('Cours le plus bas des vingt-quatre dernières heures')}
                  {...sortFor('low24h')}
                  className={rangeClass}
                />
              ) : null}

              {/* La courbe n'est PAS triable : « ordonner par graphique » ne veut rien
                  dire, et la variation qu'elle jouxte porte déjà ce classement. */}
              {shows.chartInline ? (
                <ColumnHeader
                  label={fr.market.columns.chart}
                  align="left"
                  className="hidden @min-[1240px]:table-cell"
                />
              ) : null}
              {aggregates.map((key) => (
                <ColumnHeader
                  key={key}
                  label={aggregateMeta[key].label}
                  {...sortFor(aggregateMeta[key].field)}
                  hint={aggregateMeta[key].hint}
                  width="w-[140px]"
                  className={aggregateMeta[key].className}
                />
              ))}

              {/* FDV et son ratio se rangent APRÈS les deux agrégats, comme la capitalisation
                  et le volume : ce sont deux mesures de valorisation qui prolongent la
                  capitalisation, pas une comparaison de variation comme les colonnes
                  précédentes. Même seuil que l'offre en circulation (`supplyClass`) —
                  toutes trois sont des colonnes de complément qui cèdent ensemble. */}
              {showFdv ? (
                <ColumnHeader
                  label={t('Valorisation diluée')}
                  hint={t('Capitalisation appliquée à l’offre maximale — ou totale, faute de plafond publié')}
                  className={supplyClass}
                />
              ) : null}
              {showFdvRatio ? (
                <ColumnHeader
                  label={t('Cap. / FDV')}
                  hint={t('Part de la valorisation diluée déjà comptée dans la capitalisation')}
                  className={supplyClass}
                />
              ) : null}
              {/* L'offre se range APRÈS les deux agrégats et AVANT la courbe, comme
                  sur la référence : elle est le troisième terme de la capitalisation
                  (cours × offre), et se lit donc contre elle. */}
              {shows.supply ? (
                <ColumnHeader
                  label={t('Offre en circulation')}
                  hint={t('Nombre de jetons effectivement en circulation, hors réserves verrouillées')}
                  {...sortFor('circulatingSupply')}
                  className={supplyClass}
                />
              ) : null}
              {shows.dayRange ? (
                <ColumnHeader
                  label={fr.market.columns.dayRange}
                  className="hidden @min-[1100px]:table-cell"
                />
              ) : null}
              {shows.chartAtEnd ? (
                <ColumnHeader
                  label={fr.market.columns.chart}
                  className="hidden @min-[1240px]:table-cell"
                />
              ) : null}

              {/* Colonne d'action : pas de tri — il n'y a rien à ordonner — et un
                  intitulé quand même, sans quoi la dernière colonne du tableau
                  s'ouvrirait sur un vide que l'œil lit comme une colonne manquante. */}
              {shows.action ? (
                <ColumnHeader label={t('Action')} className={actionClass} />
              ) : null}
            </tr>
          </TableHeader>

          <TableBody className="divide-y divide-border-subtle">
            {assets.map((asset) => {
              const href = assetHref(asset.assetClass, asset.id)

              return (
                <tr
                  key={asset.id}
                  /* La courbe est écrite ICI et non laissée au défaut : le filet de
                     sécurité de `globals.css` ne vise que ce qui reçoit un geste, et une
                     rangée de tableau n'en fait pas partie. Elle en a pourtant le plus
                     besoin — c'est la plus grande surface qui change au survol. */
                  className="group transition-colors duration-150 ease-[var(--ease-standard)] hover:bg-surface-muted/60"
                >
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
                    <Link href={href} prefetch={false} className="flex min-w-0 items-center gap-3">
                      <AssetLogo asset={asset} size={24} />
                      {/* Graisse 600 : dans le tableau de la référence, le nom de
                          l'actif est la SEULE cellule plus grasse que les autres —
                          14px/600 quand toutes les données sont en 14px/400. C'est
                          ce qui laisse l'œil descendre la colonne des noms sans lire
                          les chiffres. */}
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink group-hover:text-brand">
                        {asset.name}
                      </span>
                      <span className="shrink-0 text-right text-xs uppercase text-ink-muted">
                        {asset.symbol}
                      </span>
                    </Link>
                  </th>

                  {/* Graisse 400 et non 500 : toutes les cellules de DONNÉES de la
                      référence sont en 14px/400 — cours, variations, volume,
                      capitalisation, FDV. Seul le nom monte à 600. */}
                  <td className="tabular px-2 py-2.5 @min-[790px]:px-3 text-right font-normal text-ink">
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
                     
                    />
                  </td>
                  ) : null}

                  {shows.change7d ? (
                    <td className="hidden px-2 py-2.5 @min-[790px]:px-3 text-right @min-[790px]:table-cell">
                      <ChangeBadge value={asset.change7d} periodLabel="sur 7 jours" />
                    </td>
                  ) : null}

                  {shows30d ? (
                    <td className={`px-2 py-2.5 @min-[790px]:px-3 text-right ${extraClass}`}>
                      <ChangeBadge
                        value={asset.change30d}
                        periodLabel={period30d.longLabel}
                       
                      />
                    </td>
                  ) : null}

                  {visibleExtras.map((entry) => (
                    <td key={entry.key} className={`px-2 py-2.5 @min-[790px]:px-3 text-right ${extraClass}`}>
                      {/* `periodLabel` vient de la table, pas d'une chaîne recopiée : c'est
                          lui que lisent les lecteurs d'écran (« en hausse de 3 % sur 30
                          jours »), et une fenêtre mal nommée y serait invisible à l'œil. */}
                      <ChangeBadge
                        value={asset[entry.field]}
                        periodLabel={entry.longLabel}
                       
                      />
                    </td>
                  ))}

                  {shows.ath ? (
                    <td className="tabular px-2 py-2.5 @min-[790px]:px-3 text-right text-ink">
                      <Money value={asset.ath} from={asset.currency} asRate={isForex} />
                    </td>
                  ) : null}

                  {shows.ath ? (
                    <td className="px-2 py-2.5 @min-[790px]:px-3 text-right">
                      {/*
                        `ChangeBadge` et non un pourcentage nu : l'écart au sommet est
                        une variation — négative dans l'immense majorité des cas — et
                        elle doit porter le même chevron, le même signe et la même
                        couleur que les autres. Un habillage propre à cette colonne
                        obligerait à réapprendre la lecture d'un chiffre déjà connu.

                        `periodLabel` nomme la fenêtre pour les lecteurs d'écran :
                        « en baisse de 62 % depuis son sommet » et non « sur 24 heures ».
                      */}
                      <ChangeBadge
                        value={athGap(asset)}
                        periodLabel="depuis son plus haut historique"
                       
                      />
                    </td>
                  ) : null}

                  {shows.athDate ? (
                    <td className="tabular hidden px-2 py-2.5 @min-[790px]:px-3 text-right text-xs text-ink-muted @min-[1100px]:table-cell">
                      {asset.athDate ? (
                        <time dateTime={asset.athDate}>{monthYear(asset.athDate)}</time>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}

                  {/* Les bornes s'écrivent en encre pleine et non atténuée : ce sont
                      des COURS, au même titre que celui de la colonne du cours, et les
                      grisier les ferait passer pour des métadonnées. La référence les
                      pose dans la même encre que le prix. */}
                  {shows.high24h ? (
                    <td className={`tabular px-2 py-2.5 @min-[790px]:px-3 text-right text-ink ${rangeClass}`}>
                      {asset.high24h !== undefined ? (
                        <Money value={asset.high24h} from={asset.currency} asRate={isForex} />
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}

                  {shows.low24h ? (
                    <td className={`tabular px-2 py-2.5 @min-[790px]:px-3 text-right text-ink ${rangeClass}`}>
                      {asset.low24h !== undefined ? (
                        <Money value={asset.low24h} from={asset.currency} asRate={isForex} />
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}

                  {shows.chartInline ? (
                    <td className="hidden px-2 py-2.5 @min-[790px]:px-3 @min-[1240px]:table-cell">
                      <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                    </td>
                  ) : null}

                  {aggregates.map((key) => (
                    <td
                      key={key}
                      className={`tabular px-2 py-2.5 @min-[790px]:px-3 text-right ${aggregateMeta[key].tone} ${aggregateMeta[key].className}`}
                    >
                      <Money value={asset[aggregateMeta[key].field]} from={asset.currency} compact />
                    </td>
                  ))}

                  {/* `fullyDilutedValuation` rend `undefined` sans offre maximale NI
                      totale — jamais un zéro qui affirmerait « aucune dilution
                      restante ». `formatCompact` et non `Money` : `fullyDilutedValuation`
                      rend un nombre brut dans la devise de l'actif, comme la
                      capitalisation et le volume juste au-dessus. */}
                  {showFdv ? (
                    <td className={`tabular px-2 py-2.5 @min-[790px]:px-3 text-right ${supplyClass}`}>
                      {fullyDilutedValuation(asset) !== undefined ? (
                        <Money value={fullyDilutedValuation(asset)} from={asset.currency} compact />
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}

                  {/* Hérite l'indéfini de la FDV — voir `marketCapToFdvShare`. */}
                  {showFdvRatio ? (
                    <td
                      className={`tabular px-2 py-2.5 @min-[790px]:px-3 text-right text-ink-muted ${supplyClass}`}
                    >
                      {formatShare(marketCapToFdvShare(asset)) ?? '—'}
                    </td>
                  ) : null}

                  {/* `formatCompact` et non `Money` : voir `shows.supply`. Le SYMBOLE
                      suit le nombre — « 20,07 M BTC » — parce qu'un nombre abrégé nu
                      dans une ligne qui en porte deux autres ne dit pas de quoi il
                      compte les unités. */}
                  {shows.supply ? (
                    <td
                      className={`tabular px-2 py-2.5 @min-[790px]:px-3 text-right text-ink-muted ${supplyClass}`}
                    >
                      {asset.circulatingSupply !== undefined ? (
                        <>
                          {formatCompact(asset.circulatingSupply)}
                          <span className="ml-1 text-xs uppercase">{asset.symbol}</span>
                        </>
                      ) : (
                        '—'
                      )}
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

                  {/*
                    ── LA PASTILLE D'ACTION ──────────────────────────────────────

                    Géométrie relevée sur la référence : 32 px de haut, coins
                    entièrement arrondis, contour d'un pixel et demi, 16 px de
                    gouttière, intitulé de 14 px. Le fond reste transparent — c'est un
                    contour, pas un aplat, et un aplat de marque sur cinquante lignes
                    ferait de la dernière colonne la plus bruyante du tableau.

                    `prefetch={false}` pour la même raison que le lien du nom : cinquante
                    lignes mènent à cinquante fiches, et les précharger affamerait le
                    limiteur de débit de la page en cours de lecture.

                    Le libellé est REDIT aux lecteurs d'écran avec le nom de l'actif :
                    cinquante boutons « Fiche » identiques dans la liste des liens ne
                    permettraient pas de choisir. Le texte visible reste court parce que
                    la colonne l'est, `aria-label` porte la version complète.
                  */}
                  {shows.action ? (
                    <td className={`px-2 py-2.5 @min-[790px]:px-3 text-right ${actionClass}`}>
                      <Link
                        href={href}
                        prefetch={false}
                        aria-label={t('Ouvrir la fiche de {nom}').replace('{nom}', asset.name)}
                        className="inline-flex h-8 items-center rounded-pill border border-border-subtle px-4 text-sm text-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {t('Fiche')}
                      </Link>
                    </td>
                  ) : null}

                  {/* L'étoile qui fermait la ligne a REJOINT SON DÉBUT — voir la note
                      à la première cellule. Elle n'existe plus ici. */}
                </tr>
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
        /* Le SÉLECTEUR DE LIGNES n'est plus passé ici : il vit dans la rangée d'outils,
           au-dessus du tableau. Le pied garde le compteur à gauche et les crans à
           droite — voir `TablePagination`, qui repasse à deux pistes dans ce cas. */
        <TablePagination
          page={page}
          perPage={perPage}
          total={total ?? assets.length}
          unit="actif"
          onPageChange={onPageChange}
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
 * Écart entre le cours actuel et le plus haut de tous les temps, en pourcentage.
 *
 * ── C'EST LA SEULE VALEUR CALCULÉE DE CE TABLEAU ────────────────────────────
 *
 * Elle l'est à partir de DEUX valeurs publiées par la source et exprimées dans la même
 * devise : c'est un rapport exact, pas une estimation. La conversion d'affichage
 * n'entre pas en jeu — un rapport entre deux montants est invariant par changement
 * d'unité, et le convertir avant de diviser donnerait le même nombre pour deux fois
 * plus de travail.
 *
 * `undefined` plutôt que zéro quand le sommet manque ou vaut zéro : `ChangeBadge`
 * affiche alors un tiret. Écrire « 0 % » dirait « le cours est à son sommet », ce qui
 * est le contraire de « on ne sait pas » (§5).
 */
function athGap(asset: MarketAsset): number | undefined {
  const peak = asset.ath
  if (peak === undefined || peak <= 0) return undefined
  return ((asset.price - peak) / peak) * 100
}

/**
 * Date de sommet, réduite au mois et à l'année.
 *
 * Le jour exact n'apprend rien dans une colonne qui parle d'une échelle de plusieurs
 * années, et « 10 nov. 2021 » coûte moitié plus de largeur que « nov. 2021 » dans un
 * tableau qui en manque. La date COMPLÈTE reste dans l'attribut `dateTime` du `<time>`
 * qui l'enveloppe, où les machines la lisent sans que rien n'encombre l'œil.
 *
 * Locale figée et non celle du visiteur : ce composant est rendu des deux côtés de
 * l'hydratation, et `Intl` ne donne pas le même résultat sur un serveur et dans un
 * navigateur dont les données de localisation diffèrent — React signalerait l'écart.
 * C'est le choix déjà fait par les autres tableaux du site.
 */
function monthYear(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

/*
 * `ScopeButton` VIVAIT ICI, et est parti avec les deux boutons de portée.
 *
 * Il habillait « Échangeables » et « Tous les actifs », qui partageaient la page selon
 * qu'un volume 24 h soit publié ou non. Retirés sur demande : le partage ne distinguait
 * rien sur la moitié des classes d'actifs, et le décompte qu'il portait se lit
 * désormais dans le compteur du pied.
 */

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
