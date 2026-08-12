/**
 * Statistiques dérivées d'une série de cours.
 *
 * ── POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST PUR ────────────────────────
 *
 * Volatilité, perte maximale, rendements mensuels : aucune source gratuite ne les
 * publie. Elles sont pourtant affichables sans enfreindre le §5, parce qu'elles ne
 * sont pas des ESTIMATIONS mais des CALCULS — des fonctions déterministes de prix
 * réellement publiés, au même titre qu'une variation en pourcentage. La frontière
 * est nette : on ne devine aucune valeur manquante, on résume des valeurs connues.
 *
 * Tout est ici plutôt que dans les composants pour une raison simple : ce sont les
 * seuls chiffres de la fiche que nous produisons nous-mêmes. S'ils sont faux,
 * personne en amont ne nous corrigera. Ils doivent donc être testables sans monter
 * un rendu React — d'où des fonctions pures, sans dépendance, sur des tableaux nus.
 *
 * ── LA CONVENTION DE RETOUR ───────────────────────────────────────────────────
 *
 * `undefined` quand la série ne permet pas le calcul, JAMAIS zéro ni `NaN`. Une
 * volatilité inconnue et une volatilité nulle sont deux affirmations différentes, et
 * la seconde est spectaculairement fausse. C'est la même règle que celle qui régit
 * les champs absents chez les fournisseurs.
 */

export interface SeriesPoint {
  timestamp: number
  price: number
  volume?: number
  marketCap?: number
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Intervalle d'échantillonnage MÉDIAN de la série, en millisecondes.
 *
 * Médian et non moyen, et ce n'est pas un détail de statisticien : les sources
 * changent de pas selon la fenêtre demandée — CoinGecko sert de l'horaire en deçà de
 * 90 jours et du quotidien au-delà — et laissent parfois des trous. Une moyenne
 * qu'un seul trou de trois jours déplacerait ferait passer une série horaire pour
 * une série quotidienne, et l'annualisation qui en dépend serait fausse d'un
 * facteur cinq.
 */
function medianInterval(points: SeriesPoint[]): number | undefined {
  if (points.length < 3) return undefined

  const gaps: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    const gap = points[index]!.timestamp - points[index - 1]!.timestamp
    if (gap > 0) gaps.push(gap)
  }

  if (gaps.length === 0) return undefined
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)]
}

/**
 * Volatilité annualisée, en pourcentage.
 *
 * Écart-type des rendements LOGARITHMIQUES, annualisé par la racine du nombre de
 * périodes dans l'année. Le log plutôt que la variation simple parce que les
 * rendements composés s'additionnent en log : sans cela, une hausse de 50 % suivie
 * d'une baisse de 50 % — qui ramène à 75 % du point de départ — compterait comme
 * deux mouvements symétriques.
 *
 * Le nombre de périodes est DÉDUIT de la série (voir `medianInterval`) et non
 * supposé. Une série horaire annualisée comme si elle était quotidienne donnerait
 * une volatilité cinq fois trop faible.
 */
export function annualizedVolatility(points: SeriesPoint[]): number | undefined {
  const interval = medianInterval(points)
  if (interval === undefined) return undefined

  const returns: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!.price
    const current = points[index]!.price
    if (previous > 0 && current > 0) returns.push(Math.log(current / previous))
  }

  // Deux points donnent un rendement, et un rendement n'a pas d'écart-type
  // échantillonnal (le dénominateur n − 1 serait nul).
  if (returns.length < 2) return undefined

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1)

  const periodsPerYear = YEAR_MS / interval
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear) * 100
}

export interface Drawdown {
  /** Profondeur en pourcentage, toujours POSITIVE — c'est une perte, pas une variation. */
  depthPercent: number
  /** Horodatage du sommet précédant la chute. */
  peakAt: number
  /** Horodatage du creux. */
  troughAt: number
}

/**
 * Perte maximale — la plus forte baisse entre un sommet et un creux ultérieur.
 *
 * Ce n'est PAS l'écart entre le plus haut et le plus bas de la période : le creux
 * doit venir APRÈS le sommet. Un actif qui touche son plus bas en janvier puis son
 * plus haut en décembre n'a jamais fait perdre l'écart entre les deux à quiconque —
 * la mesure répond à « quelle est la pire chose qui soit arrivée à qui a acheté au
 * pire moment », et l'ordre chronologique en est toute la substance.
 */
export function maxDrawdown(points: SeriesPoint[]): Drawdown | undefined {
  if (points.length < 2) return undefined

  let peak = points[0]!.price
  let peakAt = points[0]!.timestamp
  let bestDepth = 0
  let bestPeakAt = peakAt
  let bestTroughAt = peakAt

  for (const point of points) {
    if (point.price > peak) {
      peak = point.price
      peakAt = point.timestamp
      continue
    }

    if (peak <= 0) continue
    const depth = ((peak - point.price) / peak) * 100
    if (depth > bestDepth) {
      bestDepth = depth
      bestPeakAt = peakAt
      bestTroughAt = point.timestamp
    }
  }

  if (bestDepth <= 0) return undefined
  return { depthPercent: bestDepth, peakAt: bestPeakAt, troughAt: bestTroughAt }
}

/**
 * Plus haut et plus bas sur les N derniers jours de la série.
 *
 * La fenêtre est comptée depuis le DERNIER point de la série et non depuis
 * l'horloge : une série qui s'arrête il y a deux jours doit rendre ses sept derniers
 * jours de données, pas cinq jours de données et deux de vide.
 */
export function windowRange(
  points: SeriesPoint[],
  days: number,
): { low: number; high: number } | undefined {
  if (points.length === 0) return undefined

  const last = points[points.length - 1]!.timestamp
  const from = last - days * DAY_MS
  const inWindow = points.filter((point) => point.timestamp >= from)
  if (inWindow.length < 2) return undefined

  let low = inWindow[0]!.price
  let high = low
  for (const point of inWindow) {
    if (point.price < low) low = point.price
    if (point.price > high) high = point.price
  }

  return low < high ? { low, high } : undefined
}

export interface MonthlyReturn {
  year: number
  /** Mois de 0 à 11, comme `Date.getUTCMonth`. */
  month: number
  changePercent: number
}

/**
 * Rendement mois par mois.
 *
 * Le rendement d'un mois est calculé de sa DERNIÈRE clôture à celle du mois
 * précédent, et non de sa première à sa dernière. La différence n'est pas
 * cosmétique : enchaîner des rendements « premier→dernier » perd le saut entre la
 * clôture d'un mois et l'ouverture du suivant, si bien que la composition des douze
 * mois ne redonne pas le rendement de l'année. Avec des clôtures consécutives, elle
 * le redonne exactement.
 *
 * Conséquence assumée : le premier mois de la série n'a pas de rendement, faute de
 * clôture antérieure. Il est OMIS plutôt que rendu à zéro.
 *
 * Tout est en UTC. Les mois d'une série mondiale ne peuvent pas dépendre du fuseau
 * du lecteur, sans quoi deux visiteurs verraient deux grilles différentes.
 */
export function monthlyReturns(points: SeriesPoint[]): MonthlyReturn[] {
  if (points.length < 2) return []

  // Dernière clôture connue de chaque mois. La série est supposée chronologique —
  // elle l'est chez tous nos fournisseurs — donc la dernière écriture gagne.
  const closes = new Map<string, { year: number; month: number; price: number }>()
  for (const point of points) {
    const date = new Date(point.timestamp)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    closes.set(`${year}-${month}`, { year, month, price: point.price })
  }

  const ordered = [...closes.values()].sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year,
  )

  const results: MonthlyReturn[] = []
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!
    const current = ordered[index]!
    if (previous.price <= 0) continue
    results.push({
      year: current.year,
      month: current.month,
      changePercent: ((current.price - previous.price) / previous.price) * 100,
    })
  }

  return results
}

/**
 * Série ramenée en base 100 à son premier point.
 *
 * C'est ce qui rend deux actifs comparables sur un même axe : un jeton à 54 $ et un
 * bitcoin à 64 000 $ tracés en valeur absolue écrasent le premier sur la ligne du
 * bas. En base 100, seule la FORME compte, ce qui est précisément la question posée
 * quand on superpose deux courbes.
 */
export function base100(points: SeriesPoint[]): { timestamp: number; value: number }[] {
  const first = points.find((point) => point.price > 0)
  if (!first) return []
  return points.map((point) => ({
    timestamp: point.timestamp,
    value: (point.price / first.price) * 100,
  }))
}

/**
 * Rendement total de la série, en pourcentage.
 *
 * Sur toute la série si `days` est omis, sinon sur ses N derniers jours.
 */
export function totalReturnPercent(points: SeriesPoint[], days?: number): number | undefined {
  if (points.length < 2) return undefined

  const last = points[points.length - 1]!
  const from = days === undefined ? -Infinity : last.timestamp - days * DAY_MS
  const first = points.find((point) => point.timestamp >= from && point.price > 0)

  if (!first || first === last || first.price <= 0) return undefined
  return ((last.price - first.price) / first.price) * 100
}
