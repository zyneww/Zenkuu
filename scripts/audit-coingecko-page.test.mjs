import { describe, expect, it } from 'vitest'

import { cheminsDeCapture, lireArguments } from './audit-coingecko-page.mjs'

describe('lireArguments', () => {
  it('lit url et slug', () => {
    const a = lireArguments(['--url=/fr', '--slug=accueil'])
    expect(a.url).toBe('/fr')
    expect(a.slug).toBe('accueil')
  })

  it('applique l’origine de CoinGecko par défaut', () => {
    expect(lireArguments(['--url=/fr', '--slug=accueil']).base).toBe('https://www.coingecko.com')
  })

  it('accepte une origine explicite, pour auditer ZENKUU en local', () => {
    const a = lireArguments(['--url=/fr', '--slug=z', '--base=http://localhost:3000'])
    expect(a.base).toBe('http://localhost:3000')
  })

  it('découpe la liste de sélecteurs sur les virgules', () => {
    const a = lireArguments(['--url=/fr', '--slug=a', '--selectors=table td,a.lien'])
    expect(a.selectors).toEqual(['table td', 'a.lien'])
  })

  it('rend une liste de sélecteurs vide quand l’argument est absent', () => {
    expect(lireArguments(['--url=/fr', '--slug=a']).selectors).toEqual([])
  })

  it('exige url et slug', () => {
    expect(() => lireArguments(['--url=/fr'])).toThrow(/slug/)
    expect(() => lireArguments(['--slug=a'])).toThrow(/url/)
  })

  it('refuse un slug qui sortirait du dossier de références', () => {
    /* Un slug est un nom de dossier, pas un chemin : sans ce garde-fou,
       `--slug=../../..` écrirait des captures n'importe où dans le dépôt. */
    expect(() => lireArguments(['--url=/fr', '--slug=../evasion'])).toThrow(/slug/)
  })
})

describe('cheminsDeCapture', () => {
  it('rend six chemins, trois largeurs par deux thèmes', () => {
    const chemins = cheminsDeCapture('accueil')
    expect(chemins).toHaveLength(6)
  })

  it('nomme les fichiers largeur-thème, sous le dossier du slug', () => {
    const noms = cheminsDeCapture('accueil').map((c) => c.fichier)
    expect(noms).toEqual([
      'docs/references/coingecko/accueil/360-clair.png',
      'docs/references/coingecko/accueil/360-sombre.png',
      'docs/references/coingecko/accueil/768-clair.png',
      'docs/references/coingecko/accueil/768-sombre.png',
      'docs/references/coingecko/accueil/1440-clair.png',
      'docs/references/coingecko/accueil/1440-sombre.png',
    ])
  })

  it('porte la largeur et le thème de chaque capture', () => {
    const [premier] = cheminsDeCapture('accueil')
    expect(premier.largeur).toBe(360)
    expect(premier.theme).toBe('clair')
  })
})
