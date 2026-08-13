/**
 * Série historique de la capitalisation globale — CONSTRUITE PAR NOS PROPRES RELEVÉS.
 *
 * Pourquoi ce module existe : aucune source gratuite ne publie l'historique de la
 * capitalisation mondiale. `/global/market_cap_chart` de CoinGecko répond 401 hors
 * offre payante, CoinCap a fermé son accès libre, et Coinpaprika ne fournit
 * d'historique que par actif. Il restait trois options :
 *
 *   1. reconstituer la courbe depuis la capitalisation de Bitcoin divisée par la
 *      dominance actuelle — mais la dominance a bougé sur la période, ce serait donc
 *      une estimation présentée comme une mesure, ce que le §5 interdit ;
 *   2. ne rien afficher ;
 *   3. enregistrer nous-mêmes ce que nous lisons, à chaque relevé.
 *
 * C'est la troisième qui est retenue : chaque point de la courbe est une valeur que
 * nous avons réellement lue chez la source, à un instant daté. Rien n'est interpolé.
 *
 * ⚠️ LIMITE ASSUMÉE : le stockage est en mémoire du processus. La série repart donc
 * de zéro à chaque redémarrage ou déploiement, et n'est pas partagée entre plusieurs
 * instances. La rendre durable suppose la base relationnelle prévue au §4 (Turso),
 * volontairement différée. En attendant, l'interface indique explicitement quand la
 * série est trop courte pour être tracée.
 */

/** Intervalle minimal entre deux points conservés. */
const MIN_SPACING_MS = 4 * 60 * 1000

/** Profondeur conservée : 24 heures, la fenêtre affichée sur la carte d'accueil. */
const RETENTION_MS = 24 * 60 * 60 * 1000

/** Nombre de points en deçà duquel une courbe ne veut rien dire. */
export const MIN_POINTS_FOR_CHART = 6

export interface MarketCapPoint {
  timestamp: number
  value: number
  /**
   * Volume mondial sur 24 h, relevé au même instant que la capitalisation.
   *
   * OPTIONNEL, et pas par excès de prudence : les points enregistrés avant que le
   * volume ne soit relevé n'en portent pas. Une série mixte est donc normale au
   * redémarrage, et le graphique de volume doit écarter ces points plutôt que les
   * lire comme des zéros — un creux à zéro se lirait comme un arrêt du marché.
   */
  volume?: number
  /**
   * Dominance de Bitcoin au même instant, en pourcentage.
   *
   * OPTIONNELLE pour la même raison que le volume : les points enregistrés avant que
   * ce champ n'existe n'en portent pas.
   *
   * ⚠️ C'EST LA SEULE FAÇON HONNÊTE DE TRACER UNE COURBE DE DOMINANCE. La référence en
   * publie une sur plusieurs années ; l'endpoint correspondant de CoinGecko est
   * payant. On pourrait la reconstituer en divisant l'historique de capitalisation de
   * Bitcoin — gratuit — par celui du marché entier, mais ce dernier est précisément ce
   * qui manque : le calculer depuis la dominance ACTUELLE reviendrait à supposer
   * qu'elle n'a pas bougé, c'est-à-dire à supposer la réponse.
   *
   * On enregistre donc ce que la source publie, quand elle le publie. La courbe est
   * courte, et sa profondeur réelle est affichée à côté.
   */
  btcDominance?: number
}

/**
 * Le tampon vit sur `globalThis` pour survivre au rechargement à chaud des modules
 * en développement — sans quoi la série se viderait à chaque sauvegarde de fichier.
 */
const globalForSeries = globalThis as unknown as {
  __zenkuuMarketCapSeries?: Map<string, MarketCapPoint[]>
}

const series: Map<string, MarketCapPoint[]> =
  globalForSeries.__zenkuuMarketCapSeries ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  globalForSeries.__zenkuuMarketCapSeries = series
}

/**
 * Enregistre une observation.
 *
 * Appelé à chaque lecture réussie des statistiques globales. L'espacement minimal
 * évite qu'une rafale de rendus concurrents n'empile dix points identiques à la
 * même seconde, ce qui donnerait une courbe visuellement plate suivie d'un saut.
 */
export function recordMarketCap(
  currency: string,
  value: number,
  at: number = Date.now(),
  volume?: number,
  btcDominance?: number,
): void {
  if (!Number.isFinite(value) || value <= 0) return

  const usableVolume = Number.isFinite(volume) && (volume as number) > 0 ? volume : undefined

  /* La dominance est bornée à ]0, 100] : une valeur hors de cet intervalle ne peut pas
     venir d'une part de marché, et la tracer produirait une courbe dont l'échelle
     écraserait tous les autres points. */
  const usableDominance =
    Number.isFinite(btcDominance) && (btcDominance as number) > 0 && (btcDominance as number) <= 100
      ? btcDominance
      : undefined

  const key = currency.toUpperCase()
  const points = series.get(key) ?? []
  const last = points[points.length - 1]

  if (last && at - last.timestamp < MIN_SPACING_MS) {
    // Trop rapproché du précédent : on met à jour la valeur plutôt que d'ajouter un
    // point, pour que la courbe reflète la dernière lecture sans se densifier.
    last.value = value
    if (usableVolume !== undefined) last.volume = usableVolume
    if (usableDominance !== undefined) last.btcDominance = usableDominance
    return
  }

  const point: MarketCapPoint = { timestamp: at, value }
  if (usableVolume !== undefined) point.volume = usableVolume
  if (usableDominance !== undefined) point.btcDominance = usableDominance

  points.push(point)

  const cutoff = at - RETENTION_MS
  while (points.length > 0 && (points[0] as MarketCapPoint).timestamp < cutoff) {
    points.shift()
  }

  series.set(key, points)
}

/** Série enregistrée pour cette devise, du plus ancien au plus récent. */
export function getMarketCapSeries(currency: string): MarketCapPoint[] {
  return [...(series.get(currency.toUpperCase()) ?? [])]
}

export interface MarketCapSeriesState {
  points: MarketCapPoint[]
  /** Assez de points pour tracer une courbe qui signifie quelque chose ? */
  ready: boolean
  /** Profondeur réellement couverte, en minutes — affichée sous la courbe. */
  spanMinutes: number
}

export function getMarketCapSeriesState(currency: string): MarketCapSeriesState {
  const points = getMarketCapSeries(currency)
  const first = points[0]
  const last = points[points.length - 1]

  return {
    points,
    ready: points.length >= MIN_POINTS_FOR_CHART,
    spanMinutes:
      first && last ? Math.max(0, Math.round((last.timestamp - first.timestamp) / 60_000)) : 0,
  }
}
