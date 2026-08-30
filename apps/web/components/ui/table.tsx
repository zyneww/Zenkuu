"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * ⚠️ ÉCART ASSUMÉ AVEC LE REGISTRE SHADCN/UI — `containerClassName`.
 *
 * Le conteneur de défilement est écrit en dur : `relative w-full overflow-x-auto`.
 * C'est le bon réglage par défaut, et il entre en conflit avec deux tableaux du site
 * pour une raison qui a coûté un défaut visible :
 *
 * Le classement principal porte un EN-TÊTE COLLANT (`sticky`), et un élément collant
 * se cale sur son plus proche ancêtre DÉFILANT. Un `overflow-x-auto` inconditionnel
 * en fait cet ancêtre, et l'en-tête se pose alors en travers de la première ligne au
 * lieu de rester sous celui du site. `MarketTable` limite donc son défilement aux
 * fenêtres étroites (`@max-[789px]:overflow-x-auto`), là où le collage n'a de toute
 * façon plus d'intérêt.
 *
 * Cette prop laisse ces tableaux poser leur propre règle sans reconstruire le
 * `<table>` à la main. À reporter si ce fichier est régénéré.
 */
function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-surface-hover has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-[var(--v2-space-1)] py-[var(--v2-space-5)] text-left align-middle text-[length:var(--v2-text-2xs)] font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-[var(--v2-space-1)] py-[var(--v2-space-4)] align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
