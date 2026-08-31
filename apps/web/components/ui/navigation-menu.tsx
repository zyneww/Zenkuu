import * as React from "react"
import { cva } from "class-variance-authority"
import { ChevronDownIcon } from "lucide-react"
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-control bg-background px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent"
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        /* Les classes `data-[motion=…]` de shadcn faisaient GLISSER le contenu de
           cinquante-deux unités quand on passait d'un menu à l'autre. La référence n'a
           pas ce geste : ses huit panneaux sont des éléments distincts, positionnés
           chacun sous son propre bouton, et le passage de l'un à l'autre est une
           substitution — pas un déplacement. Retirées. */
        "top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",
        /* La variante SANS viewport, que ce site n'emploie pas aujourd'hui — la barre
           en rend un. Elle est alignée sur le viewport ci-dessous plutôt que laissée en
           arrière : mêmes rayon, ombre et absence d'animation, pour qu'un futur passage
           à `viewport={false}` n'y ramène pas le geste d'OKX par la porte de service. */
        "group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow-overlay **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div
      /*
        ── LE PANNEAU EST CENTRÉ SUR LA BARRE, ET NON COLLÉ À SON BORD GAUCHE ──

        `left-0` l'ancrait au bord gauche de la barre de menus : « Parcourir » ouvrait
        donc son panneau tout à gauche de l'écran, et « Plus » — dernier menu de la
        rangée — l'ouvrait au même endroit, à plusieurs centaines de pixels de son
        propre bouton. Le panneau paraissait sans rapport avec ce qu'on avait survolé.

        Centrer sur la BARRE (`left-1/2`) ne réglait qu'à moitié : le panneau s'ouvrait
        au même endroit pour tous les menus, donc sous le troisième bouton quel que soit
        celui qu'on survolait.

        Le point d'ancrage vient maintenant de `NavMenus`, qui publie le centre du
        bouton OUVERT dans `--nav-viewport-center` — déjà borné à la fenêtre là-bas.
        `50%` reste le repli tant qu'aucun menu n'a été ouvert, et `-translate-x-1/2`
        continue de faire grandir le panneau symétriquement quand il change de largeur.
      */
      className={cn(
        "absolute top-full left-[var(--nav-viewport-center,50%)] isolate z-50 flex -translate-x-1/2 justify-center"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          /* ── TROIS ÉCARTS AVEC LA RÉFÉRENCE, CORRIGÉS ICI ──────────────────────
           Relevé le 2026-08-31 sur leur menu de navigation déployé.

           · PLUS D'ANIMATION. `zoom-in-90` + `animate-in` jouaient l'entrée en 150 ms.
             Les leurs apparaissent d'un coup : 15 panneaux flottants mesurés sur leur
             accueil, tous à `transition-duration: 0s` et `animation-name: none`.
           · `shadow-overlay` ET NON `shadow`. Le `shadow` de shadcn ne résout aucune
             valeur dans cette configuration — le panneau était mesuré à
             `rgba(0, 0, 0, 0) 0px 0px 0px 0px`, c'est-à-dire SANS ombre du tout. Le
             jeton du site porte leur `shadow-lg`.
           · `rounded-md` (6 px) ET NON `rounded-control` (8 px), qui est le rayon de
             LEUR panneau de navigation. Le 8 px reste le rayon le plus courant de leur
             feuille de style, d'où le jeton inchangé : c'est ce panneau-ci qui diffère.

           Le geste retiré venait d'OKX, comme la palette sombre venait de Dropstab et
           l'ombre des panneaux flottants — dernier de la série. */
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-overlay md:w-[var(--radix-navigation-menu-viewport-width)]",
          className
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground data-[active=true]:hover:bg-accent data-[active=true]:focus:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in",
        className
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
