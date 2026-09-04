import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * Navigation consciente de la locale — remplace `next/link` et `next/navigation`.
 *
 * Sans ce wrapper, un lien ou un `router.push()` écrit avec un chemin brut
 * (`/crypto/bitcoin`) ignore la locale courante : depuis `/en/crypto`, cliquer
 * dessus renvoie vers la version FRANÇAISE (le préfixe par défaut, absent en
 * `as-needed`) au lieu de `/en/crypto/bitcoin`. C'est invisible en français —
 * la locale par défaut n'a pas de préfixe à perdre — et ça casse silencieusement
 * toute navigation dès qu'on bascule en anglais, espagnol ou allemand.
 *
 * `Link`, `useRouter`, `redirect` et `getPathname` produits ici connaissent
 * `routing` (locales, préfixe `as-needed`) et préfixent automatiquement.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)

/**
 * Le type d'un `href` valide.
 *
 * Depuis que `routing.pathnames` existe, ce n'est plus `string` : c'est l'union des
 * cinquante-huit routes déclarées, plus la forme `{ pathname, params, query }` pour
 * celles qui portent un paramètre. Les composants qui font suivre un lien reçu en
 * propriété — un tableau, un fil d'Ariane, un menu — doivent le déclarer ainsi
 * plutôt qu'en `string`, sans quoi le contrôle s'arrête à leur frontière et une
 * adresse inexistante repasse en silence.
 *
 * ⚠️ DÉRIVÉ DE `useRouter().push` ET NON DE `Link`, ce qui n'est pas un détail. Le
 * `href` de `Link` accepte en plus les champs d'un `UrlObject` — `hash`, `search` —
 * dont `push` et `redirect` ne veulent pas. Pris chez `Link`, ce type traverserait donc
 * un `<Link>` mais serait refusé par `router.push()` : la même valeur, acceptée à un
 * endroit et rejetée à l'autre. Pris chez `push`, il est accepté partout, `Link`
 * compris — c'est le plus PETIT des deux, et c'est ce qu'on veut d'un dénominateur.
 */
export type AppHref = Parameters<ReturnType<typeof useRouter>['push']>[0]

/**
 * Une route SANS paramètre — la moitié « chaîne » d'`AppHref`.
 *
 * Utile là où l'adresse sert aussi d'IDENTIFIANT : les onglets de graphiques prennent
 * leur `href` pour clé, parce qu'une adresse est unique là où un libellé traduit ne
 * l'est pas. Un objet ne peut pas servir de clé React ; ce type garantit qu'il n'en
 * arrivera pas.
 */
export type AppRoute = Extract<AppHref, string>
