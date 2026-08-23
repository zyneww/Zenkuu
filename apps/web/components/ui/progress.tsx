"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * ⚠️ ÉCART ASSUMÉ AVEC LE REGISTRE SHADCN/UI — `indicatorClassName`.
 *
 * La barre d'origine est toujours menthe (`bg-primary`). Zenkuu en a besoin dans
 * plusieurs teintes, et pas par goût : deux jauges superposées — l'offre émise et
 * l'offre en circulation — doivent se distinguer, et la doctrine de l'accent
 * (globals.css) interdit de leur donner deux COULEURS puisqu'aucune des deux ne
 * mesure un mouvement de marché. Elles se distinguent donc par leur place dans la
 * rampe : la menthe pour celle qu'on lit d'abord, l'encre atténuée pour l'autre.
 *
 * `className` ne peut pas servir à cela : il atteint la PISTE, pas le remplissage.
 * À reporter si ce fichier est régénéré par `shadcn add progress --overwrite`.
 */
function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
