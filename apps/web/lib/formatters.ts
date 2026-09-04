import { getLocale } from 'next-intl/server'

import { createFormatters, type Formatters } from '@zenkuu/ui'

/**
 * Les formateurs de la langue rendue — CÔTÉ SERVEUR.
 *
 * ── POURQUOI DEUX ACCESSEURS ET NON UN ───────────────────────────────────────
 *
 * `getLocale()` de next-intl lit le contexte de requête et n'existe que sur le
 * serveur ; `useLocale()` est un crochet React et n'existe que dans un composant
 * client. Les mêmes formateurs, deux chemins pour atteindre la langue, exactement
 * comme `getPhrase()` et `usePhrase()` qui existaient déjà pour les phrases.
 *
 * Le pendant client vit dans `components/locale/useFormatters.ts`, marqué
 * `'use client'` : les réunir dans un seul fichier ferait traverser `next-intl/server`
 * au bundle du navigateur.
 *
 * ── CE QU'IL FAUT EN FAIRE ───────────────────────────────────────────────────
 *
 *     const nombres = await getFormatters()
 *     nombres.currency(asset.price, 'usd')
 *     nombres.percent(asset.change24h)
 *
 * On l'appelle UNE FOIS par composant, jamais par valeur : `createFormatters` construit
 * neuf fermetures, et les rebâtir à chaque cellule d'un tableau de trois cents lignes
 * se paierait en rendu.
 *
 * ⚠️ UNE FONCTION AUXILIAIRE DU MÊME FICHIER NE PEUT PAS L'APPELER. Elle vit hors du
 * composant, donc hors du contexte de requête : elle doit RECEVOIR l'objet en
 * argument. C'est plus verbeux d'un paramètre, et c'est ce qui rend visible quelles
 * fonctions dépendent de la langue.
 */
export async function getFormatters(): Promise<Formatters> {
  return createFormatters(await getLocale())
}
