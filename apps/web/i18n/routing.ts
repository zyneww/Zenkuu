import { defineRouting } from 'next-intl/routing'

import { DEFAULT_LOCALE, TRANSLATED_LOCALES } from '@/components/settings/languages'

import { PATHNAMES } from './pathnames'

/**
 * Routage multilingue.
 *
 * ── POURQUOI DEUX LOCALES ET NON TRENTE-QUATRE ────────────────────────────────
 *
 * Le sélecteur propose 34 langues ; le ROUTAGE n'en connaît que celles qui sont
 * réellement traduites. Ce n'est pas une limitation temporaire mais une règle :
 * ouvrir `/de/crypto/bitcoin` sans messages allemands servirait du texte français
 * sous une URL allemande. Google indexerait alors trente-quatre copies du même
 * contenu français, ce qui vaut au mieux une dilution du classement, au pire une
 * pénalité pour contenu dupliqué — sur un site dont l'acquisition repose d'abord
 * sur la recherche (§9).
 *
 * Les 32 autres langues restent donc une PRÉFÉRENCE enregistrée, ce que la fenêtre
 * de préférences annonce explicitement. Le jour où `messages/es.json` existe, ajouter
 * « es » à `TRANSLATED_LOCALES` ouvre `/es/…` sans autre changement : le routage, le
 * plan du site et les balises `hreflang` se déduisent tous de cette seule liste.
 *
 * ── POURQUOI LE FRANÇAIS N'A PAS DE PRÉFIXE ───────────────────────────────────
 *
 * `localePrefix: 'as-needed'` laisse le français sur `/crypto/bitcoin` et place
 * l'anglais sur `/en/crypto/bitcoin`. Les URL existantes sont donc PRÉSERVÉES : les
 * liens déjà partagés, les pages déjà indexées et les positions déjà acquises ne
 * bougent pas. Basculer le français sous `/fr/…` aurait imposé une redirection
 * permanente sur chaque page du site, avec la perte de classement transitoire que
 * cela suppose, et sans aucun bénéfice en échange.
 */
export const routing = defineRouting({
  locales: TRANSLATED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',

  /**
   * Adresses publiques par langue — la table vit dans `pathnames.ts`, qui explique
   * pourquoi les chemins internes restent français et pourquoi seul l'anglais est
   * traduit.
   *
   * ⚠️ SA PRÉSENCE DURCIT LE TYPAGE DE `Link`. Sans elle, `href` accepte n'importe
   * quelle chaîne ; avec elle, il n'accepte que les clés de la table, et une route à
   * paramètre s'écrit `href={{ pathname: '/crypto/[id]', params: { id } }}` plutôt
   * qu'en gabarit. C'est plus verbeux d'un cran, et c'est ce qui garantit qu'aucun
   * lien ne pointe vers une adresse qui n'existe dans aucune langue.
   */
  pathnames: PATHNAMES,

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * LA DÉTECTION PAR `Accept-Language` EST ACTIVE — ET SA CONTREPARTIE AUSSI
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Elle était désactivée, et la raison écrite ici était juste : un visiteur allemand
   * arrivant d'une recherche Google sur une page française serait redirigé ailleurs
   * que là où Google l'a envoyé, et le robot d'indexation — qui explore depuis des
   * adresses américaines — ne verrait plus jamais le français.
   *
   * ── CE QUI REND L'ACTIVATION TENABLE ────────────────────────────────────
   *
   * Le risque ne vient pas de la détection : il vient de la REDIRECTION DES ROBOTS.
   * `middleware.ts` les reconnaît à leur `User-Agent` et les laisse passer sans
   * redirection, si bien que chaque adresse traduite garde exactement le contenu que
   * le moteur a indexé.
   *
   * Ce n'est pas du camouflage : le contenu servi au robot pour une adresse donnée est
   * celui que n'importe quel visiteur obtient en saisissant cette même adresse. Seule
   * la redirection depuis une adresse SANS langue explicite est suspendue.
   *
   * ── ET LE CHOIX EXPLICITE PRIME TOUJOURS ────────────────────────────────
   *
   * next-intl mémorise en cookie la langue choisie au sélecteur, et ce cookie gagne
   * contre l'en-tête. Un visiteur qui a demandé le français le garde, quel que soit le
   * réglage de son système.
   */
  localeDetection: true,
})
