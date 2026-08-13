'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { pageWindow } from '@/components/ui/page-window'

/**
 * Barre de pagination — compteur, pages, taille de page.
 *
 * ── POURQUOI PAGINER PLUTÔT QUE DÉFILER ──────────────────────────────────────
 *
 * Une liste de trois cents lignes qu'on fait défiler sans fin a trois défauts qu'on
 * ne remarque qu'à l'usage : on ne sait jamais où l'on en est, on ne peut pas revenir
 * à « la troisième page » parce qu'il n'y a pas de pages, et le navigateur garde en
 * mémoire tout ce qu'on a traversé. Le compteur « 1 à 50 sur 300 » répond à la
 * première question avant même qu'on se la pose.
 *
 * ── CE COMPOSANT NE DÉCIDE RIEN ──────────────────────────────────────────────
 *
 * Il ne connaît ni les données, ni le tri, ni l'URL. Il reçoit où l'on en est et
 * appelle en retour. C'est ce qui lui permet de servir à la fois une liste filtrée en
 * mémoire et un classement dont la page vit dans l'adresse — deux mécaniques qui
 * n'ont rien en commun sauf cette barre.
 *
 * Le calcul de la fenêtre de pages vit dans `page-window.ts`, avec ses tests : une
 * logique pure enfermée dans un module JSX est une logique qu'on ne peut PAS éprouver,
 * l'exécuteur de tests refusant d'analyser un fichier qui contient du JSX. C'est un
 * argument de testabilité, pas de rangement.
 */

const ROW_CHOICES = [25, 50, 100] as const

export function Pagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: {
  /** Page courante, à partir de 1. */
  page: number
  perPage: number
  /** Nombre total d'éléments, AVANT découpage. */
  total: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  /*
   * Bornes affichées dans le compteur.
   *
   * `first` vaut 0 sur une liste VIDE, et c'est voulu : « 1 à 0 sur 0 » se lit comme
   * un défaut, « 0 à 0 sur 0 » se lit comme un vide. Le composant n'est de toute façon
   * pas rendu dans ce cas par ses appelants, mais un composant qui ment quand on le
   * sort de son contexte est un piège qu'on paie plus tard.
   */
  const first = total === 0 ? 0 : (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border-subtle pt-3 text-xs">
      <p className="tabular text-ink-muted">
        Affichage de {first} à {last} sur {total} résultat{total > 1 ? 's' : ''}
      </p>

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Arrow
            label="Page précédente"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Arrow>

          {pageWindow(page, pageCount).map((entry, index) =>
            entry === null ? (
              // La clé porte l'INDEX parce qu'il peut y avoir deux ellipses, l'une à
              // gauche et l'autre à droite : `key="…"` les ferait entrer en collision.
              <span key={`gap-${index}`} className="px-1 text-ink-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={`tabular min-w-7 rounded-control px-2 py-1 font-medium transition-colors duration-150 ${
                  entry === page
                    ? 'bg-brand text-on-brand'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {entry}
              </button>
            ),
          )}

          <Arrow
            label="Page suivante"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Arrow>
        </nav>
      ) : null}

      <label className="flex items-center gap-2 text-ink-muted">
        Lignes
        <select
          value={perPage}
          onChange={(event) => onPerPageChange(Number(event.target.value))}
          className="tabular rounded-control border border-border-subtle bg-surface px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
        >
          {ROW_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function Arrow({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      /* `disabled` plutôt qu'un bouton retiré : une rangée dont le premier élément
         disparaît en page 1 décale tout le reste, et l'œil perd le repère qu'il vient
         de viser. */
      className="rounded-control p-1 text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}
