/**
 * Alignement de séries de longueurs et de durées différentes, pour les superposer.
 *
 * ── LE PROBLÈME QUE CE MODULE RÉSOUT ─────────────────────────────────────────
 *
 * Le comparateur superposait ses courbes PAR RANG : premier point contre premier
 * point, deuxième contre deuxième. C'était juste tant qu'il ne comparait que des
 * cryptomonnaies, dont les séries viennent toutes du même endpoint avec le même pas.
 *
 * Dès qu'on y ajoute une action, c'est faux. Une crypto porte 168 relevés horaires sur
 * sept jours ; une action, 22 clôtures quotidiennes sur un mois ; une paire de devises,
 * neuf taux sur douze jours. Aligner leurs rangs revient à tracer une semaine et six
 * semaines sur le même axe, et à lire comme simultanés des points séparés de plusieurs
 * jours.
 *
 * ── CE QU'IL FAIT À LA PLACE ─────────────────────────────────────────────────
 *
 * 1. Chaque série est DATÉE. Elle n'arrive pas horodatée, mais sa durée est déclarée
 *    par le fournisseur (`sparklineSpanDays`) et son pas est régulier : le dernier
 *    point vaut « maintenant », le premier « maintenant moins la durée », et les
 *    autres se répartissent entre les deux.
 *
 * 2. La fenêtre commune est la PLUS COURTE des durées. C'est le seul intervalle que
 *    toutes couvrent réellement ; l'étendre obligerait à inventer le début des séries
 *    les plus courtes.
 *
 * 3. Toutes sont rééchantillonnées sur une grille unique, chaque instant prenant la
 *    dernière valeur CONNUE à cette date. Une série quotidienne vue sur sept jours
 *    devient un escalier — c'est exactement ce qu'elle est : entre deux clôtures, le
 *    dernier cours connu ne change pas.
 *
 * 4. Chacune repart de 100 au premier instant de la fenêtre, et non à son propre
 *    premier point. Rebaser ailleurs ferait démarrer les courbes à des hauteurs
 *    différentes, ce qui annulerait tout l'intérêt de la base commune.
 *
 * ── L'AXE EST EN JOURS RELATIFS, ET PAS EN HORODATAGES ───────────────────────
 *
 * `x` compte les JOURS AVANT MAINTENANT : `-7` pour il y a une semaine, `0` pour le
 * dernier relevé. Deux raisons, dont la seconde est décisive.
 *
 *   · Les sources ne datent pas ces séries. Fabriquer des horodatages absolus à partir
 *     d'une durée déclarée donnerait des dates à la minute près qu'aucune source n'a
 *     jamais publiées — précises en apparence, inventées en fait.
 *
 *   · Lire l'horloge rendrait ce module IMPUR, donc non testable, et exposerait la page
 *     à un écart d'hydratation : le serveur et le navigateur ne rendent pas au même
 *     instant, et l'axe changerait entre les deux. Le compilateur React refuse
 *     d'ailleurs `Date.now()` pendant le rendu.
 *
 * ── POURQUOI UN FICHIER SÉPARÉ ───────────────────────────────────────────────
 *
 * Pour l'éprouver. L'exécuteur de tests refuse d'analyser un module contenant du JSX,
 * et cette logique est précisément celle qui se trompe d'une unité aux bornes.
 */

export interface RawSeries {
  id: string
  /** Relevés dans l'ordre chronologique, le dernier étant le plus récent. */
  values: number[]
  /** Durée réellement couverte, en jours. */
  spanDays: number
}

export interface AlignedSeries {
  id: string
  /** `x` en jours avant maintenant (négatif), `y` en base 100. */
  points: { x: number; y: number }[]
}

export interface Alignment {
  /** Durée de la fenêtre commune, en jours. */
  windowDays: number
  series: AlignedSeries[]
}

/**
 * Nombre d'instants de la grille commune.
 *
 * Assez pour qu'une courbe horaire reste lisse sur mille pixels de large, pas assez
 * pour que le tracé coûte quoi que ce soit. Monter à la résolution de la série la plus
 * fine ne gagnerait rien : à 168 points sur 900 pixels, deux relevés voisins tombent
 * déjà à moins de six pixels l'un de l'autre.
 */
const GRID_POINTS = 60

export function alignSeries(inputs: RawSeries[]): Alignment | null {
  const usable = inputs.filter((entry) => entry.values.length > 1 && entry.spanDays > 0)
  if (usable.length === 0) return null

  const windowDays = Math.min(...usable.map((entry) => entry.spanDays))

  /* Grille en jours relatifs : de `-windowDays` à `0`, bornes comprises. */
  const grid = Array.from(
    { length: GRID_POINTS },
    (_, index) => -windowDays + (windowDays * index) / (GRID_POINTS - 1),
  )

  const series: AlignedSeries[] = []

  for (const entry of usable) {
    /*
     * Position du point de rang `index`, en jours avant maintenant.
     *
     * Le pas est supposé RÉGULIER, ce que les trois sources garantissent chacune à sa
     * façon : relevés horaires pour l'une, clôtures quotidiennes pour les deux autres.
     * Les jours fériés créent bien des trous chez ces dernières, mais ils décalent les
     * points de quelques heures sur une fenêtre qui se compte en jours — l'écart est
     * inférieur à la largeur d'un pixel.
     */
    const step = entry.spanDays / (entry.values.length - 1)

    /*
     * Valeur connue à l'instant `t` (jours avant maintenant, donc négatif).
     *
     * On prend le dernier point dont la date est INFÉRIEURE OU ÉGALE à `t`, jamais le
     * plus proche : le plus proche peut être postérieur, et lire une clôture de demain
     * sous la date d'aujourd'hui est un anachronisme, pas un arrondi.
     *
     * La fenêtre commune étant la plus courte des durées, `t` tombe toujours après le
     * début de chaque série : le rang calculé n'est jamais négatif.
     */
    const valueAt = (t: number): number | undefined => {
      const rank = Math.min(entry.values.length - 1, Math.floor((t + entry.spanDays) / step))
      return entry.values[Math.max(0, rank)]
    }

    const base = valueAt(grid[0] as number)
    // Une base nulle ou absente rendrait tout le reste infini : la série est écartée
    // plutôt que tracée à côté des autres avec des valeurs inventées.
    if (base === undefined || base === 0) continue

    const points = grid
      .map((t) => {
        const value = valueAt(t)
        return value === undefined ? null : { x: t, y: (value / base) * 100 }
      })
      .filter((point): point is { x: number; y: number } => point !== null)

    if (points.length > 1) series.push({ id: entry.id, points })
  }

  return series.length > 0 ? { windowDays, series } : null
}

/** Durée de la fenêtre, en clair, pour la légende sous le graphique. */
export function windowLabel(days: number): string {
  if (days <= 1) return '24 heures'
  if (days < 14) return `${days} jours`
  if (days < 60) return `${Math.round(days / 7)} semaines`
  return `${Math.round(days / 30)} mois`
}

/**
 * Graduation de l'axe des abscisses.
 *
 * `J-6`, et non une date : la source ne date pas ces séries, et écrire « 7 août »
 * donnerait à une position calculée l'autorité d'un relevé. La notation relative dit
 * exactement ce qu'on sait — la distance au dernier point.
 */
export function offsetTick(days: number): string {
  const rounded = Math.round(days)
  return rounded === 0 ? 'auj.' : `J${rounded}`
}

/** Même repère, en toutes lettres, pour l'infobulle. */
export function offsetLabel(days: number): string {
  const ago = -days
  if (ago < 0.05) return 'dernier relevé'
  if (ago < 1) return `il y a ${Math.round(ago * 24)} h`
  const whole = Math.floor(ago)
  const hours = Math.round((ago - whole) * 24)
  if (hours === 0) return `il y a ${whole} j`
  return `il y a ${whole} j ${hours} h`
}
