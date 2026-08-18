import type { Translation } from './index'
import { enPhrases } from './phrases/en'

/**
 * Interface strings — English.
 *
 * Complete: every key of the French reference is translated. Typed as `Translation`,
 * so the compiler rejects a key that does not exist in `content/fr.ts` — a typo
 * cannot slip through silently — while still allowing a partial file, which is what
 * makes incremental translation practical for the languages that follow.
 *
 * ── WHAT IS DELIBERATELY NOT TRANSLATED ───────────────────────────────────────
 *
 * `footer.poweredByCoinGecko` is a contractual attribution required by CoinGecko's
 * terms. It is not interface copy, and translating it would not satisfy the
 * obligation — it is inherited from the French file untouched.
 *
 * ── SCALE ABBREVIATIONS ───────────────────────────────────────────────────────
 *
 * Amounts are not formatted here (see `packages/ui/src/format.ts`), which is why no
 * "Md"/"B" appears in these strings. The one place the distinction leaks into copy
 * is where a figure is spelled out in a sentence, and those go through the formatter
 * too.
 */
const en: Translation = {
  phrases: enPhrases,

  site: {
    name: 'Zenkuu',
    tagline: 'Multi-asset market tracking and analysis',
    description:
      'Cryptocurrencies, forex, stocks, ETFs, commodities and indices — prices, market caps and trends in one place. Read-only analysis platform.',
  },

  nav: {
    home: 'Home',
    soon: 'Coming soon',
    soonShort: 'Soon',
    openMenu: 'Open menu',
    searchPlaceholder: 'Search an asset',
    searchSoon: 'Universal search arrives with the next asset classes.',
    skipToContent: 'Skip to main content',
  },

  search: {
    title: 'Universal search',
    open: 'Open search',
    close: 'Close search',
    placeholder: 'Search an asset, a symbol…',
    trendingTitle: 'Trending',
    trendingHint: 'most viewed in the last 24h',
    trendingEmpty: 'Trending temporarily unavailable.',
    otherAssets: 'Stocks, ETFs, indices and commodities',
    loading: 'Searching…',
    noResult: (query: string) => `No asset matches “${query}”.`,
    cryptoUnavailable:
      'The crypto source is temporarily saturated. The other asset classes remain available.',
    hint: 'Ctrl + K to reopen search',
  },

  locale: {
    open: 'Language and currency',
    language: 'Language',
    languageHint:
      'The site is published in French and English. Other languages will follow as translation files land — we would rather offer nothing than machine translation.',
    currency: 'Local currency',
    currencyHint: (date: string) =>
      `Converted at the ECB reference rate of ${date}. Sources quote in euros; the chosen currency applies across the whole site.`,
    search: 'Search',
    noMatch: 'No currency matches.',
    convertedFrom: (from: string, date: string) => `converted from ${from} · ECB rate of ${date}`,
  },

  auth: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    unavailableTitle: 'Accounts coming soon',
    unavailableBody:
      'Authentication is not configured on this instance yet. Accounts will make the watchlist persistent and unlock price alerts and display preferences.',
    signInTitle: 'Sign in to ZENKUU',
    signInSubtitle: 'Find your watchlist and your preferences again.',
    signUpTitle: 'Create a ZENKUU account',
    signUpSubtitle: 'Free. No payment details asked — ZENKUU handles neither funds nor trades.',

    close: 'Close',
    overlaySignInTitle: 'Welcome to ZENKUU',
    overlaySignInSubtitle: 'Sign in or sign up in seconds.',
    overlaySignUpTitle: 'Create your account',
    overlaySignUpSubtitle: 'Free, no payment details.',
    switchToSignUp: 'No account yet?',
    switchToSignIn: 'Already have an account?',

    benefitsTitle: 'What an account gives you',
    benefits: [
      'Your watchlist kept and found again on every device',
      'Display currency and theme remembered',
      'Your settings applied on arrival, with nothing to set up again',
    ],
    benefitsNote:
      'ZENKUU executes no orders, holds no funds and resells no data. An account only exists to find your settings again.',
    legalPrefix: 'By continuing, you accept our terms of use, described',
    legalLink: 'on the About page',
  },

  theme: {
    switchToDark: 'Switch to dark theme',
    switchToLight: 'Switch to light theme',
  },

  pages: {
    home: 'Home',
    crypto: 'Cryptocurrencies',
    forex: 'Currencies',
    stocks: 'Stocks',
    etf: 'ETFs',
    commodities: 'Commodities',
    indices: 'Indices',
    categories: 'Categories',
    news: 'News',
    sentiment: 'Market sentiment',
    movers: 'Gainers and losers',
    notFound: 'Page not found',
    learn: 'Learn',
    getStarted: 'Getting started',
    blog: 'Blog',
    methodology: 'Methodology & sources',
    developers: 'API & developers',
    help: 'Help centre',
    changelog: 'What’s new',
    about: 'About',
  },

  globalStats: {
    marketCap: 'Total market cap',
    volume: 'Volume 24h',
    dominanceBtc: 'BTC dominance',
    dominanceEth: 'ETH dominance',
    activeAssets: 'Active cryptos',
    unavailable: 'Global statistics temporarily unavailable',
    caption: (value: string, change: string) =>
      `The global cryptocurrency market cap stands at ${value}, that is ${change} over the last 24 hours.`,
  },

  home: {
    trendingTitle: 'Trending',
    gainersTitle: 'Top gainers',
    losersTitle: 'Top losers',
    moversHint: (size: number) => `Among the ${size} largest market caps`,
    topMarketCapTitle: 'Top market caps',
    marketCapCardTitle: 'Market capitalisation',
    marketCapSeriesLabel: (minutes: number) =>
      `Total market cap over the last ${minutes} minutes`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `ZENKUU readings over ${Math.round(minutes / 60)}h`
        : `ZENKUU readings over ${minutes} min`,
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Curve still building: no free source publishes the history of global market cap, so we record our own readings.'
        : `Curve still building — ${count} reading${count > 1 ? 's' : ''} recorded. We plot our own measurements, for want of a free source for this history.`,
    volumeCardTitle: 'Traded volume 24h',
    narrativesTitle: 'Most active sectors · 24h',
    newsTitle: 'Latest news',
    sentimentTitle: 'Market sentiment',
    coverageTitle: 'Coverage by asset class',
    forexTitle: 'Currencies · ECB reference',
    forexHint: 'Rates published once per business day',
    watchlistTitle: 'My watchlist',
    watchlistEmptyTitle: 'Your watchlist is empty',
    watchlistEmptyBody:
      'Assets added from an asset page will appear here. The list is tied to your account.',
    seeAll: 'See all',
    tabs: {
      all: 'All',
      trending: 'Trending',
      gainers: 'Gainers',
      losers: 'Losers',
      categories: 'Categories',
    },
  
    summaryTitle: "Market summary",
    topIndicesTitle: "Leading indices",
    volumeLeadersTitle: "Highest volumes",
    economyTitle: "Economy",
    heroMarketCap: "Crypto market cap",
    heroLoading: "Loading the series…",
    heroUnavailable: "Series temporarily unavailable.",
  },

  market: {
    columns: {
      rank: '#',
      name: 'Asset',
      price: 'Price',
      change1h: '1h',
      change24h: '24h',
      change7d: '7d',
      volume: 'Volume 24h',
      marketCap: 'Market cap',
      chart: '7 days',
      variation: 'Change',
      watch: 'Watch',
      dayRange: '24h low / high',
    },
    sortByMarketCap: 'Sort by market cap',
    sortByVolume: 'Sort by volume',
    sortNotSupported:
      'Sorting applies to the whole ranking. Change columns are not sortable: the source does not allow it across the entire market.',
    previous: 'Previous page',
    next: 'Next page',
    pageLabel: (page: number) => `Page ${page}`,
    emptyPage: 'No asset on this page of the ranking. Go back to the first page.',
  },

  crypto: {
    title: 'Cryptocurrency ranking',
    subtitle: 'Price, market cap and volume in euros, refreshed every 5 minutes.',
  },

  forex: {
    title: 'Exchange rates',
    subtitle: 'Reference rates published by the European Central Bank, once per business day.',
  },

  stocks: {
    title: 'Stocks',
    subtitle: 'Prices and market caps of the main listed companies.',
  },

  etf: {
    title: 'ETFs',
    subtitle: 'Exchange-traded funds: price, change and volume.',
  },

  commodities: {
    title: 'Commodities',
    subtitle: 'Energy, precious and industrial metals, agricultural products.',
  },

  indices: {
    title: 'Stock indices',
    subtitle: 'The major global indices and their recent moves.',
  },

  asset: {
    priceLabel: (name: string) => `${name} price`,
    statsTitle: 'Market statistics',
    aboutTitle: (name: string) => `About ${name}`,
    similarTitle: 'Comparable assets',
    rangeTitle: 'Period',
    ranges: { d1: '24h', d7: '7d', d30: '30d', d90: '90d', y1: '1y' },
    chart: {
      kindTitle: 'Chart type',
      kinds: {
        area: 'Area',
        line: 'Line',
        baseline: 'Baseline',
        candles: 'Candles',
        bars: 'Bars',
      },
      optionsTitle: 'Display',
      volume: 'Volume',
      movingAverage: 'Moving average',
      priceLines: 'Extremes',
      loadingCandles: 'Loading candles…',
      candlesUnavailable:
        'This source publishes no candles for this asset — the Candles and Bars views are therefore unavailable.',
      volumeUnavailable: 'Volume not published by the source for this period.',
    },
    tabs: {
      overview: 'Chart',
      history: 'Performance',
      stats: 'Statistics',
      about: 'About',
      faq: 'FAQ',
    },
    currencyLabel: 'Display currency',
    convertedNotice: (from: string, to: string, date: string) =>
      `Amounts converted from ${from} to ${to} at the ECB reference rate of ${date}. The source quotes this asset in ${from}.`,
    loadingSeries: 'Loading series…',
    performanceTitle: 'Performance by period',
    performanceNote:
      'Changes computed on the one-year series loaded for this asset; the 24h figure is taken from the source as published.',
    rangeYearTitle: 'One-year extremes',
    lowest: 'Low',
    highest: 'High',
    faq: {
      priceQ: (name: string) => `What is the price of ${name} today?`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} trades at ${price}. Last value published by our source on ${updated}.`,
      capQ: (name: string) => `What is the market cap of ${name}?`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `Its market cap stands at ${cap}, which places it at rank ${rank} in its asset class.`
          : `Its market cap stands at ${cap}.`,
      athQ: (name: string) => `What is the all-time high of ${name}?`,
      athA: (price: string, date: string | null) =>
        date
          ? `Its all-time high is ${price}, reached on ${date}.`
          : `Its all-time high is ${price}.`,
      supplyQ: (name: string) => `How many units of ${name} will exist at most?`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `Maximum supply is ${max} ${symbol}, of which ${circulating} ${symbol} are currently circulating.`
          : `Maximum supply is ${max} ${symbol}.`,
      buyQ: (name: string) => `Can I buy ${name} on ZENKUU?`,
      buyA:
        'No. ZENKUU is an information platform: we execute no orders, hold no funds and are neither a broker nor an exchange.',
    },
    stats: {
      marketCap: 'Market cap',
      volume: 'Volume 24h',
      circulating: 'Circulating supply',
      total: 'Total supply',
      max: 'Max supply',
      ath: 'All-time high',
      atl: 'All-time low',
      rank: 'Rank',
      low24h: '24h low',
      high24h: '24h high',
      previousClose: 'Previous close',
      exchange: 'Listing venue',
      high52w: '52-week high',
      low52w: '52-week low',
    },
    noDescription: 'No description is provided by the source for this asset.',
    readOnly: 'Information page only. ZENKUU allows no buying, selling or order placing.',
    officialLinks: 'Official links',
    website: 'Official website',
    notFoundTitle: 'Asset not found',
    notFoundBody: 'This identifier matches no asset known to our sources.',
    backToRanking: 'Back to the ranking',
    chartUnavailable: 'Price history unavailable for this asset.',
  },

  categories: {
    title: 'Categories and sectors',
    subtitle: 'Performance of the major crypto market narratives over 24 hours.',
    columns: { name: 'Category', marketCap: 'Market cap', change: '24h', volume: 'Volume 24h' },
  },

  news: {
    title: 'Market news',
    subtitle: 'Aggregated from the public feeds of the main publishers.',
    readOn: (source: string) => `Read on ${source}`,
    unavailable: 'News feed temporarily unavailable.',
  },

  sentiment: {
    title: 'Fear & Greed index',
    subtitle:
      'A composite measure of crypto market sentiment, from 0 (extreme fear) to 100 (extreme greed).',
    scale: {
      extremeFear: 'Extreme fear',
      fear: 'Fear',
      neutral: 'Neutral',
      greed: 'Greed',
      extremeGreed: 'Extreme greed',
    },
    disclaimer:
      'A sentiment indicator, not a recommendation. It predicts no price move whatsoever.',
  },

  assetClass: {
    crypto: 'Cryptocurrencies',
    forex: 'Currencies',
    stock: 'Stocks',
    etf: 'ETFs',
    commodity: 'Commodities',
    index: 'Indices',
    nft: 'NFTs',
  },

  states: {
    unavailableTitle: 'Data unavailable',
    connected: 'Connected',
    pending: 'To be connected',
  },

  footer: {
    positioning: 'Information platform, with no order execution and no custody of funds.',
    community: 'Community',
    locale: 'English · EUR',
    localeHint:
      'The site is published in French and English, with the euro as reference currency. More languages and currencies will follow.',
    disclaimer:
      'ZENKUU is a read-only information platform. No buying, selling or wallet-connection feature. The information shown does not constitute investment advice.',
    dataNote: 'Market data provided by public sources, refreshed every 5 minutes.',
    // `poweredByCoinGecko` is deliberately absent: it is a contractual attribution
    // that must stay in English, and it is inherited from the French file.
    rights: (year: number) => `© ${year} ZENKUU`,
  },

  placeholder: {
    plannedTitle: 'What this page will contain',
    meanwhileTitle: 'In the meantime',
    meanwhileBody:
      'The Methodology page already details where our figures come from, how often they are refreshed, and what we do not show for want of a source.',
    meanwhileCta: 'See the methodology',
  },

  notFound: {
    title: 'This summit does not exist',
    body: 'The page you are looking for has moved or never existed. Start the climb again from the home page.',
    cta: 'Back to home',
  },
}

export default en
