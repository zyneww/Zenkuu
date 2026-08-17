/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SCREENER YAHOO — l'univers boursier, au-delà des cinquante-trois symboles écrits
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE MODULE RÉSOUT ──────────────────────────────────────────────────
 *
 * `yahoo-universe.ts` liste À LA MAIN une cinquantaine de symboles : les indices, une
 * poignée d'actions, quelques ETF et matières premières. C'est le bon outil pour les
 * FICHES — on ne sert une fiche que d'un actif dont on connaît le nom, la classe et la
 * place de cotation — et c'est le mauvais pour un SCREENER, dont l'intérêt tient
 * précisément à la taille de la population qu'il balaie. Filtrer cinquante-trois
 * lignes n'est pas cribler un marché, c'est parcourir une liste.
 *
 * ── L'ENDPOINT, ET CE QU'IL REND ─────────────────────────────────────────────
 *
 * `v1/finance/screener/predefined/saved` sert les écrans PRÉDÉFINIS de Yahoo — « les
 * plus échangés », « plus fortes hausses », « petites capitalisations offensives »… —
 * et chacun rend jusqu'à 250 lignes par appel, paginables. Chaque ligne porte bien
 * davantage qu'un cours : capitalisation, PER courant et à terme, cours sur actif net,
 * bénéfice par action, rendement du dividende, bornes des 52 semaines, moyennes 50 et
 * 200 jours. C'est l'ordre de richesse d'un screener d'actions de référence.
 *
 * ⚠️ ENDPOINT NON OFFICIEL, comme le reste de Yahoo ici. Il exige la même poignée de
 * main que `quoteSummary` — voir `yahoo-session.ts`, que les deux partagent.
 *
 * ── POURQUOI PLUSIEURS ÉCRANS COMBINÉS, ET NON UN SEUL ───────────────────────
 *
 * Chaque écran prédéfini est BIAISÉ par construction : « plus fortes hausses » ne rend
 * que des hausses, « les plus échangés » que des volumes. Filtrer sur un seul d'entre
 * eux donnerait un screener dont la population dépend de l'écran d'origine — un piège
 * silencieux, puisque le résultat paraîtrait complet.
 *
 * On en combine donc plusieurs, choisis pour se recouvrir le moins possible : hausses
 * ET baisses, volumes ET petites capitalisations, valorisation ET vente à découvert.
 * L'union dédoublonnée approche un balayage du marché sans jamais prétendre en être un
 * — ce que la page dit explicitement.
 *
 * ── CE QUE CE MODULE NE PEUT PAS FAIRE ───────────────────────────────────────
 *
 * Il n'existe AUCUN écran d'obligations chez Yahoo : les identifiants essayés
 * (`bond_funds`, `corporate_bond_funds`, `government_bond_funds`) répondent tous
 * « No screener records found ». Le seul disponible, `high_yield_bond`, ne recense pas
 * des obligations mais des FONDS obligataires — un instrument différent, avec ses
 * frais et son encours propres. Il est servi comme tel, sous son vrai nom.
 */

import { ProviderError } from '../types'
import { forgetYahooSession, yahooFetch } from './yahoo-session'

const PROVIDER_ID = 'yahoo-finance'

/**
 * Une ligne de screener boursier.
 *
 * ── POURQUOI PAS `MarketAsset` ───────────────────────────────────────────────
 *
 * `MarketAsset` décrit un actif tel qu'un CLASSEMENT le montre : cours, variation,
 * volume, capitalisation, offre. C'est le vocabulaire de la crypto, et il ne porte
 * rien de ce qui fait un screener d'actions — ni PER, ni cours sur actif net, ni
 * bénéfice par action, ni rendement du dividende. L'y ajouter aurait chargé le type
 * commun de dix champs qu'aucun actif crypto ne renseigne jamais.
 *
 * Tous les champs sont FACULTATIFS, et l'absence porte un sens : Yahoo ne publie pas
 * de PER pour une société qui perd de l'argent, ni de frais de gestion pour une
 * action. Un champ absent doit être rendu comme absent — jamais remplacé par zéro (§5).
 */
export interface YahooScreenRow {
  symbol: string
  name: string
  /** `EQUITY`, `ETF`, `MUTUALFUND` — tel que Yahoo classe l'instrument. */
  kind: string
  currency?: string
  /** Place de cotation, en clair : « NasdaqGS », « Paris ». */
  exchange?: string

  price?: number
  change24h?: number
  volume24h?: number
  /** Volume moyen sur trois mois — la mesure de liquidité qui ne dépend pas du jour. */
  averageVolume3m?: number
  marketCap?: number

  /* ── Valorisation, pour les actions ──────────────────────────────────────── */
  peRatio?: number
  forwardPe?: number
  priceToBook?: number
  /** Bénéfice par action sur douze mois glissants. */
  eps?: number
  /** Rendement du dividende, en pourcentage. */
  dividendYield?: number
  sharesOutstanding?: number

  /* ── Fonds et ETF ────────────────────────────────────────────────────────── */
  /** Frais courants annuels, en pourcentage. */
  expenseRatio?: number
  /** Encours du fonds. */
  netAssets?: number
  /** Rendement distribué sur douze mois glissants, en pourcentage. */
  yieldTtm?: number
  /** Performance annualisée sur trois et cinq ans, en pourcentage. */
  return3y?: number
  return5y?: number
  /** Performance depuis le 1er janvier, en pourcentage. */
  ytdReturn?: number

  /* ── Fenêtre de 52 semaines ──────────────────────────────────────────────── */
  high52w?: number
  low52w?: number
  /** Variation sur 52 semaines, en pourcentage. */
  change52w?: number
  /** Écart au plus haut des 52 semaines, en pourcentage — négatif sous le sommet. */
  fromHigh52w?: number
  /** Écart à la moyenne 200 jours, en pourcentage. */
  fromAverage200d?: number
}

/**
 * Forme brute d'une ligne, décrite au strict nécessaire.
 *
 * Yahoo rend ici des nombres NUS, sans l'enveloppe `{ raw, fmt }` de `quoteSummary` —
 * deux endpoints, deux conventions, et c'est une raison de plus pour que les deux
 * modules restent séparés.
 */
interface RawQuote {
  symbol?: string
  shortName?: string
  longName?: string
  quoteType?: string
  currency?: string
  fullExchangeName?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  regularMarketVolume?: number
  averageDailyVolume3Month?: number
  marketCap?: number
  trailingPE?: number
  forwardPE?: number
  priceToBook?: number
  epsTrailingTwelveMonths?: number
  trailingAnnualDividendYield?: number
  dividendYield?: number
  sharesOutstanding?: number
  netExpenseRatio?: number
  netAssets?: number
  yieldTTM?: number
  annualReturnNavY3?: number
  annualReturnNavY5?: number
  ytdReturn?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  fiftyTwoWeekChangePercent?: number
  fiftyTwoWeekHighChangePercent?: number
  twoHundredDayAverageChangePercent?: number
}

/** Retient un nombre FINI, écarte tout le reste. `0` est une valeur, pas une absence. */
function num(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Convertit une fraction en pourcentage, quand la source publie l'une pour l'autre.
 *
 * ⚠️ YAHOO MÉLANGE LES DEUX CONVENTIONS DANS LA MÊME RÉPONSE, et c'est le piège de ce
 * module. Relevé champ par champ sur les réponses réelles :
 *
 *   | champ                             | convention | exemple mesuré        |
 *   |-----------------------------------|------------|-----------------------|
 *   | `regularMarketChangePercent`      | pourcent   | `-3.91` → −3,91 %     |
 *   | `fiftyTwoWeekChangePercent`       | pourcent   | `66.63` → +66,63 %    |
 *   | `ytdReturn`                       | pourcent   | `28.23` → +28,23 %    |
 *   | `yieldTTM`, `netExpenseRatio`     | pourcent   | `6.64` → 6,64 %       |
 *   | `annualReturnNavY3` / `Y5`        | pourcent   | `12.38` → +12,38 %    |
 *   | `dividendYield`                   | pourcent   | `1.33` → 1,33 %       |
 *   | `fiftyTwoWeekHighChangePercent`   | FRACTION   | `-0.1529` → −15,29 %  |
 *   | `twoHundredDayAverageChangePercent` | FRACTION | `0.2032` → +20,32 %   |
 *   | `trailingAnnualDividendYield`     | FRACTION   | `0.0132` → 1,32 %     |
 *
 * Traiter les uns comme les autres afficherait une performance de +167 % là où elle
 * vaut +1,67 %, ou un écart au sommet de −0,15 % là où il vaut −15 % — des chiffres
 * plausibles, donc invisibles à la relecture. Les deux erreurs ont été commises, et
 * c'est ce tableau qui les a tranchées.
 *
 * La conversion est appliquée EXPLICITEMENT, champ par champ, plutôt que devinée d'une
 * magnitude : un rendement de 0,8 % et une fraction de 0,8 sont indiscernables.
 */
function toPercent(value: number | undefined): number | undefined {
  const parsed = num(value)
  return parsed === undefined ? undefined : parsed * 100
}

function toRow(quote: RawQuote): YahooScreenRow | null {
  const symbol = quote.symbol?.trim()
  if (!symbol) return null

  return {
    symbol,
    name: quote.longName?.trim() || quote.shortName?.trim() || symbol,
    kind: quote.quoteType ?? 'EQUITY',
    ...(quote.currency ? { currency: quote.currency } : {}),
    ...(quote.fullExchangeName ? { exchange: quote.fullExchangeName } : {}),

    ...opt('price', num(quote.regularMarketPrice)),
    ...opt('change24h', num(quote.regularMarketChangePercent)),
    ...opt('volume24h', num(quote.regularMarketVolume)),
    ...opt('averageVolume3m', num(quote.averageDailyVolume3Month)),
    ...opt('marketCap', num(quote.marketCap)),

    ...opt('peRatio', num(quote.trailingPE)),
    ...opt('forwardPe', num(quote.forwardPE)),
    ...opt('priceToBook', num(quote.priceToBook)),
    ...opt('eps', num(quote.epsTrailingTwelveMonths)),
    /*
       DEUX RENDEMENTS DANS LA MÊME RÉPONSE, ET CE NE SONT PAS LES MÊMES.

       `dividendYield` est le rendement INDIQUÉ — le dividende annoncé rapporté au
       cours — et il est déjà en pourcentage. `trailingAnnualDividendYield` est le
       rendement CONSTATÉ sur les douze mois écoulés, et c'est une fraction. Sur NVDA,
       le premier vaut 0,44 % et le second 0,018 % : l'écart n'est pas une erreur, il
       mesure une hausse récente du dividende.

       On affiche l'INDIQUÉ, comme les screeners de référence : c'est celui qu'on
       compare à un taux d'épargne. Le constaté sert de repli là où l'indiqué manque,
       ce qui arrive sur un tiers des lignes.

       ZÉRO EST UNE VALEUR ICI, et non une absence : une société qui ne verse pas de
       dividende a bien un rendement nul, et l'écrire est plus juste qu'un tiret. */
    ...opt(
      'dividendYield',
      num(quote.dividendYield) ?? toPercent(quote.trailingAnnualDividendYield),
    ),
    ...opt('sharesOutstanding', num(quote.sharesOutstanding)),

    ...opt('expenseRatio', num(quote.netExpenseRatio)),
    ...opt('netAssets', num(quote.netAssets)),
    ...opt('yieldTtm', num(quote.yieldTTM)),
    ...opt('return3y', num(quote.annualReturnNavY3)),
    ...opt('return5y', num(quote.annualReturnNavY5)),
    ...opt('ytdReturn', num(quote.ytdReturn)),

    ...opt('high52w', num(quote.fiftyTwoWeekHigh)),
    ...opt('low52w', num(quote.fiftyTwoWeekLow)),
    ...opt('change52w', num(quote.fiftyTwoWeekChangePercent)),
    ...opt('fromHigh52w', toPercent(quote.fiftyTwoWeekHighChangePercent)),
    ...opt('fromAverage200d', toPercent(quote.twoHundredDayAverageChangePercent)),
  }
}

/**
 * Ajoute une clé SEULEMENT si sa valeur existe.
 *
 * `exactOptionalPropertyTypes` est actif : écrire `{ price: undefined }` sur un champ
 * `price?: number` est un ERREUR de typage, et c'est une bonne chose — la présence
 * d'une clé et sa valeur `undefined` ne veulent pas dire la même chose à la
 * sérialisation.
 */
function opt<K extends string, V>(key: K, value: V | undefined): Record<K, V> | object {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>)
}

/**
 * Un écran prédéfini, en une requête.
 *
 * `start` pagine : la source plafonne une réponse à 250 lignes et en annonce le total,
 * si bien qu'un écran de quatre mille lignes se lit par tranches. On ne s'en sert que
 * là où le total le justifie — voir `STOCK_SCREENS`.
 */
async function fetchScreen(scrId: string, count: number, start = 0): Promise<RawQuote[]> {
  const response = await yahooFetch(
    (crumb) =>
      'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved' +
      `?scrIds=${encodeURIComponent(scrId)}&count=${count}&start=${start}` +
      `&crumb=${encodeURIComponent(crumb)}`,
  )

  if (!response.ok) {
    throw new ProviderError(PROVIDER_ID, `Yahoo a répondu ${response.status}`, {
      retryable: response.status >= 500,
    })
  }

  const body = (await response.json()) as {
    finance?: {
      result?: { quotes?: RawQuote[] | null }[] | null
      error?: { description?: string } | null
    }
  }

  // Comme sur `quoteSummary`, un refus de session arrive en statut 200 avec l'erreur
  // dans le CORPS. Sans ce cas, une session expirée se lirait comme « cet écran est
  // vide » — et le screener afficherait zéro ligne sans que rien ne l'explique.
  if (body.finance?.error) {
    forgetYahooSession()
    throw new ProviderError(PROVIDER_ID, 'Écran refusé par Yahoo', { retryable: true })
  }

  return body.finance?.result?.[0]?.quotes ?? []
}

/**
 * Écrans combinés pour les ACTIONS, et le motif de chacun.
 *
 * Ils sont choisis pour se RECOUVRIR LE MOINS possible : chaque écran prédéfini étant
 * biaisé par construction, l'union de six biais opposés approche un balayage là où un
 * seul donnerait une population orientée. Le total dédoublonné avoisine le millier de
 * valeurs, en six requêtes.
 *
 * `pages` vaut 2 sur les deux écrans dont le total dépasse largement 250 : la source
 * en annonce respectivement 471 et 4 033, et s'arrêter à la première tranche
 * amputerait le résultat sans le dire.
 */
const STOCK_SCREENS: { id: string; pages: number }[] = [
  { id: 'most_actives', pages: 1 },
  { id: 'day_gainers', pages: 1 },
  { id: 'day_losers', pages: 1 },
  { id: 'undervalued_growth_stocks', pages: 1 },
  { id: 'aggressive_small_caps', pages: 2 },
  { id: 'most_shorted_stocks', pages: 2 },
]

const PAGE_SIZE = 250

/**
 * Assemble plusieurs écrans en une population dédoublonnée.
 *
 * ── UN ÉCRAN EN ÉCHEC N'EMPORTE PAS LES AUTRES ───────────────────────────────
 *
 * `Promise.allSettled` et non `Promise.all` : ces requêtes partent ensemble, et un
 * seul refus ferait sinon tomber le screener entier. Une population de huit cents
 * valeurs au lieu de mille est très largement utilisable ; une page vide ne l'est pas.
 *
 * Si TOUTES échouent, en revanche, l'erreur repart : à ce stade ce n'est plus une
 * source qui fléchit, c'est l'endpoint qui a fermé, et servir un tableau vide le
 * ferait passer pour un marché sans valeurs.
 */
async function collect(screens: { id: string; pages: number }[]): Promise<YahooScreenRow[]> {
  const requests = screens.flatMap((screen) =>
    Array.from({ length: screen.pages }, (_, page) =>
      fetchScreen(screen.id, PAGE_SIZE, page * PAGE_SIZE),
    ),
  )

  const settled = await Promise.allSettled(requests)
  const fulfilled = settled.filter((entry) => entry.status === 'fulfilled')

  if (fulfilled.length === 0) {
    const first = settled[0]
    throw first && first.status === 'rejected'
      ? (first.reason as Error)
      : new ProviderError(PROVIDER_ID, 'Aucun écran Yahoo n’a répondu', { retryable: true })
  }

  /* Le dédoublonnage garde la PREMIÈRE occurrence : les écrans sont listés par ordre
     de pertinence décroissante, et une valeur vue dans « les plus échangés » puis dans
     « les plus vendues à découvert » est la même ligne — pas deux. */
  const seen = new Map<string, YahooScreenRow>()
  for (const entry of fulfilled) {
    for (const quote of entry.value) {
      const row = toRow(quote)
      if (row && !seen.has(row.symbol)) seen.set(row.symbol, row)
    }
  }

  return [...seen.values()]
}

/** Population d'ACTIONS — six écrans combinés, dédoublonnés. */
export function fetchStockScreen(): Promise<YahooScreenRow[]> {
  return collect(STOCK_SCREENS)
}

/**
 * Population d'ETF — deux tranches d'un seul écran.
 *
 * `top_etfs_us` en annonce 518, et c'est le seul écran d'ETF que la source publie. Sa
 * sélection est américaine, ce que la page dit — un ETF européen n'y figure pas, et
 * laisser croire l'inverse serait pire que la limite elle-même.
 */
export function fetchEtfScreen(): Promise<YahooScreenRow[]> {
  return collect([{ id: 'top_etfs_us', pages: 2 }])
}

/**
 * Population de FONDS OBLIGATAIRES — et le nom est pesé.
 *
 * Ce ne sont PAS des obligations. Une obligation est un titre de créance avec son
 * émetteur, son coupon, son échéance et sa notation ; aucune source gratuite ne les
 * publie, et l'endpoint le confirme — tous les identifiants d'écran obligataire
 * essayés répondent « No screener records found ».
 *
 * `high_yield_bond` recense cinquante-sept FONDS investis en obligations à haut
 * rendement. C'est une exposition au marché obligataire, pas le marché lui-même, et
 * l'onglet le dit en toutes lettres : ses colonnes sont celles d'un fonds — frais,
 * encours, rendement distribué — et non celles d'un titre.
 */
export function fetchBondFundScreen(): Promise<YahooScreenRow[]> {
  return collect([{ id: 'high_yield_bond', pages: 1 }])
}
