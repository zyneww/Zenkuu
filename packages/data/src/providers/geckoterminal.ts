import { CACHE_TTL_SECONDS } from '../cache'
import { createHttpClient } from '../http'
import { ProviderError } from '../types'
import type { DexPool } from '../types'

/**
 * GeckoTerminal — la couche ON-CHAIN.
 *
 * ── POURQUOI UNE SOURCE DE PLUS ───────────────────────────────────────────────
 *
 * Les cinq fournisseurs déjà en place décrivent des MARCHÉS CENTRALISÉS : CoinGecko
 * agrège les places de cotation, Binance cote ses propres paires, Yahoo et
 * Frankfurter n'ont rien à voir avec la chaîne. Aucun ne sait ce qu'est un pool de
 * liquidité, ni sur quelle chaîne un jeton s'échange réellement.
 *
 * GeckoTerminal est édité par CoinGecko, ce qui n'est pas un détail : les
 * identifiants de jeton se recoupent, et les deux sources ne se contrediront pas sur
 * un prix. Prendre un agrégateur tiers aurait introduit une seconde vérité.
 *
 * ── CE QUE CETTE API COÛTE, ET CE QU'ELLE IMPOSE ─────────────────────────────
 *
 * Gratuite, SANS CLÉ, plafonnée à trente appels par minute. C'est peu, et cela dicte
 * toute la mise en cache en amont : une fiche de pool consultée par dix visiteurs ne
 * doit produire qu'un appel. Voir les enveloppes de `queries.ts`.
 *
 * L'en-tête `Accept` est OBLIGATOIRE et versionné. Sans lui, l'API sert sa version la
 * plus récente, qui peut changer de forme sans préavis — c'est explicitement
 * documenté chez eux. On épingle donc la version, et une évolution de leur côté
 * devient un choix de notre côté plutôt qu'une panne un matin.
 */
const http = createHttpClient({
  providerId: 'geckoterminal',
  baseUrl: 'https://api.geckoterminal.com/api/v2',

  /*
   * 30 appels par minute est le plafond DOCUMENTÉ. On s'arrête à 24 et l'on impose
   * 400 ms entre deux départs : un plafond servi jusqu'à la dernière unité finit
   * toujours par être dépassé — l'horloge du fournisseur n'est pas la nôtre, et une
   * fenêtre glissante côté serveur ne coïncide jamais avec une fenêtre fixe côté
   * client. La marge de 20 % coûte quelques centaines de millisecondes sur une page
   * qui n'appelle jamais plus de deux fois.
   */
  maxRequestsPerWindow: 24,
  windowMs: 60_000,
  minIntervalMs: 400,

  revalidateSeconds: CACHE_TTL_SECONDS,

  /*
   * L'en-tête `Accept` est OBLIGATOIRE et VERSIONNÉ. Sans lui, l'API sert sa version
   * la plus récente, qui peut changer de forme sans préavis — c'est explicitement
   * documenté chez eux. On épingle donc la version : une évolution de leur côté
   * devient un choix du nôtre plutôt qu'une panne un matin.
   */
  headers: { Accept: 'application/json;version=20230302' },
})

/**
 * Traduction des identifiants de chaîne, CoinGecko → GeckoTerminal.
 *
 * Les deux services sont édités par la même maison et ne nomment pourtant PAS les
 * chaînes de la même façon : `AssetDetail.contracts` porte les clés de CoinGecko
 * (`ethereum`, `binance-smart-chain`), quand les routes de GeckoTerminal attendent
 * les siennes (`eth`, `bsc`). Sans cette table, une adresse de contrat parfaitement
 * valide donnerait un 404 — et le défaut se lirait comme « ce jeton n'a pas de
 * pool », ce qui est faux.
 *
 * La liste couvre les chaînes qui portent l'essentiel de la liquidité. Une chaîne
 * absente n'est pas une erreur : la fiche affiche simplement les pools des chaînes
 * qu'on sait interroger, et le dit.
 */
const NETWORK_BY_PLATFORM: Record<string, string> = {
  ethereum: 'eth',
  solana: 'solana',
  base: 'base',
  'binance-smart-chain': 'bsc',
  'polygon-pos': 'polygon_pos',
  'arbitrum-one': 'arbitrum',
  'optimistic-ethereum': 'optimism',
  avalanche: 'avax',
  tron: 'tron',
  fantom: 'ftm',
  cronos: 'cro',
  celo: 'celo',
  linea: 'linea',
  scroll: 'scroll',
  blast: 'blast',
  mantle: 'mantle',
  'sui': 'sui-network',
  aptos: 'aptos',
  'the-open-network': 'ton',
  'near-protocol': 'near',
  'hyperevm': 'hyperevm',
  'sei-v2': 'sei-evm',
  zksync: 'zksync',
}

/** Identifiant GeckoTerminal d'une chaîne, depuis celui de CoinGecko. */
export function networkFromPlatform(platform: string): string | undefined {
  return NETWORK_BY_PLATFORM[platform]
}

/** Toutes les chaînes traduisibles, dans l'ordre de la table. */
export function knownNetworks(): { platform: string; network: string }[] {
  return Object.entries(NETWORK_BY_PLATFORM).map(([platform, network]) => ({ platform, network }))
}

/* ── Forme brute des réponses ────────────────────────────────────────────────
 *
 * Décrite en `unknown` plutôt qu'en types complets : on ne lit qu'une douzaine de
 * champs sur les cinquante publiés, et déclarer les autres reviendrait à s'engager
 * sur une forme qu'on ne vérifie jamais.
 */
interface RawPool {
  id?: string
  attributes?: {
    address?: string
    name?: string
    pool_name?: string
    pool_fee_percentage?: string | null
    pool_created_at?: string
    base_token_price_usd?: string | null
    quote_token_price_usd?: string | null
    fdv_usd?: string | null
    market_cap_usd?: string | null
    reserve_in_usd?: string | null
    price_change_percentage?: Record<string, string | null>
    volume_usd?: Record<string, string | null>
    transactions?: Record<string, { buys?: number; sells?: number; buyers?: number; sellers?: number }>
  }
  relationships?: {
    dex?: { data?: { id?: string } }
    base_token?: { data?: { id?: string } }
    quote_token?: { data?: { id?: string } }
  }
}

/**
 * `Number()` sur une chaîne éventuellement nulle.
 *
 * L'API publie TOUS ses nombres en chaînes — `"75.9919617135384"` — parce que les
 * valeurs on-chain dépassent régulièrement la précision d'un flottant. On convertit
 * quand même, en assumant la perte : ces chiffres servent à afficher un prix et une
 * variation, pas à régler une transaction. Ce qui compte est de ne JAMAIS produire
 * `NaN` : une carte de pool où un chiffre manque doit masquer la ligne, pas écrire
 * « NaN ».
 */
function num(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Extrait l'adresse d'un identifiant `réseau_adresse`. */
function addressOf(id: string | undefined): string | undefined {
  if (!id) return undefined
  const separator = id.indexOf('_')
  return separator === -1 ? id : id.slice(separator + 1)
}

function toPool(raw: RawPool, network: string): DexPool | null {
  const attributes = raw.attributes
  const address = attributes?.address
  if (!address) return null

  const changes = attributes.price_change_percentage ?? {}
  const volumes = attributes.volume_usd ?? {}
  const trades = attributes.transactions?.['h24']

  const pool: DexPool = {
    id: raw.id ?? `${network}_${address}`,
    network,
    address,
    name: attributes.pool_name ?? attributes.name ?? address,
    /* `dex` est un identifiant en minuscules à tirets — `aerodrome-slipstream-3`.
       On le garde tel quel : le mettre en forme ici reviendrait à décider à la place
       de l'affichage, et le suffixe numérique distingue des versions réellement
       différentes du même protocole. */
    ...(raw.relationships?.dex?.data?.id ? { dex: raw.relationships.dex.data.id } : {}),
  }

  const priceUsd = num(attributes.base_token_price_usd)
  if (priceUsd !== undefined) pool.priceUsd = priceUsd

  const reserve = num(attributes.reserve_in_usd)
  if (reserve !== undefined) pool.liquidityUsd = reserve

  const volume24h = num(volumes['h24'])
  if (volume24h !== undefined) pool.volume24hUsd = volume24h

  const fdv = num(attributes.fdv_usd)
  if (fdv !== undefined) pool.fdvUsd = fdv

  const marketCap = num(attributes.market_cap_usd)
  if (marketCap !== undefined) pool.marketCapUsd = marketCap

  const fee = num(attributes.pool_fee_percentage)
  if (fee !== undefined) pool.feePercent = fee

  if (attributes.pool_created_at) pool.createdAt = attributes.pool_created_at

  const change: Record<string, number> = {}
  for (const window of ['m5', 'm15', 'm30', 'h1', 'h6', 'h24'] as const) {
    const value = num(changes[window])
    if (value !== undefined) change[window] = value
  }
  if (Object.keys(change).length > 0) pool.priceChange = change

  if (trades) {
    pool.trades24h = {
      buys: trades.buys ?? 0,
      sells: trades.sells ?? 0,
      buyers: trades.buyers ?? 0,
      sellers: trades.sellers ?? 0,
    }
  }

  const base = addressOf(raw.relationships?.base_token?.data?.id)
  if (base) pool.baseTokenAddress = base
  const quote = addressOf(raw.relationships?.quote_token?.data?.id)
  if (quote) pool.quoteTokenAddress = quote

  return pool
}

/**
 * Pools d'un jeton sur une chaîne donnée, du plus liquide au moins liquide.
 *
 * L'API en renvoie jusqu'à vingt par page et les trie déjà par réserve. On ne
 * repagine pas : au-delà des vingt premiers, un pool porte quelques milliers de
 * dollars et n'apprend plus rien sur l'endroit où le jeton se négocie vraiment.
 */
export async function fetchTokenPools(network: string, tokenAddress: string): Promise<DexPool[]> {
  const payload = await http.getJson<{ data?: RawPool[] }>(
    `/networks/${encodeURIComponent(network)}/tokens/${encodeURIComponent(tokenAddress)}/pools`,
  )

  const pools = (payload?.data ?? [])
    .map((raw) => toPool(raw, network))
    .filter((pool): pool is DexPool => pool !== null)

  return pools
}

/** Un pool précis, par chaîne et adresse. */
export async function fetchPool(network: string, address: string): Promise<DexPool> {
  const payload = await http.getJson<{ data?: RawPool }>(
    `/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(address)}`,
  )

  const pool = payload?.data ? toPool(payload.data, network) : null
  if (!pool) {
    throw new ProviderError('geckoterminal', `Pool ${address} introuvable sur ${network}`, {
      retryable: false,
    })
  }
  return pool
}

/**
 * Pools en vue, toutes chaînes confondues.
 *
 * Sert le bandeau « ce qui bouge on-chain » du classement avancé. Sans paramètre de
 * chaîne, l'API mêle les réseaux — ce qui est l'intérêt : un jeton qui décolle sur
 * une chaîne secondaire n'apparaîtrait dans aucun classement centralisé.
 */
export async function fetchTrendingPools(network?: string): Promise<DexPool[]> {
  const path = network
    ? `/networks/${encodeURIComponent(network)}/trending_pools`
    : '/networks/trending_pools'

  const payload = await http.getJson<{ data?: RawPool[] }>(path)

  return (payload?.data ?? []).map((raw) => fromTrending(raw, network)).filter(isPool)
}

/**
 * Résout la chaîne d'un pool venu d'une réponse MULTI-RÉSEAUX.
 *
 * Sans paramètre de chaîne, l'API mêle les réseaux et chaque entrée porte la sienne
 * dans son identifiant — `base_0x1131…`. C'est la seule façon de la connaître ici.
 */
function fromTrending(raw: RawPool, network?: string): DexPool | null {
  const id = raw.id ?? ''
  const separator = id.indexOf('_')
  const own = network ?? (separator === -1 ? '' : id.slice(0, separator))
  return own ? toPool(raw, own) : null
}

function isPool(pool: DexPool | null): pool is DexPool {
  return pool !== null
}

/** Pages demandées pour le screener. Vingt pools par page — voir `fetchPoolUniverse`. */
const POOL_PAGES = 5

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNIVERS DE POOLS POUR LE SCREENER — plusieurs pages, toutes chaînes
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `fetchTrendingPools` sert un BANDEAU : vingt lignes, une page, « ce qui bouge
 * on-chain ». C'est la bonne taille pour un aperçu et beaucoup trop peu pour un
 * screener, dont l'intérêt tient à la population qu'il balaie.
 *
 * ── POURQUOI CINQ PAGES ET NON DIX ───────────────────────────────────────────
 *
 * L'API pagine jusqu'à dix pages et les trie par intérêt décroissant. Au-delà de la
 * cinquième, un pool porte quelques dizaines de milliers de dollars de réserve : à
 * cette profondeur, une seule transaction déplace le cours de plusieurs points, et un
 * filtre non borné remonterait d'abord ce bruit — le même raisonnement qui borne
 * l'univers crypto à 250 lignes.
 *
 * ── UNE PAGE EN ÉCHEC N'EMPORTE PAS LES AUTRES ───────────────────────────────
 *
 * `Promise.allSettled` : ces cinq requêtes partent ensemble sur une API publique sans
 * clé, et un seul refus ferait sinon tomber tout l'onglet. Quatre-vingts pools au lieu
 * de cent restent utilisables ; une page vide ne l'est pas.
 *
 * Le dédoublonnage porte sur l'identifiant complet `réseau_adresse` : le même pool peut
 * apparaître sur deux pages si le classement bouge entre deux requêtes.
 */
export async function fetchPoolUniverse(): Promise<DexPool[]> {
  const settled = await Promise.allSettled(
    Array.from({ length: POOL_PAGES }, (_, index) =>
      http.getJson<{ data?: RawPool[] }>(`/networks/trending_pools?page=${index + 1}`),
    ),
  )

  const seen = new Map<string, DexPool>()
  for (const entry of settled) {
    if (entry.status !== 'fulfilled') continue
    for (const raw of entry.value?.data ?? []) {
      const pool = fromTrending(raw)
      if (pool && !seen.has(pool.id)) seen.set(pool.id, pool)
    }
  }

  if (seen.size === 0) {
    throw new ProviderError('geckoterminal', 'Aucun pool n’a pu être lu', { retryable: true })
  }

  return [...seen.values()]
}
