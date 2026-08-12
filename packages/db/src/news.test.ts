import { describe, expect, it } from 'vitest'

import { canonicalUrl } from './news'

describe('canonicalUrl', () => {
  it('retire les paramètres de campagne', () => {
    expect(canonicalUrl('https://ex.com/a?utm_source=rss&utm_medium=feed')).toBe('https://ex.com/a')
  })

  it('retire les identifiants de clic des réseaux', () => {
    expect(canonicalUrl('https://ex.com/a?fbclid=XYZ')).toBe('https://ex.com/a')
    expect(canonicalUrl('https://ex.com/a?gclid=XYZ')).toBe('https://ex.com/a')
  })

  it("retire l'ancre", () => {
    expect(canonicalUrl('https://ex.com/a#partage')).toBe('https://ex.com/a')
  })

  /*
   * LE CAS QUI INTERDIT DE TOUT SUPPRIMER. Chez plus d'un éditeur, l'identité de la
   * page vit dans un paramètre : les retirer tous ferait de deux articles distincts
   * une seule et même ligne, et l'un des deux disparaîtrait définitivement de
   * l'archive — une perte silencieuse, invisible au test comme au typage.
   */
  it('CONSERVE les paramètres qui portent l’identité de la page', () => {
    expect(canonicalUrl('https://ex.com/article?id=1234')).toBe('https://ex.com/article?id=1234')
    expect(canonicalUrl('https://ex.com/p?page=2&utm_source=rss')).toBe('https://ex.com/p?page=2')
  })

  it('unifie la barre oblique finale', () => {
    expect(canonicalUrl('https://ex.com/a/')).toBe(canonicalUrl('https://ex.com/a'))
  })

  it('préserve la racine du site', () => {
    expect(canonicalUrl('https://ex.com/')).toBe('https://ex.com/')
  })

  /* Deux formes du même article doivent produire la MÊME clé — c'est tout l'objet
     de cette fonction, et ce que l'index unique exploite. */
  it('donne la même clé à deux variantes du même article', () => {
    const a = canonicalUrl('https://ex.com/actu/bitcoin/?utm_source=rss#top')
    const b = canonicalUrl('https://ex.com/actu/bitcoin')
    expect(a).toBe(b)
  })

  it('donne des clés différentes à deux articles différents', () => {
    expect(canonicalUrl('https://ex.com/a')).not.toBe(canonicalUrl('https://ex.com/b'))
  })

  /* Une URL illisible ne doit pas faire échouer toute la collecte : on la garde
     telle quelle plutôt que de perdre l'article. */
  it('rend une URL mal formée inchangée plutôt que de lever', () => {
    expect(canonicalUrl('pas-une-url')).toBe('pas-une-url')
  })
})
