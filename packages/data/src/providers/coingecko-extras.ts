import { createHttpClient } from '../http'
import { ProviderError } from '../types'
import type { NftCollection, TreasuryHolder, TreasuryReport } from '../types'

/**
 * CoinGecko — deux endpoints GRATUITS que l'adaptateur principal n'utilise pas.
 *
 * ── POURQUOI UN SECOND CLIENT VERS LE MÊME HÔTE ──────────────────────────────
 *
 * `providers/coingecko.ts` implémente le contrat `MarketDataProvider` : lister,
 * détailler, historiser des ACTIFS. Les trésoreries d'entreprise et les collections
 * NFT n'entrent dans aucune de ces trois formes — une entreprise qui détient du
 * bitcoin n'est pas un actif coté, une collection NFT n'a ni cours ni offre au sens
 * du registre.
 *
 * Les y greffer obligerait à élargir un contrat que six autres fournisseurs
 * implémentent, pour deux appels qu'aucun d'eux ne saura jamais servir. Ce fichier
 * reste donc à côté, et n'expose que des fonctions nues.
 *
 * ⚠️ LE LIMITEUR EST DISTINCT DE CELUI DE L'ADAPTATEUR PRINCIPAL, ce qui veut dire que
 * les deux additionnent leurs requêtes vers un quota que CoinGecko compte, lui,
 * globalement. Ni l'un ni l'autre ne connaît la consommation de son voisin.
 *
 * La parade n'est PAS de brider ce client-ci — la première version l'a essayé et n'a
 * fait que rendre ses pages inutilisables (voir la mesure sous `maxRequestsPerWindow`).
 * Elle tient à deux choses : un TTL d'une heure, contre trois minutes pour les
 * cotations, et des listes courtes. Les deux réduisent le NOMBRE d'appels ; brider le
 * rythme n'en réduisait que la vitesse.
 */
const http = createHttpClient({
  providerId: 'coingecko-extras',
  baseUrl: 'https://api.coingecko.com/api/v3',

  /*
   * MÊME RYTHME QUE L'ADAPTATEUR PRINCIPAL, après mesure.
   *
   * Une première version s'était bordée à cinq par minute avec une seconde entre deux
   * départs, par prudence : les deux clients frappent le même hôte, et CoinGecko
   * compte par adresse IP. Mesuré dans le navigateur, c'était le GOULOT et non la
   * source — la vue des trésoreries mettait soixante secondes pour deux appels, celle
   * des collections dépassait deux minutes.
   *
   * Une prudence qui rend une page inutilisable ne protège rien : elle déplace le
   * coût du quota vers le lecteur. On s'aligne donc sur `providers/coingecko.ts`, dont
   * les 8/min et 400 ms tiennent depuis le début sur le même quota partagé.
   */
  maxRequestsPerWindow: 8,
  windowMs: 60_000,
  minIntervalMs: 400,

  /* Une heure. Une trésorerie d'entreprise bouge quand une société publie un achat —
     quelques fois par mois. Un prix plancher NFT bouge davantage, mais pas au point de
     justifier de dépenser un quota partagé toutes les trois minutes. */
  revalidateSeconds: 3_600,
})

/* ── TRÉSORERIES D'ENTREPRISE ────────────────────────────────────────────────── */

interface RawTreasury {
  total_holdings?: number
  total_value_usd?: number
  market_cap_dominance?: number
  companies?: {
    name?: string
    symbol?: string
    country?: string
    total_holdings?: number
    total_entry_value_usd?: number
    total_current_value_usd?: number
    percentage_of_total_supply?: number
  }[]
}

/**
 * Les deux actifs dont la page « Graphiques » publie le registre.
 *
 * ⚠️ CE N'EST PLUS LA LISTE DES ACTIFS COUVERTS, ET LE TYPE LE DISAIT À TORT.
 *
 * `TreasuryCoin` valait `'bitcoin' | 'ethereum'`, au motif que l'endpoint gratuit ne
 * servait que ces deux-là. Vérifié à la source le 24 août 2026 :
 * `/companies/public_treasury/hyperliquid` répond 200 avec dix-neuf millions de jetons
 * répartis sur quatre sociétés. La borne était donc une supposition, et elle privait
 * toutes les autres fiches d'une donnée réellement publiée.
 *
 * Cette liste reste — c'est la sélection ÉDITORIALE de `/graphiques`, qui compare deux
 * registres côte à côte — mais elle ne contraint plus le type : un identifiant sans
 * registre lève, et l'appelant affiche alors sa section vide, comme pour tout autre
 * champ absent.
 */
export const TREASURY_COINS = ['bitcoin', 'ethereum'] as const
export type TreasuryCoin = string

/**
 * Sociétés cotées détenant l'actif à leur bilan.
 *
 * ── CE QUE CE CHIFFRE EST, ET N'EST PAS ──────────────────────────────────────
 *
 * C'est un registre DÉCLARATIF : il recense ce que des sociétés cotées ont annoncé
 * détenir, à la date de leur annonce. Ce n'est ni une mesure on-chain, ni un état
 * vérifié — une société qui a vendu sans le publier y figure encore.
 *
 * La valeur d'entrée est ce qu'elle a payé, la valeur courante ce que cela vaut au
 * cours du jour. Leur écart est une plus ou moins-value LATENTE, et le mot compte :
 * rien n'a été réalisé.
 */
export async function fetchTreasuries(coin: TreasuryCoin): Promise<TreasuryReport> {
  const raw = await http.getJson<RawTreasury>(`/companies/public_treasury/${coin}`)

  const holders: TreasuryHolder[] = (raw.companies ?? [])
    .filter((company) => company.name && (company.total_holdings ?? 0) > 0)
    .map((company) => {
      const holder: TreasuryHolder = {
        name: company.name as string,
        holdings: company.total_holdings as number,
      }

      if (company.symbol) holder.ticker = company.symbol
      if (company.country) holder.country = company.country
      if ((company.total_current_value_usd ?? 0) > 0) {
        holder.currentValueUsd = company.total_current_value_usd as number
      }
      /*
       * La valeur d'entrée vaut ZÉRO pour plusieurs sociétés — ce n'est pas un prix
       * d'achat nul, c'est une donnée non publiée. La laisser passer afficherait une
       * plus-value de 100 %, c'est-à-dire un chiffre inventé (§5).
       */
      if ((company.total_entry_value_usd ?? 0) > 0) {
        holder.entryValueUsd = company.total_entry_value_usd as number
      }
      if ((company.percentage_of_total_supply ?? 0) > 0) {
        holder.percentOfSupply = company.percentage_of_total_supply as number
      }

      return holder
    })

  if (holders.length === 0) {
    throw new ProviderError('coingecko-extras', `Aucun détenteur publié pour ${coin}`, {
      retryable: true,
    })
  }

  const report: TreasuryReport = {
    coin,
    totalHoldings: raw.total_holdings ?? 0,
    holders,
  }

  if ((raw.total_value_usd ?? 0) > 0) report.totalValueUsd = raw.total_value_usd as number
  if ((raw.market_cap_dominance ?? 0) > 0) {
    report.percentOfMarketCap = raw.market_cap_dominance as number
  }

  return report
}

/* ── COLLECTIONS NFT ─────────────────────────────────────────────────────────── */

interface RawNft {
  id?: string
  name?: string
  symbol?: string
  image?: { small?: string }
  native_currency_symbol?: string
  market_cap_rank?: number
  total_supply?: number
  floor_price?: { usd?: number; native_currency?: number }
  market_cap?: { usd?: number }
  volume_24h?: { usd?: number }
  floor_price_in_usd_24h_percentage_change?: number
  /* `links` porte aussi `twitter` et `discord`, non repris : une carte de marché n'a
     pas à renvoyer vers les réseaux sociaux d'une collection. */
  links?: { homepage?: string }
}

/**
 * Collections suivies — une SÉLECTION, et le mot est important.
 *
 * ── POURQUOI PAS UN CLASSEMENT ───────────────────────────────────────────────
 *
 * L'endpoint qui classe les collections par volume (`/nfts/markets`) est réservé à
 * l'offre payante : il répond `error_code 10005` sans abonnement, vérifié. La fiche
 * d'UNE collection, elle, est gratuite.
 *
 * On ne peut donc pas publier un classement — il faudrait interroger des milliers de
 * collections une par une. On publie ce qu'on peut tenir : une liste arrêtée de
 * collections notoires, chacune lue à sa source, et l'affichage DIT que c'est une
 * sélection. Un classement partiel présenté comme un classement serait faux ; une
 * sélection annoncée comme telle ne l'est pas.
 *
 * ⚠️ UNE COLLECTION PAR APPEL, ET C'EST CE QUI BORNE LA LISTE.
 *
 * Elle en comptait dix. Mesuré : plus de deux minutes sur un cache froid, parce que
 * dix appels séquencés par un limiteur coûtent dix fois le temps d'un seul. Six est le
 * nombre qui tient en une poignée de secondes tout en couvrant les collections que
 * quelqu'un s'attend réellement à trouver.
 *
 * Allonger la liste coûte donc du TEMPS DE PAGE, pas seulement du quota — c'est la
 * contrainte à garder en tête avant d'y ajouter une ligne.
 */
export const TRACKED_NFT_COLLECTIONS = [
  'cryptopunks',
  'bored-ape-yacht-club',
  'pudgy-penguins',
  'azuki',
  'mutant-ape-yacht-club',
  'doodles-official',
] as const

export async function fetchNftCollection(id: string): Promise<NftCollection> {
  const raw = await http.getJson<RawNft>(`/nfts/${encodeURIComponent(id)}`)

  if (!raw.id || !raw.name) {
    throw new ProviderError('coingecko-extras', `Collection ${id} introuvable`, {
      retryable: false,
    })
  }

  const collection: NftCollection = {
    id: raw.id,
    name: raw.name,
  }

  if (raw.symbol) collection.symbol = raw.symbol
  if (raw.image?.small) collection.image = raw.image.small
  if (raw.native_currency_symbol) collection.nativeSymbol = raw.native_currency_symbol.toUpperCase()
  if ((raw.market_cap_rank ?? 0) > 0) collection.rank = raw.market_cap_rank as number
  if ((raw.total_supply ?? 0) > 0) collection.totalSupply = raw.total_supply as number
  if ((raw.floor_price?.usd ?? 0) > 0) collection.floorPriceUsd = raw.floor_price?.usd as number
  if ((raw.floor_price?.native_currency ?? 0) > 0) {
    collection.floorPriceNative = raw.floor_price?.native_currency as number
  }
  if ((raw.market_cap?.usd ?? 0) > 0) collection.marketCapUsd = raw.market_cap?.usd as number

  /*
   * Le volume peut légitimement valoir ZÉRO — une collection sans vente sur 24 h — et
   * c'est une information. Contrairement aux autres champs, on teste donc l'existence
   * du nombre plutôt que sa positivité.
   */
  if (typeof raw.volume_24h?.usd === 'number') collection.volume24hUsd = raw.volume_24h.usd

  if (typeof raw.floor_price_in_usd_24h_percentage_change === 'number') {
    collection.floorChange24h = raw.floor_price_in_usd_24h_percentage_change
  }

  /*
   * SITE OFFICIEL — la seule destination vérifiable pour une tuile de la carte.
   *
   * `startsWith('http')` et non une simple présence : la source rend parfois une chaîne
   * vide, et parfois un domaine nu sans protocole — que le navigateur interpréterait
   * comme un chemin RELATIF, menant à une page de ZENKUU qui n'existe pas. Voir la note
   * du champ dans `types.ts` pour le choix de cette destination plutôt qu'une URL
   * construite.
   */
  if (raw.links?.homepage?.startsWith('http')) collection.homepage = raw.links.homepage

  return collection
}

/* ── ACTIONS TOKENISÉES ──────────────────────────────────────────────────────── */

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES JETONS QUI RÉPLIQUENT UNE ACTION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE C'EST ─────────────────────────────────────────────────────────────
 *
 * Des jetons adossés à une action cotée : NVIDIA existe en NVDAX chez Backed, NVDAON
 * chez Ondo, NVDAB chez bStocks, NVDA chez Robinhood Europe. Chacun a son cours, sa
 * capitalisation et ses places d'échange propres, et TOUS suivent la même action —
 * l'écart entre leur cours et celui de l'action est ce qui rend la table lisible.
 *
 * ── UN SEUL APPEL POUR TOUT LE SITE, ET C'EST LA CONDITION ───────────────────
 *
 * La catégorie `tokenized-stock` de CoinGecko rend jusqu'à 250 jetons dans UNE réponse.
 * On la charge en entier, on la met en cache une heure, et chaque fiche d'action y
 * cherche les siens. L'alternative — une recherche par action — coûterait un appel par
 * fiche sur un quota mesuré à huit par minute.
 *
 * ⚠️ LA RÉPONSE NE PORTE PAS LA CHAÎNE DU JETON. `/coins/markets` ne publie pas
 * `platforms` ; l'obtenir demanderait `/coins/{id}` par jeton, soit six appels pour une
 * seule fiche. La colonne « chaîne » est donc absente de la table, et c'est un manque
 * assumé plutôt qu'une chaîne devinée d'après le nom de l'émetteur (§5).
 */
export interface TokenizedStock {
  /** Identifiant CoinGecko du JETON, pas de l'action. */
  id: string
  symbol: string
  name: string
  image?: string
  /** Émetteur, lu dans le nom que la source publie — voir `ISSUERS`. */
  issuer?: string
  priceUsd?: number
  marketCapUsd?: number
  volume24hUsd?: number
}

/**
 * Émetteurs reconnus au NOM du jeton, tel que la source l'écrit.
 *
 * ⚠️ CE N'EST PAS UNE DÉDUCTION, C'EST UNE LECTURE. CoinGecko nomme ses jetons
 * « NVIDIA (Ondo Tokenized Stock) », « NVIDIA xStock », « NVIDIA • Robinhood Token » :
 * l'émetteur est écrit dans le libellé, ce motif ne fait que l'en extraire. Un nom qui
 * ne correspond à aucune entrée laisse le champ vide plutôt que de proposer un
 * émetteur plausible.
 *
 * L'ORDRE COMPTE : « Wrapped … xStock » doit tomber sur la même entrée que « … xStock »,
 * et les motifs les plus spécifiques passent donc d'abord.
 */
const ISSUERS: [RegExp, string][] = [
  [/\bOndo\b/i, 'Ondo Finance'],
  [/\bbStocks?\b/i, 'bStocks'],
  [/\bRobinhood\b/i, 'Robinhood'],
  [/\bDinari\b/i, 'Dinari'],
  [/\bRemora\b/i, 'Remora Markets'],
  [/\bBackpack\b/i, 'Backpack'],
  [/\bxStock\b/i, 'Backed Finance'],
]

function issuerOf(name: string): string | undefined {
  return ISSUERS.find(([pattern]) => pattern.test(name))?.[1]
}

/** Réponse brute de `/coins/markets`, réduite aux champs que cette table affiche. */
interface RawTokenizedStock {
  id?: string
  symbol?: string
  name?: string
  image?: string | null
  current_price?: number | null
  market_cap?: number | null
  total_volume?: number | null
}

/** Le catalogue entier des actions tokenisées, en dollars. Un appel, une heure de cache. */
export async function fetchTokenizedStocks(): Promise<TokenizedStock[]> {
  const rows = await http.getJson<RawTokenizedStock[]>('/coins/markets', {
    vs_currency: 'usd',
    category: 'tokenized-stock',
    order: 'market_cap_desc',
    per_page: '250',
    page: '1',
  })

  if (!Array.isArray(rows)) {
    throw new ProviderError('coingecko-extras', 'Format des actions tokenisées inattendu')
  }

  return rows.flatMap((row) => {
    if (!row.id || !row.symbol || !row.name) return []

    const token: TokenizedStock = { id: row.id, symbol: row.symbol, name: row.name }
    if (row.image) token.image = row.image
    const issuer = issuerOf(row.name)
    if (issuer) token.issuer = issuer
    if ((row.current_price ?? 0) > 0) token.priceUsd = row.current_price as number
    if ((row.market_cap ?? 0) > 0) token.marketCapUsd = row.market_cap as number
    if (typeof row.total_volume === 'number') token.volume24hUsd = row.total_volume

    return [token]
  })
}

/**
 * Les jetons qui répliquent UNE action donnée.
 *
 * ── LE RAPPROCHEMENT SE FAIT SUR DEUX SIGNAUX, ET IL EN FAUT DEUX ────────────
 *
 * Le SYMBOLE d'abord : les jetons suffixent celui de l'action d'une ou deux lettres
 * propres à leur émetteur — `NVDA` donne `NVDAX`, `NVDAON`, `NVDAB`, `NVDAC`, et
 * `WNVDAX` pour la version enveloppée. Le préfixe `W` est retiré avant comparaison.
 *
 * Le NOM ensuite : les trois premières lettres du nom de l'action doivent ouvrir celui
 * du jeton. Ce second signal n'est pas une ceinture de sécurité décorative — sur le seul
 * symbole, une action à trois lettres attraperait des jetons sans rapport dès qu'un
 * émetteur choisit deux lettres de suffixe.
 *
 * ⚠️ AUCUN RAPPROCHEMENT N'EST PARFAIT ICI : la source ne publie pas le lien entre un
 * jeton et son sous-jacent. C'est une HEURISTIQUE, et sa marge est bornée par les deux
 * conditions ci-dessus ; le jour où CoinGecko exposera le lien, ce sont ces vingt lignes
 * qui disparaîtront.
 */
export function tokensForStock(
  tokens: readonly TokenizedStock[],
  symbol: string,
  name: string,
): TokenizedStock[] {
  const ticker = symbol.trim().toUpperCase()
  const needle = name.trim().toLowerCase().slice(0, 3)
  if (ticker.length < 2 || needle.length < 3) return []

  return tokens
    .filter((token) => {
      const candidate = token.symbol.toUpperCase().replace(/^W(?=[A-Z]{3})/, '')
      if (!candidate.startsWith(ticker)) return false
      if (candidate.length - ticker.length > 2) return false
      return token.name.trim().toLowerCase().startsWith(needle)
    })
    .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))
}
