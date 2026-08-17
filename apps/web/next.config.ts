import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

import { NEWS_IMAGE_HOSTS } from './lib/news-image-hosts'

/**
 * Greffon next-intl.
 *
 * Il ne fait qu'une chose : indiquer où trouver la configuration de requête, pour
 * que les fonctions serveur (`getTranslations`, `getLocale`) sachent quelle langue
 * servir sans qu'on la leur passe à chaque appel. Le chemin est explicite plutôt que
 * conventionnel — le greffon cherche sinon `./i18n/request.ts` à la racine du projet,
 * ce qui marche ici mais se casse en silence dès qu'on déplace le dossier.
 */
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const config: NextConfig = {
  reactStrictMode: true,

  /**
   * Dossier de sortie surchargeable, pour pouvoir construire SANS perturber un
   * serveur de développement en cours.
   *
   * `next build` et `next dev` écrivent tous deux dans `.next`. Lancer un build
   * pendant qu'un serveur tourne lui retire donc le sol sous les pieds : il continue
   * de servir des morceaux remplacés, et les symptômes — pages en 404, modules
   * introuvables — ressemblent à des défauts applicatifs. Le piège est d'autant plus
   * traître que le build, lui, réussit.
   *
   *   ZENKUU_DIST_DIR=.next-verify bun run build
   *
   * ⚠️ CETTE VARIABLE DOIT ÊTRE DÉCLARÉE DANS `turbo.json`, et elle ne l'était pas.
   * Turbo n'expose aux tâches que les variables inscrites dans `globalEnv` : sans
   * elle, `next build` lisait `undefined` et retombait sur `.next`. Le garde-fou
   * échouait donc SILENCIEUSEMENT et faisait exactement ce qu'il devait empêcher —
   * écraser le dossier du serveur de développement en cours. Constaté ici même.
   *
   * Vaut aussi pour l'intégration continue, où deux tâches peuvent bâtir en
   * parallèle sur la même copie de travail.
   *
   * ⚠️ EFFET DE BORD À CONNAÎTRE : Next réécrit `next-env.d.ts` — fichier SUIVI par
   * git — pour qu'il pointe vers le dossier de sortie utilisé. Après un build
   * isolé, ce fichier référence donc un dossier temporaire, et un `git commit`
   * distrait publierait une référence morte que personne d'autre ne peut résoudre.
   * Vérifier `git status` après coup, et rétablir `./.next/types/...` — ce que fait
   * de toute façon le prochain `next dev`.
   *
   * CE N'EST PAS THÉORIQUE : c'est arrivé. Un build en `.next-perf` a laissé
   * `import "./.next-perf/types/routes.d.ts"` dans le fichier suivi, et le dossier a
   * ensuite été supprimé — la référence pointait donc dans le vide. Rétabli par
   * `git checkout -- apps/web/next-env.d.ts`.
   *
   * ⚠️ ET LE NOM DU DOSSIER N'EST PAS LIBRE. N'utiliser QUE ceux que `.gitignore`
   * connaît — `.next-verify/`, `.next-err/` — parce que ce fichier-là interdit les
   * jokers pour une raison mesurée : Tailwind 4 y lit ses exclusions et casse sur un
   * motif `.next` suivi d'une étoile. Un dossier au nom inédit n'est pas ignoré, et se
   * retrouve dans `git status` avec ses milliers de fichiers.
   *
   * (La phrase ci-dessus évite d'écrire ce motif littéralement, et ce n'est pas une
   *  coquetterie : l'étoile suivie d'une barre oblique FERME un commentaire de bloc.
   *  Écrit tel quel, il coupait ce commentaire en deux et rendait huit erreurs de
   *  syntaxe dans un fichier de configuration qu'on ne pense pas à suspecter.)
   */
  distDir: process.env.ZENKUU_DIST_DIR || '.next',

  /**
   * Les paquets internes sont consommés en TypeScript SOURCE (`main: ./src/index.ts`),
   * sans étape de build intermédiaire : une modification dans `packages/data` est
   * visible immédiatement en développement.
   *
   * ⚠️ LES TROIS DOIVENT Y FIGURER. `@zenkuu/db` manquait, et le défaut ne s'est
   * révélé qu'en ajoutant un export : les pages qui n'utilisaient que des exports
   * anciens continuaient de fonctionner — le serveur de développement servait une
   * version périmée du paquet — tandis que la première page à en appeler un nouveau
   * tombait en erreur 500. Le build, lui, réussissait : il regroupe tout et masque
   * donc entièrement le problème.
   */
  transpilePackages: ['@zenkuu/data', '@zenkuu/db', '@zenkuu/ui'],

  /**
   * En-têtes de réponse.
   *
   * ── `Document-Policy: js-profiling` — SANS LUI, LE PROFILAGE NE MESURE RIEN ──
   *
   * L'API `Profiler` du navigateur est protégée par une politique de document : elle
   * n'existe tout simplement pas dans une page qui ne l'a pas demandée. Le piège est
   * que rien ne le signale — `browserProfilingIntegration()` se charge, s'initialise,
   * et n'échantillonne jamais. On croit profiler pendant des semaines, et le tableau
   * de bord reste vide sans qu'aucune erreur ne soit remontée.
   *
   * L'en-tête est posé sur TOUTES les routes plutôt que sur une liste : le profilage
   * suit `tracesSampleRate`, il peut donc se déclencher sur n'importe quelle page, et
   * une liste serait un piège de plus le jour où une route s'ajoute.
   *
   * Il n'active rien par lui-même — il AUTORISE. Sans intégration de profilage côté
   * client, il ne coûte que les trente octets de l'en-tête.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Document-Policy', value: 'js-profiling' }],
      },
    ]
  },

  /**
   * REDIRECTIONS PERMANENTES — les pages qui ont changé d'adresse.
   *
   * ── DEUX MOUVEMENTS, UN SEUL MÉCANISME ───────────────────────────────────
   *
   * D'abord les SEPT PAGES DE CLASSE (`/crypto`, `/actions`, `/etf`, `/indices`,
   * `/devises`, `/matieres-premieres`), qui doublaient exactement les onglets de
   * `/marches`. Ensuite les SIX SOUS-PAGES CRYPTO, sorties d'un préfixe qui ne les
   * décrivait plus : `/graphiques` ou `/classements` ne parlent pas que de crypto —
   * ils portent aussi les ETF, les actions et les indices.
   *
   * ── POURQUOI PERMANENT (308) ET NON TEMPORAIRE ───────────────────────────
   *
   * Ces adresses sont indexées et partagées. Une 307 dirait aux moteurs « revenez,
   * l'ancienne reviendra peut-être » : ils garderaient l'ancienne URL en index et le
   * classement acquis resterait attaché à une page qui n'existe plus. La 308 transfère
   * ce classement à la nouvelle adresse, ce qui est précisément ce qu'on veut.
   *
   * ── L'ORDRE COMPTE, ET LES SOUS-PAGES PASSENT EN PREMIER ─────────────────
   *
   * Next applique la PREMIÈRE règle qui correspond. `/crypto/:path*` placé avant
   * `/crypto/graphiques` avalerait la sous-page et l'enverrait sur la fiche d'actif
   * « graphiques », qui n'existe pas. Les règles les plus spécifiques sont donc en
   * tête — et c'est aussi pourquoi il n'y a AUCUNE règle attrape-tout sur
   * `/crypto/:path*` : les fiches d'actif (`/crypto/bitcoin`) n'ont pas bougé.
   *
   * ── LE PRÉFIXE DE LOCALE EST GÉRÉ PAR `:locale` ──────────────────────────
   *
   * Le site sert treize langues, dont douze préfixées (`/en/crypto`, `/de/crypto`).
   * Une règle écrite sur `/crypto` seul ne redirigerait que le français. Chaque
   * chemin est donc décliné en deux règles — nue et préfixée — la seconde bornant
   * `:locale` à deux ou trois caractères pour ne pas capturer un segment ordinaire.
   */
  async redirects() {
    /* Les sous-pages sorties du préfixe crypto. `/crypto/classement/:type` porte un
       paramètre : il est repris tel quel dans la destination. */
    const moved: [string, string][] = [
      ['/crypto/graphiques', '/graphiques'],
      ['/crypto/all-coins', '/classements'],
      ['/crypto/classement/:type', '/classements/:type'],
      ['/crypto/nouvelles', '/nouvelles-cotations'],
      ['/crypto/mouvements', '/mouvements'],
      ['/crypto/highlights', '/points-marquants'],
      ['/crypto/resoudre/:terme', '/resoudre/:terme'],
    ]

    /* Les pages de classe, vers l'onglet correspondant de `/marches`. La crypto vise
       `/marches` nu : c'est son onglet par défaut, et `?classe=crypto` décrirait la
       même page sous une seconde adresse. */
    const classes: [string, string][] = [
      ['/crypto', '/marches'],
      ['/etf', '/marches?classe=etf'],
      ['/actions', '/marches?classe=actions'],
      ['/indices', '/marches?classe=indices'],
      ['/devises', '/marches?classe=devises'],
      ['/matieres-premieres', '/marches?classe=matieres-premieres'],
    ]

    return [...moved, ...classes].flatMap(([source, destination]) => [
      { source, destination, permanent: true },
      {
        source: `/:locale(\\w{2}|pt-BR)${source}`,
        destination: `/:locale${destination}`,
        permanent: true,
      },
    ])
  },

  images: {
    // Logos d'actifs servis par CoinGecko. Liste explicite plutôt que joker : tout
    // nouvel hôte d'images doit être un ajout conscient.
    remotePatterns: [
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      // Logos d'entreprises et d'émetteurs d'ETF, indexés par domaine. Appelé
      // uniquement si `NEXT_PUBLIC_LOGO_API_KEY` est renseignée ; sans elle, aucune
      // requête ne part vers cet hôte. Servi en `unoptimized` (voir AssetLogo).
      { protocol: 'https', hostname: 'img.logo.dev' },

      /*
        VIGNETTES DES FLUX D'ACTUALITÉS — vingt-six hôtes, relevés et non supposés.
        La liste est IMPORTÉE plutôt que recopiée ici : le composant de rendu a besoin
        de la même, pour écarter une vignette dont l'hôte n'est pas déclaré AVANT de la
        rendre. Deux copies divergeraient, et le symptôme serait une fiche en erreur
        500 pour une image décorative. Voir `lib/news-image-hosts.ts`.
      */
      ...NEWS_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https' as const, hostname })),
    ],
  },
}

/**
 * Enrobage Sentry — APPLIQUÉ EN DERNIER, autour de next-intl.
 *
 * L'ordre compte : `withSentryConfig` ajoute ses greffons de compilation à la
 * configuration qu'il reçoit. Enroulé à l'intérieur, next-intl ajouterait les siens
 * après coup et les deux jeux ne se verraient pas.
 *
 * ── CE QUE CET ENROBAGE FAIT RÉELLEMENT ──────────────────────────────────
 *
 * Il ne se contente pas de « brancher Sentry » : sans lui, les piles d'appels
 * remontées désignent du code MINIFIÉ — `a.b is not a function`, ligne 1, colonne
 * 48 000 — c'est-à-dire des rapports d'erreur inexploitables. Ce sont les cartes de
 * source téléversées à la compilation qui les ramènent au fichier et à la ligne
 * d'origine, et c'est de loin ce qui distingue une installation utile d'une
 * installation décorative.
 */
export default withSentryConfig(withNextIntl(config), {
  org: 'zenkuu',
  project: 'zenkuu-web',

  /*
   * Le téléversement des cartes de source demande un JETON D'ÉCRITURE, lui
   * véritablement secret — à la différence du DSN, public par construction. Sans
   * lui, la compilation réussit et se passe simplement de cette étape : un
   * développement local ou un fork n'ont donc rien à configurer.
   */
  authToken: process.env['SENTRY_AUTH_TOKEN'],

  /*
   * TUNNEL — les événements du navigateur transitent par notre propre domaine.
   *
   * Les bloqueurs de publicité coupent les requêtes vers `*.ingest.sentry.io` : sur
   * un site de finance, dont le public est justement équipé, on perdrait une part
   * importante des erreurs côté client, et surtout une part BIAISÉE — celle des
   * visiteurs les plus outillés. Le chemin ci-dessous relaie ces envois depuis
   * notre origine, où aucun bloqueur n'a de raison d'intervenir.
   */
  tunnelRoute: '/api/surveillance',

  /* Journal de compilation muet en local, complet en intégration continue : c'est
     là-bas qu'on lit les logs quand un téléversement échoue. */
  silent: !process.env['CI'],

  /* Les appels de journalisation du SDK sont retirés du paquet servi — quelques
     kilo-octets qui ne servent qu'à déboguer Sentry lui-même. */
  webpack: { treeshake: { removeDebugLogging: true } },
})
