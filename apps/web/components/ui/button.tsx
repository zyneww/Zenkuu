import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Rembourrage horizontal aligné sur la mesure CoinGecko (--v2-space-4, 10px).
        // Hauteur h-9 (36px) volontairement conservée : DESIGN.md impose 32px de
        // cible tactile minimum, or 13px de texte + 6px de rembourrage vertical
        // (mesuré chez CoinGecko) donnerait ~31px. Voir DESIGN_SYSTEM.md pour la note.
        // Rembourrage vertical laissé en py-2 : sans effet réel puisque h-9 fixe la
        // hauteur, mais gardé pour que le code reste lisible en isolation (ex. flex-wrap).
        /* ── LES TROIS VALEURS SONT MESURÉES ──────────────────────────────────
           Relevé le 2026-08-31 sur le bouton d'action de la référence : 36 px de
           haut, rembourrage 8px 16px, texte 14px/600, rayon 8px.

           `h-9` valait déjà 36 px et `rounded-control` 8 px — les deux coïncidaient.
           Ce qui ne coïncidait pas : le texte en `text-xs` (13 px chez ZENKUU) et le
           rembourrage horizontal à `--v2-space-4` (10 px). Un bouton plus étroit de
           douze pixels et d'un cran de corps se lit comme un bouton secondaire à côté
           du leur.

           `px-4` vaut les 16 px mesurés ; `text-sm` les 14. La graisse 600 vient déjà
           de `font-semibold`, posé sur la base du composant. */
        default: "h-9 px-4 py-2 text-sm has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-control px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-control px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-control px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-control [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
