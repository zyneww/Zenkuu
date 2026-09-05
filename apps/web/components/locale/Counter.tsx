'use client'

import { useLocale } from 'next-intl'
import { useMemo } from 'react'

import { AnimatedCounter } from '@/components/ui/animated-counter'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UN COMPTEUR ANIMÉ QUI PARLE LA LANGUE DE LA PAGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE PIÈGE QU'IL DÉSAMORCE ─────────────────────────────────────────────────
 *
 * ⚠️ `AnimatedCounter` FORMATE LUI-MÊME, ET SES DÉFAUTS SONT ANGLO-SAXONS. Il prend
 * `separator = ","` et `decimalSeparator = "."`, écrits en dur dans sa signature.
 * Posé tel quel sur une page française, il rendrait « 19,593 » là où le reste du site
 * écrit « 19 593 » — et le lecteur lirait dix-neuf virgule cinq au lieu de dix-neuf
 * mille.
 *
 * C'est exactement le défaut corrigé lors du chantier de localisation : des nombres
 * mis en forme à côté du formateur central plutôt qu'à travers lui. Un composant
 * importé d'un registre ne le sait pas ; cette enveloppe le lui apprend.
 *
 * ── D'OÙ VIENNENT LES SÉPARATEURS ────────────────────────────────────────────
 *
 * De `Intl.NumberFormat`, pas d'une table écrite à la main. On formate un nombre
 * témoin et on lit les parties que le navigateur produit : le séparateur de groupe et
 * celui des décimales. Treize langues, aucune liste à tenir à jour, et les cas qu'une
 * liste raterait — l'espace insécable étroit du français, l'apostrophe suisse — sont
 * rendus corrects sans qu'on ait à les connaître.
 *
 * ── ELLE SUIT LA CONVENTION DU PROJET ────────────────────────────────────────
 *
 * Même forme que `components/locale/Money.tsx` et `ChangeBadge.tsx` : un composant
 * client qui tient la langue et délègue le rendu. `packages/ui` et les registres
 * externes ne connaissent aucune locale — c'est leur contrainte fondatrice, et c'est
 * l'enveloppe qui la comble, une fois pour tous les appelants.
 */
export function Counter({
  value,
  decimals = 0,
  className,
}: {
  value: number
  /** Décimales affichées. Zéro pour un dénombrement. */
  decimals?: number
  className?: string
}) {
  const locale = useLocale()

  const { groupe, decimale } = useMemo(() => {
    /*
     * 1234,5 suffit : il produit forcément une partie `group` et une partie
     * `decimal` dans toutes les langues que le site sert.
     */
    const parties = new Intl.NumberFormat(locale).formatToParts(1234.5)
    return {
      groupe: parties.find((p) => p.type === 'group')?.value ?? ' ',
      decimale: parties.find((p) => p.type === 'decimal')?.value ?? ',',
    }
  }, [locale])

  return (
    <AnimatedCounter
      value={value}
      decimals={decimals}
      separator={groupe}
      decimalSeparator={decimale}
      /* `tabular` : sans chiffres à chasse fixe, un compteur qui s'anime fait danser
         la largeur de ses voisins à chaque image. */
      className={className ? `tabular ${className}` : 'tabular'}
    />
  )
}
