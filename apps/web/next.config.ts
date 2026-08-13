import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

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
   * Vaut aussi pour l'intégration continue, où deux tâches peuvent bâtir en
   * parallèle sur la même copie de travail.
   *
   * ⚠️ EFFET DE BORD À CONNAÎTRE : Next réécrit `next-env.d.ts` — fichier SUIVI par
   * git — pour qu'il pointe vers le dossier de sortie utilisé. Après un build
   * isolé, ce fichier référence donc un dossier temporaire, et un `git commit`
   * distrait publierait une référence morte que personne d'autre ne peut résoudre.
   * Vérifier `git status` après coup, et rétablir `./.next/types/...` — ce que fait
   * de toute façon le prochain `next dev`.
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
