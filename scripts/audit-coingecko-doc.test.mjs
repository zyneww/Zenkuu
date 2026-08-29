import { describe, expect, it } from 'vitest'

import { CHAMPS, verifier } from './audit-coingecko-doc.mjs'

/** Un document minimal mais conforme : une page listée, cochée, et son entrée. */
const CONFORME = `# Audit de CoinGecko

## Liste des pages

- [x] Accueil — \`/fr\`

## Entrées

### Accueil — \`/fr\`

- **Date du relevé** : 2026-08-29
- **Rôle** : la porte d'entrée du site.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - tableau des cotations
  - bandeau des tendances
- **Fonctionnalités** : tri des colonnes, pagination
- **Interactions** : survol de ligne, ouverture du menu principal
- **Données requises** : cotations — CoinGecko, disponible
- **Écart avec ZENKUU** : \`/fr\` — trois colonnes manquantes
- **Notes** : rien à signaler
`

describe('verifier', () => {
  it('ne remonte aucun problème sur un document conforme', () => {
    const { problemes, restantes, entrees } = verifier(CONFORME)
    expect(problemes).toEqual([])
    expect(restantes).toEqual([])
    expect(entrees).toBe(1)
  })

  it('accepte une valeur de champ étalée sur les lignes suivantes', () => {
    /* « Composants » n'a rien après les deux-points : sa valeur est la liste en
       dessous. Un vérificateur qui ne lit que la fin de ligne la déclarerait vide. */
    expect(verifier(CONFORME).problemes).toEqual([])
  })

  it('signale un champ manquant', () => {
    const source = CONFORME.replace('- **Notes** : rien à signaler\n', '')
    expect(verifier(source).problemes).toContain('/fr : champ « Notes » manquant.')
  })

  it('signale un champ présent mais vide', () => {
    const source = CONFORME.replace('- **Rôle** : la porte d\'entrée du site.', '- **Rôle** :')
    expect(verifier(source).problemes).toContain('/fr : champ « Rôle » vide.')
  })

  it('signale une date qui n’est pas au format AAAA-MM-JJ', () => {
    const source = CONFORME.replace('2026-08-29', '29 août 2026')
    expect(verifier(source).problemes).toContain(
      '/fr : « Date du relevé » n’est pas une date AAAA-MM-JJ.',
    )
  })

  it('signale une case cochée sans entrée d’audit', () => {
    /* Tout ce qui suit le titre d'entrée est retiré : la case reste cochée, l'entrée
       disparaît. C'est exactement l'état d'un audit interrompu entre deux étapes. */
    const source = CONFORME.split('### Accueil')[0]
    expect(verifier(source).problemes).toContain('/fr : case cochée sans entrée d’audit.')
  })

  it('signale une entrée absente de la liste des pages', () => {
    const source = CONFORME.replace('- [x] Accueil — `/fr`', '- [x] Autre — `/fr/autre`')
    expect(verifier(source).problemes).toContain(
      '/fr : entrée présente mais absente de la liste des pages.',
    )
  })

  it('compte les pages restantes sans en faire un problème', () => {
    const source = CONFORME.replace(
      '- [x] Accueil — `/fr`',
      '- [x] Accueil — `/fr`\n- [ ] Catégories — `/fr/categories`',
    )
    const { problemes, restantes } = verifier(source)
    expect(problemes).toEqual([])
    expect(restantes).toEqual(['/fr/categories'])
  })

  it('signale un document sans liste de pages', () => {
    expect(verifier('# Rien\n').problemes).toContain(
      'Aucune liste de pages : la section « Liste des pages » est vide ou absente.',
    )
  })

  it('exporte les dix champs du schéma', () => {
    expect(CHAMPS).toHaveLength(10)
  })
})
