/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LIMITEUR DE DÉBIT PAR ADRESSE — CE QU'IL PROTÈGE, ET DE QUOI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE RISQUE, ET IL EST RÉEL ────────────────────────────────────────────────
 *
 * Les routes de `app/api/` servent du JSON depuis un cache PARTAGÉ par tous les
 * visiteurs, alimenté par des sources gratuites plafonnées à quelques appels par
 * minute. Une clé de cache dépend de ses paramètres : `?id=…&jours=…` ouvre donc
 * autant d'entrées que de combinaisons.
 *
 * Une boucle qui varie ces paramètres ne consomme pas SON quota, elle consomme
 * CELUI DU SITE. Le limiteur du client HTTP (voir `providers/*.ts`) empêche bien
 * d'inonder la source, mais il le fait en refusant les appels — c'est-à-dire en
 * dégradant les pages de tout le monde. Ce fichier borne l'entrée plutôt que la
 * sortie.
 *
 * ── POURQUOI UNE `Map` EN MÉMOIRE, ET CE QUE ÇA NE COUVRE PAS ────────────────
 *
 * ⚠️ LA LIMITE EST PAR INSTANCE. Sur un hébergement sans état — plusieurs machines,
 * plusieurs régions — un client réparti sur quatre instances obtient quatre fois le
 * quota. C'est une limite CONNUE et acceptée : ce garde-fou vise l'abus ordinaire,
 * pas une attaque distribuée, contre laquelle seul un WAF en amont vaut quelque
 * chose. Le prix à payer serait une dépendance (Redis) et un aller-retour réseau sur
 * chaque requête, pour un site dont le trafic tient dans une instance.
 *
 * Le seau se répare tout seul : les compteurs expirés sont écartés à la lecture, et
 * la table est PURGÉE au-delà d'un plafond — sans quoi une adresse par requête
 * ferait de ce garde-fou une fuite de mémoire, c'est-à-dire l'inverse de son objet.
 *
 * ── POURQUOI PAS DE COOKIE NI D'IDENTIFIANT ─────────────────────────────────
 *
 * L'adresse IP suffit et ne demande rien au visiteur. Elle n'est ni stockée ni
 * journalisée : elle sert de clé dans une table en mémoire, remise à zéro à chaque
 * redémarrage.
 */

interface Bucket {
  /** Requêtes comptées depuis le début de la fenêtre. */
  count: number
  /** Fin de la fenêtre, en millisecondes. */
  resetAt: number
}

/**
 * Plafond de la table, en nombre d'adresses suivies.
 *
 * Dix mille entrées de deux nombres pèsent quelques centaines de kilo-octets. Au-delà,
 * la table est vidée entièrement plutôt qu'élaguée finement : la purge coûterait plus
 * cher que ce qu'elle économise, et repartir de zéro ne fait qu'accorder une fenêtre
 * de plus à des visiteurs légitimes.
 */
const MAX_TRACKED = 10_000

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  /** Requêtes restantes dans la fenêtre courante. */
  remaining: number
  /** Secondes avant réouverture — sert l'en-tête `Retry-After`. */
  retryAfter: number
}

/**
 * Consomme un jeton pour cette clé.
 *
 * @param key    Adresse du client, préfixée par la route : deux routes ne doivent pas
 *               se partager un compteur, sinon la recherche épuiserait le quota du
 *               graphique.
 * @param limit  Requêtes autorisées par fenêtre.
 * @param windowMs Durée de la fenêtre.
 */
export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  if (buckets.size > MAX_TRACKED) buckets.clear()

  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }

  existing.count += 1

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  return { ok: true, remaining: limit - existing.count, retryAfter: 0 }
}

/**
 * L'adresse du client, telle que la voit l'hébergeur.
 *
 * `x-forwarded-for` porte la chaîne complète des relais : le PREMIER élément est le
 * client, les suivants sont les proxys traversés. Prendre le dernier reviendrait à
 * compter tout le monde sous l'adresse du répartiteur de charge, donc à limiter le
 * site entier au quota d'une seule personne.
 *
 * ⚠️ CET EN-TÊTE EST FALSIFIABLE quand rien ne le réécrit en amont. Sur Vercel — la
 * cible de ce déploiement — il est posé par la plateforme et ne peut pas être forgé
 * par le client. Hors de ce contexte, ce limiteur ne vaut que ce que vaut le proxy
 * qui le précède, et c'est vrai de tous les limiteurs par IP.
 */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'inconnue'
}

/** Réponse 429 normalisée — même forme que les erreurs JSON des routes. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ erreur: 'Trop de requêtes. Réessayez dans un instant.' }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'retry-after': String(retryAfter),
        'cache-control': 'no-store',
      },
    },
  )
}

/**
 * Garde-fou prêt à l'emploi : `null` quand la requête passe, une réponse 429 sinon.
 *
 * Écrit ainsi pour que l'appel tienne en deux lignes dans une route — un garde-fou
 * qu'on hésite à poser parce qu'il coûte dix lignes finit par manquer quelque part.
 */
export function guard(
  request: Request,
  route: string,
  limit: number,
  windowMs = 60_000,
): Response | null {
  const verdict = consume(`${route}:${clientAddress(request)}`, limit, windowMs)
  return verdict.ok ? null : tooManyRequests(verdict.retryAfter)
}
