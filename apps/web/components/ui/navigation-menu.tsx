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

        Le point d'ancrage vient de `NavMenus`, qui publie le BORD GAUCHE du bouton
        ouvert dans `--nav-viewport-center` — déjà borné à la fenêtre là-bas.

        ⚠️ PLUS DE `-translate-x-1/2`. Il servait à centrer le panneau sur ce point ;
        la variable porte désormais un bord gauche, et le décalage de moitié
        ramènerait le panneau 320 px à gauche du bouton. Le nom de la variable est
        resté par compatibilité — le renommer imposerait de toucher les deux fichiers
        pour un gain nul.
      */
      className={cn(
        "absolute top-full left-[var(--nav-viewport-center,50%)] isolate z-50 flex justify-start"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          /* ── TROIS ÉCARTS AVEC LA RÉFÉRENCE, CORRIGÉS ICI ──────────────────────
           Relevé le 2026-08-31 sur leur menu de navigation déployé.

           · L'ANIMATION EST REVENUE, PARCE QUE LA RÉFÉRENCE A CHANGÉ.

             Cette note disait « PLUS D'ANIMATION », et elle avait raison CONTRE
             COINGECKO : 15 panneaux flottants mesurés sur leur accueil, tous à
             `transition-duration: 0s` et `animation-name: none`. Ils apparaissent
             d'un coup.

             La référence des menus est désormais ASXN / Blockworks, dont l'ouverture
             est douce. Le constat de 2026-08-31 reste vrai de CoinGecko ; il ne
             décrit plus ce que ce panneau doit faire.

             ⚠️ CE N'EST PAS LE `zoom-in-90` RETIRÉ À L'ÉPOQUE. Un agrandissement fait
             GRANDIR la boîte pendant l'entrée, ce qui déplace le texte sous le
             curseur — on vise un lien, il bouge, on clique à côté. Le geste retenu est
             une opacité plus une translation verticale de 4 px : le panneau glisse
             depuis le bouton, sa largeur ne varie jamais.

             ⚠️ ET LES DEUX RÉFÉRENCES N'ONT PAS PU ÊTRE MESURÉES. Leurs menus ne
             s'ouvrent sous aucune automatisation — quatre tentatives, deux sites. La
             durée et la courbe sont donc celles du PROJET (`--duration-state`,
             `--ease-standard`), dont le pied de page a déjà établi qu'elles valent le
             `0.15s cubic-bezier(0.4, 0, 0.2, 1)` relevé chez ASXN. C'est une
             correspondance vérifiée ailleurs, pas un relevé de ce panneau-ci.
           · `shadow-overlay` ET NON `shadow`. Le `shadow` de shadcn ne résout aucune
             valeur dans cette configuration — le panneau était mesuré à
             `rgba(0, 0, 0, 0) 0px 0px 0px 0px`, c'est-à-dire SANS ombre du tout. Le
             jeton du site porte leur `shadow-lg`.
           · `rounded-md` (6 px) ET NON `rounded-control` (8 px), qui est le rayon de
             LEUR panneau de navigation. Le 8 px reste le rayon le plus courant de leur
             feuille de style, d'où le jeton inchangé : c'est ce panneau-ci qui diffère.

           Le geste retiré venait d'OKX, comme la palette sombre venait de Dropstab et
           l'ombre des panneaux flottants — dernier de la série. */
        "origin-top-left relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-overlay md:w-[var(--radix-navigation-menu-viewport-width)]",
          /* L'entrée : opacité et 4 px de glissement vertical, jamais la taille.
             `motion-reduce:animate-none` — un panneau qui glisse est exactement ce
             qu'un utilisateur sensible au mouvement demande à ne pas voir, et il n'a
             rien à y perdre : le panneau apparaît, simplement. */
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:duration-150 data-[state=closed]:duration-100 motion-reduce:animate-none",
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
