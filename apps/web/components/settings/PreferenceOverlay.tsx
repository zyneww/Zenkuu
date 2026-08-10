'use client'

import { Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { useSettings } from '@/lib/stores/settings'

/**
 * Fenêtre de préférences — langue et devise, en deux onglets.
 *
 * Reprend la structure de la référence : deux onglets en tête, un champ de recherche,
 * puis des groupes « populaires » et « toutes ». Le regroupement n'est pas décoratif —
 * il place en premier les quelques choix que 95 % des visiteurs feront, sans priver
 * les autres de la liste complète.
 *
 * ── UNE HONNÊTETÉ QUE LA RÉFÉRENCE N'A PAS À AVOIR ────────────────────────────
 *
 * CoinMarketCap propose vingt-cinq langues, toutes traduites. ZENITH n'en a qu'une.
 * Afficher la même grille sans le dire ferait promettre une traduction inexistante :
 * chaque langue non traduite porte donc une mention, et le pied de la fenêtre répète
 * ce que le choix fait réellement — il enregistre une préférence, il ne traduit rien.
 *
 * Le jour où une deuxième langue arrive, la mention disparaît d'elle-même : elle est
 * conditionnée au drapeau `ready` de chaque entrée, pas écrite en dur.
 */

export type PreferenceTab = 'language' | 'currency'

/**
 * Langues proposées.
 *
 * `ready` distingue « traduite » de « seulement enregistrable ». Sans ce drapeau, la
 * liste serait un catalogue de promesses.
 */
const LANGUAGES = [
  { code: 'fr', label: 'Français', region: 'FR', ready: true, popular: true },
  { code: 'en', label: 'English', region: 'US', ready: false, popular: true },
  { code: 'es', label: 'Español', region: 'ES', ready: false, popular: true },
  { code: 'de', label: 'Deutsch', region: 'DE', ready: false, popular: true },
  { code: 'it', label: 'Italiano', region: 'IT', ready: false, popular: false },
  { code: 'pt', label: 'Português', region: 'PT', ready: false, popular: false },
  { code: 'nl', label: 'Nederlands', region: 'NL', ready: false, popular: false },
  { code: 'pl', label: 'Polski', region: 'PL', ready: false, popular: false },
] as const

const CURRENCY_NAMES: Record<string, { name: string; symbol: string; popular: boolean }> = {
  EUR: { name: 'Euro', symbol: '€', popular: true },
  USD: { name: 'Dollar américain', symbol: '$', popular: true },
  GBP: { name: 'Livre sterling', symbol: '£', popular: true },
  CHF: { name: 'Franc suisse', symbol: 'Fr', popular: false },
  JPY: { name: 'Yen japonais', symbol: '¥', popular: false },
}

interface Item {
  key: string
  title: string
  subtitle: string
  selected: boolean
  note?: string
  popular: boolean
}

export function PreferenceOverlay({
  tab,
  onTabChange,
  onClose,
}: {
  /** `null` ferme la fenêtre — l'état vit chez l'appelant. */
  tab: PreferenceTab | null
  onTabChange: (tab: PreferenceTab) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const { language, setLanguage } = useSettings()
  const { currency, setCurrency, available } = useCurrency()

  const open = tab !== null

  // Le filtre repart à zéro à chaque changement d'onglet ET à chaque ouverture :
  // retrouver « eur » saisi dans l'onglet des devises en passant aux langues donne
  // une grille vide sans qu'on comprenne pourquoi.
  useEffect(() => {
    setQuery('')
  }, [tab])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    if (tab === 'currency') {
      return available.map((code) => {
        const meta = CURRENCY_NAMES[code]
        return {
          key: code,
          title: meta?.name ?? code,
          subtitle: meta ? `${code} — ${meta.symbol}` : code,
          selected: code === currency,
          popular: meta?.popular ?? false,
        }
      })
    }

    return LANGUAGES.map((entry) => ({
      key: entry.code,
      title: entry.label,
      subtitle: entry.region,
      selected: entry.code === language,
      popular: entry.popular,
      ...(entry.ready ? {} : { note: 'non traduite' }),
    }))
  }, [tab, available, currency, language])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(needle))
  }, [items, query])

  if (!tab) return null

  const isCurrency = tab === 'currency'
  const onSelect = isCurrency ? setCurrency : setLanguage
  const popular = visible.filter((item) => item.popular)
  const rest = visible.filter((item) => !item.popular)
  const untranslated = !isCurrency && LANGUAGES.some((entry) => !entry.ready)

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto px-4 py-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-label={isCurrency ? 'Devise' : 'Langue'}
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-canvas/80 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl border border-border-subtle bg-overlay shadow-overlay">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Onglets, et non deux fenêtres séparées : langue et devise sont les deux
            réglages d'affichage que l'on ajuste souvent l'un après l'autre. */}
        <div className="flex items-center justify-center gap-6 pt-6" role="tablist">
          {(['language', 'currency'] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={tab === entry}
              onClick={() => onTabChange(entry)}
              className={`border-b-2 pb-2 text-base font-semibold transition-colors duration-150 ${
                tab === entry
                  ? 'border-brand text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {entry === 'language' ? 'Langue' : 'Devise'}
            </button>
          ))}
        </div>

        <div className="space-y-5 p-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher…"
              aria-label={isCurrency ? 'Rechercher une devise' : 'Rechercher une langue'}
              className="w-full border border-border-subtle bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">Aucun résultat.</p>
          ) : (
            <div className="max-h-[50vh] space-y-5 overflow-y-auto">
              {popular.length > 0 ? (
                <Group
                  title={isCurrency ? 'Devises courantes' : 'Langues courantes'}
                  items={popular}
                  onSelect={onSelect}
                />
              ) : null}
              {rest.length > 0 ? (
                <Group
                  title={isCurrency ? 'Toutes les devises' : 'Toutes les langues'}
                  items={rest}
                  onSelect={onSelect}
                />
              ) : null}
            </div>
          )}

          <p className="border-t border-border-subtle pt-4 text-xs leading-relaxed text-ink-muted">
            {isCurrency
              ? 'Les montants convertis affichent la devise d’origine et la date du taux BCE appliqué. Une conversion n’est pas un cours coté.'
              : untranslated
                ? 'Seul le français est traduit à ce jour. Choisir une autre langue enregistre votre préférence, mais l’interface reste en français.'
                : 'Votre choix est enregistré sur cet appareil.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Group({
  title,
  items,
  onSelect,
}: {
  title: string
  items: Item[]
  onSelect: (key: string) => void
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-ink-muted">{title}</h3>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              aria-pressed={item.selected}
              className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ${
                item.selected ? 'bg-brand-soft' : 'hover:bg-surface-muted'
              }`}
            >
              <span className="min-w-0">
                <span
                  className={`block truncate text-sm font-medium ${
                    item.selected ? 'text-brand-strong' : 'text-ink'
                  }`}
                >
                  {item.title}
                </span>
                <span className="block truncate text-[0.6875rem] text-ink-muted">
                  {item.note ? `${item.subtitle} · ${item.note}` : item.subtitle}
                </span>
              </span>
              {item.selected ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
