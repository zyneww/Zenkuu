import type { MarketAsset } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES DEUX GRANDEURS QUE LA CARTE THERMIQUE CALCULE ELLE-MÊME
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Tout le reste de la figure lit des champs publiés tels quels — capitalisation,
 * volume, variations. Ces deux-là sont DÉRIVÉS, et c'est pourquoi ils vivent ici,
 * en fonctions pures et testées, plutôt qu'en expressions perdues dans le rendu.
 *
 * ⚠️ DÉRIVER N'EST PAS INVENTER, et la limite est nette : on calcule un produit ou un
 * écart-type à partir de nombres que la source a réellement publiés, et l'on rend
 * `undefined` dès qu'un terme manque. Aucune valeur n'est estimée, complétée ou
 * remplacée par une moyenne.
 */

/**
 * Capitalisation TOTALEMENT DILUÉE — le prix appliqué à l'offre maximale.
 *
 * ── POURQUOI ELLE N'EST PAS DANS `MarketAsset` ──────────────────────────────
 *
 * La source la publie sur la FICHE d'un actif (`AssetDetail.fdv`) et pas dans le
 * classement, qui est ce que la carte reçoit. Elle est donc recalculée — c'est une
 * multiplication, exactement celle que fait la source.
 *
 * ── L'OFFRE MAXIMALE, PUIS L'OFFRE TOTALE, ET RIEN D'AUTRE ──────────────────
 *
 * `maxSupply` est la bonne base : c'est le plafond d'émission, ce que « totalement
 * diluée » désigne. Beaucoup de jetons n'en ont pas — leur émission est illimitée —
 * et l'on retombe alors sur `totalSupply`, l'offre déjà créée. C'est la convention
 * de la source, et elle est explicite : sans plafond, la dilution maximale connue
 * est celle d'aujourd'hui.
 *
 * ⚠️ ON NE RETOMBE PAS SUR `circulatingSupply`. Ce troisième repli donnerait la
 * capitalisation ordinaire sous le nom de capitalisation diluée : deux tuiles
 * identiques sous deux étiquettes différentes, ce qui est pire qu'une tuile absente.
 */
export function fullyDilutedValuation(asset: MarketAsset): number | undefined {
  const supply = asset.maxSupply ?? asset.totalSupply
  if (supply === undefined || !Number.isFinite(supply) || supply <= 0) return undefined
  if (!Number.isFinite(asset.price) || asset.price <= 0) return undefined

  return asset.price * supply
}

/**
 * PART de la valorisation diluée déjà comptée dans la capitalisation, en pourcentage
 * (98,5 et non 0,985) — ce que le tableau de cotations affiche à côté de la FDV.
 *
 * Hérite l'indéfini de `fullyDilutedValuation` : sans offre maximale ni totale, il n'y
 * a pas de dénominateur, donc pas de ratio — jamais un 100 % qui affirmerait à tort
 * « toute l'offre circule déjà ».
 */
export function marketCapToFdvShare(asset: MarketAsset): number | undefined {
  const fdv = fullyDilutedValuation(asset)
  if (fdv === undefined || asset.marketCap === undefined) return undefined

  return (asset.marketCap / fdv) * 100
}

/**
 * VOLATILITÉ sur sept jours, en pourcentage.
 *
 * ── CE QU'ELLE MESURE, EXACTEMENT ───────────────────────────────────────────
 *
 * L'écart-type des variations d'un point à l'autre de la courbe de sept jours que la
 * source publie (`sparkline7d`). C'est une mesure de DISPERSION : elle dit de combien
 * le cours bouge d'un relevé au suivant, sans dire dans quel sens.
 *
 * ⚠️ ELLE N'EST PAS ANNUALISÉE, et ne doit pas l'être. Annualiser suppose de connaître
 * le pas de temps de la série — la source ne le garantit pas et l'a déjà changé — et
 * multiplierait le résultat par une racine carrée dont personne ne pourrait vérifier
 * le facteur. Une dispersion brute, comparable d'un actif à l'autre parce qu'ils
 * partagent la même série, dit ce qu'on veut sur une carte : qui bouge beaucoup.
 *
 * ── POURQUOI PAS LA VARIATION DE VOLUME QUE LA RÉFÉRENCE PROPOSE ────────────
 *
 * TradingView colore aussi par variation du volume. Elle exigerait le volume d'HIER,
 * qu'aucune de nos sources ne publie dans le classement — ni en champ, ni en série.
 * Le calculer demanderait de conserver nous-mêmes un historique de volume. L'option
 * est donc absente plutôt qu'approchée.
 *
 * Rend `undefined` quand la série manque ou compte moins de deux points : une
 * volatilité de zéro se lirait comme « ce jeton ne bouge pas », ce qui est une
 * affirmation, là où l'absence de série n'en est pas une.
 */
export function volatility7d(asset: MarketAsset): number | undefined {
  const series = asset.sparkline7d
  if (!series || series.length < 3) return undefined

  const returns: number[] = []
  for (let i = 1; i < series.length; i += 1) {
    const previous = series[i - 1]
    const current = series[i]
    /* Un point nul ou absent casserait le rapport : on saute le couple plutôt que
       d'introduire un infini qui écraserait l'échelle de toute la carte. */
    if (previous === undefined || current === undefined || previous <= 0) continue
    returns.push((current - previous) / previous)
  }

  if (returns.length < 2) return undefined

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1)

  return Math.sqrt(variance) * 100
}
