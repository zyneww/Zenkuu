/**
 * Rangée de pastilles de sélection, avec son intitulé.
 *
 * PAS de directive `'use client'`, et c'est délibéré. Ces deux composants n'ont ni
 * état ni effet : ils sont compilés dans le paquet client parce que leurs appelants
 * le sont, sans avoir à se déclarer eux-mêmes frontière. Poser la directive en ferait
 * un POINT D'ENTRÉE client, et le vérificateur de Next exige alors que toutes les
 * propriétés soient sérialisables — ce qu'un `onClick` n'est pas.
 *
 * ── POURQUOI CES DEUX-LÀ SONT SORTIS DE LEUR COMPOSANT ────────────────────────
 *
 * Ils vivaient dans `GlobalChartsView`, seul endroit à en avoir besoin. Le panier de
 * capitalisations en a besoin aussi, et les deux blocs se suivent sur la même page :
 * deux copies d'un même dessin posées à cinquante pixels l'une de l'autre se
 * remarqueraient à la première divergence — un rayon, une teinte de survol, une taille
 * de texte. Ce n'est pas de la factorisation par principe, c'est de la cohérence
 * visible à l'œil nu.
 */

/**
 * Intitulé + rangée de pastilles.
 *
 * Les DEUX niveaux s'enroulent, et il faut les deux : à 320 px, l'intitulé tient sur
 * une ligne et la rangée sur la suivante ; à 360, la rangée elle-même se coupe en
 * deux. Sans le second `flex-wrap`, la boîte des pastilles débordait de la sienne et
 * poussait la page — neuf pixels, mesurés sur iPhone SE.
 */
export function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="text-[0.6875rem] uppercase tracking-wide text-ink-muted">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-card border border-border-subtle p-0.5">
        {children}
      </div>
    </div>
  )
}

export function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
        active ? 'bg-brand text-on-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
