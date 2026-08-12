import * as Sentry from '@sentry/nextjs'

/**
 * Sentry — exécution NODE (rendu serveur, routes d'API, tâches planifiées).
 *
 * ── LE DSN EST LU DANS L'ENVIRONNEMENT, ET SON ABSENCE EST UN CAS NORMAL ──────
 *
 * Sans `SENTRY_DSN`, le SDK s'initialise à vide et ne transmet RIEN : aucune
 * requête réseau, aucun coût, aucune latence ajoutée. C'est ce qui permet de
 * lancer le site en développement, dans un fork ou dans un test sans compte
 * Sentry, et sans qu'aucune condition ne soit écrite ici.
 *
 * Le DSN n'est pas un secret — il est public par construction, puisqu'il part
 * aussi depuis le navigateur des visiteurs. Ce qui doit rester secret est le
 * JETON DE PUBLICATION (`SENTRY_AUTH_TOKEN`), qui sert à téléverser les cartes de
 * source au moment de la compilation. Les deux ne se confondent pas.
 *
 * ── LES TAUX D'ÉCHANTILLONNAGE NE SONT PAS DES VALEURS ARBITRAIRES ────────────
 *
 * Les ERREURS partent toutes : une erreur non observée est une erreur qui ne sera
 * pas corrigée, et leur volume est faible par nature.
 *
 * Les TRACES de performance, elles, sont échantillonnées à 10 % en production.
 * Une trace est émise à chaque requête ; sur un site de marché rafraîchi en
 * permanence, tout tracer saturerait le quota en quelques heures et ne dirait rien
 * de plus — la distribution des temps de réponse se lit aussi bien sur un dixième
 * des requêtes. En développement, tout est tracé : le volume est nul et l'on veut
 * voir ce que l'on vient d'écrire.
 */
Sentry.init({
  dsn: process.env['SENTRY_DSN'],

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,

  /*
   * L'ENVIRONNEMENT sépare les erreurs de production de celles d'un aperçu.
   *
   * Sans lui, une erreur d'une branche de test remonte dans la même file que la
   * production et déclenche les mêmes alertes. `VERCEL_ENV` distingue déjà
   * `production`, `preview` et `development` ; on le reprend plutôt que d'inventer
   * une variable de plus.
   */
  environment: process.env['VERCEL_ENV'] ?? process.env.NODE_ENV,

  /*
   * VERSION — indispensable pour que les cartes de source servent à quelque chose.
   *
   * Une pile d'appels ne peut être ramenée au code d'origine que si Sentry sait
   * QUELLE version a produit l'erreur. Sans cette valeur, les cartes téléversées
   * au moment de la compilation ne sont rattachées à rien, et les traces restent
   * illisibles — le défaut le plus courant d'une installation Sentry.
   */
  ...(process.env['VERCEL_GIT_COMMIT_SHA']
    ? { release: process.env['VERCEL_GIT_COMMIT_SHA'] }
    : {}),

  /*
   * DONNÉES PERSONNELLES : rien n'est joint par défaut.
   *
   * `sendDefaultPii` à `false` empêche le SDK d'attacher l'adresse IP, les
   * en-têtes de requête et les cookies aux événements. C'est déjà le défaut du
   * SDK ; on l'écrit quand même, parce qu'un réglage de confidentialité qui
   * dépend d'un défaut non écrit est un réglage qu'une mise à jour peut retourner
   * en silence.
   */
  sendDefaultPii: false,
})
