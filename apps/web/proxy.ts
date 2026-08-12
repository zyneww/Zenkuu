import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'
import { AUTH_ENABLED } from '@/lib/auth'

/**
 * Chaîne exécutée avant chaque requête : langue, puis authentification.
 *
 * Fichier `proxy.ts` et non `middleware.ts` : Next.js 16 a renommé la convention et
 * déprécie l'ancien nom, qui émet un avertissement à chaque build. Le contrat est
 * identique — une fonction exécutée avant le rendu des routes.
 *
 * ── POURQUOI CLERK EST MONTÉ CONDITIONNELLEMENT ───────────────────────────────
 *
 * Les helpers serveur (`auth()`, `currentUser()`) ne lisent pas les cookies
 * eux-mêmes : ils lisent un contexte que `clerkMiddleware()` attache à la requête.
 * Sans lui, tout appel serveur à `auth()` lève — c'est-à-dire, ici, chaque lecture
 * et chaque écriture de la liste de suivi.
 *
 * La condition est INDISPENSABLE : ce code s'exécute avant CHAQUE requête. Monter
 * Clerk sans clé ferait tomber non pas les seules pages de compte, mais
 * l'intégralité du site, classements compris.
 *
 * ── LA COMPOSITION EST IMBRIQUÉE, PAS SÉQUENTIELLE ────────────────────────────
 *
 * Le middleware de langue est le seul à produire la RÉPONSE : Clerk l'enveloppe pour
 * poser son contexte, puis lui rend la main. C'est la seule forme qui marche, et le
 * défaut qu'elle corrige mérite d'être décrit parce qu'il est silencieux.
 *
 * Une chaîne séquentielle — appeler next-intl, puis appeler Clerk — semble
 * équivalente et ne l'est pas. Avec `localePrefix: 'as-needed'`, la racine `/` doit
 * être servie par la route `/[locale]` : next-intl ne redirige pas, il RÉÉCRIT, en
 * posant un en-tête `x-middleware-rewrite` sur une réponse de statut 200. Appeler
 * ensuite `clerkMiddleware()` fabrique une SECONDE réponse, qui n'a pas cet en-tête.
 * La réécriture est perdue, `/` ne correspond plus à aucune route, et le site entier
 * répond 404 EN FRANÇAIS — pendant que `/en` continue de fonctionner, puisque son
 * préfixe le fait correspondre directement à `/[locale]`. Symptôme mesuré avant
 * correction : `/` → 404, `/en` → 200.
 *
 * Imbriquer supprime le problème à la racine : il n'y a qu'une réponse, celle de
 * next-intl, et Clerk a déjà attaché son contexte à la requête quand elle est
 * produite.
 *
 * ── LES ROUTES D'API NE SONT PAS LOCALISÉES ───────────────────────────────────
 *
 * `/api/*` sert du JSON et vit hors de `app/[locale]/`. Le faire traverser le
 * middleware de langue lui ferait subir une réécriture vers `/fr/api/…`, qui
 * n'existe pas : les appels du graphique et de la recherche répondraient 404. Clerk,
 * lui, doit continuer à les voir — les routes de liste de suivi lisent la session.
 */

const intlMiddleware = createIntlMiddleware(routing)

/** `/api/*`, `/trpc/*` et le relais Clerk : hors du périmètre de la langue. */
function isUnlocalized(pathname: string): boolean {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/trpc') ||
    pathname.startsWith('/__clerk')
  )
}

function handleLocale(request: NextRequest): NextResponse {
  if (isUnlocalized(request.nextUrl.pathname)) return NextResponse.next()
  return intlMiddleware(request)
}

export const proxy = AUTH_ENABLED
  ? clerkMiddleware((_auth, request) => handleLocale(request as unknown as NextRequest))
  : (request: NextRequest) => handleLocale(request)

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les artefacts de build : les faire passer
    // ici n'apporte rien et alourdit chaque chargement d'image.
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|xml|webmanifest)).*)',
    /*
     * Chemin d'auto-proxy de Clerk, déclaré EXPLICITEMENT.
     *
     * Le motif précédent l'excluait sans qu'on l'ait voulu : `/__clerk/…` sert à
     * relayer les appels vers l'API de Clerk depuis notre propre domaine, et
     * certaines de ces routes se terminent par une extension que la négation
     * ci-dessus écarte. Sans cette ligne, ces requêtes ne traversent pas le
     * middleware et le relais échoue — un défaut qui ne se voit qu'à l'usage des
     * écrans de compte, jamais à la compilation.
     */
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
