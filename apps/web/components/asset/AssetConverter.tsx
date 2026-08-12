'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { SUPPORTED_CURRENCIES } from '@zenkuu/data'
import { formatCurrency } from '@zenkuu/ui'

/**
 * Convertisseur actif ↔ devise.
 *
 * Il n'applique AUCUN taux de change : il lit le prix que la source publie déjà
 * dans la devise choisie (`pricesByCurrency`). C'est un point de justesse, pas
 * d'implémentation — convertir un prix en euros vers le dollar par un taux BCE
 * empilerait deux approximations (le cours, puis le taux, tous deux horodatés
 * différemment) là où la source donne directement la cotation en dollars.
 *
 * Une devise absente du dictionnaire est donc RETIRÉE du sélecteur plutôt que
 * calculée : on ne propose que ce que la source cote réellement (§5).
 */
export function AssetConverter({
  symbol,
  pricesByCurrency,
}: {
  symbol: string
  pricesByCurrency: Record<string, number>
}) {
  const currencies = useMemo(
    () => SUPPORTED_CURRENCIES.filter((code) => pricesByCurrency[code.toLowerCase()] !== undefined),
    [pricesByCurrency],
  )

  const [amount, setAmount] = useState('1')
  const [currency, setCurrency] = useState(currencies[0] ?? 'EUR')

  if (currencies.length === 0) return null

  const rate = pricesByCurrency[currency.toLowerCase()]

  // Virgule acceptée comme séparateur décimal : sur un site francophone, c'est ce
  // que la moitié des visiteurs tapera, et `Number('1,5')` renvoie `NaN`.
  const parsed = Number(amount.replace(',', '.'))
  const valid = Number.isFinite(parsed) && parsed >= 0 && rate !== undefined
  const converted = valid ? parsed * rate : undefined

  return (
    <section aria-labelledby="convertisseur-titre" className="space-y-2">
      <h2 id="convertisseur-titre" className="text-sm font-semibold text-ink">
        Convertisseur
      </h2>

      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-card border border-border-subtle bg-surface px-3 py-2 focus-within:border-brand">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label={`Quantité de ${symbol} à convertir`}
            className="tabular w-full min-w-0 bg-transparent text-sm text-ink outline-none"
          />
          <span className="shrink-0 text-xs font-medium uppercase text-ink-muted">{symbol}</span>
        </div>

        <span
          className="flex shrink-0 items-center px-1 text-ink-muted"
          aria-hidden="true"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </span>

        <div className="flex flex-1 items-center gap-2 rounded-card border border-border-subtle bg-surface-muted px-3 py-2">
          <output className="tabular w-full min-w-0 truncate text-sm text-ink">
            {converted !== undefined ? formatCurrency(converted, currency) : '—'}
          </output>
          <label className="sr-only" htmlFor="convertisseur-devise">
            Devise de conversion
          </label>
          <select
            id="convertisseur-devise"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as typeof currency)}
            className="shrink-0 bg-transparent text-xs font-medium text-ink-muted outline-none"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!valid && amount.trim() !== '' ? (
        <p role="status" className="text-xs text-ink-muted">
          Saisissez un nombre positif.
        </p>
      ) : null}
    </section>
  )
}
