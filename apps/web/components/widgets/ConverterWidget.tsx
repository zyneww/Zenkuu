'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenkuu/data'

/**
 * Convertisseur actif ↔ devise.
 *
 * Équivalent natif d'un widget de conversion. Il travaille sur des cours DÉJÀ
 * CHARGÉS par la page : aucun appel réseau n'est déclenché à la frappe, ce qui rend
 * la saisie instantanée et n'entame pas le quota de la source.
 *
 * Le taux appliqué et sa date sont affichés sous le résultat : un montant converti
 * n'est pas un cours coté, et l'écrire évite la confusion (§5).
 */
export function ConverterWidget({ assets }: { assets: MarketAsset[] }) {
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '')
  const [amount, setAmount] = useState('1')
  const [reversed, setReversed] = useState(false)

  const asset = useMemo(
    () => assets.find((entry) => entry.id === assetId) ?? assets[0],
    [assets, assetId],
  )

  const parsed = Number(amount.replace(',', '.'))
  const valid = Number.isFinite(parsed) && parsed >= 0 && asset !== undefined

  // Sens direct : n unités d'actif → devise. Sens inverse : n unités de devise →
  // actif. Un prix nul rendrait la division impossible : on le traite comme invalide
  // plutôt que de renvoyer l'infini.
  const result =
    valid && asset
      ? reversed
        ? asset.price > 0
          ? parsed / asset.price
          : undefined
        : parsed * asset.price
      : undefined

  if (!asset) return null

  const fromLabel = reversed ? asset.currency : asset.symbol.toUpperCase()
  const toLabel = reversed ? asset.symbol.toUpperCase() : asset.currency

  return (
    <div className="space-y-3 rounded-card border border-border-subtle bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Convertisseur</h3>
        <button
          type="button"
          onClick={() => setReversed((value) => !value)}
          aria-label="Inverser le sens de conversion"
          className="rounded-card p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-[0.6875rem] text-ink-muted">Montant en {fromLabel}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[0.6875rem] text-ink-muted">Actif</span>
          <select
            value={asset.id}
            onChange={(event) => setAssetId(event.target.value)}
            className="w-full rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          >
            {assets.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} ({entry.symbol.toUpperCase()})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-card bg-surface-muted px-3 py-2.5" aria-live="polite">
        <p className="text-[0.6875rem] text-ink-muted">Résultat en {toLabel}</p>
        <p className="tabular text-lg font-semibold text-ink">
          {result === undefined
            ? '—'
            : new Intl.NumberFormat('fr-FR', {
                maximumFractionDigits: result >= 100 ? 2 : 8,
              }).format(result)}
        </p>
      </div>

      <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
        Calculé au dernier cours reçu pour {asset.name}, publié le{' '}
        {new Date(asset.lastUpdated).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
        . Un montant converti n’est pas un cours coté.
      </p>
    </div>
  )
}
