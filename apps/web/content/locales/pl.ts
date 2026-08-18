import type { Translation } from './index'
import { plPhrases } from './phrases/pl'

/**
 * Teksty interfejsu — język polski.
 *
 * Tłumaczenie częściowe i celowe : patrz `it.ts`, gdzie opisano kryterium. Sekcje
 * obecne na KAŻDEJ stronie są przetłumaczone ; długie i specjalistyczne wracają do
 * angielskiego, który `content/locales/index.ts` umieszcza przed francuskim.
 */
const pl: Translation = {
  phrases: plPhrases,

  site: {
    name: 'Zenkuu',
    tagline: 'Śledzenie i analiza rynków wieloaktywowych',
    description:
      'Kryptowaluty, waluty, akcje, ETF-y, surowce i indeksy — kursy, kapitalizacje i trendy w jednym miejscu. Platforma wyłącznie informacyjna.',
  },

  nav: {
    home: 'Strona główna',
    soon: 'Wkrótce dostępne',
    soonShort: 'Wkrótce',
    openMenu: 'Otwórz menu',
    searchPlaceholder: 'Szukaj aktywa',
    searchSoon: 'Wyszukiwanie uniwersalne pojawi się wraz z kolejnymi klasami aktywów.',
    skipToContent: 'Przejdź do treści głównej',
  },

  search: {
    title: 'Wyszukiwanie uniwersalne',
    open: 'Otwórz wyszukiwanie',
    close: 'Zamknij wyszukiwanie',
    placeholder: 'Szukaj aktywa, symbolu…',
    trendingTitle: 'Trendy',
    trendingHint: 'najczęściej przeglądane w ciągu 24 godzin',
    trendingEmpty: 'Trendy chwilowo niedostępne.',
    otherAssets: 'Akcje, ETF-y, indeksy i surowce',
    loading: 'Wyszukiwanie…',
    noResult: (query: string) => `Żadne aktywo nie odpowiada « ${query} ».`,
    cryptoUnavailable:
      'Źródło kryptowalut jest chwilowo przeciążone. Pozostałe klasy aktywów są dostępne.',
    hint: 'Ctrl + K, aby ponownie otworzyć wyszukiwanie',
  },

  locale: {
    open: 'Język i waluta',
    language: 'Język',
    currency: 'Waluta lokalna',
    search: 'Szukaj',
    noMatch: 'Żadna waluta nie odpowiada.',
  },

  theme: {
    switchToDark: 'Przełącz na motyw ciemny',
    switchToLight: 'Przełącz na motyw jasny',
  },

  pages: {
    home: 'Strona główna',
    crypto: 'Kryptowaluty',
    forex: 'Waluty',
    stocks: 'Akcje',
    etf: 'ETF-y',
    commodities: 'Surowce',
    indices: 'Indeksy',
    categories: 'Kategorie',
    news: 'Aktualności',
    sentiment: 'Nastroje rynkowe',
    movers: 'Wzrosty i spadki',
    notFound: 'Nie znaleziono strony',
    learn: 'Nauka',
    getStarted: 'Pierwsze kroki',
    blog: 'Blog',
    methodology: 'Metodologia i źródła',
    developers: 'API i deweloperzy',
    help: 'Centrum pomocy',
    changelog: 'Nowości',
    about: 'O nas',
  },

  globalStats: {
    marketCap: 'Kapitalizacja całkowita',
    volume: 'Wolumen 24 h',
    dominanceBtc: 'Dominacja BTC',
    dominanceEth: 'Dominacja ETH',
    activeAssets: 'Aktywne kryptowaluty',
    unavailable: 'Statystyki globalne chwilowo niedostępne',
    caption: (value: string, change: string) =>
      `Globalna kapitalizacja kryptowalut wynosi ${value}, czyli ${change} w ciągu ostatnich 24 godzin.`,
  },

  home: {
    trendingTitle: 'Trendy',
    gainersTitle: 'Największe wzrosty',
    losersTitle: 'Największe spadki',
    moversHint: (size: number) => `Wśród ${size} największych kapitalizacji`,
    classMoversHint: (size: number) => `Wśród ${size} śledzonych aktywów tej klasy`,
    summaryTitle: 'Podsumowanie rynków',
    topIndicesTitle: 'Główne indeksy',
    volumeLeadersTitle: 'Największe wolumeny',
    economyTitle: 'Gospodarka',
    heroMarketCap: 'Kapitalizacja krypto',
    heroLoading: 'Wczytywanie serii…',
    heroUnavailable: 'Seria chwilowo niedostępna.',
    newsTitle: 'Najnowsze aktualności',
    sentimentTitle: 'Nastroje rynkowe',
    coverageTitle: 'Zasięg według klasy aktywów',
    seeAll: 'Zobacz wszystko',
  },

  assetClass: {
    crypto: 'Kryptowaluty',
    forex: 'Waluty',
    stock: 'Akcje',
    etf: 'ETF-y',
    commodity: 'Surowce',
    index: 'Indeksy',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: 'Dane niedostępne',
    connected: 'Połączono',
    pending: 'Do połączenia',
  },

  auth: {
    signIn: 'Zaloguj się',
    signUp: 'Zarejestruj się',
  },

  notFound: {
    title: 'Ten szczyt nie istnieje',
    body: 'Strona, której szukasz, została przeniesiona lub nigdy nie istniała. Zacznij wspinaczkę od strony głównej.',
    cta: 'Powrót na stronę główną',
  },
}

export default pl
