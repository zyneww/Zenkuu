import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UN BOUTON QUI EST UN LIEN — ET QUI RESTE LOCALISÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI LE `Button` DE SHADCN/UI NE SUFFIT PAS SEUL ────────────────────
 *
 * Il sait déjà se faire lien : `asChild` lui fait céder sa balise à son enfant, et
 * l'enfant reçoit les classes. C'est le mécanisme employé ici. Ce qu'il ne sait pas,
 * c'est QUEL lien — et c'est là que le projet a une contrainte que la bibliothèque
 * ignore. Zenkuu sert treize langues, et ses adresses sont préfixées par la locale
 * (`/fr/suivi`, `/en/suivi`). Ce préfixe est posé par le `Link` de `next-intl` ; un
 * `<a href="/suivi">` ordinaire sauterait dans la locale par défaut, et le lecteur
 * anglophone changerait de langue en cliquant sur « Voir ma sélection ».
 *
 * Ce composant est donc l'assemblage des deux, écrit une fois : le bouton de
 * shadcn/ui cède sa balise, le lien de next-intl la reprend avec sa localisation,
 * son préchargement et son comportement de navigation.
 *
 * ── CE QU'IL N'EMPRUNTE PAS ────────────────────────────────────────────────
 *
 * L'état désactivé et l'état de chargement restent au `Button` : un lien ne charge
 * pas et ne se désactive pas — il mène ailleurs ou il n'existe pas. Un lien
 * « désactivé » est un piège d'accessibilité, pas un état.
 *
 * ── POURQUOI PLUS DE `'use client'` ────────────────────────────────────────
 *
 * L'ancienne version en portait une, et la note qui l'accompagnait valait d'être
 * lue : elle empruntait une TABLE DE CLASSES exportée par un module marqué
 * `'use client'`, et un tel export vaut `undefined` vu depuis un composant serveur —
 * Next ne transmet alors qu'une référence client où seuls les composants sont
 * adressés. La panne se manifestait à l'exécution, pas à la compilation.
 *
 * Le `Button` de shadcn/ui n'a pas de directive : c'est un composant sans état, qui
 * se rend côté serveur comme n'importe quel autre. La frontière disparaît avec la
 * cause, et ces boutons-liens cessent d'être des îlots clients.
 */
export function ButtonLink({
  href,
  variant = 'default',
  size = 'default',
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, 'className'> &
  Pick<ComponentProps<typeof Button>, 'variant' | 'size'> & {
    className?: string
    children: ReactNode
  }) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={href} {...props}>
        {children}
      </Link>
    </Button>
  )
}
