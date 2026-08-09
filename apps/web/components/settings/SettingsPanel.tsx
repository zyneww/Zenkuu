'use client'

import { Check, ChevronRight, Search, Settings, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { useSettings, type ThemeMode } from '@/lib/stores/settings'

/**
 * Panneau de paramètres unifié de l'en-tête.
 *
 * Remplace les deux contrôles séparés (sélecteur de devise, bascule de thème) par
 * une entrée unique. Le motif repris est une convention répandue des plateformes
 * financières — une liste de réglages qui s'ouvre vers une vue de sélection — et non
 * la copie d'une interface particulière : la disposition, la palette et les libellés
 * sont ceux de ZENITH.
 *
 * Navigation à DEUX NIVEAUX (racine → sélection) plutôt qu'un panneau unique qui
 * afficherait tout : la grille de devises et celle des langues ne tiennent pas côte à
 * côte sur mobile sans devenir illisibles.
 */

const LANGUAGES = [
  { code: 'fr', label: 'Français', region: 'FR', ready: true },
  { code: 'en', label: 'English', region: 'US', ready: false },
  { code: 'es', label: 'Español', region: 'ES', ready: false },
  { code: 'de', label: 'Deutsch', region: 'DE', ready: false },
  { code: 'it', label: 'Italiano', region: 'IT', ready: false },
  { code: 'pt', label: 'Português', region: 'PT', ready: false },
  { code: 'nl', label: 'Nederlands', region: 'NL', ready: false },
  { code: 'pl', label: 'Polski', region: 'PL', ready: false },
] as const

const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'Dollar américain',
  GBP: 'Livre sterling',
  CHF: 'Franc suisse',
  JPY: 'Yen japonais',
}

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Système' },
]

type View = 'root' | 'language' | 'currency'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('root')
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { theme, language, setTheme, setLanguage } = useSettings()
  const { currency, setCurrency, available } = useCurrency()

  // Fermeture au clavier et restitution du focus au déclencheur : sans cela, la
  // navigation clavier repart du début du document après fermeture.
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // La vue de sélection ne doit pas persister d'une ouverture à l'autre : rouvrir le
  // panneau doit toujours repartir de la liste des réglages.
  useEffect(() => {
    if (!open) setView('root')
  }, [open])

  const activeLanguage = LANGUAGES.find((entry) => entry.code === language) ?? LANGUAGES[0]

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Paramètres d’affichage"
        className="rounded-card p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/40 p-4 pt-20 backdrop-blur-sm"
          onClick={(event) => {
            // Fermeture au clic sur le fond uniquement : un clic dans le panneau ne
            // doit pas le fermer.
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres d’affichage"
            className="w-full max-w-md overflow-hidden rounded-card border border-border-subtle bg-surface shadow-lg"
          >
            <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">
                {view === 'root' ? 'Paramètres' : view === 'language' ? 'Langue' : 'Devise'}
              </h2>
              <button
                type="button"
                onClick={() => (view === 'root' ? setOpen(false) : setView('root'))}
                aria-label={view === 'root' ? 'Fermer' : 'Retour aux paramètres'}
                className="rounded-card p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="p-4">
              {view === 'root' ? (
                <div className="space-y-1">
                  <SettingRow
                    label="Langue"
                    value={activeLanguage.label}
                    onClick={() => setView('language')}
                  />
                  <SettingRow
                    label="Devise"
                    value={currency}
                    onClick={() => setView('currency')}
                    disabled={available.length < 2}
                  />

                  <div className="flex items-center justify-between gap-3 px-1 py-2.5">
                    <span className="text-sm text-ink">Thème</span>
                    <div
                      className="flex items-center gap-0.5 rounded-card bg-surface-muted p-0.5"
                      role="group"
                      aria-label="Thème"
                    >
                      {THEMES.map((entry) => (
                        <button
                          key={entry.value}
                          type="button"
                          onClick={() => setTheme(entry.value)}
                          aria-pressed={theme === entry.value}
                          className={`rounded-[0.5rem] px-2.5 py-1 text-xs font-medium transition-colors ${
                            theme === entry.value
                              ? 'bg-surface text-ink shadow-sm'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {view === 'language' ? (
                <SelectionGrid
                  items={LANGUAGES.map((entry) => ({
                    key: entry.code,
                    title: entry.label,
                    subtitle: entry.region,
                    selected: entry.code === language,
                    note: entry.ready ? undefined : 'interface en français',
                  }))}
                  onSelect={setLanguage}
                  searchLabel="Rechercher une langue"
                  footer={
                    // Mention EXPLICITE : les autres langues sont enregistrées comme
                    // préférence mais l'interface reste en français. Sans elle, la
                    // grille promettrait une traduction qui n'existe pas.
                    <>
                      Seul le français est traduit à ce jour. Choisir une autre langue
                      enregistre votre préférence, mais l’interface reste en français.
                    </>
                  }
                />
              ) : null}

              {view === 'currency' ? (
                <SelectionGrid
                  items={available.map((code) => ({
                    key: code,
                    title: code,
                    subtitle: CURRENCY_NAMES[code] ?? '',
                    selected: code === currency,
                  }))}
                  onSelect={setCurrency}
                  searchLabel="Rechercher une devise"
                  footer="Les montants convertis affichent la devise d’origine et la date du taux BCE appliqué."
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function SettingRow({
  label,
  value,
  onClick,
  disabled = false,
}: {
  label: string
  value: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-card px-1 py-2.5 text-left transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-sm text-ink">{label}</span>
      <span className="flex items-center gap-1 text-sm text-ink-muted">
        {value}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  )
}

interface SelectionItem {
  key: string
  title: string
  subtitle: string
  selected: boolean
  note?: string
}

function SelectionGrid({
  items,
  onSelect,
  searchLabel,
  footer,
}: {
  items: SelectionItem[]
  onSelect: (key: string) => void
  searchLabel: string
  footer: React.ReactNode
}) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(needle),
    )
  }, [items, query])

  return (
    <div className="space-y-3">
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
          aria-label={searchLabel}
          className="w-full rounded-card border border-border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
        />
      </div>

      {visible.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">Aucun résultat.</p>
      ) : (
        <ul className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto">
          {visible.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-pressed={item.selected}
                className={`flex w-full items-start justify-between gap-2 rounded-card px-2.5 py-2 text-left transition-colors ${
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
                    {item.note ?? item.subtitle}
                  </span>
                </span>
                {item.selected ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[0.6875rem] leading-relaxed text-ink-muted">{footer}</p>
    </div>
  )
}
