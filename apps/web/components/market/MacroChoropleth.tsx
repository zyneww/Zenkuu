'use client'

import { useEffect, useState } from 'react'

import {
  countryPath,
  loadCountries,
  macroColor,
  type CountryFeature,
  type MacroTone,
} from '@/components/market/geo'

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
 */

export interface MacroMapDatum {
  iso: string
  country: string
  value: number
  year: number
}

const WIDTH = 1000
const HEIGHT = 500

export function MacroChoropleth({
  data,
  low,
  high,
  tone,
  unit,
  selected,
  onSelect,
}: {
  data: MacroMapDatum[]
  low: number
  high: number
  tone: MacroTone
  unit: string
  selected: string | null
  onSelect: (iso: string | null) => void
}) {
  const [countries, setCountries] = useState<CountryFeature[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

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

  const byIso = new Map(data.map((row) => [row.iso, row]))

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-card border border-border-subtle bg-surface px-6 text-center text-xs text-ink-muted">
        {error}
      </div>
    )
  }

  if (!countries) {
    return (
      <div className="flex h-full items-center justify-center rounded-card border border-border-subtle bg-surface text-xs text-ink-muted">
        Chargement de la carte…
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card border border-border-subtle bg-surface">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label="Carte du monde"
        /* Un clic sur le fond DÉSÉLECTIONNE. Sans cela, on ne peut refermer la barre
           latérale qu'en rechargeant : il n'y a pas de bouton « aucun pays ». */
        onClick={() => onSelect(null)}
      >
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
              strokeWidth={isSelected ? 1.6 : isHovered ? 1.1 : 0.5}
              className="cursor-pointer transition-[stroke-width] duration-100"
              onMouseEnter={() => setHovered(country.iso)}
              onMouseLeave={() => setHovered(null)}
              onClick={(event) => {
                // Sans cela, le clic remonterait au `<svg>` et désélectionnerait
                // aussitôt le pays qu'on vient de choisir.
                event.stopPropagation()
                onSelect(isSelected ? null : country.iso)
              }}
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
                {row ? ` — ${format(row.value)} ${unit} (${row.year})` : ' — non publié'}
              </title>
            </path>
          )
        })}
      </svg>
    </div>
  )
}

function format(value: number): string {
  return value.toFixed(Math.abs(value) < 10 ? 1 : 0).replace('.', ',')
}
