import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * ⚠️ ÉCART ASSUMÉ AVEC LE REGISTRE SHADCN/UI — une échelle de tailles sur `Input`.
 *
 * Le composant d'origine n'en a qu'une, `h-9`, et c'est le bon réglage pour un
 * formulaire de page. Zenkuu a besoin des trois, et pas par goût :
 *
 *   · `sm` (h-8)  la barre d'outils d'un tableau, où le champ de filtre s'aligne sur
 *                 des boutons `size="sm"` — un pixel d'écart se voit dans une rangée
 *                 de six contrôles ;
 *   · `default`   le cas courant ;
 *   · `lg` (h-10) le champ de recherche du centre d'aide et le montant du
 *                 convertisseur, qui sont le SUJET de leur page et non un filtre.
 *
 * Sans cette échelle, chaque appelant écrirait `className="h-8"` — vingt-quatre fois,
 * avec le `text-sm` et le `px-2.5` qui vont avec, et la première divergence au premier
 * ajustement. `buttonVariants` fait déjà exactement cela pour les boutons ; c'est la
 * même mécanique, appliquée au même besoin.
 *
 * À reporter si ce fichier est régénéré par `shadcn add input --overwrite`.
 */
const inputVariants = cva(
  cn(
    "w-full min-w-0 rounded-control border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
  ),
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 py-1 text-sm file:h-6 file:text-xs",
        default: "h-9 px-3 py-1 text-base file:h-7 file:text-sm md:text-sm",
        lg: "h-10 px-3.5 py-2 text-base file:h-7 file:text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size ?? "default"}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
