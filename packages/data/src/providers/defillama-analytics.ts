/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DEFILLAMA — LES QUATRE SÉRIES QUI ALIMENTENT LES PAGES « ANALYTICS »
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CE FICHIER EST SÉPARÉ DE `defillama.ts` ────────────────────────
 *
 * Le voisin ne sert qu'une chose, la capitalisation des stablecoins, et il le dit dès
 * son titre. Ces quatre-ci vivent sur DEUX hôtes différents (`api.llama.fi` et
 * `yields.llama.fi`), rendent des réponses cent fois plus grosses, et exigent pour
 * cette raison un réglage de cache que le voisin n'a pas. Les mêler donnerait un
 * fichier dont l'en-tête ne pourrait plus décrire ce qu'il fait.
 *
 * ── LES RÉPONSES SONT ÉNORMES, ET C'EST LE FAIT DOMINANT ────────────────────
 *
 * Mesuré le 2026-09-05 :
 *
 *     /protocols          8 190 protocoles, description et méthodologie comprises
 *     yields/pools       17 090 pools
 *     /overview/fees      2 658 protocoles + 3 086 points de série
 *     /v2/chains            466 chaînes  ← la seule qui soit petite
 *
 * Next plafonne son cache de DONNÉES à 2 Mo : les trois premières le dépassent, et
 * chaque appel produirait le message « items over 2MB can not be cached » après avoir
 * tamponné la réponse pour rien. C'est exactement ce que `providers/coinpaprika.ts`
 * documente, et le contournement est le même — `bypassNextCache`, à condition qu'un
 * AUTRE cache prenne le relais.
 *
 * Il le prend : chaque fonction ci-dessous RÉDUIT la réponse à quelques centaines de
 * lignes typées avant de rendre la main, et c'est ce résultat-là que le cache
 * applicatif de `queries.ts` mémorise. Garder dix-sept mille pools en mémoire pour en
 * afficher deux cents serait payer le stockage d'une donnée que personne ne lira.
 *
 * ── CE QUE CES CHIFFRES SONT, ET CE QU'ILS NE SONT PAS ──────────────────────
 *
 * ⚠️ LE TVL N'EST PAS UNE CAPITALISATION. Le voisin le dit déjà et il faut le redire
 * ici, parce que ces pages en affichent partout : le TVL compte des capitaux DÉPOSÉS
 * dans un protocole, la capitalisation compte la valeur des jetons émis. Les deux se
 * ressemblent en ordre de grandeur. Les intitulés des pages disent « valeur
 * immobilisée », jamais « capitalisation ».
 *
 * ⚠️ UN APY EST UN TAUX CONSTATÉ, PAS UNE PROMESSE. La source publie `apy` comme une
 * extrapolation annuelle du rendement RÉCENT d'un pool ; il n'engage personne et peut
 * tomber le lendemain. Les pages le présentent tel quel, avec sa moyenne à trente
 * jours à côté — c'est cette seconde colonne qui dit si le taux du jour est
 * représentatif — et sans jamais classer, recommander ni annoncer un gain (§5).
 */

import { createHttpClient } from '../http'
import { ProviderError } from '../types'
import type { DefiChain, DefiProtocol, FeeOverview, YieldPool } from '../types'

const PROVIDER_ID = 'defillama-analytics'

/* Deux clients : DefiLlama sépare ses rendements sur un sous-domaine à lui, et un
   client porte UNE base d'adresses. Les réglages sont identiques — même source, même
   absence de limite annoncée, même raison de contourner le cache de Next. */
const OPTIONS = {
  providerId: PROVIDER_ID,
  maxRequestsPerWindow: 20,
  minIntervalMs: 250,
  /* Une heure. Le TVL et les rendements bougent en continu, mais ces pages donnent une
     PHOTOGRAPHIE de l'état du marché : un rafraîchissement plus rapide re-téléchargerait
     plusieurs mégaoctets pour déplacer des chiffres de quelques dixièmes. */
  revalidateSeconds: 3_600,
  /* Voir l'en-tête : les réponses dépassent le plafond de 2 Mo du cache de Next, qui
     les refuserait après les avoir tamponnées. La réduction ci-dessous prend le relais. */
  bypassNextCache: true,
}

const api = createHttpClient({ ...OPTIONS, baseUrl: 'https://api.llama.fi' })
const yields = createHttpClient({ ...OPTIONS, baseUrl: 'https://yields.llama.fi' })

/** Nombre fini, ou `undefined`. Un champ absent n'est jamais rendu comme zéro (§5). */
function nombre(valeur: unknown): number | undefined {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : undefined
}

function texte(valeur: unknown): string | undefined {
  return typeof valeur === 'string' && valeur.trim() !== '' ? valeur : undefined
}

/* ══════════════════════════════════════════════════════════════════════════════
   LES CHAÎNES
   ══════════════════════════════════════════════════════════════════════════════ */

interface RawChain {
  name?: string
  tvl?: number
  tokenSymbol?: string | null
  gecko_id?: string | null
  chainId?: number | string | null
}

/**
 * Les chaînes classées par valeur immobilisée.
 *
 * `gecko_id` est conservé parce qu'il vaut une JOINTURE : c'est l'identifiant que nos
 * propres fiches d'actif utilisent dans leur adresse. Une chaîne qui en porte un peut
 * donc renvoyer vers son jeton chez nous, ce qui est la seule chose qui rattache cette
 * page au reste du site.
 */
export async function fetchDefiChains(limit: number): Promise<DefiChain[]> {
  const rows = await api.getJson<RawChain[]>('/v2/chains')

  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, 'Liste des chaînes illisible')
  }

  const chains: DefiChain[] = []

  for (const row of rows) {
    const name = texte(row.name)
    const tvl = nombre(row.tvl)

    /* Une chaîne sans nom n'est pas affichable ; une chaîne à zéro n'est pas une
       chaîne « à zéro » mais une chaîne que la source ne mesure pas encore — la
       distinction compte, et dans les deux cas la ligne ne dirait rien. */
    if (!name || tvl === undefined || tvl <= 0) continue

    chains.push({
      name,
      tvl,
      ...(texte(row.tokenSymbol) ? { symbol: texte(row.tokenSymbol) as string } : {}),
      ...(texte(row.gecko_id) ? { geckoId: texte(row.gecko_id) as string } : {}),
    })
  }

  if (chains.length === 0) {
    throw new ProviderError(PROVIDER_ID, 'Aucune chaîne exploitable')
  }

  return chains.sort((a, b) => b.tvl - a.tvl).slice(0, limit)
}

/* ══════════════════════════════════════════════════════════════════════════════
   LES PROTOCOLES
   ══════════════════════════════════════════════════════════════════════════════ */

interface RawProtocol {
  name?: string
  slug?: string
  category?: string | null
  tvl?: number
  change_1d?: number | null
  change_7d?: number | null
  chains?: unknown
  logo?: string | null
  url?: string | null
  gecko_id?: string | null
}

/**
 * Les protocoles, filtrés par catégorie si l'appelant en nomme une.
 *
 * `category` sert la page « Tokenized assets » : DefiLlama range sous `RWA` les
 * protocoles qui portent des actifs du monde réel — bons du Trésor tokenisés, fonds
 * monétaires, crédit privé. Ce sont EXACTEMENT les objets que cette page décrit, et
 * c'est une étiquette de la source, pas une nôtre.
 */
export async function fetchDefiProtocols(
  limit: number,
  category?: string,
): Promise<DefiProtocol[]> {
  const rows = await api.getJson<RawProtocol[]>('/protocols')

  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, 'Liste des protocoles illisible')
  }

  const protocols: DefiProtocol[] = []

  for (const row of rows) {
    const name = texte(row.name)
    const slug = texte(row.slug)
    const tvl = nombre(row.tvl)

    if (!name || !slug || tvl === undefined || tvl <= 0) continue
    if (category !== undefined && row.category !== category) continue

    const chains = Array.isArray(row.chains)
      ? row.chains.filter((chain): chain is string => typeof chain === 'string')
      : []

    protocols.push({
      name,
      slug,
      tvl,
      chains,
      ...(texte(row.category) ? { category: texte(row.category) as string } : {}),
      ...(nombre(row.change_1d) !== undefined ? { change1d: nombre(row.change_1d) as number } : {}),
      ...(nombre(row.change_7d) !== undefined ? { change7d: nombre(row.change_7d) as number } : {}),
      ...(texte(row.logo) ? { logo: texte(row.logo) as string } : {}),
      ...(texte(row.url) ? { url: texte(row.url) as string } : {}),
      ...(texte(row.gecko_id) ? { geckoId: texte(row.gecko_id) as string } : {}),
    })
  }

  if (protocols.length === 0) {
    throw new ProviderError(PROVIDER_ID, 'Aucun protocole exploitable')
  }

  return protocols.sort((a, b) => b.tvl - a.tvl).slice(0, limit)
}

/* ══════════════════════════════════════════════════════════════════════════════
   LES RENDEMENTS
   ══════════════════════════════════════════════════════════════════════════════ */

interface RawPool {
  pool?: string
  chain?: string
  project?: string
  symbol?: string
  tvlUsd?: number
  apy?: number | null
  apyBase?: number | null
  apyReward?: number | null
  apyMean30d?: number | null
  stablecoin?: boolean
  ilRisk?: string
  exposure?: string
}

/**
 * Les pools de rendement au-dessus d'un plancher de taille.
 *
 * ── LE PLANCHER N'EST PAS UN CONFORT D'AFFICHAGE ────────────────────────────
 *
 * Dix-sept mille pools sont publiés, et l'immense majorité pèse quelques milliers de
 * dollars. Un taux annualisé calculé sur un pool de cette taille n'est pas une
 * information : quelques centaines de dollars de récompense y produisent un APY à
 * quatre chiffres qui disparaîtra la semaine suivante. Les afficher en tête d'un
 * classement — ce que ferait n'importe quel tri par taux — remplirait la page de
 * nombres spectaculaires et faux.
 *
 * Le plancher est donc une condition de VÉRACITÉ, pas de mise en page, et l'appelant
 * le passe explicitement pour que la page puisse l'annoncer au lecteur.
 */
export async function fetchYieldPools(limit: number, minTvlUsd: number): Promise<YieldPool[]> {
  const payload = await yields.getJson<{ data?: RawPool[] }>('/pools')
  const rows = payload?.data

  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, 'Liste des pools illisible')
  }

  const pools: YieldPool[] = []

  for (const row of rows) {
    const id = texte(row.pool)
    const chain = texte(row.chain)
    const project = texte(row.project)
    const symbol = texte(row.symbol)
    const tvlUsd = nombre(row.tvlUsd)
    const apy = nombre(row.apy)

    if (!id || !chain || !project || !symbol) continue
    if (tvlUsd === undefined || tvlUsd < minTvlUsd) continue
    if (apy === undefined) continue

    pools.push({
      id,
      chain,
      project,
      symbol,
      tvlUsd,
      apy,
      stablecoin: row.stablecoin === true,
      ...(nombre(row.apyBase) !== undefined ? { apyBase: nombre(row.apyBase) as number } : {}),
      ...(nombre(row.apyReward) !== undefined ? { apyReward: nombre(row.apyReward) as number } : {}),
      ...(nombre(row.apyMean30d) !== undefined
        ? { apyMean30d: nombre(row.apyMean30d) as number }
        : {}),
      ...(texte(row.ilRisk) ? { ilRisk: texte(row.ilRisk) as string } : {}),
      ...(texte(row.exposure) ? { exposure: texte(row.exposure) as string } : {}),
    })
  }

  if (pools.length === 0) {
    throw new ProviderError(PROVIDER_ID, 'Aucun pool au-dessus du plancher')
  }

  return pools.sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, limit)
}

/* ══════════════════════════════════════════════════════════════════════════════
   LES FRAIS
   ══════════════════════════════════════════════════════════════════════════════ */

interface RawFees {
  total24h?: number
  total7d?: number
  total30d?: number
  total1y?: number
  change_1d?: number
  change_7d?: number
  change_1m?: number
  totalDataChart?: unknown
  protocols?: {
    name?: string
    displayName?: string
    category?: string | null
    slug?: string
    logo?: string | null
    total24h?: number | null
    total7d?: number | null
    total30d?: number | null
  }[]
}

/**
 * Les frais payés à l'ensemble des protocoles suivis, en dollars.
 *
 * ── CE QUE « FRAIS » RECOUVRE, ET POURQUOI CE N'EST PAS « REVENU » ──────────
 *
 * La source distingue les deux et nous reprenons sa distinction : les FRAIS sont ce
 * que les utilisateurs paient, le REVENU la part qui reste au protocole une fois les
 * fournisseurs de liquidité payés. Ce point d'entrée-ci ne publie que les premiers.
 * Les nommer « revenus » ferait lire une rentabilité là où il n'y a qu'un volume
 * d'activité.
 *
 * La série est réduite aux deux dernières années : trois mille points quotidiens
 * depuis 2018 pèsent lourd pour un tracé de quelques centaines de pixels de large, où
 * les huit premières années sont écrasées contre l'axe.
 */
export async function fetchFeeOverview(seriesDays: number, topProtocols: number): Promise<FeeOverview> {
  const payload = await api.getJson<RawFees>('/overview/fees')

  const total24h = nombre(payload?.total24h)
  if (total24h === undefined) {
    throw new ProviderError(PROVIDER_ID, 'Agrégat de frais illisible')
  }

  const series: { timestamp: number; value: number }[] = []

  if (Array.isArray(payload.totalDataChart)) {
    for (const entry of payload.totalDataChart) {
      if (!Array.isArray(entry)) continue
      const seconds = nombre(entry[0])
      const value = nombre(entry[1])
      /* Zéro est une valeur LÉGITIME ici — un jour sans frais existe — d'où le test
         sur `undefined` et non sur la valeur elle-même. */
      if (seconds === undefined || value === undefined) continue
      series.push({ timestamp: seconds * 1000, value })
    }
  }

  series.sort((a, b) => a.timestamp - b.timestamp)

  /* Boucle explicite plutôt qu'un `map().filter()` : le filtre devrait porter un
     prédicat de type pour convaincre le compilateur que les quatre champs obligatoires
     sont là, et un prédicat de type est une PROMESSE que rien ne vérifie. La boucle
     construit directement l'objet final, où l'absence d'un champ est une branche du
     code plutôt qu'une assertion. */
  const protocols: FeeOverview['protocols'] = []

  for (const row of payload.protocols ?? []) {
    const name = texte(row.displayName) ?? texte(row.name)
    const slug = texte(row.slug)
    const jour = nombre(row.total24h)

    /* Un protocole à zéro frais sur la journée n'a rien à faire dans un classement
       des plus gros encaissements : il y occuperait une ligne pour dire « rien ». */
    if (!name || !slug || jour === undefined || jour <= 0) continue

    protocols.push({
      name,
      slug,
      total24h: jour,
      ...(nombre(row.total30d) !== undefined ? { total30d: nombre(row.total30d) as number } : {}),
      ...(texte(row.category) ? { category: texte(row.category) as string } : {}),
      ...(texte(row.logo) ? { logo: texte(row.logo) as string } : {}),
    })
  }

  protocols.sort((a, b) => b.total24h - a.total24h)
  protocols.length = Math.min(protocols.length, topProtocols)

  return {
    total24h,
    ...(nombre(payload.total7d) !== undefined ? { total7d: nombre(payload.total7d) as number } : {}),
    ...(nombre(payload.total30d) !== undefined
      ? { total30d: nombre(payload.total30d) as number }
      : {}),
    ...(nombre(payload.total1y) !== undefined ? { total1y: nombre(payload.total1y) as number } : {}),
    ...(nombre(payload.change_1d) !== undefined
      ? { change1d: nombre(payload.change_1d) as number }
      : {}),
    ...(nombre(payload.change_7d) !== undefined
      ? { change7d: nombre(payload.change_7d) as number }
      : {}),
    ...(nombre(payload.change_1m) !== undefined
      ? { change30d: nombre(payload.change_1m) as number }
      : {}),
    series: series.slice(-seriesDays),
    protocols,
  }
}

export const DEFILLAMA_ANALYTICS_SOURCE = {
  label: 'DefiLlama',
  attributionUrl: 'https://defillama.com',
}
