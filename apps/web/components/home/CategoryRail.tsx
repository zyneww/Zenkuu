'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Link } from '@/i18n/navigation'

export interface RailEntry {
  href: string
  label: string
  /** Rendue en pastille pleine plutôt qu'en pastille de filet. */
  current?: boolean
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RAIL DE SECTEURS — UNE SEULE LIGNE, QUOI QU'IL ARRIVE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL REPREND À LA RÉFÉRENCE, ET CE QU'IL N'EN REPREND PAS ───────────
 *
 * La GÉOMÉTRIE, mesurée au navigateur sur tokenomist.ai/overview : pastille de
 * 26 px de haut, 12 px de flanc, rayon 16 px, filet de 1,25 px, texte de 13 px en
 * graisse 500. Ces valeurs ne sont pas approchées « au plus proche cran Tailwind » —
 * un rayon de 16 px sur une pastille de 26 px n'est PAS une pilule, et le rendre en
 * `rounded-pill` donnerait un ovale là où la référence donne un rectangle très
 * adouci. C'est la différence entre « étiquette » et « bouton », et elle se voit.
 *
 * Ce qu'il n'en reprend pas : leur rail FILTRE la page sur place. Le nôtre NAVIGUE
 * vers la page du secteur. Reproduire le filtrage demanderait de remonter l'état
 * dans un composant client, de re-solliciter la source à chaque pastille et de
 * réécrire l'URL pour que le résultat reste partageable — pour un gain nul ici, où
 * chaque secteur a déjà sa page et où celle-ci en montre bien plus qu'un filtre.
 *
 * ── POURQUOI CE COMPOSANT EST CLIENT ────────────────────────────────────────
 *
 * Pour les deux flèches, et pour rien d'autre. Un rail qui déborde sans les
 * proposer est parcourable au doigt et au pavé tactile, mais pas à la souris seule :
 * il n'y a pas de barre horizontale sous un `scrollbar-none`, et `shift+molette`
 * n'est connu de personne. Les flèches sont donc une affordance, pas un ornement —
 * d'où le fait qu'elles n'apparaissent QUE du côté où il reste à voir.
 *
 * Le calcul est délibérément grossier — une marge d'un pixel sur la comparaison —
 * parce que `scrollLeft` est fractionnaire dès que le facteur de zoom du navigateur
 * ne vaut pas 1, et qu'une comparaison stricte laisserait la flèche de droite
 * allumée en fin de course. Voir la note sur `EDGE_SLACK`.
 */
/** Marge de tolérance, en pixels, sur la détection de fin de course. */
const EDGE_SLACK = 1

/** Fraction de la largeur visible parcourue par un appui sur une flèche. */
const STEP_RATIO = 0.8

export function CategoryRail({ entries, label }: { entries: RailEntry[]; label: string }) {
  const t = usePhrase()
  const trackRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setEdges({
      start: track.scrollLeft > EDGE_SLACK,
      end: track.scrollLeft < max - EDGE_SLACK,
    })
  }, [])

  useEffect(() => {
    measure()

    /* `ResizeObserver` et non `window.resize` : le rail rétrécit aussi quand la
       colonne qui le porte change de largeur sans que la fenêtre bouge — au
       repliement d'un panneau voisin, par exemple. L'événement de fenêtre ne le
       verrait pas, et la flèche resterait allumée sur un rail qui ne déborde plus. */
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [measure, entries.length])

  const nudge = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * STEP_RATIO, behavior: 'smooth' })
  }

  if (entries.length === 0) return null

  return (
    <nav aria-label={label} className="relative flex min-w-0 items-center gap-2">
      {edges.start ? (
        <Arrow direction="start" label={t('Secteurs précédents')} onClick={() => nudge(-1)} />
      ) : null}

      <div
        ref={trackRef}
        onScroll={measure}
        className="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
      >
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            aria-current={entry.current ? 'page' : undefined}
            className={`inline-flex h-[26px] shrink-0 items-center rounded-[16px] border px-3 text-sm transition-colors duration-150 ${
              entry.current
                ? 'border-brand bg-brand-soft text-brand-strong'
                : 'border-border-subtle text-ink hover:border-brand hover:text-brand'
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      {edges.end ? (
        <Arrow direction="end" label={t('Secteurs suivants')} onClick={() => nudge(1)} />
      ) : null}
    </nav>
  )
}

function Arrow({
  direction,
  label,
  onClick,
}: {
  direction: 'start' | 'end'
  label: string
  onClick: () => void
}) {
  const Icon = direction === 'start' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-[26px] shrink-0 items-center justify-center rounded-[16px] border border-border-subtle text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </button>
  )
}
