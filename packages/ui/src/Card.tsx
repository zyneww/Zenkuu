import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Retire le rembourrage interne — pour les tableaux qui gèrent le leur. */
  flush?: boolean
  /**
   * Pose la GRADUATION en tête de la carte — la signature du site.
   *
   * Réservée aux modules qui portent des CHIFFRES. Une carte éditoriale ou un bloc
   * de texte ne la prend pas : répétée partout, la bande cesserait d'être une
   * signature pour devenir une texture de fond. Voir `.graduated` dans
   * `globals.css` pour ce qu'elle encode.
   */
  graduated?: boolean
}

/** Surface de base du produit : rayon 12px, bordure discrète (§3.1). */
export function Card({
  children,
  className = '',
  flush = false,
  graduated = false,
}: CardProps) {
  return (
    <section
      className={`rounded-card border border-border-subtle bg-surface ${graduated ? 'graduated' : ''} ${flush ? '' : 'p-4'} ${className}`}
    >
      {children}
    </section>
  )
}

interface CardHeaderProps {
  title: string
  /** Précision affichée sous le titre — sert notamment à annoncer un périmètre. */
  hint?: string
  action?: ReactNode
}

export function CardHeader({ title, hint, action }: CardHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  )
}
