'use client'

import { Checkbox as HeroCheckbox } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CASE À COCHER — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un seul appelant : le sélecteur de colonnes des tableaux (`table-columns.tsx`), qui
 * l'écrit en composant UNIQUE — `<Checkbox checked disabled onCheckedChange />`. C'est
 * ce qui rend la reprise possible sans toucher à ce fichier : les parties de HeroUI
 * (`Checkbox.Content`, `Checkbox.Control`, `Checkbox.Indicator`) sont composées ICI et
 * ne sortent jamais.
 *
 * ── LA TRADUCTION DES NOMS ───────────────────────────────────────────────────
 *
 *   checked          →  isSelected
 *   defaultChecked   →  defaultSelected
 *   onCheckedChange  →  onChange   (les deux livrent un booléen)
 *   disabled         →  isDisabled
 *
 * ⚠️ `indeterminate` N'EST PAS TRADUIT depuis Radix : ce dernier le passait par
 * `checked="indeterminate"`, une troisième valeur dans la même propriété. HeroUI en fait
 * une propriété distincte (`isIndeterminate`), plus claire mais incompatible. Aucun
 * appelant n'utilisait l'état, la traduction n'a donc pas lieu d'être écrite tant que
 * personne ne la demande — et l'écrire « au cas où » reviendrait à deviner la forme que
 * prendrait ce besoin.
 *
 * ── L'ÉTIQUETTE RESTE À L'APPELANT ──────────────────────────────────────────
 *
 * HeroUI sait porter son propre libellé dans `Checkbox.Content`. On ne s'en sert pas :
 * l'appelant a déjà un `<label htmlFor>` avec sa propre troncature et ses propres états
 * de couleur. Rendre les deux poserait deux étiquettes pour une case.
 */
export function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: Omit<
  React.ComponentProps<typeof HeroCheckbox>,
  'isSelected' | 'defaultSelected' | 'onChange' | 'isDisabled' | 'children'
> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <HeroCheckbox
      data-slot="checkbox"
      className={cn('shrink-0', className)}
      {...(checked !== undefined ? { isSelected: checked } : {})}
      {...(defaultChecked !== undefined ? { defaultSelected: defaultChecked } : {})}
      {...(onCheckedChange ? { onChange: onCheckedChange } : {})}
      {...(disabled !== undefined ? { isDisabled: disabled } : {})}
      {...props}
    >
      <HeroCheckbox.Content>
        <HeroCheckbox.Control>
          <HeroCheckbox.Indicator />
        </HeroCheckbox.Control>
      </HeroCheckbox.Content>
    </HeroCheckbox>
  )
}
