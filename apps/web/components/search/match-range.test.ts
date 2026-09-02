import { describe, expect, it } from 'vitest'

import { matchRange } from './match-range'

/**
 * Ces cas portent sur le DÉCALAGE, seul vrai piège du surlignage : la décomposition
 * Unicode produit plus de caractères que la source, et découper l'original aux index
 * du texte normalisé surligne alors à côté.
 *
 * Le défaut est invisible sur « btc » et sur « bitcoin ». Il apparaît sur « matières
 * premières » — qui est un libellé du site, pas un cas de laboratoire.
 *
 * La forme des assertions est volontairement « le texte découpé », et non les index :
 * une paire de nombres ne dit pas si elle est juste, un mot si.
 */
describe('matchRange', () => {
  const surligne = (texte: string, requete: string) => {
    const r = matchRange(texte, requete)
    return r === null ? null : texte.slice(r[0], r[1])
  }

  it('trouve une correspondance en tête', () => {
    expect(surligne('Bitcoin', 'bit')).toBe('Bit')
  })

  it('ignore la casse', () => {
    expect(surligne('Ethereum', 'ETH')).toBe('Eth')
  })

  it('trouve une correspondance au milieu', () => {
    expect(surligne('Lido Staked Ether', 'staked')).toBe('Staked')
  })

  /* LE cas qui a motivé le tableau de correspondance : huit caractères surlignés, pas
     sept ni neuf, malgré l'accent que la requête ne porte pas. */
  it('traverse les accents sans décaler', () => {
    expect(surligne('Matières premières', 'matieres')).toBe('Matières')
  })

  it('reste juste quand l’accent est APRÈS le début de la correspondance', () => {
    expect(surligne('Pétrole brut', 'petrole')).toBe('Pétrole')
  })

  it('reste juste quand DEUX accents précèdent la correspondance', () => {
    // « é » et « è » sont tous deux décomposés : sans le tableau, « premières »
    // serait surligné deux caractères trop loin.
    expect(surligne('Matières premières', 'premieres')).toBe('premières')
  })

  it('s’arrête à la fin du texte sans déborder', () => {
    expect(surligne('Or', 'or')).toBe('Or')
    expect(surligne('Matières', 'matieres')).toBe('Matières')
  })

  it('rend null quand le terme est absent', () => {
    expect(matchRange('Bitcoin', 'xyz')).toBeNull()
  })

  it('rend null sur une requête vide ou blanche', () => {
    expect(matchRange('Bitcoin', '')).toBeNull()
    expect(matchRange('Bitcoin', '   ')).toBeNull()
  })

  it('rend null sur une requête réduite à un accent combinant', () => {
    // Elle se replie sur du vide, et `indexOf('')` rendrait 0 : ce serait un
    // surlignage de longueur nulle posé au début de chaque résultat.
    expect(matchRange('Bitcoin', '́')).toBeNull()
  })
})
