import type { PriceHistory } from '@zenkuu/data'

import type { ChartCandle } from './PriceChartInteractive'

/**
 * Fusion d'une donnée EN DIRECT dans une série déjà constituée.
 *
 * ── POURQUOI CES DEUX FONCTIONS VIVENT HORS DU COMPOSANT ──────────────────────
 *
 * Elles décident, à chaque message reçu, s'il faut allonger la série, en remplacer
 * la fin, ou ne rien faire. Les cas qui les mettent en défaut sont ceux qu'on ne
 * rencontre qu'au bout de plusieurs minutes d'observation — une horloge de source en
 * retard, une reconnexion qui rejoue une bougie, un pas quotidien qu'un relevé à la
 * seconde vient trancher. Les reproduire dans un navigateur demanderait d'attendre
 * qu'ils surviennent ; isolées ici, sans React ni réseau, les règles s'éprouvent
 * directement (voir `live-series.test.ts`).
 *
 * C'est le même motif que `components/nav/presence.ts`, et pour la même raison.
 */

export interface LivePoint {
  timestamp: number
  price: number
}

/**
 * Écart au-delà duquel un cours « en direct » est tenu pour suspect.
 *
 * Vingt pour cent d'écart avec le dernier point connu ne décrit pas un mouvement de
 * marché sur quelques minutes : l'hypothèse la plus probable est une paire homonyme
 * — une place cotant sous le même symbole un jeton qui n'est pas le nôtre. Mieux
 * vaut une courbe qui s'arrête un peu tôt qu'une courbe qui ment (§5).
 */
const MAX_LIVE_DEVIATION = 0.2

/**
 * Prolonge une série jusqu'au cours en direct.
 *
 * Trois refus, et chacun écarte un défaut visible :
 *
 * 1. Un direct ANTÉRIEUR au dernier point ferait revenir la courbe sur elle-même.
 *    lightweight-charts exige des horodatages strictement croissants et rejetterait
 *    la série entière — donc un graphique vide, pas un simple point mal placé.
 *
 * 2. Un direct trop PROCHE du dernier point, sur une série à pas large, créerait un
 *    dernier segment mille fois plus court que les autres : un décrochage vertical
 *    qui se lit comme un mouvement de marché alors qu'il ne décrit qu'un changement
 *    de résolution. On remplace alors le dernier point au lieu d'en ajouter un.
 *
 * 3. Un direct trop ÉLOIGNÉ en valeur désigne presque toujours un homonyme.
 */
export function appendLivePoint(history: PriceHistory, live: LivePoint | null): PriceHistory {
  if (!live) return history

  const points = history.points
  const last = points[points.length - 1]
  if (!last || live.timestamp <= last.timestamp) return history

  if (last.price > 0 && Math.abs(live.price - last.price) / last.price > MAX_LIVE_DEVIATION) {
    return history
  }

  // Pas de la série, MESURÉ sur ses deux derniers points plutôt que déduit de la
  // période demandée : c'est la source qui choisit sa granularité, pas nous.
  const previous = points[points.length - 2]
  const step = previous ? last.timestamp - previous.timestamp : 0
  const replaceLast = step > 0 && live.timestamp - last.timestamp < step

  const extended = replaceLast ? points.slice(0, -1) : points.slice()
  // Les champs annexes du dernier point sont conservés — le volume notamment : les
  // effacer ferait disparaître la dernière barre du sous-panneau à chaque tic.
  extended.push({ ...last, timestamp: live.timestamp, price: live.price })

  return { ...history, points: extended }
}

/**
 * Restreint une série à un intervalle de dates.
 *
 * ── POURQUOI CE DÉCOUPAGE EXISTE ─────────────────────────────────────────────
 *
 * `/api/historique` ne comprend qu'une PROFONDEUR — un nombre de jours depuis
 * aujourd'hui — jamais deux dates. Demander « du 3 au 10 mars » revient donc à charger
 * tout depuis le 3 mars, et sans ce découpage la fiche affichait tout jusqu'à
 * aujourd'hui : une fenêtre de sept jours devenait deux ans.
 *
 * ── LES BORNES SONT DES JOURS, PAS DES INSTANTS ──────────────────────────────
 *
 * Elles arrivent en ISO court (`2026-03-10`), qui désigne minuit. Prise telle quelle,
 * la borne de fin exclurait la journée qu'elle nomme — on demanderait « jusqu'au 10 »
 * et l'on obtiendrait « jusqu'au 9 au soir ». On l'étend donc à la fin de ce jour-là.
 *
 * ── ET UN DÉCOUPAGE VIDE EST IGNORÉ ──────────────────────────────────────────
 *
 * Moins de deux points ne fait pas une courbe. Plutôt qu'un cadre vide, on rend la
 * série entière : c'est le cas d'un intervalle tombé entre deux relevés, et montrer
 * trop vaut mieux que ne rien montrer sans rien dire.
 */
export function clipToRange(
  history: PriceHistory,
  range: { from: string; to: string } | null,
): PriceHistory {
  if (!range) return history

  const from = Date.parse(range.from)
  const to = Date.parse(range.to)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return history

  const end = to + 86_399_999
  const points = history.points.filter(
    (point) => point.timestamp >= from && point.timestamp <= end,
  )

  return points.length > 1 ? { ...history, points } : history
}

/**
 * Insère une bougie poussée par un flux — remplacement OU ajout, jamais les deux.
 *
 * Une place réécrit la bougie courante tant que son intervalle n'est pas clos, puis
 * passe à la suivante. La règle est donc dictée par l'HORODATAGE et non par l'ordre
 * d'arrivée : même horodatage que la dernière, on la remplace ; postérieur, on
 * ajoute. Se fier à l'ordre d'arrivée empilerait des dizaines de copies de la même
 * minute, et le graphique refuserait la série pour horodatages non croissants.
 *
 * Un message EN RETARD — le cas d'une reconnexion qui rejoue la bougie précédente —
 * est ignoré : réécrire l'avant-dernière ferait sauter la courbe en arrière.
 */
export function mergeCandle(
  candles: ChartCandle[],
  incoming: ChartCandle,
  maxLength: number,
): ChartCandle[] {
  const last = candles[candles.length - 1]
  if (!last) return [incoming]

  if (incoming.timestamp === last.timestamp) return [...candles.slice(0, -1), incoming]
  if (incoming.timestamp < last.timestamp) return candles

  // Fenêtre glissante : sans plafond, un onglet laissé ouvert une journée accumule
  // les bougies jusqu'à ralentir le rendu.
  const extended = [...candles, incoming]
  return extended.length > maxLength ? extended.slice(-maxLength) : extended
}
