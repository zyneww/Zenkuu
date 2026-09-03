import { describe, expect, it } from 'vitest'

import { regrouper, type SeriesPoint } from './series-grouping'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE REGROUPEMENT — ET LE DÉFAUT QUI A MOTIVÉ CE FICHIER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La première version groupait en UTC et LIBELLAIT en heure locale. Les deux divergent
 * de deux heures à Paris : un relevé du 31 août à 23 h UTC tombait dans le paquet
 * d'août et s'affichait « 1 sept. ».
 *
 * ⚠️ CE DÉFAUT NE LEVAIT AUCUNE ERREUR. Il a été vu à l'écran — deux barres mensuelles
 * portant toutes deux « sept. 26 » — et n'aurait été trouvé par aucun typage. C'est
 * exactement le genre d'arithmétique de dates qui mérite des assertions.
 *
 * ⚠️ CES TESTS S'ÉCRIVENT EN HEURE LOCALE, DÉLIBÉRÉMENT. `new Date(2026, 7, 31, 23)`
 * construit 23 h dans le fuseau de la machine, quel qu'il soit : le test vérifie donc
 * la COHÉRENCE entre regroupement et affichage, qui est la propriété qui a manqué, et
 * non un fuseau particulier. Écrit en UTC, il passerait à Londres et échouerait à
 * Paris — c'est-à-dire qu'il aurait le défaut qu'il traque.
 */

function point(date: Date, price: number, volume?: number): SeriesPoint {
  return {
    timestamp: date.getTime(),
    price,
    ...(volume === undefined ? {} : { volume }),
    marketCap: price * 1000,
  }
}

describe('regrouper', () => {
  it('range le dernier soir du mois avec SON mois, pas le suivant', () => {
    /* Le cas exact du défaut : 23 h le 31 août est encore le 31 août. */
    const groupes = regrouper(
      [
        point(new Date(2026, 7, 15, 12), 100),
        point(new Date(2026, 7, 31, 23), 110),
        point(new Date(2026, 8, 1, 1), 120),
      ],
      'mois',
    )

    expect(groupes).toHaveLength(2)
    /* L'abscisse porte le DÉBUT de la période : le premier point d'août, pas le dernier. */
    expect(new Date(groupes[0]!.timestamp).getMonth()).toBe(7)
    expect(new Date(groupes[1]!.timestamp).getMonth()).toBe(8)
  })

  it('fait commencer la semaine au lundi, dimanche compris', () => {
    /* `getDay()` rend 0 pour dimanche : sans traitement, le 6 septembre 2026 (un
       dimanche) ouvrirait sa propre semaine au lieu de fermer la précédente. */
    const lundi = new Date(2026, 8, 7) // lundi 7 septembre 2026
    const dimanche = new Date(2026, 8, 6, 18) // la veille
    const groupes = regrouper([point(dimanche, 100), point(lundi, 110)], 'semaine')

    expect(groupes).toHaveLength(2)
    expect(groupes[0]!.timestamp).toBeLessThan(groupes[1]!.timestamp)
  })

  it('somme les volumes et prend la DERNIÈRE capitalisation', () => {
    /*
     * ⚠️ LA DISTINCTION EST LA PLUS IMPORTANTE DU FICHIER. Un volume hebdomadaire EST
     * la somme des volumes quotidiens ; une capitalisation hebdomadaire n'est pas leur
     * somme, c'est celle du dernier jour. Les confondre produirait un nombre sept fois
     * trop grand qui aurait toutes les apparences d'une donnée.
     */
    const groupes = regrouper(
      [
        point(new Date(2026, 8, 1, 2), 100, 10),
        point(new Date(2026, 8, 1, 14), 200, 30),
      ],
      'jour',
    )

    expect(groupes).toHaveLength(1)
    expect(groupes[0]!.volume).toBe(40)
    expect(groupes[0]!.marketCap).toBe(200_000)
  })

  it('mesure la variation du PREMIER au DERNIER point de la période', () => {
    /* Et non la moyenne des variations quotidiennes, qui ne décrit rien de
       reconnaissable : sur trois jours à +10 %, −10 %, +10 %, la moyenne dit +3,3 %
       quand la période a fait +8,9 %. */
    const groupes = regrouper(
      [
        point(new Date(2026, 8, 1, 1), 100),
        point(new Date(2026, 8, 1, 12), 50),
        point(new Date(2026, 8, 1, 22), 150),
      ],
      'jour',
    )

    expect(groupes[0]!.change).toBeCloseTo(50, 6)
  })

  it('laisse le volume ABSENT plutôt que de rendre zéro', () => {
    /* `[].reduce` sur une liste vide donnerait 0, c'est-à-dire un volume nul là où la
       source ne publie rien. Une carte se retire sur `undefined` ; elle tracerait une
       ligne plate sur un zéro (§5). */
    const groupes = regrouper([point(new Date(2026, 8, 1, 1), 100)], 'jour')
    expect(groupes[0]!.volume).toBeUndefined()
  })

  it('rend une liste vide sur une entrée vide, sans lever', () => {
    expect(regrouper([], 'jour')).toEqual([])
  })
})
