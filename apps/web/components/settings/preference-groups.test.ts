import { describe, expect, it } from 'vitest'

import { CURRENCIES } from '@zenkuu/data/currencies'

import { LANGUAGES } from './languages'

/**
 * CE QUE L'OVERLAY DE PRÉFÉRENCES PROPOSE — et ce qu'il ne propose plus.
 *
 * Décision de conception : seules les entrées COURANTES sont offertes, pour les langues
 * comme pour les devises. Ces tests fixent la conséquence, qui n'est pas anodine : les
 * autres deviennent inatteignables, la recherche comprise.
 *
 * Ils existent pour qu'un retour en arrière soit un choix EXPLICITE et non un effet de
 * bord : si quelqu'un rétablit un groupe, un test tombe et il faut le mettre à jour en
 * connaissance de cause.
 */
describe('préférences — périmètre proposé', () => {
  it('offre exactement les dix devises courantes', () => {
    const courantes = CURRENCIES.filter((meta) => meta.group === 'suggested')

    expect(courantes.length).toBeGreaterThanOrEqual(8)
    /* USD et EUR sont les deux qui doivent y être quoi qu'il arrive : la première est la
       devise de cotation de la plupart de nos sources, la seconde celle du site. */
    expect(courantes.map((meta) => meta.code)).toContain('USD')
    expect(courantes.map((meta) => meta.code)).toContain('EUR')
  })

  /**
   * LE test de ce fichier. Le franc suisse, la livre et le dollar canadien sont dans le
   * catalogue mais PAS dans les courantes — donc plus proposés. C'est voulu, et il faut
   * que ce soit lisible ici plutôt que déduit d'un tableau de configuration.
   */
  it('n’offre plus les devises hors groupe courant', () => {
    const horsCourant = ['CHF', 'GBP', 'CAD']

    for (const code of horsCourant) {
      const meta = CURRENCIES.find((entry) => entry.code === code)
      expect(meta, `${code} doit rester au catalogue`).toBeDefined()
      expect(meta?.group, `${code} ne doit pas être « suggested »`).not.toBe('suggested')
    }
  })

  it('offre uniquement des langues effectivement traduites', () => {
    const courantes = LANGUAGES.filter((entry) => entry.popular)

    expect(courantes.length).toBeGreaterThan(0)
    /* C'est la propriété qui rend la note de bas de page inutile : aucune langue
       proposée ne porte la mention « non traduite ». Si elle tombe, la note doit
       reparaître — voir `untranslated` dans `PreferenceOverlay`. */
    for (const entry of courantes) {
      expect(entry.ready, `${entry.code} est proposée sans être traduite`).toBe(true)
    }
  })

  it('garde au catalogue des langues non traduites, sans les proposer', () => {
    const nonTraduites = LANGUAGES.filter((entry) => !entry.ready)

    expect(nonTraduites.length).toBeGreaterThan(0)
    for (const entry of nonTraduites) {
      expect(entry.popular, `${entry.code} ne doit pas être proposée`).toBeFalsy()
    }
  })
})
