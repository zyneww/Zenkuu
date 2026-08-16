/**
 * Fiche d'identité d'une valeur boursière — frais, positions, secteurs, ratios.
 *
 * ── POURQUOI UN SECOND MODULE YAHOO ───────────────────────────────────────────
 *
 * L'adaptateur principal (`yahoo.ts`) n'interroge que `v8/chart`, qui ne rend que des
 * cours et des volumes. C'est assez pour un classement et un graphique, et cela laisse
 * une fiche d'ETF à peu près vide : ni frais de gestion, ni composition, ni secteurs.
 *
 * `v10/quoteSummary` publie tout cela gratuitement. Il est isolé ICI plutôt qu'ajouté
 * à l'adaptateur parce qu'il n'a NI le même contrat, NI la même fragilité : il exige
 * une poignée de main en deux temps (voir plus bas), il peut se fermer sans que
 * `chart` bouge, et une fiche doit rester lisible s'il tombe. Deux endpoints aux
 * risques distincts derrière deux modules distincts.
 *
 * ⚠️ ENDPOINT NON OFFICIEL, comme `chart`. Il alimente les pages web de Yahoo. Il peut
 * disparaître sans préavis — auquel cas les sections qu'il alimente disparaissent avec
 * lui, sans jamais laisser de valeur inventée derrière elles (§5).
 *
 * ── LA POIGNÉE DE MAIN EN DEUX TEMPS ──────────────────────────────────────────
 *
 * Contrairement à `chart`, cet endpoint refuse tout appel nu : il répond
 * « Invalid Crumb ». Il faut d'abord obtenir un cookie de session, puis échanger ce
 * cookie contre un jeton (le « crumb ») à passer en paramètre de chaque requête.
 *
 * Le jeton EXPIRE, et Yahoo ne dit pas quand. Deux mauvaises réponses à cela : le
 * mémoriser pour toujours — la fiche casse silencieusement quelques heures plus tard —
 * ou le redemander à chaque appel, ce qui double le trafic sortant sur une source déjà
 * plafonnée. On le mémorise donc et on ne le renouvelle QU'APRÈS UN REFUS : l'échec
 * devient le signal d'expiration, ce qui évite d'avoir à deviner une durée de vie que
 * le serveur ne publie pas.
 */

import type { AssetClass } from '../types'
import { ProviderError } from '../types'

const PROVIDER_ID = 'yahoo-finance'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * Cookie et jeton de session, sur `globalThis`.
 *
 * Même motif que le cache de données : sans cette accroche, chaque rechargement à
 * chaud en développement redemanderait la poignée de main, et Yahoo finirait par
 * répondre 429 à force de créations de session.
 */
const globalForSession = globalThis as unknown as {
  __zenkuuYahooSession?: { cookie: string; crumb: string } | null
}

/** Une seule poignée de main en vol à la fois — voir `handshake`. */
let pending: Promise<{ cookie: string; crumb: string }> | null = null

/**
 * Ouvre une session : cookie de consentement, puis jeton.
 *
 * Déduplique les appels concurrents par la même promesse. Sans cela, huit fiches
 * rendues en parallèle sur un cache froid ouvriraient huit sessions — et Yahoo
 * traite une rafale de créations de session comme un abus.
 */
async function handshake(): Promise<{ cookie: string; crumb: string }> {
  if (pending) return pending

  pending = (async () => {
    /*
     * `fc.yahoo.com` répond une erreur HTTP, et c'est ATTENDU : on ne vient pas y
     * chercher un corps mais l'en-tête `set-cookie` qui l'accompagne. D'où l'absence
     * de vérification de `response.ok` — la seule chose qui compte est le cookie.
     */
    const seed = await fetch('https://fc.yahoo.com/', {
      headers: { 'User-Agent': UA },
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
      headers: { 'User-Agent': UA, ...(cookie ? { Cookie: cookie } : {}) },
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
 * Interroge `quoteSummary`, en renouvelant la session une fois si elle a expiré.
 *
 * `retry` borne la récursion à UN seul renouvellement : si le second appel échoue
 * lui aussi, ce n'est plus une expiration mais une fermeture de l'endpoint, et
 * réessayer en boucle ne ferait qu'attirer un blocage.
 */
async function query(symbol: string, modules: string[], retry = true): Promise<RawSummary | null> {
  const session = globalForSession.__zenkuuYahooSession ?? (await handshake())

  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=${modules.join(',')}&crumb=${encodeURIComponent(session.crumb)}`

  const response = await fetch(url, {
    headers: { 'User-Agent': UA, ...(session.cookie ? { Cookie: session.cookie } : {}) },
  })

  if (response.status === 401 || response.status === 403) {
    globalForSession.__zenkuuYahooSession = null
    if (retry) return query(symbol, modules, false)
    throw new ProviderError(PROVIDER_ID, 'Session Yahoo expirée', { retryable: true })
  }

  if (!response.ok) {
    throw new ProviderError(PROVIDER_ID, `Yahoo a répondu ${response.status}`, {
      retryable: response.status >= 500,
    })
  }

  const body = (await response.json()) as {
    quoteSummary?: { result?: RawSummary[] | null; error?: { description?: string } | null }
  }

  // « Invalid Crumb » arrive avec un statut 200 : le refus est dans le CORPS. Sans ce
  // cas, une session expirée se lirait comme « cet actif n'a pas de profil », et la
  // fiche perdrait ses sections sans que rien ne l'explique.
  if (body.quoteSummary?.error) {
    globalForSession.__zenkuuYahooSession = null
    if (retry) return query(symbol, modules, false)
    throw new ProviderError(PROVIDER_ID, 'Profil refusé par Yahoo', { retryable: true })
  }

  return body.quoteSummary?.result?.[0] ?? null
}

/* ── Forme brute, décrite au strict nécessaire ────────────────────────────────
 *
 * Yahoo enveloppe chaque nombre dans `{ raw, fmt }`. On ne lit que `raw` : `fmt` est
 * déjà formaté en anglais américain, avec ses séparateurs et sa devise — inutilisable
 * sur un site francophone multidevise, et surtout impossible à recalculer.
 */
interface RawValue {
  raw?: number
}

interface RawSummary {
  fundProfile?: {
    family?: string
    categoryName?: string
    legalType?: string
    feesExpensesInvestment?: { annualReportExpenseRatio?: RawValue }
  }
  topHoldings?: {
    holdings?: { symbol?: string; holdingName?: string; holdingPercent?: RawValue }[]
    sectorWeightings?: Record<string, RawValue>[]
    stockPosition?: RawValue
    bondPosition?: RawValue
    cashPosition?: RawValue
  }
  summaryDetail?: {
    totalAssets?: RawValue
    yield?: RawValue
    dividendYield?: RawValue
    trailingPE?: RawValue
    marketCap?: RawValue
    beta?: RawValue
  }
  defaultKeyStatistics?: {
    forwardPE?: RawValue
    priceToBook?: RawValue
    trailingEps?: RawValue
    beta?: RawValue
  }
  assetProfile?: {
    sector?: string
    industry?: string
    country?: string
    website?: string
    fullTimeEmployees?: number
    longBusinessSummary?: string
  }
}

/* ── Modèle exposé ───────────────────────────────────────────────────────────── */

/** Une position d'un fonds. */
export interface FundHolding {
  symbol?: string
  name: string
  /** Poids dans le fonds, en pourcentage. */
  weight: number
}

/** Un secteur d'exposition d'un fonds, en pourcentage. */
export interface SectorWeight {
  sector: string
  weight: number
}

/**
 * Profil d'une valeur boursière.
 *
 * TOUS les champs sont optionnels, et ce n'est pas de la prudence de façade : Yahoo
 * publie des modules très inégaux selon le titre. Un ETF obligataire n'a pas de
 * pondérations sectorielles, un ETF de matière première n'a aucune position, une
 * action n'a ni frais ni composition. Un champ absent est rendu absent (§5).
 */
export interface AssetProfile {
  /** Émetteur du fonds — « iShares », « State Street »… */
  family?: string
  /** Catégorie Morningstar telle que publiée. */
  category?: string
  /** Frais de gestion annuels, en pourcentage. */
  expenseRatio?: number
  /** Encours sous gestion, dans la devise de cotation. */
  totalAssets?: number
  /** Rendement distribué sur douze mois, en pourcentage. */
  yieldPercent?: number
  holdings?: FundHolding[]
  sectors?: SectorWeight[]
  /** Répartition par nature d'actif — actions, obligations, liquidités. */
  allocation?: { label: string; weight: number }[]

  // ── Actions ──────────────────────────────────────────────────────────────
  sector?: string
  industry?: string
  country?: string
  employees?: number
  trailingPE?: number
  forwardPE?: number
  priceToBook?: number
  eps?: number
  beta?: number
  marketCap?: number
  summary?: string
}

/** Libellés français des secteurs Morningstar, dont Yahoo publie les clés en camel. */
const SECTOR_LABELS: Record<string, string> = {
  realestate: 'Immobilier',
  consumer_cyclical: 'Consommation cyclique',
  basic_materials: 'Matériaux de base',
  consumer_defensive: 'Consommation de base',
  technology: 'Technologie',
  communication_services: 'Communication',
  financial_services: 'Services financiers',
  utilities: 'Services aux collectivités',
  industrials: 'Industrie',
  energy: 'Énergie',
  healthcare: 'Santé',
}

/** `{ raw }` → nombre, en écartant ce qui n'en est pas un. */
function value(entry: RawValue | undefined): number | undefined {
  return typeof entry?.raw === 'number' && Number.isFinite(entry.raw) ? entry.raw : undefined
}

/** Fraction Yahoo (0,004) → pourcentage (0,4). */
function percent(entry: RawValue | undefined): number | undefined {
  const raw = value(entry)
  return raw === undefined ? undefined : raw * 100
}

/**
 * Modules demandés selon la classe d'actif.
 *
 * Demander tout à tout le monde ferait grossir la réponse sans rien apporter : une
 * action n'a jamais de `topHoldings`, un ETF n'a pas de `defaultKeyStatistics` utile.
 * La liste est donc adaptée — c'est la même règle que celle qui régit l'affichage,
 * appliquée un cran plus tôt.
 */
function modulesFor(assetClass: AssetClass): string[] {
  if (assetClass === 'etf') return ['fundProfile', 'topHoldings', 'summaryDetail']
  if (assetClass === 'stock') return ['assetProfile', 'summaryDetail', 'defaultKeyStatistics']
  return ['summaryDetail']
}

/**
 * Profil d'un symbole, ou `null` si Yahoo n'en publie aucun.
 *
 * `null` et non une erreur : la plupart des matières premières et des indices n'ont
 * pas de profil, et ce n'est pas un incident. L'appelant fait disparaître les sections
 * concernées, exactement comme pour un champ absent.
 */
export async function fetchAssetProfile(
  symbol: string,
  assetClass: AssetClass,
): Promise<AssetProfile | null> {
  const raw = await query(symbol, modulesFor(assetClass))
  if (!raw) return null

  const profile: AssetProfile = {}

  // ── Fonds ────────────────────────────────────────────────────────────────
  if (raw.fundProfile?.family) profile.family = raw.fundProfile.family
  if (raw.fundProfile?.categoryName) profile.category = raw.fundProfile.categoryName

  const expense = percent(raw.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio)
  if (expense !== undefined && expense > 0) profile.expenseRatio = expense

  const assets = value(raw.summaryDetail?.totalAssets)
  if (assets !== undefined && assets > 0) profile.totalAssets = assets

  /* `yield` pour un fonds, `dividendYield` pour une action : Yahoo emploie deux noms
     pour la même idée selon le type de titre, et ne renseigne jamais les deux. */
  const distributed = percent(raw.summaryDetail?.yield) ?? percent(raw.summaryDetail?.dividendYield)
  if (distributed !== undefined && distributed > 0) profile.yieldPercent = distributed

  const holdings = (raw.topHoldings?.holdings ?? [])
    .map((entry) => {
      const weight = percent(entry.holdingPercent)
      const name = entry.holdingName?.trim()
      if (!name || weight === undefined || weight <= 0) return null
      return { name, weight, ...(entry.symbol ? { symbol: entry.symbol } : {}) }
    })
    .filter((entry): entry is FundHolding => entry !== null)
  if (holdings.length > 0) profile.holdings = holdings

  /*
   * Les pondérations sectorielles arrivent en TABLEAU D'OBJETS À UNE CLÉ —
   * `[{ realestate: { raw: 0.02 } }, { technology: { raw: 0.26 } }]` — et non en objet
   * unique. On les aplatit, en écartant les secteurs à zéro : un fonds mondial en
   * publie onze dont plusieurs vides, et une part nulle n'est pas une exposition.
   */
  const sectors: SectorWeight[] = []
  for (const group of raw.topHoldings?.sectorWeightings ?? []) {
    for (const [key, entry] of Object.entries(group)) {
      const weight = percent(entry)
      if (weight === undefined || weight <= 0) continue
      sectors.push({ sector: SECTOR_LABELS[key] ?? key.replace(/_/g, ' '), weight })
    }
  }
  if (sectors.length > 0) {
    profile.sectors = sectors.sort((a, b) => b.weight - a.weight)
  }

  const allocation = [
    { label: 'Actions', weight: percent(raw.topHoldings?.stockPosition) },
    { label: 'Obligations', weight: percent(raw.topHoldings?.bondPosition) },
    { label: 'Liquidités', weight: percent(raw.topHoldings?.cashPosition) },
  ].filter((entry): entry is { label: string; weight: number } =>
    entry.weight !== undefined && entry.weight > 0,
  )
  if (allocation.length > 0) profile.allocation = allocation

  // ── Actions ──────────────────────────────────────────────────────────────
  if (raw.assetProfile?.sector) profile.sector = raw.assetProfile.sector
  if (raw.assetProfile?.industry) profile.industry = raw.assetProfile.industry
  if (raw.assetProfile?.country) profile.country = raw.assetProfile.country
  if (raw.assetProfile?.website) profile.summary = raw.assetProfile.longBusinessSummary ?? undefined
  if (typeof raw.assetProfile?.fullTimeEmployees === 'number') {
    profile.employees = raw.assetProfile.fullTimeEmployees
  }
  if (raw.assetProfile?.longBusinessSummary) profile.summary = raw.assetProfile.longBusinessSummary

  const pe = value(raw.summaryDetail?.trailingPE)
  if (pe !== undefined && pe > 0) profile.trailingPE = pe

  const forward = value(raw.defaultKeyStatistics?.forwardPE)
  if (forward !== undefined && forward > 0) profile.forwardPE = forward

  const book = value(raw.defaultKeyStatistics?.priceToBook)
  if (book !== undefined && book > 0) profile.priceToBook = book

  const eps = value(raw.defaultKeyStatistics?.trailingEps)
  if (eps !== undefined) profile.eps = eps

  const beta = value(raw.summaryDetail?.beta) ?? value(raw.defaultKeyStatistics?.beta)
  if (beta !== undefined) profile.beta = beta

  const cap = value(raw.summaryDetail?.marketCap)
  if (cap !== undefined && cap > 0) profile.marketCap = cap

  // Aucun champ renseigné : la réponse existait mais ne portait rien d'exploitable.
  // On rend `null` plutôt qu'un objet vide, pour que l'appelant n'ait qu'un seul cas
  // d'absence à traiter.
  return Object.keys(profile).length > 0 ? profile : null
}
