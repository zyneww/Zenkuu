'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * Calendrier mensuel de sélection de PLAGE.
 *
 * ── POURQUOI IL REMPLACE DEUX `<input type="date">` ───────────────────────────
 *
 * Le choix de bornes libres du graphique reposait sur deux champs natifs. L'argument
 * était solide — déjà localisés, accessibles au clavier, sélecteur système sur
 * mobile — et il a tenu tant que la fonction restait secondaire. Il ne tient plus,
 * pour une raison qui n'est pas esthétique :
 *
 *   · un champ natif ne montre RIEN tant qu'on ne l'ouvre pas, alors que choisir une
 *     fenêtre de cotation est un geste visuel — on cherche « la semaine du krach »,
 *     pas « le 14 » ;
 *   · deux champs séparés ne peuvent pas exprimer qu'une plage est en cours de
 *     saisie, ni montrer ce qui est déjà couvert ;
 *   · leur rendu est imposé par le navigateur et jure avec le reste du cadre — c'est
 *     le seul contrôle de la page qui n'obéit pas au thème.
 *
 * ── LES DATES SONT DES CHAÎNES `AAAA-MM-JJ`, ET JAMAIS DES `Date` ─────────────
 *
 * C'est le format qu'attend l'appelant, et surtout le seul qui ne porte pas de
 * fuseau. Un objet `Date` désigne un INSTANT ; une date de calendrier n'en est pas
 * un, et les faire cohabiter produit les décalages d'un jour classiques.
 *
 * Toutes les conversions passent donc par les champs LOCAUX (`getFullYear`,
 * `getMonth`, `getDate`) et jamais par `toISOString`, qui bascule en UTC : entre
 * minuit et deux heures du matin à Paris, `new Date().toISOString().slice(0, 10)`
 * renvoie la veille — de quoi interdire la journée en cours dans un calendrier censé
 * l'autoriser.
 */

/** Lundi en tête : c'est la semaine française, et l'axe des graphiques la suit déjà. */
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

/** `AAAA-MM-JJ` d'une date, lue dans le fuseau du lecteur (voir l'en-tête). */
export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** `AAAA-MM-JJ` → `Date` à midi LOCAL. */
function fromIsoDay(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  // Midi et non minuit : une date posée à minuit local traverse le changement d'heure
  // du printemps par la case qui n'existe pas (02:00 → 03:00), et certains moteurs la
  // ramènent alors à la veille. Midi est à douze heures de toute discontinuité connue.
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
}

interface DayCell {
  iso: string
  day: number
  /** Hors du mois affiché — rendu en gris, mais cliquable : c'est bien une vraie date. */
  outside: boolean
  /** Postérieure à aujourd'hui : aucune cotation ne peut exister. */
  future: boolean
}

/**
 * Les six semaines d'une grille mensuelle.
 *
 * SIX et non « autant que nécessaire » : un mois s'étale sur quatre à six semaines
 * selon le jour où il tombe, et laisser la grille varier ferait sauter la hauteur du
 * panneau — donc les boutons en dessous — à chaque changement de mois.
 */
function buildMonth(year: number, month: number, todayIso: string): DayCell[] {
  const first = new Date(year, month, 1, 12)
  // `getDay()` compte à partir de dimanche ; on décale pour que lundi vaille zéro.
  const lead = (first.getDay() + 6) % 7

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - lead + index, 12)
    const iso = toIsoDay(date)
    return {
      iso,
      day: date.getDate(),
      outside: date.getMonth() !== month,
      future: iso > todayIso,
    }
  })
}

export function Calendar({
  /** Plage retenue, ou `null` si aucune. */
  value,
  onChange,
}: {
  value: { from: string; to: string } | null
  onChange: (range: { from: string; to: string } | null) => void
}) {
  const today = useMemo(() => new Date(), [])
  const todayIso = toIsoDay(today)

  /* Mois affiché — initialisé sur la borne de DÉBUT quand une plage existe. Ouvrir
     sur le mois courant obligerait à remonter à la main jusqu'à ce qu'on a déjà
     choisi, ce qui est exactement l'inverse du service rendu. */
  const start = value ? fromIsoDay(value.from) : null
  const [cursor, setCursor] = useState(() => ({
    year: (start ?? today).getFullYear(),
    month: (start ?? today).getMonth(),
  }))

  /**
   * Première borne posée, en attente de la seconde.
   *
   * C'est ce qui permet à un seul geste — deux clics — de remplacer deux champs. Tant
   * qu'elle est non nulle, le survol PRÉVISUALISE la plage : on voit ce qu'on
   * s'apprête à retenir avant de le retenir, ce qu'aucune paire de champs ne sait
   * faire.
   */
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const cells = useMemo(
    () => buildMonth(cursor.year, cursor.month, todayIso),
    [cursor.year, cursor.month, todayIso],
  )

  /* Plage à PEINDRE : celle en cours de tracé si un premier clic a eu lieu, la plage
     retenue sinon. Les bornes sont réordonnées — cliquer du futur vers le passé est
     un geste légitime, et refuser la sélection à rebours n'apprendrait rien. */
  const preview = anchor
    ? (([a, b]) => ({ from: a as string, to: b as string }))(
        [anchor, hovered ?? anchor].sort(),
      )
    : value

  function pick(iso: string) {
    if (!anchor) {
      setAnchor(iso)
      return
    }
    const [from, to] = [anchor, iso].sort() as [string, string]
    setAnchor(null)
    setHovered(null)
    onChange({ from, to })
  }

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1, 12)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1, 12).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  /* Un mois entièrement postérieur à aujourd'hui n'a aucune cotation à offrir : la
     flèche « suivant » s'éteint plutôt que d'ouvrir une grille entièrement grisée. */
  const nextDisabled = new Date(cursor.year, cursor.month + 1, 1, 12) > today

  return (
    <div className="w-64 select-none">
      {/* ── Bandeau de navigation ─────────────────────────────────────────── */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <ArrowButton label="Mois précédent" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </ArrowButton>

        {/* `aria-live` : au clavier, les flèches changent la grille sans déplacer le
            focus. Sans annonce, rien ne signalerait que le mois a changé. */}
        <span aria-live="polite" className="text-sm font-semibold capitalize text-ink">
          {monthLabel}
        </span>

        <ArrowButton label="Mois suivant" onClick={() => shiftMonth(1)} disabled={nextDisabled}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </ArrowButton>
      </div>

      {/* ── En-tête des jours ─────────────────────────────────────────────────
          `aria-hidden` : « L M M J V S D » se prononce comme une suite de lettres
          sans le moindre sens. Chaque bouton de jour porte sa date complète en
          `aria-label`, ce qui est la seule forme réellement lisible à l'oreille. */}
      <div aria-hidden="true" className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className="flex h-7 items-center justify-center text-[0.6875rem] font-medium text-ink-muted"
          >
            {letter}
          </span>
        ))}
      </div>

      {/* ── Grille ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-px" onMouseLeave={() => setHovered(null)}>
        {cells.map((cell) => {
          const inRange =
            preview !== null && cell.iso >= preview.from && cell.iso <= preview.to
          const isEdge =
            preview !== null && (cell.iso === preview.from || cell.iso === preview.to)

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={cell.future}
              onClick={() => pick(cell.iso)}
              onMouseEnter={() => setHovered(cell.iso)}
              aria-label={formatFullDay(cell.iso)}
              aria-pressed={isEdge}
              className={[
                'tabular flex h-8 items-center justify-center text-xs transition-colors duration-100',
                // Coins CARRÉS, à l'exception des deux bornes. Une plage se lit comme
                // un bloc continu : arrondir chaque case y creuserait des encoches
                // entre deux jours consécutifs et casserait la lecture du segment.
                isEdge
                  ? 'bg-brand font-semibold text-white'
                  : inRange
                    ? 'bg-brand-soft text-brand-strong'
                    : cell.future
                      ? 'cursor-not-allowed text-ink-muted/35'
                      : cell.outside
                        ? 'text-ink-muted/60 hover:bg-surface-muted hover:text-ink'
                        : 'text-ink hover:bg-surface-muted',
                // Aujourd'hui reste repérable même hors sélection : c'est l'origine
                // implicite de toute lecture de cours.
                cell.iso === todayIso && !isEdge ? 'font-semibold underline underline-offset-4' : '',
              ].join(' ')}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {/* ── Pied ──────────────────────────────────────────────────────────── */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
        <p className="text-[0.6875rem] leading-tight text-ink-muted">
          {anchor
            ? 'Choisissez la seconde date'
            : value
              ? `${formatShortDay(value.from)} → ${formatShortDay(value.to)}`
              : 'Choisissez une première date'}
        </p>

        {value || anchor ? (
          <button
            type="button"
            onClick={() => {
              setAnchor(null)
              setHovered(null)
              onChange(null)
            }}
            className="shrink-0 px-1.5 py-0.5 text-[0.6875rem] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Effacer
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ArrowButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
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
      className="flex h-7 w-7 items-center justify-center text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

function formatFullDay(iso: string): string {
  const date = fromIsoDay(iso)
  if (!date) return iso
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDay(iso: string): string {
  const date = fromIsoDay(iso)
  if (!date) return iso
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
}
