/**
 * Cache applicatif — interface stable, implémentation interchangeable.
 *
 * Le §4 prévoit Dragonfly (compatible Redis) avec un TTL de 5 minutes. Monter
 * Dragonfly n'apporte rien tant qu'il n'y a pas d'ingestion planifiée : on démarre
 * donc sur une implémentation mémoire DERRIÈRE CETTE INTERFACE. Le jour où
 * Dragonfly arrive, on écrit `createRedisCache()` qui satisfait `CacheStore`, on
 * change le seul point d'instanciation en bas de ce fichier, et aucune page,
 * aucun adaptateur ne bouge.
 */

/** TTL de référence (§4). Aligné avec `revalidate` des pages Next.js. */
export const CACHE_TTL_SECONDS = 300

export interface CacheStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
}

interface CacheEntry {
  value: unknown
  expiresAt: number
}

/**
 * Implémentation mémoire, à portée du processus.
 *
 * Purge paresseuse : une entrée expirée est supprimée à la lecture. Un balayage
 * périodique est ajouté au-delà d'un seuil d'entrées pour éviter que des clés
 * jamais relues ne s'accumulent (le cas du classement paginé, où les pages
 * profondes ne sont visitées qu'une fois).
 */
export function createMemoryCache(maxEntries = 500): CacheStore {
  const store = new Map<string, CacheEntry>()

  function sweep(): void {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key)
    }
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiresAt <= Date.now()) {
        store.delete(key)
        return null
      }
      return entry.value as T
    },

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
      if (store.size >= maxEntries) sweep()
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    },

    async delete(key: string): Promise<void> {
      store.delete(key)
    },
  }
}

/**
 * Instance partagée du processus.
 *
 * En développement, Next.js recharge les modules à chaud : sans cette accroche
 * sur `globalThis`, chaque rechargement repartirait d'un cache vide et taperait
 * l'API externe à chaque sauvegarde de fichier — ce qui épuiserait le quota
 * gratuit en quelques minutes.
 */
const globalForCache = globalThis as unknown as { __zenithCache?: CacheStore }

export const cache: CacheStore = globalForCache.__zenithCache ?? createMemoryCache()

if (process.env.NODE_ENV !== 'production') {
  globalForCache.__zenithCache = cache
}

/**
 * Requêtes en vol, pour dédupliquer les appels concurrents sur une même clé.
 *
 * Sans cela, N requêtes arrivant simultanément sur une entrée froide déclenchent N
 * appels vers l'API externe : c'est le scénario qui épuise le plus sûrement un
 * quota gratuit, et il se produit exactement au pire moment — au démarrage, ou à
 * l'expiration d'une clé populaire. Ici, le premier appelant lance la requête et
 * les suivants attendent la même promesse.
 */
const globalForFlight = globalThis as unknown as {
  __zenithInFlight?: Map<string, Promise<unknown>>
}

const inFlight: Map<string, Promise<unknown>> =
  globalForFlight.__zenithInFlight ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  /*
   * Table VIDÉE à chaque rechargement à chaud, contrairement au cache juste au-dessus.
   *
   * Les deux n'ont pas la même raison de survivre. Le cache doit tenir : le revider à
   * chaque sauvegarde de fichier ferait retaper la source externe en boucle, et le
   * quota gratuit n'y résisterait pas. Cette table-ci ne contient que des requêtes de
   * quelques centaines de millisecondes ; en garder le contenu à travers un
   * rechargement n'économise rien, et fait courir un risque réel — une promesse créée
   * par une version PRÉCÉDENTE du module resterait attendue par la nouvelle, corrigée.
   * C'est ce qui s'est produit ici : une clé rejetée est restée en place après le
   * correctif, et la fiche concernée est demeurée en panne quand ses voisines
   * fonctionnaient.
   *
   * Le seul coût est un appel sortant dupliqué si deux requêtes identiques encadrent
   * exactement un rechargement — en développement, et une fois.
   */
  inFlight.clear()
  globalForFlight.__zenithInFlight = inFlight
}

/** Lit depuis le cache, sinon exécute `fetcher` une seule fois et mémorise le résultat. */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL_SECONDS,
): Promise<T> {
  const hit = await cache.get<T>(key)
  if (hit !== null) return hit

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const request = (async () => {
    const value = await fetcher()
    await cache.set(key, value, ttlSeconds)
    return value
  })()

  inFlight.set(key, request)

  /*
   * NETTOYAGE ATTACHÉ APRÈS L'ENREGISTREMENT — l'ordre est tout.
   *
   * La version précédente retirait la clé depuis un `finally` PLACÉ DANS le corps
   * de la fonction asynchrone. Le corps d'une fonction `async` s'exécute de façon
   * synchrone jusqu'au premier `await` : si `fetcher()` lève AVANT d'attendre quoi
   * que ce soit — ce que font tous nos gardes de contrat, du genre « fiche non
   * supportée par cette source » — le `finally` s'exécutait pendant l'appel de
   * l'expression, donc avant le `inFlight.set` de la ligne suivante. Il supprimait
   * une clé qui n'existait pas encore, puis la promesse REJETÉE était enregistrée…
   * et n'en repartait jamais.
   *
   * Conséquence, et elle est vicieuse : la clé restait empoisonnée pour toute la
   * durée de vie du processus. Chaque requête suivante recevait la même erreur, y
   * compris après correction de la cause. C'est exactement ce qui s'est produit ici —
   * une fiche devises est restée en panne après le correctif quand ses sept voisines,
   * jamais demandées avant, fonctionnaient.
   *
   * Le `catch` vide ne masque rien : le rejet est délivré à l'appelant par `request`,
   * qui est la promesse retournée. Cette branche-ci n'existe que pour retirer la clé,
   * et sans elle Node signalerait un rejet non traité sur une promesse dérivée.
   */
  void request.finally(() => inFlight.delete(key)).catch(() => {})

  return request
}
