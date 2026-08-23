"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * ⚠️ ÉCART ASSUMÉ AVEC LE REGISTRE SHADCN/UI — `CommandDialog` transmet à `Command`.
 *
 * Le composant d'origine étale ses props sur le `Dialog` et rend un `Command` nu :
 * rien de ce qui configure cmdk ne peut donc l'atteindre. C'est bloquant ici pour une
 * seule prop, mais elle est décisive — `shouldFilter`. La recherche du site est faite
 * PAR LE SERVEUR ; laissé à sa valeur par défaut, le filtre intégré de cmdk retaillerait
 * une seconde fois des résultats déjà pertinents, sur une comparaison de chaînes qui
 * ne rapproche ni « btc » ni « Bitcoin ». La liste se viderait sur les requêtes les
 * plus courantes.
 *
 * `filter` et `loop` suivent le même chemin, pour ne pas avoir à rouvrir ce fichier à
 * la prochaine option. À reporter si `shadcn add command --overwrite` est rejoué.
 */
function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  shouldFilter,
  filter,
  loop,
  ...props
}: React.ComponentProps<typeof Dialog> &
  Pick<
    React.ComponentProps<typeof CommandPrimitive>,
    "shouldFilter" | "filter" | "loop"
  > & {
    title?: string
    description?: string
    className?: string
    showCloseButton?: boolean
  }) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn("overflow-hidden p-0", className)}
        showCloseButton={showCloseButton}
      >
        <Command
          shouldFilter={shouldFilter}
          filter={filter}
          loop={loop}
          className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/**
 * ⚠️ ÉCART ASSUMÉ AVEC LE REGISTRE SHADCN/UI — `wrapperClassName` sur `CommandInput`.
 *
 * Le composant d'origine écrit son conteneur en dur : `h-9`, `border-b`, une loupe et
 * l'espacement qui va avec. C'est le bon dessin dans une palette de commandes plein
 * écran, et le mauvais dans la barre de navigation, où le même champ doit tenir dans
 * une boîte de 36 pixels bordée sur ses quatre côtés — un `border-b` y trace un filet
 * en travers du champ, et la loupe s'ajoute à celle que la barre pose déjà.
 *
 * Les deux surfaces de recherche du site partagent la même liste de résultats et la
 * même mécanique (voir `SearchResults`) ; seule leur COQUE diffère. Une prop qui
 * atteint le conteneur est ce qui permet de garder un seul composant pour les deux —
 * l'alternative était de recopier `CommandPrimitive.Input` dans `HeaderSearch`, donc
 * de faire diverger deux champs qui doivent se comporter pareil.
 *
 * À reporter si ce fichier est régénéré par `shadcn add command --overwrite`.
 */
function CommandInput({
  className,
  wrapperClassName,
  hideIcon = false,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  wrapperClassName?: string
  /** Masque la loupe quand la coque en dessine déjà une. */
  hideIcon?: boolean
}) {
  return (
    <div
      data-slot="command-input-wrapper"
      className={cn(
        "flex h-9 items-center gap-2 border-b px-3",
        wrapperClassName
      )}
    >
      {hideIcon ? null : <SearchIcon className="size-4 shrink-0 opacity-50" />}
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
