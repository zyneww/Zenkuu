/**
 * Vocabulaire commun des graphiques.
 *
 * Toutes les valeurs pointent vers des JETONS CSS plutôt que vers des couleurs
 * écrites en dur. C'est ce qui permet aux graphiques de suivre la bascule de thème
 * sans qu'aucun composant ne s'en préoccupe : Recharts reçoit la chaîne
 * `var(--color-data-1)`, que le navigateur résout à la peinture. Une couleur figée
 * exigerait au contraire de lire le thème en JavaScript, puis de re-rendre à chaque
 * bascule — et de gérer l'instant où le thème n'est pas encore connu.
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
 * Grille : blanc à 6 %, relevé sur la référence.
 *
 * Une valeur en `rgba` plutôt qu'un jeton, et c'est délibéré : la grille doit être
 * une atténuation du FOND, pas une couleur propre. À 6 % elle se devine sans se
 * lire — c'est exactement ce qu'on attend d'un repère de lecture, qui doit
 * disparaître dès qu'on regarde la courbe.
 *
 * Le pendant clair est du noir à 6 %, appliqué par le même mécanisme.
 */
export const GRID_STROKE = 'color-mix(in srgb, var(--color-ink) 8%, transparent)'

export const AXIS_TICK = {
  fill: 'var(--color-ink-muted)',
  fontSize: 10,
} as const

/** Marges internes communes. Le bas est plus large : il porte les libellés d'axe. */
export const CHART_MARGIN = { top: 8, right: 8, bottom: 4, left: 0 } as const

/**
 * Durée d'animation à l'entrée.
 *
 * 800 ms, comme la référence. Volontairement plus longue que les transitions
 * d'interface (150 ms) : une courbe qui se trace donne à voir la FORME de la série
 * avant de la figer, là où un état de bouton doit répondre instantanément.
 *
 * Recharts n'a pas de gestion de `prefers-reduced-motion` : c'est à l'appelant de
 * passer 0 quand l'utilisateur demande à réduire les animations, via
 * `useReducedMotion` ci-dessous.
 */
export const ENTER_DURATION = 800

/** Style de l'infobulle. Reprend le jeton de couche flottante, comme les menus. */
export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-overlay)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 0,
  fontSize: 12,
  padding: '8px 10px',
  boxShadow: 'var(--shadow-overlay)',
} as const

export const TOOLTIP_LABEL_STYLE = {
  color: 'var(--color-ink-muted)',
  fontSize: 11,
  marginBottom: 2,
} as const
