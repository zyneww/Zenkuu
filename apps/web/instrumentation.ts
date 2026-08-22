import * as Sentry from '@sentry/nextjs'

/**
 * Point d'entrée d'instrumentation, appelé par Next.js AVANT tout code applicatif.
 *
 * Les deux configurations sont importées de façon PARESSEUSE, dans la branche qui
 * les concerne : `sentry.server.config` charge des modules Node que l'exécution
 * edge ne sait pas exécuter, et un import en tête de fichier serait évalué dans les
 * deux cas. C'est la raison de cette forme, documentée telle quelle par Sentry.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    /*
     * PLAFOND D'ÉCOUTEURS RELEVÉ, sinon Node avertit à chaque requête.
     *
     * Le SDK Sentry pose un écouteur `close` sur la `ServerResponse` par span
     * ouvert, pour savoir quand refermer la trace. Node limite par défaut un
     * émetteur à DIX écouteurs et crie au-delà :
     *
     *   MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
     *   11 close listeners added to [ServerResponse].
     *
     * Ce n'est pas une fuite, et le diagnostic tient à `sentry.server.config.ts` :
     * `tracesSampleRate` y vaut 1 EN DÉVELOPPEMENT — volontairement, pour voir ce
     * qu'on vient d'écrire. Tout est donc tracé, le onzième écouteur arrive, et
     * l'avertissement sort sur toutes les pages un peu composées. En production le
     * taux retombe à 10 % et le seuil n'est jamais approché : c'est un artefact du
     * mode développement, pas un défaut applicatif.
     *
     * Baisser l'échantillonnage en développement ferait taire le message, mais au
     * prix de ce que ce réglage sert à obtenir. On relève donc le plafond.
     *
     * 32 est choisi pour rester un GARDE-FOU UTILE : une vraie fuite d'écouteurs
     * se compte en centaines, elle franchira toujours ce seuil et avertira. Un
     * plafond à `Infinity` supprimerait le message au lieu du problème.
     */
    const { EventEmitter } = await import('node:events')
    EventEmitter.defaultMaxListeners = 32

    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Erreurs des COMPOSANTS SERVEUR, de l'intergiciel et des gestionnaires de route.
 *
 * Ce raccordement est ce qui distingue une installation qui remonte tout d'une
 * installation qui ne remonte que le navigateur. Une erreur levée pendant le rendu
 * serveur d'une fiche d'actif ne passe par aucun gestionnaire du client : sans cet
 * export, elle se traduit par une page d'erreur chez le visiteur et par un silence
 * complet dans Sentry.
 *
 * C'est précisément le cas le plus fréquent ici — les fiches interrogent des API
 * de marché tierces au moment du rendu.
 */
export const onRequestError = Sentry.captureRequestError
