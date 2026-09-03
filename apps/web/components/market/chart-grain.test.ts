import { describe, expect, it } from 'vitest'

import { autoGrain, groupBy } from './chart-grain'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUE CES TESTS PROTÈGENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un regroupement faux ne lève rien : la courbe se dessine, elle est simplement
 * fausse. C'est exactement ce qui est arrivé aux cartes de séries des fiches d'actif,
 * où un groupement UTC libellé en heure locale produisait deux barres mensuelles
 * portant la même étiquette — vu à l'écran, jamais par le typage.
 *
 * ⚠️ LES DATES SONT ÉCRITES EN HEURE LOCALE. `new Date(2026, 7, 31, 23)` construit
 * 23 h dans le fuseau de la machine, quel qu'il soit : ces tests vérifient donc la
 * COHÉRENCE entre le regroupement et l'affichage, qui est la propriété qui manquait,
 * et non un fuseau particulier. Écrits en UTC, ils passeraient à Londres et
 * échoueraient à Paris — c'est-à-dire qu'ils auraient le défaut qu'ils traquent.
 */

const point = (date: Date, y: number) => ({ t: date.getTime(), y })

describe('groupBy', () => {
  it('laisse la série intacte au pas quotidien', () => {
    const points = [
      point(new Date(2026, 8, 1), 1),
      point(new Date(2026, 8, 2), 2),
    ]
    expect(groupBy(points, 'jour')).toEqual(points)
  })

  it('retient la DERNIÈRE valeur de la période, jamais la somme', () => {
    /*
     * ⚠️ LA DISTINCTION EST LA PLUS IMPORTANTE DU FICHIER. Toutes les séries de ces
     * cartes sont des ÉTATS — une capitalisation, une part, un cours — qui existent à
     * chaque instant. Les additionner sur sept jours donnerait un nombre sept fois trop
     * grand ayant toutes les apparences d'une donnée.
     */
    const groupes = groupBy(
      [
        point(new Date(2026, 8, 7), 100), // lundi
        point(new Date(2026, 8, 9), 200),
        point(new Date(2026, 8, 11), 300),
      ],
      'semaine',
    )
    expect(groupes).toHaveLength(1)
    expect(groupes[0]!.y).toBe(300)
  })

  it('range le dernier soir du mois avec SON mois, pas le suivant', () => {
    /* Le cas exact du défaut corrigé sur les fiches d'actif : 23 h le 31 août est
       encore le 31 août, y compris dans un fuseau en avance sur UTC. */
    const groupes = groupBy(
      [
        point(new Date(2026, 7, 15, 12), 1),
        point(new Date(2026, 7, 31, 23), 2),
        point(new Date(2026, 8, 1, 1), 3),
      ],
      'mois',
    )
    expect(groupes).toHaveLength(2)
    expect(new Date(groupes[0]!.t).getMonth()).toBe(7)
    expect(new Date(groupes[1]!.t).getMonth()).toBe(8)
  })

  it('fait commencer la semaine au lundi, dimanche compris', () => {
    /* `getDay()` rend 0 pour dimanche : sans traitement, un dimanche ouvrirait sa
       propre semaine au lieu de fermer la précédente. */
    const groupes = groupBy(
      [
        point(new Date(2026, 8, 6, 18), 1), // dimanche
        point(new Date(2026, 8, 7), 2), // lundi suivant
      ],
      'semaine',
    )
    expect(groupes).toHaveLength(2)
  })

  it('rend une liste vide sur une entrée vide, sans lever', () => {
    expect(groupBy([], 'mois')).toEqual([])
  })
})

describe('autoGrain', () => {
  it('laisse le pas quotidien tant que la figure reste lisible', () => {
    const courte = Array.from({ length: 300 }, (_, i) => point(new Date(2026, 0, 1 + i), i))
    expect(autoGrain(courte)).toBe('jour')
  })

  it('passe à la semaine plutôt qu’au mois dès que le pas hebdomadaire suffit', () => {
    /* Écraser directement au mois aplatirait inutilement une série de deux ans. */
    const moyenne = Array.from({ length: 1000 }, (_, i) => point(new Date(2026, 0, 1 + i), i))
    expect(autoGrain(moyenne)).toBe('semaine')
  })

  it('passe au mois sur les très longues séries', () => {
    /* La série des stablecoins remonte à 2017 : plus de trois mille points quotidiens,
       soit moins d'un quart de pixel par barre dans un cadre de huit cents. */
    const longue = Array.from({ length: 3200 }, (_, i) => point(new Date(2017, 0, 1 + i), i))
    expect(autoGrain(longue)).toBe('mois')
  })

  it('ne bronche pas sur une série vide', () => {
    expect(autoGrain([])).toBe('jour')
  })
})
