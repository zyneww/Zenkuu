import { describe, expect, it, vi } from 'vitest'

import { createHttpClient } from './http'
import { ProviderError } from './types'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA FILE D'ATTENTE RENONCE, ELLE N'ATTEND PAS INDÉFINIMENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ CE TEST EXISTE PARCE QUE LE DÉFAUT S'EST PRODUIT, ET QU'IL ÉTAIT INVISIBLE.
 *
 * Le limiteur de débit bouclait sans borne : tant que sa fenêtre restait pleine, il
 * dormait et recommençait. Rien ne cassait, rien n'était journalisé, aucun test ne
 * tombait — la page se contentait de ne jamais répondre.
 *
 * Mesuré sur la build de production, après qu'un audit eut saturé le quota du
 * fournisseur : `/crypto/bitcoin` n'avait toujours rien rendu au bout de cent trente
 * secondes, quand `/crypto` et `/categories`, qui essuyaient le même refus,
 * dégradaient en moins de deux cents millisecondes. La différence ne venait pas du
 * fournisseur mais de notre propre file.
 *
 * ── CE QUE LE TEST FIXE, ET CE QU'IL LAISSE LIBRE ──────────────────────────
 *
 * Il ne fixe ni la durée d'attente ni le nombre de requêtes par fenêtre : ce sont des
 * réglages, et les figer ici transformerait chaque ajustement en échec de test. Il
 * fixe la seule chose qui compte : passé le budget, l'appel REND LA MAIN avec une
 * erreur que la couche de données sait traiter — jamais un silence.
 */
describe("file d'attente du limiteur", () => {
  it('rend un ProviderError retryable au lieu d’attendre sans fin', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    /*
     * UNE SEULE requête par minute, et un budget de cent millisecondes. Le premier
     * appel consomme la fenêtre ; le second devrait donc attendre près d'une minute,
     * ce qu'aucun lecteur n'accepterait — et c'est exactement la situation que le
     * défaut produisait en vrai.
     */
    const client = createHttpClient({
      providerId: 'essai',
      baseUrl: 'https://exemple.test/',
      maxRequestsPerWindow: 1,
      windowMs: 60_000,
      minIntervalMs: 0,
      timeoutMs: 100,
    })

    await expect(client.getJson('/premier')).resolves.toEqual({ ok: true })

    const debut = Date.now()
    await expect(client.getJson('/second')).rejects.toThrow(ProviderError)
    const attendu = Date.now() - debut

    /* Marge large : on vérifie qu'il RENONCE, pas qu'il renonce à la milliseconde. */
    expect(attendu).toBeLessThan(5_000)

    vi.unstubAllGlobals()
  })

  it('marque l’erreur comme reprenable — la pression retombe, l’appel repassera', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    )

    const client = createHttpClient({
      providerId: 'essai',
      baseUrl: 'https://exemple.test/',
      maxRequestsPerWindow: 1,
      windowMs: 60_000,
      minIntervalMs: 0,
      timeoutMs: 50,
    })

    await client.getJson('/premier')
    await client.getJson('/second').then(
      () => expect.unreachable('le second appel aurait dû être refusé'),
      (error: unknown) => {
        expect(error).toBeInstanceOf(ProviderError)
        /* `retryable` est ce qui distingue « reviens plus tard » de « cette donnée
           n'existe pas » : la couche au-dessus ne dégrade pas de la même façon. */
        expect((error as ProviderError).retryable).toBe(true)
      },
    )

    vi.unstubAllGlobals()
  })
})
