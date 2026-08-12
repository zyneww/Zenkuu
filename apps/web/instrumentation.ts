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
