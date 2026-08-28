import { describe, expect, it } from 'vitest'

import { currencyFlag, languageFlag } from './flags'

/**
 * Le contrôle porte sur les CAS QUI N'ONT PAS DE DRAPEAU, parce que ce sont eux qui
 * se dégradent en silence : une dérivation naïve rendrait « 🇽🇦 » pour l'or, un
 * rectangle vide que rien ne signale comme une erreur.
 */
describe('drapeau de devise', () => {
  it('dérive le pays des deux premières lettres', () => {
    expect(currencyFlag('USD')).toBe('🇺🇸')
    expect(currencyFlag('GBP')).toBe('🇬🇧')
    expect(currencyFlag('JPY')).toBe('🇯🇵')
    expect(currencyFlag('CAD')).toBe('🇨🇦')
  })

  it('accepte les minuscules', () => {
    expect(currencyFlag('usd')).toBe(currencyFlag('USD'))
  })

  it('donne à l’euro sa bannière, qui n’est pas dérivable', () => {
    /* `EU` n'est pas un code pays ISO 3166 : sans exception, la dérivation
       fonctionnerait par accident ici et il faut que ce soit délibéré. */
    expect(currencyFlag('EUR')).toBe('🇪🇺')
  })

  it('refuse les codes non nationaux plutôt que d’en inventer un', () => {
    for (const code of ['XAU', 'XAG', 'XDR', 'XBT']) {
      expect(currencyFlag(code), code).toBeNull()
    }
  })

  it('refuse ce qui n’est pas un code à trois lettres', () => {
    expect(currencyFlag('SATS')).toBeNull()
    expect(currencyFlag('')).toBeNull()
    expect(currencyFlag('U5D')).toBeNull()
  })
})

describe('drapeau de langue', () => {
  it('rend les langues du site', () => {
    expect(languageFlag('fr')).toBe('🇫🇷')
    expect(languageFlag('en')).toBe('🇬🇧')
    expect(languageFlag('zh')).toBe('🇨🇳')
  })

  it('distingue le portugais du Brésil du portugais', () => {
    expect(languageFlag('pt-BR')).toBe('🇧🇷')
    expect(languageFlag('pt')).toBe('🇵🇹')
  })

  it('retombe sur la langue de base pour une variante inconnue', () => {
    /* `de-AT` n'est pas dans la table ; `de` y est. Mieux vaut le drapeau allemand
       que rien, la variante restant écrite en toutes lettres à côté. */
    expect(languageFlag('de-AT')).toBe('🇩🇪')
  })

  it('ne rend rien pour une langue absente de la table', () => {
    expect(languageFlag('sw')).toBeNull()
  })
})
