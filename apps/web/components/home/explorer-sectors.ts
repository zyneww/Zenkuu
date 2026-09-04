import type { MarketAsset, MarketCategory } from '@zenkuu/data'

/* Chemins RELATIFS et non l'alias `@/` : le dépôt lance Vitest sans configuration, donc
   sans résolution de l'alias, et un module importé par un test doit rester chargeable
   tel quel. Même convention que `components/tools/treemap.test.ts`. */
import { assetHref } from '../../lib/asset-routes'
import type { SectorNode } from './SectorMap'

/**
 * Regroupement des actifs par secteur — la seule vraie logique de l'accueil, et donc
 * la seule à vivre hors du composant qui l'affiche.
 *
 * Elle est extraite de `ExplorerOverview` pour être VÉRIFIABLE : trois règles s'y
 * croisent (déduplication, secteur vide écarté, surface sommée), et un composant
 * serveur qui appelle le réseau n'est pas un endroit où l'on peut les éprouver. Voir
 * le fichier de test voisin.
 */

/**
 * Construit les groupes de la carte des secteurs.
 *
 * ── TROIS RÈGLES, ET CHACUNE CORRIGE UN DÉFAUT CONSTATÉ ──────────────────────
 *
 *   1. UN ACTIF N'APPARAÎT QU'UNE FOIS. Les catégories de la source se recouvrent
 *      largement — Bitcoin figure dans « Layer 1 », « Proof of Work » et « Smart
 *      Contract Platform ». Rendues telles quelles, la figure montrait trois grandes
 *      tuiles Bitcoin côte à côte, lecture fausse au premier coup d'œil puisqu'une
 *      carte de surfaces se lit comme une partition. Chaque actif va donc au premier
 *      secteur qui le réclame, c'est-à-dire au PLUS GRAND, la liste étant triée.
 *
 *   2. UN SECTEUR SANS ACTIF PROPRE EST SAUTÉ. Conséquence directe de la règle 1 :
 *      les huit plus gros secteurs s'illustrent tous par Bitcoin, Ethereum et Tether,
 *      et les sept suivants n'avaient donc plus rien à montrer. On parcourt la liste
 *      ENTIÈRE plutôt que ses `limit` premiers, et on ne retient que les secteurs qui
 *      gardent une tuile à eux.
 *
 *   3. LA SURFACE D'UN GROUPE EST LA SOMME DE SES TUILES. Prendre la capitalisation
 *      publiée du secteur donnait des groupes dont les trois actifs connus
 *      n'occupaient parfois que 2 % : sept huitièmes de surface anonyme, et des
 *      secteurs échelonnés de 2 250 à 30 milliards qui écrasaient les derniers en
 *      liserés illisibles. Sommer les tuiles rend la carte vraie : « voici les
 *      principaux actifs, rangés par secteur, à l'échelle les uns des autres ».
 *
 * `floor` écarte les secteurs trop petits pour que leur intitulé signifie quelque
 * chose — le même plancher que celui de `/categories`.
 */
export function buildSectors(
  categories: MarketCategory[],
  assets: MarketAsset[],
  { limit, floor }: { limit: number; floor: number },
): SectorNode[] {
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const placed = new Set<string>()
  const sectors: SectorNode[] = []

  const ranked = categories
    .filter((category) => (category.marketCap ?? 0) >= floor)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))

  for (const category of ranked) {
    if (sectors.length >= limit) break

    const own = (category.topAssetIds ?? []).flatMap((id) => {
      const asset = byId.get(id)
      if (!asset || (asset.marketCap ?? 0) <= 0 || placed.has(id)) return []

      return [
        {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          href: assetHref(asset.assetClass, asset.id),
          ...(asset.image ? { image: asset.image } : {}),
          marketCap: asset.marketCap as number,
          ...(asset.volume24h !== undefined ? { volume24h: asset.volume24h } : {}),
          ...(asset.change24h !== undefined ? { change24h: asset.change24h } : {}),
        },
      ]
    })

    if (own.length === 0) continue

    /* Marqués APRÈS avoir décidé de garder le secteur : marqués pendant la collecte,
       un secteur écarté aurait tout de même consommé ses actifs, et le suivant serait
       écarté à son tour par un secteur qui ne s'affiche nulle part. */
    for (const asset of own) placed.add(asset.id)

    sectors.push({
      id: category.id,
      name: category.name,
      href: { pathname: '/categories/[id]', params: { id: category.id } },
      marketCap: own.reduce((sum, asset) => sum + asset.marketCap, 0),
      volume24h: own.reduce((sum, asset) => sum + (asset.volume24h ?? 0), 0),
      assets: own,
    })
  }

  return sectors
}

/**
 * Dérive une variation de la SÉRIE MAISON, quand la source n'en publie pas.
 *
 * La capitalisation totale vient avec sa variation sur 24 h ; le volume mondial et la
 * dominance, non. Plutôt qu'un tiret sous deux cartes sur trois, on lit l'écart entre
 * le premier et le dernier de nos propres relevés — ce qui est une mesure et non une
 * estimation, à condition de dire sur quelle profondeur elle porte. C'est le rôle de
 * `spanMinutes`, repris dans le libellé de la carte.
 *
 * Rend `undefined` sous deux points ou sur un premier relevé nul : un pourcentage
 * calculé sur un seul point, ou divisé par zéro, serait un nombre inventé (§5).
 */
export function drift(points: number[]): number | undefined {
  const first = points[0]
  const last = points[points.length - 1]
  if (first === undefined || last === undefined || points.length < 2 || first === 0) return undefined
  return ((last - first) / first) * 100
}
