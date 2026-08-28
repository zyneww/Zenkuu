import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

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
 * `localePrefix: 'as-needed'` sert le français sur `/crypto/bitcoin` et l'anglais sur
 * `/en/crypto/bitcoin`. Un lecteur passé en anglais qui revenait par son signet — donc
 * sur une adresse sans préfixe — retombait en français : la décision de langue se prend
 * avant tout JavaScript, et rien dans la requête ne la portait.
 *
 * Le cookie `NEXT_LOCALE`, écrit par le sélecteur (voir `useLanguageChoice`), la
 * porte. On redirige donc vers la variante préfixée quand TROIS conditions sont
 * réunies — et chacune écarte un cas où la redirection serait nuisible :
 *
 *   1. LE COOKIE EXISTE ET DÉSIGNE UNE LANGUE TRADUITE. Sans cookie, rien ne change :
 *      un robot d'indexation n'en a pas, il continue de voir le français sur les
 *      adresses sans préfixe, et le classement acquis ne bouge pas.
 *   2. L'ADRESSE N'A PAS DÉJÀ DE PRÉFIXE. `/en/…` est un choix explicite, plus fort
 *      que le cookie : le suivre ferait boucler un lien anglais partagé par quelqu'un
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
      target.pathname = `/${preferred}${pathname === '/' ? '' : pathname}`
      return NextResponse.redirect(target, 307)
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les artefacts de build : les faire passer
    // ici n'apporte rien et alourdit chaque chargement d'image.
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|xml|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
