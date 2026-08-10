import { describe, expect, it } from 'vitest'

import { cached, createMemoryCache } from './cache'

/**
 * Le défaut couvert ici a coûté cher à diagnostiquer, et il est indétectable à
 * l'œil : une clé de cache pouvait rester DÉFINITIVEMENT en erreur.
 *
 * Mécanisme : `cached` déduplique les appels concurrents via une table de requêtes
 * en vol. Le retrait de la clé était placé dans un `finally` à l'intérieur de la
 * fonction asynchrone. Or le corps d'une fonction `async` s'exécute de façon
 * synchrone jusqu'au premier `await` — donc un `fetcher` qui lève AVANT d'attendre
 * quoi que ce soit déclenchait ce `finally` avant même que la clé ne soit inscrite.
 * La promesse rejetée était ensuite inscrite, et plus rien ne l'en retirait.
 *
 * Symptôme observé : une fiche restée en panne après correction de sa cause, tandis
 * que ses voisines — jamais demandées avant le correctif — fonctionnaient.
 */

describe('cached', () => {
  it('ne garde pas une clé bloquée après un échec SYNCHRONE du fetcher', async () => {
    const key = `test:sync-throw:${process.hrtime.bigint()}`

    // Premier appel : le fetcher lève sans jamais attendre — le cas des gardes de
    // contrat (« méthode non supportée par cette source »).
    await expect(
      cached(key, () => {
        throw new Error('panne')
      }),
    ).rejects.toThrow('panne')

    // Deuxième appel, cause corrigée. Avant le correctif, celui-ci recevait encore
    // « panne » : la promesse rejetée était restée dans la table des requêtes en vol.
    await expect(cached(key, async () => 'ok')).resolves.toBe('ok')
  })

  it('ne garde pas une clé bloquée après un échec ASYNCHRONE du fetcher', async () => {
    const key = `test:async-throw:${process.hrtime.bigint()}`

    await expect(
      cached(key, async () => {
        await Promise.resolve()
        throw new Error('réseau')
      }),
    ).rejects.toThrow('réseau')

    await expect(cached(key, async () => 'ok')).resolves.toBe('ok')
  })

  it('sert la dernière valeur connue quand le rafraîchissement échoue', async () => {
    const key = `test:stale:${process.hrtime.bigint()}`

    // TTL nul : la valeur est mémorisée puis immédiatement périmée.
    await expect(cached(key, async () => 'frais', 0)).resolves.toBe('frais')

    // La source tombe. Sans filet, tout le module concerné disparaîtrait de la page
    // alors qu'un relevé de dix minutes reste parfaitement lisible.
    await expect(
      cached(
        key,
        async () => {
          throw new Error('source muette')
        },
        0,
      ),
    ).resolves.toBe('frais')
  })

  it('propage l’erreur quand il n’y a AUCUNE valeur antérieure', async () => {
    const key = `test:no-stale:${process.hrtime.bigint()}`

    // Le filet ne doit pas transformer une absence en silence : sans rien à servir,
    // l'appelant doit voir l'échec et rendre un état vide explicite (§5).
    await expect(
      cached(key, async () => {
        throw new Error('source muette')
      }),
    ).rejects.toThrow('source muette')
  })

  it('déduplique bien les appels concurrents sur une même clé', async () => {
    const key = `test:dedupe:${process.hrtime.bigint()}`
    let calls = 0

    const fetcher = async () => {
      calls += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return calls
    }

    const [a, b, c] = await Promise.all([
      cached(key, fetcher),
      cached(key, fetcher),
      cached(key, fetcher),
    ])

    // Un seul appel sortant pour trois demandes simultanées : c'est la raison d'être
    // de la table des requêtes en vol.
    expect(calls).toBe(1)
    expect([a, b, c]).toEqual([1, 1, 1])
  })
})

describe('createMemoryCache', () => {
  it('rend une entrée expirée comme absente plutôt que périmée', async () => {
    const store = createMemoryCache()
    await store.set('k', 'v', 0)
    // TTL nul : l'entrée est expirée à l'instant même où on la relit.
    expect(await store.get('k')).toBeNull()
  })

  it('distingue une valeur absente d’une valeur fausse', async () => {
    const store = createMemoryCache()
    await store.set('zero', 0, 60)
    // `0` est une valeur légitime : la lecture ne doit pas la confondre avec
    // « rien en cache », ce qu'un test de véracité ferait.
    expect(await store.get('zero')).toBe(0)
  })
})
