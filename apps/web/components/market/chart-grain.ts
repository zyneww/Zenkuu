/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA GRANULARITÉ DES CARTES DE MARCHÉ — L'ARITHMÉTIQUE, SÉPARÉE DU RENDU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Ce module vit à part de `GlobalChartCard` pour la raison exacte qui a fait sortir
 * `series-grouping.ts` de `AssetSeriesCards` : l'outil de test ne lit pas le JSX de ce
 * dépôt, et un test posé sur le composant échoue à l'analyse d'import avant la moindre
 * assertion.
 *
 * ⚠️ ET LE BESOIN DE TEST N'EST PAS THÉORIQUE. La première version du regroupement des
 * fiches d'actif groupait en UTC et libellait en heure locale : elle produisait deux
 * barres mensuelles portant toutes deux « sept. 26 ». Aucun typage ne l'aurait trouvé —
 * il a fallu le voir à l'écran. Ce fichier-ci naît donc déjà couvert.
 */

import type { GlobalChartPoint } from './GlobalChartCard'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA GRANULARITÉ — CE QUE LE SÉLECTEUR DE PÉRIODE NE PEUT PAS FAIRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La carte portait déjà un sélecteur de PÉRIODE (24H → MAX), qui répond à « sur
 * combien de temps ». Celui-ci répond à une autre question : « à quel pas ».
 *
 * ── POURQUOI LES DEUX, ALORS QUE C'EST DEUX FOIS DU TEMPS ─────────────────
 *
 * Parce qu'ils ne se remplacent pas. Sur la série des stablecoins, qui remonte à 2017,
 * « MAX » trace plus de trois mille points quotidiens dans huit cents pixels : chaque
 * barre fait moins d'un quart de pixel, et la figure devient un aplat dont on ne lit
 * plus ni les creux ni les pics. Réduire la PÉRIODE pour retrouver la forme fait perdre
 * l'histoire, qui est justement ce qu'on venait voir.
 *
 * Le regroupement mensuel garde les huit ans ET rend la silhouette. C'est ce que fait
 * la référence avec son « Daily ▾ ».
 *
 * ⚠️ « AUTOMATIQUE » EST LE DÉFAUT, ET CE N'EST PAS DE LA PARESSE. Le bon pas dépend de
 * la fenêtre ET de la densité de la série, deux choses que la carte connaît et pas le
 * lecteur. Lui imposer de choisir avant d'avoir vu reviendrait à lui demander de
 * résoudre un problème qu'il n'a pas encore. Les trois autres entrées restent, pour
 * qui veut forcer.
 */
export type Grain = 'auto' | 'jour' | 'semaine' | 'mois'

export const GRAINS: { id: Grain; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
]

/**
 * Pas retenu quand le lecteur laisse « Auto ».
 *
 * ⚠️ LE SEUIL EST UN NOMBRE DE POINTS, PAS UNE DURÉE. Une règle du genre « au-delà
 * d'un an, on groupe par mois » se tromperait dans les deux sens : une série
 * hebdomadaire sur trois ans ne fait que cent cinquante points et n'a rien à grouper,
 * tandis qu'une série horaire sur deux mois en fait quinze cents et étouffe.
 *
 * 400 est la densité au-delà de laquelle une barre passe sous deux pixels dans un
 * cadre de huit cents — c'est-à-dire au-delà de laquelle elle cesse d'être lisible.
 */
export function autoGrain(points: GlobalChartPoint[]): Exclude<Grain, 'auto'> {
  if (points.length <= 400) return 'jour'
  /* On regarde d'abord si le pas hebdomadaire suffit : passer directement au mois
     écraserait inutilement une série de deux ans. */
  const parSemaine = Math.ceil(points.length / 7)
  return parSemaine <= 400 ? 'semaine' : 'mois'
}

/**
 * Regroupe les points par pas de temps.
 *
 * ⚠️ LE REGROUPEMENT EST EN HEURE LOCALE, DE BOUT EN BOUT — clé ET libellé. C'est la
 * leçon d'un défaut corrigé sur les cartes de séries des fiches d'actif : grouper en
 * UTC et libeller en heure locale y produisait deux barres mensuelles portant toutes
 * deux « sept. 26 ». Voir `components/asset/series-grouping.ts`, dont six tests
 * couvrent la même arithmétique.
 *
 * ⚠️ ET LA VALEUR RETENUE EST LA DERNIÈRE DE LA PÉRIODE, JAMAIS LA SOMME. Toutes les
 * séries de cette carte sont des ÉTATS — une capitalisation, une part, un cours — qui
 * existent à chaque instant. Les additionner sur sept jours donnerait un nombre sept
 * fois trop grand ayant toutes les apparences d'une donnée. Un volume quotidien, lui,
 * se sommerait ; aucune série de cette page n'en est un.
 */
export function groupBy(points: GlobalChartPoint[], grain: Exclude<Grain, 'auto'>): GlobalChartPoint[] {
  if (grain === 'jour' || points.length === 0) return points

  const cle = (t: number) => {
    const date = new Date(t)
    if (grain === 'mois') return `${date.getFullYear()}-${date.getMonth()}`
    const minuit = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    /* Le lundi de la semaine. `getDay()` rend 0 pour dimanche : le décalage de six
       jours le rattache à la semaine écoulée plutôt qu'à la suivante. */
    const jour = minuit.getDay()
    minuit.setDate(minuit.getDate() - (jour === 0 ? 6 : jour - 1))
    return String(minuit.getTime())
  }

  const paquets = new Map<string, GlobalChartPoint>()
  for (const point of points) {
    /* Les points arrivent triés : écraser à chaque passage laisse LE DERNIER de la
       période, qui est la valeur cherchée. */
    paquets.set(cle(point.t), point)
  }
  return [...paquets.values()]
}
