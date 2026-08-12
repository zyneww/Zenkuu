import { defineRouting } from 'next-intl/routing'

import { DEFAULT_LOCALE, TRANSLATED_LOCALES } from '@/components/settings/languages'

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
   * Pas de détection automatique par l'en-tête `Accept-Language`.
   *
   * Un visiteur allemand arrivant sur un résultat de recherche français serait
   * redirigé vers l'anglais, c'est-à-dire vers une page qui n'est PAS celle que
   * Google lui a montrée. Le taux de rebond que cela produit est bien réel, et la
   * redirection perturbe aussi l'indexation : le robot de Google explore depuis des
   * adresses IP américaines et ne verrait plus jamais le français.
   *
   * Le choix reste donc explicite — par le sélecteur — et mémorisé par next-intl
   * dans un cookie une fois exprimé.
   */
  localeDetection: false,
})
