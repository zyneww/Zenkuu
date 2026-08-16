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

/** `/api/*` et `/trpc/*` : hors du périmètre de la langue. */
function isUnlocalized(pathname: string): boolean {
  return pathname.startsWith('/api') || pathname.startsWith('/trpc')
}

export function proxy(request: NextRequest): NextResponse {
  if (isUnlocalized(request.nextUrl.pathname)) return NextResponse.next()
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
