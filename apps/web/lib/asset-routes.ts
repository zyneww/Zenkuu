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
 * ── LES SEPT PAGES DÉDIÉES N'EXISTENT PLUS ──────────────────────────────
 *
 * Cette fonction rendait `/crypto`, `/actions`, `/etf`… — une page de classement par
 * classe, doublant trait pour trait l'onglet correspondant de `/marches`. Deux
 * surfaces pour un même tableau, c'est deux endroits où corriger un défaut de colonne
 * et un choix inutile imposé au lecteur : « la page crypto » et « l'onglet crypto »
 * ne se distinguaient par rien.
 *
 * Les six pages racines sont supprimées et redirigées (voir `next.config.ts`). Cette
 * fonction pointe désormais là où elles redirigent, ce qui fait qu'AUCUN appelant
 * n'émet de lien vers une redirection — un lien vers une 308 coûte un aller-retour
 * au lecteur et dilue le signal pour les moteurs.
 *
 * `/marches` sans paramètre pour la crypto : c'est l'onglet par défaut de la page, et
 * `?classe=crypto` décrirait la même chose sous deux adresses.
 *
 * Les FICHES d'actif ne bougent pas (`assetHref`) : `/crypto/bitcoin` reste
 * `/crypto/bitcoin`. Ce sont les segments de classe qui perdent leur page d'accueil,
 * pas leur espace de noms.
 */
export function marketHref(assetClass: AssetClass): string {
  if (assetClass === 'crypto') return '/marches'
  return `/marches?classe=${ASSET_CLASS_SEGMENT[assetClass]}`
}
