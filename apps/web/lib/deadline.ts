import type { DataResult } from '@zenkuu/data'

/**
 * ÉCHÉANCE POSÉE PAR LE CONSOMMATEUR, ET NON PAR LE TRANSPORT.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE CETTE FONCTION CORRIGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Mesuré le 17 août 2026 : la page d'accueil mettait 25,3 secondes à rendre son
 * premier octet sur un cache froid. Une seule cause — `getForexRates()`, dans le
 * `Promise.all` du haut de page, attendait le délai plein de son fournisseur.
 *
 * Ce fournisseur était en panne : `api.frankfurter.dev` rendait 522 (Cloudflare ne
 * joint pas l'origine) sur deux appels, puis plus rien du tout. Son délai est réglé à
 * 25 secondes, et ce réglage est JUSTE — voir son adaptateur : la BCE ne publie qu'un
 * taux par jour ouvré, la valeur est mise en cache une heure, et une page qui PARLE de
 * devises a tout intérêt à attendre plutôt qu'à se déclarer vide.
 *
 * ── DEUX BESOINS OPPOSÉS POUR LA MÊME REQUÊTE ────────────────────────────────
 *
 * C'est là qu'est le nœud, et il n'a pas de réponse dans le transport :
 *
 *   · `/devises` et `/marches?classe=devises` VIVENT de cette donnée. Attendre
 *     vingt-cinq secondes y est préférable à une page vide.
 *   · la page d'accueil s'en sert pour un ruban décoratif et un compteur de couverture.
 *     Rien n'y justifie de retenir le premier écran une seule seconde de plus.
 *
 * Baisser le délai de l'adaptateur servirait la seconde en sacrifiant la première.
 * L'échéance appartient donc à l'APPELANT, qui seul sait ce que la donnée lui coûte.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE NE FAIT PAS : ANNULER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La requête continue en arrière-plan et remplit le cache applicatif. C'est le point
 * qui rend ce compromis gagnant plutôt que neutre : le visiteur qui déclenche
 * l'échéance ne voit pas les devises, mais il a PAYÉ le réchauffement du cache pour
 * les suivants. Annuler l'appel rendrait chaque visite aussi froide que la première.
 *
 * Conséquence assumée : la promesse abandonnée doit être consommée, sinon un rejet
 * tardif remonte en « unhandled rejection » et fait tomber le processus Node. D'où le
 * `.catch()` posé avant la course.
 */
export function withDeadline<T>(
  promise: Promise<DataResult<T>>,
  ms: number,
  /**
   * Ce qui est rendu quand l'échéance tombe.
   *
   * Une raison EXPLICITE plutôt qu'un message générique : l'affichage la montre, et
   * « source lente » n'apprend rien là où « les taux n'ont pas répondu en 2 s » dit à
   * la fois quoi, combien de temps, et que ce n'est pas définitif.
   */
  reason: string,
): Promise<DataResult<T>> {
  /* La promesse est neutralisée AVANT la course. Un rejet qui survient après que
     `Promise.race` a déjà tranché n'aurait plus personne pour l'attraper. */
  const settled = promise.catch(
    (): DataResult<T> => ({ ok: false, kind: 'error', reason, source: null }),
  )

  const expiry = new Promise<DataResult<T>>((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, kind: 'error', reason, source: null }), ms)
    /* `unref` : ce minuteur ne doit pas retenir le processus. Sans lui, un script de
       build ou de test resterait éveillé jusqu'à l'échéance après avoir fini. La
       méthode n'existe pas dans le minuteur du navigateur, d'où le test. */
    if (typeof timer === 'object' && timer !== null && 'unref' in timer) timer.unref()
  })

  return Promise.race([settled, expiry])
}
