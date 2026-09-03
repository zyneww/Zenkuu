'use client'


import { Separator } from '@/components/ui/separator'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import {
  CalendarDays,
  CandlestickChart,
  Check,
  Download,
  Search,
  PlusCircle,
  Settings,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { AssetClass, MarketAsset } from '@zenkuu/data'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import { usePresence } from '@/components/nav/usePresence'
import { DateRangeCalendar } from '@/components/ui/DateRangeCalendar'

import { usePhrase } from '@/components/locale/ContentProvider'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

/**
 * Barre d'outils du graphique — UNE SEULE RANGÉE.
 *
 * ── LE PROBLÈME QU'ELLE RÈGLE ─────────────────────────────────────────────────
 *
 * Les commandes occupaient TROIS rangées empilées : périodes et devise, puis
 * grandeur et comparaison et log et export, puis types et cases à cocher. Soit une
 * centaine de pixels de hauteur pris au graphique lui-même, sur un cadre qui en
 * fait 320. Un quart de la surface servait à choisir quoi regarder plutôt qu'à
 * regarder.
 *
 * La référence — CoinGecko — tient tout sur une ligne en repliant ce qui se
 * consulte rarement derrière des menus. C'est la logique reprise ici, et elle n'est
 * pas qu'une question de place : ce qui reste visible EST ce qui se change souvent
 * (la période), ce qui est replié est ce qui se règle une fois (le type de tracé,
 * les options d'affichage, l'export).
 *
 * ── CE QUI RESTE VISIBLE, ET POURQUOI ─────────────────────────────────────────
 *
 * Les PALIERS DE PÉRIODE sont la commande la plus utilisée d'un graphique de cours :
 * les replier dans un menu ajouterait un clic à chaque consultation. Tout le reste
 * s'ouvre à la demande.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LES DEUX SEULS ÉCARTS À LA RÉFÉRENCE, ET POURQUOI ILS SONT DÉLIBÉRÉS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La rangée reprend CoinGecko poste pour poste — grandeur, comparaison, type de
 * tracé, TradingView, puis la pastille de cadrage temporel avec son calendrier, son
 * lien et son menu. Deux postes seulement s'en écartent, et les deux le font sciemment.
 * On les liste ICI pour qu'une relecture qui compare les deux barres n'y voie pas un
 * alignement inachevé, et n'entreprenne pas de « corriger » ce qui a été tranché :
 *
 *   1. LA GRANDEUR EST UN INTERRUPTEUR À DEUX POSITIONS, pas un menu « Prix ▾ ».
 *      Le menu cache l'existence de la capitalisation : rien dans le mot « Prix »
 *      n'annonce qu'une autre grandeur se trouve derrière, et la bascule — qui répond
 *      à « cet actif a-t-il monté, ou seulement émis des jetons ? » — coûtait deux
 *      clics à qui savait déjà. Le segment montre les deux termes côte à côte et la
 *      forme porte le sens : l'un ou l'autre, jamais les deux. Voir la note posée sur
 *      `metricOptions` plus bas.
 *
 *   2. « DEPUIS JANV. » N'EST PAS ABRÉGÉ EN « YTD ». Le sigle est anglais ; le
 *      franciser en abrégé donnerait un code illisible, et le laisser tel quel
 *      mettrait un mot anglais au milieu de six libellés français. Voir la note de
 *      `RANGE_PRESETS`, qui porte aussi la règle typographique des six autres.
 *
 * Tout le reste — y compris l'interrupteur TV, ajouté pour retrouver la PAIRE
 * d'icônes de la référence — est aligné.
 */

export interface RangePreset {
  id: string
  label: string
  /**
   * Libellé long, pour les paliers dont l'étiquette est un SIGLE.
   *
   * Il alimente le `title` et le nom accessible du bouton. Absent partout ailleurs :
   * « 24H » ou « 3M » se lisent d'eux-mêmes, et leur coller une infobulle qui répète
   * l'évidence apprendrait au lecteur à ignorer les infobulles de cette rangée.
   */
  title?: string
  /** Profondeur en jours. `null` = toute l'histoire disponible. */
  days: number | null
}

/**
 * Paliers, alignés sur la référence — avec DEUX ajouts qui manquaient.
 *
 * « Depuis janvier » (YTD) répond à une question qu'on se pose réellement et qu'aucun
 * palier fixe ne couvre : sa profondeur change tous les jours. « Max » ouvre toute
 * l'histoire, ce que la fiche ne proposait pas du tout — on ne pouvait pas voir un
 * actif au-delà d'un an.
 *
 * ── LES LIBELLÉS SONT EN CAPITALES ET SANS ESPACE ────────────────────────────
 *
 * Ils s'écrivaient « 24 h », « 7 j », « 1 M » — la typographie française, qui insère
 * une espace insécable entre un nombre et son unité. C'est la règle, et elle n'a pas
 * sa place ici : ces sept libellés ne sont pas des mesures dans une phrase, ce sont
 * des ÉTIQUETTES DE BOUTON, et l'espace y coûte deux fois.
 *
 * Elle coûte en LARGEUR d'abord — sept boutons, sept espaces, une quinzaine de pixels
 * pris à une rangée qui doit tenir sur une ligne à côté du calendrier et des icônes.
 * Elle coûte surtout en LECTURE : « 24 h » se lit comme deux mots, et l'œil qui
 * balaie la rangée doit apparier chaque nombre à son unité. « 24H » est un seul
 * glyphe composé, comme sur les deux références, et la rangée se parcourt d'un trait.
 *
 * Les capitales font le même travail dans l'autre dimension : elles alignent les
 * hauteurs de caractères, si bien que les sept étiquettes forment une bande régulière
 * plutôt qu'une succession de jambages (le « j » de « 7 j » descendait sous la ligne).
 *
 * ⚠️ « DEPUIS JANV. » EST DEVENU « YTD », ET CE FICHIER A LONGTEMPS SOUTENU L'INVERSE.
 *
 * L'argument était qu'un sigle anglais n'a rien à faire sur un site français. Il ne
 * tient pas à l'usage, pour une raison de FORME que la rangée rend évidente : les six
 * autres paliers font deux ou trois caractères, celui-ci en faisait douze. Il pesait à
 * lui seul plus que trois de ses voisins réunis, cassait la bande régulière que les
 * capitales servent précisément à former, et c'est lui qui faisait déborder la pastille
 * dès que la colonne d'actualités s'ouvrait.
 *
 * « YTD » est par ailleurs le terme que les deux références affichent, y compris dans
 * leur version française — c'est un terme de métier, comme « ATH » que la fiche écrit
 * déjà sans le traduire. Le libellé long reste accessible aux lecteurs d'écran par le
 * `title` du bouton, où la place ne coûte rien.
 */
export const RANGE_PRESETS: RangePreset[] = [
  { id: '1d', label: '24H', days: 1 },
  { id: '7d', label: '7J', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: 'ytd', label: 'YTD', title: 'Depuis le 1ᵉʳ janvier', days: null },
  { id: '1y', label: '1A', days: 365 },
  { id: 'max', label: 'MAX', days: null },
]

/** Jours écoulés depuis le 1er janvier — recalculé, jamais figé. */
export function daysSinceJanuary(): number {
  const now = new Date()
  const january = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.ceil((now.getTime() - january.getTime()) / 86_400_000))
}

/**
 * Profondeurs que le service d'historique accepte — miroir de sa liste blanche.
 *
 * Elle est dupliquée ici de façon ASSUMÉE : le service borne ses clés de cache, et
 * lui envoyer un entier libre le ferait répondre 400. Plutôt que d'ouvrir la liste
 * côté service — ce qui reviendrait à supprimer le garde-fou — l'appelant arrondit.
 */
const ALLOWED_DEPTHS = [1, 7, 30, 90, 180, 365, 730, 1825, 3650]

/**
 * Arrondit une profondeur au palier autorisé immédiatement SUPÉRIEUR.
 *
 * Supérieur et non le plus proche : demander 224 jours pour « depuis janvier » et
 * recevoir 180 amputerait la période de six semaines, sans que rien ne le signale.
 * En arrondissant vers le haut on télécharge un peu plus que nécessaire, et le
 * graphique n'affiche que la fenêtre demandée — l'excédent ne coûte qu'un peu de
 * réseau, là où le défaut coûterait de la donnée manquante.
 */
export function snapToAllowedDepth(days: number): number {
  return ALLOWED_DEPTHS.find((allowed) => allowed >= days) ?? 3650
}

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf'

/**
 * Vues du cadre — reprises des pages de trading d'OKX, adaptées à nos sources.
 *
 * ── POURQUOI DES VUES ET NON DES OPTIONS ──────────────────────────────────────
 *
 * Ces entrées ne règlent pas le graphique : elles REMPLACENT ce qui est tracé, et
 * parfois par quelque chose qui n'a ni le même axe ni la même unité. La profondeur n'a
 * pas de temps en abscisse ; TradingView n'obéit à aucun de nos réglages. Les mêler aux
 * commandes de tracé ferait attendre du sélecteur de type ou de la période qu'ils s'y
 * appliquent — ce qu'ils ne peuvent pas.
 *
 * ── CE QUE CHACUNE MONTRE ─────────────────────────────────────────────────────
 *
 *   · `original`     — notre courbe, alimentée par CoinGecko et prolongée en direct ;
 *   · `tradingview`  — l'outil complet, avec ses indicateurs et ses dessins ;
 *   · `depth`        — le carnet de Binance : ce qui tient le prix, à l'instant t.
 *
 * Les deux dernières dépendent de sources ou de correspondances qui n'existent pas
 * pour tous les actifs : l'appelant ne passe que celles qu'il peut réellement rendre,
 * plutôt que de les afficher grisées (§5).
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ `marketCap` A ÉTÉ RETIRÉ DE CE TYPE, ET C'EST UNE CORRECTION DE BOGUE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La capitalisation figurait ici comme quatrième vue. Elle est devenue une position de
 * l'INTERRUPTEUR DE GRANDEUR, à gauche de la barre — c'est ce qu'on trace, pas la façon
 * de le tracer.
 *
 * Le membre, lui, était resté. Il n'était plus produit par aucune entrée du segment,
 * mais `AssetWorkspace` continuait d'y traduire sa métrique : `view` valait donc
 * `'marketCap'`, une valeur qu'aucune icône ne porte, et choisir « Capitalisation »
 * ÉTEIGNAIT LE SEGMENT ENTIER — quatre icônes dont aucune active, et plus aucun moyen
 * de savoir ce qui était tracé.
 *
 * Le type l'autorisait, donc le compilateur n'a rien dit. Le retirer rend cet état
 * inexprimable, ce qu'une union est faite pour garantir : le bogue ne peut plus revenir
 * par distraction, il faudrait rajouter le membre exprès.
 */
export type ChartView = 'original' | 'tradingview' | 'depth'

/**
 * Une entrée de la liste des rendus : ce qu'elle affiche, et ce qu'elle pose.
 *
 * `kind` est OPTIONNEL, et l'absence porte un sens : la vue n'admet pas de type de
 * tracé. Y mettre une valeur par défaut ferait basculer le type de la courbe maison
 * en passant sur TradingView, dont le réglage ne suivrait pas au retour.
 *
 * ── LE CHAMP `icon` A DISPARU ───────────────────────────────────────────────
 *
 * Ces entrées étaient rendues en pictogrammes, dans un segment de la rangée principale.
 * Elles vivent désormais dans le menu des réglages, en LIBELLÉS — voir le commentaire
 * de ce menu pour le motif. Un `label` se lit sans survol ; un pictogramme demandait
 * d'attendre l'infobulle pour savoir ce qu'on allait obtenir.
 *
 * Le type `RenderIcon` et la table `RENDER_ICONS` sont partis avec lui : garder une
 * table de pictogrammes que rien ne rend est la façon la plus sûre de la voir
 * réapparaître par erreur.
 */
export interface RenderOption {
  id: string
  label: string
  view: ChartView
  kind?: string
}

/**
 * Un actif proposable en superposition.
 *
 * `image` et `symbol` sont FACULTATIFS et servent le panneau de comparaison : la
 * référence y liste ses actifs avec leur vignette et leur sigle entre parenthèses —
 * « Ethereum (ETH) ». Une page qui ne les connaît pas passe le seul libellé, et la
 * ligne se rend sans vignette plutôt que de ne pas se rendre.
 */
export interface CompareOption {
  id: string
  label: string
  symbol?: string
  image?: string
  /**
   * Classe d'actif — indispensable dès que la comparaison sort du catalogue de la page.
   *
   * La fiche allait chercher toutes les séries comparées à l'adresse des
   * CRYPTOMONNAIES (`/api/historique?classe=crypto`), ce qui suffisait tant que la
   * liste était celle des pairs d'une fiche crypto. Depuis que le champ interroge
   * tout le catalogue, comparer une action à une crypto est possible — et sans cette
   * classe la requête partirait au mauvais endroit et ne rendrait rien.
   *
   * Facultative : les pages qui composent leur propre liste homogène peuvent
   * l'omettre, la classe de la fiche sert alors de valeur par défaut.
   */
  assetClass?: AssetClass
}

/**
 * Nombre maximal de séries superposées à celle de la fiche.
 *
 * QUATRE, comme la référence, et ce n'est pas un chiffre rond choisi au hasard : le
 * panneau montre autant d'emplacements que de places disponibles, si bien que la
 * limite se VOIT avant d'être atteinte plutôt que de se manifester par un clic sans
 * effet. Au-delà, cinq courbes indexées sur la même base finissent par se croiser
 * partout et l'infobulle ne tient plus dans le cadre.
 */
export const COMPARE_MAX = 4

/**
 * Les deux SECTIONS de la roue dentée, dans l'ordre où elles s'affichent.
 *
 * Calquées sur « Chart Settings » / « Tooltip Settings » du modèle (CoinMarketCap).
 * Le partage n'est pas décoratif : il oppose ce qui change le TRACÉ — donc ce qui
 * coûte de la place et de la lisibilité — à ce qui n'ajoute qu'une ligne à la bulle
 * de survol, invisible tant qu'on ne survole pas. Mêlés dans une liste unique, les
 * deux se choisissaient sans qu'on sache lequel des deux prix on payait.
 *
 * ⚠️ CE QUI N'Y FIGURE PAS, ET POURQUOI. Le modèle propose aussi « Fear Index »,
 * « Funding Rate », « Price in ETH », « Price in SOL » et « FDV ». Aucun n'est repris :
 *   · l'indice de peur et le taux de financement existent bien chez nous, mais pas
 *     en SÉRIE alignable sur la fenêtre d'une fiche — l'un est un indice de marché
 *     global, l'autre un instantané par contrat ;
 *   · la FDV n'est publiée qu'à la date du jour, et la reconstituer pour le passé
 *     supposerait l'offre totale d'aujourd'hui appliquée à un cours d'il y a six
 *     mois — un nombre qui n'a jamais existé.
 * Une case qui ne commande rien vaut moins que pas de case (§5).
 */
type SettingGroup = 'chart' | 'tooltip'

const SETTING_GROUPS: { id: SettingGroup; label: string }[] = [
  { id: 'chart', label: 'Réglages du graphique' },
  { id: 'tooltip', label: 'Infobulle' },
]

interface ChartToolbarProps {
  metric: string
  /** `available` à faux rend l'entrée visible mais inerte — voir `AssetWorkspace`. */
  metricOptions: { key: string; label: string; available?: boolean }[]
  onMetricChange: (key: string) => void

  /**
   * Actifs superposés — PLUSIEURS désormais, jusqu'à `COMPARE_MAX`.
   *
   * C'était un identifiant unique, servi par un menu à choix simple. La référence
   * ouvre un panneau qui garde quatre emplacements, et la différence n'est pas
   * qu'ergonomique : comparer un actif à UN autre répond à « lequel des deux a le
   * mieux tenu », comparer à TROIS répond à « où se situe-t-il », qui est la question
   * qu'on se pose devant une fiche.
   */
  compareIds: string[]
  compareOptions: CompareOption[]
  onCompareChange: (ids: string[]) => void
  /** Un actif venu des tendances, remonté pour que la fiche sache le charger. */
  onCompareDiscover?: (option: CompareOption) => void
  /** L'actif de la fiche — retiré des tendances, qui ne le filtrent pas. */
  selfId?: string

  /**
   * Grandeurs du MÊME actif superposées à celle qui est tracée.
   *
   * C'est l'onglet « Grandeurs » du panneau de comparaison. Il ne coûte aucun appel :
   * la source publie le cours, la capitalisation et le volume dans la même réponse, et
   * la fiche les a déjà. Superposer le cours et la capitalisation répond à la seule
   * question que ni l'un ni l'autre ne tranche seul — « cet actif a-t-il monté, ou
   * a-t-il seulement émis des jetons ? ».
   */
  compareMetrics: string[]
  onCompareMetricsChange: (keys: string[]) => void

  kind: string
  onKindChange: (key: string) => void

  view: ChartView
  onViewChange: (view: ChartView) => void

  /**
   * Rendus proposés — LE SEGMENT D'ICÔNES, EN UNE SEULE LISTE.
   *
   * Il y avait deux props pour deux axes : `views` (courbe maison, TradingView,
   * profondeur) et `kindOptions` (aire, ligne, chandeliers, barres, ligne de base).
   * L'un vivait dans un segment, l'autre dans un menu, et le lecteur devait deviner
   * lequel des deux commandait ce qu'il voyait.
   *
   * Ils n'en font plus qu'un. Chaque entrée pose un COUPLE : la vue, et le type de
   * tracé quand la vue en admet un. `kind` absent signifie « cette vue ne se règle
   * pas » — TradingView a ses propres commandes, une profondeur de carnet n'a pas de
   * chandeliers.
   *
   * C'est l'APPELANT qui compose la liste, parce que lui seul sait ce que ses sources
   * permettent : pas de chandeliers sans OHLC, pas de profondeur sans carnet. Une
   * liste à une seule entrée fait disparaître le segment — un sélecteur à un choix
   * n'est pas un sélecteur.
   */
  renderOptions: RenderOption[]

  /**
   * Pas de bougie, quand une place de trading en fournit pour cet actif.
   *
   * Vide pour tout ce que Binance ne cote pas — une action, une devise, une crypto de
   * la longue traîne. Les paliers de DURÉE restent alors seuls, ce qui est le
   * comportement d'origine.
   */
  intervals: { id: string; label: string }[]
  intervalId: string | null
  onIntervalChange: (id: string | null) => void

  rangeId: string
  onRangeChange: (preset: RangePreset) => void
  /** Bornes libres, en ISO court. Absentes = un palier est actif. */
  customRange: { from: string; to: string } | null
  onCustomRange: (range: { from: string; to: string } | null) => void

  /*
   * Les huit propriétés d'AFFICHAGE ont disparu avec leur menu — voir la note qui
   * l'explique, plus bas dans le rendu. La barre ne règle plus que la GRANDEUR, la
   * PÉRIODE, le TYPE de tracé et la COMPARAISON : ce qui change ce qu'on regarde, et
   * non comment c'est peint.
   */

  /**
   * Réglages du TRACÉ et de l'INFOBULLE, en interrupteurs.
   *
   * Composés par l'appelant, comme `renderOptions` : lui seul sait ce que ses données
   * permettent d'allumer. `available: false` rend l'entrée visible mais inerte.
   */
  /**
   * Les interrupteurs de la roue dentée, EN DEUX SECTIONS.
   *
   * `group` décide sous quel intertitre l'entrée tombe : `chart` pour ce qui change le
   * TRACÉ, `tooltip` pour ce qui n'ajoute qu'une ligne à la bulle de survol. C'est le
   * partage de CoinMarketCap (« Chart Settings » / « Tooltip Settings »), et il vaut
   * mieux qu'une liste à plat parce que les deux familles n'ont pas le même coût : une
   * bande de volume occupe un quart du cadre, une ligne de bulle ne coûte rien tant
   * qu'on ne survole pas. Les mêler faisait choisir entre les deux sans le dire.
   *
   * L'ORDRE DES SECTIONS suit celui du tableau, pas une table figée ici : c'est
   * l'appelant qui compose la liste, comme pour `renderOptions`. Une section sans
   * entrée ne rend ni intertitre ni séparateur.
   */
  settings: {
    id: string
    label: string
    checked: boolean
    available?: boolean
    group?: SettingGroup
  }[]
  onSettingChange: (id: string, next: boolean) => void

  onExport: (format: ExportFormat) => void

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * `currencyLabel` ET `currencySlot` ONT DISPARU — LA DEVISE EST CELLE DU SITE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * La barre portait son propre sélecteur de devise, replié derrière un bouton qui en
   * affichait le code. Deux sélecteurs coexistaient donc sur la même page : celui de
   * l'en-tête, qui commande tout le site, et celui-ci, qui ne commandait que le
   * graphique. Ils pouvaient afficher deux codes différents, et c'est arrivé.
   *
   * Un cours lu dans la mauvaise unité est un cours faux — c'était l'argument qui
   * justifiait d'inscrire le code SUR le bouton. Il vaut toujours, et il conclut
   * désormais dans l'autre sens : la seule façon de ne jamais se tromper d'unité est
   * qu'il n'y ait qu'une unité à choisir sur la page. Le graphique suit donc le
   * sélecteur global, et l'encart de conversion au-dessus de la courbe continue de
   * nommer la devise d'origine et la date du taux (§5).
   */
}

/**
 * Pictogramme de chaque vue.
 *
 * Déclaré hors du composant : ces nœuds sont constants, et les recréer à chaque rendu
 * ferait quatre allocations par frappe de clavier dans la barre.
 *
 * `marketCap` n'y figure pas — la vue est filtrée avant d'arriver ici, voir le segment.
 */
/**
 * Types de tracé qui dessinent des BOUGIES, et pour lesquels un pas a un sens.
 *
 * Écrit ici plutôt qu'importé de `chart-kinds.ts` : cette barre ne connaît ses types
 * que par les libellés que l'appelant lui passe, et lui faire importer le registre des
 * rendus la lierait à un module qu'elle n'utilise pas autrement. Les deux listes
 * doivent rester d'accord — c'est le coût, et il se limite à deux chaînes.
 */
const OHLC_TOOLBAR_KINDS: ReadonlySet<string> = new Set(['candles', 'bars'])


export function ChartToolbar(props: ChartToolbarProps) {
  const t = usePhrase()

  /*
   * « Le tracé est-il dessiné par un outil TIERS ? »
   *
   * Toutes les commandes de cette barre sauf une pilotent NOTRE graphique. Quand un
   * moteur externe prend la place, elles ne commandent plus rien — elles se replient
   * donc, et seul le sélecteur de moteur reste, puisque c'est lui qui permet de revenir.
   *
   * La vue est testée plutôt qu'un booléen dédié : ajouter demain une seconde vue
   * externe la ferait entrer dans ce test sans qu'on ait à propager un drapeau depuis
   * l'appelant.
   */
  const external = props.view !== 'original'

  return (
    /*
      ── DEUX GROUPES, TENUS AUX DEUX BORDS ────────────────────────────────────

      La barre était une seule suite d'éléments, rejetés à droite par des `ml-auto`
      successifs et coupés en deux rangées par un `basis-full`. Elle est faite désormais
      de DEUX conteneurs écartés par `justify-between` : à gauche ce qui décide de ce
      qu'on trace (grandeur, comparaison, type, rendu), à droite le cadrage temporel et
      ce qu'on fait du résultat.

      C'est le partage de la référence, et il tient parce que les deux familles
      répondent à des questions qu'on ne se pose pas en même temps.

      ── LA RUPTURE DE LIGNE FORCÉE A ÉTÉ RETIRÉE ──────────────────────────────

      Le `basis-full` imposait DEUX rangées quelle que soit la place disponible. Son
      motif était de stabiliser la hauteur : sans lui, la barre basculait d'une à deux
      rangées selon que l'actif proposait ou non la comparaison et les bougies, et le
      graphique gagnait ou perdait trente pixels d'une fiche à l'autre. Il coûtait une
      rangée entière à TOUS les actifs pour régler le cas de quelques-uns.

      Les deux groupes tiennent sur une ligne dès un millier de pixels, ce qui est la
      largeur de la colonne de contenu sur un écran d'ordinateur. En dessous,
      `flex-wrap` reprend la main — et un graphique de téléphone n'a de toute façon pas
      la même hauteur qu'un graphique de bureau.

      ── CE QUI EST ENCADRÉ, ET CE QUI NE L'EST PAS ────────────────────────────

      Toutes les commandes ont été des pastilles bordées, puis plus aucune ne l'a été :
      alignées à huit, ces bordures pesaient plus lourd que les libellés qu'elles
      encadraient, et la rangée se lisait comme une collection de galets plutôt que
      comme un instrument.

      La référence règle le même problème sans aller jusque-là, et c'est sa réponse qui
      est reprise : l'encadrement devient un SIGNAL, pas un décor. Les menus en portent
      un, parce qu'une pastille est la forme qui dit « il y a autre chose derrière » ;
      le palier de période ACTIF en porte un, parce qu'il désigne un état parmi sept.
      Les paliers éteints et les boutons d'icône restent nus et ne se révèlent qu'au
      survol.

      L'arrondi revient avec eux, en `rounded-control` — 3 à 6 pixels, la famille des
      contrôles, jamais celle des cartes. Voir `globals.css`.

      Tous les contrôles gardent en revanche la même hauteur de 28 pixels (`h-7`) : la
      barre alignait autrefois des pastilles de hauteurs légèrement différentes, et
      c'est cette inégalité-là, plus que l'arrondi, qui faisait la rangée de galets.

      ── LE FILET SOUS LA BARRE A DISPARU ──────────────────────────────────────

      Un `border-b` rattachait les commandes à la courbe, au motif qu'elles étaient
      SERTIES dans le cadre du graphique — c'est ce que font OKX et CoinGecko. Ce cadre
      n'existe plus : le panneau est passé en fond transparent, comme chez la référence,
      et un trait qui ne borde plus rien se lit comme une séparation de sections là où
      il n'y en a pas.
    */
    /*
      ══════════════════════════════════════════════════════════════════════════
      UNE GRILLE `1fr auto 1fr`, ET NON UN `flex justify-between`
      ══════════════════════════════════════════════════════════════════════════

      La barre a été un `flex` dont les deux groupes latéraux portaient `flex-1 basis-0`,
      au motif qu'ils se partageraient l'espace libre à parts égales et centreraient donc
      le sélecteur de moteur. Ils ne le faisaient pas.

      Mesuré au navigateur : le segment tombait 38 pixels à GAUCHE du centre en mode
      Original, et pile au centre en mode TradingView. La cause est le `min-w-fit` du
      groupe de droite — il empêche la pastille de se casser en deux (voir sa note), mais
      une largeur minimale l'emporte sur un `flex-basis`. Le groupe de droite prenait donc
      ce dont il avait besoin, le gauche se contentait du reste, et les deux « moitiés »
      n'étaient pas égales.

      Une grille à trois pistes tranche par construction : deux `1fr` sont égales par
      DÉFINITION, quoi qu'elles contiennent. La piste du milieu est donc toujours au
      centre exact de la barre, dans les deux modes, sans que le contenu des bords ait son
      mot à dire. C'est la seule disposition qui donne cette garantie.

      ── CE QUE CELA A COÛTÉ, ET POURQUOI C'EST PAYÉ ─────────────────────────

      Une piste `1fr` ne s'élargit pas pour son contenu : la pastille de droite doit tenir
      dans la moitié de la barre, moins la largeur du segment. Ce n'était PAS le cas tant
      que le palier « DEPUIS JANV. » occupait quatre-vingt-dix pixels à lui seul ; c'est
      lui qui faisait déborder la rangée quand la colonne d'actualités s'ouvrait. Réduit à
      « YTD », la pastille rentre — les deux changements se tiennent, et retirer l'un
      ferait revenir le défaut de l'autre.

      `items-center` et non `items-end` : les trois pistes portent des contrôles de même
      hauteur (28 px), et c'est le milieu optique qui les aligne.

      ══════════════════════════════════════════════════════════════════════════
      LE REPLI SE DÉCIDE SUR LA COLONNE, PAS SUR LA FENÊTRE
      ══════════════════════════════════════════════════════════════════════════

      Mesuré au navigateur, colonne d'actualités ouverte sur une fenêtre de 1568 px : la
      barre dispose de 944 pixels et en demande 974 — piste gauche 358, segment 203,
      pastille 389, gouttières 24. Il en manque trente. La pastille se remettait donc à se
      casser en deux, ce que `min-w-fit` empêchait avant la grille.

      Un point d'arrêt de FENÊTRE ne peut pas décider cela : à 1568 px la barre tient très
      bien quand la colonne d'actualités est fermée, et déborde quand elle est ouverte.
      C'est la largeur de la COLONNE qui commande, et c'est exactement ce qu'une requête
      de conteneur sait lire. D'où l'enveloppe `@container` ci-dessous — elle n'existe que
      pour donner un référent à mesurer.

      ⚠️ LE SEUIL A ÉTÉ RECALCULÉ, ET IL DÉPEND DE LA PASTILLE. Il valait 61rem, hérité
      d'une mesure faite quand le palier s'appelait encore « DEPUIS JANV. ». Deux choses
      ont changé depuis : ce libellé est devenu « YTD », et le rembourrage des paliers est
      passé à `px-2`. La pastille demande désormais ~349 px et non 389.

      ⚠️ LA GRILLE À TROIS PISTES A DISPARU, ET LE PARAGRAPHE CI-DESSUS RACONTE
      POURQUOI ELLE EXISTAIT. Elle tenait le segment de moteur au MILIEU de la barre, à
      égale distance des deux groupes, ce qui imposait deux pistes latérales de largeur
      identique — donc un seuil de repli calculé sur `2 × max(gauche, droite)`.

      Le segment de moteur a rejoint le groupe de gauche (voir sa note). La piste
      centrale n'a plus rien à porter, et la contrainte d'égalité qu'elle imposait
      coûtait une rangée : le groupe de gauche, désormais plus large des deux, était
      borné à la largeur de la pastille de droite et repliait « Comparer » sous lui —
      relevé au navigateur sur la fiche Pump.fun.

      `justify-between` rend à chaque groupe sa largeur propre. Les deux se poussent aux
      bords, la barre tient sur une ligne, et le repli redevient ce qu'il doit être :
      celui du `flex-wrap`, quand les deux groupes ne tiennent réellement plus côte à
      côte.
    */
    <div className="@container mb-2">
    {/*
      ⚠️ LA BARRE N'A PAS DE FOND À ELLE, ET C'EST UN RETOUR EN ARRIÈRE ASSUMÉ.

      Un conteneur arrondi lui a été posé — un aplat portant tous les groupes — et
      c'était le mauvais objet : la référence n'arrondit pas la BARRE, elle arrondit
      chaque GROUPE. Le fond unique ne faisait qu'ajouter un troisième plan entre le
      panneau et les pastilles, et les pastilles, se détachant désormais de lui plutôt
      que de la page, perdaient leur contraste.

      La rangée est donc transparente. Ce qui porte la forme, ce sont les quatre
      pastilles : grandeur, moteur, comparaison, cadrage.
    */}
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      {/* GAUCHE — ce qui décide de ce qu'on trace. Première piste `1fr` de la grille :
          sa largeur est celle de la troisième, par définition. Voir la note de la barre.

          ── IL S'EFFACE EN MODE TRADINGVIEW ────────────────────────────────────
          Voir la note du groupe de droite : ces commandes ne pilotent que NOTRE tracé.
          `max-w-0` plutôt que `hidden` — une largeur qui se referme se lit comme un
          glissement, là où `hidden` fait disparaître d'un coup et ferait sauter le
          segment du milieu vers sa nouvelle position. */}
      <div
        /*
          ⚠️ CE GROUPE NE S'EFFACE PLUS EN MODE TRADINGVIEW, ET C'EST UNE CORRECTION.

          Toute la barre disparaissait dès qu'un moteur externe prenait la main, au
          motif que ses commandes ne pilotent plus rien. Vrai du CADRAGE — période,
          calendrier, export : TradingView a les siens dans son propre cadre, et deux
          jeux de commandes pour un seul graphique se contredisent.

          Faux de CE groupe. La grandeur et la comparaison décrivent ce qu'on VEUT
          voir, pas la façon de le dessiner ; et surtout le sélecteur de moteur vit
          ici. En l'effaçant avec le reste, on retirait le seul bouton qui permet de
          revenir — il fallait recharger la page. Relevé au navigateur.
        */
        className="flex min-w-0 flex-wrap items-center gap-1"
      >
      {/*
        ── LA GRANDEUR EST UN INTERRUPTEUR, PLUS UN MENU ───────────────────────

        Elle était repliée derrière « Prix ▾ ». Un menu est la forme juste quand les
        options sont nombreuses ou rarement changées ; ici elles sont DEUX ou trois, et
        passer du cours à la capitalisation est un geste de lecture courant — c'est la
        question « cet actif a-t-il monté, ou a-t-il seulement émis des jetons ? », que
        le cours seul ne peut pas trancher.

        Repliée, la bascule coûtait deux clics et, surtout, ne DISAIT PAS qu'elle
        existait : rien dans « Prix ▾ » n'annonce une capitalisation derrière. Le
        segment montre les deux termes côte à côte, ce qui est exactement la forme de
        CoinGecko — et la forme y porte le sens : l'un ou l'autre, jamais les deux.

        Le sélecteur ne paraît pas s'il n'y a qu'une grandeur : un interrupteur à une
        position n'est pas un interrupteur.
      */}
      {/* Le segment paraît dès qu'il y a DEUX termes à opposer, même si l'un des deux
          est hors de portée : c'est le couple « prix ou capitalisation » qui porte le
          sens, et le montrer amputé de sa seconde moitié ne dirait plus rien. */}
      {props.metricOptions.length > 1 ? (
        /*
          ══════════════════════════════════════════════════════════════════════
          LE SEGMENT PASSE AU COMPOSANT PARTAGÉ, ET SON APLAT GLISSE
          ══════════════════════════════════════════════════════════════════════

          Il était écrit ici en classes : un `<span role="group">`, une boucle de
          `<button aria-pressed>`, et le couple d'états actif/inactif recopié. Le même
          motif vivait dans trois autres fichiers avec ses propres valeurs — corriger le
          contraste de l'aplat actif a demandé de les retrouver tous.

          `SegmentedControl` porte désormais la forme ET la sémantique : Radix rend un
          `role="radiogroup"` que la synthèse vocale annonce « un parmi deux », avec les
          flèches directionnelles et un seul arrêt de tabulation — trois choses que
          `aria-pressed` sur des boutons indépendants ne donnait pas.

          Ce qu'il ajoute, repris d'Opensource UI : l'aplat NE SAUTE PLUS d'une case à
          l'autre, il glisse. Voir son fichier pour la raison de la mesure — leur table
          de décalages écrite à la main s'arrête à cinq options et suppose des largeurs
          égales, deux hypothèses fausses ici.

          ⚠️ LES DEUX RÉGLAGES CONSERVÉS SONT L'ÉTAT GRISÉ ET SON MOTIF. Une grandeur
          dont la source ne publie pas d'historique reste montrée mais inerte, et
          l'infobulle dit POURQUOI — sans elle, un bouton mort ressemble à une panne.
        */
        <SegmentedControl
          label={t('Grandeur tracée')}
          value={props.metric}
          onChange={props.onMetricChange}
          options={props.metricOptions.map((entry) => ({
            key: entry.key,
            label: entry.label,
            /* `undefined` vaut DISPONIBLE : les appelants qui ne renseignent pas le
               champ n'ont pas de grandeur manquante à signaler, et leur imposer
               `available: true` partout serait du bruit. */
            ...(entry.available === false
              ? {
                  disabled: true,
                  title: `La source ne publie pas d’historique de ${entry.label.toLowerCase()} pour cet actif.`,
                }
              : {}),
          }))}
        />
      ) : null}


      {/*
        ══════════════════════════════════════════════════════════════════════
        « COMPARER » EST UN PANNEAU, PLUS UN MENU À CHOIX SIMPLE
        ══════════════════════════════════════════════════════════════════════

        C'était un `Dropdown` ordinaire : une liste d'actifs, un clic, un actif
        comparé, le menu se referme. La référence ouvre au même endroit un PANNEAU —
        deux onglets, un champ de recherche, quatre emplacements et un bouton de
        validation — et l'écart entre les deux formes n'est pas décoratif.

        Un menu impose UN choix et se referme dessus. Choisir quatre actifs y demande
        quatre allers-retours, et l'on ne voit jamais sa sélection : à chaque
        réouverture, une seule ligne est cochée. Le panneau montre au contraire l'état
        complet — ce qui est retenu, combien de places restent — et c'est cet état-là
        qui manquait, pas le nombre de clics.

        Voir `ComparePanel` pour l'anatomie détaillée.
      */}
      {/* Plus de condition sur `compareOptions` : le menu propose les tendances du
          marché, il est donc utile même là où la page ne compose aucun pair — une
          fiche de devise, une matière première. */}
      <ComparePanel
        ids={props.compareIds}
        options={props.compareOptions}
        onChange={props.onCompareChange}
        {...(props.onCompareDiscover ? { onDiscover: props.onCompareDiscover } : {})}
        metrics={props.compareMetrics}
        {...(props.selfId ? { selfId: props.selfId } : {})}
      />

      {/*
        ══════════════════════════════════════════════════════════════════════
        « TRADINGVIEW » EN TOUTES LETTRES, ET DANS LE GROUPE DE GAUCHE
        ══════════════════════════════════════════════════════════════════════

        ── D'ABORD, POURQUOI IL EST NOMMÉ ────────────────────────────────────

        Le choix du moteur était un segment de DEUX pictogrammes nus — une courbe, un
        chandelier — libellé en infobulle. La note qui défendait cette forme avait
        raison sur la place gagnée, et tort sur le reste : une courbe et un chandelier
        se lisent comme un choix de TRACÉ, alors qu'ils changent de MOTEUR — le second
        remplace tout le cadre par celui de TradingView, avec ses propres périodes et
        ses propres outils.

        ── ENSUITE, POURQUOI IL EST ICI ET NON EN BOUT DE RANGÉE ─────────────

        Il a séjourné à droite, après les paliers, sur le modèle de Blockworks. Le
        relevé de `coingecko.com/en/coins/hyperliquid` tranche autrement, et la mesure
        est nette : leur rangée porte « Price ▾ », « Compare ▾ », PUIS les deux icônes
        de moteur — les trois collés à gauche — tandis que la droite ne reçoit que le
        cadrage (périodes, calendrier) et la sortie (lien, « ⋮ »).

        Cette grammaire est la bonne, et elle explique pourquoi : le moteur décide de
        CE QU'ON TRACE, comme la grandeur et la comparaison. Les périodes, le
        calendrier, les réglages et l'export décident de ce qu'on fait du résultat.
        Posé à droite, le moteur se lisait comme une commande de sortie — voisin de
        l'export, alors qu'il ne produit aucun fichier.

        ⚠️ IL RESTE VISIBLE EN MODE EXTERNE, contrairement à ses voisins de droite. Il
        est le SEUL chemin de retour : replié avec le reste du cadrage, il faudrait
        recharger la page pour revenir au tracé maison.
      */}
      {props.renderOptions.some((entry) => entry.view === 'tradingview') ? (
        <button
          type="button"
          onClick={() => props.onViewChange(external ? 'original' : 'tradingview')}
          aria-pressed={external}
          className={`flex h-7 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium transition-colors duration-150 ${
            external
              ? 'bg-surface-active text-ink shadow-sm'
              : 'bg-surface-muted text-ink-muted hover:text-ink'
          }`}
        >
          <CandlestickChart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          TradingView
        </button>
      ) : null}

      {/*
        ══════════════════════════════════════════════════════════════════════
        LE RENDU REVIENT DANS LA RANGÉE, EN UN SEUL BOUTON-ICÔNE
        ══════════════════════════════════════════════════════════════════════

        Il a fait trois séjours : un segment de quatre pictogrammes dans la rangée,
        puis une section d'un menu « réglages », puis ceci. Le va-et-vient valait la
        peine parce que les deux formes précédentes étaient fausses pour des raisons
        opposées.

        Le SEGMENT prenait quatre emplacements dans la rangée principale pour un
        réglage qu'on pose une fois. Le MENU DE RÉGLAGES le noyait au contraire parmi
        la devise et quatre cases à cocher, derrière un bouton dont l'étiquette était
        un code de devise — rien n'y annonçait qu'on pouvait passer en chandeliers.

        La référence tranche : UN bouton-icône, immédiatement à droite de « Compare »,
        qui n'ouvre que les types de tracé. Un emplacement au lieu de quatre, et une
        promesse exacte — l'icône est une courbe, le menu ne contient que des courbes.

        Il disparaît quand l'appelant n'a qu'un rendu à proposer : un sélecteur à un
        choix n'est pas un sélecteur.
      */}
      {/*
        ⚠️ CE MENU N'EXISTE PLUS, et le paragraphe ci-dessus raconte son histoire
        jusqu'à sa suppression.

        Il proposait « Courbe / Chandeliers / Profondeur du carnet » derrière un
        pictogramme de courbe. Il est retiré sur demande, et la barre s'en tient à ce
        que la référence y met : la grandeur, la comparaison, l'interrupteur
        TradingView, la période, et les commandes de sortie.

        CE QUE CELA RETIRE, dit clairement : les chandeliers et la vue « profondeur du
        carnet » ne sont plus atteignables. Le tracé reste une courbe, qui est le rendu
        par défaut et celui de la référence. `renderOptions` continue d'être passé — il
        alimente encore l'interrupteur TradingView juste en dessous — et le graphique
        sait toujours dessiner des chandeliers, mais plus rien ne les demande.
      */}

      {/*
        ══════════════════════════════════════════════════════════════════════
        TRADINGVIEW A SON PROPRE INTERRUPTEUR, À CÔTÉ DU TYPE DE TRACÉ
        ══════════════════════════════════════════════════════════════════════

        Il était une entrée du menu des types de tracé, ce qui est une place fausse
        pour deux raisons.

        DE FORME : la référence pose ici DEUX pictogrammes côte à côte — une courbe et
        un « TV » — et c'est le seul endroit de sa barre où l'on voit d'un coup d'œil
        quel moteur dessine. Replié dans un menu, le nôtre ne s'annonçait pas : rien
        dans une icône de courbe ne laisse deviner qu'un second graphique existe.

        DE FOND : les autres entrées du menu règlent NOTRE tracé — la même donnée,
        dessinée autrement. TradingView le REMPLACE par un outil tiers qui n'obéit à
        aucune de nos commandes (voir la note de `ChartView`). Un interrupteur à deux
        positions dit exactement cela ; une entrée de menu le range parmi des réglages
        qu'il n'est pas.

        Le retour se fait par le MÊME bouton — c'est un interrupteur, pas un
        aller-simple : sans cela, quitter TradingView demanderait de rouvrir le menu
        qu'on vient de contourner.
      */}
      </div>

      {/*
        ══════════════════════════════════════════════════════════════════════
        LE MOTEUR DE TRACÉ SE NOMME — « ORIGINAL » ET « TRADINGVIEW », AU MILIEU
        ══════════════════════════════════════════════════════════════════════

        ── CE QUI ÉTAIT LÀ, ET CE QUI N'ALLAIT PAS ───────────────────────────

        Un unique bouton portant « TV », pressé ou non, collé à la fin du groupe de
        gauche. Deux défauts, et le second est le vrai.

        DE LIBELLÉ : « TV » n'est lisible que par qui connaît déjà TradingView. Rien
        n'y dit de quoi c'est l'abréviation, et surtout rien ne dit ce qu'on quitte en
        l'activant — l'état de repos n'avait pas de nom du tout.

        DE FORME : un interrupteur montre UN état et cache l'autre. Or il ne s'agit pas
        d'activer une option, mais de choisir entre DEUX moteurs de dessin qui n'ont ni
        les mêmes données ni les mêmes commandes (voir la note de `ChartView`). Un
        segment à deux positions montre les deux termes côte à côte et dit la nature du
        choix par sa seule forme — c'est déjà ce que fait le sélecteur de grandeur, dix
        pixels à gauche, et pour exactement la même raison.

        ── POURQUOI AU MILIEU, ET NON À GAUCHE ──────────────────────────────

        La barre partage deux familles aux deux bords : à gauche ce qu'on trace, à
        droite le cadrage temporel. Le moteur n'appartient à ni l'une ni l'autre — il
        décide QUI dessine, pas quoi ni sur quelle période, et c'est le seul réglage de
        la rangée dont l'effet remplace le cadre entier. Le milieu était vide ; il porte
        désormais le seul contrôle qui ne se range dans aucun des deux bords.

        Le centrage tient à `flex-1 basis-0` sur les deux groupes latéraux : ils partent
        d'une base nulle et se partagent l'espace libre à parts égales, donc le milieu
        reste au milieu quelle que soit la longueur des libellés. Sur téléphone,
        `flex-wrap` reprend la main et les trois groupes s'empilent.

        ── LE SEGMENT EST CONTRÔLÉ PAR LA VUE, PAS PAR SES PROPRES CLICS ─────

        `aria-pressed` est calculé depuis `props.view` à chaque rendu : le segment ne
        peut donc pas annoncer « TradingView » pendant que le graphique est revenu au
        tracé maison, ce qu'un état interne permettrait.
      */}

      {/*
        ══════════════════════════════════════════════════════════════════════
        DROITE — LE CADRAGE TEMPOREL, DANS UN CADRE QUI L'ENGLOBE
        ══════════════════════════════════════════════════════════════════════

        Les paliers, le calendrier, le lien et le téléchargement flottaient nus sur le
        fond de la page, séparés du reste par du seul espace. C'est ce que fait
        TradingView ; ce n'est pas ce que fait CoinGecko, dont la rangée est une
        PASTILLE unique — fond creusé, bord arrondi, filet discret — à l'intérieur de
        laquelle le palier actif ressort en blanc.

        La différence n'est pas décorative. Un cadre commun dit « ces sept boutons
        forment un seul réglage » ; sept boutons nus se lisent comme sept commandes
        indépendantes, et l'on cherche alors lequel est actif au lieu de le voir.

        C'est aussi ce qui permet au palier actif de se signaler par un simple fond
        clair, sans bordure propre : le contraste avec le creux du cadre suffit. La
        version précédente devait border le palier actif faute de fond derrière lui.

        `rounded-pill` et non `rounded-control` : la référence arrondit complètement
        cette rangée, et c'est cohérent — une pastille qui contient des pastilles.
      */}
      {/*
        La pastille est ENVELOPPÉE, et l'enveloppe n'est pas décorative : c'est elle qui
        porte `flex-1 basis-0` — la moitié droite de l'espace libre, dont le segment du
        milieu tire son centrage. Poser ces classes sur la pastille elle-même
        l'étirerait sur toute cette moitié, et sept boutons de période flotteraient dans
        un cadre trois fois trop large.

        ══════════════════════════════════════════════════════════════════════════
        ⚠️ `min-w-fit` — LA PASTILLE SE REPLIE EN BLOC, ELLE NE SE CASSE PLUS EN DEUX
        ══════════════════════════════════════════════════════════════════════════

        Constaté au navigateur, colonne d'actualités ouverte : la colonne de contenu
        tombe à ~750 px, la rangée en demande ~835. La pastille se cassait alors EN
        SON MILIEU — les sept paliers de durée sur une ligne, le calendrier, le lien et
        l'export sur une seconde, le tout dans le MÊME bord arrondi, qui devenait un
        rectangle haut. Ce n'est pas un repli, c'est une pastille brisée.

        La cause tient à `min-w-0` : il autorisait l'enveloppe à descendre sous la
        largeur de son contenu, et c'est la pastille qui absorbait la différence en
        passant à la ligne. `min-w-fit` le lui interdit. La ligne flexible ne peut donc
        plus la comprimer, et c'est l'enveloppe ENTIÈRE qui bascule sur la rangée
        suivante — un repli propre, la pastille restant d'un seul tenant.

        ── ET ELLE S'EFFACE EN MODE TRADINGVIEW ───────────────────────────────

        Ces commandes — grandeur, comparaison, période, pas, export — pilotent NOTRE
        tracé et lui seul. TradingView arrive avec les siennes, dans son propre cadre :
        les laisser visibles affichait sept boutons de période au-dessus d'un graphique
        qui n'en tenait aucun compte. Le pied de cadre le disait en toutes lettres
        (« Les réglages de la barre d'outils ci-dessus ne s'y appliquent pas »), ce qui
        est l'aveu qu'une commande sans effet est restée à l'écran.

        Elles ne sont pas RETIRÉES mais REPLIÉES : elles reprennent leur effet dès le
        retour au tracé maison, et la transition de largeur le montre au lieu de le
        faire deviner. La phrase du pied de cadre a pu disparaître avec elles.
      */}
      <div
        aria-hidden={external}
        inert={external}
        /*
          ⚠️ PLUS DE `min-w-fit` NI DE `max-w-0` — LA GRILLE A RENDU LES DEUX INUTILES.

          Cette enveloppe a porté `flex-1 basis-0 min-w-fit`, et c'est ce `min-w-fit` qui
          décentrait le segment de 38 pixels : une largeur minimale l'emporte sur un
          `flex-basis`, donc la « moitié » droite était plus large que la gauche. Il
          annulait aussi le `max-w-0` du repli — `min-width` l'emporte également sur
          `max-width` — si bien que le groupe gardait sa place, invisible, en mode
          TradingView.

          La grille `1fr auto 1fr` de la barre règle les deux d'un coup : les pistes sont
          égales par définition, et une piste ne rétrécit pas parce que son contenu
          s'efface. Il n'y a donc plus rien à contraindre ici — seulement une opacité à
          éteindre, et `invisible` pour retirer le contenu au pointeur (l'opacité seule
          le laisse cliquable, `inert` ne couvrant que le clavier).
        */
        className={`flex min-w-0 flex-1 justify-end transition-opacity duration-300 ease-out ${
          external ? 'invisible opacity-0' : 'visible opacity-100'
        }`}
      >
      {/* `gap-0.5` et `px-0.5` : douze pixels de plus rendus à la rangée, pour la même
          raison que le rembourrage des paliers juste au-dessus. La pastille reste lisible
          — ses groupes internes gardent leur propre gouttière — et tient désormais dans
          la moitié de barre que la grille lui accorde. */}
      {/* ⚠️ LE CADRE DE CETTE PASTILLE A ÉTÉ RETIRÉ. Elle portait un filet et un fond
          creusé pour se détacher de la page ; la barre ayant désormais le sien, le
          filet faisait un second cadre à quatre pixels du premier — deux bordures
          concentriques, défaut visible dès qu'on regarde le coin droit. Le fond
          creusé reste : c'est lui qui porte la pastille du palier actif. */}
      <div className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-control bg-surface-muted px-1 py-1">

      {/*
        DEUX FAÇONS DE CADRER LE TEMPS, ET ELLES NE RÉPONDENT PAS À LA MÊME QUESTION.

        Un PAS (« 5 m ») fixe la finesse : chaque bougie couvre cinq minutes, et la
        fenêtre suit. Une DURÉE (« 7 j ») fixe l'étendue et laisse la source choisir
        sa finesse. Les places de trading raisonnent en pas, les sites d'analyse en
        durée — et les deux ont raison pour leur usage.

        Les deux rangées coexistent donc, exclusives l'une de l'autre : choisir un pas
        éteint le palier de durée et réciproquement. Les mêler dans une seule rangée
        ferait croire à sept réglages du même genre, dont deux se contrediraient.
      */}
      {/*
        ── LES PAS DE BOUGIE NE S'AFFICHENT QU'EN MODE CHANDELIERS ────────────

        Six boutons supplémentaires — 1 m, 5 m, 15 m, 1 h, 4 h, 1 J — s'affichaient dès
        que la source proposait des bougies, c'est-à-dire sur toutes les fiches crypto,
        y compris quand la courbe tracée était une aire.

        Or un PAS ne décrit qu'une bougie : sur une ligne continue il ne change rien de
        visible à la finesse perçue, et il occupe pourtant le tiers du groupe de droite.
        Il ne paraît donc que là où il commande réellement quelque chose. Le lecteur qui
        veut ce réglage passe en chandeliers, ce qui est exactement le geste qui le rend
        pertinent.

        `props.intervalId` est testé en plus du type : un pas déjà choisi doit rester
        visible même si l'on revient à l'aire, sans quoi un bouton actif disparaîtrait
        en laissant son effet en place.
      */}
      {props.intervals.length > 0 && (OHLC_TOOLBAR_KINDS.has(props.kind) || props.intervalId) ? (
        /* `flex-wrap` sur les GROUPES autant que sur la barre : un groupe est un
           élément flexible comme un autre, avec une largeur minimale égale à son
           contenu. Sept boutons de palier tiennent à 1 200 px et POUSSENT LA PAGE à
           393 — mesuré, la fiche d'actif débordait de 69 px par ce seul chemin. */
        <div
          className="flex min-w-0 flex-wrap items-center gap-0.5"
          role="group"
          aria-label={t('Pas de bougie')}
        >
          {props.intervals.map((interval) => (
            <button
              key={interval.id}
              type="button"
              onClick={() => props.onIntervalChange(interval.id)}
              aria-pressed={interval.id === props.intervalId}
              className={`flex h-7 min-w-[2rem] items-center justify-center px-1.5 text-xs font-medium transition-colors duration-150 ${
                interval.id === props.intervalId
                  ? 'bg-brand-soft text-brand-strong'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {interval.label}
            </button>
          ))}

          <Separator orientation="vertical" className="mx-1.5 h-4 bg-border-subtle" />
        </div>
      ) : null}

      <div
        className="flex min-w-0 flex-wrap items-center gap-0.5"
        role="group"
        aria-label={t('Période affichée')}
      >
        {RANGE_PRESETS.map((preset) => {
          // Un palier de durée n'est « actif » que si AUCUN pas ne l'est : sans cette
          // condition, deux boutons de la barre s'allumeraient en même temps pour
          // décrire deux cadrages différents.
          const active = !props.customRange && !props.intervalId && preset.id === props.rangeId

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                props.onIntervalChange(null)
                props.onRangeChange(preset)
              }}
              aria-pressed={active}
              {...(preset.title ? { title: preset.title, 'aria-label': preset.title } : {})}
              /*
                LE PALIER ACTIF PORTE UN FOND, PLUS UNE BORDURE.

                Il était bordé, faute de mieux : la rangée flottait sur le fond de la
                page, et un aplat clair sur du clair n'aurait rien délimité. La rangée
                est désormais une pastille creusée (voir son commentaire), donc le
                contraste existe — un fond suffit, et c'est exactement ce que fait la
                référence : « 24H » y ressort en pastille pleine sur le creux.

                `rounded-pill` pour s'accorder au cadre qui les contient, et `h-6` au
                lieu de `h-7` pour que la pastille du cadre ne grossisse pas la rangée
                de ses deux pixels de rembourrage.
              */
              /* ⚠️ `px-2` ET NON `px-2.5` — CES QUATRE PIXELS DÉCIDENT D'UNE RANGÉE.
                 Mesuré : la pastille demandait 389 px pour une piste de grille de 358,
                 et basculait donc sur une seconde rangée alors que la barre avait la
                 place. Sept paliers à 5 px de rembourrage de moins rendent 28 px, ce qui
                 suffit à la faire rentrer. Voir la note de la pastille. */
              className={`flex h-6 items-center justify-center rounded-[6px] px-2 text-xs font-medium transition-colors duration-150 ${
                active
                  /* ⚠️ `bg-surface-active` (L4) ET NON `bg-overlay`. Les deux jetons se valaient
                     tant que `overlay` était #1b232d, un cran au-dessus des cartes ; il vaut
                     désormais #14151b, EXACTEMENT le ton de la surface qui porte cette barre —
                     la pastille active devenait donc invisible.

                     DESIGN_BACKPACK.md range précisément cet état sur L4, « onglets actifs et
                     boutons segmentés » : #383a45. C'est aussi ce que fait Dropstab, mesuré sur
                     leur fiche Bitcoin — rgb(63, 63, 70) sur un fond nettement plus sombre. */
                  ? 'bg-surface-active text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>


      <DateRangePicker
        value={props.customRange}
        onChange={props.onCustomRange}
      />

      {/* Un filet sépare le CADRAGE de ce qu'on fait du résultat — deux familles qui
          se suivent sur la même ligne et qu'aucun blanc ne distinguerait. */}
      <Separator orientation="vertical" className="mx-0.5 h-4 bg-border-subtle" />

      {/* ⚠️ LE BOUTON « COPIER LE LIEN DE CETTE VUE » A ÉTÉ RETIRÉ (demande explicite).

          Ce qu'il faisait n'est pas perdu : l'adresse de la barre porte déjà la période,
          la grandeur et les comparaisons — c'est ce qui rend une vue partageable — et le
          navigateur sait copier son propre champ d'adresse. Le bouton doublait une
          commande que tout navigateur porte déjà, dans une rangée où chaque pixel
          disputait sa place aux périodes. */}

        {/*
          ══════════════════════════════════════════════════════════════════════
          LE « ⋮ » FERME LA BARRE — OPTIONS D'AFFICHAGE PUIS EXPORT
          ══════════════════════════════════════════════════════════════════════

          Ce bout de rangée a porté successivement le plein écran, un « ⋯ »
          fourre-tout, puis une flèche de téléchargement seule. Le fourre-tout avait
          été retiré pour une raison juste — « un ⋯ ne promet rien, et c'est
          précisément ce qui le rend impossible à chercher » — et la conclusion qu'on
          en avait tirée était trop large : ce n'est pas le pictogramme qui était en
          cause, c'est ce qu'on y avait mis. Il contenait la DEVISE, réglage de lecture
          qu'on change en cours de consultation, à côté de formats de fichier.

          La devise est partie ailleurs (voir les props). Ce qui reste — échelle
          logarithmique, sous-panneau de volume, moyenne mobile, extrêmes historiques,
          et les quatre formats d'export — forme enfin une famille cohérente : tout ce
          qui se règle UNE FOIS et ne change pas ce qui est tracé. C'est exactement le
          contenu du « ⋮ » de la référence, et c'est sa place, en bout de rangée.

          ── POURQUOI L'EXPORT EST UN SOUS-BLOC ET NON UN BOUTON ─────────────

          Les quatre formats ne sont pas interchangeables. PNG et JPEG sont des images
          de pixels, bonnes pour un message ou une diapositive ; SVG est vectoriel,
          donc net à l'impression et retouchable ; PDF est ce qu'on joint à une note.
          Choisir à la place du lecteur reviendrait à décider de l'usage qu'il fera du
          fichier. Aucun n'est produit par une bibliothèque tierce — voir `exportChart`.

          ── ET LE PLEIN ÉCRAN ? ─────────────────────────────────────────────

          Il n'existe plus du tout. Le bouton avait déjà disparu de cette rangée, et
          le double-clic sur la courbe qui en tenait lieu a été retiré à son tour :
          geste invisible, déclenché par accident en inspectant le tracé au curseur.
          Voir la note dans `AssetWorkspace`.
        */}
        {/*
          ══════════════════════════════════════════════════════════════════════
          LE MENU D'OPTIONS D'AFFICHAGE EST RETIRÉ — IL N'EN RESTE QUE L'EXPORT
          ══════════════════════════════════════════════════════════════════════

          La barre portait un second menu, sous un pictogramme de curseurs : échelle
          logarithmique, volume en sous-panneau, moyenne mobile, extrêmes historiques.
          Il a été retiré sur demande, et la référence n'en a pas non plus.

          CE QUE CELA CHANGE, dit clairement : l'échelle logarithmique, la moyenne
          mobile et les repères de plus haut / plus bas historiques ne sont plus
          atteignables depuis la barre. Le graphique sait toujours les tracer — ce sont
          des propriétés de `PriceChartInteractive`, conservées — mais plus rien ne les
          allume. La bande de VOLUME, elle, ne dépend plus d'une case à cocher : elle est
          affichée dès que la source publie des volumes, comme chez la référence.

          `Menubar` reste, avec un seul menu. Le composant n'est pas de trop pour
          autant : c'est lui qui porte la navigation au clavier et les rôles ARIA du
          menu d'export, et l'y remplacer par un `DropdownMenu` ne ferait qu'échanger
          une importation contre une autre.
        */}
        <Menubar className="h-auto border-0 bg-transparent p-0 shadow-none">
          {/*
            ══════════════════════════════════════════════════════════════════
            LE MENU DES RÉGLAGES DU TRACÉ EST REVENU, À CÔTÉ DE « COMPARER »
            ══════════════════════════════════════════════════════════════════

            Il avait été retiré, et les quatre propriétés qu'il commandait étaient
            devenues des constantes éteintes dans `AssetWorkspace` : le graphique
            savait tracer une moyenne mobile, des repères d'extrêmes et une échelle
            logarithmique que plus rien n'allumait.

            Il revient sous la forme qu'a CoinMarketCap — une roue dentée voisine du
            bouton de comparaison, ouvrant une liste d'interrupteurs. Les entrées, en
            revanche, sont les nôtres : on n'affiche pas « Fear Index » ou « Price in
            SOL » faute d'avoir ces séries, et une case qui ne commande rien vaut moins
            que pas de case (§5). C'est l'appelant qui compose la liste, comme pour
            `renderOptions`.

            Le menu ne s'affiche pas si la liste est vide — un réglage à zéro option
            n'est pas un réglage.
          */}
          {props.settings.length > 0 ? (
            <MenubarMenu>
              <MenubarTrigger
                title={t('Réglages du graphique')}
                className="flex h-7 items-center gap-1 rounded-control border border-border-subtle px-2 text-xs font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink data-[state=open]:bg-surface-muted"
              >
                {/* ⚠️ `Settings` ET NON `Settings2`. Le second est un jeu de CURSEURS
                    — trois glissières horizontales — qui promet des réglages continus :
                    une opacité, une épaisseur. Ce menu ne contient que des
                    interrupteurs. La roue dentée est le pictogramme des réglages en
                    général, et c'est celui de la référence (capture Dropstab). */}
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              </MenubarTrigger>

              <MenubarContent align="end" className="min-w-[15rem] border-border-subtle bg-overlay">
                {SETTING_GROUPS.map((group, index) => {
                  /* Le regroupement se fait ICI et non chez l'appelant : c'est le menu
                     qui connaît sa mise en forme, et l'appelant qui connaît ses
                     réglages. Une entrée sans `group` retombe sur `chart` — les
                     appelants antérieurs n'en déclaraient pas. */
                  const entries = props.settings.filter(
                    (setting) => (setting.group ?? 'chart') === group.id,
                  )
                  if (entries.length === 0) return null

                  return (
                    <Fragment key={group.id}>
                      {/* Le séparateur précède l'intertitre au lieu de le suivre :
                          posé après, il aurait détaché le titre de sa propre liste. */}
                      {index > 0 ? <MenubarSeparator /> : null}

                      <MenubarLabel className="text-micro uppercase tracking-wide text-ink-muted">
                        {t(group.label)}
                      </MenubarLabel>

                      {entries.map((setting) => (
                        /*
                          ══════════════════════════════════════════════════════════
                          UN INTERRUPTEUR À DROITE, PLUS UNE COCHE À GAUCHE
                          ══════════════════════════════════════════════════════════

                          La rangée portait la coche de `MenubarCheckboxItem` : un
                          crochet qui APPARAÎT à gauche du libellé quand l'option est
                          active, et laisse un vide sinon. Une liste à moitié cochée s'y
                          lit comme une liste trouée, et rien ne dit qu'une rangée
                          éteinte est ACTIVABLE — un vide ne promet rien.

                          Un interrupteur montre les deux états dans le même objet :
                          éteint, il occupe la même place et se voit. C'est la forme de
                          la référence (capture Dropstab), et celle des préférences du
                          site.

                          ⚠️ `MenubarCheckboxItem` EST CONSERVÉ SOUS L'APPARENCE. Il
                          porte `role="menuitemcheckbox"`, l'état `aria-checked` et la
                          navigation aux flèches — trois choses qu'un `<div>` avec un
                          interrupteur peint dedans ne donnerait pas. Seul son INDICATEUR
                          est masqué (`[&>span:first-child]:hidden`), et le rembourrage
                          gauche qu'il réservait rendu au libellé.
                        */
                        <MenubarCheckboxItem
                          key={setting.id}
                          checked={setting.checked}
                          /* `disabled` plutôt que masqué : « Volume » sur un actif dont
                             la source ne publie aucun volume doit se voir comme
                             indisponible, pas comme inexistant — c'est la règle déjà
                             appliquée aux grandeurs du segment de gauche. */
                          disabled={setting.available === false}
                          /* Radix referme le menu au choix. On l'en empêche : régler un
                             graphique se fait en regardant l'effet, et rouvrir le menu à
                             chaque case coûterait un aller-retour par réglage. */
                          onSelect={(event) => {
                            event.preventDefault()
                            props.onSettingChange(setting.id, !setting.checked)
                          }}
                          className="justify-between gap-4 pl-2 [&>span:first-child]:hidden"
                        >
                          <span className="min-w-0 flex-1 truncate">{t(setting.label)}</span>

                          {/* La piste et son pouce, dessinés ici plutôt qu'empruntés au
                              `Switch` du site : celui-ci est un bouton à part entière,
                              et l'imbriquer dans une rangée de menu donnerait deux
                              cibles cliquables concentriques dont l'une avalerait le
                              clic de l'autre. Ici la RANGÉE reste la cible unique, et
                              ceci n'est qu'un témoin. */}
                          <span
                            aria-hidden="true"
                            className={`relative h-4 w-7 shrink-0 rounded-pill transition-colors duration-150 ${
                              setting.checked ? 'bg-brand' : 'bg-surface-active'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-3 w-3 rounded-pill bg-canvas transition-[left] duration-150 ${
                                setting.checked ? 'left-3.5' : 'left-0.5'
                              }`}
                            />
                          </span>
                        </MenubarCheckboxItem>
                      ))}
                    </Fragment>
                  )
                })}
              </MenubarContent>
            </MenubarMenu>
          ) : null}

          <MenubarMenu>
            <MenubarTrigger
              title={t('Exporter le graphique')}
              className="flex h-7 items-center gap-1 rounded-control border border-border-subtle px-2 text-xs font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink data-[state=open]:bg-surface-muted"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            </MenubarTrigger>

            <MenubarContent align="end" className="min-w-[14rem] border-border-subtle bg-overlay">
              {/* QUATRE FORMATS, ET AUCUN N'EST DE TROP : PNG et JPEG sont des grilles
                  de pixels, bonnes pour un message ou une diapositive ; SVG est
                  vectoriel, donc net à l'impression et retouchable ; PDF est ce qu'on
                  joint à une note. Choisir à la place du lecteur reviendrait à décider
                  de l'usage qu'il fera du fichier. */}
              <MenubarLabel className="text-micro uppercase tracking-wide text-ink-muted">
                {t('Exporter')}
              </MenubarLabel>

              {(['png', 'jpeg', 'svg', 'pdf'] as const).map((format) => (
                <MenubarItem key={format} onSelect={() => props.onExport(format)}>
                  <Download className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                  {t('Télécharger en {format}').replace('{format}', format.toUpperCase())}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
      </div>
    </div>
    </div>
  )
}

/* ── Pièces communes ───────────────────────────────────────────────────────── */



/**
 * ══════════════════════════════════════════════════════════════════════════════
 * « COMPARER » — UN MENU AU SURVOL, QUI PROPOSE LES CRYPTOS EN TENDANCE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE C'ÉTAIT, ET POURQUOI CELA NE TENAIT PAS ───────────────────────────
 *
 * Un PANNEAU ouvert au clic : un champ de recherche interrogeant tout le catalogue,
 * la liste des pairs de la fiche, un second bloc « Dans tout le catalogue », un
 * rappel de la base 100 et un bouton « Terminé ». Cinq pièces pour un geste qui, en
 * pratique, en demande une : poser une seconde courbe à côté de celle qu'on regarde.
 *
 * Le coût n'était pas le nombre de pièces mais la QUESTION qu'elles posaient. Un
 * champ vide demande « avec quoi ? » — la pire question à poser à quelqu'un qui vient
 * d'ouvrir une fiche, puisque c'est précisément ce qu'il n'a pas encore décidé. La
 * recherche ne servait que ceux qui savaient déjà, c'est-à-dire presque personne
 * devant ce bouton-là.
 *
 * ── CE QUE LE MENU PROPOSE À LA PLACE ────────────────────────────────────────
 *
 * Les CRYPTOMONNAIES EN TENDANCE, servies par `/api/tendances` — la même liste que
 * l'overlay de recherche et le tiroir de marché, donc le même cache applicatif et
 * aucun appel de plus à la source. Ce sont les actifs que le marché regarde à
 * l'instant : la réponse la plus probable à « avec quoi ? », et une réponse qu'on
 * n'aurait pas su taper.
 *
 * ⚠️ CE QUI EST PERDU, ET OÙ IL SE RETROUVE. On ne compare plus, depuis cette barre,
 * avec n'importe quel actif du catalogue. `/comparateur` fait exactement cela —
 * jusqu'à six actifs de toutes classes, avec son propre champ de recherche. Le menu
 * garde le geste d'un clic ; la comparaison composée a sa page.
 *
 * ── L'OUVERTURE SE FAIT AU SURVOL ────────────────────────────────────────────
 *
 * Une liste courte, lue à l'œil et quittée d'un mouvement : c'est un MENU, et un menu
 * s'ouvre au passage du curseur, comme ceux de l'en-tête. Le clic reste — c'est la
 * seule voie du clavier et du tactile — et le survol est réservé aux pointeurs FINS
 * (`pointerType === 'mouse'`) : sur un écran tactile, `pointerenter` précède le clic,
 * si bien que le doigt ouvrirait le menu un instant avant de le refermer.
 *
 * ── LES PAIRS DE LA FICHE RESTENT, EN SECOURS ────────────────────────────────
 *
 * `options` — les pairs de secteur et les deux repères que la page compose — n'est
 * plus la liste principale mais le REPLI : tendances en panne, ou fiche d'une classe
 * que des tendances crypto ne concernent pas. Sans lui, un incident sur une source
 * rendrait le bouton inerte au lieu de le rendre moins bon.
 *
 * ── « TERMINÉ » A DISPARU AVEC LE PANNEAU ────────────────────────────────────
 *
 * Chaque clic applique immédiatement son effet, et un menu ouvert au survol se ferme
 * quand le curseur le quitte : le bouton de sortie n'avait plus rien à fermer. Échap
 * et le clic extérieur restent, pour les deux autres façons d'ouvrir.
 */
function ComparePanel({
  ids,
  options,
  onChange,
  onDiscover,
  metrics,
  selfId,
}: {
  ids: string[]
  /** Repli quand les tendances manquent ou ne concernent pas la fiche. */
  options: CompareOption[]
  onChange: (ids: string[]) => void
  /**
   * Signale un actif venu des TENDANCES, avant qu'il ne rejoigne la sélection.
   *
   * La fiche ne connaît que la liste qu'elle a passée : sans ce rappel, un actif
   * choisi ici serait un identifiant nu — pas de libellé pour nommer sa courbe, pas
   * de classe pour aller chercher sa série au bon endroit.
   */
  onDiscover?: (option: CompareOption) => void
  /*
   * ⚠️ `metrics` RESTE, SEUL DE SON GROUPE, ET POUR UNE RAISON PRÉCISE.
   *
   * Le panneau recevait aussi `metric`, `metricOptions` et `onMetricsChange` : de quoi
   * proposer de superposer une grandeur à la courbe. Cette liste a été retirée, et les
   * trois props qui la servaient avec elle.
   *
   * Celle-ci n'est pas une commande mais un COMPTE. Les emplacements de comparaison
   * sont partagés entre les actifs et les grandeurs : si une superposition de grandeur
   * a été posée ailleurs — l'état vit dans `AssetWorkspace` et survit à ce menu — elle
   * occupe une place, et le décompte du bouton doit en tenir compte. L'ignorer ferait
   * annoncer « 2 » quand trois courbes sont tracées.
   */
  metrics: string[]
  /**
   * L'actif de la FICHE, à retirer des tendances.
   *
   * `options` était filtré par la page ; les tendances ne le sont par personne, et un
   * actif qui vaut la peine d'être consulté est précisément celui qui a des chances
   * d'y figurer. Sans ce retrait, la première ligne du menu d'une fiche chaude
   * proposerait de la comparer à elle-même — une courbe plate à 100.
   */
  selfId?: string
}) {
  const t = usePhrase()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { state, mounted, onTransitionEnd } = usePresence(open)
  /* Le menu se referme quand le curseur le quitte — c'est la contrepartie de
     l'ouverture au survol. Le sursis de `useHoverDismiss` couvre les quelques pixels
     entre le bouton et le panneau, qui n'appartiennent ni à l'un ni à l'autre. */
  const hoverDismiss = useHoverDismiss(() => setOpen(false), open)

  /**
   * Tendances chargées à la PREMIÈRE ouverture, puis gardées pour la session.
   *
   * `null` tant que rien n'est revenu, et c'est une distinction qui compte : « on
   * cherche encore » et « la source n'a rien » ne s'affichent pas pareil. Un menu qui
   * montrerait les pairs de la fiche pendant le chargement, puis les remplacerait par
   * les tendances, changerait de contenu sous un curseur déjà en train de viser.
   */
  const [trending, setTrending] = useState<CompareOption[] | null>(null)
  const trendingLoaded = useRef(false)

  useEffect(() => {
    if (!open || trendingLoaded.current) return
    trendingLoaded.current = true

    fetch('/api/tendances')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        setTrending(
          ((payload?.trending ?? []) as MarketAsset[]).map((entry) => ({
            id: entry.id,
            label: entry.name,
            /* La classe est ÉCRITE, pas devinée : `/api/tendances` ne sert que des
               cryptomonnaies, et sans elle la fiche irait chercher la série de chaque
               comparant à l'adresse de SA propre classe — « identifiant inconnu » dès
               qu'on compare une action à un jeton. */
            assetClass: 'crypto' as const,
            ...(entry.symbol ? { symbol: entry.symbol } : {}),
            ...(entry.image ? { image: entry.image } : {}),
          })),
        )
      })
      .catch(() => {
        /* Panne des tendances : on bascule sur le repli plutôt que de laisser le menu
           en chargement perpétuel, et on réautorise une tentative à la réouverture. */
        trendingLoaded.current = false
        setTrending([])
      })
  }, [open])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  /* Total des deux familles : les emplacements sont partagés, parce que c'est le
     nombre de COURBES que le cadre peut porter qui est limité, pas leur nature. */
  const used = ids.length + metrics.length
  const full = used >= COMPARE_MAX

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LE CHAMP DE RECHERCHE REVIENT, ET L'OBJECTION QUI L'AVAIT RETIRÉ EST LEVÉE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Un champ existait, et la note qui a justifié son retrait disait vrai : « la
   * recherche faisait sauter le cadre à chaque frappe ». Le défaut venait de la
   * HAUTEUR FIXE de la liste — 192 px, six rangées — qui se réajustait à chaque
   * filtrage. Cette hauteur est devenue un PLAFOND depuis (`max-h-64`), et la liste ne
   * saute donc plus : elle raccourcit dans une boîte dont le haut ne bouge pas.
   *
   * Il revient parce qu'une liste de tendances, si utile soit-elle, ne contient pas
   * l'actif qu'on a en tête. Sans champ, comparer à un actif absent des sept premières
   * lignes était simplement impossible.
   *
   * ⚠️ LA RECHERCHE FILTRE CE QUI EST CHARGÉ, ELLE N'INTERROGE PAS LE SERVEUR. La
   * distinction est écrite dans l'état vide : « Aucun actif de cette liste » et non
   * « aucun résultat », qui laisserait croire que l'actif n'existe pas.
   */
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  /* La rangée désignée au clavier. `-1` = aucune, ce qui est l'état au montage et
     après chaque frappe : le curseur ne doit pas survivre à un changement de liste. */
  const [marked, setMarked] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

  /* Tendances d'abord, pairs de la fiche en repli — et l'intitulé suit, sans quoi une
     liste de secteur s'annoncerait « En tendance ». */
  const { entries, fallback } = useMemo(() => {
    if (trending === null) return { entries: [] as CompareOption[], fallback: false }
    const list = trending.filter((entry) => entry.id !== selfId)
    const base = list.length > 0 ? list : options
    const isFallback = list.length === 0

    const terme = query.trim()
    if (terme === '') return { entries: base, fallback: isFallback }

    /* `normalise` retire les diacritiques ET la casse : « éther » doit trouver
       « Ether », et « BTC » « btc ». La comparaison porte sur le symbole ET sur le
       nom — on tape l'un ou l'autre selon ce dont on se souvient. */
    const normalise = (value: string) =>
      value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    const cible = normalise(terme)

    return {
      entries: base.filter(
        (entry) =>
          normalise(entry.label).includes(cible) ||
          (entry.symbol ? normalise(entry.symbol).includes(cible) : false),
      ),
      fallback: isFallback,
    }
  }, [trending, options, selfId, query])

  /* Le champ prend le focus à l'ouverture — c'est ce qu'on vient y faire. Le report
     d'une image laisse au panneau le temps d'être posé : `focus()` sur un nœud pas
     encore peint est sans effet. */
  useEffect(() => {
    if (!open) return
    const image = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(image)
  }, [open])

  /* La rangée désignée reste visible quand on descend au-delà du cadre. */
  useEffect(() => {
    if (marked < 0) return
    const noeud = listRef.current?.querySelectorAll('button')[marked]
    noeud?.scrollIntoView({ block: 'nearest' })
  }, [marked])

  function toggleAsset(entry: CompareOption) {
    if (ids.includes(entry.id)) {
      onChange(ids.filter((id) => id !== entry.id))
      return
    }
    if (full) return
    /* L'entrée est REMONTÉE avant d'être retenue : la fiche doit connaître sa classe
       d'actif pour aller chercher la bonne série — une action ne se demande pas à
       l'adresse des cryptomonnaies — et son libellé pour nommer la courbe. */
    onDiscover?.(entry)
    onChange([...ids, entry.id])
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      /* `pointerenter` et non `mouseenter` : c'est le seul des deux qui dit AVEC QUOI
         on est entré, et donc le seul qui permette de n'ouvrir qu'au vrai survol. */
      onPointerEnter={(event) => {
        hoverDismiss.onMouseEnter()
        if (event.pointerType === 'mouse') setOpen(true)
      }}
      onMouseLeave={hoverDismiss.onMouseLeave}
    >
      {/*
        ── LE DÉCLENCHEUR EST UNE PASTILLE À CROIX, PLUS UN BOUTON À CHEVRON ────

        Il ressemblait aux autres commandes de la barre : un rectangle bordé, un
        libellé, un chevron vers le bas. Trois signes qui disent « ceci ouvre une
        liste » — vrai, et sans intérêt, puisque c'est le cas de la moitié de la barre.

        La référence en fait une PASTILLE TEINTÉE portant une croix cerclée. Les deux
        signes disent autre chose : la teinte, que ce bouton n'est pas un réglage mais
        une ACTION ; la croix, qu'elle AJOUTE quelque chose au graphique. C'est le seul
        bouton de la rangée qui change ce qui est tracé plutôt que la façon de le
        tracer, et c'est ce que la forme doit annoncer.
      */}
      <button
        type="button"
        /*
          ⚠️ LE CLIC OUVRE, IL NE BASCULE PLUS — ET C'EST LE SURVOL QUI L'IMPOSE.

          Avec une bascule, la souris passait sur le bouton (le menu s'ouvrait), puis
          le clic le REFERMAIT : cliquer sur « Comparer » semblait ne rien faire, ce
          qui est le pire des trois comportements possibles. Constaté au navigateur.

          Le clic ne sert donc plus qu'aux deux entrées qui n'ont pas de survol — le
          clavier et le tactile — et il n'a qu'un sens pour elles : ouvrir. La
          fermeture reste assurée par les trois voies qui la portaient déjà : le
          départ du curseur, la touche Échap et le clic à l'extérieur.
        */
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3 text-xs font-semibold transition-colors duration-150 ${
          open || used > 0
            ? 'bg-brand-soft text-brand-strong'
            : 'bg-surface-muted text-ink-muted hover:text-ink'
        }`}
      >
        <PlusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t('Comparer')}
        {/* Le DÉCOMPTE sur le bouton fermé : c'est la seule façon de savoir qu'une
            comparaison est active sans rouvrir le menu. La teinte dit « il y a
            quelque chose », le nombre dit combien. */}
        {used > 0 ? <span className="tabular">({used})</span> : null}
      </button>

      {mounted ? (
        <div
          /*
           * `dialog` ET NON `menu`, alors que c'en est un au survol.
           *
           * `role="menu"` engage une promesse au clavier — flèches haut/bas, Home,
           * Fin, échappement du piège de tabulation — que ce composant ne tient pas et
           * n'a pas besoin de tenir : ses rangées sont des interrupteurs qu'on coche et
           * décoche, pas des commandes qui referment le menu. Annoncer un menu sans
           * son pilotage vaut moins que d'annoncer un conteneur que Tab parcourt.
           */
          role="dialog"
          aria-label={t('Comparer avec un autre actif')}
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          /*
            ── LES MESURES SONT CELLES DE LA RÉFÉRENCE, RELEVÉES AU NAVIGATEUR ──

            256 px de large, rayon 12 px, filet de 1,25 px. Le panneau portait
            `rounded-dense` — zéro rayon — au motif que c'est un INSTRUMENT et non une
            carte (voir la doctrine des deux familles dans `globals.css`). La règle vaut
            pour une surface qu'on parcourt et dont les rangées s'aboutent ; celle-ci
            est un objet posé sur la page, avec un début et une fin.
          */
          className="menu-panel absolute left-0 top-full z-50 mt-1.5 w-64 rounded-card border border-border-subtle bg-overlay p-2 shadow-overlay"
        >
          {/*
            ── LE CHAMP, ET LES QUATRE TOUCHES QU'IL PORTE ────────────────────

            Les flèches déplacent le curseur, Entrée retient l'actif désigné, Échap
            ferme. Le champ garde le focus tout du long : c'est ce qui permet
            d'enchaîner « btc ↓ Entrée » sans lâcher le clavier.

            ⚠️ `preventDefault` SUR LES FLÈCHES EST INDISPENSABLE. Sans lui, la flèche
            bas déplace le CURSEUR DE TEXTE dans le champ et fait défiler la page
            derrière le panneau — deux effets parasites pour un geste de navigation.
          */}
          <div className="relative mb-1.5">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              /* ⚠️ LES DEUX ÉTATS CHANGENT ENSEMBLE, ET NON DANS UN EFFET. Une
                 remise à zéro du curseur écrite en `useEffect([query])` est refusée par
                 le linter — « cascading renders » — et il a raison : ce n'est pas une
                 réaction à un rendu, c'est une conséquence directe de la frappe. Garder
                 le curseur désignerait une rangée que le filtrage a déplacée. */
              onChange={(event) => {
                setQuery(event.target.value)
                setMarked(-1)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setMarked((precedent) => Math.min(precedent + 1, entries.length - 1))
                  return
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setMarked((precedent) => Math.max(precedent - 1, -1))
                  return
                }
                if (event.key === 'Enter') {
                  const entree = entries[marked]
                  if (!entree) return
                  event.preventDefault()
                  /* Le garde est le même que celui du clic : une entrée non retenue
                     n'est pas ajoutable quand les quatre places sont prises. */
                  if (!ids.includes(entree.id) && full) return
                  toggleAsset(entree)
                }
              }}
              placeholder={t('Rechercher un actif…')}
              aria-label={t('Rechercher un actif à comparer')}
              className="h-8 w-full rounded-control border border-border-subtle bg-surface-muted pl-8 pr-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </div>

          <p className="px-2 pb-1 text-micro font-semibold uppercase tracking-wide text-ink-muted">
            {query.trim() !== ''
              ? t('Résultats')
              : fallback
                ? t('Comparables')
                : t('En tendance')}
          </p>

          {/*
            LA HAUTEUR EST PLAFONNÉE, PLUS FIXE.

            Elle était fixe — 192 px, six rangées — parce que la recherche faisait
            sauter le cadre à chaque frappe. Sans champ, la liste ne change plus une
            fois chargée : la fixer ne ferait plus que réserver du vide sous une
            tendance qui n'en compte que sept.

            `thin-scrollbar` : un ascenseur de 6 px au pouce discret. Sans lui, le
            navigateur en pose un de 15 px qui mange le quart droit des libellés.
          */}
          <div ref={listRef} className="thin-scrollbar max-h-64 overflow-y-auto overscroll-contain">
            {trending === null ? (
              <p className="px-2 py-3 text-center text-xs text-ink-muted">{t('Chargement…')}</p>
            ) : null}

            {trending !== null && entries.length === 0 ? (
              /* ⚠️ « DE CETTE LISTE » ET NON « AUCUN RÉSULTAT ». Le champ filtre ce qui
                 est chargé, il n'interroge pas le serveur : dire « aucun résultat »
                 laisserait croire que l'actif n'existe pas, alors qu'il est seulement
                 hors des tendances du moment. */
              <p className="px-2 py-3 text-center text-xs text-ink-muted">
                {query.trim() !== ''
                  ? t('Aucun actif de cette liste ne correspond.')
                  : t('Aucun actif à comparer.')}
              </p>
            ) : null}

            {entries.map((entry, index) => {
              const selected = ids.includes(entry.id)
              /* La rangée désignée au clavier porte le fond de survol : un lecteur qui
                 passe de la souris au clavier retrouve le même repère visuel. */
              const designe = index === marked
              return (
                <button
                  key={entry.id}
                  type="button"
                  /* Une entrée non retenue devient inerte quand les quatre places sont
                     prises. Elle reste VISIBLE et grisée plutôt que masquée : la faire
                     disparaître donnerait l'impression que la liste a changé, alors que
                     c'est la sélection qui est pleine. */
                  disabled={!selected && full}
                  onClick={(event) => {
                    toggleAsset(entry)

                    /*
                      ⚠️ LE FOCUS EST RENDU APRÈS UN CLIC, ET C'EST NÉCESSAIRE.

                      `useHoverDismiss` refuse de fermer tant que le clavier travaille
                      DANS le panneau — un garde-fou juste, et qui se retourne ici : un
                      clic à la souris laisse le focus sur la rangée cliquée, si bien
                      que le menu restait ouvert par-dessus le graphique une fois la
                      courbe posée, alors qu'on venait justement de partir la regarder.
                      Constaté au navigateur, quatre comparaisons sélectionnées.

                      `detail > 0` distingue le VRAI clic de l'activation au clavier
                      (Entrée ou Espace, qui rendent `detail === 0`) : celle-là doit
                      garder son focus, sans quoi la tabulation repartirait du début du
                      document à chaque case cochée.
                    */
                    if (event.detail > 0) event.currentTarget.blur()
                  }}
                  className={`flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-sm text-ink transition-colors duration-150 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 ${
                    designe ? 'bg-surface-muted' : ''
                  }`}
                >
                  {/*
                    ⚠️ `AssetLogo` ET NON UNE BALISE `<img>` NUE.

                    La vignette venait du seul champ `image`, que CoinGecko remplit pour
                    les cryptomonnaies et personne d'autre : les devises, les indices,
                    les matières premières et une bonne part des actions s'affichaient
                    donc en pastille grise. Le composant de logo du site connaît les six
                    classes et ne rend jamais une pastille vide.
                  */}
                  <span className="shrink-0">
                    <AssetLogo
                      asset={{
                        symbol: entry.symbol ?? entry.label,
                        name: entry.label,
                        ...(entry.image ? { image: entry.image } : {}),
                        ...(entry.assetClass ? { assetClass: entry.assetClass } : {}),
                      }}
                      size={20}
                    />
                  </span>
                  {/*
                    LE SYMBOLE PASSE DEVANT, LE NOM LE SUIT EN GRIS.

                    La ligne s'écrivait « Bitcoin (BTC) » : le nom en premier, le code
                    entre parenthèses. C'est l'ordre d'une phrase, pas celui d'une liste
                    qu'on balaye — les noms n'ont ni longueur ni initiale communes, et
                    l'œil n'a aucun bord d'appel.

                    « BTC Bitcoin » aligne au contraire trois ou quatre capitales au même
                    endroit sur toutes les lignes. Le code est ce qu'on connaît et ce
                    qu'on tape ; le nom devient la précision, d'où le gris.
                  */}
                  <span className="min-w-0 flex-1 truncate">
                    {entry.symbol ? (
                      <span className="font-semibold">{entry.symbol.toUpperCase()}</span>
                    ) : null}
                    <span className={entry.symbol ? 'ml-1.5 text-xs text-ink-muted' : ''}>
                      {entry.label}
                    </span>
                  </span>

                  {/*
                    ── LA COCHE EST CERCLÉE ET PLEINE, PAS UN SIMPLE CHEVRON ────

                    Elle occupait une colonne À GAUCHE, avant le logo : une coche nue de
                    14 px qui apparaissait et disparaissait, décalant tout le contenu de
                    la rangée à chaque sélection.

                    Rejetée à DROITE et posée dans un disque plein, elle ne bouge plus
                    rien — la place est réservée en permanence — et se lit de loin. Un
                    disque plein dit « retenu », pas « cochable ».
                  */}
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-pill bg-brand text-on-brand">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Le RAPPEL DE LA BASE 100, à l'endroit où l'on décide de comparer.
              Superposer deux séries de prix impose de les indexer — sans quoi un actif
              à 100 000 € écrase un actif à 3 € — et l'axe cesse alors de porter des
              montants. Le dire ici évite qu'on cherche ensuite pourquoi les euros ont
              disparu de l'échelle. */}
          <p className="mt-1 border-t border-border-subtle px-2 pt-1.5 text-micro leading-snug text-ink-muted">
            {used > 0
              ? t('Courbes en variation depuis le début de la période.')
              : `${COMPARE_MAX} courbes au plus.`}
          </p>
        </div>
      ) : null}
    </div>
  )
}


/**
 * Choix de bornes libres — désormais une GRILLE MENSUELLE, plus deux champs.
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI L'ARGUMENT D'ORIGINE NE TIENT PLUS ───────────
 *
 * Ce sélecteur reposait sur deux `<input type="date">` natifs, au motif — solide —
 * qu'ils sont déjà localisés, accessibles au clavier et branchés sur le sélecteur du
 * système en mobilité. Il a tenu tant que la fonction restait marginale.
 *
 * Il ne tient plus dès qu'on regarde ce que le geste sert VRAIMENT à faire : on ne
 * cherche pas « le 14 », on cherche « la semaine du décrochage ». Un champ natif ne
 * montre rien avant d'être ouvert, ne sait pas dire qu'une plage est en cours de
 * tracé, et n'obéit à aucun de nos jetons de thème — c'était le seul contrôle de la
 * page rendu par le navigateur, et cela se voyait.
 *
 * La grille vit dans `components/ui/DateRangeCalendar.tsx`, avec ses pièges de fuseau traités
 * à la source.
 */
function DateRangePicker({
  value,
  onChange,
}: {
  value: { from: string; to: string } | null
  onChange: (range: { from: string; to: string } | null) => void
}) {
  const t = usePhrase()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  /* La fermeture au départ du curseur redevient possible : il n'y a plus de champ à
     remplir, donc plus de saisie qu'une souris qui dérive pourrait interrompre. */
  const hoverDismiss = useHoverDismiss(() => setOpen(false), open)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative" {...hoverDismiss}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title={t('Choisir des dates précises')}
        aria-label={t('Choisir des dates précises')}
        className={`flex h-7 items-center gap-1 px-1.5 text-xs transition-colors duration-150 ${
          value
            ? 'bg-brand-soft font-medium text-brand-strong'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {/* La plage retenue s'inscrit SUR le bouton. Une icône seule allumée signale
            qu'un réglage est actif sans dire lequel — et c'est le seul réglage de la
            barre qu'aucun voisin ne peut rappeler, puisque les paliers de durée sont
            tous éteints pendant qu'il commande. */}
        {value ? <span className="tabular hidden lg:inline">{compactRange(value)}</span> : null}
      </button>

      {/* ANCRÉ À DROITE : le bouton vit dans le coin droit de la barre, et un panneau
          de deux mois posé depuis son bord gauche déborderait du cadre du graphique.
          `rounded-card` et non `rounded-dense` — c'est un panneau, pas une pastille. */}
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 rounded-card border border-border-subtle bg-overlay p-4 shadow-overlay">
          <DateRangeCalendar
            value={value}
            onChange={(range) => {
              onChange(range)
              // Fermeture sur une plage COMPLÈTE seulement. `null` remonte aussi du
              // bouton « Effacer », après quoi le lecteur veut manifestement choisir
              // autre chose : refermer sous ses doigts l'obligerait à rouvrir.
              if (range) setOpen(false)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

/** « 3 août → 12 août » — assez court pour tenir sur un bouton de barre d'outils. */
function compactRange(range: { from: string; to: string }): string {
  const format = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number)
    if (!year || !month || !day) return iso
    return new Date(year, month - 1, day, 12).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
  }
  return `${format(range.from)} → ${format(range.to)}`
}


