import type { MoversPeriod, MoversUniverse } from '@zenith/data'

/**
 * Libellés des filtres de « mouvements ».
 *
 * Module NEUTRE, sans directive `'use client'`, et ce n'est pas un détail
 * d'organisation : Next.js transforme TOUS les exports d'un fichier `'use client'`
 * en références client. Un composant serveur qui importerait ces objets depuis le
 * composant de filtres ne recevrait pas les données mais un stub — l'indexation y
 * renvoie `undefined`, ce qui casse le rendu serveur sans que TypeScript le voie.
 *
 * Les données partagées entre les deux mondes vivent donc dans un module à part,
 * importé indifféremment par l'un et par l'autre.
 */

export const PERIOD_LABELS: Record<MoversPeriod, string> = {
  '1h': '1 heure',
  '24h': '24 heures',
  '7d': '7 jours',
  '14d': '14 jours',
  '30d': '30 jours',
  '1y': '1 an',
}

export const UNIVERSE_LABELS: Record<MoversUniverse, string> = {
  100: 'Top 100',
  250: 'Top 250',
  500: 'Top 500',
}
