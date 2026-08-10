'use client'

import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type { MoversPeriod, MoversUniverse } from '@zenith/data'

/**
 * Barre de filtres des « mouvements » : période et univers, en boutons-pilules.
 *
 * Les deux filtres passent par l'URL (`?periode=`, `?univers=`) et non par un état
 * local. Trois raisons concrètes : une vue filtrée reste partageable, le retour
 * arrière du navigateur fonctionne, et le rendu reste fait côté serveur — donc
 * indexable et sans écran vide au premier affichage.
 *
 * Le changement d'univers déclenche un vrai rechargement de données (une taille
 * d'univers différente = un appel différent), tandis que le changement de période
 * ne fait que reclasser des données déjà chargées : la source publie toutes les
 * fenêtres dans la même réponse.
 */

import { PERIOD_LABELS, UNIVERSE_LABELS } from '@/content/movers'

/**
 * La navigation est faite ICI plutôt que remontée au parent par un rappel : ce
 * composant est le seul client de la frontière, et une prop fonction ne peut pas
 * traverser un composant serveur (elle n'est pas sérialisable).
 */
export function MoversFilters({
  period,
  universe,
  periods,
  universes,
}: {
  period: MoversPeriod
  universe: MoversUniverse
  periods: readonly MoversPeriod[]
  universes: readonly MoversUniverse[]
}) {
  const router = useRouter()

  function onChange(next: { period?: MoversPeriod; universe?: MoversUniverse }) {
    const query = new URLSearchParams()
    const nextPeriod = next.period ?? period
    const nextUniverse = next.universe ?? universe

    // Les valeurs par défaut ne sont pas écrites dans l'URL : `/crypto/mouvements`
    // et `/crypto/mouvements?periode=24h&univers=100` doivent rester une seule page
    // aux yeux d'un moteur de recherche (§9).
    if (nextPeriod !== '24h') query.set('periode', nextPeriod)
    if (nextUniverse !== 100) query.set('univers', String(nextUniverse))

    const search = query.toString()
    router.push(search ? `/crypto/mouvements?${search}` : '/crypto/mouvements', {
      scroll: false,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillDropdown
        label={PERIOD_LABELS[period]}
        ariaLabel="Période de variation"
        options={periods.map((value) => ({ value, label: PERIOD_LABELS[value] }))}
        selected={period}
        onSelect={(value) => onChange({ period: value as MoversPeriod })}
      />
      <PillDropdown
        label={UNIVERSE_LABELS[universe]}
        ariaLabel="Univers de calcul"
        options={universes.map((value) => ({ value, label: UNIVERSE_LABELS[value] }))}
        selected={universe}
        onSelect={(value) => onChange({ universe: Number(value) as MoversUniverse })}
      />
    </div>
  )
}

function PillDropdown({
  label,
  ariaLabel,
  options,
  selected,
  onSelect,
}: {
  label: string
  ariaLabel: string
  options: { value: string | number; label: string }[]
  selected: string | number
  onSelect: (value: string | number) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand"
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-40 mt-1 min-w-[10rem] overflow-hidden rounded-card border border-border-subtle bg-overlay py-1 shadow-overlay"
        >
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === selected}>
              <button
                type="button"
                onClick={() => {
                  onSelect(option.value)
                  setOpen(false)
                }}
                className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                  option.value === selected
                    ? 'bg-brand-soft font-medium text-brand-strong'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
