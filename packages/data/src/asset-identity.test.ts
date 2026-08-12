import { describe, expect, it } from 'vitest'

import { YAHOO_UNIVERSE, findUniverseEntryBySymbol, toSlug } from './providers/yahoo-universe'

const TOUS = Object.values(YAHOO_UNIVERSE).flat()

describe('univers Yahoo', () => {
  it("donne un identifiant d'URL unique à chaque actif", () => {
    const slugs = TOUS.map((entry) => toSlug(entry.symbol))
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  /*
   * Le domaine porte le logo. Une valeur sans domaine retombe sur un monogramme, ce
   * qui est acceptable ; une valeur au domaine MAL FORMÉ produirait une requête vers
   * une adresse inexistante à chaque rendu de ligne — un défaut silencieux, visible
   * seulement dans l'onglet réseau.
   */
  it("n'accepte que des domaines nus, sans protocole ni chemin", () => {
    for (const entry of [...YAHOO_UNIVERSE.stock, ...YAHOO_UNIVERSE.etf]) {
      if (!entry.domain) continue
      expect(entry.domain, entry.symbol).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/)
    }
  })

  /*
   * Une matière première SANS emoji tomberait sur un monogramme construit depuis
   * « GC=F » : illisible. L'emoji est donc obligatoire pour cette classe, et pour
   * elle seule — une action a son logo, un indice son monogramme de place.
   */
  it('donne un emoji et une famille à chaque matière première', () => {
    for (const entry of YAHOO_UNIVERSE.commodity) {
      expect(entry.emoji, `${entry.symbol} sans emoji`).toBeTruthy()
      expect(entry.family, `${entry.symbol} sans famille`).toBeTruthy()
    }
  })

  it('retrouve une entrée par son symbole exact', () => {
    expect(findUniverseEntryBySymbol('AAPL')?.name).toBe('Apple')
    expect(findUniverseEntryBySymbol('GC=F')?.emoji).toBeTruthy()
  })

  it('ne retrouve rien pour un symbole inconnu', () => {
    expect(findUniverseEntryBySymbol('INEXISTANT')).toBeUndefined()
  })
})
