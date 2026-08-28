'use client'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * INTERRUPTEUR SEGMENTÉ — UN SEUL BOUTON DIVISÉ EN N, ET UN CURSEUR QUI GLISSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL REMPLACE ────────────────────────────────────────────────────────
 *
 * Deux formes coexistaient dans le menu d'affichage : une rangée de trois pastilles
 * rondes pour le thème, et un RENVOI vers un sous-écran pour la largeur. Les deux
 * réglages sont pourtant de même nature — un choix parmi deux ou trois valeurs
 * mutuellement exclusives, appliqué sur place. Ils portent désormais la même forme.
 *
 * ── LE CURSEUR EST UN ÉLÉMENT, PAS UN FOND PAR BOUTON ────────────────────────
 *
 * C'est ce qui permet l'ANIMATION. Un fond posé sur le bouton actif apparaît et
 * disparaît ; un curseur unique se DÉPLACE, et le mouvement dit d'où l'on vient. Sa
 * largeur est `(100% - 2×padding) / n`, et il se translate de `index × 100 %` — un
 * pourcentage de translation se rapporte à la largeur de l'élément lui-même, donc à
 * une case exactement, quel que soit le nombre de cases.
 *
 * ⚠️ LES CASES DOIVENT ÊTRE DE LARGEUR ÉGALE (`flex-1 basis-0`), sans quoi le
 * curseur se désaligne dès la deuxième : sa translation suppose des pas identiques.
 *
 * `prefers-reduced-motion` retire la transition — un curseur qui glisse est
 * exactement le genre de mouvement que ce réglage existe pour supprimer.
 */

export interface SegmentedOption<T extends string> {
  value: T
  /** Libellé visible. Absent pour un segment purement iconographique. */
  label?: string
  /** Toujours lu par la synthèse vocale, y compris quand `label` est affiché. */
  a11yLabel: string
  icon?: React.ReactNode
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  className = '',
}: {
  ariaLabel: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      /* `rounded-sm` (4 px) et non `rounded-pill` : les coins sont volontairement
         moins arrondis qu'auparavant — c'est ce qui a été demandé, et un rectangle
         à peine adouci se lit comme UN bouton divisé, là où une pilule se lit comme
         une rangée de pastilles. */
      className={`relative isolate flex shrink-0 items-center rounded-sm bg-surface-muted p-0.5 ${className}`}
    >
      {/* Le curseur. `-z-10` le range SOUS les libellés sans les sortir du flux :
          posé au-dessus, il masquerait le texte du segment actif. */}
      <span
        aria-hidden="true"
        className="motion-safe:transition-transform pointer-events-none absolute inset-y-0.5 left-0.5 -z-10 rounded-xs bg-surface shadow-sm duration-200 ease-out"
        style={{
          width: `calc((100% - 0.25rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />

      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.a11yLabel}
            title={option.a11yLabel}
            onClick={() => onChange(option.value)}
            /* `basis-0` en plus de `flex-1` : sans lui, les cases partent de la
               largeur de leur contenu et « Compact » serait plus étroit que
               « Étirée » — le curseur, lui, avance par pas égaux. */
            className={`relative flex min-w-0 flex-1 basis-0 items-center justify-center gap-1 rounded-xs px-2 py-1 text-xs font-medium transition-colors duration-150 ${
              active ? 'text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {option.icon}
            {option.label ? <span className="truncate">{option.label}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
