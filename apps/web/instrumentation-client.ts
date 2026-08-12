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
 * ── CE QUI N'EST PAS ACTIVÉ, ET POURQUOI ──────────────────────────────────────
 *
 * L'ENREGISTREMENT DE SESSION (`replayIntegration`) est écarté. Il filme
 * littéralement l'écran du visiteur pour le rejouer, ce qui suppose de transmettre
 * le contenu de ses pages — sur un site où l'on consulte un portefeuille et une
 * liste de suivi, c'est de la donnée personnelle. Il ajoute par ailleurs une
 * cinquantaine de kilo-octets au paquet, à rebours du travail d'allègement mené
 * par ailleurs.
 *
 * Le PROFILAGE de navigateur est écarté de même : il coûte du temps de calcul chez
 * le visiteur pour un diagnostic dont nous n'avons pas l'usage aujourd'hui.
 */
Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
  environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env.NODE_ENV,

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
