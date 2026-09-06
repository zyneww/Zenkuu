"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        /*
         * ── LE CONTRÔLE SEGMENTÉ — PHASE 2 DE DESIGN_BACKPACK ──────────────
         *
         * Le rail de Backpack pour « Spot / Perp », « 1D / 7D / 1M » : une piste
         * arrondie complète, un fond encastré (L2), une capsule pleine sur l'onglet
         * actif.
         *
         * ── POURQUOI UNE VARIANTE ET NON UNE RETOUCHE DE `default` ─────────
         *
         * `default` sert des dizaines d'endroits du site. Le repeindre imposerait de
         * relire chacun d'eux pour vérifier qu'aucun ne s'appuyait sur l'apparence
         * précédente — un travail sans rapport avec ce qu'on veut obtenir.
         *
         * Une variante nouvelle ne touche personne : les appelants qui la veulent la
         * demandent, les autres ne bougent pas.
         *
         * `rounded-full` sur la piste ET sur la capsule : c'est le pôle « manipulable »
         * de l'échelle à deux pôles. Une piste arrondie et une capsule carrée à
         * l'intérieur laisseraient quatre coins de fond visibles aux extrémités.
         */
        segmented:
          "inline-flex w-auto gap-0 rounded-full border border-border-subtle bg-surface-muted p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-control border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        /* ── LE DÉCLENCHEUR SEGMENTÉ ────────────────────────────────────────
           `flex-none` : dans cette variante les onglets prennent la largeur de leur
           TEXTE. Le `flex-1` par défaut les étirerait à parts égales, et « 1D » aurait
           la même largeur que « Perpétuels » — un rail de sélecteurs de durée ferait
           alors toute la largeur de l'écran pour six caractères.

           `bg-surface-active` sur l'actif : c'est le premier consommateur du jeton L4,
           et donc ce qui lève l'élagage de Tailwind constaté en Phase 1. */
        "group-data-[variant=segmented]/tabs-list:flex-none group-data-[variant=segmented]/tabs-list:rounded-full group-data-[variant=segmented]/tabs-list:border-transparent group-data-[variant=segmented]/tabs-list:px-4 group-data-[variant=segmented]/tabs-list:text-xs group-data-[variant=segmented]/tabs-list:shadow-none group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-surface-active group-data-[variant=segmented]/tabs-list:data-[state=active]:text-ink group-data-[variant=segmented]/tabs-list:data-[state=active]:shadow-none dark:group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-surface-active dark:group-data-[variant=segmented]/tabs-list:data-[state=active]:border-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
