import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { AUTH_ENABLED } from '@/lib/auth'

/**
 * Contexte d'authentification Clerk, monté CONDITIONNELLEMENT.
 *
 * Fichier `proxy.ts` et non `middleware.ts` : Next.js 16 a renommé la convention et
 * déprécie l'ancien nom, qui émet un avertissement à chaque build. Le contrat est
 * identique — une fonction exécutée avant le rendu des routes.
 *
 * Pourquoi ce fichier est nécessaire : les helpers serveur (`auth()`,
 * `currentUser()`) ne lisent pas les cookies eux-mêmes, ils lisent un contexte que
 * `clerkMiddleware()` attache à la requête. Sans lui, tout appel serveur à `auth()`
 * lève — c'est-à-dire, ici, chaque lecture et chaque écriture de la liste de suivi.
 *
 * Pourquoi la condition est INDISPENSABLE : ce code s'exécute avant CHAQUE requête.
 * Monter Clerk sans clé ferait tomber non pas les seules pages de compte, mais
 * l'intégralité du site, classements compris. Le repli `NextResponse.next()` laisse
 * passer la requête inchangée.
 */
export const proxy = AUTH_ENABLED ? clerkMiddleware() : () => NextResponse.next()

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les artefacts de build : les faire passer
    // ici n'apporte rien et alourdit chaque chargement d'image.
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|xml|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
