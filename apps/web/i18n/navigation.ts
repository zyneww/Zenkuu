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
