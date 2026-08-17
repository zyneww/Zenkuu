import { describe, expect, it } from 'vitest'

import {
  MACRO_FIRST_YEAR,
  macroHistoryYears,
  packMacroSeries,
  unpackMacroSeries,
  type MacroObservation,
} from './providers/worldbank'

/**
 * LE CODEC DE SÉRIE MACRO — ce qui doit rester vrai, et pourquoi.
 *
 * Il existe pour une raison de POIDS : la carte macro est un composant client, et
 * soixante-six ans d'historique en objets nommés réécrivent le nom de chaque pays
 * soixante-six fois dans la charge utile de la page.
 *
 * Un encodage n'a de valeur que s'il est réversible SANS PERTE. Ces tests verrouillent
 * donc l'aller-retour plutôt que la forme intermédiaire : la représentation compacte
 * peut évoluer, l'égalité `unpack(pack(x)) === x` ne le peut pas.
 */

const SAMPLE: MacroObservation[] = [
  { iso3: 'FRA', country: 'France', region: 'Europe & Central Asia', year: 1960, value: 3.72 },
  { iso3: 'FRA', country: 'France', region: 'Europe & Central Asia', year: 2024, value: 2.31 },
  { iso3: 'USA', country: 'United States', region: 'North America', year: 2024, value: 2.95 },
  { iso3: 'FRA', country: 'France', region: 'Europe & Central Asia', year: 1974, value: 13.7 },
]

describe('packMacroSeries', () => {
  it('rend exactement les observations d’origine après dépaquetage', () => {
    expect(unpackMacroSeries(packMacroSeries(SAMPLE))).toEqual(SAMPLE)
  })

  it('ne cite chaque pays qu’une fois, quel que soit son nombre d’années', () => {
    const packed = packMacroSeries(SAMPLE)

    // Trois observations françaises, une seule entrée « France ».
    expect(packed.countries).toHaveLength(2)
    expect(packed.rows).toHaveLength(4)
  })

  /*
   * LE TEST QUI JUSTIFIE L'EXISTENCE DU CODEC. Sans mesure, rien ne dit que
   * l'encodage gagne quoi que ce soit — et un encodage qui ne gagne rien n'est qu'une
   * indirection de plus. Le facteur mesuré sur la série réelle de l'inflation est
   * d'environ quatre ; on vérifie ici qu'il reste largement supérieur à un sur un
   * échantillon aux mêmes proportions.
   */
  it('allège réellement la charge utile', () => {
    /* Échantillon aux proportions réelles : un pays au nom long, soixante-six ans. */
    const long: MacroObservation[] = Array.from({ length: 66 }, (_, index) => ({
      iso3: 'FRA',
      country: 'France',
      region: 'Europe & Central Asia',
      year: MACRO_FIRST_YEAR + index,
      value: index / 3,
    }))

    const before = JSON.stringify(long).length
    const after = JSON.stringify(packMacroSeries(long)).length

    expect(after).toBeLessThan(before / 3)
  })

  /*
   * Un index hors liste ne peut venir que d'une charge utile corrompue. La ligne est
   * ÉCARTÉE plutôt que rendue avec un pays fabriqué : une observation sans pays n'est
   * pas une observation (§5).
   */
  it('écarte une ligne dont le pays est introuvable', () => {
    const rows = unpackMacroSeries({
      countries: [{ iso3: 'FRA', name: 'France', region: 'Europe & Central Asia' }],
      rows: [
        [0, 2024, 2.31],
        [7, 2024, 9.99],
      ],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.iso3).toBe('FRA')
  })

  it('supporte une série vide sans lever', () => {
    expect(packMacroSeries([])).toEqual({ countries: [], rows: [] })
    expect(unpackMacroSeries({ countries: [], rows: [] })).toEqual([])
  })
})

/**
 * LA PROFONDEUR EST RECALCULÉE, ET C'EST ce qui garde 1960 comme borne.
 *
 * `mrv` compte les années les plus RÉCENTES : une constante figée ferait reculer la
 * première année d'un cran chaque 1ᵉʳ janvier, sans que rien ne le signale — le genre
 * de dérive qu'on ne remarque qu'au bout de trois ans.
 */
describe('macroHistoryYears', () => {
  it('couvre exactement de la première année publiée à l’année en cours', () => {
    const currentYear = new Date().getFullYear()
    expect(macroHistoryYears()).toBe(currentYear - MACRO_FIRST_YEAR + 1)
  })

  it('remonte réellement au-delà d’un demi-siècle', () => {
    expect(macroHistoryYears()).toBeGreaterThan(60)
  })
})
