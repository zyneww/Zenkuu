import { describe, expect, test } from 'vitest'

import { pageWindow } from './page-window'

/**
 * La fenêtre de pagination est le genre de code qui paraît trivial et se trompe d'une
 * unité aux bornes. Ces cas sont exactement ceux qu'on découvre en production.
 */
describe('fenêtre de pagination', () => {
  test('affiche tout tant que ça tient', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('coupe à droite quand on est au début', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, null, 20])
  })

  test('coupe à gauche quand on est à la fin', () => {
    expect(pageWindow(20, 20)).toEqual([1, null, 19, 20])
  })

  test('coupe des deux côtés au milieu', () => {
    expect(pageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20])
  })

  /*
   * LE CAS QUI JUSTIFIE LA RÈGLE DES DEUX PAGES.
   *
   * En page 3 sur 20, la fenêtre couvre 1·2·3·4 puis saute à 20. L'écart entre 4 et
   * 20 est large, il s'écrit « … ». Mais entre 1 et 2 il n'y a rien à cacher, et une
   * ellipse qui masquerait UNE seule page remplacerait un chiffre cliquable par un
   * point de suspension inerte — on perd une cible sans rien gagner.
   */
  test('écrit le numéro plutôt qu’une ellipse quand elle ne masque qu’une page', () => {
    expect(pageWindow(4, 20)).toEqual([1, 2, 3, 4, 5, null, 20])
    expect(pageWindow(17, 20)).toEqual([1, null, 16, 17, 18, 19, 20])
  })

  test('ne sort pas des bornes', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(1, 8)).toEqual([1, 2, null, 8])
  })
})
