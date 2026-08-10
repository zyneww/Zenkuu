import { describe, expect, it } from 'vitest'

import { frankfurterProvider } from './providers/frankfurter'
import { yahooProvider } from './providers/yahoo'
import { ProviderError } from './types'

/**
 * Tests de CONTRAT des adaptateurs — pas de leurs données.
 *
 * Ces deux vérifications portent sur des défauts qui ont réellement existé et que ni
 * le typage ni un audit de statut HTTP n'attrapait :
 *
 *  · `getAsset` manquait chez Frankfurter. Le contrat `MarketDataProvider` déclare la
 *    méthode OPTIONNELLE — à juste titre, toutes les sources ne la publient pas — si
 *    bien que son absence compilait parfaitement. Résultat : les huit paires de
 *    devises étaient cliquables et menaient toutes à « Actif introuvable », avec un
 *    code 200. Une page d'erreur répond 200 : aucun audit de statut ne le voyait.
 *
 *  · Yahoo signalait un identifiant inconnu par une erreur ordinaire dans `getAsset`
 *    et par une erreur marquée `notFound` dans `getHistory` — deux copies d'une même
 *    règle, divergentes sur le seul détail qui décide d'un 404.
 *
 * Aucun appel réseau ici : les deux cas testés échouent AVANT toute requête, sur la
 * seule résolution de l'identifiant. Un test qui joindrait la source dépendrait de sa
 * disponibilité et cesserait de dire quoi que ce soit sur notre code.
 */

describe('contrat des adaptateurs', () => {
  it('Frankfurter expose bien une fiche par paire', () => {
    // Sans cette méthode, TOUTES les fiches devises sont mortes — le défaut ne se
    // voyait qu'en suivant un lien depuis le classement.
    expect(typeof frankfurterProvider.getAsset).toBe('function')
    expect(typeof frankfurterProvider.getHistory).toBe('function')
  })

  it('Frankfurter marque une paire inconnue comme inexistante, pas comme en panne', async () => {
    const error = await frankfurterProvider
      .getAsset!('eur-zzz', 'forex')
      .then(() => null)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ProviderError)
    expect((error as ProviderError).notFound).toBe(true)
  })

  it('Yahoo marque un symbole hors univers comme inexistant dans les deux méthodes', async () => {
    const fromAsset = await yahooProvider
      .getAsset!('ceci-nexiste-pas', 'stock')
      .then(() => null)
      .catch((thrown: unknown) => thrown)

    const fromHistory = await yahooProvider
      .getHistory!('ceci-nexiste-pas', 30, 'stock')
      .then(() => null)
      .catch((thrown: unknown) => thrown)

    for (const error of [fromAsset, fromHistory]) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).notFound).toBe(true)
    }
  })

  it('un 404 de la source vaut inexistence sans avoir à le déclarer', () => {
    expect(new ProviderError('x', 'msg', { status: 404 }).notFound).toBe(true)
    expect(new ProviderError('x', 'msg', { status: 500 }).notFound).toBe(false)
    expect(new ProviderError('x', 'msg').notFound).toBe(false)
  })
})
