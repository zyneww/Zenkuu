import { BookOpen, Database, Scale, SlidersHorizontal, Star, User, type LucideIcon } from 'lucide-react'

import type { HelpCategory } from '@/content/aide'

/**
 * Le pictogramme de chaque rubrique d'aide.
 *
 * La table vit dans son propre fichier parce que DEUX composants la lisent — la
 * recherche et la grille de rubriques — et qu'ils ne sont plus le même depuis que la
 * grille a quitté la recherche. La recopier ferait diverger deux jeux d'icônes pour
 * une même donnée.
 *
 * `Record<HelpCategory['icon'], …>` et non un index libre : ajouter une valeur au
 * type de `content/aide.ts` sans lui donner d'icône devient alors une erreur de
 * compilation, et non une case vide découverte à l'écran.
 */
export const HELP_ICONS: Record<HelpCategory['icon'], LucideIcon> = {
  database: Database,
  'book-open': BookOpen,
  user: User,
  scale: Scale,
  sliders: SlidersHorizontal,
  star: Star,
}
