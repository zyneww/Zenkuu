'use client'

import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { formatMacroValue } from '@zenkuu/data'

import { ZoomButton, type MacroMapDatum } from '@/components/market/MacroChoropleth'
import {
  globePath,
  loadCountries,
  macroColor,
  orthographic,
  type CountryFeature,
  type GlobeRotation,
  type MacroTone,
} from '@/components/market/geo'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GLOBE MACROÉCONOMIQUE — LA MÊME DONNÉE, VUE DE L'ESPACE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL PARTAGE AVEC LA CARTE, ET CE QUI CHANGE ────────────────────────
 *
 * Il partage TOUT ce qui porte du sens : le fond de carte (`loadCountries`, chargé
 * une fois pour les deux vues), l'échelle de couleurs (`macroColor`), l'infobulle
 * native, la sélection au clic et l'année du curseur temporel. Les deux onglets
 * montrent le même instant du même indicateur — c'est la condition pour qu'ils
 * soient deux vues et non deux pages.
 *
 * Ce qui change est la PROJECTION, et une seule conséquence en découle : la carte
 * zoome par une transformation (les chemins sont calculés une fois), le globe
 * recalcule ses chemins à chaque rotation. Voir `orthographic` dans `geo.ts` pour la
 * projection elle-même et pour le rabattement des points cachés sur l'horizon.
 *
 * ── LE COÛT DU RECALCUL, ET POURQUOI IL EST TENABLE ─────────────────────────
 *
 * Cent soixante-dix-sept pays, quelques dizaines de points chacun : environ vingt
 * mille projections par image de rotation. C'est du calcul trigonométrique pur, sans
 * allocation d'objet dans la boucle chaude, et le fond Natural Earth 1:110m est
 * précisément la résolution qui rend cela possible — la 1:50m le multiplierait par
 * cinq.
 *
 * ⚠️ LA ROTATION EST COMMITÉE PAR IMAGE, PAS PAR ÉVÉNEMENT. Un `pointermove` peut
 * survenir plusieurs fois entre deux images ; poser un état à chaque fois
 * recalculerait les chemins pour un rendu qui ne sera jamais peint. La position
 * vivante est donc dans une `ref`, et une boucle `requestAnimationFrame` la publie au
 * rythme de l'écran.
 *
 * ── LA LATITUDE EST BORNÉE, LA LONGITUDE NE L'EST PAS ───────────────────────
 *
 * On peut tourner indéfiniment autour de l'axe des pôles ; on ne peut pas passer
 * PAR-DESSUS un pôle, ce qui retournerait la sphère et inverserait le sens du geste
 * au milieu du mouvement. La latitude est donc bornée à ±85° — pas ±90 : au pôle
 * exact, la direction « vers le nord » n'existe plus et la rotation en longitude
 * n'aurait plus de repère visible.
 */

const SIZE = 640
const CENTER = SIZE / 2
/** Rayon à l'échelle 1. La marge restante loge la lueur d'atmosphère. */
const BASE_RADIUS = 280

const MIN_ZOOM = 1
const MAX_ZOOM = 6

/** Degrés de rotation par pixel glissé, à l'échelle 1. */
const DRAG_SENSITIVITY = 0.35

/** Au-delà, la sphère se retourne sous le geste — voir l'en-tête. */
const MAX_LATITUDE = 85

/**
 * Parallèles et méridiens, tous les trente degrés.
 *
 * Ils ne sont pas décoratifs : sur une sphère uniformément colorée, rien ne dit
 * qu'elle tourne tant qu'aucun pays n'est visible — au-dessus du Pacifique, un tiers
 * du globe est un disque bleu. La grille rend le mouvement lisible partout.
 */
function graticule(rotation: GlobeRotation, radius: number): string[] {
  const paths: string[] = []

  const trace = (points: [number, number][]) => {
    const parts: string[] = []
    let visible = false

    for (const [lon, lat] of points) {
      const point = orthographic(lon, lat, rotation, radius, CENTER, CENTER)
      /* Une ligne de grille N'EST PAS un polygone : on ne rabat pas ses points cachés
         sur l'horizon, on COUPE le trait. Rabattre dessinerait un arc parasite le long
         du bord, que rien ne distingue du contour du globe. */
      if (!point.visible) {
        visible = false
        continue
      }

      parts.push(`${visible ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      visible = true
    }

    if (parts.length > 1) paths.push(parts.join(''))
  }

  for (let lat = -60; lat <= 60; lat += 30) {
    trace(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat] as [number, number]))
  }

  for (let lon = -180; lon < 180; lon += 30) {
    trace(Array.from({ length: 37 }, (_, i) => [lon, -90 + i * 5] as [number, number]))
  }

  return paths
}

export function MacroGlobe({
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

  /* La vue par défaut regarde l'Europe et l'Afrique : c'est l'hémisphère le plus
     dense en pays publiés, donc celui qui montre le plus de couleurs à l'ouverture.
     Un globe centré sur le Pacifique s'ouvrirait sur un disque vide. */
  const [rotation, setRotation] = useState<GlobeRotation>({ lon: 10, lat: 20 })
  const [zoom, setZoom] = useState(1)

  const localRef = useRef<SVGSVGElement>(null)
  const nodeRef = svgRef ?? localRef

  /* Position VIVANTE de la rotation pendant un glissement, et image en attente. Voir
     l'en-tête : publier à chaque `pointermove` recalculerait des chemins jamais
     peints. */
  const live = useRef<GlobeRotation>({ lon: 10, lat: 20 })
  const frame = useRef<number | null>(null)

  /* Même mécanique que la carte : `iso` retient le pays visé au `pointerdown`, seul
     instant où la cible est encore le `<path>` — la capture de pointeur redirige tout
     le reste du geste vers le `<svg>`. Voir la ref `drag` de `MacroChoropleth` pour
     la trace complète du défaut que cela répare. */
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

  /* La boucle d'animation est annulée au démontage : sans cela, une image programmée
     pendant un glissement appellerait `setRotation` sur un composant démonté. */
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  /*
   * ── LA MOLETTE PASSE PAR UN ÉCOUTEUR NATIF, ET C'EST OBLIGATOIRE ──────────
   *
   * React attache `onWheel` à la racine de l'application EN MODE PASSIF, et un
   * gestionnaire passif ne peut pas appeler `preventDefault()` : la page défilerait
   * sous le globe à chaque cran de zoom. Même contrainte, même correctif que sur la
   * carte.
   */
  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      /* Facteur multiplicatif et non additif : un pas constant serait imperceptible à
         ×1 et brutal à ×6. */
      const factor = Math.exp(-event.deltaY / 500)
      setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * factor)))
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [nodeRef])

  const byIso = useMemo(() => new Map(data.map((row) => [row.iso, row])), [data])

  const radius = BASE_RADIUS * zoom

  /* Les chemins sont recalculés à chaque rotation ET à chaque zoom — c'est la nature
     de la projection, voir l'en-tête. La mémoïsation évite au moins de refaire le
     calcul quand seul le survol change, ce qui arrive des dizaines de fois par
     seconde quand le curseur traverse le globe. */
  const shapes = useMemo(() => {
    if (!countries) return []

    return countries
      .map((country) => ({ country, d: globePath(country, rotation, radius, CENTER, CENTER) }))
      .filter((shape): shape is { country: CountryFeature; d: string } => shape.d !== null)
  }, [countries, rotation, radius])

  const grid = useMemo(() => graticule(rotation, radius), [rotation, radius])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-card bg-surface p-6 text-center text-sm text-ink-muted">
        {error}
      </div>
    )
  }

  if (!countries) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-card bg-surface p-6 text-center text-sm text-ink-muted">
        {t('Chargement du fond de carte…')}
      </div>
    )
  }

  function commit(next: GlobeRotation) {
    live.current = next
    if (frame.current !== null) return

    frame.current = requestAnimationFrame(() => {
      frame.current = null
      setRotation(live.current)
    })
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card bg-surface">
      <svg
        ref={nodeRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label={t('Globe terrestre')}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          const iso = (event.target as Element | null)?.getAttribute?.('data-iso') ?? null
          drag.current = { x: event.clientX, y: event.clientY, moved: false, iso }
          live.current = rotation
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const start = drag.current
          if (!start) return

          /* SEUIL DE TROIS PIXELS avant de considérer que c'est un glissement : sans
             lui, le tremblement de la main pendant un clic ferait tourner le globe et
             annulerait la sélection du pays qu'on vient de viser. */
          if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 3) {
            return
          }

          const rect = event.currentTarget.getBoundingClientRect()
          /* La sensibilité est rapportée à la taille RÉELLE du cadre et divisée par le
             zoom : sur un globe agrandi quatre fois, un même geste doit parcourir
             quatre fois moins de degrés, sinon la Terre file sous le doigt. */
          const perPixel = (DRAG_SENSITIVITY * (SIZE / rect.width)) / zoom
          const dx = (event.clientX - start.x) * perPixel
          const dy = (event.clientY - start.y) * perPixel

          start.moved = true
          start.x = event.clientX
          start.y = event.clientY

          commit({
            lon: live.current.lon - dx,
            lat: Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, live.current.lat + dy)),
          })
        }}
        onPointerUp={(event) => {
          const moved = drag.current?.moved ?? false
          const iso = drag.current?.iso ?? null
          drag.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)

          /* Une ROTATION ne décide de rien : sans cette distinction, tourner le globe
             refermerait le panneau du pays qu'on examine. */
          if (moved) return

          onSelect(iso === null || iso === selected ? null : iso)
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
      >
        {/* L'OCÉAN, ET LA LUEUR QUI LE DÉTACHE DU FOND.

            Le disque seul se confondait avec le panneau sur les deux thèmes — un
            cercle bleu-gris sur un fond gris. Le halo extérieur lui donne un bord
            sans lui dessiner de contour dur, ce qui est la façon dont un globe se
            détache réellement : par diffusion, pas par trait. */}
        <defs>
          <radialGradient id="macro-globe-atmosphere">
            <stop offset="70%" stopColor="var(--color-brand)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.28" />
          </radialGradient>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={radius * 1.06} fill="url(#macro-globe-atmosphere)" />
        <circle cx={CENTER} cy={CENTER} r={radius} fill="var(--color-surface-muted)" />

        {grid.map((d, index) => (
          <path
            key={`grille-${index}`}
            d={d}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={0.6}
            /* La grille ne doit JAMAIS intercepter le pointeur : elle passe au-dessus
               des pays et volerait le survol comme le clic. */
            pointerEvents="none"
          />
        ))}

        {shapes.map(({ country, d }) => {
          const row = byIso.get(country.iso)
          const isSelected = selected === country.iso
          const isHovered = hovered === country.iso

          return (
            <path
              key={country.iso}
              d={d}
              fill={macroColor(row?.value, low, high, tone)}
              stroke={
                isSelected
                  ? 'var(--color-brand)'
                  : isHovered
                    ? 'var(--color-ink)'
                    : 'var(--color-canvas)'
              }
              strokeWidth={isSelected ? 1.6 : isHovered ? 1.1 : 0.5}
              strokeLinejoin="round"
              data-iso={country.iso}
              onMouseEnter={() => setHovered(country.iso)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* `<title>` natif, comme sur la carte : annoncé par les lecteurs
                  d'écran, et sans état React qui re-rendrait la sphère entière à
                  chaque pays survolé. */}
              <title>
                {country.name}
                {row
                  ? ` — ${formatMacroValue(row.value, scale)}${unit ? ` ${unit}` : ''} (${row.year})`
                  : ' — non publié'}
              </title>
            </path>
          )
        })}
      </svg>

      {/* Mêmes commandes, même coin que sur la carte : le bouton de recentrage
          n'apparaît qu'une fois la vue déplacée — proposer « revenir » depuis la
          position initiale est un contrôle qui ne fait rien. */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {zoom > 1 || rotation.lon !== 10 || rotation.lat !== 20 ? (
          <ZoomButton
            onClick={() => {
              live.current = { lon: 10, lat: 20 }
              setRotation(live.current)
              setZoom(1)
            }}
            label={t('Recentrer la carte')}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </ZoomButton>
        ) : null}

        <ZoomButton
          onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current * 1.5))}
          label="Agrandir"
          disabled={zoom >= MAX_ZOOM}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </ZoomButton>

        <ZoomButton
          onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current / 1.5))}
          label={t('Réduire')}
          disabled={zoom <= MIN_ZOOM}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </ZoomButton>
      </div>
    </div>
  )
}
