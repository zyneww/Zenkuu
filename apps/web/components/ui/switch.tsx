'use client'

import { Switch as HeroSwitch } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * INTERRUPTEUR — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── AUCUN APPELANT AUJOURD'HUI, ET C'EST CE QUI REND LA BASCULE SÛRE ─────────
 *
 * Son unique consommateur était le formulaire d'alerte de prix, parti avec la
 * fonctionnalité. La primitive reste dans le kit — un interrupteur resservira — et
 * c'est justement la bonne fenêtre pour la reprendre : rien ne peut régresser à
 * l'écran puisque rien ne la rend.
 *
 * ⚠️ CE QUE CETTE BASCULE A DÉBLOQUÉ AU PASSAGE. La version Radix ne pouvait pas être
 * reprise tant que ce formulaire existait : il l'enveloppait dans un
 * `<CollapsibleTrigger asChild>`, contrat de composition propre à Radix que HeroUI ne
 * remplit pas. C'était la raison documentée de son report.
 *
 * ── LA TRADUCTION DES NOMS ───────────────────────────────────────────────────
 *
 *   checked          →  isSelected
 *   defaultChecked   →  defaultSelected
 *   onCheckedChange  →  onChange   (les deux livrent un booléen)
 *   disabled         →  isDisabled
 *   size="default"   →  size="md"
 *
 * ── LA STRUCTURE COMPOSÉE EST MASQUÉE AUX APPELANTS ──────────────────────────
 *
 * ⚠️ CE FICHIER A LONGTEMPS RENDU UN INTERRUPTEUR QUI NE S'ACTIONNAIT PAS, et sa note
 * disait pourquoi sans le voir : elle annonçait que HeroUI attendait
 * `<Switch><Switch.Control><Switch.Thumb/></Switch.Control></Switch>`. Il en attend
 * QUATRE niveaux, et celui qui manquait est précisément le seul interactif.
 *
 *   `Switch`          → `SwitchField`, un simple `<div>` conteneur ;
 *   `Switch.Content`  → `SwitchButton`, le `<label>` QUI PORTE LA CASE À COCHER cachée ;
 *   `Switch.Control`  → un `<span>` décoratif — la piste ;
 *   `Switch.Thumb`    → un `<span>` décoratif — le curseur.
 *
 * Sans `Switch.Content`, l'arbre rendu ne contenait AUCUN `<input>` : un dessin
 * d'interrupteur, correctement teinté par `isSelected`, sur lequel le clic ne
 * produisait rien. Relevé au navigateur sur le réglage « Apparence », dont la bascule
 * de thème était donc inopérante (`document.documentElement.className` inchangé,
 * `zenkuu-theme` jamais écrit).
 *
 * ── `children` VA DANS LE LABEL, ET C'EST CE QUI REND LA LIGNE CLIQUABLE ──────
 *
 * Un appelant qui passe un libellé le voit rendu DANS `Switch.Content`, c'est-à-dire
 * dans le `<label>` de la primitive. Toute la ligne devient donc cliquable sans qu'un
 * second `<label>` soit nécessaire autour — motif qui produisait du HTML invalide
 * (label dans label) et un double basculement. Sans `children`, seule la piste est
 * rendue : le comportement d'origine.
 */
export function Switch({
  className,
  contentClassName,
  size = 'default',
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof HeroSwitch>,
  'size' | 'isSelected' | 'defaultSelected' | 'onChange' | 'isDisabled' | 'children'
> & {
  /** `default` est le nom shadcn de la taille moyenne. */
  size?: 'sm' | 'default' | 'lg'
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  /** Libellé rendu DANS le label de la primitive — voir la note ci-dessus. */
  children?: React.ReactNode
  /** Classes de ce label. C'est lui qui dessine la ligne cliquable, pas la racine. */
  contentClassName?: string
}) {
  return (
    <HeroSwitch
      data-slot="switch"
      size={size === 'default' ? 'md' : size}
      className={cn('shrink-0', className)}
      {...(checked !== undefined ? { isSelected: checked } : {})}
      {...(defaultChecked !== undefined ? { defaultSelected: defaultChecked } : {})}
      {...(onCheckedChange ? { onChange: onCheckedChange } : {})}
      {...(disabled !== undefined ? { isDisabled: disabled } : {})}
      {...props}
    >
      <HeroSwitch.Content className={contentClassName}>
        {children}
        <HeroSwitch.Control>
          <HeroSwitch.Thumb />
        </HeroSwitch.Control>
      </HeroSwitch.Content>
    </HeroSwitch>
  )
}
