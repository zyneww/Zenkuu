import type { Translation } from './index'

/**
 * Interfaceteksten — Nederlands.
 *
 * Bewuste gedeeltelijke vertaling : zie `it.ts` voor de redenering. De secties die op
 * ELKE pagina staan zijn vertaald ; de lange, gespecialiseerde secties vallen terug op
 * het Engels, dat `content/locales/index.ts` vóór het Frans plaatst.
 */
const nl: Translation = {
  site: {
    name: 'Zenkuu',
    tagline: 'Multi-asset marktvolging en -analyse',
    description:
      'Cryptovaluta, valuta, aandelen, ETF’s, grondstoffen en indices — koersen, marktkapitalisaties en trends op één plek. Alleen-lezen platform.',
  },

  nav: {
    home: 'Home',
    soon: 'Binnenkort beschikbaar',
    soonShort: 'Binnenkort',
    openMenu: 'Menu openen',
    searchPlaceholder: 'Zoek een asset',
    searchSoon: 'Universeel zoeken komt met de volgende activaklassen.',
    skipToContent: 'Naar de hoofdinhoud',
  },

  search: {
    title: 'Universeel zoeken',
    open: 'Zoeken openen',
    close: 'Zoeken sluiten',
    placeholder: 'Zoek een asset, een symbool…',
    trendingTitle: 'Trending',
    trendingHint: 'meest bekeken in de afgelopen 24 uur',
    trendingEmpty: 'Trending tijdelijk niet beschikbaar.',
    otherAssets: 'Aandelen, ETF’s, indices en grondstoffen',
    loading: 'Bezig met zoeken…',
    noResult: (query: string) => `Geen enkel asset komt overeen met « ${query} ».`,
    cryptoUnavailable:
      'De cryptobron is tijdelijk verzadigd. De overige activaklassen blijven raadpleegbaar.',
    hint: 'Ctrl + K om opnieuw te zoeken',
  },

  locale: {
    open: 'Taal en valuta',
    language: 'Taal',
    currency: 'Lokale valuta',
    search: 'Zoeken',
    noMatch: 'Geen enkele valuta komt overeen.',
  },

  theme: {
    switchToDark: 'Naar donker thema',
    switchToLight: 'Naar licht thema',
  },

  pages: {
    home: 'Home',
    crypto: 'Cryptovaluta',
    forex: 'Valuta',
    stocks: 'Aandelen',
    etf: 'ETF’s',
    commodities: 'Grondstoffen',
    indices: 'Indices',
    categories: 'Categorieën',
    news: 'Nieuws',
    sentiment: 'Marktsentiment',
    movers: 'Stijgers en dalers',
    notFound: 'Pagina niet gevonden',
    learn: 'Leren',
    getStarted: 'Aan de slag',
    blog: 'Blog',
    methodology: 'Methodologie en bronnen',
    developers: 'API en ontwikkelaars',
    help: 'Helpcentrum',
    changelog: 'Nieuw',
    about: 'Over ons',
  },

  globalStats: {
    marketCap: 'Totale marktkapitalisatie',
    volume: 'Volume 24 u',
    dominanceBtc: 'BTC-dominantie',
    dominanceEth: 'ETH-dominantie',
    activeAssets: 'Actieve crypto’s',
    unavailable: 'Wereldwijde statistieken tijdelijk niet beschikbaar',
    caption: (value: string, change: string) =>
      `De wereldwijde marktkapitalisatie van cryptovaluta bedraagt ${value}, oftewel ${change} over de afgelopen 24 uur.`,
  },

  home: {
    trendingTitle: 'Trending',
    gainersTitle: 'Grootste stijgers',
    losersTitle: 'Grootste dalers',
    moversHint: (size: number) => `Onder de ${size} grootste marktkapitalisaties`,
    classMoversHint: (size: number) => `Onder de ${size} gevolgde assets van deze klasse`,
    summaryTitle: 'Marktoverzicht',
    topIndicesTitle: 'Belangrijkste indices',
    volumeLeadersTitle: 'Hoogste volumes',
    economyTitle: 'Economie',
    heroMarketCap: 'Cryptokapitalisatie',
    heroLoading: 'Reeks wordt geladen…',
    heroUnavailable: 'Reeks tijdelijk niet beschikbaar.',
    newsTitle: 'Laatste nieuws',
    sentimentTitle: 'Marktsentiment',
    coverageTitle: 'Dekking per activaklasse',
    seeAll: 'Alles bekijken',
  },

  assetClass: {
    crypto: 'Cryptovaluta',
    forex: 'Valuta',
    stock: 'Aandelen',
    etf: 'ETF’s',
    commodity: 'Grondstoffen',
    index: 'Indices',
    nft: 'NFT’s',
  },

  states: {
    unavailableTitle: 'Gegevens niet beschikbaar',
    connected: 'Verbonden',
    pending: 'Nog te verbinden',
  },

  auth: {
    signIn: 'Inloggen',
    signUp: 'Registreren',
  },

  notFound: {
    title: 'Deze top bestaat niet',
    body: 'De pagina die u zoekt is verplaatst of heeft nooit bestaan. Begin de klim opnieuw vanaf de startpagina.',
    cta: 'Terug naar home',
  },
}

export default nl
