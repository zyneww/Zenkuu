import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string | null
  /** Origine de la donnée manquante, affichée en petit. */
  source?: string | null
  action?: ReactNode
  tone?: 'neutral' | 'warning'
  compact?: boolean
}

/**
 * État vide explicite — la contrepartie visible de la règle « zéro donnée factice ».
 *
 * Ce composant est ce qui s'affiche partout où une source n'est pas disponible.
 * Il dit ce qui manque et pourquoi ; il ne remplit jamais l'espace avec un
 * placeholder chiffré, un « 0 » ou un graphique vide qui laisserait croire à une
 * mesure réelle (§5).
 */
export function EmptyState({
  title,
  description,
  source,
  action,
  tone = 'neutral',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed text-center ${
        tone === 'warning'
          ? 'border-brand/40 bg-brand-soft'
          : 'border-border-subtle bg-surface-muted'
      } ${compact ? 'gap-1 px-4 py-6' : 'gap-2 px-6 py-10'}`}
    >
      <AscentMark />
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
      {source ? <p className="mt-1 text-[0.6875rem] text-ink-muted">Source : {source}</p> : null}
    </div>
  )
}

/**
 * Marque d'ascension — PLACEHOLDER.
 *
 * La mascotte du §10 doit prendre cette place une fois le visuel déposé dans
 * `apps/web/public/brand/`. En attendant, un chevron géométrique neutre : il ne
 * prétend pas être la mascotte et n'introduit aucune identité inventée.
 */
function AscentMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-brand/60"
    >
      <path
        d="M3 18l5.5-6.5L13 16l8-11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
