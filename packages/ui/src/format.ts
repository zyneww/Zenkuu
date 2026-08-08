/**
 * Formatage des nombres en français (§6 : site en français au lancement).
 *
 * Toutes les fonctions renvoient `null` quand la valeur est absente, plutôt qu'un
 * « 0 » ou un « 0,00 € ». C'est l'application de la règle §5 au niveau de
 * l'affichage : une donnée manquante se voit, elle ne se déguise pas en zéro.
 */

const LOCALE = 'fr-FR'

/**
 * Échelle française — « Md » pour milliard, pas « B ».
 *
 * Volontairement arrêtée au milliard : au-delà, le français dit « billion » pour
 * 10¹², quand l'anglais dit « billion » pour 10⁹. Sur un site de marché lu par des
 * gens habitués aux chiffres anglo-saxons, cette collision est un piège. Une
 * capitalisation de 1,99 × 10¹² s'affiche donc « 1 991 Md € », qui ne se lit que
 * d'une seule manière.
 */
const COMPACT_UNITS = [
  { threshold: 1e9, suffix: ' Md', divisor: 1e9 },
  { threshold: 1e6, suffix: ' M', divisor: 1e6 },
  { threshold: 1e3, suffix: ' k', divisor: 1e3 },
] as const

export function formatCurrency(
  value: number | undefined,
  currency: string,
  options: { compact?: boolean } = {},
): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  if (options.compact) {
    const compact = formatCompact(Math.abs(value))
    if (compact === null) return null
    const symbol = currencySymbol(currency)
    return `${value < 0 ? '−' : ''}${compact} ${symbol}`
  }

  // Les cryptos à très faible valeur unitaire ont besoin de plus de décimales,
  // sans quoi une ligne entière afficherait « 0,00 € » — un chiffre faux.
  const absolute = Math.abs(value)
  const fractionDigits = absolute >= 1 ? 2 : absolute >= 0.01 ? 4 : 8

  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatCompact(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  const absolute = Math.abs(value)
  const unit = COMPACT_UNITS.find((candidate) => absolute >= candidate.threshold)

  if (!unit) return formatNumber(value, 2)

  const scaled = value / unit.divisor
  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2,
  }).format(scaled)}${unit.suffix}`
}

export function formatNumber(value: number | undefined, maximumFractionDigits = 2): string | null {
  if (value === undefined || !Number.isFinite(value)) return null
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value)
}

/** Variation en pourcentage, signe explicite compris : « +2,34 % », « −1,10 % ». */
export function formatPercent(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value)) return null

  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))

  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatted} %`
}

/** Taux de change : 4 décimales, sauf pour les paires à forte valeur nominale (JPY). */
export function formatRate(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value)) return null
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: value >= 100 ? 2 : 4,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value)
}

export function formatDateTime(iso: string | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function currencySymbol(currency: string): string {
  const upper = currency.toUpperCase()
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', JPY: '¥' }
  return symbols[upper] ?? upper
}
