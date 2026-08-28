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

/**
 * Lien vers le classement d'une classe d'actif.
 *
 * ── LES SIX PAGES DÉDIÉES SONT DE RETOUR ────────────────────────────────
 *
 * Cette fonction a rendu `/crypto`, `/actions`, `/etf`… puis, pendant un temps,
 * `/marches?classe=…` — une page unique portant les sept classes en onglets. Elle
 * revient à la première forme, et le motif du retour est le même que celui du
 * départ, appliqué au nouvel arbitre : le choix de classe se fait désormais dans le
 * menu « Parcourir » de l'en-tête, et une entrée de menu a besoin d'une DESTINATION,
 * pas d'un paramètre de requête sur une page tierce.
 *
 * La duplication qui avait justifié la suppression n'existe pas : les six pages sont
 * six appels de `ClassMarketPage`, donc du même `MarketPageView`. Voir la note en
 * tête de ce composant.
 *
 * Les FICHES d'actif n'ont jamais bougé (`assetHref`) : `/crypto/bitcoin` reste
 * `/crypto/bitcoin`. Ce sont les segments de classe qui retrouvent leur page
 * d'accueil.
 */
export function marketHref(assetClass: AssetClass): string {
  return `/${ASSET_CLASS_SEGMENT[assetClass]}`
}
