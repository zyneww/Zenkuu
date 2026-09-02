import { describe, expect, it } from 'vitest'

import {
  currencyFromAcceptLanguage,
  localeFromAcceptLanguage,
  parseAcceptLanguage,
} from './accept-language'

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'nl', 'pl', 'pt-BR', 'ru', 'tr', 'vi', 'zh', 'ja']

describe('parseAcceptLanguage', () => {
  /*
   * LE cas qui justifie ce module. `en;q=0.5,de;q=0.9` écrit l'anglais en premier et
   * veut l'allemand : c'est la configuration d'un germanophone dont le système est en
   * anglais, et une lecture naïve du premier segment lui donnerait l'anglais.
   */
  it('ordonne par q, pas par position dans la chaîne', () => {
    expect(parseAcceptLanguage('en;q=0.5,de;q=0.9').map((p) => p.tag)).toEqual(['de', 'en'])
  })

  it('donne q = 1 à un segment sans q, qui passe donc devant', () => {
    expect(parseAcceptLanguage('en;q=0.9,fr').map((p) => p.tag)).toEqual(['fr', 'en'])
  })

  it('écarte les segments dont le q est nul ou illisible', () => {
    expect(parseAcceptLanguage('fr,de;q=0,it;q=abc').map((p) => p.tag)).toEqual(['fr'])
  })

  it('rend une liste vide sur une absence d’en-tête', () => {
    expect(parseAcceptLanguage(null)).toEqual([])
    expect(parseAcceptLanguage('')).toEqual([])
  })
})

describe('currencyFromAcceptLanguage', () => {
  it('lit la région, pas la langue', () => {
    // Trois francophones, trois devises. C'est tout l'intérêt de regarder la RÉGION :
    // déduire la France du français se tromperait sur deux d'entre eux.
    expect(currencyFromAcceptLanguage('fr-FR')).toBe('EUR')
    expect(currencyFromAcceptLanguage('fr-CA')).toBe('CAD')
    expect(currencyFromAcceptLanguage('fr-CH')).toBe('CHF')
  })

  it('distingue les anglophones par leur pays', () => {
    expect(currencyFromAcceptLanguage('en-US')).toBe('USD')
    expect(currencyFromAcceptLanguage('en-GB')).toBe('GBP')
    expect(currencyFromAcceptLanguage('en-AU')).toBe('AUD')
  })

  it('n’invente rien quand l’étiquette ne porte pas de région', () => {
    // « de » dit la langue et rien du pays : Allemagne, Autriche et Suisse la
    // partagent, et les deux premières sont en euro quand la troisième ne l'est pas.
    expect(currencyFromAcceptLanguage('de')).toBeUndefined()
    expect(currencyFromAcceptLanguage('en,fr,es')).toBeUndefined()
  })

  it('passe à la préférence suivante quand la région est inconnue', () => {
    // Le Sénégal n'est pas dans la table (le franc CFA n'est pas au convertisseur) :
    // la lecture continue et trouve le Canada.
    expect(currencyFromAcceptLanguage('fr-SN;q=0.9,fr-CA;q=0.8')).toBe('CAD')
  })

  it('rend undefined plutôt qu’une devise par défaut', () => {
    // La distinction compte : « on ne sait pas » n'est pas « le visiteur est en zone
    // euro », et l'appelant doit pouvoir traiter les deux différemment.
    expect(currencyFromAcceptLanguage(null)).toBeUndefined()
    expect(currencyFromAcceptLanguage('xx-YY')).toBeUndefined()
  })

  it('ne rend que des devises réellement proposées par le site', () => {
    // Garde-fou de cohérence : si quelqu'un ajoute une région dont la devise n'est pas
    // au convertisseur, l'interface afficherait un code qu'elle ne sait pas convertir.
    const proposees = new Set([
      'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'NZD',
      'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'ISK', 'TRY',
      'BRL', 'MXN', 'INR', 'IDR', 'KRW', 'MYR', 'PHP', 'SGD', 'THB', 'ZAR', 'ILS', 'HKD',
    ])
    for (const region of ['FR', 'US', 'JP', 'BR', 'IN', 'ZA', 'HK', 'PL', 'TR']) {
      const devise = currencyFromAcceptLanguage(`xx-${region}`)
      expect(devise).toBeDefined()
      expect(proposees.has(devise as string)).toBe(true)
    }
  })
})

describe('localeFromAcceptLanguage', () => {
  it('retient la racine quand l’étiquette porte une région', () => {
    expect(localeFromAcceptLanguage('de-AT', LOCALES)).toBe('de')
    expect(localeFromAcceptLanguage('fr-CA', LOCALES)).toBe('fr')
  })

  it('préfère l’étiquette complète à sa racine quand elle est traduite', () => {
    // `pt-BR` EST une locale du projet : la rendre « pt » perdrait le portugais du
    // Brésil, qui est la seule variante que le site traduit.
    expect(localeFromAcceptLanguage('pt-BR', LOCALES)).toBe('pt-BR')
  })

  it('ignore les sous-étiquettes d’écriture', () => {
    expect(localeFromAcceptLanguage('zh-Hant-TW', LOCALES)).toBe('zh')
  })

  it('descend la liste jusqu’à une langue connue', () => {
    expect(localeFromAcceptLanguage('is;q=0.9,sv;q=0.8,de;q=0.7', LOCALES)).toBe('de')
  })

  it('rend undefined quand aucune préférence n’est traduite', () => {
    expect(localeFromAcceptLanguage('is,sv,fi', LOCALES)).toBeUndefined()
    expect(localeFromAcceptLanguage(null, LOCALES)).toBeUndefined()
  })
})
