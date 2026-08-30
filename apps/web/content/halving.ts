/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CALENDRIER DES HALVINGS — CALCULÉ, PAS RECOPIÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le protocole Bitcoin divise la récompense de bloc par deux tous les 210 000 blocs.
 * C'est une règle publique et déterministe : le rang, la hauteur de bloc et la
 * récompense se DÉDUISENT, ils ne se saisissent pas.
 *
 * Ce que la table ne peut pas déduire, ce sont les DATES. Un bloc vise dix minutes
 * mais la difficulté s'ajuste avec retard, si bien que le rythme réel dérive de
 * quelques jours par an. Les dates passées sont donc des faits observés — vérifiables
 * sur n'importe quel explorateur — et la suivante est une estimation.
 *
 * ── POURQUOI LE CALCUL PLUTÔT QUE LA RECOPIE ───────────────────────────────
 *
 * La page de la référence, relevée le 2026-08-31, annonce `0.396025` bitcoin pour la
 * septième récompense. La valeur juste est `0.390625` — c'est 50 divisé par deux sept
 * fois, et aucune autre valeur n'est possible. Leur chiffre porte une coquille.
 *
 * Recopier leur table aurait importé cette erreur dans un site qui affirme ne
 * publier que des données vérifiables. La table est donc engendrée : la coquille ne
 * peut pas se produire, et un huitième halving s'ajoutera en changeant un nombre.
 */

/** Nombre de blocs entre deux halvings — constante du protocole. */
const BLOCKS_PER_HALVING = 210_000

/** Récompense initiale, en bitcoins par bloc. */
const INITIAL_REWARD = 50

/**
 * Dates OBSERVÉES des halvings passés, au format ISO.
 *
 * Elles ne se calculent pas : le rythme réel des blocs dérive de la cible de dix
 * minutes. Chacune est vérifiable sur la chaîne à la hauteur correspondante.
 *
 * ⚠️ La dernière entrée de cette table est une ESTIMATION, marquée comme telle par
 * `estimated`. Elle vaut ce que vaut l'hypothèse d'un rythme régulier — soit
 * quelques semaines d'incertitude à quatre ans d'échéance.
 */
const OBSERVED: { height: number; date: string; estimated?: boolean }[] = [
  { height: 210_000, date: '2012-11-28' },
  { height: 420_000, date: '2016-07-09' },
  { height: 630_000, date: '2020-05-11' },
  { height: 840_000, date: '2024-04-20' },
  { height: 1_050_000, date: '2028-04-17', estimated: true },
]

export interface HalvingEntry {
  /** Rang du halving, à partir de 1. */
  count: number
  /** Hauteur de bloc à laquelle il se produit. */
  height: number
  /** Date ISO, observée ou estimée. */
  date: string
  /** La date est-elle une projection plutôt qu'un fait ? */
  estimated: boolean
  /** Récompense avant, en bitcoins par bloc. */
  rewardBefore: number
  /** Récompense après. */
  rewardAfter: number
}

/**
 * La table complète, engendrée.
 *
 * `count` va jusqu'à sept comme chez la référence : au-delà, les dates ne seraient
 * plus que des extrapolations à plus de vingt ans, ce qui n'informe personne.
 */
export function halvingSchedule(count = 7): HalvingEntry[] {
  const rows: HalvingEntry[] = []

  for (let i = 1; i <= count; i += 1) {
    const observed = OBSERVED[i - 1]
    const height = BLOCKS_PER_HALVING * i

    /* Les dates au-delà des observations sont projetées à quatre ans d'intervalle —
       la durée nominale de 210 000 blocs à dix minutes. Elles ne portent que l'année,
       parce qu'un jour précis à cette échéance serait une fausse précision. */
    const projectedYear = 2028 + (i - 5) * 4
    const date = observed?.date ?? String(projectedYear)

    rows.push({
      count: i,
      height,
      date,
      estimated: observed?.estimated ?? observed === undefined,
      rewardBefore: INITIAL_REWARD / 2 ** (i - 1),
      rewardAfter: INITIAL_REWARD / 2 ** i,
    })
  }

  return rows
}
