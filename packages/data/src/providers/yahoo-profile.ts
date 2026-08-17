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
 * ── LA POIGNÉE DE MAIN A DÉMÉNAGÉ ─────────────────────────────────────────────
 *
 * Cet endpoint refuse tout appel nu : il répond « Invalid Crumb ». Il faut d'abord
 * obtenir un cookie de session, puis échanger ce cookie contre un jeton à passer en
 * paramètre de chaque requête.
 *
 * Ce mécanisme est né ici et vit désormais dans `yahoo-session.ts` : le screener en a
 * besoin lui aussi, et deux copies auraient ouvert DEUX sessions dans le même
 * processus — deux cookies, deux jetons, deux fois plus de créations de session pour
 * un serveur qui traite une rafale de créations comme un abus. Voir ce module pour le
 * détail de l'expiration et du renouvellement.
 */

import type { AssetClass } from '../types'
import { ProviderError } from '../types'
import { forgetYahooSession, yahooFetch } from './yahoo-session'

const PROVIDER_ID = 'yahoo-finance'

/**
 * Interroge `quoteSummary`.
 *
 * `retry` ne borne plus que le refus PAR LE CORPS : les refus par code de réponse sont
 * traités dans `yahooFetch`, qui renouvelle la session une fois et rejoue l'appel.
 */
async function query(symbol: string, modules: string[], retry = true): Promise<RawSummary | null> {
  const response = await yahooFetch(
    (crumb) =>
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
      `?modules=${modules.join(',')}&crumb=${encodeURIComponent(crumb)}`,
  )

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
    forgetYahooSession()
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
    // ── Dividende ───────────────────────────────────────────────
    dividendRate?: RawValue
    exDividendDate?: RawValue
    payoutRatio?: RawValue
    fiveYearAvgDividendYield?: RawValue
    priceToSalesTrailing12Months?: RawValue
  }
  defaultKeyStatistics?: {
    forwardPE?: RawValue
    priceToBook?: RawValue
    trailingEps?: RawValue
    beta?: RawValue
    // ── Valorisation d'ENTREPRISE, qui n'est pas la capitalisation ───────────
    // La capitalisation ne compte que les actions ; la valeur d'entreprise y ajoute
    // la dette et retranche la trésorerie. C'est elle qu'on rapporte au résultat
    // d'exploitation, parce que le rachat d'une société emporte ses dettes.
    enterpriseValue?: RawValue
    enterpriseToEbitda?: RawValue
    enterpriseToRevenue?: RawValue
    pegRatio?: RawValue
    sharesOutstanding?: RawValue
    floatShares?: RawValue
  }
  assetProfile?: {
    sector?: string
    industry?: string
    country?: string
    city?: string
    website?: string
    fullTimeEmployees?: number
    longBusinessSummary?: string
  }
  /**
   * Répartition des recommandations d'analystes, du mois courant au troisième
   * précédent. Seule la période `0m` est lue : les trois autres décrivent une
   * ÉVOLUTION du consensus, qui mérite mieux qu'une ligne et n'est pas affichée.
   */
  recommendationTrend?: {
    trend?: {
      period?: string
      strongBuy?: number
      buy?: number
      hold?: number
      sell?: number
      strongSell?: number
    }[]
  }
  financialData?: {
    targetMeanPrice?: RawValue
    targetHighPrice?: RawValue
    targetLowPrice?: RawValue
    numberOfAnalystOpinions?: RawValue
    recommendationKey?: string
    // ── Rentabilité et structure ───────────────────────────────────
    // Yahoo publie toutes les marges en FRACTIONS (0,75 pour 75 %). Voir `percent`.
    totalRevenue?: RawValue
    revenueGrowth?: RawValue
    earningsGrowth?: RawValue
    grossMargins?: RawValue
    operatingMargins?: RawValue
    profitMargins?: RawValue
    returnOnEquity?: RawValue
    returnOnAssets?: RawValue
    totalCash?: RawValue
    totalDebt?: RawValue
    debtToEquity?: RawValue
    freeCashflow?: RawValue
  }
  /**
   * Résultats publiés et attendus.
   *
   * `earningsChart.quarterly` porte les quatre derniers trimestres avec, pour chacun,
   * le bénéfice par action PUBLIÉ et celui qui était ATTENDU. C'est le couple qui a du
   * sens : un BPA de 0,81 ne dit rien seul, un BPA de 0,81 contre 0,75 attendu dit
   * qu'une entreprise a dépassé le consensus.
   *
   * `financialsChart.yearly` porte le chiffre d'affaires et le résultat des quatre
   * derniers exercices — la trajectoire, là où les trimestres donnent le pouls.
   */
  earnings?: {
    earningsChart?: {
      quarterly?: { date?: string; actual?: RawValue; estimate?: RawValue }[]
      currentQuarterEstimate?: RawValue
      currentQuarterEstimateDate?: string
      currentQuarterEstimateYear?: number
    }
    financialsChart?: {
      yearly?: { date?: number; revenue?: RawValue; earnings?: RawValue }[]
    }
  }
  /** Prochaine publication de résultats, et détachement du dividende. */
  calendarEvents?: {
    earnings?: { earningsDate?: RawValue[]; earningsAverage?: RawValue }
    exDividendDate?: RawValue
    dividendDate?: RawValue
  }
  /** Répartition du capital entre initiés, institutions et public. */
  majorHoldersBreakdown?: {
    insidersPercentHeld?: RawValue
    institutionsPercentHeld?: RawValue
    institutionsCount?: RawValue
  }
  /** Les dix premiers détenteurs institutionnels, tels que déclarés. */
  institutionOwnership?: {
    ownershipList?: {
      organization?: string
      pctHeld?: RawValue
      position?: RawValue
      value?: RawValue
      reportDate?: RawValue
    }[]
  }
  price?: {
    exchangeName?: string
    quoteType?: string
    currency?: string
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
 * Consensus d'analystes — l'équivalent boursier du sondage communautaire crypto.
 *
 * ── POURQUOI CE BLOC EXISTE ───────────────────────────────────────────────────
 *
 * Une fiche de cryptomonnaie porte un « sentiment » : la part de votes haussiers
 * publiée par la source. Une fiche d'action n'avait rien à cet endroit, alors que la
 * question posée est la même — « qu'en pensent les autres ? » — et que la réponse
 * boursière est bien plus solide qu'un sondage de clics : des professionnels qui
 * engagent leur nom, avec un objectif de cours chiffré.
 *
 * ── CE QU'IL FAUT EN DIRE À L'AFFICHAGE ───────────────────────────────────────
 *
 * Un objectif de cours n'est PAS une prévision vérifiée, et le consensus est connu
 * pour son biais haussier structurel. L'interface doit présenter ces chiffres comme
 * l'opinion d'un groupe identifié, jamais comme une valeur attendue (§5, §7).
 *
 * `count` est le nombre d'opinions retenues par la source pour l'objectif moyen. Il
 * n'a aucune raison d'égaler la somme des recommandations, qui vient d'un autre
 * module : deux dénombrements différents, affichés séparément.
 */
export interface AnalystView {
  /** Objectif de cours moyen, dans la devise de cotation. */
  targetMean?: number
  targetHigh?: number
  targetLow?: number
  /** Nombre d'opinions derrière l'objectif moyen. */
  count?: number
  /** Clé de recommandation Yahoo : `strong_buy`, `buy`, `hold`, `sell`, `strong_sell`. */
  recommendation?: string
  /** Répartition du mois courant, quand la source la publie. */
  distribution?: {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  }
}

/**
 * Valorisation et rentabilité — ce que les ratios du rail ne disent pas.
 *
 * ── POURQUOI CE BLOC S'AJOUTE AUX RATIOS DÉJÀ PRÉSENTS ────────────────────────
 *
 * La fiche portait déjà cours/bénéfice, cours/actif net, BPA et bêta : de quoi
 * situer un titre par rapport à son cours. Elle ne disait rien de l'ENTREPRISE
 * derrière — ce qu'elle encaisse, ce qu'elle en garde, ce qu'elle doit.
 *
 * L'écart est net sur une valeur de croissance : un cours/bénéfice de 55 se lit
 * comme cher, et le même titre affichant 75 % de marge brute et 30 % de croissance
 * du chiffre d'affaires ne raconte plus la même histoire. Publier le premier sans
 * les seconds, c'est publier la moitié qui inquiète.
 *
 * ── LES POURCENTAGES SONT DES POURCENTAGES ────────────────────────────────────
 *
 * Yahoo livre toutes ces grandeurs en FRACTIONS (0,7501 pour 75,01 %). La conversion
 * se fait ici, une fois, à l'entrée — jamais à l'affichage, où elle finirait par
 * être appliquée deux fois à un endroit et zéro à un autre.
 */
export interface ValuationView {
  /** Capitalisation + dette − trésorerie. Voir la note du champ brut. */
  enterpriseValue?: number
  /** Valeur d'entreprise rapportée à l'EBITDA. */
  evToEbitda?: number
  evToRevenue?: number
  priceToSales?: number
  /** Cours/bénéfice rapporté à la croissance attendue. */
  pegRatio?: number

  /** Marges, en pourcentage. */
  grossMargin?: number
  operatingMargin?: number
  profitMargin?: number
  /** Rentabilité des capitaux propres et de l'actif, en pourcentage. */
  returnOnEquity?: number
  returnOnAssets?: number

  /** Chiffre d'affaires sur douze mois glissants, dans la devise de cotation. */
  revenue?: number
  /** Croissances sur un an, en pourcentage. */
  revenueGrowth?: number
  earningsGrowth?: number

  totalCash?: number
  totalDebt?: number
  /** Dette rapportée aux capitaux propres, en pourcentage (tel que publié). */
  debtToEquity?: number
  freeCashflow?: number

  /** Actions en circulation, et part réellement échangeable. */
  sharesOutstanding?: number
  floatShares?: number
}

/** Un trimestre de résultats : ce qui était attendu, ce qui a été publié. */
export interface EarningsQuarter {
  /** Libellé tel que publié — « 3Q2025 ». Traduit à l'affichage. */
  period: string
  actual?: number
  estimate?: number
}

/** Un exercice : chiffre d'affaires et résultat. */
export interface EarningsYear {
  year: number
  revenue?: number
  earnings?: number
}

/**
 * Résultats — publiés, attendus, et la prochaine échéance.
 *
 * ── CE QUE CE BLOC APPORTE QUE LE COURS NE DIT PAS ────────────────────────────
 *
 * Le cours d'une action bouge le plus fort les jours de publication de résultats, et
 * ce mouvement est le seul de la fiche dont la DATE soit connue à l'avance. Une fiche
 * qui ne l'annonce pas laisse son lecteur découvrir après coup pourquoi la courbe a
 * décroché de huit pour cent un mardi.
 *
 * Les quatre derniers trimestres sont donnés en COUPLE publié/attendu : c'est
 * l'écart qui informe, pas la valeur seule. Un BPA de 0,81 ne dit rien ; 0,81 contre
 * 0,75 attendu dit qu'une entreprise a dépassé le consensus de huit pour cent.
 */
export interface EarningsView {
  quarters?: EarningsQuarter[]
  years?: EarningsYear[]
  /** Prochaine publication, en ISO 8601. */
  nextDate?: string
  /** BPA attendu pour le trimestre en cours. */
  nextEstimate?: number
}

/**
 * Dividende — le rendement, et ce qui le rend soutenable ou non.
 *
 * ── POURQUOI LE TAUX DE DISTRIBUTION COMPTE AUTANT QUE LE RENDEMENT ───────────
 *
 * Un rendement de 9 % attire l'œil et ne dit rien à lui seul. Rapporté à un taux de
 * distribution de 180 %, il dit que l'entreprise verse davantage qu'elle ne gagne —
 * ce qui ne dure pas. La fiche affiche donc toujours les deux, jamais le premier
 * seul : c'est la différence entre une donnée et une donnée lisible.
 *
 * La moyenne sur cinq ans joue le même rôle dans l'autre sens : un rendement très
 * au-dessus de sa propre moyenne signale le plus souvent un cours qui a chuté, pas
 * un dividende qui a monté.
 */
export interface DividendView {
  /** Montant annuel par action, dans la devise de cotation. */
  rate?: number
  yieldPercent?: number
  /** Part du bénéfice reversée, en pourcentage. */
  payoutRatio?: number
  fiveYearAverageYield?: number
  /** Date de détachement, en ISO 8601. */
  exDate?: string
  /** Prochain versement, en ISO 8601. */
  payDate?: string
}

/** Un détenteur institutionnel déclaré. */
export interface InstitutionalHolder {
  name: string
  /** Part du capital détenue, en pourcentage. */
  percentHeld?: number
  /** Nombre de titres. */
  shares?: number
  /** Valeur de la position, dans la devise de cotation. */
  value?: number
  /** Date de la déclaration, en ISO 8601. */
  reportedAt?: string
}

/**
 * Répartition du capital — la section qui annonçait ne rien savoir.
 *
 * ── CE QU'ELLE REMPLACE ───────────────────────────────────────────────────────
 *
 * L'onglet Écosystème portait un encadré « Détentions institutionnelles — non
 * publiées par nos sources ». C'était exact au moment où il a été écrit : aucune de
 * nos sources crypto ne publie cette donnée. Elle existe en revanche pour les valeurs
 * boursières, dans le même appel que les ratios déjà chargés.
 *
 * ── CE QUE CES CHIFFRES DISENT, ET CE QU'ILS NE DISENT PAS ────────────────────
 *
 * Ils viennent de déclarations réglementaires TRIMESTRIELLES, et donc datées : une
 * position déclarée au 30 juin peut avoir été soldée depuis. La date de déclaration
 * accompagne chaque ligne pour cette raison, et non par souci d'exhaustivité.
 */
export interface OwnershipView {
  /** Parts détenues par les initiés et par les institutions, en pourcentage. */
  insidersPercent?: number
  institutionsPercent?: number
  /** Nombre d'institutions déclarantes. */
  institutionsCount?: number
  topInstitutions?: InstitutionalHolder[]
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
  /** Ville du siège, telle que publiée. Complète `country` sans le remplacer. */
  city?: string
  /**
   * Site officiel de l'émetteur.
   *
   * ⚠️ Ce champ N'ÉTAIT PAS RENSEIGNÉ, et le défaut se lisait dans le code : la
   * condition testait `assetProfile.website` mais affectait `longBusinessSummary` à
   * `summary`. Le site était donc lu par le fournisseur puis jeté, et le résumé se
   * trouvait affecté deux fois. La fiche technique d'une action n'avait par
   * conséquent aucun lien sortant — c'est ce qui la rendait vide.
   */
  website?: string
  employees?: number
  trailingPE?: number
  forwardPE?: number
  priceToBook?: number
  eps?: number
  beta?: number
  marketCap?: number
  summary?: string
  /** Consensus d'analystes — actions principalement, cf. `AnalystView`. */
  analyst?: AnalystView
  /** Valorisation d'entreprise, marges et structure — cf. `ValuationView`. */
  valuation?: ValuationView
  /** Résultats publiés, attendus et à venir — cf. `EarningsView`. */
  earnings?: EarningsView
  /** Dividende et sa soutenabilité — cf. `DividendView`. */
  dividend?: DividendView
  /** Répartition du capital — cf. `OwnershipView`. */
  ownership?: OwnershipView
  /** Place de cotation telle que nommée par la source (« NasdaqGS »). */
  exchangeName?: string
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
  if (assetClass === 'etf') {
    return ['fundProfile', 'topHoldings', 'summaryDetail', 'assetProfile', 'price']
  }
  if (assetClass === 'stock') {
    return [
      'assetProfile',
      'summaryDetail',
      'defaultKeyStatistics',
      // Les deux modules du consensus. Ils voyagent dans LA MÊME requête que le
      // reste : les ajouter ne coûte aucun appel supplémentaire, seulement quelques
      // kilo-octets de réponse.
      'recommendationTrend',
      'financialData',
      /*
       * ── QUATRE MODULES DE PLUS, ET TOUJOURS UN SEUL APPEL ─────────────────
       *
       * `quoteSummary` accepte une liste : demander douze modules coûte exactement une
       * requête, comme en demander six. Le seul coût réel est la taille de la réponse,
       * qui passe d'une trentaine à une soixantaine de kilo-octets — et qui est mise
       * en cache comme le reste.
       *
       * Ce qui décide n'est donc pas le coût réseau mais l'usage : ces quatre-là
       * remplissent des sections que la fiche annonçait vides, ou qu'elle n'avait pas.
       * Les demander à un ETF ou à un indice n'aurait en revanche aucun sens — d'où
       * leur présence dans cette branche et nulle part ailleurs.
       */
      'earnings',
      'calendarEvents',
      'majorHoldersBreakdown',
      'institutionOwnership',
      'price',
    ]
  }
  return ['summaryDetail', 'price']
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
  if (raw.assetProfile?.city) profile.city = raw.assetProfile.city
  /* Voir le champ `website` du modèle : cette ligne testait le site pour affecter le
     résumé, si bien que le lien n'arrivait jamais jusqu'à la fiche. */
  if (raw.assetProfile?.website) profile.website = raw.assetProfile.website
  if (typeof raw.assetProfile?.fullTimeEmployees === 'number') {
    profile.employees = raw.assetProfile.fullTimeEmployees
  }
  if (raw.assetProfile?.longBusinessSummary) profile.summary = raw.assetProfile.longBusinessSummary
  if (raw.price?.exchangeName) profile.exchangeName = raw.price.exchangeName

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

  // ── Consensus d'analystes ────────────────────────────────────────────────
  const analyst: AnalystView = {}

  const targetMean = value(raw.financialData?.targetMeanPrice)
  if (targetMean !== undefined && targetMean > 0) analyst.targetMean = targetMean

  const targetHigh = value(raw.financialData?.targetHighPrice)
  if (targetHigh !== undefined && targetHigh > 0) analyst.targetHigh = targetHigh

  const targetLow = value(raw.financialData?.targetLowPrice)
  if (targetLow !== undefined && targetLow > 0) analyst.targetLow = targetLow

  const opinions = value(raw.financialData?.numberOfAnalystOpinions)
  if (opinions !== undefined && opinions > 0) analyst.count = Math.round(opinions)

  if (raw.financialData?.recommendationKey && raw.financialData.recommendationKey !== 'none') {
    analyst.recommendation = raw.financialData.recommendationKey
  }

  /* La période `0m` — le mois courant. Les trois autres décrivent l'évolution du
     consensus, qui mérite un graphique et non une ligne : on ne les lit pas plutôt
     que de les afficher à moitié. */
  const current = (raw.recommendationTrend?.trend ?? []).find((entry) => entry.period === '0m')
  if (current) {
    const distribution = {
      strongBuy: current.strongBuy ?? 0,
      buy: current.buy ?? 0,
      hold: current.hold ?? 0,
      sell: current.sell ?? 0,
      strongSell: current.strongSell ?? 0,
    }
    const total =
      distribution.strongBuy +
      distribution.buy +
      distribution.hold +
      distribution.sell +
      distribution.strongSell
    // Une répartition entièrement nulle n'est pas un consensus neutre : c'est une
    // absence de couverture, et l'afficher en cinq zéros ferait lire l'inverse.
    if (total > 0) analyst.distribution = distribution
  }

  if (Object.keys(analyst).length > 0) profile.analyst = analyst

  const valuation = readValuation(raw)
  if (valuation) profile.valuation = valuation

  const earnings = readEarnings(raw)
  if (earnings) profile.earnings = earnings

  const dividend = readDividend(raw)
  if (dividend) profile.dividend = dividend

  const ownership = readOwnership(raw)
  if (ownership) profile.ownership = ownership

  // Aucun champ renseigné : la réponse existait mais ne portait rien d'exploitable.
  // On rend `null` plutôt qu'un objet vide, pour que l'appelant n'ait qu'un seul cas
  // d'absence à traiter.
  return Object.keys(profile).length > 0 ? profile : null
}

/* ── Lecteurs par famille ─────────────────────────────────────────────────────
 *
 * Quatre fonctions plutôt que quatre blocs dans `fetchAssetProfile`, pour une raison
 * mesurable : celle-ci passait déjà toutes les métriques de complexité du dépôt, et
 * quarante lignes de plus l'auraient rendue illisible. Chacune rend `null` — et non
 * un objet vide — quand la source n'a rien livré, ce qui laisse à l'appelant un seul
 * test au lieu d'un par champ.
 *
 * Le motif `keep(...)` est le même partout : on n'écrit un champ que s'il a une
 * valeur, de sorte qu'un champ absent le reste jusqu'à l'affichage (§5). Un zéro
 * écrit « par sécurité » deviendrait un fait publié.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Écrit `value` sous `key` seulement si elle existe. Retourne `true` si écrit. */
function keep<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) target[key] = value
}

/** Positif ou rien : un ratio de valorisation nul ou négatif n'est pas une donnée. */
function positive(entry: RawValue | undefined): number | undefined {
  const raw = value(entry)
  return raw !== undefined && raw > 0 ? raw : undefined
}

/** Secondes epoch → ISO 8601. Yahoo date tout en secondes dans ces modules. */
function epochToIso(entry: RawValue | undefined): string | undefined {
  const raw = value(entry)
  if (raw === undefined || raw <= 0) return undefined
  return new Date(raw * 1000).toISOString()
}

function readValuation(raw: RawSummary): ValuationView | null {
  const view: ValuationView = {}
  const stats = raw.defaultKeyStatistics
  const money = raw.financialData

  keep(view, 'enterpriseValue', positive(stats?.enterpriseValue))
  keep(view, 'evToEbitda', positive(stats?.enterpriseToEbitda))
  keep(view, 'evToRevenue', positive(stats?.enterpriseToRevenue))
  keep(view, 'priceToSales', positive(raw.summaryDetail?.priceToSalesTrailing12Months))
  keep(view, 'pegRatio', positive(stats?.pegRatio))
  keep(view, 'sharesOutstanding', positive(stats?.sharesOutstanding))
  keep(view, 'floatShares', positive(stats?.floatShares))

  /* Les marges et les rentabilités peuvent être NÉGATIVES, et c'est précisément ce
     qu'il faut publier : une société qui perd de l'argent affiche une marge nette
     négative, et la masquer reviendrait à publier la seule moitié flatteuse. On
     n'écarte donc pas les valeurs négatives ici — à la différence des ratios de
     valorisation ci-dessus, où un négatif ne veut rien dire. */
  keep(view, 'grossMargin', percent(money?.grossMargins))
  keep(view, 'operatingMargin', percent(money?.operatingMargins))
  keep(view, 'profitMargin', percent(money?.profitMargins))
  keep(view, 'returnOnEquity', percent(money?.returnOnEquity))
  keep(view, 'returnOnAssets', percent(money?.returnOnAssets))
  keep(view, 'revenueGrowth', percent(money?.revenueGrowth))
  keep(view, 'earningsGrowth', percent(money?.earningsGrowth))

  keep(view, 'revenue', positive(money?.totalRevenue))
  keep(view, 'totalCash', positive(money?.totalCash))
  keep(view, 'totalDebt', positive(money?.totalDebt))
  keep(view, 'debtToEquity', positive(money?.debtToEquity))
  /* Le flux de trésorerie libre est SIGNÉ : négatif chez une société qui investit plus
     qu'elle n'encaisse, ce qui est un fait et non une absence. */
  keep(view, 'freeCashflow', value(money?.freeCashflow))

  return Object.keys(view).length > 0 ? view : null
}

function readEarnings(raw: RawSummary): EarningsView | null {
  const view: EarningsView = {}
  const chart = raw.earnings?.earningsChart

  const quarters = (chart?.quarterly ?? [])
    .map((entry) => {
      if (!entry.date) return null
      const quarter: EarningsQuarter = { period: entry.date }
      keep(quarter, 'actual', value(entry.actual))
      keep(quarter, 'estimate', value(entry.estimate))
      // Un trimestre sans aucun chiffre est une ligne vide : on ne le garde pas.
      return quarter.actual === undefined && quarter.estimate === undefined ? null : quarter
    })
    .filter((entry): entry is EarningsQuarter => entry !== null)
  if (quarters.length > 0) view.quarters = quarters

  const years = (raw.earnings?.financialsChart?.yearly ?? [])
    .map((entry) => {
      if (typeof entry.date !== 'number') return null
      const year: EarningsYear = { year: entry.date }
      keep(year, 'revenue', positive(entry.revenue))
      keep(year, 'earnings', value(entry.earnings))
      return year.revenue === undefined && year.earnings === undefined ? null : year
    })
    .filter((entry): entry is EarningsYear => entry !== null)
  if (years.length > 0) view.years = years

  /*
   * `earningsDate` est un TABLEAU, et sa longueur porte du sens : deux entrées quand
   * la société n'a annoncé qu'une fenêtre (« entre le 18 et le 22 »), une seule quand
   * la date est confirmée. On retient la PREMIÈRE — le début de la fenêtre — parce
   * qu'annoncer la fin ferait manquer la publication à qui s'y fierait.
   */
  keep(view, 'nextDate', epochToIso(raw.calendarEvents?.earnings?.earningsDate?.[0]))
  keep(view, 'nextEstimate', value(chart?.currentQuarterEstimate))

  return Object.keys(view).length > 0 ? view : null
}

function readDividend(raw: RawSummary): DividendView | null {
  const view: DividendView = {}
  const detail = raw.summaryDetail

  keep(view, 'rate', positive(detail?.dividendRate))
  keep(view, 'yieldPercent', percent(detail?.dividendYield))
  keep(view, 'payoutRatio', percent(detail?.payoutRatio))
  /* La moyenne cinq ans est publiée DÉJÀ en pourcentage, contrairement au rendement
     courant qui arrive en fraction. C'est une incohérence de la source, pas une
     erreur de lecture : la vérifier au navigateur avant de « corriger » ce `value`. */
  keep(view, 'fiveYearAverageYield', positive(detail?.fiveYearAvgDividendYield))
  keep(view, 'exDate', epochToIso(detail?.exDividendDate ?? raw.calendarEvents?.exDividendDate))
  keep(view, 'payDate', epochToIso(raw.calendarEvents?.dividendDate))

  /* Un titre qui ne verse rien n'a pas de bloc dividende — et surtout pas un bloc à
     zéro, qui se lirait comme « dividende suspendu » là où il n'y en a jamais eu. */
  if (view.rate === undefined && view.yieldPercent === undefined) return null

  return view
}

function readOwnership(raw: RawSummary): OwnershipView | null {
  const view: OwnershipView = {}
  const breakdown = raw.majorHoldersBreakdown

  keep(view, 'insidersPercent', percent(breakdown?.insidersPercentHeld))
  keep(view, 'institutionsPercent', percent(breakdown?.institutionsPercentHeld))

  const count = positive(breakdown?.institutionsCount)
  if (count !== undefined) view.institutionsCount = Math.round(count)

  const holders = (raw.institutionOwnership?.ownershipList ?? [])
    .map((entry) => {
      const name = entry.organization?.trim()
      if (!name) return null
      const holder: InstitutionalHolder = { name }
      keep(holder, 'percentHeld', percent(entry.pctHeld))
      keep(holder, 'shares', positive(entry.position))
      keep(holder, 'value', positive(entry.value))
      keep(holder, 'reportedAt', epochToIso(entry.reportDate))
      return holder
    })
    .filter((entry): entry is InstitutionalHolder => entry !== null)
    /* Dix lignes, pas davantage. La source en publie parfois vingt, et une liste de
       fonds passé le dixième n'apprend plus rien : les poids y tombent sous un demi
       pour cent, où la déclaration trimestrielle est déjà périmée. */
    .slice(0, 10)
  if (holders.length > 0) view.topInstitutions = holders

  return Object.keys(view).length > 0 ? view : null
}
