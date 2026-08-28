import { Kbd as HeroKbd } from '@heroui/react'

import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TOUCHE DE CLAVIER — REPOSE DÉSORMAIS SUR HEROUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elle sert à deux endroits : le raccourci « Ctrl + K » de la barre de recherche, et
 * la touche « Échap » du panneau de recherche ouvert.
 *
 * ── CE QUE LA REPRISE CORRIGE ────────────────────────────────────────────────
 *
 * L'ancienne version portait une règle de style conditionnelle à un ANCÊTRE :
 * `[[data-slot=tooltip-content]_&]:bg-background/20`, c'est-à-dire « si je suis dans
 * une infobulle, inverse-toi ». C'est un couplage à distance entre deux composants qui
 * ne se connaissent pas, et il se serait périmé silencieusement le jour où l'infobulle
 * change de `data-slot`. HeroUI expose la même intention par une VARIANTE
 * (`variant="light"`), qui se demande à l'endroit où on l'emploie.
 *
 * ── LA STRUCTURE COMPOSÉE EST MASQUÉE AUX APPELANTS ──────────────────────────
 *
 * HeroUI attend `<Kbd><Kbd.Content>K</Kbd.Content></Kbd>`. Les deux appelants du site
 * écrivent `<Kbd>Échap</Kbd>`, et il n'y a aucune raison de les réécrire : l'enfant est
 * enveloppé ici. Un appelant qui a besoin de l'abréviation accessible (`Kbd.Abbr`,
 * pour « ⌘ » qu'un lecteur d'écran doit annoncer « Commande ») peut toujours composer
 * lui-même en important depuis `@heroui/react`.
 */
export function Kbd({
  className,
  children,
  ...props
}: React.ComponentProps<typeof HeroKbd>) {
  return (
    <HeroKbd
      data-slot="kbd"
      /*
       * ⚠️ LA COULEUR DU TEXTE EST IMPOSÉE ICI, ET IL LE FAUT.
       *
       * La feuille de HeroUI écrit `background-color: var(--default)` et
       * `color: var(--color-muted)`. Chez HeroUI, `muted` est une couleur de TEXTE ;
       * chez nous — convention shadcn, voir `globals.css` — `--color-muted` vaut
       * `--color-surface-muted`, une couleur de FOND. Les deux variables tombaient
       * donc sur la même teinte : la touche était un galet vide, dans les deux
       * thèmes. Mesuré au navigateur : `color` et `background-color` à
       * `rgb(241,245,249)`.
       *
       * On repasse par nos propres jetons, qui suivent le thème clair comme sombre.
       *
       * ⚠️ LA COULEUR EST ÉCRITE EN PROPRIÉTÉ ARBITRAIRE, ET CE N'EST PAS UN CAPRICE.
       *
       * Elle a d'abord été posée en `text-ink-muted`, et elle DISPARAISSAIT chez tout
       * appelant qui passait une taille de texte. `cn` est `tailwind-merge` : il
       * regroupe les classes par propriété CSS et ne garde que la dernière de chaque
       * groupe. Il sait que `text-[0.625rem]` est une taille — la valeur est une
       * longueur — mais `text-micro` est une classe ÉCRITE À LA MAIN dans
       * `globals.css`, absente du thème Tailwind : faute de mieux, il la range parmi
       * les couleurs de texte et évince `text-ink-muted` avec elle.
       *
       * Relevé au navigateur sur le raccourci « Ctrl + K » de l'en-tête : `color` à
       * `rgb(241,245,249)` — la couleur de HeroUI, revenue par la fenêtre — sur un
       * fond blanc. Rapport de contraste 1,06:1, c'est-à-dire une touche vide.
       *
       * `[color:…]` forme son propre groupe : aucune classe `text-*` ne peut plus
       * l'évincer par accident. Un appelant qui voudrait VRAIMENT une autre couleur
       * garde la main — il lui suffit de passer la sienne sous la même forme.
       */
      className={cn(
        'border border-border-subtle bg-surface-muted [color:var(--color-ink-muted)]',
        className,
      )}
      {...props}
    >
      <HeroKbd.Content>{children}</HeroKbd.Content>
    </HeroKbd>
  )
}

/**
 * Suite de touches — « Ctrl » puis « K ».
 *
 * Reste un simple conteneur : HeroUI n'a pas d'équivalent, et il n'y a rien à
 * apporter à un `inline-flex` de huit pixels de gouttière.
 */
export function KbdGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="kbd-group" className={cn('inline-flex items-center gap-1', className)} {...props} />
  )
}
