'use client'

import { Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { CURRENCIES, currencyName, type CurrencyGroup } from '@zenkuu/data/currencies'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { LANGUAGES } from '@/components/settings/languages'
import { useSettings } from '@/lib/stores/settings'

/**
 * Fenêtre de préférences — langue et devise, en deux onglets.
 *
 * Reprend la structure de la référence : deux onglets en tête, un champ de recherche,
 * puis des groupes nommés en grille de quatre colonnes. Chaque cellule affiche le
 * CODE en tête, puis le libellé — c'est le code que l'œil balaie quand on cherche
 * « JPY » dans une liste de quarante-six monnaies, pas le nom.
 *
 * Le regroupement n'est pas décoratif : il place en premier les quelques choix que
 * la grande majorité des visiteurs fera, sans priver les autres de la liste complète.
 *
 * ── CE QUE LE SÉLECTEUR PROMET, ET CE QU'IL TIENT ─────────────────────────────
 *
 * Deux listes, deux régimes de vérité, et il faut les distinguer sous peine de
 * mentir dans un cas sur deux :
 *
 *   • Les DEVISES sont toutes réellement fonctionnelles. La liste n'est pas le
 *     catalogue mais `available`, c'est-à-dire les devises dont un taux a bien été
 *     reçu. Une source en panne retire sa part de la liste plutôt que d'offrir une
 *     conversion qui rendrait le montant inchangé sans le dire (§5).
 *
 *   • Les LANGUES sont toutes affichées, mais deux seulement sont traduites. Chaque
 *     langue non traduite porte donc une mention, et le pied de la fenêtre répète ce
 *     que le choix fait réellement. Le jour où une traduction arrive, la mention
 *     disparaît d'elle-même : elle est conditionnée au drapeau `ready` de l'entrée.
 */

export type PreferenceTab = 'language' | 'currency'

/** Intitulés des groupes de devises, dans l'ordre d'affichage de la référence. */
const CURRENCY_GROUP_LABELS: Record<CurrencyGroup, string> = {
  suggested: 'Devises courantes',
  fiat: 'Monnaies',
  crypto: 'Cryptomonnaies',
  bitcoin: 'Unités bitcoin',
  commodity: 'Matières premières',
}

const CURRENCY_GROUP_ORDER: CurrencyGroup[] = [
  'suggested',
  'fiat',
  'crypto',
  'bitcoin',
  'commodity',
]

interface Item {
  key: string
  /** Affiché en tête de cellule, en petites capitales — c'est le repère de balayage. */
  code: string
  title: string
  selected: boolean
  note?: string
  group: string
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- voir commentaire ci-dessus
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

  const groups = useMemo<Array<{ title: string; items: Item[] }>>(() => {
    if (tab === 'currency') {
      // `available` fait foi, pas le catalogue : on n'affiche que ce qu'on sait
      // convertir. Le catalogue ne sert qu'à retrouver le groupe et le libellé.
      const usable = new Set(available)

      return CURRENCY_GROUP_ORDER.map((group) => ({
        title: CURRENCY_GROUP_LABELS[group],
        items: CURRENCIES.filter((meta) => meta.group === group && usable.has(meta.code)).map(
          (meta) => ({
            key: meta.code,
            code: meta.code,
            // Nom dérivé de la LANGUE COURANTE : « dollar des États-Unis » en
            // français, « US Dollar » en anglais, sans aucune table de traduction.
            title: currencyName(meta.code, language),
            selected: meta.code === currency,
            group,
          }),
        ),
      }))
    }

    const toItem = (entry: (typeof LANGUAGES)[number], group: string): Item => ({
      key: entry.code,
      code: entry.code.toUpperCase(),
      title: entry.label,
      selected: entry.code === language,
      group,
      ...(entry.ready ? {} : { note: 'non traduite' }),
    })

    return [
      {
        title: 'Langues courantes',
        items: LANGUAGES.filter((entry) => entry.popular).map((entry) => toItem(entry, 'popular')),
      },
      {
        title: 'Toutes les langues',
        items: LANGUAGES.filter((entry) => !entry.popular).map((entry) => toItem(entry, 'all')),
      },
    ]
  }, [tab, available, currency, language])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        // On cherche sur le code ET sur le libellé : « JPY » et « yen » doivent
        // l'un comme l'autre trouver la même ligne.
        items: group.items.filter((item) =>
          `${item.code} ${item.title}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, query])

  if (!tab) return null

  const isCurrency = tab === 'currency'
  const onSelect = isCurrency ? setCurrency : setLanguage
  const untranslated = !isCurrency && LANGUAGES.some((entry) => !entry.ready)

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto px-4 py-[6vh]"
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

      {/* Plus large que les 2xl d'origine : la grille de quatre colonnes de la
          référence a besoin de place, et une liste de soixante devises sur deux
          colonnes obligerait à défiler trois fois plus. */}
      <div className="relative w-full max-w-4xl rounded-card border border-border-subtle bg-overlay shadow-overlay">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
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
              className="w-full rounded-card border border-border-subtle bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">Aucun résultat.</p>
          ) : (
            <div className="max-h-[56vh] space-y-6 overflow-y-auto pr-1">
              {visible.map((group) => (
                <Group
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}

          <p className="border-t border-border-subtle pt-4 text-xs leading-relaxed text-ink-muted">
            {isCurrency
              ? 'Les montants convertis affichent la devise d’origine et la date du taux appliqué. Les monnaies suivent le taux de référence BCE ; les métaux et les unités crypto, un cours de marché. Une conversion n’est pas un cours coté.'
              : untranslated
                ? translationNotice()
                : 'Votre choix est enregistré sur cet appareil.'}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Phrase de pied de page sur l'état des traductions.
 *
 * DÉRIVÉE de la liste des langues traduites, jamais écrite en dur. Une phrase figée
 * — « deux langues sont traduites » — devient fausse dès qu'une troisième arrive, et
 * personne ne pense à rouvrir ce fichier ce jour-là. C'est exactement le genre de
 * dérive que le §5 combat : une affirmation vraie à l'écriture, fausse à la lecture.
 */
function translationNotice(): string {
  const ready = LANGUAGES.filter((entry) => entry.ready)
  const names = ready.map((entry) => entry.label)

  const list =
    names.length <= 1
      ? (names[0] ?? 'aucune')
      : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`

  const lead =
    ready.length <= 1
      ? `Seul le ${list.toLowerCase()} est traduit à ce jour.`
      : `${ready.length} langues sont traduites à ce jour : ${list}.`

  return `${lead} Choisir une autre langue enregistre votre préférence, mais l’interface reste dans la langue traduite la plus proche.`
}

/**
 * Un groupe et sa grille.
 *
 * Quatre colonnes sur grand écran comme la référence, deux sur tablette, une sur
 * téléphone. Le code est posé AVANT le libellé et dans une couleur atténuée : il
 * sert de colonne de balayage visuel, alignée d'une ligne à l'autre, ce qu'un
 * libellé de longueur variable ne permet pas.
 */
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
      <h3 className="mb-2 border-b border-border-subtle pb-1.5 text-xs font-medium text-ink-muted">
        {title}
      </h3>
      <ul className="grid grid-cols-1 gap-x-2 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              aria-pressed={item.selected}
              // `items-start` et non `items-baseline` : depuis que les libellés
              // passent à la ligne, un alignement sur la ligne de base décalerait le
              // code vers le bas des cellules à deux lignes.
              className={`flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors duration-150 ${
                item.selected ? 'bg-brand-soft' : 'hover:bg-surface-muted'
              }`}
            >
              <span
                className={`w-12 shrink-0 text-[0.6875rem] font-medium uppercase tracking-wide ${
                  item.selected ? 'text-brand-strong' : 'text-ink-muted'
                }`}
              >
                {item.code}
              </span>
              <span className="min-w-0 flex-1">
                {/* Le texte PASSE À LA LIGNE plutôt que d'être tronqué. Les noms de
                    monnaies en français sont longs — « dollar des Émirats arabes
                    unis » — et une troncature les rend indistinguables les uns des
                    autres : « dollar des Émira… » et « dollar des États-… » ne se
                    départagent plus. Deux lignes coûtent de la hauteur ; une
                    troncature coûte la lisibilité. */}
                <span
                  className={`block text-sm leading-snug ${
                    item.selected ? 'font-medium text-brand-strong' : 'text-ink'
                  }`}
                >
                  {item.title}
                </span>
                {item.note ? (
                  <span className="block truncate text-[0.625rem] text-ink-muted">{item.note}</span>
                ) : null}
              </span>
              {item.selected ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-brand-strong" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
