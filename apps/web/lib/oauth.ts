import { SITE_URL } from '@/lib/site'

/**
 * CONNEXION PAR FOURNISSEUR — le protocole, sans bibliothèque.
 *
 * ── POURQUOI PAS Auth.js ─────────────────────────────────────────────────────
 *
 * C'est la réponse par défaut à ce besoin, et elle est bonne dans le cas général.
 * Elle ne l'est pas ici, pour une raison qui tient au code déjà écrit : ce site
 * possède DÉJÀ son modèle de sessions — `createSession`, `findSessionAccount`,
 * `deleteAccountSessions` — et surtout `claimAnonymousData`, qui rattache au compte
 * la liste de suivi et les écrans constitués avant toute connexion.
 *
 * Auth.js apporte son propre modèle de sessions. L'installer imposait donc soit de
 * faire cohabiter deux systèmes — deux cookies, deux tables, deux notions de
 * « connecté » —, soit de réécrire ce qui fonctionne, en emportant au passage la
 * reprise des données anonymes, qui est la partie la plus délicate et la moins
 * testable du parcours.
 *
 * Ce que la bibliothèque aurait apporté tient en réalité en peu de choses : deux
 * échanges HTTP et une protection CSRF. C'est ce que fait ce fichier, en réutilisant
 * l'ouverture de session existante — donc sans rien changer à ce qui marche.
 *
 * ── CE QUE LE PROTOCOLE EXIGE, ET QUI N'EST PAS OPTIONNEL ────────────────────
 *
 * Le paramètre `state` est une protection CSRF, pas une formalité. Sans lui, un
 * attaquant peut faire aboutir SON échange d'autorisation dans le navigateur de la
 * victime, qui se retrouve connectée au compte de l'attaquant sans l'avoir demandé —
 * et y range ensuite ses propres données. On tire donc une valeur aléatoire, on la
 * dépose dans un cookie éphémère, et l'on refuse tout retour qui ne la présente pas.
 */

/**
 * Fournisseurs pris en charge, DANS L'ORDRE D'AFFICHAGE.
 *
 * Source unique : les deux routes s'en servent pour valider leur segment d'URL, et la
 * liste des fournisseurs configurés s'en déduit. Une seconde liste écrite ailleurs
 * finirait par accepter un segment que le reste du code ne sait pas traiter.
 */
export const PROVIDER_IDS = ['google', 'x'] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

interface ProviderConfig {
  /** Page d'autorisation, chez le fournisseur. */
  authorizeUrl: string
  /** Échange du code contre un jeton. */
  tokenUrl: string
  /** Lecture du profil, une fois le jeton obtenu. */
  profileUrl: string
  /** Portées demandées — les plus étroites qui donnent une adresse. */
  scope: string
  clientId: string | undefined
  clientSecret: string | undefined
}

/**
 * Configuration lue dans l'environnement, JAMAIS écrite en dur.
 *
 * Un identifiant client n'est pas secret — il voyage dans l'URL d'autorisation — mais
 * le laisser dans le dépôt lierait le code à un projet Google précis, et rendrait
 * impossible d'en avoir un pour le développement et un autre pour la production. Le
 * secret, lui, ne doit évidemment jamais y figurer.
 */
export function providerConfig(id: ProviderId): ProviderConfig {
  if (id === 'google') {
    return {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      // `openid email` et rien de plus : le site n'a besoin que d'une adresse pour
      // identifier un compte. Demander le profil complet ferait afficher au visiteur
      // une autorisation plus large que l'usage — ce qui fait renoncer, à juste titre.
      scope: 'openid email',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }

  return {
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    profileUrl: 'https://api.twitter.com/2/users/me',
    scope: 'users.read tweet.read',
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
  }
}

export function isProviderConfigured(id: ProviderId): boolean {
  const config = providerConfig(id)
  return Boolean(config.clientId && config.clientSecret)
}

/**
 * Fournisseurs utilisables sur CETTE instance, dans l'ordre d'affichage.
 *
 * Calculé au chargement du module et non à chaque rendu : les variables
 * d'environnement ne changent pas en cours d'exécution, et c'est cette liste que le
 * layout fait descendre jusqu'aux boutons pour qu'ils sachent lesquels griser.
 *
 * Elle ne contient que des IDENTIFIANTS DE FOURNISSEURS — jamais les clés elles-mêmes.
 * C'est ce qui permet de la faire traverser vers le navigateur sans rien exposer.
 */
export const CONFIGURED_PROVIDERS: readonly string[] = PROVIDER_IDS.filter(isProviderConfigured)

/**
 * Adresse de retour, déclarée à l'identique chez le fournisseur.
 *
 * Elle doit correspondre au caractère près à celle enregistrée dans la console du
 * fournisseur, sans quoi l'échange est refusé — c'est la source d'erreur la plus
 * fréquente d'une première mise en service, et le message renvoyé
 * (`redirect_uri_mismatch`) ne dit pas laquelle des deux est fautive.
 */
export function callbackUrl(id: ProviderId): string {
  return `${SITE_URL}/api/auth/${id}/retour`
}

/** Nom du cookie éphémère qui porte l'anti-rejeu et l'intention. */
export const OAUTH_STATE_COOKIE = 'zenkuu-oauth'

/**
 * Durée de vie du cookie d'échange : dix minutes.
 *
 * Assez pour une authentification à deux facteurs et la création d'un compte chez le
 * fournisseur ; assez court pour qu'un cookie oublié sur un poste partagé n'ouvre pas
 * une fenêtre de rejeu le lendemain.
 */
export const OAUTH_STATE_MAX_AGE = 600

/**
 * X impose PKCE, Google le recommande — on l'applique aux deux.
 *
 * PKCE lie l'échange du code au navigateur qui l'a initié : un code intercepté ne
 * peut plus être échangé ailleurs. La méthode `S256` hache le vérificateur, ce qui
 * évite de faire voyager le secret dans l'URL d'autorisation.
 */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))

  // Base64 « URL-safe » et SANS remplissage, tel que la spécification l'exige : les
  // caractères `+`, `/` et `=` ne traversent pas une URL sans réencodage, et le
  // fournisseur compare des chaînes brutes.
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Valeur aléatoire imprévisible, pour `state` comme pour le vérificateur PKCE. */
export function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

export interface ProviderProfile {
  email: string
  /** Nom d'usage proposé comme pseudonyme initial. Absent chez certains fournisseurs. */
  name?: string
}

/**
 * Lecture du profil, NORMALISÉE entre fournisseurs.
 *
 * Google et X ne rendent pas la même forme : le premier suit OpenID Connect et livre
 * `{ email, name }` à plat, le second enveloppe tout dans `{ data: { username } }` et
 * — point à connaître — NE DONNE PAS d'adresse électronique par son API publique.
 *
 * D'où l'adresse de substitution `identifiant@x.zenkuu.local` pour X : elle n'est
 * jamais destinée à recevoir du courrier, elle sert d'identifiant stable de compte,
 * qui est le seul rôle que ce site fait jouer à une adresse. Le domaine `.local` est
 * réservé par la norme et ne peut donc jamais être enregistré par un tiers, ce qui
 * garantit qu'aucun compte X ne pourra entrer en collision avec un compte créé par
 * courriel.
 */
export function normalizeProfile(id: ProviderId, raw: unknown): ProviderProfile | null {
  if (id === 'google') {
    const profile = raw as { email?: string; name?: string; email_verified?: boolean }

    // L'adresse doit être VÉRIFIÉE chez Google. Une adresse non vérifiée permettrait
    // de prendre le contrôle d'un compte Zenkuu existant en la déclarant chez un
    // fournisseur tiers — exactement le scénario que le code par courriel empêche.
    if (!profile.email || profile.email_verified === false) return null
    return profile.name ? { email: profile.email, name: profile.name } : { email: profile.email }
  }

  const profile = (raw as { data?: { username?: string; name?: string } }).data
  if (!profile?.username) return null

  return {
    email: `${profile.username.toLowerCase()}@x.zenkuu.local`,
    name: profile.name ?? profile.username,
  }
}
