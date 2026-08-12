import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from './routing'

/**
 * Chargement des messages, à chaque requête rendue côté serveur.
 *
 * ── LA VALIDATION N'EST PAS UNE FORMALITÉ ─────────────────────────────────────
 *
 * `requestLocale` vient du SEGMENT D'URL, c'est-à-dire d'une entrée utilisateur.
 * Sans le contrôle `hasLocale`, une adresse forgée comme `/../../etc/x/crypto`
 * ferait construire un chemin d'import à partir de texte arbitraire. Le contrôle
 * ramène donc toujours la valeur à l'une des locales déclarées, et le repli est la
 * langue par défaut plutôt qu'une erreur : une URL au préfixe inconnu doit servir le
 * site, pas une page blanche.
 *
 * ── FORMATS ───────────────────────────────────────────────────────────────────
 *
 * Les formats de date et de nombre ne sont volontairement PAS déclarés ici. Ils
 * vivent dans `packages/ui/src/format.ts`, qui les applique aussi aux montants
 * convertis et aux échelles abrégées — des règles que next-intl ne connaît pas.
 * Deux endroits pour la même décision produiraient tôt ou tard deux résultats
 * différents sur la même page.
 *
 * ── `requestLocale` EST DÉPRÉCIÉ, ET C'EST ASSUMÉ ─────────────────────────────
 *
 * next-intl oriente désormais vers `next/root-params`, arrivé avec Next 16. Le
 * paramètre déprécié reste pleinement fonctionnel et c'est le chemin documenté
 * partout ; `root-params` est récent et sa surface d'API bouge encore. Migrer
 * maintenant échangerait un avertissement de compilation contre un risque réel sur
 * le seul point de passage obligé de tout rendu localisé.
 *
 * À revoir quand `root-params` sera stabilisé — l'unique appel ci-dessous est le
 * seul endroit à changer.
 */
/**
 * Chargeurs de messages, déclarés STATIQUEMENT.
 *
 * Un `import()` construit sur une variable (`../messages/${locale}.json`) compile
 * sans se plaindre puis échoue à l'exécution dès qu'un fichier manque — le bundler
 * ne peut pas vérifier ce qu'il n'a pas vu. C'est exactement ce qui s'est produit en
 * ajoutant l'espagnol et l'allemand au routage : les deux langues répondaient 500
 * avec « Cannot find module '../messages/es.json' », alors que le typage était vert.
 *
 * La table explicite rend l'oubli visible à la compilation, et le repli ci-dessous
 * garantit qu'un oubli futur dégrade au lieu de casser.
 */
const MESSAGES: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  fr: () => import('../messages/fr.json'),
  en: () => import('../messages/en.json'),
  es: () => import('../messages/es.json'),
  de: () => import('../messages/de.json'),
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  /**
   * Repli en trois temps : la langue demandée, puis l'anglais, puis le français.
   *
   * Une langue peut être ROUTABLE sans avoir encore son fichier de messages — les
   * deux listes vivent dans des fichiers différents et se désynchronisent
   * naturellement. Sans ce repli, ce simple décalage rend la langue entière
   * inaccessible ; avec lui, elle sert l'anglais en attendant son fichier.
   */
  const load = MESSAGES[locale] ?? MESSAGES.en ?? MESSAGES.fr

  return {
    locale,
    messages: (await load!()).default,
  }
})
