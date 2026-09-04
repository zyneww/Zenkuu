'use client'

import { useLocale } from 'next-intl'
import { useMemo } from 'react'

import { createFormatters, type Formatters } from '@zenkuu/ui'

/**
 * Les formateurs de la langue rendue — CÔTÉ CLIENT.
 *
 * Pendant de `getFormatters()` (`lib/formatters.ts`), dont l'en-tête explique pourquoi
 * les deux ne peuvent pas vivre dans le même fichier.
 *
 * ── `useMemo` N'EST PAS DÉCORATIF ICI ────────────────────────────────────────
 *
 * `createFormatters` construit neuf fermetures. Sans mémoïsation, un tableau de trois
 * cents lignes qui appelle ce crochet dans chaque ligne en construirait deux mille
 * sept cents par rendu — et surtout, l'objet changerait d'identité à chaque fois,
 * invalidant tout `useMemo` en aval qui le prendrait en dépendance.
 *
 * La langue ne change qu'en changeant de page : la dépendance est donc stable en
 * pratique, et le calcul n'a lieu qu'une fois.
 */
export function useFormatters(): Formatters {
  const locale = useLocale()
  return useMemo(() => createFormatters(locale), [locale])
}
