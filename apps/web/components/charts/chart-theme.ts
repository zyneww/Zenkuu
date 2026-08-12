/**
 * Vocabulaire commun des graphiques.
 *
 * Toutes les valeurs pointent vers des JETONS CSS plutôt que vers des couleurs
 * écrites en dur. C'est ce qui permet aux graphiques de suivre la bascule de thème
 * sans qu'aucun composant ne s'en préoccupe : le tracé reçoit la chaîne
 * `var(--color-data-1)`, que le navigateur résout à la peinture. Une couleur figée
 * exigerait au contraire de lire le thème en JavaScript, puis de re-rendre à chaque
 * bascule — et de gérer l'instant où le thème n'est pas encore connu.
 *
 * Ce fichier a MAIGRI avec le retrait de `recharts` : les styles d'infobulle, de
 * graduation et de marge n'étaient que des objets de configuration destinés à cette
 * bibliothèque. Le tracé maison (`AreaPlot`) les porte désormais dans ses classes
 * utilitaires et ses constantes internes, où ils sont lisibles à côté de ce qu'ils
 * habillent. Ne subsistent ici que les valeurs réellement PARTAGÉES entre plusieurs
 * composants.
 */

/** Six teintes de séries, ordonnées par distance perceptuelle (cf. globals.css). */
export const DATA_COLORS = [
  'var(--color-data-1)',
  'var(--color-data-2)',
  'var(--color-data-3)',
  'var(--color-data-4)',
  'var(--color-data-5)',
  'var(--color-data-6)',
] as const

export function dataColor(index: number): string {
  return DATA_COLORS[index % DATA_COLORS.length] as string
}

/**
 * Grille : l'encre à 8 %, relevé sur la référence.
 *
 * Un mélange plutôt qu'un jeton propre, et c'est délibéré : la grille doit être une
 * atténuation du FOND, pas une couleur en soi. À 8 % elle se devine sans se lire —
 * c'est exactement ce qu'on attend d'un repère de lecture, qui doit disparaître dès
 * qu'on regarde la courbe. `color-mix` la fait suivre les deux thèmes d'une seule
 * déclaration, là où deux valeurs figées demanderaient une règle par thème.
 */
export const GRID_STROKE = 'color-mix(in srgb, var(--color-ink) 8%, transparent)'
