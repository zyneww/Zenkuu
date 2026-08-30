import { describe, expect, it } from 'vitest'

import { halvingSchedule } from './halving'

/**
 * Le calendrier est ENGENDRÉ, donc il se vérifie.
 *
 * La raison d'être de ce fichier tient dans le premier test : la page de la référence
 * annonce `0.396025` pour la septième récompense, là où la seule valeur possible est
 * `0.390625`. Recopier leur table aurait importé la coquille. Ce test garantit que la
 * nôtre reste sur la règle du protocole plutôt que sur une saisie.
 */
describe('halvingSchedule', () => {
  it('divise la récompense par deux à chaque rang', () => {
    const rows = halvingSchedule(7)
    expect(rows.map((r) => r.rewardAfter)).toEqual([
      25, 12.5, 6.25, 3.125, 1.5625, 0.78125, 0.390625,
    ])
  })

  it('ne reprend pas la valeur erronée de la référence', () => {
    // Leur page annonce 0.396025 au septième halving : 50 / 2⁷ vaut 0.390625.
    const seventh = halvingSchedule(7).at(-1)
    expect(seventh?.rewardAfter).toBe(0.390625)
    expect(seventh?.rewardAfter).not.toBe(0.396025)
  })

  it('enchaîne les récompenses sans trou', () => {
    const rows = halvingSchedule(7)
    for (let i = 1; i < rows.length; i += 1) {
      // La récompense APRÈS un halving est celle d'AVANT le suivant : une table où les
      // deux divergeraient décrirait une émission qui saute une marche.
      expect(rows[i]!.rewardBefore).toBe(rows[i - 1]!.rewardAfter)
    }
  })

  it('place chaque halving à un multiple de 210 000 blocs', () => {
    for (const row of halvingSchedule(7)) {
      expect(row.height).toBe(210_000 * row.count)
    }
  })

  it('marque comme estimées les dates qui ne sont pas observées', () => {
    const rows = halvingSchedule(7)
    // Les quatre premiers ont eu lieu : leurs dates sont des faits vérifiables.
    expect(rows.slice(0, 4).every((r) => !r.estimated)).toBe(true)
    // Le cinquième est daté mais projeté ; les suivants n'ont que leur année.
    expect(rows.slice(4).every((r) => r.estimated)).toBe(true)
  })

  it('rend le nombre de rangs demandé', () => {
    expect(halvingSchedule(3)).toHaveLength(3)
    expect(halvingSchedule()).toHaveLength(7)
  })
})
