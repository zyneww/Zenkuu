'use client'

import { Slider as HeroSlider } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CURSEUR — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Deux appelants : l'année observée de l'explorateur macro, et les seuils du screener.
 * Tous deux passent un tableau à un seul élément — le curseur du site est TOUJOURS à une
 * poignée, jamais une plage.
 *
 * ── POURQUOI LA MIGRATION TIENT ICI, ALORS QU'ELLE A ÉCHOUÉ SUR L'INFOBULLE ──
 *
 * `Tooltip` expose ses parties (`Trigger`, `Content`) AUX APPELANTS : les envelopper
 * chacune dans un composant maison casse la reconnaissance que HeroUI fait de ses
 * propres enfants, et la bulle ne s'ouvre jamais — constaté au navigateur, puis annulé.
 *
 * Le curseur, lui, n'expose qu'UN composant à ses appelants. Ses parties (`Track`,
 * `Fill`, `Thumb`) sont composées ICI, entre les mains de HeroUI, jamais enveloppées.
 * C'est la règle qui décide si une primitive composée est reprenable sans toucher aux
 * appelants — et elle vaut pour toutes les autres.
 *
 * ── LA TRADUCTION DES NOMS ───────────────────────────────────────────────────
 *
 *   min / max        →  minValue / maxValue
 *   onValueChange    →  onChange
 *   value={[n]}      →  value={[n]}   (inchangé : les deux acceptent un tableau)
 *
 * ⚠️ `formatOptions` N'EST PAS TRANSMIS, ET C'EST VOULU. Les deux appelants affichent
 * eux-mêmes la valeur au-dessus du curseur, mise en forme par leurs soins — l'un en
 * année, l'autre en seuil de filtre. `Slider.Output` n'est donc pas rendu : un second
 * affichage, formaté autrement, dirait deux fois la même chose de deux façons. La note
 * de `MacroExplorer` raconte le défaut que cela avait déjà produit (« 202 400 % »).
 */
export function Slider({
  className,
  min,
  max,
  step,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<typeof HeroSlider>,
  'minValue' | 'maxValue' | 'onChange' | 'children'
> & {
  /** Noms Radix de `minValue` / `maxValue`. */
  min?: number
  max?: number
  /** Nom Radix de `onChange`. Reçoit toujours un tableau — voir l'en-tête. */
  onValueChange?: (value: number[]) => void
}) {
  return (
    <HeroSlider
      className={cn('w-full', className)}
      {...(min !== undefined ? { minValue: min } : {})}
      {...(max !== undefined ? { maxValue: max } : {})}
      {...(step !== undefined ? { step } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onValueChange
        ? {
            /* HeroUI livre `number` pour une poignée et `number[]` pour plusieurs ; les
               appelants du site déstructurent toujours un tableau (`([next]) => …`). On
               normalise donc ici, plutôt que de laisser chaque appelant deviner lequel
               des deux il va recevoir. */
            onChange: (next: number | number[]) =>
              onValueChange(Array.isArray(next) ? next : [next]),
          }
        : {})}
      {...props}
    >
      <HeroSlider.Track>
        <HeroSlider.Fill />
        <HeroSlider.Thumb />
      </HeroSlider.Track>
    </HeroSlider>
  )
}
