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
  
    languageHint: "Języki oznaczone jako przetłumaczone zmieniają interfejs. Pozostałe zapisują Twoje ustawienie w oczekiwaniu na plik tłumaczenia — wolimy powiedzieć, czego brakuje, niż podać nieskorygowane tłumaczenie maszynowe.",
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
  
    topMarketCapTitle: "Największe kapitalizacje",
    marketCapCardTitle: "Kapitalizacja rynku",
    volumeCardTitle: "Obrót 24 h",
    narrativesTitle: "Najaktywniejsze sektory · 24 h",
    forexTitle: "Waluty · kurs referencyjny EBC",
    forexHint: "Kursy publikowane raz na dzień roboczy",
    watchlistTitle: "Moja lista obserwowanych",
    watchlistEmptyTitle: "Twoja lista obserwowanych jest pusta",
    watchlistEmptyBody: "Aktywa dodane ze strony szczegółów pojawią się tutaj. Lista jest powiązana z Twoim kontem.",
    tabs: {
      all: "Wszystko",
      trending: "Popularne",
      gainers: "Wzrosty",
      losers: "Spadki",
      categories: "Kategorie",
    },
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
  
    unavailableTitle: "Konta wkrótce dostępne",
    unavailableBody: "Uwierzytelnianie nie jest jeszcze skonfigurowane w tej instancji. Konta sprawią, że lista obserwowanych będzie trwała, i dadzą dostęp do alertów cenowych oraz ustawień wyświetlania.",
    signInTitle: "Zaloguj się do ZENKUU",
    signInSubtitle: "Odzyskaj swoją listę obserwowanych i swoje ustawienia.",
    signUpTitle: "Załóż konto ZENKUU",
    signUpSubtitle: "Bezpłatnie. Bez danych bankowych — ZENKUU nie obsługuje ani środków, ani transakcji.",
    close: "Zamknij",
    overlaySignInTitle: "Witamy w ZENKUU",
    overlaySignInSubtitle: "Logowanie lub rejestracja w kilka sekund.",
    overlaySignUpTitle: "Załóż konto",
    overlaySignUpSubtitle: "Bezpłatnie, bez danych bankowych.",
    switchToSignUp: "Nie masz jeszcze konta?",
    switchToSignIn: "Masz już konto?",
    benefitsTitle: "Co daje konto",
    benefits: [
      "Twoja lista obserwowanych zachowana i dostępna na wszystkich urządzeniach",
      "Zapamiętana waluta wyświetlania i motyw",
      "Twoje ustawienia od razu po otwarciu, bez ponownej konfiguracji",
    ],
    benefitsNote: "ZENKUU nie realizuje żadnych zleceń, nie przechowuje środków i nie odsprzedaje danych. Konto służy wyłącznie do odzyskania Twoich ustawień.",
    legalPrefix: "Kontynuując, akceptujesz nasze warunki korzystania, opisane",
    legalLink: "na stronie O nas",
  },

  notFound: {
    title: 'Ten szczyt nie istnieje',
    body: 'Strona, której szukasz, została przeniesiona lub nigdy nie istniała. Zacznij wspinaczkę od strony głównej.',
    cta: 'Powrót na stronę główną',
  },


  market: {
    columns: {
      rank: "#",
      name: "Aktywo",
      price: "Cena",
      change1h: "1 godz.",
      change24h: "24 godz.",
      change7d: "7 dni",
      volume: "Wolumen 24 godz.",
      marketCap: "Kapitalizacja",
      chart: "7 dni",
      variation: "Zmiana",
      watch: "Obserwuj",
      dayRange: "Min. / maks. 24 godz.",
    },
    sortByMarketCap: "Sortuj według kapitalizacji",
    sortByVolume: "Sortuj według wolumenu",
    sortNotSupported: "Sortowanie obejmuje cały ranking. Kolumn ze zmianami nie da się sortować: źródło nie pozwala na to w skali całego rynku.",
    previous: "Poprzednia strona",
    next: "Następna strona",
    emptyPage: "Brak aktywów na tej stronie rankingu. Wróć na pierwszą stronę.",
  },

  crypto: {
    title: "Ranking kryptowalut",
    subtitle: "Ceny, kapitalizacja i wolumen w euro, aktualizowane co 5 minut.",
  },

  forex: {
    title: "Kursy walut",
    subtitle: "Kursy referencyjne publikowane przez Europejski Bank Centralny, raz na dzień roboczy.",
  },

  stocks: {
    title: "Akcje",
    subtitle: "Notowania i kapitalizacje najważniejszych spółek giełdowych.",
  },

  etf: {
    title: "ETF-y",
    subtitle: "Notowane fundusze indeksowe: kurs, zmiana i wolumen.",
  },

  commodities: {
    title: "Surowce",
    subtitle: "Energia, metale szlachetne i przemysłowe, produkty rolne.",
  },

  indices: {
    title: "Indeksy giełdowe",
    subtitle: "Główne indeksy światowe i ich ostatnie zmiany.",
  },

  asset: {
    statsTitle: "Statystyki rynkowe",
    similarTitle: "Porównywalne aktywa",
    rangeTitle: "Okres",
    ranges: {
      d1: "24 godz.",
      d7: "7 dni",
      d30: "30 dni",
      d90: "90 dni",
      y1: "1 rok",
    },
    chart: {
      kindTitle: "Typ wykresu",
      kinds: {
        area: "Obszar",
        line: "Linia",
        baseline: "Odchylenie",
        candles: "Świece",
        bars: "Słupki",
      },
      optionsTitle: "Wyświetlanie",
      volume: "Wolumen",
      movingAverage: "Średnia krocząca",
      priceLines: "Ekstrema",
      loadingCandles: "Wczytywanie świec…",
      candlesUnavailable: "To źródło nie publikuje świec dla tego aktywa — widoki Świece i Słupki są więc niedostępne.",
      volumeUnavailable: "Wolumen nieopublikowany przez źródło dla tego okresu.",
    },
    tabs: {
      overview: "Wykres",
      history: "Wyniki",
      stats: "Statystyki",
      about: "O aktywie",
      faq: "FAQ",
    },
    currencyLabel: "Waluta wyświetlania",
    loadingSeries: "Wczytywanie serii…",
    performanceTitle: "Wyniki według okresu",
    performanceNote: "Zmiany obliczone na rocznej serii wczytanej dla tego aktywa; ta 24-godzinna pochodzi wprost ze źródła.",
    rangeYearTitle: "Ekstrema w ciągu roku",
    lowest: "Minimum",
    highest: "Maksimum",
    faq: {
      buyA: "Nie. ZENKUU jest serwisem informacyjnym: nie realizujemy żadnych zleceń, nie przechowujemy środków i nie jesteśmy ani brokerem, ani giełdą.",
    },
    stats: {
      marketCap: "Kapitalizacja",
      volume: "Wolumen 24 godz.",
      circulating: "Podaż w obiegu",
      total: "Podaż całkowita",
      max: "Podaż maksymalna",
      ath: "Historyczne maksimum",
      atl: "Historyczne minimum",
      rank: "Pozycja",
      low24h: "Minimum 24 godz.",
      high24h: "Maksimum 24 godz.",
      previousClose: "Poprzednie zamknięcie",
      exchange: "Giełda notowań",
      high52w: "Maksimum 52 tygodni",
      low52w: "Minimum 52 tygodni",
    },
    noDescription: "Źródło nie podaje opisu tego aktywa.",
    readOnly: "Strona wyłącznie informacyjna. ZENKUU nie umożliwia kupna, sprzedaży ani składania zleceń.",
    officialLinks: "Odnośniki oficjalne",
    website: "Strona oficjalna",
    notFoundTitle: "Nie znaleziono aktywa",
    notFoundBody: "Ten identyfikator nie odpowiada żadnemu aktywu znanemu naszym źródłom.",
    backToRanking: "Powrót do rankingu",
    chartUnavailable: "Historia kursu niedostępna dla tego aktywa.",
  },

  categories: {
    title: "Kategorie i sektory",
    subtitle: "Wyniki głównych narracji rynku kryptowalut w ciągu 24 godzin.",
    columns: {
      name: "Kategoria",
      marketCap: "Kapitalizacja",
      change: "24 godz.",
      volume: "Wolumen 24 godz.",
    },
  },

  news: {
    title: "Wiadomości rynkowe",
    subtitle: "Zebrane z publicznych kanałów najważniejszych wydawców.",
    unavailable: "Kanał wiadomości chwilowo niedostępny.",
  },

  sentiment: {
    title: "Indeks Fear & Greed",
    subtitle: "Złożona miara nastrojów na rynku kryptowalut, od 0 (skrajny strach) do 100 (skrajna chciwość).",
    scale: {
      extremeFear: "Skrajny strach",
      fear: "Strach",
      neutral: "Neutralnie",
      greed: "Chciwość",
      extremeGreed: "Skrajna chciwość",
    },
    disclaimer: "Wskaźnik nastrojów, nie rekomendacja. Nie przewiduje żadnych zmian cen.",
  },

  footer: {
    positioning: "Serwis informacyjny, bez realizacji zleceń i bez przechowywania środków.",
    community: "Społeczność",
    locale: "Polski · EUR",
    localeHint: "Serwis jest publikowany po francusku, z euro jako walutą odniesienia. Kolejne języki i waluty pojawią się później.",
    disclaimer: "ZENKUU to serwis informacyjny tylko do odczytu. Brak funkcji kupna, sprzedaży czy podłączenia portfela. Prezentowane informacje nie stanowią porady inwestycyjnej.",
    dataNote: "Dane rynkowe pochodzą ze źródeł publicznych, aktualizowane co 5 minut.",
  },

  placeholder: {
    plannedTitle: "Co znajdzie się na tej stronie",
    meanwhileTitle: "W międzyczasie",
    meanwhileBody: "Strona Metodologia już teraz wyjaśnia, skąd pochodzą nasze dane, jak często są odświeżane i czego nie pokazujemy z braku źródła.",
    meanwhileCta: "Zobacz metodologię",
  },}

export default pl
