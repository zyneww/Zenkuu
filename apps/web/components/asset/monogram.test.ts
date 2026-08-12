import { describe, expect, it } from 'vitest'

import { monogram } from './monogram'

describe('monogram', () => {
  it("prend les deux premières lettres d'un nom en un mot", () => {
    expect(monogram('Apple', 'AAPL')).toBe('Ap')
    expect(monogram('Tesla', 'TSLA')).toBe('Te')
  })

  it('prend les initiales des deux premiers mots', () => {
    expect(monogram('Meta Platforms', 'META')).toBe('MP')
    expect(monogram('JPMorgan Chase', 'JPM')).toBe('JC')
    expect(monogram('Dow Jones Industrial', '^DJI')).toBe('DJ')
  })

  /*
   * LE DÉFAUT CORRIGÉ. `symbol.slice(0, 3)` donnait « AAP » pour Apple — un fragment
   * de ticker qui ne désigne rien et que personne ne reconnaît. Un monogramme se
   * prend sur le NOM, jamais sur un identifiant technique tronqué.
   */
  it('ne tronque jamais le symbole à trois lettres', () => {
    expect(monogram('Apple', 'AAPL')).not.toBe('AAP')
    expect(monogram('Microsoft', 'MSFT')).not.toBe('MSF')
  })

  /*
   * Pour une paire, c'est la CONTREPARTIE qui distingue les lignes : sans cette
   * règle, EUR/USD et EUR/GBP afficheraient toutes deux « Eu ».
   */
  it("prend la contrepartie d'une paire de devises", () => {
    expect(monogram('Euro / Dollar américain', 'EUR/USD')).toBe('USD')
    expect(monogram('Euro / Livre sterling', 'EUR/GBP')).toBe('GBP')
  })

  it('retombe sur le symbole quand le nom est absent', () => {
    expect(monogram('', 'BTC')).toBe('BT')
    expect(monogram('   ', 'ETH')).toBe('ET')
  })

  /* « L’Oréal » : l'apostrophe ne doit pas être prise pour une initiale. */
  it('ignore la ponctuation dans le nom', () => {
    expect(monogram('L’Oréal', 'OR.PA')).toBe('LO')
    expect(monogram('S&P 500', '^GSPC')).toBe('SP')
  })

  /* Un symbole de matière première ne donne aucun monogramme lisible ; c'est le nom
     qui sauve la mise, et l'emoji prend le relais quand il existe. */
  it('utilise le nom pour une matière première', () => {
    expect(monogram('Pétrole WTI', 'CL=F')).toBe('PW')
    expect(monogram('Or', 'GC=F')).toBe('Or')
  })

  it('ne renvoie jamais de chaîne vide', () => {
    expect(monogram('', '').length).toBeGreaterThan(0)
  })
})
