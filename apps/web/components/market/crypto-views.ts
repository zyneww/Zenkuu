import type { MarketAsset } from '@zenith/data'

/**
 * Vocabulaire partagé de la page de cotation crypto.
 *
 * Vues et périodes vivent dans l'URL plutôt que dans un état React, et ce n'est pas
 * un détail d'implémentation : une vue « plus fortes hausses sur 1 an » doit pouvoir
 * être partagée, mise en favori et indexée. Un état client la rendrait invisible au
 * partage comme aux moteurs de recherche.
 */

export type CryptoView = 'populaires' | 'tendance' | 'gagnants' | 'perdants'

export const CRYPTO_VIEWS: { key: CryptoView; label: string }[] = [
  { key: 'populaires', label: 'Les plus populaires' },
  { key: 'tendance', label: 'Tendance' },
  { key: 'gagnants', label: 'Gagnants' },
  { key: 'perdants', label: 'Perdants' },
]

export function readView(raw: string | string[] | undefined): CryptoView {
  const value = Array.isArray(raw) ? raw[0] : raw
  const match = CRYPTO_VIEWS.find((view) => view.key === value)
  return match ? match.key : 'populaires'
}

/**
 * Périodes de variation.
 *
 * Les cinq crans correspondent EXACTEMENT à ce que la source publie
 * (`price_change_percentage=1h,24h,7d,14d,30d,1y`), et tous arrivent dans le même
 * appel réseau : changer de période ne coûte rien.
 *
 * Le cran « 5 ans » de la référence est absent, et volontairement non remplacé :
 * étiqueter du 1 an « 5 ans » serait faux, et un cran mort à l'écran n'apprendrait
 * rien de plus que son absence (§5).
 */
export type ChangePeriod = '1h' | '24h' | '7d' | '30d' | '1y'

export const CHANGE_PERIODS: {
  key: ChangePeriod
  label: string
  /** Libellé long, lu par `ChangeBadge` et les lecteurs d'écran. */
  longLabel: string
  field: keyof Pick<MarketAsset, 'change1h' | 'change24h' | 'change7d' | 'change30d' | 'change1y'>
}[] = [
  { key: '1h', label: '1 H', longLabel: 'sur 1 heure', field: 'change1h' },
  { key: '24h', label: '24 h', longLabel: 'sur 24 heures', field: 'change24h' },
  { key: '7d', label: '7 J', longLabel: 'sur 7 jours', field: 'change7d' },
  { key: '30d', label: '1 M', longLabel: 'sur 30 jours', field: 'change30d' },
  { key: '1y', label: '1 A', longLabel: 'sur 1 an', field: 'change1y' },
]

export function readPeriod(raw: string | string[] | undefined): ChangePeriod {
  const value = Array.isArray(raw) ? raw[0] : raw
  const match = CHANGE_PERIODS.find((period) => period.key === value)
  return match ? match.key : '24h'
}

export function periodMeta(period: ChangePeriod) {
  // La liste couvre tous les membres du type et `readPeriod` garantit la validité :
  // le repli ne sert qu'à satisfaire le typage.
  return CHANGE_PERIODS.find((entry) => entry.key === period) ?? CHANGE_PERIODS[1]!
}

/** Construit une URL de la page en ne gardant que les paramètres non par défaut. */
export function cryptoHref(
  basePath: string,
  params: { view?: CryptoView; period?: ChangePeriod; page?: number },
): string {
  const query = new URLSearchParams()
  if (params.view && params.view !== 'populaires') query.set('vue', params.view)
  if (params.period && params.period !== '24h') query.set('periode', params.period)
  if (params.page && params.page > 1) query.set('page', String(params.page))

  const search = query.toString()
  return search ? `${basePath}?${search}` : basePath
}
