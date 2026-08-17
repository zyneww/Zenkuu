import type { DexPool, MarketAsset, SpotExchange, YahooScreenRow } from '@zenkuu/data'

import { assetHref } from '@/lib/asset-routes'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES SIX MARCHÉS DU SCREENER — un descripteur par marché, une seule mécanique
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * TradingView publie six screeners sur six adresses : actions, ETF, obligations,
 * cryptomonnaies, places centralisées, places décentralisées. Ce ne sont pas six
 * outils — c'est le MÊME outil, dont seuls les colonnes, les filtres et la population
 * changent.
 *
 * Ce fichier tient cette différence, et rien d'autre. `ScreenerView` ne connaît aucun
 * marché : il reçoit des lignes normalisées et un descripteur, et sait filtrer, trier,
 * paginer et exporter n'importe lequel. Ajouter un septième marché revient à ajouter
 * une entrée ici.
 *
 * ── POURQUOI UN SAC `values` ET NON UN TYPE PAR MARCHÉ ───────────────────────
 *
 * Une union de six types obligerait chaque colonne à porter sa propre fonction de
 * rendu, donc une fermeture — que le serveur ne peut pas sérialiser vers le client, et
 * qui devrait donc être redéclarée des deux côtés. Un sac de nombres indexés par clé
 * traverse la frontière tel quel, et une colonne se réduit à une clé plus un FORMAT.
 *
 * Le coût est réel et il est borné : rien ne garantit à la compilation qu'une colonne
 * cite une clé que ses lignes renseignent. C'est ce que règlent les fonctions
 * `rowsFrom*` ci-dessous — elles sont l'unique endroit où une clé est écrite, et les
 * colonnes citent les mêmes constantes.
 *
 * ── L'ABSENCE EST UNE VALEUR ─────────────────────────────────────────────────
 *
 * `values[clé]` vaut `undefined` quand la source ne publie pas la grandeur. Jamais
 * zéro : un actif sans capitalisation publiée n'a pas une capitalisation nulle, et le
 * classer premier en tri croissant serait un contresens (§5). Le tableau rend « — »,
 * le tri rejette la ligne en fin de liste, et un filtre porté sur cette clé l'exclut.
 */

export type ScreenerMarketId = 'actions' | 'etf' | 'obligations' | 'crypto' | 'cex' | 'dex'

/** Une ligne, quelle que soit sa provenance. */
export interface ScreenerRow {
  /** Clé stable, unique dans son marché. */
  id: string
  symbol: string
  name: string
  /** Fiche interne, quand nous en avons une. Absente = la ligne n'est pas cliquable. */
  href?: string
  image?: string
  /** Devise des montants de cette ligne. Absente = grandeur sans unité monétaire. */
  currency?: string
  /** Seconde ligne sous le nom : place de cotation, réseau, pays. */
  meta?: string
  values: Record<string, number | undefined>
}

/**
 * Mise en forme d'une colonne.
 *
 * Le FORMAT et non une fonction de rendu — voir l'en-tête. Chaque valeur est un nombre,
 * et c'est le format qui décide s'il se lit en euros, en pourcentage, en multiple ou
 * en unités.
 */
export type ScreenerFormat =
  | 'money'
  /** Montant abrégé : « 1,29 Bn ». Pour les capitalisations et les encours. */
  | 'moneyCompact'
  /** Variation signée et colorée. */
  | 'change'
  /** Pourcentage simple, non coloré — un taux de frais n'est ni bon ni mauvais. */
  | 'percent'
  /** Multiple sans unité : PER, cours sur actif net. */
  | 'ratio'
  /** Dénombrement : transactions, acheteurs, rangs. */
  | 'count'
  /**
   * Millésime — un entier SANS séparateur de milliers.
   *
   * Il a fallu un format à part : `count` écrit « 2 017 » pour une année d'ouverture,
   * ce qui se lit comme un dénombrement de deux mille dix-sept. Une année n'est pas
   * une quantité, et sa typographie le dit.
   */
  | 'year'
  /** Grandeur abrégée sans devise : offre en circulation. */
  | 'compact'

export interface ScreenerColumn {
  key: string
  label: string
  /** Aide au survol, quand la colonne n'est pas évidente. */
  hint?: string
  format: ScreenerFormat
  /**
   * Unité accolée à la valeur — « BTC », « ans ».
   *
   * Réservée aux grandeurs dont l'unité N'EST PAS déductible du format ni de la
   * devise de la ligne. Le volume d'une place d'échange en est le cas type : la source
   * le publie en BITCOIN, et « 81,9 k » sans unité se lit comme des dollars.
   */
  unit?: string
  /**
   * Point de rupture en dessous duquel la colonne disparaît.
   *
   * Un tableau de sept colonnes sur 375 pixels n'est pas un tableau, c'est un
   * défilement latéral. Chaque jeu déclare donc ce qu'il sacrifie en premier.
   */
  hideBelow?: 'sm' | 'md' | 'lg'
}

export interface ColumnSet {
  id: string
  label: string
  hint: string
  columns: ScreenerColumn[]
}

/**
 * Un filtre à SEUIL MINIMUM.
 *
 * Minimum et non fourchette : sur des grandeurs qui s'étalent sur six ordres de
 * grandeur, une borne haute ne sert pratiquement jamais, et deux curseurs par critère
 * doublent la charge sans gain.
 *
 * `steps` donne un barème logarithmique — un curseur linéaire de 0 à cent milliards
 * passerait de « rien » à « les cinq premiers » en un cran. `min`/`max` servent au
 * contraire les grandeurs bornées, comme une variation en pourcentage.
 */
export interface ScreenerFilter {
  key: string
  label: string
  /** Barème par crans. Exclusif de `min`/`max`. */
  steps?: number[]
  /** Bornes d'un curseur continu, en unités de la grandeur. */
  min?: number
  max?: number
  step?: number
  /** Suffixe affiché après le seuil : « € », « % », « ». */
  unit?: string
  /** Sens de la comparaison. `min` par défaut. */
  direction?: 'min' | 'max'
}

/**
 * Un préréglage : un nom, et les seuils qu'il pose.
 *
 * Il n'exprime PAS de prédicat — une fonction ne traverse pas la frontière
 * serveur → client, et un préréglage doit pouvoir être rejoué par les mêmes curseurs
 * que ceux que le lecteur manipule. Il pose donc des seuils, exactement comme un clic
 * sur chaque curseur l'aurait fait, ce qui a une conséquence heureuse : après l'avoir
 * appliqué, on VOIT ce qu'il a fait et on peut l'ajuster.
 */
export interface ScreenerPreset {
  id: string
  label: string
  hint: string
  thresholds: Record<string, number>
}

export interface ScreenerMarket {
  id: ScreenerMarketId
  label: string
  /** Titre de la page pour ce marché. */
  title: string
  lead: string
  /** Ce que compte l'unité de population : « actions », « pools »… */
  unit: string
  /**
   * Le nom de cette unité est-il féminin ?
   *
   * Il sert un unique accord : « 12 sur 100 places retenues » contre « 12 sur 100
   * pools retenus ». Une phrase invariable aurait évité ce champ et se serait vue —
   * c'est la ligne la plus lue de la page, celle qui répond au filtre.
   */
  feminine?: boolean
  columnSets: ColumnSet[]
  filters: ScreenerFilter[]
  presets: ScreenerPreset[]
}

/* ══════════════════════════════════════════════════════════════════════════════
   NORMALISATION — l'unique endroit où une clé de `values` est écrite
   ══════════════════════════════════════════════════════════════════════════════ */

/** Rotation quotidienne : volume 24 h rapporté à la capitalisation, en pourcentage. */
function turnover(volume?: number, cap?: number): number | undefined {
  if (!cap || cap <= 0 || volume === undefined) return undefined
  return (volume / cap) * 100
}

export function rowsFromCrypto(assets: MarketAsset[]): ScreenerRow[] {
  return assets.map((asset) => ({
    id: asset.id,
    symbol: asset.symbol.toUpperCase(),
    name: asset.name,
    href: assetHref('crypto', asset.id),
    ...(asset.image ? { image: asset.image } : {}),
    ...(asset.currency ? { currency: asset.currency } : {}),
    values: {
      price: asset.price,
      change1h: asset.change1h,
      change24h: asset.change24h,
      change7d: asset.change7d,
      change30d: asset.change30d,
      volume24h: asset.volume24h,
      marketCap: asset.marketCap,
      turnover: turnover(asset.volume24h, asset.marketCap),
      circulating: asset.circulatingSupply,
      maxSupply: asset.maxSupply,
      /* Part de l'offre maximale déjà émise. Absente quand le projet n'en fixe
         aucune — ce n'est pas cent pour cent, c'est « sans plafond ». */
      issued:
        asset.maxSupply && asset.maxSupply > 0 && asset.circulatingSupply !== undefined
          ? (asset.circulatingSupply / asset.maxSupply) * 100
          : undefined,
      /*
       * Écart au plus haut historique.
       *
       * CALCULÉ ICI, et c'est légitime : les deux termes sont PUBLIÉS par la source, et
       * la formule est celle qu'elle documente elle-même. Le champ `athChangePercent`
       * existe, mais seulement sur la fiche détaillée — la réponse de classement, qui
       * alimente ce tableau, ne le porte pas.
       */
      fromAth:
        asset.ath && asset.ath > 0 && asset.price
          ? ((asset.price - asset.ath) / asset.ath) * 100
          : undefined,
      dayRange:
        asset.high24h !== undefined && asset.low24h !== undefined && asset.price
          ? ((asset.high24h - asset.low24h) / asset.price) * 100
          : undefined,
    },
  }))
}

/**
 * Lignes boursières — actions, ETF, fonds obligataires.
 *
 * Les trois marchés partagent cette fonction parce qu'ils partagent leur SOURCE : le
 * même endpoint rend les mêmes champs, et c'est le descripteur de marché qui décide
 * lesquels ont un sens à l'écran. Un ETF n'a pas de PER, une action n'a pas de frais
 * de gestion — et les deux absences se rendent d'elles-mêmes.
 *
 * ⚠️ AUCUN `href`. Nos fiches d'actif reposent sur `YAHOO_UNIVERSE`, une liste écrite à
 * la main d'une cinquantaine de symboles ; le screener en balaie mille. Lier chaque
 * ligne produirait des centaines de 404 — voir la note de la page.
 */
export function rowsFromYahoo(quotes: YahooScreenRow[]): ScreenerRow[] {
  return quotes.map((quote) => ({
    id: quote.symbol,
    symbol: quote.symbol,
    name: quote.name,
    ...(quote.currency ? { currency: quote.currency } : {}),
    ...(quote.exchange ? { meta: quote.exchange } : {}),
    values: {
      price: quote.price,
      change24h: quote.change24h,
      change52w: quote.change52w,
      ytdReturn: quote.ytdReturn,
      volume24h: quote.volume24h,
      averageVolume3m: quote.averageVolume3m,
      marketCap: quote.marketCap,
      peRatio: quote.peRatio,
      forwardPe: quote.forwardPe,
      priceToBook: quote.priceToBook,
      eps: quote.eps,
      dividendYield: quote.dividendYield,
      sharesOutstanding: quote.sharesOutstanding,
      expenseRatio: quote.expenseRatio,
      netAssets: quote.netAssets,
      yieldTtm: quote.yieldTtm,
      return3y: quote.return3y,
      return5y: quote.return5y,
      high52w: quote.high52w,
      low52w: quote.low52w,
      fromHigh52w: quote.fromHigh52w,
      fromAverage200d: quote.fromAverage200d,
    },
  }))
}

export function rowsFromExchanges(exchanges: SpotExchange[]): ScreenerRow[] {
  return exchanges.map((exchange) => ({
    id: exchange.id,
    symbol: exchange.id.toUpperCase(),
    name: exchange.name,
    href: `/places/${exchange.id}`,
    ...(exchange.image ? { image: exchange.image } : {}),
    ...(exchange.country ? { meta: exchange.country } : {}),
    values: {
      volumeBtc: exchange.volume24hBtc,
      trustScore: exchange.trustScore,
      trustRank: exchange.trustRank,
      /* L'ANNÉE DE CRÉATION est une donnée de confiance autant qu'un fait : une place
         ouverte en 2013 a traversé trois cycles, une place de l'an dernier non. */
      established: exchange.yearEstablished,
      /* L'ANCIENNETÉ en années, dérivée de l'année de création. Elle se filtre, là où
         une année de création se filtrerait à l'envers — « au moins 2015 » veut dire
         « au plus dix ans », ce que personne ne lit dans ce sens. */
      age:
        exchange.yearEstablished !== undefined
          ? new Date().getFullYear() - exchange.yearEstablished
          : undefined,
    },
  }))
}

export function rowsFromPools(pools: DexPool[]): ScreenerRow[] {
  return pools.map((pool) => {
    const trades = pool.trades24h
    const total = trades ? trades.buys + trades.sells : undefined

    return {
      id: pool.id,
      symbol: pool.name,
      name: pool.name,
      href: `/pools/${pool.network}/${pool.address}`,
      /* Le RÉSEAU en seconde ligne, et non le protocole : deux pools de même nom sur
         deux chaînes différentes ne sont pas le même marché, et c'est la première
         chose à distinguer. Le protocole vit dans une colonne. */
      meta: pool.dex ? `${pool.network} · ${pool.dex}` : pool.network,
      /* Les montants de GeckoTerminal sont TOUS en dollars, sans exception : la source
         ne cote pas en euro. Le déclarer ici évite qu'un convertisseur les prenne
         pour la devise du site. */
      currency: 'USD',
      values: {
        price: pool.priceUsd,
        change24h: pool.priceChange?.['h24'],
        change1h: pool.priceChange?.['h1'],
        change5m: pool.priceChange?.['m5'],
        volume24h: pool.volume24hUsd,
        liquidity: pool.liquidityUsd,
        fdv: pool.fdvUsd,
        marketCap: pool.marketCapUsd,
        fee: pool.feePercent,
        trades: total,
        buyers: trades?.buyers,
        sellers: trades?.sellers,
        /* Rapport achats/ventes : au-dessus de 1, plus d'achats que de ventes sur la
           journée. C'est le seul signal de DIRECTION qu'un décompte de transactions
           porte, et il est invisible sur les deux colonnes prises séparément. */
        buyRatio: trades && trades.sells > 0 ? trades.buys / trades.sells : undefined,
        /* Rotation d'un pool : volume rapporté à la réserve. Un pool à dix pour cent
           tourne lentement, un pool à mille pour cent est un lieu de spéculation. */
        turnover: turnover(pool.volume24hUsd, pool.liquidityUsd),
      },
    }
  })
}

/* ══════════════════════════════════════════════════════════════════════════════
   BARÈMES PARTAGÉS
   ══════════════════════════════════════════════════════════════════════════════ */

const CAP_STEPS = [0, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000, 100_000_000_000]
const VOLUME_STEPS = [0, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000]
const ASSETS_STEPS = [0, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000]

/** Colonnes réutilisées d'un marché à l'autre — définies une fois, citées partout. */
const PRICE: ScreenerColumn = { key: 'price', label: 'Prix', format: 'money' }
const CHANGE_24H: ScreenerColumn = { key: 'change24h', label: '24 h', format: 'change' }
const VOLUME: ScreenerColumn = { key: 'volume24h', label: 'Volume 24 h', format: 'moneyCompact' }
const MARKET_CAP: ScreenerColumn = {
  key: 'marketCap',
  label: 'Capitalisation',
  format: 'moneyCompact',
}

/* ══════════════════════════════════════════════════════════════════════════════
   LES SIX MARCHÉS
   ══════════════════════════════════════════════════════════════════════════════ */

const CRYPTO: ScreenerMarket = {
  id: 'crypto',
  label: 'Cryptomonnaies',
  title: 'Screener cryptomonnaies',
  lead: 'Filtrer le marché sur vos critères — capitalisation, volume, variation, rotation — parmi les 250 plus grandes capitalisations.',
  unit: 'cryptomonnaies',
  feminine: true,
  columnSets: [
    {
      id: 'apercu',
      label: 'Vue d’ensemble',
      hint: 'Cours, variations, taille',
      columns: [
        PRICE,
        CHANGE_24H,
        { key: 'change7d', label: '7 j', format: 'change', hideBelow: 'sm' },
        { ...VOLUME, hideBelow: 'md' },
        { ...MARKET_CAP, hideBelow: 'sm' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      hint: 'Variations et distance aux extrêmes',
      columns: [
        { key: 'change1h', label: '1 h', format: 'change' },
        CHANGE_24H,
        { key: 'change7d', label: '7 j', format: 'change' },
        { key: 'change30d', label: '30 j', format: 'change', hideBelow: 'sm' },
        {
          key: 'fromAth',
          label: 'Depuis le plus haut',
          hint: 'Écart entre le cours et le plus haut historique : (cours − plus haut) ÷ plus haut',
          format: 'change',
          hideBelow: 'md',
        },
      ],
    },
    {
      id: 'liquidite',
      label: 'Liquidité',
      hint: 'Ce qui s’échange réellement',
      columns: [
        VOLUME,
        {
          key: 'turnover',
          label: 'Rotation',
          hint: 'Volume 24 h ÷ capitalisation. Distingue un gros actif somnolent d’un petit actif très échangé.',
          format: 'percent',
        },
        {
          key: 'dayRange',
          label: 'Amplitude du jour',
          hint: 'Écart entre le plus haut et le plus bas des 24 h, rapporté au cours',
          format: 'percent',
          hideBelow: 'md',
        },
        MARKET_CAP,
        { ...PRICE, hideBelow: 'sm' },
      ],
    },
    {
      id: 'offre',
      label: 'Offre',
      hint: 'Ce qui circule et ce qui reste à émettre',
      columns: [
        { key: 'circulating', label: 'En circulation', format: 'compact' },
        {
          key: 'maxSupply',
          label: 'Offre maximale',
          hint: 'Absente quand le projet n’en fixe aucune — ce n’est pas un zéro.',
          format: 'compact',
          hideBelow: 'sm',
        },
        {
          key: 'issued',
          label: 'Part émise',
          hint: 'Offre en circulation ÷ offre maximale',
          format: 'percent',
          hideBelow: 'md',
        },
        { ...MARKET_CAP, hideBelow: 'sm' },
      ],
    },
  ],
  filters: [
    { key: 'marketCap', label: 'Capitalisation minimale', steps: CAP_STEPS, unit: '€' },
    { key: 'volume24h', label: 'Volume 24 h minimal', steps: VOLUME_STEPS, unit: '€' },
    { key: 'change24h', label: 'Variation 24 h minimale', min: -100, max: 50, step: 5, unit: '%' },
    { key: 'change7d', label: 'Variation 7 j minimale', min: -100, max: 100, step: 10, unit: '%' },
    { key: 'turnover', label: 'Rotation minimale', min: 0, max: 100, step: 5, unit: '%' },
  ],
  presets: [
    { id: 'tout', label: 'Tout', hint: 'Aucun filtre', thresholds: {} },
    {
      id: 'solides',
      label: 'Grandes capitalisations',
      hint: 'Au-dessus d’un milliard',
      thresholds: { marketCap: 1_000_000_000 },
    },
    {
      id: 'momentum',
      label: 'En hausse sur 7 jours',
      hint: 'Progression sur 24 h et sur 7 j',
      thresholds: { change24h: 0, change7d: 0 },
    },
    {
      id: 'liquides',
      label: 'Fortement échangés',
      hint: 'Rotation supérieure à 10 % de la capitalisation',
      thresholds: { turnover: 10 },
    },
  ],
}

const ACTIONS: ScreenerMarket = {
  id: 'actions',
  label: 'Actions',
  title: 'Screener actions',
  lead: 'Cribler un millier de valeurs sur leur cours, leur taille et leur valorisation — PER, cours sur actif net, rendement du dividende.',
  unit: 'actions',
  feminine: true,
  columnSets: [
    {
      id: 'apercu',
      label: 'Vue d’ensemble',
      hint: 'Cours, variation, taille',
      columns: [
        PRICE,
        CHANGE_24H,
        { ...VOLUME, label: 'Volume', format: 'compact', hideBelow: 'sm' },
        { ...MARKET_CAP, hideBelow: 'sm' },
        {
          key: 'peRatio',
          label: 'PER',
          hint: 'Cours rapporté au bénéfice par action des douze derniers mois. Absent quand la société perd de l’argent.',
          format: 'ratio',
          hideBelow: 'md',
        },
      ],
    },
    {
      id: 'valorisation',
      label: 'Valorisation',
      hint: 'Ce que le marché paie pour ce que la société gagne',
      columns: [
        { key: 'peRatio', label: 'PER', format: 'ratio' },
        {
          key: 'forwardPe',
          label: 'PER à terme',
          hint: 'Cours rapporté au bénéfice ATTENDU. Un écart marqué avec le PER courant dit ce que le marché anticipe.',
          format: 'ratio',
        },
        {
          key: 'priceToBook',
          label: 'Cours / actif net',
          hint: 'Cours rapporté aux capitaux propres par action',
          format: 'ratio',
          hideBelow: 'sm',
        },
        { key: 'eps', label: 'BPA', hint: 'Bénéfice par action sur douze mois glissants', format: 'money', hideBelow: 'md' },
        { key: 'dividendYield', label: 'Rendement', format: 'percent', hideBelow: 'sm' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      hint: 'Le chemin parcouru, du jour aux douze mois',
      columns: [
        CHANGE_24H,
        { key: 'change52w', label: '52 semaines', format: 'change' },
        {
          key: 'fromHigh52w',
          label: 'Depuis le sommet',
          hint: 'Écart au plus haut des 52 semaines',
          format: 'change',
          hideBelow: 'sm',
        },
        {
          key: 'fromAverage200d',
          label: 'vs moyenne 200 j',
          hint: 'Écart à la moyenne mobile 200 jours — au-dessus, la tendance de fond est haussière',
          format: 'change',
          hideBelow: 'md',
        },
        { ...PRICE, hideBelow: 'sm' },
      ],
    },
    {
      id: 'liquidite',
      label: 'Liquidité',
      hint: 'Ce qui s’échange, et ce qui existe',
      columns: [
        { key: 'volume24h', label: 'Volume du jour', format: 'compact' },
        {
          key: 'averageVolume3m',
          label: 'Volume moyen 3 mois',
          hint: 'La mesure de liquidité qui ne dépend pas de la séance du jour',
          format: 'compact',
        },
        { key: 'sharesOutstanding', label: 'Actions émises', format: 'compact', hideBelow: 'sm' },
        { ...MARKET_CAP, hideBelow: 'md' },
      ],
    },
  ],
  filters: [
    { key: 'marketCap', label: 'Capitalisation minimale', steps: CAP_STEPS, unit: '$' },
    { key: 'volume24h', label: 'Volume minimal', steps: VOLUME_STEPS, unit: 'titres' },
    { key: 'change24h', label: 'Variation du jour minimale', min: -50, max: 50, step: 5, unit: '%' },
    {
      key: 'peRatio',
      label: 'PER maximal',
      min: 0,
      max: 100,
      step: 5,
      unit: '×',
      direction: 'max',
    },
    { key: 'dividendYield', label: 'Rendement minimal', min: 0, max: 15, step: 1, unit: '%' },
  ],
  presets: [
    { id: 'tout', label: 'Tout', hint: 'Aucun filtre', thresholds: {} },
    {
      id: 'grandes',
      label: 'Grandes capitalisations',
      hint: 'Au-dessus de dix milliards',
      thresholds: { marketCap: 10_000_000_000 },
    },
    {
      id: 'value',
      label: 'Peu chères',
      hint: 'PER inférieur à 15, capitalisation supérieure au milliard',
      thresholds: { peRatio: 15, marketCap: 1_000_000_000 },
    },
    {
      id: 'rendement',
      label: 'À dividende',
      hint: 'Rendement d’au moins 3 %',
      thresholds: { dividendYield: 3 },
    },
    {
      id: 'hausse',
      label: 'En hausse aujourd’hui',
      hint: 'Séance positive',
      thresholds: { change24h: 0 },
    },
  ],
}

const ETF: ScreenerMarket = {
  id: 'etf',
  label: 'ETF',
  title: 'Screener ETF',
  lead: 'Comparer des fonds indiciels sur ce qui les distingue réellement : leurs frais, leur encours et leur performance à trois et cinq ans.',
  unit: 'ETF',
  columnSets: [
    {
      id: 'apercu',
      label: 'Vue d’ensemble',
      hint: 'Cours, variation, taille du fonds',
      columns: [
        PRICE,
        CHANGE_24H,
        { key: 'netAssets', label: 'Encours', format: 'moneyCompact', hideBelow: 'sm' },
        {
          key: 'expenseRatio',
          label: 'Frais',
          hint: 'Frais courants annuels, prélevés sur l’actif du fonds',
          format: 'percent',
        },
        { key: 'ytdReturn', label: 'Depuis janv.', format: 'change', hideBelow: 'md' },
      ],
    },
    {
      id: 'cout',
      label: 'Coût et rendement',
      hint: 'Ce que le fonds prend, et ce qu’il verse',
      columns: [
        { key: 'expenseRatio', label: 'Frais courants', format: 'percent' },
        {
          key: 'yieldTtm',
          label: 'Distribution 12 mois',
          hint: 'Rendement effectivement distribué sur douze mois glissants',
          format: 'percent',
        },
        { key: 'dividendYield', label: 'Rendement affiché', format: 'percent', hideBelow: 'sm' },
        { key: 'netAssets', label: 'Encours', format: 'moneyCompact', hideBelow: 'md' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      hint: 'Le seul jeu de colonnes qui juge un fonds sur la durée',
      columns: [
        { key: 'ytdReturn', label: 'Depuis janv.', format: 'change' },
        { key: 'change52w', label: '52 semaines', format: 'change' },
        {
          key: 'return3y',
          label: '3 ans / an',
          hint: 'Performance annualisée sur trois ans, calculée sur la valeur liquidative',
          format: 'change',
          hideBelow: 'sm',
        },
        { key: 'return5y', label: '5 ans / an', format: 'change', hideBelow: 'md' },
      ],
    },
  ],
  filters: [
    { key: 'netAssets', label: 'Encours minimal', steps: ASSETS_STEPS, unit: '$' },
    {
      key: 'expenseRatio',
      label: 'Frais maximaux',
      min: 0,
      max: 2,
      step: 0.05,
      unit: '%',
      direction: 'max',
    },
    { key: 'yieldTtm', label: 'Distribution minimale', min: 0, max: 15, step: 0.5, unit: '%' },
    { key: 'return3y', label: 'Performance 3 ans minimale', min: -20, max: 40, step: 5, unit: '%' },
  ],
  presets: [
    { id: 'tout', label: 'Tout', hint: 'Aucun filtre', thresholds: {} },
    {
      id: 'peu-chers',
      label: 'Frais réduits',
      hint: 'Moins de 0,20 % par an',
      thresholds: { expenseRatio: 0.2 },
    },
    {
      id: 'gros',
      label: 'Encours importants',
      hint: 'Au-dessus du milliard',
      thresholds: { netAssets: 1_000_000_000 },
    },
    {
      id: 'distribution',
      label: 'Distribuants',
      hint: 'Au moins 3 % versés sur douze mois',
      thresholds: { yieldTtm: 3 },
    },
  ],
}

const OBLIGATIONS: ScreenerMarket = {
  id: 'obligations',
  label: 'Obligations',
  title: 'Screener obligataire',
  lead: 'Des fonds investis en obligations à haut rendement — pas des titres obligataires. La distinction est expliquée sous le tableau.',
  unit: 'fonds',
  columnSets: [
    {
      id: 'apercu',
      label: 'Vue d’ensemble',
      hint: 'Valeur liquidative, frais, rendement',
      columns: [
        { ...PRICE, label: 'Valeur liquidative' },
        {
          key: 'yieldTtm',
          label: 'Distribution 12 mois',
          hint: 'Rendement effectivement distribué sur douze mois glissants',
          format: 'percent',
        },
        { key: 'expenseRatio', label: 'Frais', format: 'percent', hideBelow: 'sm' },
        { key: 'ytdReturn', label: 'Depuis janv.', format: 'change', hideBelow: 'md' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      hint: 'Ce qu’un fonds obligataire a réellement rendu',
      columns: [
        { key: 'ytdReturn', label: 'Depuis janv.', format: 'change' },
        { key: 'return3y', label: '3 ans / an', format: 'change' },
        { key: 'return5y', label: '5 ans / an', format: 'change', hideBelow: 'sm' },
        { key: 'expenseRatio', label: 'Frais', format: 'percent', hideBelow: 'md' },
      ],
    },
  ],
  filters: [
    {
      key: 'expenseRatio',
      label: 'Frais maximaux',
      min: 0,
      max: 3,
      step: 0.1,
      unit: '%',
      direction: 'max',
    },
    { key: 'yieldTtm', label: 'Distribution minimale', min: 0, max: 15, step: 0.5, unit: '%' },
    { key: 'return3y', label: 'Performance 3 ans minimale', min: -20, max: 20, step: 2, unit: '%' },
  ],
  presets: [
    { id: 'tout', label: 'Tout', hint: 'Aucun filtre', thresholds: {} },
    {
      id: 'distribution',
      label: 'Haut rendement',
      hint: 'Au moins 6 % distribués',
      thresholds: { yieldTtm: 6 },
    },
    {
      id: 'peu-chers',
      label: 'Frais réduits',
      hint: 'Moins de 0,70 % par an',
      thresholds: { expenseRatio: 0.7 },
    },
  ],
}

const CEX: ScreenerMarket = {
  id: 'cex',
  label: 'Places centralisées',
  title: 'Screener des places centralisées',
  lead: 'Les plateformes d’échange dépositaires, classées sur leur volume et sur la note de confiance publiée par la source.',
  unit: 'places',
  feminine: true,
  columnSets: [
    {
      id: 'apercu',
      label: 'Vue d’ensemble',
      hint: 'Volume, confiance, ancienneté',
      columns: [
        {
          key: 'volumeBtc',
          label: 'Volume 24 h',
          hint: 'Publié en BITCOIN par la source. Le convertir supposerait de choisir un cours et un instant.',
          format: 'compact',
          unit: 'BTC',
        },
        {
          key: 'trustScore',
          label: 'Confiance',
          hint: 'Note de 1 à 10 publiée par la source — ce n’est pas notre évaluation.',
          format: 'ratio',
        },
        { key: 'trustRank', label: 'Rang de confiance', format: 'count', hideBelow: 'sm' },
        { key: 'established', label: 'Ouverture', format: 'year', hideBelow: 'md' },
        { key: 'age', label: 'Ancienneté', format: 'count', unit: 'ans', hideBelow: 'md' },
      ],
    },
  ],
  filters: [
    { key: 'volumeBtc', label: 'Volume minimal', steps: [0, 10, 100, 1_000, 10_000], unit: 'BTC' },
    { key: 'trustScore', label: 'Confiance minimale', min: 0, max: 10, step: 1, unit: '/10' },
    { key: 'age', label: 'Ancienneté minimale', min: 0, max: 15, step: 1, unit: ' ans' },
  ],
  presets: [
    { id: 'tout', label: 'Tout', hint: 'Aucun filtre', thresholds: {} },
    {
      id: 'confiance',
      label: 'Confiance élevée',
      hint: 'Note d’au moins 8 sur 10',
      thresholds: { trustScore: 8 },
    },
    {
      id: 'etablies',
      label: 'Établies',
      hint: 'Ouvertes il y a au moins cinq ans',
      thresholds: { age: 5 },
    },
  ],
}

const DEX: ScreenerMarket = {
  id: 'dex',
  label: 'Places décentralisées',
  title: 'Screener des pools décentralisés',
  lead: 'Les pools d’échange on-chain, toutes chaînes confondues — réserve, volume, frais et flux de transactions.',
  unit: 'pools',
  columnSets: [
    {
      id: 'apercu',
      label: 'Vue d’ensemble',
      hint: 'Cours, variation, profondeur',
      columns: [
        PRICE,
        CHANGE_24H,
        {
          key: 'liquidity',
          label: 'Réserve',
          hint: 'Ce que le pool contient réellement — la mesure de sa profondeur',
          format: 'moneyCompact',
        },
        { ...VOLUME, hideBelow: 'sm' },
        { key: 'fee', label: 'Frais', format: 'percent', hideBelow: 'md' },
      ],
    },
    {
      id: 'activite',
      label: 'Activité',
      hint: 'Qui échange, et dans quel sens',
      columns: [
        { key: 'trades', label: 'Transactions 24 h', format: 'count' },
        { key: 'buyers', label: 'Acheteurs', format: 'count' },
        { key: 'sellers', label: 'Vendeurs', format: 'count', hideBelow: 'sm' },
        {
          key: 'buyRatio',
          label: 'Achats / ventes',
          hint: 'Au-dessus de 1, plus d’achats que de ventes sur la journée',
          format: 'ratio',
          hideBelow: 'md',
        },
      ],
    },
    {
      id: 'liquidite',
      label: 'Liquidité',
      hint: 'Ce qui tourne par rapport à ce qui dort',
      columns: [
        { key: 'liquidity', label: 'Réserve', format: 'moneyCompact' },
        VOLUME,
        {
          key: 'turnover',
          label: 'Rotation',
          hint: 'Volume 24 h ÷ réserve. Un pool à 1 000 % est un lieu de spéculation, pas de dépôt.',
          format: 'percent',
        },
        { key: 'fdv', label: 'Valorisation diluée', format: 'moneyCompact', hideBelow: 'md' },
      ],
    },
  ],
  filters: [
    {
      key: 'liquidity',
      label: 'Réserve minimale',
      steps: [0, 10_000, 100_000, 1_000_000, 10_000_000],
      unit: '$',
    },
    { key: 'volume24h', label: 'Volume minimal', steps: VOLUME_STEPS, unit: '$' },
    { key: 'change24h', label: 'Variation 24 h minimale', min: -100, max: 100, step: 10, unit: '%' },
    { key: 'trades', label: 'Transactions minimales', min: 0, max: 5_000, step: 250, unit: '' },
  ],
  presets: [
    { id: 'tout', label: 'Tout', hint: 'Aucun filtre', thresholds: {} },
    {
      id: 'profonds',
      label: 'Pools profonds',
      hint: 'Au moins un million de réserve',
      thresholds: { liquidity: 1_000_000 },
    },
    {
      id: 'actifs',
      label: 'Très actifs',
      hint: 'Plus de mille transactions sur 24 h',
      thresholds: { trades: 1_000 },
    },
    {
      id: 'hausse',
      label: 'En hausse',
      hint: 'Cours en progression sur 24 h',
      thresholds: { change24h: 0 },
    },
  ],
}

/**
 * L'ORDRE DES ONGLETS suit celui de la référence, et il n'est pas alphabétique.
 *
 * Actions d'abord parce que c'est le marché le plus large ; crypto au milieu parce que
 * c'est le nôtre ; les deux familles de places à la fin parce qu'elles ne recensent pas
 * des actifs mais des LIEUX où on les échange — une catégorie à part, qu'on ne consulte
 * pas dans le même geste.
 */
export const SCREENER_MARKETS: ScreenerMarket[] = [
  ACTIONS,
  ETF,
  OBLIGATIONS,
  CRYPTO,
  CEX,
  DEX,
]

export const DEFAULT_MARKET: ScreenerMarketId = 'crypto'

/**
 * Résout l'identifiant venu de l'URL.
 *
 * Un identifiant inconnu retombe sur la crypto plutôt que de rendre une page vide : le
 * paramètre vient de l'URL, donc de n'importe où.
 */
export function readMarket(raw: string | string[] | undefined): ScreenerMarket {
  const value = Array.isArray(raw) ? raw[0] : raw
  return (
    SCREENER_MARKETS.find((market) => market.id === value) ??
    (SCREENER_MARKETS.find((market) => market.id === DEFAULT_MARKET) as ScreenerMarket)
  )
}
