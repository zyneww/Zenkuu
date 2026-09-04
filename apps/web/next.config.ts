import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

import { TRANSLATED_LOCALES } from './components/settings/languages'
import { ROUTE_ADDRESSES } from './i18n/pathnames'
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

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE DÉMÉNAGEMENT DE LANGUE — LES DEUX FAMILLES D'ADRESSES QU'IL LAISSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * L'anglais devient la langue par défaut, donc la langue SANS préfixe, et il reçoit
 * ses propres slugs. Deux jeux d'adresses cessent alors d'exister, et tous deux sont
 * indexés :
 *
 *   · les ANGLAISES d'hier, préfixées et en slugs français — `/en/actions` ;
 *   · les FRANÇAISES d'hier, à la racine — `/actions`, que l'anglais occupe
 *     maintenant sous un autre nom.
 *
 * ── POURQUOI DES RÈGLES EXPLICITES ALORS QUE next-intl REDIRIGE DÉJÀ ────────
 *
 * Il redirige, mais en 307 — TEMPORAIRE. Mesuré avant d'écrire ces lignes :
 * `/en/actions` rendait bien 307 vers `/en/stocks`. Une 307 dit au moteur « garde
 * l'ancienne adresse, elle reviendra peut-être » : le classement acquis reste attaché
 * à une URL qui n'existe plus. Une 308 le TRANSFÈRE, ce qui est le seul intérêt d'un
 * déménagement d'adresses. Les règles de ce fichier passent avant le middleware,
 * elles gagnent donc.
 *
 * ── ET POURQUOI ELLES SONT ENGENDRÉES ──────────────────────────────────────
 *
 * Cinquante-huit routes fois deux familles font une centaine de règles. Écrites à la
 * main, elles divergeraient de `i18n/pathnames.ts` dès la première route ajoutée, et
 * le symptôme serait muet : la page nouvelle répondrait, son ancienne adresse non.
 *
 * ⚠️ CE BLOC VIT AU NIVEAU DU MODULE, ET CE N'EST PAS UN CHOIX DE STYLE. Next 16
 * compile `next.config.ts` en un fichier autonome, et les imports référencés depuis
 * l'INTÉRIEUR de `redirects()` n'y survivent pas — le serveur tombait sur
 * « ReferenceError: ROUTE_ADDRESSES is not defined » au démarrage. Évalué ici, à la
 * charge du module, tout est résolu avant que la fonction n'existe.
 *
 * ⚠️ L'ORDRE FAIT TOUT, ET IL EST DÉCROISSANT EN SEGMENTS. Sans lui, `/en/graphiques`
 * avalerait `/en/graphiques/actifs-reels` et l'enverrait sur `/charts/actifs-reels` —
 * une adresse qui n'existe dans aucune langue.
 */
const parametre = (chemin: string) => chemin.replace(/\[([^\]]+)\]/g, ':$1')

const DEMENAGEMENT = [...ROUTE_ADDRESSES]
  .sort((a, b) => b[0].split('/').length - a[0].split('/').length)
  .flatMap(([interne, anglais]) => {
    /* L'adresse anglaise d'hier : préfixée, en slugs français. */
    const regles = [
      { source: `/en${parametre(interne)}`, destination: parametre(anglais), permanent: true },
    ]

    /* L'adresse française d'hier, à la racine — seulement quand le slug change.
       `/crypto` s'écrit pareil dans les deux langues : le rediriger vers `/fr/crypto`
       interdirait au lecteur anglais d'atteindre sa propre page. */
    if (interne !== anglais) {
      regles.push({
        source: parametre(interne),
        destination: `/fr${parametre(interne)}`,
        permanent: true,
      })
    }

    return regles
  })

/**
 * Les douze langues qui gardent un préfixe.
 *
 * ⚠️ REMPLACE UN `\w{2}` QUI ATTRAPAIT N'IMPORTE QUEL SEGMENT DE DEUX LETTRES, langue
 * ou pas. L'anglais est exclu : il n'a plus de préfixe, et ses anciennes adresses
 * `/en/…` sont traitées par `DEMENAGEMENT`, qui les envoie directement à destination
 * plutôt qu'en deux sauts.
 */
const PREFIXES_DE_LANGUE = TRANSLATED_LOCALES.filter((locale) => locale !== 'en').join('|')

/**
 * Traduit un chemin INTERNE en son adresse anglaise.
 *
 * ── POURQUOI LES ANCIENNES LISTES EN ONT BESOIN ──────────────────────────────
 *
 * `['/charts/rwa', '/graphiques/actifs-reels']` était juste tant que la racine servait
 * le français. Elle ne l'est plus : sans préfixe, `/graphiques/actifs-reels` n'est
 * l'adresse de rien, et la règle de déménagement l'enverrait ensuite sur `/fr/…`. Un
 * lecteur qui tape un chemin ANGLAIS de la référence atterrirait donc sur la page
 * FRANÇAISE, en deux sauts.
 *
 * La correspondance se fait par le plus long préfixe : `/graphiques` conviendrait à
 * `/graphiques/actifs-reels` et donnerait `/charts/actifs-reels`, qui n'existe pas.
 */
const ADRESSES_PAR_LONGUEUR = [...ROUTE_ADDRESSES].sort((a, b) => b[0].length - a[0].length)

const versAnglais = (chemin: string): string => {
  const [route = chemin, requete] = chemin.split(/(?=\?)/)

  for (const [interne, anglais] of ADRESSES_PAR_LONGUEUR) {
    if (route === interne || route.startsWith(`${interne}/`)) {
      return `${anglais}${route.slice(interne.length)}${requete ?? ''}`
    }
  }

  return chemin
}

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
        headers: [
          { key: 'Document-Policy', value: 'js-profiling' },

          /*
           * ══════════════════════════════════════════════════════════════════
           * EN-TÊTES DE SÉCURITÉ — CE QU'UN SITE PUBLIC DOIT POSER
           * ══════════════════════════════════════════════════════════════════
           *
           * Aucun n'était présent : le site répondait avec les seuls en-têtes que
           * Next pose de lui-même. Les six ci-dessous sont ceux qu'un audit relève
           * en premier, et aucun ne coûte de latence — ce sont des lignes de texte
           * dans une réponse déjà envoyée.
           *
           * ── `Strict-Transport-Security` ──────────────────────────────────
           * Deux ans, sous-domaines compris, préchargement demandé. Il ferme la
           * fenêtre du tout premier accès en clair, celle où une interception peut
           * rediriger vers un site jumeau. Sans effet en développement, où le
           * navigateur ignore l'en-tête sur `http://localhost`.
           *
           * ── `X-Content-Type-Options: nosniff` ────────────────────────────
           * Interdit au navigateur de DEVINER le type d'une réponse. Ce site sert du
           * JSON d'API et des fichiers téléversés par personne ; le risque est faible,
           * mais la ligne est gratuite et supprime toute une famille d'attaques par
           * confusion de type.
           *
           * ── `Referrer-Policy` ────────────────────────────────────────────
           * `strict-origin-when-cross-origin` : les liens sortants — sources,
           * places de cotation, articles — emportent le domaine, jamais le CHEMIN.
           * Une fiche `/crypto/hyperliquid` ne dit donc pas à un tiers ce que le
           * lecteur regardait.
           *
           * ── `Permissions-Policy` ─────────────────────────────────────────
           * Caméra, micro et géolocalisation refusés pour la page ET pour tout ce
           * qu'elle embarque. Le site n'en a aucun usage ; le déclarer empêche un
           * script tiers — une iframe TradingView, un lecteur de vidéo — de les
           * demander en notre nom.
           *
           * ── `X-Frame-Options` N'EST PAS POSÉ, ET C'EST DÉLIBÉRÉ ──────────
           * Il vaut pour tout le site ou pour rien, et `/embed/*` existe POUR être
           * mis en iframe (voir `app/[locale]/embed/layout.tsx`). Le cadrage se fait
           * donc par `frame-ancestors` ci-dessous, qui accepte, lui, d'être posé
           * route par route.
           *
           * ── `Content-Security-Policy`, VOLONTAIREMENT PARTIELLE ──────────
           * ⚠️ NI `script-src` NI `style-src`. Next injecte ses propres scripts et
           * styles en ligne ; les restreindre exige des nonces par requête, donc de
           * rendre chaque page dynamique — c'est-à-dire d'abandonner le cache de
           * pages, qui est ce qui tient ce site sous des quotas d'API serrés. Le
           * compromis est explicite plutôt que subi.
           *
           * Les quatre directives posées, elles, ne coûtent rien et ferment des
           * failles réelles : `object-src` (greffons Flash/Java), `base-uri` (une
           * balise `<base>` injectée détournerait toutes les URL relatives de la
           * page), `form-action` (l'envoi d'un formulaire vers un domaine tiers) et
           * `frame-ancestors` (le clickjacking).
           */
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },

      /*
        LES WIDGETS SONT FAITS POUR ÊTRE EMBARQUÉS — la règle ci-dessus les en
        empêcherait. `frame-ancestors *` ne s'applique qu'à `/embed/*`, dont c'est la
        raison d'être ; le reste du site garde `'self'`.

        ⚠️ CETTE ENTRÉE DOIT RESTER APRÈS L'AUTRE. Next applique les règles dans
        l'ordre et la dernière qui correspond l'emporte pour un même en-tête.
      */
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ["object-src 'none'", "base-uri 'self'", 'frame-ancestors *'].join('; '),
          },
        ],
      },
      {
        source: '/:locale/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ["object-src 'none'", "base-uri 'self'", 'frame-ancestors *'].join('; '),
          },
        ],
      },
    ]
  },

  /**
   * REDIRECTIONS PERMANENTES — les pages qui ont changé d'adresse.
   *
   * ── DEUX MOUVEMENTS, UN SEUL MÉCANISME ───────────────────────────────────
   *
   * D'abord les SIX SOUS-PAGES CRYPTO, sorties d'un préfixe qui ne les décrivait
   * plus : `/graphiques` ou `/classements` ne parlent pas que de crypto — ils portent
   * aussi les ETF, les actions et les indices. Ensuite les deux adresses laissées par
   * la suppression de `/marches`.
   *
   * ⚠️ IL N'Y A PLUS DE RÈGLE SUR `/crypto`, `/actions`, `/etf`, `/indices`,
   * `/devises` NI `/matieres-premieres`. Ces six-là ont été redirigées vers les
   * onglets de `/marches` pendant un temps ; elles sont redevenues des pages. En
   * ajouter une ici les rendrait inaccessibles.
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
   * Next applique la PREMIÈRE règle qui correspond. `/marches/pool/…` passe donc
   * avant `/marches`, sans quoi une fiche de pool partirait sur `/crypto`.
   * De même, `/crypto/:path*` placé avant
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
      /* ⚠️ CES DEUX-LÀ VISAIENT `/mouvements` ET `/points-marquants`, QUI N'EXISTENT
         PAS. Vérifié dossier par dossier dans `app/[locale]/` — comme `/apprendre`
         plus bas, ces redirections menaient au 404 depuis leur écriture. Leur contenu
         a fusionné dans les classements, qui portent les quatre palmarès ; c'est la
         destination honnête, et elle existe. */
      ['/crypto/mouvements', '/classements'],
      ['/crypto/highlights', '/classements'],
      ['/crypto/resoudre/:terme', '/resoudre/:terme'],
    ]

    /* `/marches` A ÉTÉ SUPPRIMÉE, et ce bloc redirigeait vers elle.

       Les six pages de classe qu'il envoyait sur ses onglets sont redevenues des
       routes à part entière (voir `components/market/ClassMarketPage.tsx`) : elles
       n'ont plus rien à rediriger. Restent les deux adresses que la suppression
       laisse orphelines et qui, elles, sont indexées :

         · `/marches` elle-même, dont le contenu se répartit entre les six classes.
           La crypto est la destination honnête : c'était son onglet par défaut, et
           c'est la classe que 90 % des visites y cherchaient ;
         · `/marches/pool/:network/:address`, les fiches de pool on-chain. Elles ne
           disparaissent pas — elles remontent d'un cran, le préfixe `/marches` ne
           décrivant plus rien. */
    const removed: [string, string][] = [
      ['/marches/pool/:network/:address', '/pool/:network/:address'],
      ['/marches', '/crypto'],
      /* `/categories/ecosystemes` A FUSIONNÉ DANS `/categories`.
         Elle rendait le même composant sur la même requête, avec un filtre initial
         pour seule différence — un écosystème EST une catégorie chez la source. La
         vue survit en paramètre de requête, donc l'adresse reste adressable et cette
         redirection mène EXACTEMENT au même écran qu'avant. */
      ['/categories/ecosystemes', '/categories?vue=ecosystemes'],
    ]

    /*
     * ── LES CHEMINS DE LA RÉFÉRENCE, POUR QUI LES SAISIT ─────────────────────
     *
     * Le mandat recale l'arborescence sur celle de CoinGecko. Ces règles couvrent le
     * cas symétrique : quelqu'un qui connaît leurs adresses et les tape ici.
     *
     * ⚠️ CE N'EST PAS DE LA RÉÉCRITURE D'URL. Une redirection 308 déplace le visiteur
     * vers l'adresse ZENKUU et le lui montre. Servir le contenu SOUS leur adresse
     * ferait deux URL pour une page, ce qu'aucun moteur n'aime et qui laisserait
     * croire que le site répond à leurs chemins.
     *
     * Seuls les chemins dont l'équivalent existe VRAIMENT figurent ici. Rediriger
     * `/en/nft/chains/ethereum` vers une page qui ne filtre pas par chaîne enverrait
     * le visiteur sur autre chose que ce qu'il a demandé — un 404 est plus honnête.
     */
    /*
     * ⚠️ SIX ENTRÉES ONT DISPARU DE CETTE LISTE, ET LEUR ABSENCE EST LE POINT.
     *
     * Elle contenait `/exchanges`, `/glossary`, `/converter`, `/charts`, `/news` et
     * `/about` — des chemins de la référence qu'on redirigeait vers leur équivalent
     * français. Ce sont EXACTEMENT les adresses anglaises que `i18n/pathnames.ts`
     * vient de créer. Les garder rendait la page anglaise inatteignable : mesuré,
     * `/en/charts` répondait 308 vers `/en/graphiques` avant même d'atteindre
     * next-intl.
     *
     * Elles ne manquent à personne : ces chemins servent désormais la vraie page.
     *
     * ⚠️ `/learn` VISAIT `/apprendre`, QUI N'EXISTE PAS. Vérifié dossier par dossier
     * dans `app/[locale]/` : la redirection menait à un 404 depuis le début. Elle
     * pointe sur le centre d'aide, seule page du site qui tienne ce rôle.
     */
    const reference: [string, string][] = [
      ['/coins/:id', '/crypto/:id'],
      ['/coins/:id/historical_data', '/crypto/:id'],
      ['/coins/bitcoin/bitcoin-halving', '/crypto/bitcoin/halving'],
      ['/all-cryptocurrencies', '/crypto'],
      /* ⚠️ CE CHEMIN RECOUVRE MAINTENANT UNE VRAIE ROUTE : `/exchanges/[id]` est
         l'adresse anglaise d'une fiche de place. Il est gardé quand même, parce que
         « derivatives » n'est l'identifiant d'aucune place et que le chemin veut dire
         la même chose des deux côtés — la liste des places de dérivés. */
      ['/exchanges/derivatives', '/derives'],
      /* Vers la vue filtrée directement, et non vers `/categories/ecosystemes` qui
         redirige elle-même : deux redirections en chaîne coûtent une exploration de
         plus au robot pour arriver au même écran. */
      ['/chains', '/categories?vue=ecosystemes'],
      ['/treasuries', '/graphiques/tresoreries'],
      ['/nft', '/graphiques/nft'],
      ['/compare-cryptocurrencies', '/comparateur'],
      ['/new-cryptocurrencies', '/nouvelles-cotations'],
      ['/crypto-gainers-losers', '/classements'],
      ['/highlights', '/classements'],
      ['/highlights/all-time-high-crypto', '/classements/sommet'],
      ['/highlights/high-volume', '/classements/volumes'],
      ['/charts/bitcoin-dominance', '/graphiques/dominance'],
      ['/charts/crypto-heatmap', '/heatmap'],
      ['/charts/rwa', '/graphiques/actifs-reels'],
      ['/learn', '/aide'],
      ['/faq', '/aide'],
      ['/portfolio', '/tableau-de-bord'],
    ]

    /* ⚠️ `/coins/:id/historical_data` PASSE AVANT `/coins/:id`, sans quoi la seconde
       avalerait la première et enverrait sur la fiche de l'actif « historical_data ».
       Même règle d'ordre que pour `/crypto/graphiques` plus haut. Le tri place les
       chemins les plus SEGMENTÉS en tête. */
    reference.sort((a, b2) => b2[0].split('/').length - a[0].split('/').length)

    return [
      ...[...moved, ...removed, ...reference].flatMap(([source, destination]) => [
        { source, destination: versAnglais(destination), permanent: true },
        {
          source: `/:locale(${PREFIXES_DE_LANGUE})${source}`,
          destination: `/:locale${destination}`,
          permanent: true,
        },
      ]),
      ...DEMENAGEMENT,
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
