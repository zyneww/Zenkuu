import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

import { internalFromEnglish } from '@/i18n/pathnames'
import { routing } from '@/i18n/routing'

/**
 * Chaîne exécutée avant chaque requête : la langue, et plus rien d'autre.
 *
 * Fichier `proxy.ts` et non `middleware.ts` : Next.js 16 a renommé la convention et
 * déprécie l'ancien nom, qui émet un avertissement à chaque build. Le contrat est
 * identique — une fonction exécutée avant le rendu des routes.
 *
 * ── CE QUI A DISPARU D'ICI ────────────────────────────────────────────────────
 *
 * Un middleware d'authentification enveloppait celui-ci pour attacher un contexte de
 * session à la requête, sans lequel les lectures de compte côté serveur levaient. Il
 * était monté CONDITIONNELLEMENT, et la condition n'était pas un luxe : ce code
 * s'exécute avant chaque requête, et le monter sans clé aurait fait tomber
 * l'intégralité du site, classements compris.
 *
 * Les comptes ont été retirés du site. L'identité tient désormais dans un cookie
 * anonyme (`lib/visitor.ts`), que les actions serveur lisent directement — un cookie
 * n'a besoin d'aucun middleware pour arriver jusqu'à elles. La composition imbriquée
 * qui vivait ici n'a donc plus d'objet, et avec elle disparaît le défaut silencieux
 * qu'elle corrigeait : deux middlewares en séquence produisaient deux réponses, la
 * réécriture de next-intl était perdue sur la seconde, et `/` répondait 404 en
 * français pendant que `/en` fonctionnait.
 *
 * ── LES ROUTES D'API NE SONT PAS LOCALISÉES ───────────────────────────────────
 *
 * `/api/*` sert du JSON et vit hors de `app/[locale]/`. Le faire traverser le
 * middleware de langue lui ferait subir une réécriture vers `/fr/api/…`, qui n'existe
 * pas : les appels du graphique et de la recherche répondraient 404.
 */

const intlMiddleware = createIntlMiddleware(routing)

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA MÊME CHAÎNE, MAIS SANS DÉTECTION — POUR LES ROBOTS D'INDEXATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `routing.localeDetection` est passé à `true` : un visiteur dont le navigateur
 * annonce l'allemand est redirigé vers `/de`. C'est ce qu'on veut d'un humain.
 *
 * D'un ROBOT, c'est exactement ce qu'on ne veut pas. Le robot de Google explore depuis
 * des adresses américaines et annonce l'anglais : la détection le redirigerait de
 * chaque adresse française vers son équivalent anglais, et il finirait par n'indexer
 * qu'une seule langue — celle de ses serveurs. La note de `routing.ts` décrivait ce
 * risque, et c'est pour lui que la détection était restée éteinte.
 *
 * ── CE N'EST PAS DU CAMOUFLAGE, ET LA DISTINCTION EST NETTE ────────────────
 *
 * Le camouflage consiste à servir au robot un CONTENU différent de celui que voit
 * l'humain, pour la même adresse. Ici, le contenu de chaque adresse est identique pour
 * tous : `/de/heatmap` rend l'allemand au robot comme au visiteur. Seule la
 * REDIRECTION depuis une adresse sans langue est suspendue, et une redirection n'est
 * pas un contenu.
 *
 * Un humain qui saisit `/heatmap` obtient sa langue ; un robot qui l'explore obtient
 * le français, qui est ce que cette adresse désigne. Les deux voient la vérité.
 */
const intlMiddlewareSansDetection = createIntlMiddleware({
  ...routing,
  localeDetection: false,
})

/**
 * Les robots que l'on reconnaît, et pourquoi cette liste-ci.
 *
 * Elle ne cherche pas l'exhaustivité — c'est impossible, et un robot inconnu qui subit
 * la redirection ne casse rien de grave. Elle couvre les moteurs et les aperçus de
 * lien dont dépend réellement la visibilité du site : les quatre moteurs, les trois
 * réseaux qui dépliaient les cartes de partage, et les robots des modèles de langue,
 * qui sont devenus une source de trafic à part entière.
 *
 * `bot`, `crawler` et `spider` en fin de liste attrapent le tout-venant : la plupart
 * des robots se nomment ainsi, par convention plus que par obligation.
 */
const ROBOTS =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|applebot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot|ccbot|bot\b|crawler|spider/i

function estRobot(request: NextRequest): boolean {
  return ROBOTS.test(request.headers.get('user-agent') ?? '')
}

/**
 * Chemins hors du périmètre de la langue.
 *
 * ── `/api` ET `/trpc` ────────────────────────────────────────────────────────
 *
 * Ils servent du JSON et vivent hors de `app/[locale]/` : une réécriture vers
 * `/fr/api/…` pointerait vers une route inexistante.
 *
 * ── `/geo` — ET LE DÉFAUT QU'IL CORRIGE MÉRITE D'ÊTRE RACONTÉ ────────────────
 *
 * Le fond de carte est un fichier statique de `public/geo/`. Il répondait pourtant
 * 404, y compris après redémarrage du serveur, et la cause est dans le `matcher`
 * ci-dessous : son exclusion des fichiers statiques s'écrit `js(?!on)`, c'est-à-dire
 * « les `.js` mais PAS les `.json` ». L'intention d'origine était bonne — les routes
 * d'API rendent du JSON et doivent traverser — mais elle attrape au passage tout
 * fichier `.json` réellement statique, que le middleware réécrit alors en
 * `/fr/geo/countries-110m.json`, chemin qui n'existe pas.
 *
 * Le corriger dans l'expression régulière demanderait d'y distinguer les chemins de
 * fichiers des chemins de routes, ce qu'une regex de matcher fait mal. Une ligne ici
 * est plus lisible, et se relit dans six mois.
 */
function isUnlocalized(pathname: string): boolean {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/trpc') ||
    pathname.startsWith('/geo')
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA LANGUE CHOISIE EST HONORÉE SUR LES ADRESSES SANS PRÉFIXE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `localePrefix: 'as-needed'` sert l'anglais sur `/stocks` et le français sur
 * `/fr/actions`. Un lecteur passé au français qui revient par son signet — donc sur
 * une adresse sans préfixe — retomberait en anglais : la décision de langue se prend
 * avant tout JavaScript, et rien dans la requête ne la porte.
 *
 * Le cookie `NEXT_LOCALE`, écrit par le sélecteur (voir `useLanguageChoice`), la
 * porte. On redirige donc vers la variante préfixée quand TROIS conditions sont
 * réunies — et chacune écarte un cas où la redirection serait nuisible :
 *
 *   1. LE COOKIE EXISTE ET DÉSIGNE UNE LANGUE TRADUITE. Sans cookie, rien ne change :
 *      un robot d'indexation n'en a pas, il continue de voir l'anglais sur les
 *      adresses sans préfixe, et le classement acquis ne bouge pas.
 *   2. L'ADRESSE N'A PAS DÉJÀ DE PRÉFIXE. `/de/…` est un choix explicite, plus fort
 *      que le cookie : le suivre ferait boucler un lien allemand partagé par quelqu'un
 *      dont le cookie dit « fr ».
 *   3. C'EST UNE NAVIGATION DE DOCUMENT (`Sec-Fetch-Dest: document`). Les requêtes de
 *      données de Next.js — la navigation côté client, le préchargement — portent le
 *      même cookie ; les rediriger ferait répondre du HTML là où du RSC est attendu.
 *
 * ⚠️ REDIRECTION TEMPORAIRE (307) ET NON PERMANENTE. Une 308 serait mise en cache par
 * le navigateur pour l'adresse elle-même : le jour où le lecteur repasse au français,
 * son propre navigateur continuerait de le renvoyer vers `/en`.
 */
const LOCALE_COOKIE = 'NEXT_LOCALE'

function preferredLocale(request: NextRequest): string | null {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value
  if (!cookie || cookie === routing.defaultLocale) return null
  return (routing.locales as readonly string[]).includes(cookie) ? cookie : null
}

function hasLocalePrefix(pathname: string): boolean {
  return (routing.locales as readonly string[]).some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  if (isUnlocalized(pathname)) return NextResponse.next()

  if (
    request.headers.get('sec-fetch-dest') === 'document' &&
    !hasLocalePrefix(pathname)
  ) {
    const preferred = preferredLocale(request)
    if (preferred) {
      const target = request.nextUrl.clone()
      /*
       * ⚠️ ON TRADUIT L'ADRESSE, ON NE LA PRÉFIXE PLUS.
       *
       * Cette ligne écrivait `/${preferred}${pathname}`. Elle était juste tant qu'une
       * route s'écrivait pareil dans toutes les langues ; depuis `i18n/pathnames.ts`,
       * une adresse SANS préfixe est anglaise — `/stocks` — et les douze autres
       * langues servent le chemin interne. Préfixer aurait produit `/fr/stocks`, qui
       * n'est l'adresse de rien : un lecteur ayant choisi le français aurait été
       * envoyé en 404 depuis n'importe quel signet.
       */
      const interne = internalFromEnglish(pathname)
      target.pathname = `/${preferred}${interne === '/' ? '' : interne}`
      return NextResponse.redirect(target, 307)
    }
  }

  /* Un robot traverse la chaîne SANS détection : chaque adresse garde alors le
     contenu qu'il a indexé, dans la langue que cette adresse désigne. */
  return estRobot(request) ? intlMiddlewareSansDetection(request) : intlMiddleware(request)
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les artefacts de build : les faire passer
    // ici n'apporte rien et alourdit chaque chargement d'image.
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|xml|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
