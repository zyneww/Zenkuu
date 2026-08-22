import type { Translation } from './index'
import { nlPhrases } from './phrases/nl'

/**
 * Interfaceteksten — Nederlands.
 *
 * Bewuste gedeeltelijke vertaling : zie `it.ts` voor de redenering. De secties die op
 * ELKE pagina staan zijn vertaald ; de lange, gespecialiseerde secties vallen terug op
 * het Engels, dat `content/locales/index.ts` vóór het Frans plaatst.
 */
const nl: Translation = {
  phrases: nlPhrases,

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
    convertedFrom: (from: string, date: string) => `omgerekend vanuit ${from} tegen de ECB-koers van ${date}`,
    currencyHint: (date: string) =>
      `Omgerekend tegen de ECB-referentiekoers van ${date}. Bronnen noteren in euro; de gekozen valuta geldt voor de hele site.`,
    open: 'Taal en valuta',
    language: 'Taal',
    currency: 'Lokale valuta',
    search: 'Zoeken',
    noMatch: 'Geen enkele valuta komt overeen.',

    languageHint: "Talen die als vertaald zijn gemarkeerd wijzigen de interface. De overige bewaren uw voorkeur in afwachting van hun vertaalbestand — wij melden liever wat ontbreekt dan een niet-nagelezen automatische vertaling te tonen.",
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
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Curve wordt nog opgebouwd: geen enkele gratis bron publiceert de historiek van de wereldwijde marktkapitalisatie, dus leggen we onze eigen metingen vast.'
        : `Curve wordt opgebouwd — ${count} metingen tot nu toe.`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `ZENKUU-metingen over ${Math.round(minutes / 60)} u`
        : `ZENKUU-metingen over ${minutes} min`,
    marketCapSeriesLabel: (minutes: number) =>
      `Verloop van de totale marktkapitalisatie over de laatste ${minutes} minuten`,
    trendingTitle: 'Trending',
    gainersTitle: 'Grootste stijgers',
    losersTitle: 'Grootste dalers',
    moversHint: (size: number) => `Onder de ${size} grootste marktkapitalisaties`,
    classMoversHint: (size: number) => `Onder de ${size} gevolgde assets van deze klasse`,
    summaryTitle: 'Marktoverzicht',
    crossAssetTitle: 'Belangrijkste markten',
    volumeLeadersTitle: 'Hoogste volumes',
    economyTitle: 'Economie',
    heroMarketCap: 'Cryptokapitalisatie',
    heroLoading: 'Reeks wordt geladen…',
    heroUnavailable: 'Reeks tijdelijk niet beschikbaar.',
    newsTitle: 'Laatste nieuws',
    sentimentTitle: 'Marktsentiment',
    coverageTitle: 'Dekking per activaklasse',
    seeAll: 'Alles bekijken',

    topMarketCapTitle: "Grootste marktkapitalisaties",
    marketCapCardTitle: "Marktkapitalisatie",
    volumeCardTitle: "Verhandeld volume 24 u",
    narrativesTitle: "Actiefste sectoren · 24 u",
    forexTitle: "Valuta’s · ECB-referentie",
    forexHint: "Koersen één keer per werkdag gepubliceerd",
    watchlistTitle: "Mijn volglijst",
    watchlistEmptyTitle: "Uw volglijst is leeg",
    watchlistEmptyBody: "Activa die u vanaf een detailpagina toevoegt verschijnen hier. De lijst hoort bij uw account.",
    tabs: {
      all: "Alles",
      trending: "Trending",
      gainers: "Stijgers",
      losers: "Dalers",
      categories: "Categorieën",
    },
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

    unavailableTitle: "Accounts binnenkort beschikbaar",
    unavailableBody: "Authenticatie is op deze instantie nog niet ingesteld. Met een account blijft uw volglijst bewaard en krijgt u toegang tot koersmeldingen en weergavevoorkeuren.",
    signInTitle: "Inloggen bij ZENKUU",
    signInSubtitle: "Vind uw volglijst en uw voorkeuren terug.",
    signUpTitle: "Een ZENKUU-account aanmaken",
    signUpSubtitle: "Gratis. Geen bankgegevens nodig — ZENKUU beheert geen gelden en geen transacties.",
    close: "Sluiten",
    overlaySignInTitle: "Welkom bij ZENKUU",
    overlaySignInSubtitle: "In enkele seconden inloggen of registreren.",
    overlaySignUpTitle: "Uw account aanmaken",
    overlaySignUpSubtitle: "Gratis, zonder bankgegevens.",
    switchToSignUp: "Nog geen account?",
    switchToSignIn: "Hebt u al een account?",
    benefitsTitle: "Wat een account oplevert",
    benefits: [
      "Uw volglijst bewaard en terug te vinden op al uw apparaten",
      "Weergavevaluta en thema onthouden",
      "Uw instellingen meteen toegepast, zonder opnieuw in te stellen",
    ],
    benefitsNote: "ZENKUU voert geen orders uit, houdt geen gelden aan en verkoopt geen gegevens door. Een account dient alleen om uw instellingen terug te vinden.",
    legalPrefix: "Door verder te gaan aanvaardt u onze gebruiksvoorwaarden, beschreven",
    legalLink: "op de pagina Over ons",
  },

  notFound: {
    title: 'Deze top bestaat niet',
    body: 'De pagina die u zoekt is verplaatst of heeft nooit bestaan. Begin de klim opnieuw vanaf de startpagina.',
    cta: 'Terug naar home',
  },


  market: {
    pageLabel: (page: number) => `Pagina ${page}`,
    columns: {
      rank: "#",
      name: "Actief",
      price: "Prijs",
      change1h: "1 u",
      change24h: "24 u",
      change7d: "7 d",
      volume: "Volume 24 u",
      marketCap: "Marktkapitalisatie",
      chart: "7 dagen",
      variation: "Verandering",
      watch: "Volgen",
      dayRange: "Laagste / hoogste 24 u",
    },
    sortByMarketCap: "Sorteren op marktkapitalisatie",
    sortByVolume: "Sorteren op volume",
    sortNotSupported: "Het sorteren geldt voor de volledige ranglijst. Kolommen met veranderingen zijn niet sorteerbaar: de bron staat dat voor de hele markt niet toe.",
    previous: "Vorige pagina",
    next: "Volgende pagina",
    emptyPage: "Geen activa op deze pagina van de ranglijst. Ga terug naar de eerste pagina.",
  },

  crypto: {
    title: "Ranglijst van cryptomunten",
    subtitle: "Prijs, marktkapitalisatie en volume in euro, elke 5 minuten bijgewerkt.",
  },

  forex: {
    title: "Wisselkoersen",
    subtitle: "Referentiekoersen gepubliceerd door de Europese Centrale Bank, één keer per werkdag.",
  },

  stocks: {
    title: "Aandelen",
    subtitle: "Koersen en marktkapitalisaties van de belangrijkste beursgenoteerde bedrijven.",
  },

  etf: {
    title: "ETF’s",
    subtitle: "Beursgenoteerde indexfondsen: koers, verandering en volume.",
  },

  commodities: {
    title: "Grondstoffen",
    subtitle: "Energie, edele en industriële metalen, landbouwproducten.",
  },

  indices: {
    title: "Beursindices",
    subtitle: "De grote wereldindices en hun recente verloop.",
  },

  asset: {
    convertedNotice: (from: string, to: string, date: string) =>
      `Bedragen omgerekend van ${from} naar ${to} tegen de ECB-referentiekoers van ${date}. De bron noteert dit actief in ${from}.`,
    aboutTitle: (name: string) => `Over ${name}`,
    priceLabel: (name: string) => `Koers van ${name}`,
    statsTitle: "Marktstatistieken",
    similarTitle: "Vergelijkbare activa",
    rangeTitle: "Periode",
    ranges: {
      d1: "24 u",
      d7: "7 d",
      d30: "30 d",
      d90: "90 d",
      y1: "1 jaar",
    },
    chart: {
      kindTitle: "Grafiektype",
      kinds: {
        area: "Vlak",
        line: "Lijn",
        baseline: "Afwijking",
        candles: "Kandelaars",
        bars: "Staven",
      },
      optionsTitle: "Weergave",
      volume: "Volume",
      movingAverage: "Voortschrijdend gemiddelde",
      priceLines: "Uitersten",
      loadingCandles: "Kandelaars laden…",
      candlesUnavailable: "Deze bron publiceert geen kandelaars voor dit actief — de weergaven Kandelaars en Staven zijn daarom niet beschikbaar.",
      volumeUnavailable: "Volume niet door de bron gepubliceerd voor deze periode.",
    },
    tabs: {
      overview: "Grafiek",
      history: "Rendement",
      stats: "Statistieken",
      about: "Over",
      faq: "FAQ",
    },
    currencyLabel: "Weergavevaluta",
    loadingSeries: "Reeks laden…",
    performanceTitle: "Rendement per periode",
    performanceNote: "Veranderingen berekend op de jaarreeks die voor dit actief is geladen; die over 24 uur komt onbewerkt van de bron.",
    rangeYearTitle: "Uitersten over een jaar",
    lowest: "Laagste",
    highest: "Hoogste",
    faq: {
      buyQ: (name: string) => `Kan ik ${name} kopen op ZENKUU?`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `Het maximale aanbod is ${max} ${symbol}, waarvan er nu ${circulating} ${symbol} in omloop zijn.`
          : `Het maximale aanbod is ${max} ${symbol}.`,
      supplyQ: (name: string) => `Hoeveel eenheden van ${name} zullen er maximaal bestaan?`,
      athA: (price: string, date: string | null) =>
        date
          ? `De recordkoers is ${price}, bereikt op ${date}.`
          : `De recordkoers is ${price}.`,
      athQ: (name: string) => `Wat is de recordkoers van ${name}?`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `De marktkapitalisatie bedraagt ${cap}, goed voor plaats ${rank} binnen zijn activaklasse.`
          : `De marktkapitalisatie bedraagt ${cap}.`,
      capQ: (name: string) => `Wat is de marktkapitalisatie van ${name}?`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} noteert op ${price}. Laatste waarde die onze bron publiceerde op ${updated}.`,
      priceQ: (name: string) => `Wat is de koers van ${name} vandaag?`,
      buyA: "Nee. ZENKUU is een informatieplatform: wij voeren geen orders uit, houden geen gelden aan en zijn noch makelaar noch handelsplatform.",
    },
    stats: {
      marketCap: "Marktkapitalisatie",
      volume: "Volume 24 u",
      circulating: "Circulerend aanbod",
      total: "Totaal aanbod",
      max: "Maximaal aanbod",
      ath: "Hoogste ooit",
      atl: "Laagste ooit",
      rank: "Rang",
      low24h: "Laagste 24 u",
      high24h: "Hoogste 24 u",
      previousClose: "Vorige slotkoers",
      exchange: "Beurs",
      high52w: "Hoogste 52 weken",
      low52w: "Laagste 52 weken",
    },
    noDescription: "De bron levert geen beschrijving voor dit actief.",
    readOnly: "Uitsluitend informatiepagina. ZENKUU maakt kopen, verkopen of orders plaatsen niet mogelijk.",
    officialLinks: "Officiële links",
    website: "Officiële website",
    notFoundTitle: "Actief niet gevonden",
    notFoundBody: "Dit kenmerk komt niet overeen met een actief dat onze bronnen kennen.",
    backToRanking: "Terug naar de ranglijst",
    chartUnavailable: "Koershistorie niet beschikbaar voor dit actief.",
  },

  categories: {
    title: "Categorieën en sectoren",
    subtitle: "Rendement van de grote thema’s van de cryptomarkt over 24 uur.",
    columns: {
      name: "Categorie",
      marketCap: "Marktkapitalisatie",
      change: "24 u",
      volume: "Volume 24 u",
    },
  },

  news: {
    readOn: (source: string) => `Lezen op ${source}`,
    title: "Marktnieuws",
    subtitle: "Samengebracht uit de openbare feeds van de belangrijkste uitgevers.",
    unavailable: "Nieuwsstroom momenteel niet beschikbaar.",
  },

  sentiment: {
    title: "Fear & Greed-index",
    subtitle: "Samengestelde maatstaf voor het sentiment op de cryptomarkt, van 0 (extreme angst) tot 100 (extreme hebzucht).",
    scale: {
      extremeFear: "Extreme angst",
      fear: "Angst",
      neutral: "Neutraal",
      greed: "Hebzucht",
      extremeGreed: "Extreme hebzucht",
    },
    disclaimer: "Sentimentindicator, geen aanbeveling. Hij voorspelt geen enkele koersontwikkeling.",
  },

  footer: {
    rights: (year: number) => `© ${year} ZENKUU`,
    positioning: "Informatieplatform, zonder uitvoering van orders of bewaring van gelden.",
    community: "Gemeenschap",
    locale: "Nederlands · EUR",
    localeHint: "De site wordt in het Frans gepubliceerd, met de euro als referentievaluta. Andere talen en valuta’s volgen.",
    disclaimer: "ZENKUU is een informatieplatform dat alleen leest. Geen functie om te kopen, te verkopen of een portemonnee te koppelen. De getoonde informatie vormt geen beleggingsadvies.",
    dataNote: "Marktgegevens uit openbare bronnen, elke 5 minuten bijgewerkt.",
  },

  placeholder: {
    plannedTitle: "Wat deze pagina zal bevatten",
    meanwhileTitle: "In de tussentijd",
    meanwhileBody: "De pagina Methodologie legt nu al uit waar onze cijfers vandaan komen, hoe vaak ze worden bijgewerkt en wat we bij gebrek aan bron niet tonen.",
    meanwhileCta: "Bekijk de methodologie",
  },}

export default nl
