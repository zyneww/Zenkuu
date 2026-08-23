import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `tailwind-merge` ne connaît que l'échelle Tailwind par défaut. Zenkuu ajoute des
 * crans typographiques (`text-display-*`) que la bibliothèque prendrait sinon pour
 * des couleurs — `text-display-md` et `text-ink` se neutraliseraient l'un l'autre.
 * On les déclare donc explicitement comme faisant partie du groupe « taille de texte ».
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display-xs', 'display-sm', 'display-md', 'display-lg', 'display-xl', 'display-2xl'],
    },
  },
});

/**
 * Fusionne des classes Tailwind en laissant la DERNIÈRE gagner sur son groupe.
 * C'est le point d'entrée unique du projet : shadcn/ui l'attend sous ce nom, et
 * tous les composants Zenkuu l'utilisent pour accepter une prop `className`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
