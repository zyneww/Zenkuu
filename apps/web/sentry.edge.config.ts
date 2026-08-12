import * as Sentry from '@sentry/nextjs'

/**
 * Sentry — exécution EDGE (intergiciel, routes déclarées en `edge`).
 *
 * Fichier distinct de `sentry.server.config.ts`, et non un partage : l'exécution
 * edge n'est pas Node. Elle n'a ni système de fichiers, ni `process` complet, ni
 * la plupart des modules natifs, et le SDK y charge un jeu d'intégrations réduit.
 * Réunir les deux dans un seul fichier ferait entrer du code Node dans un
 * environnement qui ne peut pas l'exécuter.
 *
 * Cela concerne ici l'intergiciel `next-intl`, traversé par CHAQUE requête du site
 * — c'est-à-dire l'endroit où une erreur casse tout, et le dernier où on penserait
 * à regarder.
 *
 * Les réglages reprennent ceux du serveur ; leurs justifications sont écrites
 * là-bas, et les répéter ici les ferait diverger à la première retouche.
 */
Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
  environment: process.env['VERCEL_ENV'] ?? process.env.NODE_ENV,
  ...(process.env['VERCEL_GIT_COMMIT_SHA']
    ? { release: process.env['VERCEL_GIT_COMMIT_SHA'] }
    : {}),
  sendDefaultPii: false,
})
