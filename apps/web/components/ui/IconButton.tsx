'use client'

import { isValidElement, type ComponentProps, type ComponentType, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * BOUTON D'ICÔNE — un carré, un pictogramme, et le mot qui va avec.
 *
 * ── POURQUOI CE COMPOSANT EXISTE PLUTÔT QUE L'ASSEMBLAGE À LA MAIN ───────────
 *
 * shadcn/ui sait déjà tout faire : `<Button variant="ghost" size="icon-sm">` donne le
 * carré, `<Tooltip><TooltipTrigger asChild>…` donne la bulle. Écrit sur place, cela
 * fait six lignes et quatre imports pour UN bouton — et le site en compte une
 * trentaine, dans des barres d'outils où ils s'alignent par quatre.
 *
 * Le coût de l'assemblage répété n'est pas la verbosité, c'est la DÉRIVE. Sur trente
 * occurrences écrites à la main, quelques-unes oublieront `asChild` (la bulle rendrait
 * alors un bouton dans un bouton, que le HTML interdit), quelques autres oublieront
 * `aria-label` — et un bouton dont le seul contenu est une icône sans étiquette est
 * MUET pour un lecteur d'écran. Ici, `label` est obligatoire par le type : on ne peut
 * pas rendre ce composant sans nommer ce qu'il fait.
 *
 * ── L'ÉTIQUETTE SERT DEUX FOIS, ET C'EST VOULU ──────────────────────────────
 *
 * Elle devient `aria-label` — donc lue à voix haute — ET le texte de la bulle quand
 * `tooltip` n'est pas fourni. Les deux disent la même chose parce qu'ils répondent à
 * la même question : « que fait ce bouton ? ». Les séparer produirait deux libellés à
 * maintenir pour une seule intention, et c'est exactement ainsi qu'ils divergent.
 *
 * `tooltip={false}` coupe la bulle sans toucher à l'étiquette : c'est le cas des
 * boutons posés dans un menu déjà ouvert, où une bulle par ligne survolée devient du
 * bruit.
 */
export function IconButton({
  icon: Icon,
  label,
  tooltip,
  side = 'top',
  variant = 'ghost',
  size = 'icon-sm',
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, 'size' | 'children'> & {
  /** Le pictogramme. Composant (`icon={Search}`) ou nœud déjà rendu (`icon={<Star …/>}`). */
  icon: ComponentType<{ className?: string }> | ReactNode
  /** Ce que fait le bouton, en toutes lettres. Obligatoire : voir l'en-tête. */
  label: string
  /** Texte de la bulle. Par défaut `label` ; `false` pour n'en afficher aucune. */
  tooltip?: string | false
  side?: ComponentProps<typeof Tooltip.Content>['placement']
  size?: 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg'
}) {
  /*
   * ⚠️ LE TEST PORTE SUR « EST-CE DÉJÀ UN ÉLÉMENT ? », JAMAIS SUR `typeof`.
   *
   * Le réflexe — `typeof Icon === 'function' ? <Icon /> : Icon` — est FAUX, et il a
   * cassé la barre de navigation avant d'être corrigé. Les icônes de `lucide-react`
   * ne sont pas des fonctions : ce sont des `forwardRef`, c'est-à-dire des OBJETS
   * `{ $$typeof, render }`. Le test les prenait donc pour des nœuds déjà rendus et
   * les passait telles quelles à React, qui lève « Objects are not valid as a React
   * child ».
   *
   * `isValidElement` répond exactement à la question posée : ce que l'appelant a
   * fourni est-il un `<Star />` prêt à poser, ou une CHOSE À INSTANCIER — fonction,
   * `forwardRef` ou `memo`, peu importe laquelle. Les trois passent alors par la
   * même branche.
   *
   * La conversion de type sur la branche « à instancier » est le prix de l'union :
   * `isValidElement` restreint le cas VRAI, pas le cas faux — `ReactNode` couvre
   * aussi les chaînes et les nombres, que TypeScript refuse en position de balise.
   * Ils n'ont jamais de sens comme icône, et le type d'entrée les décourage déjà.
   */
  const button = (
    <Button
      type="button"
      aria-label={label}
      variant={variant}
      size={size}
      className={cn('shrink-0', className)}
      {...props}
    >
      {isValidElement(Icon) ? Icon : renderIcon(Icon)}
    </Button>
  )

  if (tooltip === false) return button

  return (
    <Tooltip>
      {/* ⚠️ PLUS DE `asChild`, ET LE PIÈGE QU'IL DÉSAMORÇAIT A DISPARU AVEC LUI.
          Radix rendait son PROPRE `<button>` autour du nôtre sans cet attribut : deux
          boutons imbriqués, HTML invalide, que le navigateur remonte en frères — la
          mise en page cassait sans qu'aucune erreur ne soit levée.
          `Tooltip.Trigger` de HeroUI accroche directement son enfant. */}
      <Tooltip.Trigger>{button}</Tooltip.Trigger>
      <Tooltip.Content placement={side}>{tooltip ?? label}</Tooltip.Content>
    </Tooltip>
  )
}

/** Instancie un pictogramme fourni sous forme de composant. Voir la note ci-dessus. */
function renderIcon(Icon: unknown) {
  const Component = Icon as ComponentType<{ className?: string }>
  return <Component />
}
