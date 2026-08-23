'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Mini-carte de navigation — la bande de sélection sous la courbe de CoinGecko.
 *
 * ── CE QU'ELLE RÉSOUT ─────────────────────────────────────────────────────────
 *
 * Les paliers de période sont des sauts : on passe de sept jours à un mois, jamais
 * à « les dix jours autour du décrochage du 8 ». Le zoom natif de la bibliothèque le
 * permet — molette et cliquer-glisser — mais rien ne l'annonce, et surtout rien ne
 * dit OÙ l'on se trouve une fois zoomé : la courbe remplit le cadre, identique à
 * elle-même, et l'axe seul indique qu'on ne voit plus qu'un fragment.
 *
 * La bande règle les deux d'un coup. Elle montre la période entière en réduction,
 * la fenêtre visible s'y dessine en clair, et on la déplace ou on l'étire
 * directement. C'est un contrôle qui EST son propre repère.
 *
 * ── ELLE A DEUX RÉGIMES, ET C'EST LE PARENT QUI CHOISIT ───────────────────────
 *
 * 1. SANS `timestamps` : elle porte la période CHARGÉE, et sa fenêtre découpe dedans.
 *    C'était son seul régime. Elle sert alors à se déplacer DANS la période choisie,
 *    les paliers servant à en changer.
 *
 * 2. AVEC `timestamps` : elle porte TOUT L'HISTORIQUE de l'actif, comme celle de la
 *    référence — « 2021 → 2026 » sous un graphique de 24 h. Sa fenêtre ne découpe plus
 *    rien : elle MONTRE où se situe la période affichée dans l'histoire complète, et la
 *    déplacer CHANGE cette période. `onCommit` est ce qui les distingue — il n'est
 *    appelé qu'au relâchement, avec deux horodatages, parce que recharger la série à
 *    chaque pixel parcouru serait intenable.
 *
 * Le second régime coûte un appel de plus par fiche — la série maximale, en plus de
 * celle affichée. C'est pour cette raison qu'il a longtemps été écarté, et pour cette
 * raison qu'il est demandé au parent plutôt que pris ici : c'est lui qui sait s'il peut
 * payer cet appel, et quand.
 */

/** Bornes de la fenêtre, en fraction de la série (0 = premier point, 1 = dernier). */
export interface NavigatorWindow {
  from: number
  to: number
}

/**
 * Largeur minimale de la fenêtre, en fraction.
 *
 * Sans plancher, une poignée poussée au-delà de l'autre produit une fenêtre nulle ou
 * inversée : la bibliothèque reçoit alors une plage vide et vide le cadre. Deux
 * pour cent d'une série de deux cents points font quatre points — le minimum pour
 * qu'un tracé reste un tracé.
 */
const MIN_SPAN = 0.02

type DragMode = 'move' | 'from' | 'to'

export function ChartNavigator({
  /** Valeurs de la série, dans l'ordre chronologique. Une par point. */
  values,
  /**
   * Horodatages des mêmes points, quand la bande porte l'historique complet.
   *
   * Leur présence bascule le composant dans son second régime — voir l'en-tête. Ils
   * servent à deux choses : dater les graduations sous la silhouette, et convertir la
   * fenêtre en un intervalle réel pour `onCommit`.
   */
  timestamps,
  window: win,
  onChange,
  /**
   * Fin de geste, avec l'intervalle choisi en horodatages.
   *
   * Appelé au RELÂCHEMENT seulement. `onChange` continue de suivre le curseur — c'est
   * ce qui rend le glissement fluide — mais recharger une série à chaque pixel
   * parcouru lancerait des dizaines de requêtes pour un seul geste.
   */
  onCommit,
  height = 55,
}: {
  values: number[]
  timestamps?: number[]
  window: NavigatorWindow
  onChange: (next: NavigatorWindow) => void
  onCommit?: (from: number, to: number) => void
  height?: number
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<DragMode | null>(null)

  /**
   * État du geste, en `ref` et non en `state`.
   *
   * Les gestionnaires de `pointermove` sont posés une seule fois sur le document au
   * début du geste. S'ils lisaient un état React, ils captureraient sa valeur au
   * moment de leur création et travailleraient jusqu'au bout sur la fenêtre
   * d'AVANT le geste — le classique de la fermeture périmée, qui se manifeste ici
   * par une fenêtre qui saute à sa position initiale au moindre mouvement.
   */
  const gesture = useRef<{ mode: DragMode; startX: number; from: number; to: number } | null>(null)

  /* La fenêtre COURANTE, tenue en `ref` pour la même raison que le geste : la fonction
     de fin de glissement est créée au début du geste et lirait sinon une valeur périmée.

     L'écriture est faite APRÈS le rendu et non pendant : muter une référence dans le
     corps du composant casse le rendu concurrent, où React peut abandonner un rendu en
     cours — la référence garderait alors une valeur qui n'a jamais été affichée. */
  const winRef = useRef(win)
  useEffect(() => {
    winRef.current = win
  })

  const beginDrag = useCallback(
    (mode: DragMode, event: React.PointerEvent) => {
      event.preventDefault()
      gesture.current = { mode, startX: event.clientX, from: win.from, to: win.to }
      setDragging(mode)
    },
    [win.from, win.to],
  )

  useEffect(() => {
    if (!dragging) return

    function onMove(event: PointerEvent) {
      const state = gesture.current
      const width = rootRef.current?.clientWidth ?? 0
      if (!state || width === 0) return

      // Déplacement converti en FRACTION de la largeur : la fenêtre est exprimée en
      // fractions, elle doit donc suivre le curseur proportionnellement — sinon le
      // même geste couvrirait deux durées différentes selon la largeur de l'écran.
      const delta = (event.clientX - state.startX) / width

      if (state.mode === 'move') {
        const span = state.to - state.from
        // La fenêtre GLISSE contre les bords au lieu de les traverser en se
        // rétrécissant : `clamp` est appliqué au départ, la largeur est reportée
        // ensuite. L'inverse — borner les deux extrémités séparément — écraserait la
        // fenêtre à l'approche d'un bord.
        const from = clamp(state.from + delta, 0, 1 - span)
        onChange({ from, to: from + span })
        return
      }

      if (state.mode === 'from') {
        onChange({ from: clamp(state.from + delta, 0, state.to - MIN_SPAN), to: state.to })
        return
      }

      onChange({ from: state.from, to: clamp(state.to + delta, state.from + MIN_SPAN, 1) })
    }

    function onUp() {
      gesture.current = null
      setDragging(null)
      /* L'intervalle est relu sur `winRef` et non sur la fermeture : `win` y serait figé
         à sa valeur d'avant le geste, et l'on rechargerait la période qu'on vient de
         quitter. */
      if (onCommit && timestamps && timestamps.length > 1) {
        const first = timestamps[0] as number
        const last = timestamps[timestamps.length - 1] as number
        const span = last - first
        const current = winRef.current
        onCommit(first + current.from * span, first + current.to * span)
      }
    }

    // Les écouteurs vivent sur le DOCUMENT et non sur la bande : un glissement
    // rapide sort du rectangle bien avant la fin du geste, et des écouteurs locaux
    // le perdraient en route — la fenêtre resterait figée à mi-parcours.
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, onChange, onCommit, timestamps])

  if (values.length < 2) return null

  const path = areaPath(values, height)
  const leftPct = win.from * 100
  const widthPct = (win.to - win.from) * 100
  const full = win.from <= 0.001 && win.to >= 0.999

  return (
    <div className="mt-1 select-none">
      <div
        ref={rootRef}
        className="relative w-full overflow-hidden rounded-dense border border-border-subtle bg-surface-muted/40"
        style={{ height }}
      >
        {/* Silhouette de la série. `preserveAspectRatio="none"` : la bande fait la
            largeur du cadre et 55 pixels de haut quel que soit le nombre de points —
            on veut un étirement, pas un cadrage. */}
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d={path.area} className="fill-ink-muted/15" />
          <path d={path.line} className="stroke-ink-muted/50" fill="none" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>

        {/* ── LES REPÈRES DE DATE, QUAND LA BANDE PORTE TOUTE L'HISTOIRE ──────
            Une silhouette de dix ans sans une seule date ne dit pas de quoi elle est
            l'histoire : on voit une forme, on ne sait pas si elle couvre un mois ou une
            décennie. La référence pose des années à intervalles réguliers, et c'est ce
            qui transforme la bande en frise.

            Elles ne sont posées QUE dans le second régime : sur la période chargée, la
            même information est déjà sous le graphique, à la graduation près. */}
        {timestamps && timestamps.length > 1
          ? navigatorTicks(timestamps).map((tick) => (
              <span
                key={tick.at}
                aria-hidden="true"
                /* ── ELLES ÉTAIENT ILLISIBLES ────────────────────────────────
                   9 px en gris atténué sur une silhouette grise : on devinait qu'il y
                   avait du texte, on ne le lisait pas. Une frise dont on ne peut pas
                   lire les années ne date rien — c'est-à-dire qu'elle ne sert plus.

                   Trois choses la remontent : le corps passe à 11 px, le poids à
                   `medium`, et l'encre à `ink` au lieu de `ink-muted`. Le trait vertical
                   ancre l'étiquette à SA position — sans lui, un texte centré sur un
                   fond continu ne désigne rien de précis. */
                className="pointer-events-none absolute inset-y-0 flex flex-col items-center justify-end gap-0.5"
                style={{ left: `${tick.at * 100}%` }}
              >
                <span className="w-px flex-1 bg-border-subtle" />
                <span className="-translate-x-0 whitespace-nowrap px-1 text-[0.6875rem] font-medium leading-none text-ink">
                  {tick.label}
                </span>
              </span>
            ))
          : null}

        {/* Voiles latéraux : ce qui n'est PAS visible est assombri, plutôt que de
            surligner la fenêtre. Une fenêtre surlignée sur fond clair se lit comme un
            objet posé sur la bande ; un voile se lit comme un cache — et c'est bien
            de cela qu'il s'agit, la partie masquée reste de la donnée. */}
        <div
          className="absolute inset-y-0 left-0 bg-canvas/65"
          style={{ width: `${leftPct}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-0 right-0 bg-canvas/65"
          style={{ width: `${100 - leftPct - widthPct}%` }}
          aria-hidden="true"
        />

        {/* Fenêtre déplaçable */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Fenêtre visible du graphique"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(((win.from + win.to) / 2) * 100)}
          aria-valuetext={`De ${Math.round(win.from * 100)} % à ${Math.round(win.to * 100)} % de la période`}
          onPointerDown={(event) => beginDrag('move', event)}
          onKeyDown={(event) => {
            // Au clavier, les flèches déplacent la fenêtre d'un vingtième. Sans cela,
            // la commande serait strictement inatteignable sans souris — et c'est le
            // seul moyen de cadrer une sous-période une fois les paliers épuisés.
            const span = win.to - win.from
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              const from = clamp(win.from - 0.05, 0, 1 - span)
              onChange({ from, to: from + span })
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              const from = clamp(win.from + 0.05, 0, 1 - span)
              onChange({ from, to: from + span })
            } else if (event.key === 'Home') {
              event.preventDefault()
              onChange({ from: 0, to: 1 })
            }
          }}
          className={`absolute inset-y-0 cursor-grab border-x-2 border-brand bg-brand/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand ${
            dragging === 'move' ? 'cursor-grabbing bg-brand/20' : ''
          }`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        >
          {/* Poignées. Elles débordent de six pixels de chaque côté (`-left-1.5`
              contre `w-3`) : une cible de deux pixels — la largeur du trait — se
              rate systématiquement, et l'on déplacerait la fenêtre en croyant
              l'étirer. */}
          <span
            onPointerDown={(event) => {
              event.stopPropagation()
              beginDrag('from', event)
            }}
            className="absolute -left-1.5 inset-y-0 w-3 cursor-ew-resize"
            aria-hidden="true"
          />
          <span
            onPointerDown={(event) => {
              event.stopPropagation()
              beginDrag('to', event)
            }}
            className="absolute -right-1.5 inset-y-0 w-3 cursor-ew-resize"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Le retour à la vue complète n'apparaît QUE s'il y a quelque chose à
          annuler : un bouton toujours présent mais inerte neuf fois sur dix apprend
          au lecteur à ne plus le regarder.

          `variant="link"` : le bouton de shadcn/ui dans sa variante lien — sans fond ni
          bordure, souligné au survol. C'est ce que ce contrôle était déjà, en classes ;
          il gagne l'anneau de focus. */}
      {!full ? (
        <Button
          size="xs"
          variant="link"
          data-muted
          className="mt-1"
          onClick={() => {
            onChange({ from: 0, to: 1 })
            /* En régime « historique complet », changer la fenêtre ne suffit pas : elle
               DÉCRIT la période chargée au lieu de la découper, et sans validation le
               bouton remettrait juste la poignée à sa place avant qu'un rendu ne la
               ramène où elle était. Il demande donc l'histoire entière, comme le palier
               « MAX » — ce qui est bien ce que son libellé promet. */
            if (onCommit && timestamps && timestamps.length > 1) {
              onCommit(timestamps[0] as number, timestamps[timestamps.length - 1] as number)
            }
          }}
        >
          Revoir toute la période
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Repères datés à poser le long de la bande.
 *
 * ── LE PAS EST CHOISI SUR LA DURÉE, PAS SUR LE NOMBRE DE POINTS ───────────────
 *
 * Une bande peut couvrir six semaines comme douze ans, et le même pas ne convient pas
 * aux deux : douze étiquettes annuelles sur six semaines n'en afficheraient qu'une,
 * douze étiquettes mensuelles sur douze ans en poseraient cent quarante-quatre. On
 * choisit donc l'unité — année, trimestre, mois — d'après l'étendue réelle, puis on
 * pose un repère à chaque frontière de cette unité.
 *
 * Les frontières sont des DATES RONDES (1ᵉʳ janvier, 1ᵉʳ du mois) et non des divisions
 * régulières de l'intervalle : « 2023 » posé au 1ᵉʳ janvier 2023 est un repère, « 2023 »
 * posé au 7 avril ment sur ce qu'il désigne.
 */
function navigatorTicks(timestamps: number[]): { at: number; label: string }[] {
  const first = timestamps[0]
  const last = timestamps[timestamps.length - 1]
  if (first === undefined || last === undefined || last <= first) return []

  const span = last - first
  const days = span / 86_400_000
  const out: { at: number; label: string }[] = []

  const push = (time: number, label: string) => {
    if (time <= first || time >= last) return
    out.push({ at: (time - first) / span, label })
  }

  if (days > 900) {
    for (let year = new Date(first).getFullYear() + 1; year <= new Date(last).getFullYear(); year += 1) {
      push(Date.UTC(year, 0, 1), String(year))
    }
  } else if (days > 200) {
    const start = new Date(first)
    for (let step = 1; step <= 12; step += 1) {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + step * 3, 1))
      push(date.getTime(), date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' }))
    }
  } else {
    const start = new Date(first)
    for (let step = 1; step <= 12; step += 1) {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + step, 1))
      push(date.getTime(), date.toLocaleString('fr-FR', { month: 'short' }))
    }
  }

  /* Au-delà de huit repères, ils se touchent sur une bande de six cents pixels : on en
     garde un sur deux plutôt que d'écrire par-dessus. */
  return out.length > 8 ? out.filter((_, index) => index % 2 === 0) : out
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Silhouette de la série, en coordonnées 0–100 × 0–hauteur.
 *
 * Les valeurs sont normalisées sur leur propre amplitude et non sur zéro : un cours
 * qui oscille entre 46 et 50 donnerait, rapporté à zéro, une ligne plate collée au
 * plafond. Sur une bande de 44 pixels dont le seul rôle est de montrer la FORME du
 * mouvement, c'est la variation qui compte, jamais le niveau absolu.
 */
function areaPath(values: number[], height: number): { line: string; area: string } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Amplitude nulle — un stablecoin sur une heure : on trace au milieu plutôt que de
  // diviser par zéro, ce qui produirait des `NaN` et un `path` vide.
  const span = max - min || 1

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100
    // L'axe SVG descend : la valeur maximale doit donc se retrouver EN HAUT, d'où
    // l'inversion. Un padding d'un pixel évite que le sommet ne soit rogné par le
    // bord du cadre.
    const y = height - 1 - ((value - min) / span) * (height - 2)
    return `${x.toFixed(3)},${y.toFixed(2)}`
  })

  const line = `M${points.join('L')}`
  return { line, area: `${line}L100,${height}L0,${height}Z` }
}
