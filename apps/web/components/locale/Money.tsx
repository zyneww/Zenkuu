'use client'

import { formatCompact, formatCurrency, formatRate } from '@zenith/ui'

import { BASE_CURRENCY, useCurrency } from '@/components/locale/CurrencyProvider'

interface MoneyProps {
  value: number | undefined
  /** Devise dans laquelle la source exprime ce montant. */
  from?: string
  compact?: boolean
  /** Affichage en taux (paires de devises) plutôt qu'en montant monétaire. */
  asRate?: boolean
  /** Texte affiché quand la valeur est absente — jamais un zéro (§5). */
  fallback?: string
}

/**
 * Montant affiché dans la devise choisie par le visiteur.
 *
 * Composant client alors que les tableaux sont rendus côté serveur : c'est
 * volontaire. La devise est une préférence locale, mémorisée dans le navigateur ;
 * la faire remonter jusqu'au rendu serveur imposerait un cookie et un rendu
 * dynamique de toutes les pages, ce qui coûterait l'ISR (§9). Seules les cellules
 * de montant sont donc hydratées, et le premier rendu affiche l'euro — la devise
 * dans laquelle les sources cotent réellement.
 */
export function Money({
  value,
  from = BASE_CURRENCY,
  compact = false,
  asRate = false,
  fallback = '—',
}: MoneyProps) {
  const { currency, convert } = useCurrency()

  if (value === undefined || !Number.isFinite(value)) return <>{fallback}</>

  // Un taux de change ne se convertit pas : « EUR/USD = 1,1535 » est un rapport,
  // pas un montant en euros. Le multiplier par un taux produirait un non-sens.
  if (asRate) return <>{formatRate(value) ?? fallback}</>

  const converted = convert(value, from)
  const formatted = compact
    ? formatCurrency(converted, currency, { compact: true })
    : formatCurrency(converted, currency)

  return <>{formatted ?? fallback}</>
}

/** Variante sans symbole monétaire, pour les quantités (offre en circulation…). */
export function Quantity({
  value,
  suffix,
  fallback = '—',
}: {
  value: number | undefined
  suffix?: string
  fallback?: string
}) {
  const formatted = formatCompact(value)
  if (formatted === null) return <>{fallback}</>
  return (
    <>
      {formatted}
      {suffix ? <span className="ml-1 text-xs font-normal text-ink-muted">{suffix}</span> : null}
    </>
  )
}
