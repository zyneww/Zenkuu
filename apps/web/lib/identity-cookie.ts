/**
 * COOKIE D'AFFICHAGE — le seul que la page ait le droit de lire.
 *
 * ── POURQUOI CE MODULE EST SÉPARÉ DE `lib/session.ts` ─────────────────────────
 *
 * `session.ts` importe `next/headers` et la couche base : un composant client qui en
 * importerait la moindre constante embarquerait tout cela dans le paquet du
 * navigateur, ou refuserait de compiler. Ce fichier-ci n'importe RIEN, et c'est sa
 * seule raison d'être séparé.
 *
 * ── POURQUOI UN SECOND COOKIE ─────────────────────────────────────────────────
 *
 * L'en-tête doit savoir s'afficher en « Se connecter » ou en avatar. La façon propre
 * serait de résoudre la session dans la mise en page, côté serveur, et de descendre
 * la réponse en prop.
 *
 * C'est impossible ici, et la raison n'est pas de style. Lire un cookie dans une mise
 * en page bascule TOUTES les routes qu'elle enveloppe en rendu dynamique. Ce site vit
 * sur un `revalidate` de trois minutes pour ses classements et ses milliers de fiches
 * d'actifs ; l'échanger contre un rendu complet à chaque visite, pour un avatar de
 * 28 pixels, serait un très mauvais marché (§9).
 *
 * ── CE QU'IL CONTIENT, ET CE QU'IL NE PEUT PAS FAIRE ──────────────────────────
 *
 * Un pseudonyme et une adresse, rien d'autre. Il est délibérément LISIBLE par les
 * scripts de la page, et donc falsifiable : quelqu'un qui le réécrit à la main change
 * la lettre affichée dans son propre avatar. C'est tout. Aucune lecture de données ne
 * s'y fie — elles passent toutes par le jeton `httpOnly`, vérifié en base.
 *
 * Cette séparation est la raison d'être des deux cookies : celui qui peut être lu ne
 * peut rien, celui qui peut tout ne peut pas être lu.
 */
export const IDENTITY_COOKIE = 'zk_me'

/**
 * Sérialise l'identité d'affichage.
 *
 * Base64 d'un JSON, et non le JSON brut : un pseudonyme peut contenir un point-virgule
 * ou une virgule, qui sont les séparateurs de l'en-tête `Cookie`. `encodeURIComponent`
 * seul suffirait à cela mais laisserait l'adresse lisible à l'œil nu dans
 * l'inspecteur, ce qui n'ajoute aucune sécurité mais invite à la bricoler.
 */
export function encodeIdentity(handle: string, email: string): string {
  return btoa(encodeURIComponent(JSON.stringify({ h: handle, e: email })))
}

/**
 * Relit l'identité d'affichage — utilisée côté NAVIGATEUR.
 *
 * Tolérante par construction : la valeur vient d'un cookie que n'importe qui peut
 * réécrire. Une forme inattendue rend `null`, ce qui affiche « Se connecter » — le
 * pire résultat possible est donc un bouton de connexion pour quelqu'un qui l'est
 * déjà, corrigé au premier rechargement d'une page où la session compte vraiment.
 */
export function decodeIdentity(raw: string): { handle: string; email: string } | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(raw)))
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (typeof record['h'] !== 'string' || typeof record['e'] !== 'string') return null
    return { handle: record['h'], email: record['e'] }
  } catch {
    return null
  }
}

/**
 * Lit le cookie d'affichage depuis `document.cookie`.
 *
 * Rend `null` côté serveur plutôt que de lever : ce module est importé par des
 * composants qui sont RENDUS UNE FOIS sur le serveur avant d'être hydratés, et une
 * exception y ferait tomber la page entière.
 */
export function readIdentityCookie(): { handle: string; email: string } | null {
  if (typeof document === 'undefined') return null

  for (const part of document.cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === IDENTITY_COOKIE) return decodeIdentity(rest.join('='))
  }
  return null
}

/**
 * Initiale affichée dans l'avatar de l'en-tête.
 *
 * Bornée à UNE lettre et mise en capitale : deux initiales sur un disque de 28 pixels
 * tombent sous la taille lisible, et un pseudonyme commençant par un signe de
 * ponctuation ou un emoji doit tout de même donner quelque chose. D'où le repli.
 */
export function initialOf(handle: string): string {
  const first = handle.trim().charAt(0).toUpperCase()
  return /^[\p{L}\p{N}]$/u.test(first) ? first : 'Z'
}
