/**
 * Client HTTP des adaptateurs : limitation de débit, délais, erreurs normalisées.
 *
 * Le §9 impose un rate limiting côté ZENKUU pour ne jamais dépasser les quotas des
 * fournisseurs gratuits. Le point important : ce garde-fou est ici, dans le client
 * partagé, et non dans chaque adaptateur — un nouveau fournisseur en hérite en
 * déclarant simplement son quota.
 */

import { CACHE_TTL_SECONDS } from './cache'
import { ProviderError } from './types'

/**
 * Limiteur à fenêtre glissante.
 *
 * Une simple contrainte d'intervalle minimal ne convient pas : les quotas gratuits
 * s'expriment en « N requêtes par minute », ce qui autorise une rafale courte puis
 * impose une pause. Un intervalle fixe, lui, pénaliserait le premier rendu (qui
 * enchaîne 3 appels légitimes) tout en laissant passer un débit soutenu trop élevé.
 */
class RateLimiter {
  private readonly timestamps: number[] = []
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
    private readonly minIntervalMs: number,
  ) {}

  /** Attend son tour. Les appels concurrents sont sérialisés dans l'ordre d'arrivée. */
  acquire(): Promise<void> {
    const turn = this.queue.then(() => this.reserve())
    // On neutralise le rejet sur la chaîne interne : une erreur d'un appelant ne
    // doit pas bloquer définitivement la file pour les suivants.
    this.queue = turn.catch(() => undefined)
    return turn
  }

  private async reserve(): Promise<void> {
    for (;;) {
      const now = Date.now()

      while (this.timestamps.length > 0 && now - (this.timestamps[0] as number) >= this.windowMs) {
        this.timestamps.shift()
      }

      const last = this.timestamps[this.timestamps.length - 1]
      if (last !== undefined && now - last < this.minIntervalMs) {
        await sleep(this.minIntervalMs - (now - last))
        continue
      }

      if (this.timestamps.length >= this.maxPerWindow) {
        const oldest = this.timestamps[0] as number
        await sleep(this.windowMs - (now - oldest) + 10)
        continue
      }

      this.timestamps.push(Date.now())
      return
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

export interface HttpClientOptions {
  providerId: string
  baseUrl: string
  /** Quota soutenu autorisé par le fournisseur. */
  maxRequestsPerWindow: number
  windowMs?: number
  minIntervalMs?: number
  timeoutMs?: number
  /**
   * Reprendre après un DÉLAI DÉPASSÉ ? Vrai par défaut.
   *
   * À passer à `false` sur les sources au délai généreux : la reprise doublerait un
   * pire cas déjà long, et c'est la page qui attend. Sans effet sur les reprises
   * après 429 ou 5xx, qui restent toujours actives — ce sont des refus immédiats,
   * dont la reprise ne coûte que son attente délibérée.
   */
  retryOnTimeout?: boolean
  /** Durée de vie côté cache HTTP de Next.js. Doit valoir `CACHE_TTL_SECONDS`. */
  revalidateSeconds?: number
  /**
   * Contourner le cache HTTP de Next.js pour ce fournisseur ? Faux par défaut.
   *
   * ── QUAND LE METTRE À VRAI, ET POURQUOI ───────────────────────────────────
   *
   * Le cache de Next écrit CHAQUE RÉPONSE BRUTE sur le disque. C'est excellent pour
   * une API JSON compacte interrogée souvent ; c'est ruineux pour un agrégat de
   * vingt-neuf flux RSS, dont chaque réponse pèse des centaines de kilo-octets.
   *
   * Mesuré sur cette machine : `fetchNews(72)` prend 5,7 secondes en direct et
   * dépassait 90 secondes à travers Next — l'écriture d'environ six méga-octets de
   * XML dominait entièrement le temps de réponse, et la page paraissait « lente »
   * sans que rien ne désigne le cache.
   *
   * Le rendre facultatif suppose qu'un AUTRE cache prenne le relais. C'est le cas
   * ici : `runStandalone` mémorise le résultat PARSÉ, incomparablement plus léger
   * que les XML dont il est tiré, et pour la même durée.
   */
  bypassNextCache?: boolean
  /** En-têtes constants (clé d'API, Accept…). */
  headers?: Record<string, string>
}

export interface HttpClient {
  /**
   * `revalidateOverrideSeconds` remplace, pour ce seul appel, le `revalidateSeconds`
   * du client — utile aux requêtes à forte visibilité et faible cardinalité (un
   * classement, des statistiques globales) qu'on veut rafraîchir plus vite que le
   * reste du fournisseur SANS ouvrir un second limiteur de débit : le quota reste
   * unique et partagé, seule la fraîcheur du cache HTTP change.
   */
  getJson<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    revalidateOverrideSeconds?: number,
  ): Promise<T>
  /** Réponse brute — nécessaire pour les flux RSS, qui sont du XML et non du JSON. */
  getText(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<string>
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const {
    providerId,
    baseUrl,
    maxRequestsPerWindow,
    windowMs = 60_000,
    minIntervalMs = 150,
    timeoutMs = 10_000,
    retryOnTimeout = true,
    revalidateSeconds = CACHE_TTL_SECONDS,
    bypassNextCache = false,
    headers = {},
  } = options

  const limiter = new RateLimiter(maxRequestsPerWindow, windowMs, minIntervalMs)

  function buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
    }
    return url.toString()
  }

  async function attempt<T>(
    url: string,
    as: 'json' | 'text' = 'json',
    revalidateOverrideSeconds?: number,
  ): Promise<T> {
    let response: Response
    try {
      // `next.revalidate` plutôt que `cache: 'no-store'` : `no-store` fait basculer
      // toute page qui l'utilise en rendu dynamique, ce qui supprimerait l'ISR
      // demandé au §9. On aligne donc cette durée sur celle du cache applicatif et
      // sur le `revalidate` des pages — un seul et même nombre partout, si bien que
      // les trois couches expirent ensemble au lieu de cumuler leurs latences (sauf
      // override explicite, voir `HttpClient.getJson`).
      // La propriété est ignorée hors Next.js (scripts, tests), sans effet de bord.
      const init: RequestInit & { next?: { revalidate: number } } = {
        headers: { Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      }

      /*
       * `no-store` plutôt que `next.revalidate` quand le contournement est demandé.
       *
       * Le compromis est explicite : `no-store` rend dynamique toute page qui en
       * dépend, ce que le §9 cherche justement à éviter — mais il n'est activé que
       * par les fournisseurs dont les réponses sont trop volumineuses pour le cache
       * disque, et dont le résultat parsé est mis en cache un cran plus haut. Voir
       * `bypassNextCache` pour les mesures qui ont motivé cette porte de sortie.
       */
      if (bypassNextCache) {
        init.cache = 'no-store'
      } else {
        init.next = { revalidate: revalidateOverrideSeconds ?? revalidateSeconds }
      }

      response = await fetch(url, init)
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === 'TimeoutError'
      throw new ProviderError(
        providerId,
        aborted ? `Délai dépassé après ${timeoutMs} ms` : 'Requête réseau échouée',
        { retryable: true, cause },
      )
    }

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'))
      throw new ProviderError(providerId, 'Quota du fournisseur atteint', {
        status: 429,
        retryable: true,
        cause: Number.isFinite(retryAfter) ? { retryAfterMs: retryAfter * 1000 } : undefined,
      })
    }

    if (!response.ok) {
      throw new ProviderError(providerId, `Réponse HTTP ${response.status}`, {
        status: response.status,
        retryable: response.status >= 500,
      })
    }

    try {
      return (as === 'text' ? await response.text() : await response.json()) as T
    } catch (cause) {
      throw new ProviderError(providerId, `Réponse ${as === 'text' ? 'illisible' : 'JSON illisible'}`, {
        cause,
      })
    }
  }

  /** Une tentative, puis une seule reprise si l'échec est jugé transitoire. */
  async function request<T>(
    path: string,
    query: Record<string, string | number | boolean | undefined> | undefined,
    as: 'json' | 'text',
    revalidateOverrideSeconds?: number,
  ): Promise<T> {
    const url = buildUrl(path, query)

    await limiter.acquire()
    try {
      return await attempt<T>(url, as, revalidateOverrideSeconds)
    } catch (error) {
      if (!(error instanceof ProviderError) || !error.retryable) throw error

      /*
       * DÉLAI DÉPASSÉ : la reprise est conditionnelle.
       *
       * Reprendre multiplie le pire cas par deux — et c'est la PAGE qui attend, pas
       * une tâche de fond. Sur une source au délai généreux, l'addition devient
       * franchement longue : 25 s de délai deviennent 50 s d'attente pour un
       * visiteur, alors qu'une source qui vient d'ignorer 25 secondes n'a guère de
       * chances de répondre dans les 25 suivantes.
       *
       * La distinction avec un 429 ou un 5xx est nette : ceux-là sont des refus
       * IMMÉDIATS, la reprise ne coûte que son attente délibérée et réussit souvent.
       */
      const timedOut = error.message.startsWith('Délai dépassé')
      if (timedOut && !retryOnTimeout) throw error

      // Une seule nouvelle tentative : au-delà, on préfère afficher un état vide
      // rapidement plutôt que faire patienter l'utilisateur (§5, §9).
      const hint = error.cause as { retryAfterMs?: number } | undefined
      await sleep(hint?.retryAfterMs ?? 1_000)
      await limiter.acquire()
      return attempt<T>(url, as, revalidateOverrideSeconds)
    }
  }

  return {
    getJson<T>(
      path: string,
      query?: Record<string, string | number | boolean | undefined>,
      revalidateOverrideSeconds?: number,
    ): Promise<T> {
      return request<T>(path, query, 'json', revalidateOverrideSeconds)
    },
    getText(
      path: string,
      query?: Record<string, string | number | boolean | undefined>,
    ): Promise<string> {
      return request<string>(path, query, 'text')
    },
  }
}
