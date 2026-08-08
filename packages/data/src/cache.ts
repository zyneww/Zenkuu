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
    try {
      const value = await fetcher()
      await cache.set(key, value, ttlSeconds)
      return value
    } finally {
      // Retiré dans tous les cas : un échec ne doit pas laisser une clé bloquée,
      // sans quoi la prochaine tentative attendrait une promesse déjà rejetée.
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, request)
  return request
}
