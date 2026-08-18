'use client'

import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useRouter } from '@/i18n/navigation'
import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Sélecteur de date du fil d'actualités.
 *
 * ── CE QU'IL PEUT ET NE PEUT PAS ATTEINDRE ────────────────────────────────────
 *
 * L'archive ne remonte pas avant sa mise en service : un flux RSS ne publie que ses
 * ~30 derniers articles, et ce qui en est sorti avant que la collecte ne démarre est
 * définitivement perdu. `oldestAvailable` porte cette limite, et les jours antérieurs
 * sont DÉSACTIVÉS plutôt que cliquables.
 *
 * C'est le point le plus important de ce composant. Un jour vide sans explication se
 * lit comme une panne du site ; un jour grisé accompagné de sa raison se lit comme
 * une limite connue. La différence ne tient qu'à ce que l'interface dit.
 *
 * ── POURQUOI PAS `<input type="date">` ────────────────────────────────────────
 *
 * Il ne sait pas griser un jour précis — `min` et `max` bornent un intervalle, mais
 * ne peuvent pas exclure une date à l'intérieur. Or c'est exactement ce qu'il faut
 * ici : dire quels jours portent des articles. Son rendu natif diffère en outre
 * radicalement d'un navigateur à l'autre.
 */

interface Props {
  /** Jour affiché, au format `AAAA-MM-JJ`. Absent = le fil du jour, en direct. */
  selected?: string
  /** Jour le plus ancien porté par l'archive. Absent = archive vide ou désactivée. */
  oldestAvailable?: string
  /** Message expliquant pourquoi le calendrier est indisponible, s'il l'est. */
  unavailableReason?: string
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function NewsDatePicker({ selected, oldestAvailable, unavailableReason }: Props) {
  const t = usePhrase()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const today = new Date()
  const selectedDate = selected ? parseIso(selected) : null
  const [cursor, setCursor] = useState(() => startOfMonth(selectedDate ?? today))

  /*
   * CE CALENDRIER NE SE FERMAIT PAR AUCUN MOYEN.
   *
   * Ni au survol perdu, ni au clic extérieur, ni à Échap : seul le choix d'une date
   * ou le retour au direct le refermaient. Ouvert par erreur, il fallait donc choisir
   * une date dont on ne voulait pas pour s'en débarrasser. Les trois voies habituelles
   * sont posées ici, comme sur les autres panneaux du site.
   *
   * Les crochets précèdent la sortie anticipée ci-dessous — ils doivent être appelés
   * à chaque rendu, quel que soit le chemin pris ensuite.
   */
  const hoverDismiss = useHoverDismiss(() => setOpen(false), open)

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

  if (unavailableReason) {
    return (
      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {unavailableReason}
      </p>
    )
  }

  const oldest = oldestAvailable ? parseIso(oldestAvailable) : null

  function choose(day: Date) {
    setOpen(false)
    router.push(`/actualites?date=${toIso(day)}`)
  }

  function clear() {
    setOpen(false)
    router.push('/actualites')
  }

  const grid = monthGrid(cursor)

  return (
    <div ref={containerRef} className="relative" {...hoverDismiss}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`flex items-center gap-1.5 rounded-card border px-3 py-2 text-xs transition-colors ${
            selected
              ? 'border-brand bg-brand-soft font-medium text-brand-strong'
              : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {selectedDate ? formatLong(selectedDate) : 'Choisir une date'}
        </button>

        {/* Retour au direct — bouton SÉPARÉ et non un « ✕ » dans le précédent : ce
            sont deux actions différentes, et les fondre en une seule cible obligerait
            à viser quelques pixels pour distinguer « ouvrir » de « effacer ». */}
        {selected ? (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 rounded-card border border-border-subtle px-2 py-2 text-xs text-ink-muted transition-colors hover:border-brand hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />{t('Revenir au direct')}</button>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label={t('Choisir une date')}
          className="absolute left-0 top-full z-50 mt-2 w-72 border border-border-subtle bg-overlay p-3 shadow-overlay"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCursor(addMonths(cursor, -1))}
              aria-label={t('Mois précédent')}
              className="flex h-7 w-7 items-center justify-center text-ink-muted transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="text-sm font-medium text-ink">
              {MOIS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>

            <button
              type="button"
              onClick={() => setCursor(addMonths(cursor, 1))}
              aria-label="Mois suivant"
              disabled={isSameMonth(cursor, today)}
              className="flex h-7 w-7 items-center justify-center text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {JOURS.map((label, index) => (
              <span key={index} className="py-1 text-micro font-medium text-ink-muted">
                {label}
              </span>
            ))}

            {grid.map((day, index) => {
              if (!day) return <span key={`vide-${index}`} />

              const iso = toIso(day)
              const future = day > today
              const tooOld = oldest ? day < oldest : false
              const disabled = future || tooOld

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => choose(day)}
                  disabled={disabled}
                  aria-current={iso === selected ? 'date' : undefined}
                  title={
                    tooOld
                      ? "Aucune actualité archivée avant cette date"
                      : future
                        ? 'Date à venir'
                        : undefined
                  }
                  className={`py-1.5 text-xs transition-colors ${
                    iso === selected
                      ? 'bg-brand font-semibold text-on-brand'
                      : disabled
                        ? 'cursor-not-allowed text-ink-muted/30'
                        : 'text-ink hover:bg-surface-muted'
                  }`}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>

          {oldest ? (
            <p className="mt-2 border-t border-border-subtle pt-2 text-micro leading-relaxed text-ink-muted">
              L’archive commence le {formatLong(oldest)}. Un flux d’actualités ne publie que
              ses derniers articles : ce qui précède la mise en service n’a pas pu être
              conservé.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ── Dates ────────────────────────────────────────────────────────────────────
 *
 * Calculs faits sur des dates LOCALES et non UTC. Un lecteur qui demande « le 10 »
 * pense au 10 chez lui ; convertir en UTC décalerait son jour d'une à deux heures et
 * ferait apparaître, en fin de soirée, les articles du lendemain.
 */

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatLong(date: Date): string {
  return `${date.getDate()} ${MOIS[date.getMonth()]} ${date.getFullYear()}`
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/**
 * Grille du mois, complétée de cases vides jusqu'au premier lundi.
 *
 * `getDay()` rend 0 pour dimanche ; la semaine française commence le lundi, d'où le
 * décalage. Sans lui, tout le mois est décalé d'un jour — un défaut qui passe
 * inaperçu la moitié de l'année, quand le 1er tombe un lundi ou un dimanche.
 */
function monthGrid(month: Date): (Date | null)[] {
  const first = startOfMonth(month)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  const cells: (Date | null)[] = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  return cells
}
