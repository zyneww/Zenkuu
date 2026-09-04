import { describe, expect, it } from 'vitest'

import { absorbe, type Memoire } from './useArrivals'

/**
 * Ce que ces cas protègent : la classe d'entrée du fil d'actualités ne doit se poser
 * que sur un article RÉELLEMENT nouveau. Les deux fautes possibles ne se voient pas à
 * la lecture — l'une fait animer quinze lignes à chaque chargement de page, l'autre
 * n'en anime aucune, et il faut attendre un rafraîchissement réel pour s'en apercevoir.
 */
const depart = (ids: string[]): Memoire => ({
  connus: new Set(ids),
  arrivants: new Set(),
})

describe('absorbe', () => {
  it('n’annonce aucune arrivée au premier affichage', () => {
    const memoire = depart(['a', 'b', 'c'])

    expect([...absorbe(memoire, ['a', 'b', 'c']).arrivants]).toEqual([])
  })

  it('rend la MÊME référence quand rien n’est neuf', () => {
    const memoire = depart(['a', 'b'])

    /*
     * C'est ce qui borne la mise à jour pendant le rendu : une référence neuve à chaque
     * appel relancerait le composant indéfiniment.
     */
    expect(absorbe(memoire, ['a', 'b'])).toBe(memoire)
  })

  it('n’annonce que l’article inséré, pas ses voisins', () => {
    const memoire = depart(['b', 'c'])

    expect([...absorbe(memoire, ['a', 'b', 'c']).arrivants]).toEqual(['a'])
  })

  it('repère une insertion AU MILIEU, qu’un comptage raterait', () => {
    const memoire = depart(['a', 'c'])

    expect([...absorbe(memoire, ['a', 'b', 'c']).arrivants]).toEqual(['b'])
  })

  it('n’annonce pas deux fois le même article', () => {
    const premier = absorbe(depart(['b']), ['a', 'b'])
    const second = absorbe(premier, ['a', 'b'])

    expect([...premier.arrivants]).toEqual(['a'])
    expect(second).toBe(premier)
  })

  it('oublie les arrivants précédents quand un nouveau lot tombe', () => {
    const premier = absorbe(depart(['c']), ['a', 'c'])
    const second = absorbe(premier, ['b', 'a', 'c'])

    expect([...second.arrivants]).toEqual(['b'])
  })

  it('n’oublie pas un article disparu puis revenu', () => {
    /*
     * Un article peut sortir du lot servi — la page n'en garde qu'une douzaine — puis
     * y revenir. Il n'est pas NEUF pour autant, et le refaire animer serait un
     * clignotement sans cause visible pour le lecteur.
     */
    const memoire = absorbe(depart(['a']), ['a', 'b'])

    expect([...absorbe(memoire, ['a']).arrivants]).toEqual(['b'])
    expect([...absorbe(memoire, ['a', 'b']).arrivants]).toEqual(['b'])
  })
})
