import {
  DEFAULT_LOCALE,
  TRANSLATED_LOCALES,
  type TranslatedLocale,
} from '@/components/settings/languages'
import { getLocale } from 'next-intl/server'

import { getPathname, type AppHref } from '@/i18n/navigation'

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
 * ── ⚠️ ELLE NE PEUT PLUS COMPOSER LES ADRESSES ELLE-MÊME ────────────────────
 *
 * Elle écrivait `/${locale}${path}` : le chemin interne, préfixé de la langue. C'était
 * juste tant qu'une route s'écrivait pareil partout. Depuis `i18n/pathnames.ts`, elle
 * aurait déclaré `/de/stocks` comme version allemande de `/stocks` — alors que
 * l'allemand sert `/de/actions`. Une table d'alternance qui pointe vers des 404 est
 * PIRE que pas de table du tout : le moteur conclut que les versions annoncées
 * n'existent pas, et retombe sur son propre choix de canonique.
 *
 * `getPathname` est le seul à savoir traduire, puisque c'est lui qui rend les liens.
 * Il place aussi le préfixe — ou son absence pour la langue par défaut — sans qu'on
 * ait à connaître la règle.
 *
 * `x-default` désigne la version servie à qui ne correspond à aucune langue déclarée :
 * celle de `DEFAULT_LOCALE`, donc la version sans préfixe.
 *
 * ── ELLE VIT ICI, ET NON DANS LE PLAN DU SITE ────────────────────────────────
 *
 * Deux appelants la réclament : `app/sitemap.ts` et le layout localisé. Écrite deux
 * fois, elle divergerait au premier ajout de langue — et une table d'alternance à
 * moitié juste est un défaut qui ne se voit que dans un rapport d'indexation, des
 * semaines plus tard.
 */
export function languageAlternates(href: AppHref = '/'): Record<string, string> {
  const languages: Record<string, string> = {
    'x-default': localizedUrl(href, DEFAULT_LOCALE),
  }

  for (const locale of TRANSLATED_LOCALES) {
    languages[locale] = localizedUrl(href, locale)
  }

  return languages
}

/**
 * L'URL absolue d'une route, dans une langue donnée.
 *
 * ── POURQUOI UNE CONVERSION DE TYPE ──────────────────────────────────────────
 *
 * `AppHref` est une UNION — une forme par route — et `getPathname` est générique sur
 * une seule d'entre elles. TypeScript ne sait pas répartir une union sur les branches
 * d'un générique, et refuse donc une valeur pourtant exacte. La conversion ne masque
 * aucun doute sur la donnée : `href` a déjà été vérifié à l'endroit où il a été écrit.
 */
export function localizedUrl(href: AppHref, locale: TranslatedLocale): string {
  return absoluteUrl(getPathname({ href, locale } as Parameters<typeof getPathname>[0]))
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE BLOC `alternates` D'UNE PAGE — CANONIQUE ET TRADUCTIONS ENSEMBLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── DEUX DÉFAUTS QU'IL CORRIGE D'UN COUP ─────────────────────────────────────
 *
 * Une trentaine de pages écrivaient `alternates: { canonical: '/actions' }`. Deux
 * choses n'allaient pas, et la seconde était déjà signalée dans le layout sans jamais
 * avoir été traitée :
 *
 *   · LA CANONIQUE IGNORAIT LA LANGUE. Mesuré : `/stocks` déclarait `/actions` pour
 *     canonique — une adresse qui répond 308. Une page qui se déclare canonique sur
 *     une redirection dit au moteur de ne pas l'indexer telle quelle, et `/fr/actions`
 *     déclarait la même, si bien que les deux versions se renvoyaient au même endroit ;
 *   · LES TRADUCTIONS DISPARAISSAIENT. Next.js REMPLACE `alternates` en bloc au lieu
 *     de le fusionner : poser un `canonical` effaçait la table `languages` du layout.
 *     Trente-trois pages n'annonçaient donc aucune version linguistique — exactement
 *     ce que la note du layout annonçait comme « à découvrir plus tard dans un rapport
 *     d'indexation ».
 *
 * Les deux tiennent au même geste, ils sont donc rendus par le même appel. Une page ne
 * peut plus poser l'un en oubliant l'autre.
 *
 * ── POURQUOI ELLE VA CHERCHER LA LANGUE ELLE-MÊME ────────────────────────────
 *
 * `getLocale()` lit le contexte de la requête ; les trente-trois appelants sont tous
 * des `generateMetadata` asynchrones. Leur faire passer la locale en argument aurait
 * demandé de l'obtenir dans chacun — trente-trois occasions d'oublier, pour une valeur
 * que la requête porte déjà.
 */
export async function pageAlternates(href: AppHref): Promise<{
  canonical: string
  languages: Record<string, string>
}> {
  const locale = (await getLocale()) as TranslatedLocale

  return {
    canonical: localizedUrl(href, locale),
    languages: languageAlternates(href),
  }
}
