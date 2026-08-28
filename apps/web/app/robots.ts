import type { MetadataRoute } from 'next'

import { SITE_URL, SITE_URL_CONFIGURED, absoluteUrl } from '@/lib/site'

/**
 * `robots.txt`.
 *
 * Deux régimes, et la distinction n'est pas cosmétique : tant qu'aucun domaine n'est
 * configuré, on est sur une préproduction ou un poste de développement, et on
 * INTERDIT toute indexation. Une préproduction indexée entre en concurrence avec le
 * site réel sur ses propres mots-clés — c'est l'accident SEO le plus courant, et le
 * plus pénible à rattraper.
 *
 * Les routes d'API et les écrans de compte sont exclus : ils ne renvoient pas de
 * contenu destiné à un lecteur, et les faire explorer gaspille le budget de crawl.
 */
export default function robots(): MetadataRoute.Robots {
  if (!SITE_URL_CONFIGURED) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      /* `/suivi` a quitté cette liste avec la page elle-même : interdire une adresse
         qui rend 404 n'ajoute rien, et laisse croire à un robot qu'il y a là quelque
         chose à ne pas voir. */
      disallow: ['/api/', '/tableau-de-bord', '/parametres'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
