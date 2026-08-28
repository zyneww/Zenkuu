'use client'

import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { formatMacroValue } from '@zenkuu/data'

import {
  countryPath,
  loadCountries,
  macroColor,
  type CountryFeature,
  type MacroTone,
} from '@/components/market/geo'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * PLANISPHÈRE CHOROPLÈTHE — la carte de TradingView, à notre sauce.
 *
 * ── POURQUOI DU SVG PLUTÔT QU'UN CANEVAS ────────────────────────────────────
 *
 * Cent soixante-dix-sept chemins ne justifient pas un canevas : le SVG les rend en
 * une passe, et il apporte gratuitement trois choses qu'un canevas obligerait à
 * réimplémenter — le survol par élément, le clic par élément, et la mise à l'échelle
 * sans perte à tout niveau de zoom.
 *
 * Ce dernier point cesse d'être théorique depuis que la carte se zoome : à ×12, un
 * canevas rendrait des frontières en escalier, là où le SVG redessine des courbes
 * nettes sans rien recharger.
 *
 * Il apporte surtout l'ACCESSIBILITÉ : chaque pays est un nœud du document, portant
 * son nom et sa valeur. Un canevas est une image opaque, sur laquelle un lecteur
 * d'écran n'a rien à dire.
 *
 * ── LE `viewBox` FAIT TOUT LE TRAVAIL RESPONSIVE ─────────────────────────────
 *
 * Les chemins sont calculés dans un repère fixe de 1000 × 500 — le rapport 2:1 d'une
 * projection équirectangulaire — et le navigateur les met à l'échelle. Aucune mesure,
 * aucun `ResizeObserver`, aucun recalcul au redimensionnement : la carte s'adapte comme
 * une image, et le fond n'est chargé et projeté qu'une fois.
 *
 * ── LE ZOOM EST UNE TRANSFORMATION, PAS UN RECALCUL ─────────────────────────
 *
 * Zoomer ne recalcule AUCUN chemin : un seul `<g transform>` porte l'échelle et le
 * déplacement, et le navigateur applique la matrice au moment de peindre. C'est ce
 * qui rend le geste fluide à 177 pays — recalculer les `d` à chaque cran de molette
 * reprojetterait quelque vingt mille points par image.
 */

export interface MacroMapDatum {
  iso: string
  country: string
  value: number
  year: number
}

const WIDTH = 1000
const HEIGHT = 500

/** Bornes du facteur d'échelle. Au-delà de 12, la source Natural Earth 1:110m
    montre ses arrondis au centième de degré et la carte cesse d'être plus précise. */
const MIN_ZOOM = 1
const MAX_ZOOM = 12

interface ViewBoxTransform {
  k: number
  x: number
  y: number
}

const IDENTITY: ViewBoxTransform = { k: 1, x: 0, y: 0 }

/**
 * Contraint le déplacement pour que la carte couvre toujours le cadre.
 *
 * Sans cela, on pousse le monde hors de l'écran et il ne reste qu'un fond vide, d'où
 * l'on ne sait pas revenir — l'utilisateur conclut que la carte a disparu.
 */
function clamp(next: ViewBoxTransform): ViewBoxTransform {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.k))

  return {
    k,
    x: Math.min(0, Math.max(WIDTH * (1 - k), next.x)),
    y: Math.min(0, Math.max(HEIGHT * (1 - k), next.y)),
  }
}

export function MacroChoropleth({
  data,
  low,
  high,
  tone,
  unit,
  scale,
  selected,
  onSelect,
  svgRef,
}: {
  data: MacroMapDatum[]
  low: number
  high: number
  tone: MacroTone
  unit: string
  scale: 'percent' | 'compact' | 'plain'
  selected: string | null
  onSelect: (iso: string | null) => void
  /** Remonté au parent, qui en a besoin pour exporter la figure en image. */
  svgRef?: RefObject<SVGSVGElement | null>
}) {
  const t = usePhrase()
  const [countries, setCountries] = useState<CountryFeature[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [view, setView] = useState<ViewBoxTransform>(IDENTITY)

  const localRef = useRef<SVGSVGElement>(null)
  const nodeRef = svgRef ?? localRef

  /* Le glissement vit dans une ref et non dans un état : il change à chaque image du
     mouvement, et un état déclencherait un rendu des 177 chemins par pixel parcouru. */
  /**
   * `iso` RETIENT LE PAYS VISÉ AU MOMENT D'APPUYER, et c'est ce qui répare la
   * sélection.
   *
   * ── LE DÉFAUT : LE `onClick` DES PAYS NE S'EXÉCUTAIT JAMAIS ─────────────────
   *
   * Le `<svg>` appelle `setPointerCapture` au `pointerdown`, pour que le déplacement
   * de la carte survive au curseur qui sort du cadre. Effet de bord non voulu : la
   * capture REDIRIGE les événements pointeur vers l'élément capturant, si bien que
   * `pointerup` vise le `<svg>` et non le pays. Le navigateur dispatche alors `click`
   * sur l'ancêtre commun des deux — le `<svg>` lui aussi.
   *
   * Le `onClick` posé sur chaque `<path>` était donc du code mort, et seul restait le
   * `onPointerUp` du `<svg>`, qui DÉSÉLECTIONNE. Cliquer un pays ne pouvait rien
   * ouvrir. Tracé sur le Canada, dans cet ordre :
   *
   *     pointerdown → cible = path (Canada)
   *     pointerup   → cible = svg          ← redirigé par la capture
   *     click       → cible = svg          ← jamais le path
   *
   * Le pays restait au contour de SURVOL (`--color-ink`) au lieu de passer à celui de
   * sélection (`--color-brand`), et le panneau latéral — pourtant complet — était
   * inatteignable à la souris. Aucune erreur nulle part.
   *
   * ── LE CORRECTIF ───────────────────────────────────────────────────────────
   *
   * `pointerdown` est le SEUL des trois qui atteigne encore le pays : on y note donc
   * ce qui est visé, et `pointerup` tranche — même geste, une seule décision, plus
   * d'ordonnancement à deviner entre deux gestionnaires concurrents.
   */
  const drag = useRef<{ x: number; y: number; moved: boolean; iso: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false

    loadCountries()
      .then((features) => {
        if (!cancelled) setCountries(features)
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * ── LA MOLETTE PASSE PAR UN ÉCOUTEUR NATIF, ET C'EST OBLIGATOIRE ──────────
   *
   * React attache `onWheel` à la racine de l'application EN MODE PASSIF. Un
   * gestionnaire passif ne peut pas appeler `preventDefault()`, donc la page
   * défilerait sous la carte à chaque cran de zoom. Seul un écouteur posé à la main
   * avec `{ passive: false }` reprend la main sur le défilement.
   *
   * La conversion client → `viewBox` est ÉCRITE ICI plutôt que dans une fonction
   * partagée : elle avait sa `useCallback`, que le compilateur React refuse de
   * préserver dès qu'une `ref.current` y est lue — il infère `nodeRef.current` comme
   * dépendance là où la liste écrite dit `nodeRef`. Le geste n'ayant qu'un appelant,
   * l'inliner coûte trois lignes et rend la mémoïsation au compilateur.
   */
  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    function onWheel(event: WheelEvent) {
      event.preventDefault()

      const rect = node!.getBoundingClientRect()
      const px = ((event.clientX - rect.left) / rect.width) * WIDTH
      const py = ((event.clientY - rect.top) / rect.height) * HEIGHT

      setView((current) => {
        /* Facteur multiplicatif et non additif : un pas constant serait imperceptible
           à ×1 et brutal à ×10. `deltaY` est normalisé par 500 pour que trois crans de
           molette valent environ un doublement, quel que soit le périphérique. */
        const factor = Math.exp(-event.deltaY / 500)
        const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor))

        /* Le point sous le curseur RESTE sous le curseur : c'est ce qui distingue un
           zoom qu'on dirige d'un zoom qui recentre tout seul. */
        const worldX = (px - current.x) / current.k
        const worldY = (py - current.y) / current.k

        return clamp({ k, x: px - worldX * k, y: py - worldY * k })
      })
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [nodeRef])

  const byIso = new Map(data.map((row) => [row.iso, row]))

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-card bg-surface px-6 text-center text-xs text-ink-muted">
        {error}
      </div>
    )
  }

  if (!countries) {
    return (
      <div className="flex h-full items-center justify-center rounded-card bg-surface text-xs text-ink-muted">{t('Chargement de la carte…')}</div>
    )
  }

  function zoomBy(factor: number) {
    setView((current) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor))
      /* Les boutons zooment sur le CENTRE du cadre, faute de curseur à suivre. */
      const worldX = (WIDTH / 2 - current.x) / current.k
      const worldY = (HEIGHT / 2 - current.y) / current.k

      return clamp({ k, x: WIDTH / 2 - worldX * k, y: HEIGHT / 2 - worldY * k })
    })
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card bg-surface">
      <svg
        ref={nodeRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        /* Le curseur de saisie est porté par le CSS et non par un état React :
           `drag` est une `ref`, et une `ref` lue pendant le rendu rendrait la classe
           d'un tour en retard — elle ne provoque aucun nouveau rendu. `active:` répond
           au bouton enfoncé, ce qui est exactement le signal recherché. */
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label={t('Carte du monde')}
        onPointerDown={(event) => {
          /* Bouton principal uniquement : un clic droit ouvre le menu contextuel du
             navigateur, et le capturer empêcherait d'enregistrer l'image. */
          if (event.button !== 0) return
          /* `data-iso` est lu sur la CIBLE, avant que la capture ne redirige la suite
             du geste vers ce `<svg>`. C'est le dernier instant où le pays est connu. */
          const iso = (event.target as Element | null)?.getAttribute?.('data-iso') ?? null
          drag.current = { x: event.clientX, y: event.clientY, moved: false, iso }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const start = drag.current
          if (!start) return

          const rect = event.currentTarget.getBoundingClientRect()
          const dx = ((event.clientX - start.x) / rect.width) * WIDTH
          const dy = ((event.clientY - start.y) / rect.height) * HEIGHT

          /* SEUIL DE TROIS PIXELS avant de considérer que c'est un glissement. Sans
             lui, le tremblement de la main pendant un clic annulerait la sélection du
             pays qu'on vient de viser. */
          if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 3) {
            return
          }

          start.moved = true
          start.x = event.clientX
          start.y = event.clientY
          setView((current) => clamp({ ...current, x: current.x + dx, y: current.y + dy }))
        }}
        onPointerUp={(event) => {
          const moved = drag.current?.moved ?? false
          const iso = drag.current?.iso ?? null
          drag.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)

          /* Un GLISSEMENT ne décide de rien. Sans cette distinction, tout déplacement
             de la carte refermerait la barre latérale du pays qu'on examine. */
          if (moved) return

          /* Un clic sur le FOND désélectionne, un clic sur un PAYS le choisit, et
             recliquer le pays déjà choisi referme. Les trois cas sortent d'ici et
             d'ici seulement : c'est ce qui remplace le `onClick` des `<path>`, que la
             capture de pointeur rendait inatteignable (voir la ref `drag`).

             La carte reste donc interactive panneau ouvert — cliquer un autre pays le
             rafraîchit sans le refermer, puisque `onSelect` reçoit directement le
             nouvel identifiant. */
          onSelect(iso === null || iso === selected ? null : iso)
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {countries.map((country) => {
            const row = byIso.get(country.iso)
            const isSelected = selected === country.iso
            const isHovered = hovered === country.iso

            return (
              <path
                key={country.iso}
                d={countryPath(country, WIDTH, HEIGHT)}
                fill={macroColor(row?.value, low, high, tone)}
                /* Le pays SÉLECTIONNÉ porte un contour de marque, le SURVOLÉ un contour
                   clair, les autres le filet ordinaire. Trois états sur la même propriété
                   plutôt que trois calques superposés — un contour dessiné par-dessus
                   masquerait la couleur du voisin sur un pixel. */
                stroke={
                  isSelected
                    ? 'var(--color-brand)'
                    : isHovered
                      ? 'var(--color-ink)'
                      : 'var(--color-canvas)'
                }
                /* Les épaisseurs sont DIVISÉES PAR L'ÉCHELLE : sans cela, un filet de
                   0,5 devient un trait de 6 à ×12 et les petits pays disparaissent
                   sous leur propre contour. */
                strokeWidth={(isSelected ? 1.6 : isHovered ? 1.1 : 0.5) / view.k}
                strokeLinejoin="round"
                className="transition-[stroke-width] duration-100"
                /* LU AU `pointerdown` par le `<svg>`, qui décide seul de la sélection.
                   Un `onClick` posé ici serait du code mort : la capture de pointeur
                   fait dispatcher le clic sur le `<svg>`, jamais sur ce `<path>`. Voir
                   la ref `drag` pour la trace complète du défaut. */
                data-iso={country.iso}
                onMouseEnter={() => setHovered(country.iso)}
                onMouseLeave={() => setHovered(null)}
              >
                {/*
                  `<title>` PLUTÔT QU'UNE INFOBULLE MAISON.

                  C'est l'infobulle native du SVG : elle est annoncée par les lecteurs
                  d'écran, survit à l'impression et ne coûte pas un état React qui
                  re-rendrait 177 chemins à chaque déplacement de souris. Sur une carte,
                  ce dernier point n'est pas théorique — le survol traverse des dizaines
                  de pays par seconde.
                */}
                <title>
                  {country.name}
                  {row
                    ? ` — ${formatMacroValue(row.value, scale)}${unit ? ` ${unit}` : ''} (${row.year})`
                    : ' — non publié'}
                </title>
              </path>
            )
          })}
        </g>
      </svg>

      {/* ── Commandes de zoom ────────────────────────────────────────────────
          En bas à droite, hors du chemin du curseur qui explore la carte, et là où
          toutes les cartes en ligne les placent. Le bouton de recentrage n'apparaît
          qu'une fois la vue déplacée : proposer « revenir » depuis la position
          initiale est un contrôle qui ne fait rien. */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {view.k > 1 ? (
          <ZoomButton onClick={() => setView(IDENTITY)} label={t('Recentrer la carte')}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </ZoomButton>
        ) : null}
        <ZoomButton
          onClick={() => zoomBy(1.5)}
          label="Agrandir"
          disabled={view.k >= MAX_ZOOM}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </ZoomButton>
        <ZoomButton
          onClick={() => zoomBy(1 / 1.5)}
          label={t('Réduire')}
          disabled={view.k <= MIN_ZOOM}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </ZoomButton>
      </div>
    </div>
  )
}

/* Exporté pour le globe, qui a les mêmes commandes au même endroit — voir
   `MacroGlobe`. Deux copies du même bouton finiraient par diverger sur la taille ou
   sur l'état désactivé, c'est-à-dire sur ce qui se voit. */
export function ZoomButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-subtle bg-surface text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}
