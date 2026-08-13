import * as Sentry from '@sentry/nextjs'

/**
 * Sentry — NAVIGATEUR.
 *
 * ── POURQUOI UNE VARIABLE `NEXT_PUBLIC_` ICI, ET NON LA MÊME QU'AILLEURS ──────
 *
 * Ce fichier part dans le paquet servi aux visiteurs. Next.js n'y remplace que
 * les variables préfixées `NEXT_PUBLIC_` ; toute autre vaut `undefined` une fois
 * dans le navigateur. Lire `SENTRY_DSN` ici donnerait donc un SDK muet, sans que
 * rien ne le signale — l'erreur classique d'une installation Sentry, et celle qui
 * fait croire pendant des jours que « le site ne remonte rien ».
 *
 * Les deux variables portent la même valeur : le DSN est public par construction,
 * puisqu'il voyage de toute façon avec le code de la page.
 *
 * ── L'ENREGISTREMENT DE SESSION EST DÉSORMAIS ACTIF, SOUS CONDITIONS ─────────
 *
 * Il était écarté, et le motif tenait : le rejeu filme l'écran du visiteur, donc le
 * contenu de ses pages — sur un site où l'on consulte un portefeuille et une liste de
 * suivi, c'est de la donnée personnelle. Il pèse en outre une cinquantaine de
 * kilo-octets.
 *
 * Les deux objections sont traitées, pas contournées :
 *
 *   · MASQUAGE MAXIMAL. Tout le texte est masqué, toutes les saisies bloquées, images
 *     et médias bloqués. On voit le PARCOURS — quels blocs, quels clics, quel ordre —
 *     sans qu'un montant, un nom d'actif suivi ou une adresse ne quitte le navigateur.
 *     C'est ce qui rend le rejeu utile au diagnostic ET compatible avec le §9.
 *
 *   · ZÉRO SESSION NORMALE. `replaysSessionSampleRate: 0` : rien n'est envoyé tant
 *     qu'il ne se passe rien. Seule une session qui produit une ERREUR est transmise,
 *     et alors en entier grâce au tampon que l'intégration tient en mémoire. Le coût
 *     de quota est proportionnel aux pannes, pas au trafic.
 *
 * Le poids du module, lui, reste réel et assumé : c'est le prix d'un rejeu, et aucun
 * réglage ne le supprime.
 *
 * ── PROFILAGE NAVIGATEUR — « FIND SLOW CODE » ────────────────────────────────
 *
 * `browserProfilingIntegration` échantillonne la pile d'appels pendant les
 * transactions déjà tracées, ce qui désigne la FONCTION lente et non seulement la
 * page lente. Il exige un en-tête `Document-Policy: js-profiling`, servi par
 * `next.config.ts` — sans lui l'intégration se charge, ne mesure rien, et ne le dit
 * pas.
 *
 * ── JOURNAUX ─────────────────────────────────────────────────────────────────
 *
 * `enableLogs` ouvre le flux de journaux, et `consoleLoggingIntegration` y verse les
 * appels console. Bornée à `warn` et `error` : un site de marché écrit des
 * `console.log` de diagnostic à chaque rafraîchissement, et tout envoyer reviendrait
 * à payer un quota pour du bruit qu'on n'ouvrira jamais.
 */
Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
  environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env.NODE_ENV,

  /*
   * PROFILAGE — proportion des TRANSACTIONS TRACÉES, et non du trafic.
   *
   * Le taux se multiplie à `tracesSampleRate` : 0,1 × 0,1 = un pour cent des
   * chargements en production. C'est le piège classique de ce réglage — le lire comme
   * une part du trafic fait viser dix fois trop haut, et le profilage coûte du temps
   * de calcul CHEZ LE VISITEUR.
   */
  profilesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,

  /* Journaux structurés. Voir l'en-tête pour la borne posée sur la console. */
  enableLogs: true,

  /*
   * Sessions NORMALES : rien. Sessions avec ERREUR : tout.
   *
   * L'intégration tient un tampon en mémoire et ne l'expédie qu'au moment où une
   * erreur survient — on obtient donc les secondes qui PRÉCÈDENT la panne, ce que ni
   * une trace ni une pile d'appels ne donnent.
   */
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,

  integrations: [
    Sentry.replayIntegration({
      /* Les trois masquages sont posés EXPLICITEMENT alors que deux sont déjà les
         défauts du SDK. Un réglage de confidentialité qui dépend d'un défaut non
         écrit est un réglage qu'une mise à jour peut retourner en silence — et ici,
         le retournement se paierait en données personnelles expédiées à un tiers. */
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),

    Sentry.browserProfilingIntegration(),

    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],

  ...(process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA']
    ? { release: process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'] }
    : {}),

  sendDefaultPii: false,

  /*
   * BRUIT ÉCARTÉ À LA SOURCE.
   *
   * Un site public reçoit des erreurs qui ne viennent pas de son code : extensions
   * de navigateur qui injectent leurs scripts, traducteurs automatiques,
   * `ResizeObserver loop` — un avertissement que la spécification qualifie
   * elle-même de bénin et que Chrome émet à chaque redimensionnement un peu
   * chargé. Les laisser passer noie les vraies erreurs sous un bruit permanent,
   * et une file d'alertes que plus personne ne lit ne sert à rien.
   *
   * Le filtre est écrit ici, côté client, et non en règle d'ignorance dans
   * l'interface de Sentry : il est ainsi versionné avec le code, visible en revue,
   * et il ne consomme pas de quota puisque l'événement n'est jamais transmis.
   */
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    /^Non-Error promise rejection captured/,
  ],

  denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
})

/**
 * Rattache les navigations à leurs traces.
 *
 * Sans cet export, une erreur survenue APRÈS un changement de page est encore
 * rattachée à la trace de la page précédente : la pile est juste, le contexte est
 * faux, et l'on cherche le défaut au mauvais endroit. Requis à partir du SDK 9.12.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
