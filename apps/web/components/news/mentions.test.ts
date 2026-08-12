import { describe, expect, it } from 'vitest'

import { ASSET_MENTIONS, availableMentions, mentions } from './mentions'

const trouver = (id: string) => {
  const found = ASSET_MENTIONS.find((mention) => mention.id === id)
  if (!found) throw new Error(`actif de test absent : ${id}`)
  return found
}

describe('mentions', () => {
  it('trouve un actif nommé en toutes lettres', () => {
    expect(mentions('Le Bitcoin franchit les 70 000 dollars', trouver('btc'))).toBe(true)
  })

  it('trouve un actif désigné par son symbole', () => {
    expect(mentions('BTC hits new high', trouver('btc'))).toBe(true)
  })

  it('ignore la casse', () => {
    expect(mentions('BITCOIN en hausse', trouver('btc'))).toBe(true)
    expect(mentions('bitcoin en hausse', trouver('btc'))).toBe(true)
  })

  it('ne trouve rien quand l’actif est absent', () => {
    expect(mentions('Le CAC 40 termine en baisse', trouver('btc'))).toBe(false)
  })

  /*
   * LE PIÈGE DES FORMES COURTES, et la raison de l'encadrement par des espaces.
   *
   * « or » sans espace final trouve « Norvège », « majeur », « historique »,
   * « record » — le filtre renverrait alors la quasi-totalité du fil, donc
   * n'apprendrait rien. Même chose pour « eth » dans « Ethereum » vs « méthode ».
   */
  it('ne déclenche pas une forme courte au milieu d’un mot', () => {
    expect(mentions('La Norvège révise sa politique', trouver('or'))).toBe(false)
    expect(mentions('Un record historique majeur', trouver('or'))).toBe(false)
    expect(mentions('Une méthode contestée', trouver('eth'))).toBe(false)
  })

  it('trouve une forme courte isolée', () => {
    expect(mentions("Le cours de l'or grimpe", trouver('or'))).toBe(true)
    expect(mentions('Gold hits record', trouver('or'))).toBe(true)
  })

  it('reconnaît plusieurs formes du même actif', () => {
    const stables = trouver('stablecoins')
    expect(mentions('Tether publie ses réserves', stables)).toBe(true)
    expect(mentions('USDC regains its peg', stables)).toBe(true)
    expect(mentions('Les stablecoins sous surveillance', stables)).toBe(true)
  })
})

describe('availableMentions', () => {
  it('ne propose que les actifs réellement cités dans le lot', () => {
    const disponibles = availableMentions([
      'Le Bitcoin franchit un seuil',
      'NVIDIA publie ses résultats',
    ])
    const ids = disponibles.map((mention) => mention.id)

    expect(ids).toContain('btc')
    expect(ids).toContain('nvidia')
    expect(ids).not.toContain('tesla')
  })

  /* Un filtre qui ne renverrait jamais rien vaut moins qu'un filtre absent : le
     lecteur croit avoir filtré alors qu'il a vidé sa page. */
  it('ne propose rien pour un lot sans actif reconnaissable', () => {
    expect(availableMentions(['Un titre parfaitement neutre'])).toHaveLength(0)
  })

  it('ne propose pas deux fois le même actif', () => {
    const disponibles = availableMentions(['Bitcoin monte', 'Bitcoin descend', 'BTC stagne'])
    expect(disponibles.filter((mention) => mention.id === 'btc')).toHaveLength(1)
  })
})
