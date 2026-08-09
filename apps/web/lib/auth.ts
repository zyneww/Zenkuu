/**
 * État de configuration de l'authentification.
 *
 * Clerk lève une exception au démarrage si sa clé publique est absente. Sans ce
 * garde-fou, un dépôt fraîchement cloné — ou un déploiement dont on a oublié une
 * variable — ne servirait plus une seule page, y compris les classements qui n'ont
 * rien à voir avec les comptes.
 *
 * Le site fonctionne donc SANS Clerk : les boutons de connexion mènent alors à une
 * page qui explique ce qui manque, plutôt que de faire tomber l'application. C'est
 * la même logique que pour les sources de données (§5) — une brique non configurée
 * se signale, elle ne casse pas le reste.
 */

/**
 * Lu au module plutôt qu'à l'appel : `NEXT_PUBLIC_*` est remplacé à la compilation
 * côté client, une lecture dynamique de `process.env` y renverrait `undefined`.
 */
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export const AUTH_ENABLED = Boolean(publishableKey && publishableKey.trim())

/**
 * Volontairement limité aux deux routes qui existent. Il n'y a pas d'entrée
 * `/compte` : le `<UserButton>` de Clerk expose déjà profil et déconnexion dans son
 * propre menu, une page dédiée ferait doublon tant que ZENITH n'a pas de données
 * propres à y afficher (watchlist persistante, alertes). Le jour où ce sera le cas,
 * elle demandera aussi un `clerkMiddleware()` — sans lui les helpers serveur
 * (`auth()`, `currentUser()`) lèvent une exception —, lui-même à conditionner à
 * `AUTH_ENABLED` sous peine de faire tomber TOUTES les routes en l'absence de clé.
 */
export const AUTH_ROUTES = {
  signIn: '/connexion',
  signUp: '/inscription',
} as const
