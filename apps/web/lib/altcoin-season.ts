import type { MarketAsset } from '@zenkuu/data'

/**
 * Les stablecoins ÉCARTÉS du comptage, par identifiant de la source.
 *
 * ⚠️ LISTE EXPLICITE, ET C'EST SA LIMITE CONNUE. Aucune de nos sources ne marque un
 * actif comme « stablecoin » dans la réponse de classement : il n'y a donc rien à
 * filtrer par attribut, et un critère déduit — « prix proche de 1, variation
 * proche de 0 » — écarterait au passage tout altcoin calme coté autour d'un euro.
 *
 * Les écarter compte parce que la variation d'un stablecoin ne mesure rien : elle
 * dit l'écart à son ancrage, pas une performance. Une dizaine d'entre eux figurent
 * dans les cent premières capitalisations ; les laisser dedans reviendrait à compter
 * dix actifs qui, par construction, ne font jamais mieux que Bitcoin en marché
 * haussier et le battent toujours en marché baissier.
 *
 * La liste couvre ceux qui atteignent réellement le haut du classement. Un nouveau
 * venu manquant fausse le comptage d'un point sur cent — c'est la marge d'erreur
 * assumée, et elle se corrige en ajoutant une ligne.
 */
/* Exportée pour la carte thermique, qui en fait DEUX usages : un filtre d'univers
   (« sans stablecoins ») et une teinte neutre — la variation d'un jeton ancré ne
   mesure pas une performance, la peindre en vert ou en rouge la ferait lire comme
   telle. Une seconde liste vivrait sa vie et divergerait de celle-ci. */
export const STABLECOIN_IDS = new Set([
  'tether',
  'usd-coin',
  'dai',
  'ethena-usde',
  'first-digital-usd',
  'usds',
  'paypal-usd',
  'true-usd',
  'binance-usd',
  'blackrock-usd-institutional-digital-liquidity-fund',
  'usdd',
  'frax',
])

/**
 * Le comptage lui-même — partagé par la VUE complète de `/graphiques`, par sa carte
 * de synthèse, et par la vignette de l'accueil.
 *
 * ⚠️ IL VIT DANS `lib/` ET PLUS DANS LA PAGE. Il y était privé, et la vignette
 * d'accueil aurait donc dû en recopier une seconde version : deux copies d'un
 * comptage finissent par diverger, et le site porterait alors deux chiffres
 * différents sous le même nom à deux endroits.
 *
 * Rend `null` quand l'indice n'a pas de sens : sans variation de Bitcoin, il n'y a
 * pas de référence à laquelle comparer, et l'indice n'est pas « à zéro » — il
 * n'existe pas. Un zéro se lirait comme la saison de Bitcoin la plus marquée
 * possible (§5).
 */
export function computeAltcoinSeason(assets: readonly MarketAsset[]): {
  value: number
  ahead: MarketAsset[]
  contenders: MarketAsset[]
  reference: number
} | null {
  const reference = assets.find((asset) => asset.id === 'bitcoin')?.change30d
  if (reference === undefined || !Number.isFinite(reference)) return null

  const contenders = assets.filter(
    (asset) =>
      asset.id !== 'bitcoin' &&
      !STABLECOIN_IDS.has(asset.id) &&
      typeof asset.change30d === 'number' &&
      Number.isFinite(asset.change30d),
  )
  if (contenders.length === 0) return null

  const ahead = contenders.filter((asset) => (asset.change30d as number) > reference)

  return { value: (ahead.length / contenders.length) * 100, ahead, contenders, reference }
}
