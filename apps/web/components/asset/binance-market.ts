/**
 * Accès Binance DEPUIS LE NAVIGATEUR — cours et bougies en direct.
 *
 * ── POURQUOI CÔTÉ CLIENT, ET PAS DANS `packages/data` ─────────────────────────
 *
 * `packages/data/src/providers/binance.ts` interroge Binance depuis NOTRE serveur,
 * en secours de CoinGecko. Ce module-ci fait l'inverse : il part du navigateur du
 * visiteur, avec son adresse IP et son quota à lui.
 *
 * La différence n'est pas un détail d'implémentation, c'est tout l'intérêt. Un cours
 * qui tique à la seconde représente des milliers de relevés par heure et par onglet
 * ouvert. Les faire transiter par notre serveur les additionnerait sur une seule
 * adresse IP — celle de la fonction Vercel — et ferait tomber le plafond de Binance
 * pour tous les visiteurs à la fois, en plus de nous facturer autant d'invocations.
 * Répartis sur les navigateurs, ces relevés ne coûtent RIEN et ne peuvent pas
 * s'additionner. C'est déjà le raisonnement du carnet d'ordres (`AssetOrderBook`).
 *
 * Corollaire à ne pas perdre de vue : ces données n'existent que dans l'onglet. Elles
 * ne peuvent alimenter ni le rendu serveur, ni l'indexation, ni un traitement par
 * courriel. Elles COMPLÈTENT la série servie par notre API, elles ne la remplacent
 * pas.
 *
 * ── CE QUE BINANCE COTE, ET CE QU'IL NE COTE PAS ──────────────────────────────
 *
 * Des PAIRES D'ÉCHANGE en USDT, et rien d'autre : pas de capitalisation, pas d'offre
 * en circulation, aucune action ni devise. Une paire absente n'est pas une panne —
 * c'est le cas normal des petites capitalisations — et le seul comportement correct
 * est alors de rendre la main à l'appelant, qui retombe sur la donnée CoinGecko déjà
 * rendue par le serveur (§5 : dégrader, jamais inventer).
 *
 * L'assimilation USDT ≈ USD est assumée et documentée dans l'adaptateur serveur :
 * l'écart d'ancrage se compte en points de base, très en deçà de l'amplitude des
 * actifs cotés.
 */

/**
 * Hôte réservé aux données de marché publiques.
 *
 * `api.binance.com` répondrait la même chose, mais mêle à la même origine les
 * endpoints de compte. Viser l'hôte le plus étroit coûte le même prix — voir
 * l'en-tête de `providers/binance.ts`, qui retient le même.
 */
export const BINANCE_DATA_HOST = 'https://data-api.binance.vision'

/** Flux temps réel. Hôte distinct de celui des requêtes ponctuelles, chez Binance. */
const BINANCE_STREAM_HOST = 'wss://stream.binance.com:9443/ws'

/**
 * Paire tentée pour un symbole d'actif.
 *
 * Une SUPPOSITION, et il faut la traiter comme telle : « SOL » donne « SOLUSDT »,
 * qui existe, mais rien ne garantit que la paire soit cotée pour un actif
 * quelconque. L'appelant doit donc toujours prévoir l'échec — c'est le cas nominal
 * pour la longue traîne du classement, pas une erreur à signaler.
 */
export function toBinancePair(symbol: string): string {
  return `${symbol.toUpperCase()}USDT`
}

/**
 * Pas de bougie proposés, alignés sur les places de trading.
 *
 * `1s` est volontairement ABSENT alors que Binance le publie : à ce pas, une heure
 * d'historique demande 3 600 bougies et le tracé se redessine à chaque seconde. Ce
 * site sert à analyser un actif, pas à scalper — le pas d'une minute est déjà plus
 * fin que ce que n'importe quelle décision d'investissement exige.
 */
export const BINANCE_INTERVALS = [
  { id: '1m', label: '1 m', minutes: 1 },
  { id: '5m', label: '5 m', minutes: 5 },
  { id: '15m', label: '15 m', minutes: 15 },
  { id: '1h', label: '1 h', minutes: 60 },
  { id: '4h', label: '4 h', minutes: 240 },
  { id: '1d', label: '1 J', minutes: 1440 },
] as const

export type BinanceInterval = (typeof BINANCE_INTERVALS)[number]['id']

export interface LiveCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/** Plafond de Binance par appel. Le dépasser renverrait une série TRONQUÉE en silence. */
const MAX_KLINES = 1000

/**
 * Bougies réelles pour une paire et un pas donnés.
 *
 * Lève sur paire inconnue ou source injoignable : l'appelant doit décider quoi
 * afficher à la place, et un tableau vide se confondrait avec « ce marché n'a pas
 * échangé », qui est un fait très différent.
 */
export async function fetchBinanceKlines(
  pair: string,
  interval: BinanceInterval,
  limit = 500,
  signal?: AbortSignal,
): Promise<LiveCandle[]> {
  const url = new URL(`${BINANCE_DATA_HOST}/api/v3/klines`)
  url.searchParams.set('symbol', pair)
  url.searchParams.set('interval', interval)
  url.searchParams.set('limit', String(Math.min(limit, MAX_KLINES)))

  const response = await fetch(url, signal ? { signal } : {})
  if (!response.ok) {
    throw new Error(`Binance a répondu ${response.status} pour ${pair}`)
  }

  const rows = (await response.json()) as unknown[]
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Aucune bougie pour ${pair}`)
  }

  return rows.flatMap((row) => {
    if (!Array.isArray(row)) return []
    const candle = toCandle(row)
    return candle ? [candle] : []
  })
}

/**
 * Une ligne de `klines` vers une bougie.
 *
 * Les bornes numériques arrivent en CHAÎNES chez Binance — c'est ainsi qu'il évite
 * la perte de précision des flottants sur les jetons à huit décimales. Une ligne
 * dont une borne ne se relit pas est ÉCARTÉE plutôt que ramenée à zéro : un zéro se
 * lirait comme un effondrement du cours (§5).
 */
function toCandle(row: unknown[]): LiveCandle | null {
  const timestamp = Number(row[0])
  const open = Number(row[1])
  const high = Number(row[2])
  const low = Number(row[3])
  const close = Number(row[4])
  const volume = Number(row[5])

  if (![timestamp, open, high, low, close].every(Number.isFinite)) return null

  const candle: LiveCandle = { timestamp, open, high, low, close }
  if (Number.isFinite(volume)) candle.volume = volume
  return candle
}

/**
 * Abonnement à un flux Binance.
 *
 * Rend une fonction de RÉSILIATION plutôt qu'un objet WebSocket : l'appelant n'a
 * aucune raison de manipuler la connexion, et lui en donner la poignée l'exposerait
 * à la refermer à moitié — un socket fermé sans que le compte à rebours de reprise
 * ne soit annulé se rouvre tout seul, indéfiniment.
 */
export type Unsubscribe = () => void

/**
 * Dernier cours négocié, poussé environ une fois par seconde.
 *
 * ── POURQUOI `miniTicker` ET NON `trade` ──────────────────────────────────────
 *
 * `trade` émet un message PAR TRANSACTION : sur une paire active, plusieurs
 * centaines par seconde, dont l'immense majorité ne déplace pas le cours d'un
 * centième. `miniTicker` agrège la même information à la seconde. L'affichage ne
 * peut de toute façon pas montrer plus vite qu'une image tous les seizièmes de
 * seconde ; le reste serait du travail jeté.
 *
 * ── LA REPRISE, ET POURQUOI ELLE EST BORNÉE ───────────────────────────────────
 *
 * Binance ferme les connexions de plus de 24 heures, et un portable qui sort de
 * veille retrouve un socket mort. Une reprise est donc nécessaire. Elle est
 * PLAFONNÉE et progressive : une paire qui n'existe pas fait échouer la connexion
 * immédiatement, et une reprise sèche produirait alors une boucle qui martèle
 * Binance jusqu'à la fermeture de l'onglet.
 */
export function subscribeTicker(
  pair: string,
  onPrice: (price: number, at: number) => void,
): Unsubscribe {
  return subscribeStream(`${pair.toLowerCase()}@miniTicker`, (payload) => {
    const price = Number((payload as { c?: string }).c)
    const at = Number((payload as { E?: number }).E)
    if (Number.isFinite(price)) onPrice(price, Number.isFinite(at) ? at : Date.now())
  })
}

/**
 * Bougie en cours de formation, poussée à chaque changement.
 *
 * Binance renvoie la bougie COURANTE, réécrite tant que son intervalle n'est pas
 * clos (`x: false`), puis une dernière fois close (`x: true`). L'appelant remplace
 * donc toujours la dernière bougie de sa série par celle-ci, et n'en ajoute une
 * nouvelle que lorsque l'horodatage change. C'est ce qui fait « pousser » le
 * chandelier de droite comme sur une place de trading.
 */
export function subscribeKline(
  pair: string,
  interval: BinanceInterval,
  onCandle: (candle: LiveCandle, closed: boolean) => void,
): Unsubscribe {
  return subscribeStream(`${pair.toLowerCase()}@kline_${interval}`, (payload) => {
    const k = (payload as { k?: Record<string, unknown> }).k
    if (!k) return

    const candle = toCandle([k.t, k.o, k.h, k.l, k.c, k.v])
    if (candle) onCandle(candle, k.x === true)
  })
}

/** Repli progressif de la reprise, en millisecondes. Au-delà, on renonce. */
const RETRY_DELAYS_MS = [1_000, 3_000, 10_000]

/**
 * Connexions vivantes, indexées par flux.
 *
 * ── POURQUOI MUTUALISER ───────────────────────────────────────────────────────
 *
 * Le cours d'un actif est affiché à DEUX endroits d'une même fiche : en grand dans
 * le rail d'identité, et au bout de la courbe. Deux composants distincts, donc deux
 * abonnements — et sans registre, deux sockets ouverts sur le même flux.
 *
 * Le gaspillage n'est pas le vrai problème. Le vrai problème est que deux sockets
 * reçoivent leurs messages à des instants légèrement différents : le titre et la
 * courbe afficheraient alors deux cours qui ne concordent pas, dans le même écran,
 * pour le même actif. Un seul socket rend le désaccord IMPOSSIBLE plutôt
 * qu'improbable.
 */
const sharedStreams = new Map<
  string,
  { listeners: Set<(payload: unknown) => void>; close: () => void }
>()

function subscribeStream(streamName: string, onPayload: (payload: unknown) => void): Unsubscribe {
  const existing = sharedStreams.get(streamName)
  if (existing) {
    existing.listeners.add(onPayload)
    return () => releaseListener(streamName, onPayload)
  }

  const listeners = new Set<(payload: unknown) => void>([onPayload])
  const close = openStream(streamName, (payload) => {
    // Copie avant parcours : un auditeur qui se désabonne en traitant son message
    // modifierait l'ensemble pendant son itération.
    for (const listener of [...listeners]) listener(payload)
  })

  sharedStreams.set(streamName, { listeners, close })
  return () => releaseListener(streamName, onPayload)
}

/**
 * Retrait d'un auditeur, et fermeture du socket quand il était le dernier.
 *
 * La connexion ne survit pas à son dernier auditeur : un socket orphelin continuerait
 * de recevoir un message par seconde pour personne, jusqu'à la fermeture de l'onglet.
 */
function releaseListener(streamName: string, listener: (payload: unknown) => void): void {
  const entry = sharedStreams.get(streamName)
  if (!entry) return

  entry.listeners.delete(listener)
  if (entry.listeners.size > 0) return

  sharedStreams.delete(streamName)
  entry.close()
}

function openStream(streamName: string, onPayload: (payload: unknown) => void): Unsubscribe {
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let closed = false

  /*
   * `receivedSomething` distingue deux échecs que le navigateur confond.
   *
   * Une connexion qui n'a JAMAIS rien reçu avant de tomber désigne une paire
   * inexistante ou un réseau qui bloque le WebSocket : réessayer indéfiniment ne
   * mènera nulle part. Une connexion qui a servi puis s'est interrompue désigne une
   * coupure ordinaire — c'est le cas où la reprise a du sens, et où l'on remet le
   * compteur à zéro.
   */
  let receivedSomething = false

  function connect(): void {
    if (closed) return

    try {
      socket = new WebSocket(`${BINANCE_STREAM_HOST}/${streamName}`)
    } catch {
      // Certains navigateurs lèvent à la construction quand le schéma est interdit
      // par la politique de sécurité de la page. Inutile d'insister.
      return
    }

    socket.onmessage = (event) => {
      receivedSomething = true
      attempt = 0
      try {
        onPayload(JSON.parse(event.data as string))
      } catch {
        // Message illisible : on ignore CE message, pas le flux. Un incident de
        // sérialisation ne dit rien sur les suivants.
      }
    }

    socket.onclose = () => {
      if (closed) return

      const delay = RETRY_DELAYS_MS[attempt]
      // Jamais rien reçu ET plus de palier disponible : la paire n'existe
      // probablement pas. On s'arrête définitivement plutôt que de marteler.
      if (delay === undefined && !receivedSomething) return

      attempt = Math.min(attempt + 1, RETRY_DELAYS_MS.length - 1)
      retryTimer = setTimeout(connect, delay ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1])
    }

    // `onerror` précède toujours `onclose` : tout est traité là-bas, en un seul
    // endroit, plutôt que dans deux gestionnaires qui se doubleraient.
    socket.onerror = () => undefined
  }

  connect()

  return () => {
    closed = true
    if (retryTimer) clearTimeout(retryTimer)
    // `close()` sur un socket encore en cours d'ouverture lève dans certains
    // navigateurs ; l'état est donc vérifié plutôt que supposé.
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close()
  }
}
