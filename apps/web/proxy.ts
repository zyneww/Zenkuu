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
