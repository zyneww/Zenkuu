import { Chip } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PASTILLE — REPOSE DÉSORMAIS SUR LE `Chip` DE HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Quatre appelants : le compte social, les deux menus de navigation, et la liste de
 * résultats de recherche. Tous passent `variant="secondary"` et affinent la taille par
 * `className` — ce sont des étiquettes de classement (« Crypto », « Action »), jamais
 * des compteurs ni des états.
 *
 * ── LA TRADUCTION DES VARIANTES, ET CE QU'ELLE RÉVÈLE ────────────────────────
 *
 * Le vocabulaire de shadcn décrit une INTENSITÉ (`default`, `secondary`, `outline`,
 * `ghost`) ; celui de HeroUI sépare la COULEUR (`color`) de la FORME (`variant`). La
 * table ci-dessous fait le pont, et elle a une conséquence agréable : `destructive`
 * devient `color="danger"`, c'est-à-dire une couleur nommée plutôt qu'un mot qui
 * décrivait l'intention supposée de l'appelant.
 *
 * ⚠️ `link` N'A PAS D'ÉQUIVALENT et n'en a jamais eu besoin : une pastille qui se
 * souligne au survol est un lien déguisé en étiquette, et aucun appelant ne l'employait.
 * Elle est repliée sur `tertiary`, la forme la plus discrète de HeroUI.
 *
 * ── DEUX EXPORTS ONT DISPARU AVEC LEUR MOTIF ────────────────────────────────
 *
 * `badgeVariants` (la fabrique `cva`) et `asChild` n'ont AUCUN consommateur dans le
 * dépôt — vérifié sur `components/` et `app/`. Les conserver « au cas où » aurait figé
 * le vocabulaire de shadcn dans un fichier qui vient précisément d'en changer, et
 * `badgeVariants` en particulier n'aurait plus produit que des classes vides, puisque
 * l'apparence vient désormais des classes BEM de HeroUI. Un export qui ment sur ce
 * qu'il fait est pire qu'un export absent.
 */

/** Couleur et forme HeroUI pour chaque variante héritée de shadcn. */
const CHIP_LOOK = {
  default: { color: 'accent', variant: 'primary' },
  secondary: { color: 'default', variant: 'secondary' },
  destructive: { color: 'danger', variant: 'primary' },
  outline: { color: 'default', variant: 'tertiary' },
  ghost: { color: 'default', variant: 'tertiary' },
  link: { color: 'accent', variant: 'tertiary' },
} as const

export type BadgeVariant = keyof typeof CHIP_LOOK

export function Badge({
  className,
  variant = 'default',
  ...props
}: Omit<React.ComponentProps<typeof Chip>, 'color' | 'variant'> & {
  variant?: BadgeVariant
}) {
  const look = CHIP_LOOK[variant]

  /*
   * ⚠️ PAS DE `data-slot="badge"` ICI — IL SERAIT SILENCIEUSEMENT PERDU.
   *
   * Les composants shadcn en posaient un sur chaque primitive, et certaines feuilles
   * s'en servent comme crochet de style (`[data-slot=…]`). `Chip` ne transmet pas les
   * attributs `data-*` inconnus à son nœud racine : vérifié au navigateur, l'attribut
   * n'apparaît pas dans le DOM rendu.
   *
   * L'écrire quand même aurait été le pire des cas — un crochet de style qui a l'air
   * d'exister dans le code et qui n'accroche rien à l'écran. Aucune règle du dépôt ne
   * vise `[data-slot=badge]` (vérifié sur `globals.css`, `components/` et `app/`), il
   * n'y a donc rien à remplacer. Pour cibler ces pastilles, utiliser `.chip`, la classe
   * BEM que HeroUI garantit.
   */
  return (
    <Chip
      color={look.color}
      variant={look.variant}
      size="sm"
      className={cn('whitespace-nowrap', className)}
      {...props}
    />
  )
}
