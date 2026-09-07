'use client'

import { TabGroup, TabPanel, TabPanels } from '@headlessui/react'

import { Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import type { AppHref } from '@/i18n/navigation'
import { BoardCurrency } from '@/components/market/BoardCurrency'
import {
  BoardFilters,
  BoardSearch,
  ClassTabs,
  visibleUniverses,
  rangesActive,
  withinRanges,
  type BoardColumnSet,
  type BoardRanges,
  type BoardUniverse,
} from '@/components/market/BoardTabs'
import { periodMeta, type ChangePeriod } from '@/components/market/crypto-views'
import {
  MarketTable,
  type MarketSort,
  type SortDirection,
  type WatchlistContext,
} from '@/components/market/MarketTable'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ── LES VUES RAPIDES, ET CE QU'ELLES PEUVENT HONNÊTEMENT PROMETTRE ──────────
 *
 * TradingView en aligne cinq : populaires, tendance, gagnants, perdants, nouveautés.
 * Quatre sont reprises ici ; « nouveautés » ne l'est pas, et l'omission est un choix.
 * Une date de référencement n'existe pas dans `MarketAsset` — la reconstituer depuis
 * le rang ou la capitalisation donnerait un classement qui RESSEMBLE à des nouveautés
 * sans en être, ce que le §5 interdit. La page `/nouvelles-cotations` répond à cette
 * question avec la donnée qui convient.
 *
 * « Tendance » n'est pas non plus un palmarès de popularité — nous n'avons pas de
 * mesure d'audience. C'est la ROTATION : le volume rapporté à la capitalisation, qui
 * dit quelle part du flottant a changé de mains aujourd'hui. Un actif dont 40 % de la
 * capitalisation s'échange en une journée sort de son régime ordinaire, et c'est un
 * fait mesuré, pas une inférence. L'infobulle du bouton le dit.
 */
type QuickView = 'all' | 'trending' | 'gainers' | 'losers' | 'watchlist'

const QUICK_VIEWS: { key: QuickView; label: string; hint: string }[] = [
  { key: 'all', label: 'Tous', hint: 'L’ordre du classement, sans filtre' },
  {
    key: 'trending',
    label: 'Tendance',
    hint: 'Les plus fort taux de rotation — volume 24 h rapporté à la capitalisation',
  },
  { key: 'gainers', label: 'Gagnants', hint: 'Variation positive sur la période choisie' },
  { key: 'losers', label: 'Perdants', hint: 'Variation négative sur la période choisie' },
]

/*
 * ── « ÉCHANGEABLES » / « TOUS LES ACTIFS » ONT ÉTÉ RETIRÉS ──────────────────
 *
 * Le partage séparait les actifs dont la source publie un volume 24 h des autres.
 * Retiré sur demande, avec la recherche de page et le sélecteur de période : la barre
 * au-dessus du tableau portait quatre groupes de contrôles pour un tableau qu'on vient
 * lire, et trois d'entre eux ne portaient que sur les lignes AFFICHÉES — pas sur le
 * classement.
 *
 * Ce qui reste — les vues rapides — filtre la même page, et la ligne de décompte le
 * dit toujours.
 */

interface MarketBrowserProps {
  assets: MarketAsset[]
  assetClass: AssetClass
  page: number
  perPage: number
  sortBy: MarketSort
  direction: SortDirection
  sortable: boolean
  paginated: boolean
  basePath: AppHref
  /**
   * Nombre total d'actifs du classement, quand il est CONNU.
   *
   * Traverse sans être lu ici — il finit dans `tableProps`, donc dans le pied de
   * `MarketTable`. Il n'est déclaré que pour être typé : sans entrée dans cette
   * interface, TypeScript refuserait la prop chez l'appelant.
   *
   * Il ne l'est pas toujours : CoinGecko pagine lui-même et ne publie jamais combien
   * d'actifs il détient. Les univers Yahoo, eux, sont des listes écrites au dépôt —
   * leur longueur est un fait local, et la taire obligerait le pied à écrire
   * « Actifs 1 à 25 » là où il peut écrire « sur 99 ».
   */
  total?: number
  period?: ChangePeriod
  watchlist?: WatchlistContext
  chartPosition?: 'inline' | 'end'
  /**
   * Vues rapides et sélecteur de période.
   *
   * Désactivés sur la page crypto dédiée, où des onglets de même nom remplissent ce
   * rôle — et le remplissent MIEUX : ils classent l'univers entier côté serveur, là
   * où ces boutons ne portent que sur les lignes de la page affichée. Laisser les
   * deux offrirait au lecteur deux réponses différentes à la même question.
   */
  quickViews?: boolean

  /**
   * Ce qui précède « Personnaliser » au bord droit de la rangée du tableau.
   *
   * Traverse jusqu'à `MarketTable` sans être lu ici. Les pages qui portent leur période
   * dans l'URL — `/crypto` — y posent leurs liens de période ; celles qui la gardent en
   * état local laissent `quickViews` fabriquer le groupe lui-même, plus bas.
   */
  trailingSlot?: React.ReactNode

  /**
   * Fournie, le tableau PAGINE LOCALEMENT les lignes reçues.
   *
   * Valeur de départ du sélecteur de lignes ; le lecteur la change ensuite. Absente,
   * le tableau garde son comportement d'origine : tout est rendu d'un coup, et la
   * pagination — s'il y en a une — passe par l'URL.
   *
   * La pagination locale porte sur les lignes DÉJÀ FILTRÉES, pas sur celles reçues :
   * chercher « sol » puis passer page 2 doit parcourir les résultats de la recherche,
   * pas reprendre le classement complet.
   */
  clientPerPage?: number

  /**
   * Remplace les vues rapides par la RANGÉE D'ONGLETS de la référence.
   *
   * Les onglets font ce que les boutons ne faisaient pas : ils changent le jeu de
   * COLONNES en plus de filtrer les lignes. « Performance » aligne les cinq fenêtres
   * de variation, « Sommet historique » remplace volume et capitalisation par le plus
   * haut de tous les temps et l'écart qui l'en sépare.
   *
   * Exclusif de `quickViews` : les deux commandent le même état, et les afficher
   * ensemble donnerait deux contrôles qui se contredisent à l'écran.
   */
  boardTabs?: boolean

  /** Champ de filtre au-dessus du tableau — porte sur les lignes CHARGÉES. */
  searchable?: boolean

  /**
   * Jeu de colonnes des tableaux SANS onglets.
   *
   * Avec `boardTabs`, c'est l'onglet actif qui décide et cette prop est ignorée : deux
   * autorités sur les mêmes colonnes donneraient un tableau dont l'apparence dépend de
   * l'ordre dans lequel on lit le code. Sans onglets, en revanche, rien ne décidait —
   * le jeu était figé sur `apercu`, ce qui interdisait aux six pages de classe la
   * grille de catalogue qu'elles demandent.
   */
  columnSet?: BoardColumnSet

  /**
   * Bouton « Filtres » — fourchettes de capitalisation, volume et variation.
   *
   * Séparé de `searchable` bien que les deux occupent la même rangée : le champ de
   * filtre a du sens sur toutes les classes, les fourchettes seulement là où il y a
   * assez de lignes pour qu'un intervalle en retire. Sur quarante paires de devises,
   * un panneau de six champs coûte plus de place qu'il n'en fait gagner.
   */
  rangeFilters?: boolean

  /** Bascule USD / EUR / BTC / ETH au bord droit de la rangée d'outils. */
  currencyPicker?: boolean

  /**
   * Nombre total d'actifs du CATALOGUE, au-delà de ce qui a été servi.
   *
   * ── CE QU'IL DÉBLOQUE ────────────────────────────────────────────────────
   *
   * Fourni, le tableau cesse de s'arrêter aux lignes qu'il a reçues : au-delà, il va
   * chercher la page demandée sur `/api/cotations` et la rend telle quelle. C'est ce
   * qui met les dix-neuf mille cryptomonnaies du catalogue à portée du tableau de
   * l'accueil sans rendre la page dynamique — voir `getCryptoBoardPage`.
   *
   * ⚠️ IL NE VAUT QUE POUR LA LISTE NON FILTRÉE. Dès qu'un filtre, une recherche ou
   * un tri est actif, le décompte redevient celui des lignes en mémoire : trier
   * deux cent cinquante lignes ne dit rien de l'ordre des dix-neuf mille, et
   * prétendre paginer le catalogue trié serait un mensonge de compteur.
   */
  remoteTotal?: number

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * LES AUTRES UNIVERS DE LA RANGÉE DU HAUT — actions, devises
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ── POURQUOI ILS SONT SERVIS AVEC LA PAGE, ET NON CHERCHÉS AU CLIC ────────
   *
   * Le cahier des charges demande une bascule SANS saut ni flash de contenu. Un
   * chargement au clic impose l'inverse : un état d'attente, une hauteur qui bouge
   * quand les lignes arrivent, et un échec réseau possible sur un geste qui devrait
   * être instantané.
   *
   * Les deux jeux sont petits en regard du principal — quelques dizaines de lignes
   * sans courbes, contre deux cent cinquante cryptomonnaies avec leurs sparklines —
   * et la page étant STATIQUE et régénérée toutes les trois minutes, ils sont payés
   * une fois pour tous les visiteurs, pas une fois par clic.
   *
   * ⚠️ CHAQUE UNIVERS PORTE SA CLASSE. Elle décide des colonnes : une paire de
   * devises n'a ni capitalisation ni volume, et lui servir la grille des
   * cryptomonnaies alignerait des tirets sur quatre colonnes. Elle décide aussi de la
   * base des liens — `/devises/eurusd` et non `/crypto/eurusd`.
   */
  otherUniverses?: Partial<
    Record<
      'actions' | 'devises',
      {
        assets: MarketAsset[]
        assetClass: AssetClass
        basePath: AppHref
        columnSet: BoardColumnSet
      }
    >
  >
}

/**
 * Barre d'outils du classement : recherche, vues rapides, portée et période.
 *
 * ── TOUT CE QUI EST ICI PORTE SUR LA PAGE AFFICHÉE, ET C'EST ÉCRIT ──────────
 *
 * Un filtre qui ne porte que sur cinquante lignes parmi plusieurs milliers serait
 * trompeur s'il se présentait comme une recherche globale. La ligne de décompte le
 * dit à chaque filtrage, et l'état vide renvoie vers la recherche de l'en-tête, qui
 * elle interroge tout le catalogue.
 *
 * Le TRI, lui, reste côté serveur via l'URL : c'est le seul moyen d'ordonner
 * réellement l'ensemble du classement, et cela garde les vues triées partageables et
 * indexables. La différence entre les deux mécanismes n'est pas un accident
 * d'implémentation — elle suit ce que la source sait faire.
 *
 * Ce composant est client, donc `MarketTable` l'est aussi par transitivité. Aucun
 * effet sur le référencement : Next.js rend les composants client dans le HTML
 * initial — le tableau part complet, la recherche s'y greffe après hydratation.
 */
export function MarketBrowser({
  assets: ownAssets,
  quickViews = true,
  boardTabs = false,
  searchable = false,
  columnSet: fixedColumns,
  rangeFilters = false,
  currencyPicker = false,
  remoteTotal,
  period,
  watchlist,
  clientPerPage,
  otherUniverses,
  ...tableProps
}: MarketBrowserProps) {
  const t = usePhrase()
  const [view, setView] = useState<QuickView>('all')
  /* L'UNIVERS est un second état, indépendant de l'onglet de vue : « Favoris » et
     « Performance » répondent à deux questions différentes et doivent pouvoir être
     vrais en même temps — voir `ClassTabs`. Les fondre en un seul état, ce que faisait
     la version précédente, rendait impossible « la performance de mes favoris ». */
  const [universe, setUniverse] = useState<BoardUniverse>('crypto')
  /*
   * ── L'UNIVERS DÉCIDE DE LA LISTE, DE LA CLASSE ET DES COLONNES ────────────
   *
   * `swapped` est renseigné pour « Actions » et « Devises », et vide pour les deux
   * univers crypto — ceux-là partagent la liste que l'appelant a servie, « Favoris »
   * n'étant qu'un FILTRE dessus et non un autre jeu de données.
   *
   * ⚠️ La liste est substituée AVANT tout le reste — tri, filtre, pagination — parce
   * que ces trois opérations portent sur elle. Les brancher sur `ownAssets` en
   * laissant seulement l'affichage changer aurait paginé les cryptomonnaies pendant
   * qu'on regarde des devises.
   */
  const swapped =
    universe === 'actions' || universe === 'devises' ? otherUniverses?.[universe] : undefined

  /*
   * ── LA LISTE VIENT DE L'UNIVERS, ET DE LUI SEUL ───────────────────────────
   *
   * Elle passait auparavant par un `useMemo`, que la vue « En tendance » rendait
   * nécessaire : cette vue-là fabriquait un tableau neuf à chaque rendu tant que sa
   * réponse réseau n'était pas arrivée, et deux `useMemo` en aval le listaient en
   * dépendance. La vue est partie avec le menu qui l'ouvrait ; les deux termes
   * restants sont des props, donc stables d'un rendu à l'autre, et le mémo n'a plus
   * rien à mémoriser.
   */
  const assets = swapped?.assets ?? ownAssets

  /* Les onglets réellement proposés. Un univers non fourni n'apparaît pas : mieux
     vaut un onglet absent qu'un onglet menant à un tableau vide. */
  const availableUniverses = useMemo<BoardUniverse[]>(() => {
    const list: BoardUniverse[] = ['favoris', 'crypto']
    if (otherUniverses?.actions) list.push('actions')
    if (otherUniverses?.devises) list.push('devises')
    return list
  }, [otherUniverses])

  const [ranges, setRanges] = useState<BoardRanges>({})
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState(clientPerPage ?? 0)
  const [wantedPage, setWantedPage] = useState(1)

  /*
   * ── L'ONGLET DÉCIDE DE DEUX CHOSES À LA FOIS ──────────────────────────────
   *
   * Les colonnes ET le filtre de lignes. C'est la lecture de la référence, et c'est
   * ce qui distingue ses onglets des anciens boutons de vue rapide : « Performance »
   * ne retire aucune ligne, il remplace le volume et la capitalisation par les cinq
   * fenêtres de variation.
   *
   * Le filtre est traduit dans le vocabulaire des vues rapides plutôt que d'être
   * traité à part : les deux mécanismes portent exactement la même question au même
   * endroit, et les dédoubler ferait deux filtres à tenir d'accord.
   */
  /* `cotations` était le jeu de la première entrée du menu de vues, et c'est celui
     que la rangée d'univers sert désormais seule — voir la note de `BoardColumnSet`
     sur ce que cette grille montre qu'un classement ne montre pas. */
  const columnSet: BoardColumnSet = boardTabs ? 'cotations' : (fixedColumns ?? 'apercu')

  /* Sous `boardTabs`, plus AUCUNE vue ne retire de ligne : « Gagnants » et
     « Perdants » vivaient dans le menu retiré, et leurs classements complets sont
     servis par /classements/hausses et /classements/baisses. Seul l'univers filtre
     encore, et il le fait par `onlyFollowed`. */
  const filter: QuickView = boardTabs ? 'all' : view

  /*
   * « N'AFFICHER QUE MES FAVORIS » EST ORTHOGONAL AU RESTE, d'où un booléen à part.
   *
   * Il vient de la rangée du haut sous `boardTabs`, et de la vue rapide sinon — les
   * deux rangées ne coexistent jamais. Le garder distinct de `filter` est ce qui rend
   * « les gagnants parmi mes favoris » possible : tant que les deux partageaient un
   * seul état, choisir l'un effaçait l'autre.
   */
  const onlyFollowed = boardTabs ? universe === 'favoris' : view === 'watchlist'

  /* Calculé une fois : le test tourne sur chaque ligne, et `Object.values` sur six
     clés à deux cent cinquante reprises serait payé pour rien quand aucune borne
     n'est posée — c'est-à-dire presque toujours. */
  const filtered = rangeFilters && rangesActive(ranges)

  /* Normalisé UNE FOIS : le filtre le compare à deux champs par ligne, sur deux cent
     cinquante lignes, à chaque frappe. `toLowerCase()` dans la boucle referait le
     travail cinq cents fois pour rien. */
  const needle = query.trim().toLowerCase()

  /*
   * ── LE TRI EN MÉMOIRE ──────────────────────────────────────────────────────
   *
   * Il vit ICI et non dans le tableau, pour la même raison que le filtrage et la
   * pagination : c'est ce composant qui tient la LISTE, et trier une liste dont on ne
   * détient qu'une tranche produirait un classement faux.
   *
   * Il ne remplace pas le tri par URL — `MarketTable` le garde pour les classements
   * que la source pagine elle-même. Il le complète là où la page a déjà tout reçu :
   * l'accueil, dont les cent lignes sont servies en une fois (voir `CryptoBoard`).
   *
   * `null` au départ : l'ordre d'arrivée est déjà un classement — celui de la source,
   * par capitalisation. Imposer un tri initial le remplacerait par le nôtre.
   */
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null)

  /* Les identifiants suivis, en `Set` : le filtre les interroge une fois par ligne, et
     un `includes` sur un tableau ferait de ce filtre un parcours quadratique. */
  const followed = useMemo(() => new Set(watchlist?.ids ?? []), [watchlist])
  const followedCount = useMemo(
    () => assets.filter((asset) => followed.has(asset.id)).length,
    [assets, followed],
  )

  /*
   * ── LE SÉLECTEUR DE PÉRIODE A ÉTÉ RETIRÉ ───────────────────────────────────
   *
   * Il offrait « 1 H · 24 h · 7 J · 1 M · 1 A » et pilotait la colonne de variation
   * principale. Retiré sur demande : les fenêtres secondaires sont DÉJÀ des colonnes
   * du tableau (1 H, 7 J, 1 M s'affichent à côté de la variation), et le sélecteur ne
   * faisait donc que décider laquelle des quatre porte le titre.
   *
   * La période reste celle que l'appelant demande — c'est lui qui sait ce que la page
   * annonce.
   */
  const activePeriod = period
  const changeField = periodMeta(activePeriod ?? '24h').field

  const visible = useMemo(() => {
    const kept = assets.filter((asset) => {
      /* Le filtre des favoris porte sur la PAGE affichée, comme tous les autres de
         cette barre : un actif suivi qui n'est pas dans les cinquante lignes servies
         n'apparaîtra pas. La ligne de décompte sous la barre le dit déjà pour
         l'ensemble des filtres, et `/suivi` porte la liste complète. */
      if (onlyFollowed && !followed.has(asset.id)) return false

      /* Les fourchettes AVANT la recherche textuelle : elles écartent en général
         beaucoup plus de lignes, et chaque ligne écartée ici est deux `toLowerCase`
         de moins plus bas. */
      if (filtered && !withinRanges(asset, ranges)) return false

      /* Le NOM et le SYMBOLE, pas l'un ou l'autre : on cherche « bitcoin » aussi
         souvent que « btc », et l'identifiant de la source (« wrapped-bitcoin »)
         n'est jamais ce qu'on tape. `includes` et non un préfixe — « sol » doit
         trouver « Solana » comme « Wrapped SOL ». */
      if (
        needle !== '' &&
        !asset.name.toLowerCase().includes(needle) &&
        !asset.symbol.toLowerCase().includes(needle)
      ) {
        return false
      }

      const change = asset[changeField] as number | undefined

      // Une variation absente n'est ni une hausse ni une baisse : elle sort des deux
      // vues filtrées plutôt que d'être comptée arbitrairement comme nulle.
      if (filter === 'gainers') return (change ?? 0) > 0
      if (filter === 'losers') return (change ?? 0) < 0
      return true
    })

    /*
     * « Tendance » RÉORDONNE au lieu de filtrer, et c'est la seule vue dans ce cas.
     *
     * Filtrer sur un seuil de rotation supposerait qu'il existe une valeur au-delà de
     * laquelle un actif « est » tendance. Il n'y en a pas : la rotation ordinaire va
     * de 2 % sur une grande capitalisation à 300 % sur un jeton récent. Classer répond
     * à la vraie question — « lesquels sortent de leur régime ? » — sans avoir à
     * inventer une frontière.
     */
    if (filter === 'trending') {
      return [...kept].sort((a, b) => turnover(b) - turnover(a))
    }

    return kept
  }, [assets, filter, onlyFollowed, filtered, ranges, needle, changeField, followed])

  /*
   * ── LE TRI S'APPLIQUE APRÈS LE FILTRE, ET SUR UNE COPIE ────────────────────
   *
   * Après : trier puis filtrer donnerait le même résultat ici, mais coûterait un tri
   * sur des lignes qu'on s'apprête à jeter. Sur une COPIE : `Array.sort` réordonne en
   * place, et `visible` est mémorisé — le muter ferait dériver le tableau à chaque
   * rendu sans que le mémo s'en aperçoive.
   *
   * ⚠️ « Tendance » pose déjà son propre ordre. Un tri d'en-tête le remplace, et c'est
   * le bon arbitrage : c'est le geste le plus récent du lecteur.
   *
   * Les valeurs absentes vont TOUJOURS EN DERNIER, dans les deux sens. Les ranger comme
   * des zéros les ferait remonter en tête d'un tri croissant, où elles se liraient
   * comme les plus petites valeurs alors qu'elles ne sont pas des valeurs.
   */
  const sorted = useMemo(() => {
    if (!sort) return visible

    const factor = sort.direction === 'asc' ? 1 : -1

    return [...visible].sort((a, b) => {
      const left = a[sort.key as keyof MarketAsset]
      const right = b[sort.key as keyof MarketAsset]

      const leftMissing = left === undefined || left === null
      const rightMissing = right === undefined || right === null
      if (leftMissing && rightMissing) return 0
      if (leftMissing) return 1
      if (rightMissing) return -1

      if (typeof left === 'string' && typeof right === 'string') {
        return factor * left.localeCompare(right)
      }

      return factor * (Number(left) - Number(right))
    })
  }, [visible, sort])

  const filtering = filter !== 'all' || onlyFollowed || filtered || needle !== ''

  /*
   * ── QUAND LE CATALOGUE ENTIER EST À PORTÉE, ET QUAND IL NE L'EST PAS ───────
   *
   * `remoteTotal` ouvre les pages au-delà des lignes reçues. Trois choses le
   * referment, et chacune pour la même raison de fond : elles réordonnent ou
   * réduisent une liste dont on ne détient qu'une TRANCHE.
   *
   *   · un filtre ou une recherche — « 12 résultats » ne parle que des lignes
   *     chargées, et proposer une page 40 de ces douze n'aurait aucun sens ;
   *   · un tri d'en-tête — « la plus forte hausse » de deux cent cinquante lignes
   *     n'est pas celle de dix-neuf mille, et paginer un classement local en
   *     l'annonçant comme celui du catalogue serait le mensonge le plus coûteux de
   *     cette page ;
   *   · l'absence de `remoteTotal` — les autres classes d'actifs, qui n'ont pas de
   *     route pour aller chercher la suite ;
   *   · ⚠️ UN UNIVERS SUBSTITUÉ. `/api/cotations` ne sert QUE des cryptomonnaies —
   *     voir son en-tête. Laisser le catalogue ouvert sur l'onglet « Actions »
   *     ferait apparaître des cryptomonnaies dès la page 2 d'un tableau d'actions,
   *     sous des colonnes d'actions. Le compteur redevient donc local dès qu'on
   *     quitte la crypto.
   *   · ⚠️ LA VUE « EN TENDANCE », pour la même raison que l'univers substitué et
   *     avec un symptôme plus vicieux. Elle apporte une quinzaine d'actifs, soit
   *     MOINS qu'une page : `distant` en concluait que la page était incomplète et
   *     allait chercher la suite dans `/api/cotations`, qui ne connaît que le
   *     classement par capitalisation. Le menu affichait donc « Trending » au-dessus
   *     des cent premières capitalisations — un libellé juste sur des lignes fausses,
   *     c'est-à-dire le défaut le moins visible et le plus trompeur des cinq.
   *
   * Dans ces cinq cas le tableau retrouve exactement son comportement d'avant : il
   * pagine ce qu'il a, et le compteur dit ce qu'il compte.
   */
  const catalogue =
    remoteTotal !== undefined &&
    !filtering &&
    sort === null &&
    swapped === undefined

  /*
   * ── LA PAGE COURANTE EST BORNÉE AU RENDU, ET NON REMISE À ZÉRO PAR UN EFFET ──
   *
   * Filtrer depuis la page 4 peut ne laisser que deux pages. `wantedPage` garde alors
   * une valeur devenue impossible, et le tableau se vide : le lecteur voit un écran
   * blanc en réponse à une recherche qui, elle, a trouvé des lignes.
   *
   * La borne est calculée ICI plutôt que corrigée par un `useEffect` sur les filtres.
   * Un effet rendrait d'abord la page vide, puis la remplacerait au rendu suivant —
   * un clignotement pour un état qui n'aurait jamais dû exister. Dérivée, la page
   * affichée est toujours valide au premier rendu, et `wantedPage` retrouve sa valeur
   * si le lecteur efface son filtre.
   */
  const total = catalogue ? (remoteTotal as number) : sorted.length
  const pageCount = rows > 0 ? Math.max(1, Math.ceil(total / rows)) : 1
  const currentPage = Math.min(wantedPage, pageCount)

  /* Une page est SERVIE LOCALEMENT tant que sa dernière ligne tient dans ce qui a été
     reçu. Le test porte sur la borne haute et non sur un nombre de pages : à 100
     lignes par page et 250 reçues, la page 3 déborde de cinquante lignes — la servir
     à moitié afficherait un tableau tronqué sans que rien ne le dise. */
  const distant = catalogue && rows > 0 && currentPage * rows > assets.length
  const remote = useRemotePage(distant, currentPage, rows)

  const paged = rows > 0
    ? distant
      ? remote.assets
      : sorted.slice((currentPage - 1) * rows, currentPage * rows)
    : sorted

  /*
   * ── LES VUES RAPIDES TIENNENT LA GAUCHE DE LA RANGÉE D'OUTILS ──────────────
   *
   * Elles occupaient leur propre rangée, au-dessus de celle des portées et du
   * sélecteur de colonnes. Ces deux-là ont été retirés ; il ne reste qu'une rangée,
   * et les vues y descendent — le sélecteur de lignes en tient le bord droit.
   */
  const quickViewGroup = quickViews && !boardTabs ? (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('Vue rapide')}>
      {/*
        ── « FAVORIS » OUVRE LA RANGÉE ────────────────────────────────────

        Il précède « Tous » et non l'inverse : c'est le seul filtre qui porte sur
        une liste que le lecteur a lui-même constituée, et on le cherche en
        premier quand on en a une. Il est ABSENT quand le suivi n'est pas
        disponible — un filtre qui ne pourrait jamais rien retenir n'a pas à
        occuper de place.
      */}
      {watchlist?.available ? (
        <button
          type="button"
          onClick={() => setView('watchlist')}
          aria-pressed={view === 'watchlist'}
          title={
            followedCount > 0
              ? 'Seuls les actifs de votre liste de suivi'
              : 'Votre liste de suivi est vide — cliquez l’étoile d’une ligne pour l’y ajouter'
          }
          className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
            view === 'watchlist'
              ? 'bg-brand-soft text-brand-strong'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 ${view === 'watchlist' ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
          {t('Favoris')}
          {/* `text-micro` : le cran du design system, et non la taille réécrite en
              littéral qui vivait ici. Un cran nommé se retrouve quand on change
              l'échelle ; une valeur en dur se perd. */}
          {followedCount > 0 ? (
            <span className="tabular text-micro opacity-70">{followedCount}</span>
          ) : null}
        </button>
      ) : null}

      {QUICK_VIEWS.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => setView(entry.key)}
          aria-pressed={view === entry.key}
          title={t(entry.hint)}
          className={`rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
            view === entry.key
              ? 'bg-brand-soft text-brand-strong'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
          }`}
        >
          {t(entry.label)}
        </button>
      ))}
    </div>
  ) : null

  /*
   * ── LA GAUCHE ET LA DROITE DE LA RANGÉE D'OUTILS ──────────────────────────
   *
   * `MarketTable` rend déjà cette rangée : ce qu'on lui passe à gauche, puis à droite,
   * puis le sélecteur de lignes. On y pose donc le champ de filtre et la bascule de
   * devise plutôt que d'ouvrir une seconde bande — la référence n'en a qu'une, et deux
   * rangées de contrôles au-dessus d'un tableau qu'on vient LIRE sont précisément ce
   * qui avait fait retirer les précédentes.
   */
  const leadingSlot = searchable ? (
    <BoardSearch
      value={query}
      onChange={setQuery}
      subject={
        universe === 'actions' ? 'actions' : universe === 'devises' ? 'devises' : 'cryptomonnaies'
      }
    />
  ) : (
    quickViewGroup
  )

  /* Les fourchettes se posent AVANT la devise, donc plus à gauche : elles agissent sur
     les lignes, la devise sur leur unité. Le bord droit reste au sélecteur de lignes,
     que `MarketTable` ajoute après ce qu'on lui donne ici. */
  const trailingSlot =
    rangeFilters || currencyPicker ? (
      <>
        {rangeFilters ? <BoardFilters ranges={ranges} onChange={setRanges} /> : null}
        {currencyPicker ? <BoardCurrency /> : null}
      </>
    ) : (
      tableProps.trailingSlot
    )

  /*
   * ── LE CONTENU EST EXTRAIT, PARCE QU'IL A DEUX LOGEMENTS ──────────────────
   *
   * Sous `boardTabs`, il vit dans un `TabPanel` de Headless UI — c'est ce qui relie
   * enfin chaque onglet à ce qu'il commande, par `aria-controls`. Sans onglets, il est
   * rendu tel quel. Le recopier aurait fait diverger les deux au premier correctif.
   */
  /* La MÊME liste sert les onglets et les panneaux — voir `visibleUniverses`. */
  const tabsUnivers = visibleUniverses(availableUniverses, watchlist?.available === true)

  const contenu =
    sorted.length === 0 ? (
        <EmptyState
          title={t('Aucun actif ne correspond sur cette page')}
          description="Le filtre ne s’applique qu’aux lignes chargées. Utilisez la recherche de l’en-tête pour chercher dans l’ensemble du catalogue."
          compact
        />
      ) : (
        /*
          ── L'ATTENTE D'UNE PAGE DISTANTE SE VOIT, SANS RIEN DÉPLACER ─────────

          Le tableau garde sa place, ses en-têtes et son pied ; seules les lignes
          pâlissent le temps de l'aller-retour. Le remplacer par un substitut ferait
          sauter la page au moment précis où le lecteur vient de cliquer un cran, et
          `aria-busy` dit aux lecteurs d'écran ce que l'opacité dit à l'œil.
        */
        <div
          aria-busy={remote.loading || undefined}
          className={remote.loading ? 'opacity-60 transition-opacity duration-150' : undefined}
        >
          {/*
            ── LA BASCULE D'UNIVERS EST ANIMÉE, ET LA CLÉ EST CE QUI L'ANIME ────

            `key={universe}` force React à REMPLACER la sous-arborescence plutôt qu'à
            la réconcilier. Sans elle, le tableau garderait ses nœuds et changerait ses
            cellules en place : l'animation d'entrée ne se rejouerait jamais, puisque
            rien ne serait monté.

            C'est aussi ce qui remet à zéro l'état interne du tableau — colonne triée,
            ligne survolée — qui n'a aucun sens d'un univers à l'autre : une devise n'a
            pas de colonne « capitalisation » sur laquelle un tri crypto pourrait
            survivre.
          */}
          <div key={universe} className="board-swap">
            <MarketTable
              assets={paged}
              {...tableProps}
              {...(swapped
                ? {
                    assetClass: swapped.assetClass,
                    basePath: swapped.basePath,
                  }
                : {})}
            {...(/* Après `tableProps`, donc gagnant : la page et le nombre de lignes
                    servis sont ceux de l'état local, et non ceux que l'appelant a écrits
                    pour le premier rendu. */
            rows > 0
              ? {
                  page: currentPage,
                  perPage: rows,
                  total,
                  onPageChange: setWantedPage,
                  onPerPageChange: (next: number) => {
                    setRows(next)
                    setWantedPage(1)
                  },
                }
              : {})}
            {...(watchlist ? { watchlist } : {})}
            {...(activePeriod ? { period: activePeriod } : {})}
            /*
              LES COLONNES SE DÉDUISENT DE L'UNIVERS REÇU, PAS DE LA PAGE AFFICHÉE.

              Sans cela, une page distante encore vide ferait disparaître toutes les
              colonnes secondaires le temps du chargement — le tableau se réduirait à
              trois colonnes puis reprendrait sa largeur, sous les yeux du lecteur. Et
              une page où AUCUN actif ne publie de volume retirerait la colonne pour
              cette page seulement, ce qui décalerait l'alignement d'une page à l'autre.
            */
            columnSource={assets}
            /*
              ── LES CINQ VUES ÉTAIENT MORTES SUR « ACTIONS » ET « DEVISES » ──────

              La ligne valait `swapped?.columnSet ?? columnSet` : dès que l'univers
              basculait, la grille de catalogue s'imposait et l'onglet choisi n'avait
              PLUS AUCUN EFFET sur les colonnes. « Performance » et « Sommet historique »
              rendaient exactement le même tableau qu'« Aperçu » — cinq onglets dont
              trois ne faisaient rien, sans que rien ne le dise.

              La substitution avait pourtant une raison juste, et elle vaut toujours :
              une action n'a ni offre en circulation ni courbe de sept jours, et la
              grille crypto lui alignerait des tirets. Mais cette raison ne vise QUE la
              grille d'aperçu — celle que trois des cinq vues partagent (`cotations`).

              Les deux autres portent leur propre grille et n'ont rien de crypto :
              « Performance » aligne des fenêtres de variation, « Sommet historique » un
              plus haut et sa date. Une action en a autant qu'un jeton. Elles passent
              donc, et `has()` retire dans le tableau les colonnes que la source ne
              publierait pas — c'est déjà son travail.
            */
            columnSet={
              swapped && columnSet === 'cotations' ? swapped.columnSet : columnSet
            }
            /*
              ── LE TRI PASSE PAR ICI, ET SEULEMENT QUAND LA LISTE EST ENTIÈRE ────

              `clientPerPage` est le signe que l'appelant a servi TOUTES ses lignes d'un
              coup — c'est ce qui rend la pagination locale possible, et c'est exactement
              la condition d'un tri local honnête. Sans lui, ce composant ne détient
              qu'une tranche, et trier « les plus fortes hausses » ne donnerait que les
              plus fortes hausses DE CETTE PAGE.

              Les tableaux dans ce cas gardent le tri par URL de `MarketTable`, qui fait
              retrier l'univers entier par la source.
            */
            {...(clientPerPage !== undefined
              ? { activeSort: sort, onSortChange: (key: string, direction: SortDirection) => {
                  setSort({ key, direction })
                  setWantedPage(1)
                } }
              : {})}
              {...(leadingSlot ? { leadingSlot } : {})}
              {...(trailingSlot ? { trailingSlot } : {})}
            />
          </div>

          {/* La panne d'une page distante n'est pas la panne du tableau : les lignes
              précédentes restent à l'écran, et cette ligne dit ce qui manque. */}
          {remote.failed ? (
            <p className="pt-2 text-xs text-down" role="status">
              {t('Cette page n’a pas pu être chargée. Réessayez dans un instant.')}
            </p>
          ) : null}

          {/* Les toutes dernières pages du décompte n'existent pas côté source — voir
              `useRemotePage`. Le pied de tableau reste au-dessus, donc utilisable pour
              revenir en arrière : c'est ce qu'un état vide plein écran retirerait. */}
          {remote.empty ? (
            <p className="pt-3 text-xs text-ink-muted" role="status">
              {t(
                'Aucune ligne à cette position : la source publie des données de marché pour moins d’actifs qu’elle n’en dénombre. Revenez à une page plus basse.',
              )}
            </p>
          ) : null}
        </div>
      )

  return (
    <div className="space-y-3">
      {/*
        ── LA RANGÉE D'ONGLETS OUVRE LE BLOC ───────────────────────────────────

        Elle est posée ICI et non dans `MarketTable` parce qu'elle commande la LISTE
        autant que les colonnes : le filtre « Gagnants » retire des lignes, et c'est ce
        composant qui les tient. Le tableau ne reçoit que le verdict — un jeu de
        colonnes et une liste déjà filtrée.
      */}

      {/*
        ── CE QUE LE DÉCOMPTE DOIT DIRE, ET SEULEMENT QUAND IL LE DOIT ─────────

        Il n'apparaît que sous filtre, et il nomme sa PORTÉE. Un « 12 sur 250 » sans
        cette précision se lirait comme « 12 cryptomonnaies dans tout le catalogue »,
        alors que douze mille autres n'ont simplement pas été chargées. La loupe de
        l'en-tête, elle, interroge tout le catalogue — c'est là qu'on renvoie.
      */}
      {filtering ? (
        <p className="text-xs text-ink-muted" aria-live="polite">
          {t('{n} sur {total} lignes chargées. Le filtre ne porte pas sur l’ensemble du catalogue.')
            .replace('{n}', String(sorted.length))
            .replace('{total}', String(assets.length))}
        </p>
      ) : null}

      {boardTabs ? (
        /*
          ══════════════════════════════════════════════════════════════════════
          LE GROUPE D'ONGLETS ENVELOPPE LA RANGÉE **ET** LE TABLEAU
          ══════════════════════════════════════════════════════════════════════

          C'est la condition pour que le motif ARIA tienne : `aria-controls` relie un
          onglet à un panneau du MÊME document, et le lien ne peut se poser que si les
          deux vivent sous le même groupe. Tant que la rangée était rendue seule, plus
          haut, elle ne pouvait rien désigner — d'où le `role="tab"` sans panneau, qui
          annonçait une relation inexistante.

          ⚠️ UN PANNEAU PAR ONGLET, MAIS UN SEUL TABLEAU MONTÉ. Headless UI attend
          autant de `TabPanel` que de `Tab` ; remplir les quatre monterait quatre
          tableaux de deux cent cinquante lignes avec leurs courbes. Seul le panneau
          sélectionné reçoit le contenu, les autres restent vides — la structure est
          juste pour la synthèse vocale, le coût reste celui d'un seul tableau.

          `selectedIndex`/`onChange` traduisent l'index de Headless UI en univers : la
          liste vient de `visibleUniverses`, la même que celle des onglets, ce qui rend
          le décalage impossible.
        */
        <TabGroup
          selectedIndex={Math.max(tabsUnivers.indexOf(universe), 0)}
          onChange={(index) => {
            const suivant = tabsUnivers[index]
            if (suivant) setUniverse(suivant)
          }}
        >
          {/* L'UNIVERS D'ABORD, LA VUE ENSUITE — c'est l'ordre de lecture de la
              référence, et c'est aussi l'ordre logique : on choisit ce qu'on regarde
              avant de choisir sous quel angle. */}
          <ClassTabs active={universe} tabs={tabsUnivers} />

          <TabPanels className="pt-3">
            {tabsUnivers.map((id) => (
              <TabPanel key={id} className="focus:outline-none">
                {id === universe ? contenu : null}
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      ) : (
        contenu
      )}
    </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES LIGNES D'UNE PAGE QUI N'A PAS ÉTÉ SERVIE AVEC LE RENDU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * L'accueil reçoit les 250 premières capitalisations avec sa page — c'est le maximum
 * qu'un seul appel autorise, et le prix à payer pour qu'elle reste STATIQUE. Le
 * catalogue en compte plus de dix-neuf mille. Ce crochet va chercher les autres.
 *
 * ── POURQUOI L'ANCIENNE PAGE RESTE À L'ÉCRAN PENDANT L'ATTENTE ─────────────
 *
 * `assets` n'est vidé à aucun moment : passer de la page 11 à la page 12 garde les
 * lignes de la 11 le temps de l'aller-retour, et l'appelant les pâlit. Les effacer
 * d'abord ferait clignoter un tableau vide entre deux pages pleines, ce qui se lit
 * comme une panne alors que tout se passe bien.
 *
 * ── POURQUOI IL NE RÉESSAIE PAS TOUT SEUL ─────────────────────────────────
 *
 * Un échec laisse `stale` à vrai, donc les dépendances de l'effet inchangées : il ne
 * se relance pas. C'est voulu. La cause la plus probable d'un échec ici est un 429 du
 * limiteur de débit, et réessayer en boucle est exactement ce qui l'a déclenché. Le
 * prochain clic du lecteur relance la demande — c'est la seule reprise qui ne peut
 * pas empirer les choses.
 */
function useRemotePage(active: boolean, page: number, rows: number) {
  /*
   * ── NI « EN COURS », NI « EN ÉCHEC » NE SONT DES ÉTATS STOCKÉS ────────────
   *
   * Une première version les gardait dans deux `useState` posés en tête d'effet.
   * ESLint le refuse — `react-hooks/set-state-in-effect` — et il a raison : écrire
   * l'état SYNCHRONEMENT dans le corps d'un effet déclenche un second rendu en
   * cascade pour une information que le rendu possédait déjà.
   *
   * Les deux se DÉDUISENT de ce que l'on détient :
   *
   *   · « en cours » = la page demandée n'est pas celle qu'on a en mémoire, et rien
   *     n'a échoué pour elle. Aucun drapeau n'est nécessaire : c'est la définition
   *     même de `stale`.
   *   · « en échec » = la dernière panne porte SUR CETTE demande. D'où une clé
   *     mémorisée plutôt qu'un booléen : changer de page efface l'échec sans avoir
   *     à le remettre à zéro, ce qui était précisément le second `setState`.
   *
   * La clé combine page ET nombre de lignes : « page 11 à 25 lignes » et « page 11 à
   * 100 lignes » sont deux demandes différentes, et les confondre resservirait les
   * mauvaises lignes en changeant de cran.
   */
  const key = `${page}:${rows}`
  const [state, setState] = useState<{ key: string; assets: MarketAsset[] }>({
    key: '',
    assets: [],
  })
  const [failedKey, setFailedKey] = useState<string | null>(null)

  const stale = state.key !== key
  const failed = failedKey === key

  useEffect(() => {
    /* `failed` dans la garde ET dans les dépendances : sans lui, marquer l'échec
       relancerait l'effet, qui relancerait la requête, en boucle. Avec lui, l'effet
       repart une fois pour tomber sur ce retour anticipé et s'arrête là. */
    if (!active || !stale || failed) return

    /* Drapeau local plutôt qu'`AbortController` : la réponse est déjà en cache
       serveur, l'annuler n'économise rien, et ce qui compte est de ne PAS écrire
       l'état d'une demande périmée par-dessus celui de la demande en cours. */
    let cancelled = false

    fetch(`/api/cotations?page=${page}&lignes=${rows}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { actifs?: MarketAsset[]; indisponible?: boolean } | null) => {
        if (cancelled) return
        if (!payload || payload.indisponible || !Array.isArray(payload.actifs)) {
          setFailedKey(key)
          return
        }
        setState({ key, assets: payload.actifs })
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key)
      })

    return () => {
      cancelled = true
    }
  }, [active, stale, failed, key, page, rows])

  return {
    assets: state.assets,
    loading: active && stale && !failed,
    failed: active && failed,
    /*
     * ── LA QUEUE DU CATALOGUE EST VIDE, ET CE N'EST PAS UNE PANNE ────────────
     *
     * Le total affiché vient de `/global`, qui compte les cryptomonnaies ACTIVES.
     * Le point de terminaison qui pagine, lui, ne sert que celles pour lesquelles il
     * publie des données de marché — un ensemble plus petit. Les dernières pages du
     * décompte reviennent donc légitimement vides.
     *
     * Trois façons de traiter ça, et deux sont mauvaises :
     *   · borner le total à une valeur devinée — on écrirait un nombre que rien ne
     *     justifie, exactement ce que le §5 interdit ;
     *   · afficher un tableau vide sans rien dire — ce que le lecteur lit comme une
     *     panne du site ;
     *   · le DIRE. C'est ce que fait l'appelant, avec ce drapeau.
     *
     * Distinct de `failed` : la requête a réussi, la réponse est simplement vide.
     * Les confondre ferait proposer « réessayez » pour une page qui n'existera jamais.
     */
    empty: active && !stale && !failed && state.assets.length === 0,
  }
}

/**
 * Rotation — volume 24 h rapporté à la capitalisation.
 *
 * Rend `-1` plutôt que `0` quand l'un des deux termes manque : cela range les actifs
 * non mesurables APRÈS ceux dont la rotation est nulle, ce qui est juste — « aucune
 * rotation » et « rotation inconnue » ne sont pas la même chose, et la seconde ne doit
 * pas s'intercaler dans un classement qu'elle ne peut pas rejoindre.
 */
function turnover(asset: MarketAsset): number {
  const cap = asset.marketCap ?? 0
  const volume = asset.volume24h ?? 0
  if (cap <= 0 || volume <= 0) return -1
  return volume / cap
}

/*
 * `ScopeButton` A DÉMÉNAGÉ DANS `MarketTable`.
 *
 * Les deux boutons de portée se rendent désormais à côté du sélecteur de colonnes,
 * c'est-à-dire dans le tableau. L'ÉTAT reste ici — c'est ce composant qui filtre la
 * liste — mais le dessin suit les boutons.
 */
