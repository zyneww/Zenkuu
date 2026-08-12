'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { ExchangeRates, MarketAsset, SupportedCurrency } from '@zenkuu/data'

import { AssetPicker } from '@/components/tools/AssetPicker'

/**
 * Convertisseur multi-actifs.
 *
 * Tout est calculé sur des cours DÉJÀ CHARGÉS : la frappe ne déclenche aucun appel
 * réseau, la saisie reste instantanée, et le quota de la source n'est pas entamé.
 *
 * ⚠️ DEUX HORODATAGES DANS UN SEUL NOMBRE. Les actifs sont cotés en euros par leur
 * source ; passer à une autre devise applique un taux de la BCE, publié une fois par
 * jour ouvré. Le résultat combine donc un cours de l'instant et un taux de la veille.
 * Ce n'est pas contournable — aucune source gratuite ne cote chaque actif dans les
 * cinq devises — mais c'est dicible, et c'est écrit sous le résultat plutôt que tu.
 *
 * Convertir vers l'euro n'introduit, lui, aucun second horodatage : le taux vaut 1.
 */
export function ConverterView({
  assets,
  rates,
  currencies,
}: {
  assets: MarketAsset[]
  rates: ExchangeRates | null
  currencies: readonly SupportedCurrency[]
}) {
  const [amount, setAmount] = useState('1')
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '')
  const [currency, setCurrency] = useState<string>('EUR')
  const [reversed, setReversed] = useState(false)

  const asset = useMemo(
    () => assets.find((entry) => entry.id === assetId) ?? assets[0],
    [assets, assetId],
  )

  const parsed = Number(amount.replace(/\s/g, '').replace(',', '.'))
  const rate = currency === 'EUR' ? 1 : rates?.rates[currency]

  const result = useMemo(() => {
    if (!asset || !Number.isFinite(parsed) || parsed < 0 || rate === undefined) return undefined

    // Le cours est en euros ; on convertit d'abord dans la devise demandée.
    const priceInCurrency = asset.price * rate
    if (priceInCurrency <= 0) return undefined

    return reversed ? parsed / priceInCurrency : parsed * priceInCurrency
  }, [asset, parsed, rate, reversed])

  if (!asset) return null

  const fromLabel = reversed ? currency : asset.symbol.toUpperCase()
  const toLabel = reversed ? asset.symbol.toUpperCase() : currency

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
        <div className="space-y-3 rounded-card border border-border-subtle bg-surface p-4">
          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">Montant en {fromLabel}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="tabular w-full rounded-card border border-border-subtle bg-surface px-3 py-2.5 text-lg text-ink focus:border-brand focus:outline-none"
            />
          </label>

          {/* Un seul contrôle là où il y en avait deux — un champ de filtrage puis
              une liste déroulante. Chercher et choisir sont un seul geste : les
              séparer obligeait à taper dans un endroit pour agir sur un autre. */}
          <AssetPicker
            assets={assets}
            selected={asset}
            onSelect={(entry) => setAssetId(entry.id)}
            label="Actif"
          />
        </div>

        <button
          type="button"
          onClick={() => setReversed((value) => !value)}
          aria-label="Inverser le sens de conversion"
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-card border border-border-subtle bg-surface text-ink-muted transition-colors duration-150 hover:border-brand hover:text-brand-strong"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="space-y-3 rounded-card border border-border-subtle bg-surface p-4">
          <div aria-live="polite">
            <span className="mb-1 block text-xs text-ink-muted">Résultat en {toLabel}</span>
            <p className="tabular text-3xl font-semibold text-ink">
              {result === undefined
                ? '—'
                : new Intl.NumberFormat('fr-FR', {
                    maximumFractionDigits: result >= 100 ? 2 : 8,
                  }).format(result)}
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">Devise</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="w-full rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            >
              {currencies.map((code) => (
                <option key={code} value={code} disabled={code !== 'EUR' && rates?.rates[code] === undefined}>
                  {code}
                  {code !== 'EUR' && rates?.rates[code] === undefined ? ' — taux indisponible' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="border-l-2 border-border-subtle pl-4 text-xs leading-relaxed text-ink-muted">
        <p>
          Cours de <strong className="text-ink">{asset.name}</strong> relevé le{' '}
          {new Date(asset.lastUpdated).toLocaleString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          , coté en euros par la source.
        </p>
        {currency !== 'EUR' ? (
          <p className="mt-1">
            Converti au taux BCE {rates?.date ? `du ${new Date(rates.date).toLocaleDateString('fr-FR')}` : ''} —
            le résultat combine donc un cours de l’instant et un taux publié une fois par
            jour ouvré. Un montant converti n’est pas un cours coté.
          </p>
        ) : (
          <p className="mt-1">
            Aucune conversion de devise n’est appliquée : le résultat porte le seul
            horodatage du cours.
          </p>
        )}
      </div>
    </div>
  )
}
