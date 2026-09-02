'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { usePhrase } from '@/components/locale/ContentProvider'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  categoryOf,
} from '@/components/tools/screener-categories'
import type { ScreenerFilter } from '@/components/tools/screener-markets'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PANNEAU DE FILTRES — SEPT GROUPES REPLIABLES, À DROITE DU TABLEAU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur backpack.exchange/stocks/screener le 2026-09-02.
 *
 * ── CE QUE CETTE FORME CHANGE, ET CE N'EST PAS COSMÉTIQUE ──────────────────
 *
 * Les filtres vivaient dans un BANDEAU au-dessus du tableau : quatre curseurs par
 * rangée, tous dépliés, tout le temps. Deux conséquences.
 *
 * La première est mécanique — le bandeau pousse le tableau vers le bas. Sur un marché
 * qui offre dix filtres, trois rangées de curseurs occupent la moitié de l'écran, et
 * on filtre une liste qu'on ne voit plus.
 *
 * La seconde est de lecture. Dix curseurs alignés sans hiérarchie se ressemblent tous ;
 * pour trouver « écart au plus haut » il faut lire les dix intitulés. Rangés sous
 * « Prix », il y en a trois à lire.
 *
 * ── LES GROUPES SONT REPLIÉS, SAUF CEUX QUI FILTRENT ───────────────────────
 *
 * Un panneau qui ouvre ses sept groupes n'aurait rien résolu : ce serait le bandeau,
 * à la verticale. Ils sont donc fermés, et s'ouvrent d'eux-mêmes quand ils portent un
 * seuil actif — parce qu'un filtre qui agit sans se voir est le pire cas possible :
 * la liste est réduite et rien à l'écran ne dit pourquoi.
 *
 * ── ET UN GROUPE VIDE N'EXISTE PAS ─────────────────────────────────────────
 *
 * Chaque marché n'offre que les filtres dont il a les données : « Événements » n'a
 * aucune mesure sur aucun marché — le site ne suit pas de calendrier de résultats — et
 * « Fondamentaux » n'en a que pour les actions et les ETF. Un groupe sans filtre
 * disparaît au lieu de s'ouvrir sur du vide (§5).
 */
export function ScreenerFilterPanel({
  filters,
  actives,
  renderFilter,
  onReset,
  resetLabel,
}: {
  filters: readonly ScreenerFilter[]
  /** Les clés dont le seuil filtre réellement — elles ouvrent leur groupe. */
  actives: ReadonlySet<string>
  /** Le rendu d'un filtre, laissé à l'appelant qui tient l'état. */
  renderFilter: (filter: ScreenerFilter) => ReactNode
  onReset: () => void
  resetLabel: string
}) {
  const t = usePhrase()

  const groupes = CATEGORY_ORDER.map((categorie) => ({
    categorie,
    filtres: filters.filter((f) => categoryOf(f.key) === categorie),
  })).filter((g) => g.filtres.length > 0)

  const nbActifs = actives.size

  return (
    <aside
      aria-label={t('Filtres')}
      className="rounded-card border border-border-subtle bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-ink">{t('Filtres')}</h2>

        {/* Le bouton n'apparaît QUE si quelque chose est à remettre à zéro. Un
            « réinitialiser » toujours visible sur un panneau vierge propose une action
            sans effet, et l'utilisateur qui le presse doute d'avoir compris. */}
        {nbActifs > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="text-[length:var(--v2-text-2xs)] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {resetLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-3 divide-y divide-border-subtle">
        {groupes.map(({ categorie, filtres }) => {
          const actifsDuGroupe = filtres.filter((f) => actives.has(f.key)).length

          return (
            <Groupe
              key={categorie}
              titre={t(CATEGORY_LABEL[categorie])}
              nbActifs={actifsDuGroupe}
              /* `open` non contrôlé : `defaultOpen` laisserait l'utilisateur refermer
                 un groupe actif, ce qui est son droit. Un `open` contrôlé le rouvrirait
                 de force à chaque rendu — le groupe se battrait contre le clic. */
              ouvertAuDepart={actifsDuGroupe > 0}
            >
              {filtres.map((filter) => (
                <div key={filter.key}>{renderFilter(filter)}</div>
              ))}
            </Groupe>
          )
        })}
      </div>
    </aside>
  )
}

/**
 * Un groupe repliable.
 *
 * `<details>` et `<summary>` natifs plutôt qu'un état React : le navigateur gère
 * l'ouverture, le clavier (Entrée, Espace), l'annonce vocale de l'état déplié, et la
 * recherche dans la page trouve le contenu même replié. Un `useState` avec un `div`
 * redemanderait les quatre, et en oublierait au moins un.
 */
function Groupe({
  titre,
  nbActifs,
  ouvertAuDepart,
  children,
}: {
  titre: string
  nbActifs: number
  ouvertAuDepart: boolean
  children: ReactNode
}) {
  return (
    <details open={ouvertAuDepart} className="group py-2.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs text-ink [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {titre}
          {/* Le compte des filtres actifs du groupe, replié ou non. C'est ce qui
              permet de fermer un groupe sans perdre de vue qu'il agit encore. */}
          {nbActifs > 0 ? (
            <span className="tabular rounded-pill bg-brand-soft px-1.5 text-micro font-medium text-brand-strong">
              {nbActifs}
            </span>
          ) : null}
        </span>

        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>

      <div className="mt-3 space-y-4">{children}</div>
    </details>
  )
}
