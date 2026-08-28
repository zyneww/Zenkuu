import { describe, expect, it } from 'vitest'

import { extractTag } from './providers/news'

/**
 * Le nettoyage des fragments de flux RSS.
 *
 * Il existe parce que les éditeurs n'écrivent pas leurs descriptions de la même
 * façon : les uns posent du texte nu, les autres du HTML, les autres encore du HTML
 * ÉCHAPPÉ — et c'est ce dernier cas qui avait échappé au nettoyage, produisant des
 * extraits commençant par « <link typ href="htt… » sur les cartes de `/actualites`.
 */
describe('extractTag', () => {
  it('rend le texte nu tel quel', () => {
    expect(extractTag('<title>Bitcoin franchit les 80 000 $</title>', 'title')).toBe(
      'Bitcoin franchit les 80 000 $',
    )
  })

  it('retire le balisage réel', () => {
    expect(extractTag('<description><p>Deux <b>mots</b> en gras.</p></description>', 'description')).toBe(
      'Deux mots en gras.',
    )
  })

  it('retire aussi le balisage ÉCHAPPÉ, que le décodage fabrique', () => {
    const bloc = '<description>&lt;link href="https://x.test/a" /&gt;Portage du fonds</description>'

    expect(extractTag(bloc, 'description')).toBe('Portage du fonds')
  })

  it('ouvre les sections CDATA', () => {
    expect(extractTag('<title><![CDATA[Marchés & taux]]></title>', 'title')).toBe('Marchés & taux')
  })

  it('décode les entités numériques sans les confondre avec des balises', () => {
    expect(extractTag('<title>Face &#xE0; la crise</title>', 'title')).toBe('Face à la crise')
  })

  it('garde un « inférieur à » qui n’ouvre aucune balise', () => {
    expect(extractTag('<title>BTC &lt; 80 000 $</title>', 'title')).toBe('BTC < 80 000 $')
  })

  it('rend indéfini quand la balise est absente', () => {
    expect(extractTag('<item></item>', 'title')).toBeUndefined()
  })
})
