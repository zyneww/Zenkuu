'use client'

import { fr } from 'react-day-picker/locale'
import { useMemo, useState, useSyncExternalStore } from 'react'
import type { DateRange } from 'react-day-picker'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'

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
 * ── CE QUE LA GRILLE DE SHADCN/UI A REPRIS, ET CE QU'ELLE A APPORTÉ ──────────
 *
 * Ce fichier dessinait sa propre grille : six semaines de quarante-deux boutons, la
 * navigation de mois, l'ancrage du premier clic, la prévisualisation au survol. Tout
 * cela existe dans `react-day-picker`, que `Calendar` habille — et trois choses
 * arrivent avec lui que la version maison n'avait pas :
 *
 *   · LA NAVIGATION AU CLAVIER DANS LA GRILLE. Les flèches déplaçaient le focus de
 *     bouton en bouton dans l'ordre du DOM ; elles se déplacent maintenant en DEUX
 *     DIMENSIONS — flèche bas = même jour la semaine suivante, ce qu'on attend d'un
 *     calendrier et que quarante-deux boutons alignés ne peuvent pas donner.
 *   · LA LOCALISATION. Les jours et les mois viennent de `react-day-picker/locale`
 *     au lieu d'un tableau `['L','M','M','J','V','S','D']` écrit en dur, et la
 *     première colonne suit la convention de la langue au lieu d'imposer lundi.
 *   · `mode="range"` gère l'ancre, le survol et le réordonnancement des bornes —
 *     cliquer du futur vers le passé reste un geste légitime, et il n'y a plus deux
 *     états locaux à tenir synchronisés pour cela.
 *
 * ── LES DATES SONT DES CHAÎNES `AAAA-MM-JJ`, ET JAMAIS DES `Date` ─────────────
 *
 * ⚠️ C'EST LA CONTRAINTE LA PLUS IMPORTANTE DU FICHIER, et elle survit au changement
 * de bibliothèque. `react-day-picker` parle en objets `Date` ; l'appelant, lui, veut
 * des chaînes. La conversion vit donc ICI, aux deux frontières, et nulle part ailleurs.
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

/** `AAAA-MM-JJ` d'une date, lue dans le fuseau du lecteur (voir l'en-tête). */
export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** `AAAA-MM-JJ` → `Date` à midi LOCAL. */
function fromIsoDay(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return undefined
  // Midi et non minuit : une date posée à minuit local traverse le changement d'heure
  // du printemps par la case qui n'existe pas (02:00 → 03:00), et certains moteurs la
  // ramènent alors à la veille. Midi est à douze heures de toute discontinuité connue.
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
}

export function DateRangeCalendar({
  /** Plage retenue, ou `null` si aucune. */
  value,
  onChange,
}: {
  value: { from: string; to: string } | null
  onChange: (range: { from: string; to: string } | null) => void
}) {
  const t = usePhrase()
  const today = useMemo(() => new Date(), [])
  const wide = useWideEnoughForTwoMonths()

  /*
   * L'état local ne tient QUE la sélection en cours, pas la plage retenue.
   *
   * `react-day-picker` en mode plage passe par un état intermédiaire où seule la
   * borne de début existe (`{ from, to: undefined }`). L'appelant, lui, ne veut
   * entendre parler que de plages COMPLÈTES : lui remonter la moitié d'une plage
   * relancerait le tracé du graphique sur une fenêtre d'un jour, à chaque premier clic.
   *
   * On garde donc le brouillon ici et on n'appelle `onChange` qu'une fois les deux
   * bornes posées. `?? selectedFromValue` : hors saisie, c'est la valeur du parent qui
   * s'affiche — le composant ne devient jamais une seconde source de vérité.
   */
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)

  const selected: DateRange | undefined =
    draft ??
    (value ? { from: fromIsoDay(value.from), to: fromIsoDay(value.to) } : undefined)

  /* Mois ouvert — celui de la borne de DÉBUT quand une plage existe. Ouvrir sur le
     mois courant obligerait à remonter à la main jusqu'à ce qu'on a déjà choisi, ce
     qui est exactement l'inverse du service rendu. */
  const defaultMonth = value ? fromIsoDay(value.from) : today

  return (
    <div className="w-max select-none">
      <Calendar
        mode="range"
        locale={fr}
        selected={selected}
        defaultMonth={defaultMonth}
        /* Aucune cotation ne peut exister après aujourd'hui. `disabled` éteint ces
           jours ET empêche la navigation d'ouvrir un mois entièrement grisé, ce que
           l'ancienne version obtenait par un test écrit à la main sur la flèche. */
        disabled={{ after: today }}
        onSelect={(range) => {
          setDraft(range)
          if (range?.from && range.to) {
            onChange({ from: toIsoDay(range.from), to: toIsoDay(range.to) })
            setDraft(undefined)
          }
        }}
        /* DEUX MOIS CÔTE À CÔTE. Choisir une plage sur une seule grille oblige, dès
           que les bornes tombent de part et d'autre d'un 1ᵉʳ, à changer de mois entre
           les deux clics — geste pendant lequel la première borne disparaît de
           l'écran. Deux mois couvrent la quasi-totalité des plages réellement
           demandées sans navigation. Un seul en dessous de `sm`, où deux ne tiennent
           pas. */
        numberOfMonths={wide ? 2 : 1}
        /* Cases plus grandes : la grille par défaut est calibrée pour un champ de
           formulaire, pas pour un menu qu'on balaie du regard. */
        className="p-0 [--cell-size:--spacing(9)]"
      />

      {/* ── Pied ──────────────────────────────────────────────────────────── */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
        <p className="text-xs leading-tight text-ink-muted">
          {draft?.from && !draft.to
            ? t('Choisissez la seconde date')
            : value
              ? `${formatShortDay(value.from)} → ${formatShortDay(value.to)}`
              : t('Choisissez une première date')}
        </p>

        {value || draft ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setDraft(undefined)
              onChange(null)
            }}
            className="shrink-0 text-[0.6875rem] text-ink-muted"
          >
            {t('Effacer')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * L'écran tient-il deux mois côte à côte ?
 *
 * Même mécanique que `useReducedMotion` : la largeur de l'écran est un état EXTERNE à
 * React, et `useSyncExternalStore` est fait pour cela. Un `useEffect` + `useState`
 * ajouterait un rendu à chaque ouverture du menu.
 *
 * L'instantané serveur rend `false` : un seul mois est toujours affichable, deux ne
 * le sont pas — le repli prudent est celui qui ne déborde jamais.
 */
const TWO_MONTHS_QUERY = '(min-width: 40rem)'

function subscribeToWidth(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(TWO_MONTHS_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useWideEnoughForTwoMonths(): boolean {
  return useSyncExternalStore(
    subscribeToWidth,
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(TWO_MONTHS_QUERY).matches : false),
    () => false,
  )
}

/** « 14 mars 2024 » → « 14 mars », pour le résumé du pied. */
function formatShortDay(iso: string): string {
  const date = fromIsoDay(iso)
  if (!date) return iso
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
