import { DEFAULT_LOCALE, TRANSLATED_LOCALES } from '@/components/settings/languages'

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

/**
 * Versions linguistiques d'une URL, au format attendu par `alternates.languages`.
 *
 * ── POURQUOI CETTE FONCTION EXISTE ───────────────────────────────────────────
 *
 * Le site est passé de quatre à treize langues routables. Sans déclaration
 * d'alternance, un moteur voit treize adresses au contenu structurellement identique
 * et n'a AUCUN moyen de savoir qu'elles sont les traductions les unes des autres : il
 * élit alors une version canonique lui-même, et les douze autres se disputent le
 * classement de la première. C'est le risque de contenu dupliqué que `i18n/routing.ts`
 * documente, et qui devient réel à cette échelle.
 *
 * ── LE FRANÇAIS N'A PAS DE PRÉFIXE ───────────────────────────────────────────
 *
 * `localePrefix: 'as-needed'` laisse le français sur `/crypto` et met les autres sur
 * `/xx/crypto`. La table reflète cette asymétrie : pointer vers `/fr/crypto`
 * produirait un `hreflang` vers une 404, ce qui est pire que pas de `hreflang` du tout.
 *
 * `x-default` désigne la version servie à qui ne correspond à aucune langue déclarée —
 * le français, c'est-à-dire la version sans préfixe.
 *
 * ── ELLE VIT ICI, ET NON DANS LE PLAN DU SITE ────────────────────────────────
 *
 * Deux appelants la réclament : `app/sitemap.ts` et le layout localisé. Écrite deux
 * fois, elle divergerait au premier ajout de langue — et une table d'alternance à
 * moitié juste est un défaut qui ne se voit que dans un rapport d'indexation, des
 * semaines plus tard.
 */
export function languageAlternates(path = '/'): Record<string, string> {
  const languages: Record<string, string> = { 'x-default': absoluteUrl(path) }

  for (const locale of TRANSLATED_LOCALES) {
    languages[locale] =
      locale === DEFAULT_LOCALE
        ? absoluteUrl(path)
        : absoluteUrl(`/${locale}${path === '/' ? '' : path}`)
  }

  return languages
}
