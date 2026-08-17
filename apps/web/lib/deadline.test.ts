import { describe, expect, it, vi } from 'vitest'

import { withDeadline } from './deadline'

/** Résultat de succès minimal, au format `DataResult`. */
const ok = <T>(data: T) => ({ ok: true as const, data, source: { label: 'test', attributionUrl: '#' } })

/** Promesse qui aboutit après `ms`, sans retenir le processus. */
function apres<T>(ms: number, valeur: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(valeur), ms)
    if (typeof t === 'object' && t !== null && 'unref' in t) t.unref()
  })
}

describe('withDeadline', () => {
  it('rend la valeur quand la source répond avant l’échéance', async () => {
    const résultat = await withDeadline(Promise.resolve(ok([1, 2, 3])), 1000, 'trop lent')
    expect(résultat.ok).toBe(true)
    if (résultat.ok) expect(résultat.data).toEqual([1, 2, 3])
  })

  it('rend un échec porteur de la raison quand l’échéance tombe', async () => {
    const résultat = await withDeadline(apres(5000, ok('jamais vu')), 20, 'les taux tardent')
    expect(résultat.ok).toBe(false)
    if (!résultat.ok) {
      expect(résultat.reason).toBe('les taux tardent')
      // `error` et non `notFound` : la donnée existe, elle n'est pas arrivée à temps.
      // Confondre les deux ferait rendre un 404 pour une source lente.
      expect(résultat.kind).toBe('error')
    }
  })

  /**
   * LE test de ce fichier. Une promesse rejetée APRÈS que la course est tranchée n'a
   * plus personne pour l'attraper : Node remonte alors « unhandled rejection » et, en
   * production, tombe. C'est le genre de défaut qui ne se voit qu'en charge.
   */
  it('ne laisse pas un rejet tardif remonter en rejet non traité', async () => {
    const espion = vi.fn()
    process.on('unhandledRejection', espion)

    const tardif = new Promise((_, reject) => {
      const t = setTimeout(() => reject(new Error('la source a fini par échouer')), 30)
      if (typeof t === 'object' && t !== null && 'unref' in t) t.unref()
    }) as Promise<ReturnType<typeof ok<string>>>

    const résultat = await withDeadline(tardif, 10, 'échéance')
    expect(résultat.ok).toBe(false)

    // On laisse le rejet se produire, bien après que la course est jouée.
    await apres(60, null)

    process.off('unhandledRejection', espion)
    expect(espion).not.toHaveBeenCalled()
  })

  it('rend l’échec de la source quand elle échoue AVANT l’échéance', async () => {
    const résultat = await withDeadline(
      Promise.reject(new Error('502')) as Promise<ReturnType<typeof ok<string>>>,
      1000,
      'raison de repli',
    )
    expect(résultat.ok).toBe(false)
    if (!résultat.ok) expect(résultat.reason).toBe('raison de repli')
  })

  /* L'appel n'est pas annulé : c'est ce qui fait que le visiteur qui déclenche
     l'échéance réchauffe quand même le cache pour les suivants. */
  it('laisse la promesse d’origine se poursuivre après l’échéance', async () => {
    let acheveé = false
    const lente = apres(40, ok('arrivé')).then((v) => {
      acheveé = true
      return v
    })

    await withDeadline(lente, 10, 'échéance')
    expect(acheveé).toBe(false)

    await apres(60, null)
    expect(acheveé).toBe(true)
  })
})
