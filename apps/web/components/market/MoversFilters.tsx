'use client'

import type { MoversPeriod, MoversUniverse } from '@zenkuu/data'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from '@/i18n/navigation'

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

    // Les valeurs par défaut ne sont pas écrites dans l'URL : `/mouvements`
    // et `/mouvements?periode=24h&univers=100` doivent rester une seule page
    // aux yeux d'un moteur de recherche (§9).
    if (nextPeriod !== '24h') query.set('periode', nextPeriod)
    if (nextUniverse !== 100) query.set('univers', String(nextUniverse))

    const search = query.toString()
    router.push(search ? `/mouvements?${search}` : '/mouvements', {
      scroll: false,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillDropdown
        ariaLabel="Période de variation"
        options={periods.map((value) => ({ value, label: PERIOD_LABELS[value] }))}
        selected={period}
        onSelect={(value) => onChange({ period: value as MoversPeriod })}
      />
      <PillDropdown
        ariaLabel="Univers de calcul"
        options={universes.map((value) => ({ value, label: UNIVERSE_LABELS[value] }))}
        selected={universe}
        onSelect={(value) => onChange({ universe: Number(value) as MoversUniverse })}
      />
    </div>
  )
}

/**
 * ── CE QUI A REMPLACÉ LE MENU ÉCRIT À LA MAIN ────────────────────────────────
 *
 * `PillDropdown` était un `<button aria-haspopup="listbox">` suivi d'un `<ul
 * role="listbox">`, avec ses propres écouteurs de clic extérieur et d'Échap, et une
 * annonce d'accessibilité incomplète : le `role="option"` était posé sur le `<li>`
 * mais le bouton cliquable vivait DEDANS, ce qui casse le lien que les lecteurs
 * d'écran attendent entre la liste et son option active.
 *
 * `Select` de shadcn/ui est celui de Radix. Il apporte le clavier complet (flèches,
 * Origine/Fin, frappe au vol, Échap), le retour du focus au déclencheur, le
 * positionnement du panneau qui se retourne quand il touche le bas de la fenêtre, et
 * la coche sur l'option retenue — pour zéro ligne de gestionnaire ici.
 *
 * ⚠️ LES VALEURS SONT DES CHAÎNES, ET RADIX N'EN ACCEPTE PAS D'AUTRES. L'univers
 * (100, 250, 500) est un nombre partout ailleurs dans le code ; on le sérialise une
 * fois, ici, et l'appelant reconvertit — ce qu'il faisait déjà, puisque l'URL d'où
 * vient la valeur est elle aussi du texte.
 *
 * ⚠️ ET LA CHAÎNE VIDE EST INTERDITE comme valeur d'option : Radix s'en sert en
 * interne pour « rien de choisi ». Aucune période ni aucun univers n'est vide, mais
 * c'est le piège à connaître avant d'ajouter une option « toutes ».
 */
function PillDropdown({
  ariaLabel,
  options,
  selected,
  onSelect,
}: {
  ariaLabel: string
  options: { value: string | number; label: string }[]
  selected: string | number
  onSelect: (value: string) => void
}) {
  return (
    <Select value={String(selected)} onValueChange={onSelect}>
      <SelectTrigger size="sm" aria-label={ariaLabel} className="w-max">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
