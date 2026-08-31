'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { SUPPORTED_CURRENCIES } from '@zenkuu/data'
import { formatCurrency } from '@zenkuu/ui'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { usePhrase } from '@/components/locale/ContentProvider'

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
  const t = usePhrase()
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
        {t('Convertisseur')}
      </h2>

      <div className="flex items-stretch gap-2">
        {/* `InputGroup` de shadcn/ui : une quantité et son unité forment UNE saisie,
            et c'est ce que le groupe modélise — un champ, un complément accolé, un
            seul anneau de focus autour des deux, là où le `focus-within` était écrit à
            la main sur la boîte. `align="inline-end"` pose l'unité après le nombre. */}
        <InputGroup size="sm" className="flex-1">
          <InputGroupInput
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label={`Quantité de ${symbol} à convertir`}
            className="tabular"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="uppercase">{symbol}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>

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
          {/* ── UN `NativeSelect` DÉPOUILLÉ DE SON PROPRE CADRE ──────────────

              Ce sélecteur vit À L'INTÉRIEUR d'une boîte déjà bordée — celle qui porte le
              résultat. Laissé avec son fond, son anneau et son ombre, il dessinerait un
              second cadre dans le premier, ce que la règle de surface unique du design
              system interdit.

              `className` atteint directement le `<select>` chez shadcn/ui, et les `!`
              restent nécessaires : ce sont des utilitaires de MÊME spécificité que ceux
              posés par le composant, et sans eux c'est l'ordre d'émission de la feuille
              de style qui déciderait à notre place. */}
          <NativeSelect
            size="sm"
            aria-label={t('Devise de conversion')}
            value={currency}
            onChange={(event) => setCurrency(event.target.value as typeof currency)}
            className="w-max !border-0 !bg-transparent !py-0 !pl-0 !pr-6 !text-xs !font-medium !text-ink-muted !shadow-none"
          >
            {currencies.map((code) => (
              <NativeSelectOption key={code} value={code}>
                {code}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {!valid && amount.trim() !== '' ? (
        <p role="status" className="text-xs text-ink-muted">{t('Saisissez un nombre positif.')}</p>
      ) : null}
    </section>
  )
}
