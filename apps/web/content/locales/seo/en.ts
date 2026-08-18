import type { SeoDescriptions } from '@/content/seo'

/**
 * Page descriptions — English.
 *
 * Keyed by canonical route; see `content/seo.ts`. These strings are never rendered:
 * they land in `<meta name="description">` and are read by search engines only, which
 * is why length matters more than tone — beyond roughly 160 characters a result
 * snippet gets cut, so the first sentence has to stand alone.
 *
 * `ZENKUU` is the product name and stays as it is in every language.
 */
export const enSeo: SeoDescriptions = {
  '/mouvements':
    'Macro view, spot venues, derivatives and change rankings for the crypto market: market cap, dominance, volume per platform, open interest, funding rates, biggest gainers and losers.',
  '/points-marquants':
    'What is moving on the crypto market today: trending assets, biggest gainers and losers, highest volumes, leading sectors and recent listings.',
  '/a-propos':
    'ZENKUU is a read-only multi-asset market analysis platform: not a broker, not an exchange, not an investment adviser.',
  '/aide':
    'Frequently asked questions about ZENKUU data, how fresh it is, the charts, and the limits of what the site displays.',
  '/apprendre':
    'Understand what you are looking at: market cap, volume, supply, candlesticks, moving averages and sentiment indices — explained without jargon.',
  '/bien-demarrer':
    'Get started with ZENKUU in a few minutes: find an asset, read its page, switch currency, and understand the limits of the data on display.',
  '/blog':
    'The ZENKUU blog — method, product, markets and behind the scenes. How the numbers are collected, checked and displayed.',
  '/classements':
    'Biggest gainers, biggest losers, highest volumes and strongest turnover, from 1 hour to 30 days.',
  '/comparateur':
    'Compare two to six assets across every class — cryptocurrencies, stocks, ETFs, indices, commodities, currencies: paths rebased to a common start, then the figures that set them apart.',
  '/convertisseur':
    'Convert an amount between a cryptocurrency, a stock, an ETF, an index or a commodity and five currencies, at the latest price received.',
  '/developpeurs':
    'ZENKUU internal routes, the public data sources in use, and the honest state of a public ZENKUU API.',
  '/heatmap':
    'The crypto market in a single figure, by coin or by sector: area carries market cap, colour carries change.',
  '/macro':
    'Inflation, unemployment, growth, government debt and real interest rates, country by country, from World Bank series.',
  '/marches':
    'The seven markets Zenkuu tracks on a single page: cryptocurrencies, derivatives, ETFs, stocks, indices, currencies and commodities.',
  '/methodologie':
    'Where the numbers on ZENKUU come from, how often they are refreshed, and what we choose not to display for lack of a reliable source.',
  '/nouveautes':
    'Changelog for ZENKUU: features shipped, data sources added and known limits.',
  '/nouvelles-cotations':
    'The most recently listed cryptocurrencies: price, market cap, volume and the date of the earliest known price reading.',
  '/perpetuels':
    'Perpetual futures venues ranked by open interest: exposure carried, 24-hour volume, turnover, number of contracts. Decentralised and custodial platforms shown apart. ZENKUU lists no order book and enables no trading.',
  '/places':
    'The hundred leading spot exchanges ranked by trust score: reported 24-hour volume, share of displayed volume, country. ZENKUU lists no order book and enables no trading.',
  '/pourquoi-zenkuu':
    'Multi-asset, free, read-only and with no invented data: the choices that set ZENKUU apart from existing market trackers.',
  '/widgets':
    'Ticker strip, converter and compact ranking — native ZENKUU widgets, embeddable in a third-party page.',
}
