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
  '/a-propos':
    'ZENKUU is a read-only multi-asset market analysis platform: not a broker, not an exchange, not an investment adviser.',
  '/aide':
    'Frequently asked questions about ZENKUU data, how fresh it is, the charts, and the limits of what the site displays.',
  '/bien-demarrer':
    'Get started with ZENKUU in a few minutes: find an asset, read its page, switch currency, and understand the limits of the data on display.',
  '/classements':
    'Biggest gainers, biggest losers, highest volumes and strongest turnover, from 1 hour to 30 days.',
  '/comparateur':
    'Compare two to six assets across every class — cryptocurrencies, stocks, ETFs, indices, commodities, currencies: paths rebased to a common start, then the figures that set them apart.',
  '/convertisseur':
    'Convert an amount between a cryptocurrency, a stock, an ETF, an index or a commodity and five currencies, at the latest price received.',
  '/heatmap':
    'The crypto market in a single figure, by coin or by sector: area carries market cap, colour carries change.',
  '/macro':
    'Inflation, unemployment, growth, government debt and real interest rates, country by country, from World Bank series.',
  '/crypto':
    'The seven markets Zenkuu tracks on a single page: cryptocurrencies, derivatives, ETFs, stocks, indices, currencies and commodities.',
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
}
