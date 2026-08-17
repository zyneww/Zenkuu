'use client'

import {
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Link2,
  LineChart,
  MoreVertical,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import { usePresence } from '@/components/nav/usePresence'
import { Calendar } from '@/components/ui/Calendar'

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
 */

export interface RangePreset {
  id: string
  label: string
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
 * « DEPUIS JANV. » reste écrit en toutes lettres plutôt que réduit à « YTD » : le
 * sigle est anglais, et il n'y a aucune raison de le franciser en abrégé illisible ni
 * de le laisser en anglais sur un site français.
 */
export const RANGE_PRESETS: RangePreset[] = [
  { id: '1d', label: '24H', days: 1 },
  { id: '7d', label: '7J', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: 'ytd', label: 'DEPUIS JANV.', days: null },
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

interface ChartToolbarProps {
  metric: string
  metricOptions: { key: string; label: string }[]
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

  logScale: boolean
  onToggleLog: () => void
  showVolume: boolean
  volumeAvailable: boolean
  onToggleVolume: () => void
  showMovingAverage: boolean
  onToggleMovingAverage: () => void
  showPriceLines: boolean
  onTogglePriceLines: () => void

  onCopyLink: () => void
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
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      {/* GAUCHE — ce qui décide de ce qu'on trace. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1">
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
      {props.metricOptions.length > 1 ? (
        <span
          role="group"
          aria-label="Grandeur tracée"
          className="flex min-w-0 items-center gap-0.5 rounded-control bg-surface-muted p-0.5"
        >
          {props.metricOptions.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => props.onMetricChange(entry.key)}
              aria-pressed={entry.key === props.metric}
              className={`flex h-6 items-center justify-center whitespace-nowrap rounded-sm px-2 text-xs font-medium transition-colors duration-150 ${
                entry.key === props.metric
                  ? 'bg-overlay text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </span>
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
      {props.compareOptions.length > 0 || props.metricOptions.length > 1 ? (
        <ComparePanel
          ids={props.compareIds}
          options={props.compareOptions}
          onChange={props.onCompareChange}
          metric={props.metric}
          metrics={props.compareMetrics}
          metricOptions={props.metricOptions}
          onMetricsChange={props.onCompareMetricsChange}
        />
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
      {props.renderOptions.length > 1 ? (
        <Dropdown
          label=""
          icon={<LineChart className="h-3.5 w-3.5" aria-hidden="true" />}
          title="Type de tracé"
        >
          {(close) =>
            props.renderOptions.map((entry) => {
              /* Une entrée sans `kind` — TradingView, profondeur — n'est active que
                 sur sa vue. Une entrée AVEC `kind` exige les deux : sans cette
                 seconde condition, « Courbe » et « Chandeliers » se cocheraient
                 ensemble, tous deux étant la vue `original`. */
              const active =
                entry.view === props.view &&
                (entry.kind === undefined || entry.kind === props.kind)

              return (
                <MenuItem
                  key={entry.id}
                  selected={active}
                  onClick={() => {
                    if (entry.kind !== undefined) props.onKindChange(entry.kind)
                    props.onViewChange(entry.view)
                    close()
                  }}
                >
                  {entry.label}
                </MenuItem>
              )
            })
          }
        </Dropdown>
      ) : null}
      </div>

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
      <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-pill border border-border-subtle bg-surface-muted px-1 py-1">
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
          aria-label="Pas de bougie"
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

          <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-border-subtle" />
        </div>
      ) : null}

      <div
        className="flex min-w-0 flex-wrap items-center gap-0.5"
        role="group"
        aria-label="Période affichée"
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
              className={`flex h-6 items-center justify-center rounded-pill px-2.5 text-xs font-medium transition-colors duration-150 ${
                active
                  ? 'bg-overlay text-ink shadow-sm'
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
      <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border-subtle" />

        <IconButton
          label="Copier le lien de cette vue"
          onClick={props.onCopyLink}
          icon={<Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
        />

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

          Il ne revient pas : la référence n'en a pas à cet endroit. Le cadre garde
          `chart-frame` et son comportement, appelé par un double-clic sur la courbe —
          geste que les deux références acceptent aussi.
        */}
        <Dropdown
          label=""
          icon={<MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />}
          align="right"
          active={props.logScale || props.showMovingAverage || props.showPriceLines}
          title="Options d’affichage et export"
        >
          {(close) => (
            <>
              {/* Les options d'affichage NE FERMENT PAS le menu : on en active
                  volontiers deux ou trois d'affilée — l'échelle logarithmique et la
                  moyenne mobile vont ensemble — et refermer après chacune imposerait
                  de rouvrir autant de fois. Les exports, eux, ferment : ils produisent
                  un fichier, l'action est terminée. */}
              <MenuItem selected={props.logScale} onClick={props.onToggleLog}>
                Échelle logarithmique
              </MenuItem>
              <MenuItem
                selected={props.showVolume}
                disabled={!props.volumeAvailable}
                onClick={props.onToggleVolume}
              >
                Volume en sous-panneau
              </MenuItem>
              <MenuItem selected={props.showMovingAverage} onClick={props.onToggleMovingAverage}>
                Moyenne mobile
              </MenuItem>
              <MenuItem selected={props.showPriceLines} onClick={props.onTogglePriceLines}>
                Extrêmes historiques
              </MenuItem>

              <Separator />

              {(['png', 'jpeg', 'svg', 'pdf'] as const).map((format) => (
                <MenuItem
                  key={format}
                  icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => {
                    props.onExport(format)
                    close()
                  }}
                >
                  Télécharger en {format.toUpperCase()}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>
      </div>
    </div>
  )
}

/* ── Pièces communes ───────────────────────────────────────────────────────── */

/**
 * Menu déroulant, réutilisant les mécanismes de l'en-tête.
 *
 * `usePresence` pour l'animation d'apparition et `useHoverDismiss` pour la fermeture
 * au départ du curseur : ces deux comportements ont été mis au point pour la barre
 * de navigation, et les réécrire ici les ferait diverger à la première retouche.
 */
function Dropdown({
  label,
  icon,
  active = false,
  align = 'left',
  title,
  children,
}: {
  label: string
  icon?: React.ReactNode
  active?: boolean
  align?: 'left' | 'right'
  /** Infobulle et nom accessible — indispensable quand le bouton n'a qu'une icône. */
  title?: string
  children: (close: () => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { state, mounted, onTransitionEnd } = usePresence(open)
  const close = useCallback(() => setOpen(false), [])
  const hoverDismiss = useHoverDismiss(close, open)

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
      {/*
        UN MENU EST ENCADRÉ ; UNE ACTION NE L'EST PAS.

        Toutes les commandes de la barre ont été des pastilles bordées, puis aucune ne
        l'a été — alignées à huit, ces bordures pesaient plus lourd que les libellés
        qu'elles encadraient, et la rangée se lisait comme une collection d'objets
        plutôt que comme un instrument.

        L'encadrement revient ICI SEULEMENT, sur ce qui replie un choix. C'est la forme
        qui dit « il y a autre chose derrière », et un chevron seul ne le dit pas assez :
        sans bordure, « Prix ▾ » se lisait comme un titre de colonne. La référence
        encadre exactement ces deux-là — « Price » et « Compare » — et rien d'autre à
        gauche de sa barre.

        Trois états, trois traitements : au repos une bordure discrète ; à l'ouverture un
        fond ; ACTIF — c'est-à-dire portant un réglage qui n'est plus au défaut — la
        teinte de marque, bordure comprise.
      */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        {...(title ? { title, 'aria-label': title } : {})}
        className={`flex h-7 items-center gap-1 rounded-control border px-2 text-xs font-medium transition-colors duration-150 ${
          open
            ? 'border-border-subtle bg-surface-muted text-ink'
            : active
              ? 'border-brand bg-brand-soft text-brand-strong'
              : 'border-border-subtle text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        {icon}
        {label ? <span className="max-w-[9rem] truncate">{label}</span> : null}
        {label ? (
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        ) : null}
      </button>

      {mounted ? (
        <div
          role="menu"
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          className={`menu-panel absolute top-full z-50 mt-1 min-w-[12rem] rounded-dense border border-border-subtle bg-overlay p-1 shadow-overlay ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({
  children,
  selected = false,
  disabled = false,
  icon,
  onClick,
}: {
  children: React.ReactNode
  selected?: boolean
  disabled?: boolean
  /**
   * Pictogramme posé à la place de la coche.
   *
   * Réservé aux entrées d'ACTION — celles qui font quelque chose et se referment —
   * par opposition aux entrées d'ÉTAT, qui se cochent. Les deux familles cohabitent
   * dans le menu « ⋮ », et rien ne les distinguerait sans cela : « Télécharger en
   * PNG » aurait la même colonne vide que « Moyenne mobile » éteinte.
   */
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'La source ne publie pas cette donnée pour cet actif' : undefined}
      className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? 'text-brand-strong' : 'text-ink hover:bg-surface-muted'
      }`}
    >
      {/* La coche occupe sa place même absente : sans elle, les libellés se
          décaleraient d'un cran en cochant une option, ce qui fait sursauter le menu
          sous le curseur. */}
      <span className="w-3.5 shrink-0 text-ink-muted">
        {selected ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          (icon ?? null)
        )}
      </span>
      {children}
    </button>
  )
}

function Separator() {
  return <hr className="my-1 border-0 border-t border-border-subtle" />
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PANNEAU DE COMPARAISON — deux onglets, quatre emplacements, une validation
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur CoinGecko, dont c'est la commande la mieux dessinée de la barre. Quatre
 * pièces, et chacune règle un problème que le menu à choix simple laissait ouvert.
 *
 * ── LES DEUX ONGLETS : « ACTIFS » ET « GRANDEURS » ───────────────────────────
 *
 * Ils portent deux comparaisons qui ne se ressemblent pas. « Actifs » superpose
 * d'AUTRES actifs à celui de la fiche — c'est la question « où se situe-t-il ».
 * « Grandeurs » superpose d'autres MESURES DU MÊME actif : le cours et la
 * capitalisation, dont l'écart est la seule façon de répondre à « a-t-il monté, ou
 * a-t-il seulement émis des jetons ? ».
 *
 * Les mêler dans une liste unique aurait fait cohabiter « Ethereum » et
 * « Capitalisation », deux entrées dont rien n'indique qu'elles ne s'excluent pas.
 *
 * L'onglet « Grandeurs » ne coûte AUCUN appel : la source publie le cours, la
 * capitalisation et le volume dans la même réponse, et la fiche les a déjà.
 *
 * ── LES QUATRE EMPLACEMENTS, MONTRÉS MÊME VIDES ──────────────────────────────
 *
 * C'est la pièce qui porte tout le reste. Ils affichent l'état complet de la
 * sélection — ce qui est retenu, et combien de places restent — là où un menu
 * n'affiche qu'une coche à la fois. La limite se VOIT donc avant d'être atteinte,
 * plutôt que de se manifester par un clic sans effet.
 *
 * Un emplacement occupé est un bouton de RETRAIT : c'est là que l'œil va chercher ce
 * qu'il veut enlever, et non dans la liste du dessous où il faudrait retrouver la
 * ligne cochée parmi cinquante.
 *
 * ── LA RECHERCHE FILTRE, ELLE N'INTERROGE PAS ────────────────────────────────
 *
 * Les comparables sont déjà en mémoire — la page les a passés en props. Le champ
 * filtre donc une liste locale, sans aller-retour : la frappe est instantanée, ce qui
 * est la condition pour qu'on s'en serve plutôt que de faire défiler.
 *
 * ── « TERMINÉ » NE VALIDE RIEN ───────────────────────────────────────────────
 *
 * Chaque clic applique immédiatement son effet : la courbe apparaît pendant que le
 * panneau est encore ouvert, ce qui permet de juger la comparaison avant de refermer.
 * Le bouton ne fait que fermer, et il existe parce qu'un panneau de cette taille a
 * besoin d'une sortie explicite — cliquer à côté marche aussi, mais ne se devine pas.
 */
function ComparePanel({
  ids,
  options,
  onChange,
  metric,
  metrics,
  metricOptions,
  onMetricsChange,
}: {
  ids: string[]
  options: CompareOption[]
  onChange: (ids: string[]) => void
  /** Grandeur DÉJÀ tracée : elle ne peut pas être superposée à elle-même. */
  metric: string
  metrics: string[]
  metricOptions: { key: string; label: string }[]
  onMetricsChange: (keys: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'assets' | 'metrics'>('assets')
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const { state, mounted, onTransitionEnd } = usePresence(open)
  const close = useCallback(() => setOpen(false), [])

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

  const byId = new Map(options.map((entry) => [entry.id, entry]))

  /* Les grandeurs superposables excluent celle qui est DÉJÀ tracée : la proposer
     laisserait cocher « Prix » sous une courbe de prix, et l'indice résultant serait
     plat à 100 sur toute la fenêtre. */
  const overlayMetrics = metricOptions.filter((entry) => entry.key !== metric)

  /* Total des deux familles : les emplacements sont partagés, parce que c'est le
     nombre de COURBES que le cadre peut porter qui est limité, pas leur nature. */
  const used = ids.length + metrics.length
  const full = used >= COMPARE_MAX

  const needle = query.trim().toLowerCase()
  const shown = needle
    ? options.filter(
        (entry) =>
          entry.label.toLowerCase().includes(needle) ||
          (entry.symbol?.toLowerCase().includes(needle) ?? false),
      )
    : options

  function toggleAsset(id: string) {
    if (ids.includes(id)) onChange(ids.filter((entry) => entry !== id))
    else if (!full) onChange([...ids, id])
  }

  function toggleMetric(key: string) {
    if (metrics.includes(key)) onMetricsChange(metrics.filter((entry) => entry !== key))
    else if (!full) onMetricsChange([...metrics, key])
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-7 items-center gap-1 rounded-control border px-2 text-xs font-medium transition-colors duration-150 ${
          open
            ? 'border-border-subtle bg-surface-muted text-ink'
            : used > 0
              ? 'border-brand bg-brand-soft text-brand-strong'
              : 'border-border-subtle text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        Comparer
        {/* Le DÉCOMPTE sur le bouton fermé : c'est la seule façon de savoir qu'une
            comparaison est active sans rouvrir le panneau. La teinte de marque dit
            « il y a quelque chose », le nombre dit combien. */}
        {used > 0 ? <span className="tabular">({used})</span> : null}
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {mounted ? (
        <div
          role="dialog"
          aria-label="Comparer"
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          className="menu-panel absolute left-0 top-full z-50 mt-1 w-64 rounded-dense border border-border-subtle bg-overlay p-2 shadow-overlay"
        >
          {/* ── Onglets ─────────────────────────────────────────────────────
              Absents quand une seule famille a quelque chose à proposer : deux
              onglets dont l'un est vide font chercher ce qui n'y est pas. */}
          {options.length > 0 && overlayMetrics.length > 0 ? (
            <div
              role="tablist"
              className="mb-2 flex items-center gap-0.5 rounded-control bg-surface-muted p-0.5"
            >
              {(
                [
                  ['assets', 'Actifs'],
                  ['metrics', 'Grandeurs'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex h-6 flex-1 items-center justify-center rounded-sm text-xs font-medium transition-colors duration-150 ${
                    tab === id ? 'bg-overlay text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {/* ── Emplacements ────────────────────────────────────────────────
              Quatre cases, occupées ou non. Voir l'en-tête : c'est la pièce qui rend
              l'état lisible, et elle reste affichée même vide. */}
          <p className="px-0.5 pb-1 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-muted">
            Sélection
          </p>
          <div className="mb-2 grid grid-cols-4 gap-1">
            {Array.from({ length: COMPARE_MAX }, (_, index) => {
              const assetId = ids[index]
              const metricKey = assetId === undefined ? metrics[index - ids.length] : undefined

              if (assetId !== undefined) {
                const entry = byId.get(assetId)
                return (
                  <button
                    key={`a-${assetId}`}
                    type="button"
                    onClick={() => toggleAsset(assetId)}
                    title={`Retirer ${entry?.label ?? assetId}`}
                    className="flex h-10 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-control border border-brand bg-brand-soft px-1 text-brand-strong transition-colors duration-150 hover:border-down hover:text-down"
                  >
                    <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="max-w-full truncate text-[0.625rem] font-medium leading-none">
                      {entry?.symbol?.toUpperCase() ?? entry?.label ?? assetId}
                    </span>
                  </button>
                )
              }

              if (metricKey !== undefined) {
                const label =
                  metricOptions.find((entry) => entry.key === metricKey)?.label ?? metricKey
                return (
                  <button
                    key={`m-${metricKey}`}
                    type="button"
                    onClick={() => toggleMetric(metricKey)}
                    title={`Retirer ${label}`}
                    className="flex h-10 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-control border border-brand bg-brand-soft px-1 text-brand-strong transition-colors duration-150 hover:border-down hover:text-down"
                  >
                    <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="max-w-full truncate text-[0.625rem] font-medium leading-none">
                      {label}
                    </span>
                  </button>
                )
              }

              return (
                <span
                  key={`empty-${index}`}
                  aria-hidden="true"
                  className="flex h-10 items-center justify-center rounded-control border border-dashed border-border-subtle text-ink-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                </span>
              )
            })}
          </div>

          {tab === 'assets' && options.length > 0 ? (
            <>
              {/* La recherche n'apparaît qu'au-delà de huit entrées : sous ce seuil, la
                  liste entière tient sans défilement et un champ de filtre y ajoute
                  une étape pour rien. */}
              {options.length > 8 ? (
                <div className="relative mb-1.5">
                  <Search
                    className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher un actif"
                    aria-label="Rechercher un actif à comparer"
                    className="h-7 w-full rounded-control border border-border-subtle bg-surface pl-7 pr-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
                  />
                </div>
              ) : null}

              <div className="max-h-52 overflow-y-auto">
                {shown.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-ink-muted">
                    Aucun actif ne correspond.
                  </p>
                ) : (
                  shown.map((entry) => {
                    const selected = ids.includes(entry.id)
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        /* Une entrée non retenue devient inerte quand les quatre places
                           sont prises. Elle reste VISIBLE et grisée plutôt que masquée :
                           la faire disparaître donnerait l'impression que la liste a
                           changé, alors que c'est la sélection qui est pleine. */
                        disabled={!selected && full}
                        onClick={() => toggleAsset(entry.id)}
                        className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-xs transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected ? 'text-brand-strong' : 'text-ink hover:bg-surface-muted'
                        }`}
                      >
                        <span className="w-3.5 shrink-0">
                          {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                        </span>
                        {entry.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- vignettes de fournisseurs non déclarés
                          <img
                            src={entry.image}
                            alt=""
                            loading="lazy"
                            className="h-4 w-4 shrink-0 rounded-pill"
                          />
                        ) : null}
                        <span className="min-w-0 truncate">
                          {entry.label}
                          {entry.symbol ? (
                            <span className="text-ink-muted"> ({entry.symbol.toUpperCase()})</span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          ) : null}

          {tab === 'metrics' || options.length === 0 ? (
            <div className="max-h-52 overflow-y-auto">
              {overlayMetrics.map((entry) => {
                const selected = metrics.includes(entry.key)
                return (
                  <MenuItem
                    key={entry.key}
                    selected={selected}
                    disabled={!selected && full}
                    onClick={() => toggleMetric(entry.key)}
                  >
                    {entry.label}
                  </MenuItem>
                )
              })}
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
            {/* Le RAPPEL DE LA BASE 100, à l'endroit où l'on décide de comparer.
                Superposer deux séries de prix impose de les indexer — sans quoi un
                actif à 100 000 € écrase un actif à 3 € — et l'axe cesse alors de porter
                des montants. Le dire ici évite qu'on cherche ensuite pourquoi les
                euros ont disparu de l'échelle. */}
            <p className="pr-2 text-[0.625rem] leading-snug text-ink-muted">
              {used > 0 ? 'Courbes indexées en base 100.' : `${COMPARE_MAX} courbes au plus.`}
            </p>
            <button
              type="button"
              onClick={close}
              className="h-6 shrink-0 rounded-control bg-brand px-3 text-xs font-medium text-white transition-opacity duration-150 hover:opacity-90"
            >
              Terminé
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      /* `h-6 w-6` et `rounded-pill` : ces icônes vivent DANS la pastille de cadrage
         (voir son commentaire), et une pastille de 28 px dans un cadre de 32 px n'aurait
         plus de place pour son propre rembourrage. La forme ronde s'accorde au cadre. */
      className="flex h-6 w-6 items-center justify-center rounded-pill text-ink-muted transition-colors duration-150 hover:bg-overlay hover:text-ink"
    >
      {icon}
    </button>
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
 * La grille vit dans `components/ui/Calendar.tsx`, avec ses pièges de fuseau traités
 * à la source.
 */
function DateRangePicker({
  value,
  onChange,
}: {
  value: { from: string; to: string } | null
  onChange: (range: { from: string; to: string } | null) => void
}) {
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
        title="Choisir des dates précises"
        aria-label="Choisir des dates précises"
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

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-dense border border-border-subtle bg-overlay p-3 shadow-overlay">
          <Calendar
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
