/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SESSION YAHOO — la poignée de main, partagée par tous les endpoints qui l'exigent
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CE MODULE EXISTE ────────────────────────────────────────────────
 *
 * Deux endpoints de Yahoo refusent tout appel nu et répondent « Invalid Crumb » :
 * `v10/quoteSummary`, qui alimente les fiches d'actif, et `v1/finance/screener`, qui
 * alimente le screener. Il faut d'abord obtenir un cookie de session, puis échanger ce
 * cookie contre un jeton — le « crumb » — à passer en paramètre de chaque requête.
 *
 * La poignée de main vivait dans `yahoo-profile.ts`, où elle était née. Le screener
 * l'aurait recopiée, et deux sessions auraient alors coexisté dans le même processus :
 * deux cookies, deux jetons, deux fois plus de créations de session pour Yahoo — qui
 * traite une rafale de créations comme un abus. Elle est donc remontée ici, et le
 * profil comme le screener partagent une seule session.
 *
 * ⚠️ ENDPOINTS NON OFFICIELS. Ils alimentent les pages web de Yahoo et peuvent
 * disparaître sans préavis — auquel cas les sections qu'ils alimentent disparaissent
 * avec eux, sans jamais laisser de valeur inventée derrière elles (§5).
 *
 * ── LE JETON EXPIRE, ET YAHOO NE DIT PAS QUAND ───────────────────────────────
 *
 * Deux mauvaises réponses à cela : le mémoriser pour toujours — les fiches cassent
 * silencieusement quelques heures plus tard — ou le redemander à chaque appel, ce qui
 * double le trafic sortant sur une source déjà plafonnée. On le mémorise donc et on ne
 * le renouvelle QU'APRÈS UN REFUS : l'échec devient le signal d'expiration, ce qui
 * évite d'avoir à deviner une durée de vie que le serveur ne publie pas.
 */

import { ProviderError } from '../types'

const PROVIDER_ID = 'yahoo-finance'

export const YAHOO_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface YahooSession {
  cookie: string
  crumb: string
}

/**
 * Cookie et jeton, sur `globalThis`.
 *
 * Même motif que le cache de données : sans cette accroche, chaque rechargement à
 * chaud en développement redemanderait la poignée de main, et Yahoo finirait par
 * répondre 429 à force de créations de session.
 */
const globalForSession = globalThis as unknown as {
  __zenkuuYahooSession?: YahooSession | null
}

/** Une seule poignée de main en vol à la fois — voir `handshake`. */
let pending: Promise<YahooSession> | null = null

/**
 * Ouvre une session : cookie de consentement, puis jeton.
 *
 * Déduplique les appels concurrents par la même promesse. Sans cela, huit fiches
 * rendues en parallèle sur un cache froid ouvriraient huit sessions — et Yahoo
 * traite une rafale de créations de session comme un abus.
 */
async function handshake(): Promise<YahooSession> {
  if (pending) return pending

  pending = (async () => {
    /*
     * `fc.yahoo.com` répond une erreur HTTP, et c'est ATTENDU : on ne vient pas y
     * chercher un corps mais l'en-tête `set-cookie` qui l'accompagne. D'où l'absence
     * de vérification de `response.ok` — la seule chose qui compte est le cookie.
     */
    const seed = await fetch('https://fc.yahoo.com/', {
      headers: { 'User-Agent': YAHOO_UA },
      redirect: 'manual',
    }).catch(() => null)

    const raw = seed?.headers.get('set-cookie') ?? ''
    // On ne garde que la paire `nom=valeur` de chaque cookie : les attributs
    // (`Path`, `Expires`, `HttpOnly`…) n'ont rien à faire dans un en-tête `Cookie`.
    const cookie = raw
      .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
      .map((part) => part.split(';')[0]?.trim())
      .filter((part): part is string => Boolean(part))
      .join('; ')

    const response = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': YAHOO_UA, ...(cookie ? { Cookie: cookie } : {}) },
    })

    const crumb = (await response.text()).trim()

    // Un jeton vide ou porteur d'un message d'erreur ne sert à rien : mieux vaut
    // échouer ici que d'envoyer une requête qu'on sait condamnée.
    if (!crumb || crumb.length > 32 || crumb.includes('<')) {
      throw new ProviderError(PROVIDER_ID, 'Session Yahoo refusée', { retryable: true })
    }

    return { cookie, crumb }
  })()

  try {
    const session = await pending
    globalForSession.__zenkuuYahooSession = session
    return session
  } finally {
    pending = null
  }
}

/**
 * Appelle un endpoint authentifié, en renouvelant la session une fois si elle a expiré.
 *
 * `build` reçoit le jeton et rend l'URL complète : le crumb se place tantôt en
 * paramètre de requête, tantôt ailleurs selon l'endpoint, et c'est à l'appelant de
 * savoir où. Il est passé en FONCTION et non en chaîne parce qu'un renouvellement doit
 * reconstruire l'URL avec le NOUVEAU jeton — une chaîne figée réessaierait avec
 * l'ancien, c'est-à-dire échouerait deux fois.
 *
 * `retry` borne la récursion à UN seul renouvellement : si le second appel échoue lui
 * aussi, ce n'est plus une expiration mais une fermeture de l'endpoint, et réessayer en
 * boucle ne ferait qu'attirer un blocage.
 */
export async function yahooFetch(
  build: (crumb: string) => string,
  retry = true,
): Promise<Response> {
  const session = globalForSession.__zenkuuYahooSession ?? (await handshake())

  const response = await fetch(build(session.crumb), {
    headers: { 'User-Agent': YAHOO_UA, ...(session.cookie ? { Cookie: session.cookie } : {}) },
  })

  if (response.status === 401 || response.status === 403) {
    globalForSession.__zenkuuYahooSession = null
    if (retry) return yahooFetch(build, false)
    throw new ProviderError(PROVIDER_ID, 'Session Yahoo expirée', { retryable: true })
  }

  return response
}

/**
 * Invalide la session courante.
 *
 * Appelé quand un refus arrive avec un statut 200 — « Invalid Crumb » est parfois dans
 * le CORPS et non dans le code de réponse, ce que `yahooFetch` ne peut pas voir : lui
 * ne connaît pas la forme des corps qu'il transporte.
 */
export function forgetYahooSession(): void {
  globalForSession.__zenkuuYahooSession = null
}
