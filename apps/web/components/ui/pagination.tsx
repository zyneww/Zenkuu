import { usePhrase } from '@/components/locale/ContentProvider'
import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { buttonVariants, type Button } from "@/components/ui/button"

/**
 * ⚠️ ÉCART ASSUMÉ AVEC LE REGISTRE SHADCN/UI — `asChild` sur `PaginationLink`.
 *
 * Le composant d'origine rend un `<a>` en dur, ce qui suppose deux choses que Zenkuu
 * ne peut pas tenir. D'abord que chaque page a une URL : c'est vrai des classements,
 * faux des listes triées en mémoire, où la cible est un `onClick` et où un `<a>` sans
 * `href` sortirait de l'ordre de tabulation sans l'annoncer. Ensuite que l'adresse
 * s'écrit telle quelle : le site sert treize langues et préfixe ses chemins par la
 * locale, ce que seul le `Link` de next-intl sait faire.
 *
 * `asChild` — le même mécanisme que `Button`, la même dépendance déjà présente —
 * laisse l'appelant fournir la balise sans recopier les classes. Voir
 * `TablePagination.tsx`, qui s'en sert pour rendre tantôt un `<button>`, tantôt le
 * `Link` localisé.
 *
 * À reporter si ce fichier est régénéré par `shadcn add pagination --overwrite`.
 */

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  const t = usePhrase()

  return (
    <nav
      role="navigation"
      aria-label={t('Pagination')}
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  asChild?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  asChild = false,
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : "a"

  return (
    <Comp
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const t = usePhrase()

  return (
    <PaginationLink
      aria-label={t('Page précédente')}
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">{t('Précédent')}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const t = usePhrase()

  return (
    <PaginationLink
      aria-label={t('Page suivante')}
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">{t('Suivant')}</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const t = usePhrase()

  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">{t('Autres pages')}</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
