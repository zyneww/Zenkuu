import type { ReactNode } from 'react'

/**
 * INTITULÉ DE FAMILLE — au-dessus de la carte, jamais dedans.
 *
 * ── CE QU'IL FAIT, ET CE QU'IL NE REMPLACE PAS ──────────────────────────────
 *
 * Chez la référence, chaque carte est précédée d'un intitulé posé HORS de son cadre
 * — « Emission Analysis », « Buyback Analysis », « Post-Unlocks Analysis » — en 13 px
 * atténués. Ce n'est pas le titre de la carte : celle-ci porte le sien à l'intérieur,
 * en pleine encre. C'est le nom de la FAMILLE à laquelle elle appartient.
 *
 * Le doublon est voulu et c'est lui qui rend la page parcourable. Une colonne de six
 * cartes se lit en diagonale par ses intitulés extérieurs — on saute ce qu'on ne
 * cherche pas sans avoir à entrer dans le cadre ; les titres intérieurs, eux, ne se
 * lisent qu'une fois qu'on s'est arrêté. Supprimer l'un des deux niveaux fait perdre
 * l'une des deux lectures.
 *
 * ── POURQUOI ATTÉNUÉ, ALORS QUE C'EST UN TITRE ──────────────────────────────
 *
 * Parce qu'il ne doit pas concurrencer ce qu'il annonce. Posé en pleine encre, il
 * pèse autant que le titre de la carte située quinze pixels plus bas, et l'œil ne
 * sait plus lequel des deux nomme quoi. `ink-muted` vaut 8,4:1 sur le canevas sombre
 * et 4,8:1 sur le clair — au-dessus du seuil AA dans les deux thèmes, donc atténué
 * sans être affaibli.
 *
 * Le niveau de titre est un `h2` : la hiérarchie du document reste correcte quel que
 * soit le poids visuel, et un lecteur d'écran énumère bien les familles de la page.
 */
export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-normal text-ink-muted">{children}</h2>
      {action}
    </div>
  )
}
