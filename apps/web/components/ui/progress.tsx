'use client'

import { ProgressBar } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * JAUGE DE PROGRESSION — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI NE CHANGE PAS, ET C'EST L'ESSENTIEL ───────────────────────────────
 *
 * Le rôle ARIA. `AssetSupply` porte une longue note expliquant ce que la jauge a
 * apporté à un `<div>` dont on poussait la largeur : `role="progressbar"` avec
 * `aria-valuenow`, `aria-valuemin` et `aria-valuemax`, si bien qu'une synthèse vocale
 * annonce « 62 %, barre de progression » au lieu de lire une image. HeroUI rend
 * exactement ces attributs — c'est la même garantie, par une autre bibliothèque.
 *
 * ── CE QUE HEROUI AJOUTE ─────────────────────────────────────────────────────
 *
 * `isIndeterminate`, pour une attente dont on ne connaît pas la durée. La version
 * Radix ne l'exposait pas, et les rares endroits qui en auraient eu besoin
 * affichaient donc une barre figée à zéro, c'est-à-dire un chiffre faux (§5).
 *
 * ── L'API PUBLIQUE EST PRÉSERVÉE, `indicatorClassName` COMPRIS ───────────────
 *
 * C'est ce qui permet de ne toucher aucun appelant. `AssetSupply` colore son
 * remplissage en menthe ou en gris selon ce qu'il mesure, et continue de le faire par
 * cette même propriété — HeroUI la reçoit sur `ProgressBar.Fill`.
 *
 * ⚠️ `value` RESTE EN POURCENTAGE. HeroUI accepte une échelle libre par `maxValue` ;
 * on ne l'expose pas, parce que tous les appelants passent déjà un pourcentage et
 * qu'ouvrir l'échelle inviterait à mélanger les deux conventions dans le même site.
 */
export function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: Omit<React.ComponentProps<typeof ProgressBar>, 'children'> & {
  /** Classes du REMPLISSAGE — la piste, elle, se style par `className`. */
  indicatorClassName?: string
}) {
  return (
    <ProgressBar
      data-slot="progress"
      value={value}
      className={cn('relative block h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <ProgressBar.Track className="h-full w-full bg-transparent">
        <ProgressBar.Fill
          className={cn('h-full rounded-full transition-[width]', indicatorClassName)}
        />
      </ProgressBar.Track>
    </ProgressBar>
  )
}
