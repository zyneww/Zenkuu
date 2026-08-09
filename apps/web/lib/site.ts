/**
 * URL canonique du site.
 *
 * Le SEO organique est le principal moteur d'acquisition (§9), et il repose sur des
 * URL ABSOLUES : un sitemap, une balise canonique ou une image Open Graph en chemin
 * relatif sont invalides. Or Next.js ne peut pas deviner le domaine — il faut le lui
 * donner.
 *
 * Valeur de repli sur `localhost` plutôt qu'exception : un dépôt fraîchement cloné
 * doit démarrer sans configuration, comme pour les sources de données et pour Clerk.
 * En production, renseigner `NEXT_PUBLIC_SITE_URL` est en revanche indispensable —
 * sans quoi le sitemap publierait des adresses locales, donc inutilisables.
 */
const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()

export const SITE_URL = (configured || 'http://localhost:3000').replace(/\/$/, '')

/** `true` seulement si un vrai domaine a été fourni — sert à ne pas indexer les préproductions. */
export const SITE_URL_CONFIGURED = Boolean(configured)

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
