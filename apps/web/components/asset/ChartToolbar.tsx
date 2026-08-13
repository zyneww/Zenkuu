'use client'

import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Link2,
  Maximize2,
  MoreHorizontal,
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
 */
export const RANGE_PRESETS: RangePreset[] = [
  { id: '1d', label: '24 h', days: 1 },
  { id: '7d', label: '7 j', days: 7 },
  { id: '1m', label: '1 M', days: 30 },
  { id: '3m', label: '3 M', days: 90 },
  { id: 'ytd', label: 'Depuis janv.', days: null },
  { id: '1y', label: '1 A', days: 365 },
  { id: 'max', label: 'Max', days: null },
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
 * Ces quatre entrées ne règlent pas le graphique : elles REMPLACENT ce qui est
 * tracé, et parfois par quelque chose qui n'a ni le même axe ni la même unité. La
 * profondeur n'a pas de temps en abscisse ; TradingView n'obéit à aucun de nos
 * réglages. Les mêler aux commandes de tracé ferait attendre du sélecteur de type ou
 * de la période qu'ils s'y appliquent — ce qu'ils ne peuvent pas.
 *
 * ── CE QUE CHACUNE MONTRE ─────────────────────────────────────────────────────
 *
 *   · `original`     — notre courbe, alimentée par CoinGecko et prolongée en direct ;
 *   · `tradingview`  — l'outil complet, avec ses indicateurs et ses dessins ;
 *   · `depth`        — le carnet de Binance : ce qui tient le prix, à l'instant t ;
 *   · `marketCap`    — la capitalisation, qui ne bouge pas comme le cours (une
 *                      émission de jetons la fait monter à cours constant).
 *
 * Les trois dernières dépendent de sources ou de correspondances qui n'existent pas
 * pour tous les actifs : l'appelant ne passe que celles qu'il peut réellement rendre,
 * plutôt que de les afficher grisées (§5).
 */
export type ChartView = 'original' | 'tradingview' | 'depth' | 'marketCap'

interface ChartToolbarProps {
  metric: string
  metricOptions: { key: string; label: string }[]
  onMetricChange: (key: string) => void

  compareId: string
  compareOptions: { id: string; label: string }[]
  onCompareChange: (id: string) => void

  kind: string
  kindOptions: { key: string; label: string }[]
  onKindChange: (key: string) => void

  /**
   * Vue active et vues proposées.
   *
   * `views` est une LISTE et non un booléen par entrée : c'est l'appelant qui sait
   * lesquelles ses sources permettent, et une liste vide fait disparaître le groupe
   * entier plutôt que de laisser un sélecteur à un seul choix.
   */
  view: ChartView
  views: { id: ChartView; label: string }[]
  onViewChange: (view: ChartView) => void

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
  onFullscreen: () => void

  /**
   * Sélecteur de devise, monté par l'appelant.
   *
   * Passé en NŒUD et non construit ici : la liste des devises convertibles dépend des
   * taux chargés par la page et de la devise d'origine de l'actif, deux choses que la
   * barre n'a aucune raison de connaître. Elle sait où le poser et à côté de quoi,
   * c'est tout — exactement le partage retenu pour le cours dans `AssetRailIdentity`.
   */
  currencySlot?: React.ReactNode
}

export function ChartToolbar(props: ChartToolbarProps) {
  return (
    /*
      ── LA BARRE EST LE BANDEAU DU CADRE, PLUS UNE RANGÉE POSÉE AU-DESSUS ──────

      Elle flottait au-dessus du graphique, séparée de lui par une marge : deux objets
      distincts, dont rien ne disait que l'un commandait l'autre. Les deux références
      font l'inverse — chez OKX comme chez CoinGecko, les commandes sont SERTIES dans
      le cadre du graphique, sous un filet qui les en sépare sans les en détacher.

      D'où le `border-b` : le trait appartient au cadre, et c'est lui qui rattache les
      commandes à la courbe.

      Pas de marge négative pour l'étendre aux bords du panneau, malgré l'effet un peu
      plus net que cela donnerait : ce même bloc est extrait du document en plein écran,
      où il n'a plus de rembourrage parent à compenser — la barre déborderait alors de
      seize pixels de chaque côté.

      ── HAUTEUR UNIQUE, COINS CARRÉS ──────────────────────────────────────────

      Tous les contrôles font 28 pixels de haut (`h-7`) et n'ont pas d'arrondi. Les
      deux règles règlent le même défaut : la barre alignait des pastilles bordées de
      hauteurs légèrement différentes, chacune arrondie dans son coin, ce qui donnait
      une rangée de galets plutôt qu'un instrument. Une surface DENSE — barre d'outils,
      carnet, tableau — se lit mieux à angles vifs ; l'arrondi reste aux cartes
      éditoriales, qui sont des objets qu'on pose, pas des commandes qu'on aligne.
    */
    <div className="mb-3 flex flex-wrap items-center gap-x-0.5 gap-y-1.5 border-b border-border-subtle pb-2">
      <Dropdown
        label={props.metricOptions.find((entry) => entry.key === props.metric)?.label ?? 'Grandeur'}
      >
        {(close) =>
          props.metricOptions.map((entry) => (
            <MenuItem
              key={entry.key}
              selected={entry.key === props.metric}
              onClick={() => {
                props.onMetricChange(entry.key)
                close()
              }}
            >
              {entry.label}
            </MenuItem>
          ))
        }
      </Dropdown>

      {props.compareOptions.length > 0 ? (
        <Dropdown
          label={
            props.compareOptions.find((entry) => entry.id === props.compareId)?.label ?? 'Comparer'
          }
          active={props.compareId !== ''}
        >
          {(close) => (
            <>
              <MenuItem
                selected={props.compareId === ''}
                onClick={() => {
                  props.onCompareChange('')
                  close()
                }}
              >
                Aucune comparaison
              </MenuItem>
              {props.compareOptions.map((entry) => (
                <MenuItem
                  key={entry.id}
                  selected={entry.id === props.compareId}
                  onClick={() => {
                    props.onCompareChange(entry.id)
                    close()
                  }}
                >
                  {entry.label}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>
      ) : null}

      <Dropdown
        label={props.kindOptions.find((entry) => entry.key === props.kind)?.label ?? 'Type'}
        icon={<BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />}
      >
        {(close) =>
          props.kindOptions.map((entry) => (
            <MenuItem
              key={entry.key}
              selected={entry.key === props.kind}
              onClick={() => {
                props.onKindChange(entry.key)
                close()
              }}
            >
              {entry.label}
            </MenuItem>
          ))
        }
      </Dropdown>

      {/* Séparateur : les paliers forment un groupe à part, et le trait dit lequel
          sans ajouter de mot. */}
      <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-border-subtle" />

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
      {props.intervals.length > 0 ? (
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
              className={`flex h-7 items-center justify-center px-2 text-xs font-medium transition-colors duration-150 ${
                active
                  ? 'bg-brand-soft text-brand-strong'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
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

      {/* La devise ferme la première rangée : c'est l'unité dans laquelle se lisent
          les paliers qui la précèdent, elle appartient donc à leur ligne. */}
      <span className="ml-auto">{props.currencySlot}</span>

      {/*
        ── RUPTURE DE LIGNE FORCÉE, ET C'EST UN CHOIX ────────────────────────────

        Un élément à `basis-full` occupe toute la largeur disponible dans un conteneur
        `flex-wrap` : tout ce qui suit est donc rejeté sur une seconde rangée, quelle
        que soit la place restante.

        Pourquoi l'imposer plutôt que laisser le repli naturel opérer ? Parce que ce
        dernier dépend de la LARGEUR DU CONTENU : selon que l'actif propose ou non la
        comparaison, la profondeur, les bougies Binance, la barre basculait d'une à
        deux rangées — et le graphique gagnait ou perdait trente pixels de haut d'une
        fiche à l'autre, sans qu'aucune règle ne l'ait décidé. Le même défaut que
        celui corrigé sur les anneaux de répartition.

        Deux rangées toujours, donc, avec un partage qui a du sens et que la référence
        adopte : la première porte ce qui décrit la COURBE (grandeur, tracé,
        comparaison, période, devise), la seconde ce qui décrit le CADRE (quelle
        source le rend, et ce qu'on en emporte).
      */}
      <span aria-hidden="true" className="basis-full" />

      {/*
        ── TOUT CE QUI EST À DROITE NE RÈGLE PAS LA COURBE ───────────────────────

        `ml-auto` sépare deux familles, et la séparation est de SENS et non de place :
        à gauche, ce qui change ce qui est TRACÉ (grandeur, tracé, comparaison,
        période) ; à droite, ce qui change la façon de le LIRE (devise, source du
        rendu) et ce qu'on en FAIT (lien, export, plein écran).

        La devise a rejoint cette famille, alors qu'elle occupait jusqu'ici une rangée
        entière à elle seule au-dessus du cadre. Une ligne complète pour un menu de
        huit caractères, sur un panneau où l'on venait de tailler trois rangées de
        commandes : elle est ici, avec les autres réglages de lecture.
      */}
      <span className="ml-auto flex min-w-0 flex-wrap items-center gap-0.5">
        {/*
          GROUPE DE VUES — un segment plein, et non des boutons détachés.

          Chez OKX ces quatre entrées forment un bloc soudé sur fond creusé, et la
          forme porte le sens : elle dit « une seule à la fois », là où des boutons
          séparés se liraient comme des options cumulables. Un seul est allumé, et le
          fond du groupe reste visible autour — c'est ce qui distingue un sélecteur
          d'un alignement d'actions.
        */}
        {props.views.length > 1 ? (
          <span
            role="group"
            aria-label="Vue du graphique"
            className="mr-1 flex items-center gap-0.5 bg-surface-muted p-0.5"
          >
            {props.views.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => props.onViewChange(entry.id)}
                aria-pressed={entry.id === props.view}
                className={`flex h-6 items-center px-2 text-xs font-medium transition-colors duration-150 ${
                  entry.id === props.view
                    ? 'bg-overlay text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </span>
        ) : null}

        <IconButton
          label="Copier le lien de cette vue"
          onClick={props.onCopyLink}
          icon={<Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
        />

        {/*
          LE PLEIN ÉCRAN SORT DU MENU « ⋯ ».

          Il y était rangé avec les options d'affichage et les formats d'export, ce qui
          en faisait un réglage parmi d'autres. C'en est un d'une autre nature : il ne
          change RIEN à ce qui est tracé, il change la taille du cadre — et c'est
          justement la commande qu'on cherche quand la courbe est trop petite pour être
          lue, donc au moment précis où fouiller un menu est le plus pénible. Les deux
          références la posent en icône visible, au même coin.
        */}
        <IconButton
          label="Afficher le graphique en plein écran"
          onClick={props.onFullscreen}
          icon={<Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
        />

        <Dropdown
          label=""
          icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
          align="right"
        >
          {(close) => (
            <>
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

              {/*
                QUATRE FORMATS, et le choix n'est pas cosmétique. PNG et JPEG sont des
                images de pixels, bonnes pour un message ou une diapositive. SVG est
                vectoriel : il reste net à l'impression et se retouche. PDF est le
                format qu'on joint à une note.

                Aucun n'est produit par une bibliothèque tierce — voir `exportChart`.
              */}
              {(['png', 'jpeg', 'svg', 'pdf'] as const).map((format) => (
                <MenuItem
                  key={format}
                  onClick={() => {
                    props.onExport(format)
                    close()
                  }}
                >
                  Exporter en {format.toUpperCase()}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>
      </span>
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
  children,
}: {
  label: string
  icon?: React.ReactNode
  active?: boolean
  align?: 'left' | 'right'
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
        BOUTON FANTÔME : ni bordure ni fond au repos.

        Chaque commande était une pastille bordée. Alignées à sept ou huit, ces
        bordures pesaient plus lourd que les libellés qu'elles encadraient, et la
        barre se lisait comme une rangée d'objets plutôt que comme un texte de
        commandes — c'est très précisément ce que « moche » désignait.

        Le fond n'apparaît qu'au survol et à l'ouverture, l'état ACTIF — un réglage
        qui n'est plus au défaut — prenant la teinte de marque. L'encre porte donc
        l'information au repos, la surface la porte à l'interaction : deux niveaux
        de signalement au lieu d'un seul, allumé en permanence pour tout le monde.
      */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-7 items-center gap-1 px-2 text-xs font-medium transition-colors duration-150 ${
          open
            ? 'bg-surface-muted text-ink'
            : active
              ? 'bg-brand-soft text-brand-strong'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
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
  onClick,
}: {
  children: React.ReactNode
  selected?: boolean
  disabled?: boolean
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
      <span className="w-3.5 shrink-0">
        {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </span>
      {children}
    </button>
  )
}

function Separator() {
  return <hr className="my-1 border-0 border-t border-border-subtle" />
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
      className="flex h-7 w-7 items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
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
