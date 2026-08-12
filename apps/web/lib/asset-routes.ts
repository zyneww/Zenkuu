import type { AssetClass } from '@zenkuu/data'

/**
 * Correspondance entre classe d'actif et segment d'URL.
 *
 * Les segments sont en français et lisibles : le §9 fait du SEO organique le premier
 * moteur d'acquisition, et une URL comme `/matieres-premieres/gc-f` porte du sens
 * pour un lecteur francophone comme pour un moteur, là où `/commodity/GC%3DF` n'en
 * porte aucun.
 *
 * Point unique de vérité : les routes, les liens de tableaux et le fil d'Ariane s'y
 * réfèrent tous, ce qui rend impossible qu'une ligne cliquable pointe vers un
 * segment qui n'existe pas.
 */
export const ASSET_CLASS_SEGMENT: Record<AssetClass, string> = {
  crypto: 'crypto',
  forex: 'devises',
  stock: 'actions',
  etf: 'etf',
  commodity: 'matieres-premieres',
  index: 'indices',
  nft: 'nft',
}

const SEGMENT_TO_CLASS = Object.fromEntries(
  Object.entries(ASSET_CLASS_SEGMENT).map(([assetClass, segment]) => [segment, assetClass]),
) as Record<string, AssetClass>

export function assetClassFromSegment(segment: string): AssetClass | null {
  return SEGMENT_TO_CLASS[segment] ?? null
}

/** Lien vers la page de détail d'un actif. */
export function assetHref(assetClass: AssetClass, id: string): string {
  return `/${ASSET_CLASS_SEGMENT[assetClass]}/${encodeURIComponent(id)}`
}

/** Lien vers le classement d'une classe d'actif. */
export function marketHref(assetClass: AssetClass): string {
  return `/${ASSET_CLASS_SEGMENT[assetClass]}`
}
