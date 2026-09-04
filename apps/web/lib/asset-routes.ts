import type { AssetClass } from '@zenkuu/data'

import type { AppHref } from '@/i18n/navigation'

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

/**
 * Route interne de la FICHE d'un actif, par classe.
 *
 * Doublon apparent de `ASSET_CLASS_SEGMENT`, et il ne l'est pas : ce dernier rend un
 * SEGMENT (`'actions'`), qui servait à composer une adresse par concaténation. Depuis
 * `i18n/pathnames.ts`, une adresse ne se compose plus — elle se DÉSIGNE par sa route
 * interne, que next-intl traduit ensuite selon la langue. `/actions/[id]` devient
 * `/stocks/bitcoin` en anglais et `/fr/actions/…` en français ; une chaîne bâtie à la
 * main ne pourrait pas faire cette différence.
 *
 * ⚠️ `nft` N'A PAS DE FICHE, et n'en a jamais eu : `app/[locale]/nft/[id]/` n'existe
 * pas. `assetHref('nft', …)` rendait donc `/nft/quelque-chose`, c'est-à-dire un 404 —
 * sans conséquence jusqu'ici, aucune source ne produisant cette classe. La table le
 * dit maintenant explicitement plutôt que de le laisser découvrir.
 */
const ASSET_DETAIL_ROUTE = {
  crypto: '/crypto/[id]',
  forex: '/devises/[id]',
  stock: '/actions/[id]',
  etf: '/etf/[id]',
  commodity: '/matieres-premieres/[id]',
  index: '/indices/[id]',
  nft: null,
} as const satisfies Record<AssetClass, string | null>

/** Route interne de la page de CLASSE. */
const ASSET_CLASS_ROUTE = {
  crypto: '/crypto',
  forex: '/devises',
  stock: '/actions',
  etf: '/etf',
  commodity: '/matieres-premieres',
  index: '/indices',
  /* La seule page NFT du site est un graphique global, pas un classement d'actifs.
     C'est la destination honnête : elle existe et parle bien de NFT. */
  nft: '/graphiques/nft',
} as const satisfies Record<AssetClass, string>

/**
 * Lien vers la page de détail d'un actif.
 *
 * `id` n'est plus encodé ici : next-intl encode lui-même les paramètres qu'on lui
 * passe. L'encoder en amont produirait un double encodage — `GC%3DF` deviendrait
 * `GC%253DF`, et la fiche des matières premières répondrait 404.
 */
export function assetHref(assetClass: AssetClass, id: string): AppHref {
  const route = ASSET_DETAIL_ROUTE[assetClass]
  return route ? { pathname: route, params: { id } } : ASSET_CLASS_ROUTE[assetClass]
}

/**
 * Le CHEMIN INTERNE d'une fiche, en chaîne.
 *
 * ── POURQUOI DEUX FONCTIONS POUR UNE MÊME DESTINATION ────────────────────────
 *
 * `assetHref` sert à NAVIGUER : sa valeur part dans un `<Link>`, qui la traduit selon
 * la langue rendue. Deux appelants n'ont pas ce besoin et ne peuvent pas s'en
 * accommoder, parce qu'ils veulent une chaîne :
 *
 *   · `revalidatePath()`, qui désigne une entrée du cache de pages ;
 *   · les données structurées JSON-LD, qui déclarent une URL absolue.
 *
 * Leur rendre la forme objet les obligerait à la reconvertir chacun de son côté, et
 * c'est exactement la duplication que `ASSET_CLASS_SEGMENT` a toujours servi à éviter.
 *
 * ⚠️ CE CHEMIN N'EST PAS L'ADRESSE PUBLIQUE. Il ignore la langue : `/actions/aapl` là
 * où le lecteur anglais voit `/stocks/aapl`. C'est ce qu'il faut pour le cache, qui
 * raisonne en routes ; ce n'est PAS ce qu'il faut pour une URL canonique — voir
 * `lib/site.ts`, qui traduit.
 */
export function assetPath(assetClass: AssetClass, id: string): string {
  const route = ASSET_DETAIL_ROUTE[assetClass]
  return route ? route.replace('[id]', encodeURIComponent(id)) : ASSET_CLASS_ROUTE[assetClass]
}

/** Le chemin interne de la page de classe, en chaîne. Même distinction que ci-dessus. */
export function marketPath(assetClass: AssetClass): string {
  return ASSET_CLASS_ROUTE[assetClass]
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
export function marketHref(assetClass: AssetClass): AppHref {
  return ASSET_CLASS_ROUTE[assetClass]
}
