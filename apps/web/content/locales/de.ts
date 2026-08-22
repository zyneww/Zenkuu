import type { Translation } from './index'
import { dePhrases } from './phrases/de'

/**
 * Oberflächentexte — Deutsch.
 *
 * Vollständig. Als `Translation` typisiert, sodass der Compiler jeden Schlüssel
 * zurückweist, den es in `content/fr.ts` nicht gibt — ein Tippfehler kann sich also
 * nicht stillschweigend einschleichen.
 *
 * `footer.poweredByCoinGecko` fehlt hier absichtlich: eine vertraglich
 * vorgeschriebene Quellenangabe, die auf Englisch bleiben muss.
 */
const de: Translation = {
  phrases: dePhrases,

  site: {
    name: 'Zenkuu',
    tagline: 'Marktbeobachtung und -analyse über alle Anlageklassen',
    description:
      'Kryptowährungen, Devisen, Aktien, ETFs, Rohstoffe und Indizes — Kurse, Marktkapitalisierungen und Trends an einem Ort. Analyseplattform ohne Handelsfunktion.',
  },

  nav: {
    home: 'Startseite',
    soon: 'Demnächst verfügbar',
    soonShort: 'Bald',
    openMenu: 'Menü öffnen',
    searchPlaceholder: 'Wert suchen',
    searchSoon: 'Die universelle Suche kommt mit den nächsten Anlageklassen.',
    skipToContent: 'Zum Hauptinhalt springen',
  },

  search: {
    title: 'Universelle Suche',
    open: 'Suche öffnen',
    close: 'Suche schließen',
    placeholder: 'Wert oder Symbol suchen…',
    trendingTitle: 'Trends',
    trendingHint: 'die meistgesehenen der letzten 24 Std.',
    trendingEmpty: 'Trends derzeit nicht verfügbar.',
    otherAssets: 'Aktien, ETFs, Indizes und Rohstoffe',
    loading: 'Suche läuft…',
    noResult: (query: string) => `Kein Wert passt zu „${query}“.`,
    cryptoUnavailable:
      'Die Krypto-Quelle ist derzeit überlastet. Die übrigen Anlageklassen bleiben abrufbar.',
    hint: 'Strg + K öffnet die Suche erneut',
  },

  locale: {
    open: 'Sprache und Währung',
    language: 'Sprache',
    languageHint:
      'Die Website erscheint auf Französisch, Englisch, Spanisch und Deutsch. Weitere Sprachen folgen mit ihren Übersetzungsdateien — wir bieten lieber nichts an als eine maschinelle Übersetzung.',
    currency: 'Lokale Währung',
    currencyHint: (date: string) =>
      `Umrechnung zum EZB-Referenzkurs vom ${date}. Die Quellen notieren in Euro; die gewählte Währung gilt für die gesamte Website.`,
    search: 'Suchen',
    noMatch: 'Keine Währung gefunden.',
    convertedFrom: (from: string, date: string) =>
      `umgerechnet aus ${from} · EZB-Kurs vom ${date}`,
  },

  auth: {
    signIn: 'Anmelden',
    signUp: 'Registrieren',
    unavailableTitle: 'Konten demnächst verfügbar',
    unavailableBody:
      'Die Authentifizierung ist auf dieser Instanz noch nicht eingerichtet. Konten machen die Merkliste dauerhaft und schalten Kursalarme sowie Anzeigeeinstellungen frei.',
    signInTitle: 'Bei ZENKUU anmelden',
    signInSubtitle: 'Finden Sie Ihre Merkliste und Ihre Einstellungen wieder.',
    signUpTitle: 'ZENKUU-Konto erstellen',
    signUpSubtitle:
      'Kostenlos. Keine Bankdaten erforderlich — ZENKUU verwaltet weder Gelder noch Transaktionen.',

    close: 'Schließen',
    overlaySignInTitle: 'Willkommen bei ZENKUU',
    overlaySignInSubtitle: 'Anmeldung oder Registrierung in Sekunden.',
    overlaySignUpTitle: 'Konto erstellen',
    overlaySignUpSubtitle: 'Kostenlos, ohne Bankdaten.',
    switchToSignUp: 'Noch kein Konto?',
    switchToSignIn: 'Sie haben bereits ein Konto?',

    benefitsTitle: 'Was das Konto bringt',
    benefits: [
      'Ihre Merkliste bleibt erhalten und ist auf allen Geräten verfügbar',
      'Anzeigewährung und Design werden gespeichert',
      'Ihre Einstellungen gelten sofort beim Aufruf, ohne erneutes Einrichten',
    ],
    benefitsNote:
      'ZENKUU führt keine Orders aus, hält keine Gelder und verkauft keine Daten weiter. Ein Konto dient allein dazu, Ihre Einstellungen wiederzufinden.',
    legalPrefix: 'Mit dem Fortfahren akzeptieren Sie unsere Nutzungsbedingungen, beschrieben',
    legalLink: 'auf der Seite Über uns',
  },

  theme: {
    switchToDark: 'Zum dunklen Design wechseln',
    switchToLight: 'Zum hellen Design wechseln',
  },

  pages: {
    home: 'Startseite',
    crypto: 'Kryptowährungen',
    forex: 'Devisen',
    stocks: 'Aktien',
    etf: 'ETFs',
    commodities: 'Rohstoffe',
    indices: 'Indizes',
    categories: 'Kategorien',
    news: 'Nachrichten',
    sentiment: 'Marktstimmung',
    movers: 'Gewinner und Verlierer',
    notFound: 'Seite nicht gefunden',
    learn: 'Lernen',
    getStarted: 'Erste Schritte',
    blog: 'Blog',
    methodology: 'Methodik & Quellen',
    developers: 'API & Entwickler',
    help: 'Hilfecenter',
    changelog: 'Neuerungen',
    about: 'Über uns',
  },

  globalStats: {
    marketCap: 'Gesamte Marktkapitalisierung',
    volume: 'Volumen 24 Std.',
    dominanceBtc: 'BTC-Dominanz',
    dominanceEth: 'ETH-Dominanz',
    activeAssets: 'Aktive Kryptos',
    unavailable: 'Globale Statistiken derzeit nicht verfügbar',
    caption: (value: string, change: string) =>
      `Die weltweite Marktkapitalisierung der Kryptowährungen beträgt ${value}, also ${change} in den letzten 24 Stunden.`,
  },

  home: {
    classMoversHint: (size: number) => `Unter den ${size} verfolgten Werten dieser Klasse`,
    trendingTitle: 'Trends',
    gainersTitle: 'Größte Gewinner',
    losersTitle: 'Größte Verlierer',
    moversHint: (size: number) => `Unter den ${size} größten Marktkapitalisierungen`,
    topMarketCapTitle: 'Top-Marktkapitalisierungen',
    marketCapCardTitle: 'Marktkapitalisierung',
    marketCapSeriesLabel: (minutes: number) =>
      `Entwicklung der Gesamtmarktkapitalisierung über die letzten ${minutes} Minuten`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `ZENKUU-Messungen über ${Math.round(minutes / 60)} Std.`
        : `ZENKUU-Messungen über ${minutes} Min.`,
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Kurve im Aufbau: keine kostenlose Quelle veröffentlicht die Historie der weltweiten Marktkapitalisierung, daher erfassen wir eigene Messwerte.'
        : `Kurve im Aufbau — ${count} Messwert${count > 1 ? 'e' : ''} erfasst. Wir zeichnen eigene Messungen, mangels kostenloser Quelle für diese Historie.`,
    volumeCardTitle: 'Gehandeltes Volumen 24 Std.',
    narrativesTitle: 'Aktivste Sektoren · 24 Std.',
    newsTitle: 'Neueste Nachrichten',
    sentimentTitle: 'Marktstimmung',
    coverageTitle: 'Abdeckung nach Anlageklasse',
    forexTitle: 'Devisen · EZB-Referenz',
    forexHint: 'Kurse werden einmal pro Werktag veröffentlicht',
    watchlistTitle: 'Meine Merkliste',
    watchlistEmptyTitle: 'Ihre Merkliste ist leer',
    watchlistEmptyBody:
      'Von einer Detailseite hinzugefügte Werte erscheinen hier. Die Liste ist an Ihr Konto gebunden.',
    seeAll: 'Alles ansehen',
    tabs: {
      all: 'Alle',
      trending: 'Trends',
      gainers: 'Gewinner',
      losers: 'Verlierer',
      categories: 'Kategorien',
    },

    summaryTitle: "Marktüberblick",
    crossAssetTitle: "Wichtigste Märkte",
    volumeLeadersTitle: "Höchste Volumen",
    economyTitle: "Wirtschaft",
    heroMarketCap: "Krypto-Marktkapitalisierung",
    heroLoading: "Reihe wird geladen…",
    heroUnavailable: "Reihe vorübergehend nicht verfügbar.",
  },

  market: {
    columns: {
      rank: '#',
      name: 'Wert',
      price: 'Kurs',
      change1h: '1 Std.',
      change24h: '24 Std.',
      change7d: '7 T.',
      volume: 'Volumen 24 Std.',
      marketCap: 'Marktkapitalisierung',
      chart: '7 Tage',
      variation: 'Veränderung',
      watch: 'Merken',
      dayRange: 'Tief / Hoch 24 Std.',
    },
    sortByMarketCap: 'Nach Marktkapitalisierung sortieren',
    sortByVolume: 'Nach Volumen sortieren',
    sortNotSupported:
      'Die Sortierung gilt für die gesamte Rangliste. Veränderungsspalten sind nicht sortierbar: die Quelle lässt das über den gesamten Markt nicht zu.',
    previous: 'Vorherige Seite',
    next: 'Nächste Seite',
    pageLabel: (page: number) => `Seite ${page}`,
    emptyPage: 'Auf dieser Seite der Rangliste steht kein Wert. Kehren Sie zur ersten Seite zurück.',
  },

  crypto: {
    title: 'Rangliste der Kryptowährungen',
    subtitle: 'Kurs, Marktkapitalisierung und Volumen in Euro, alle 5 Minuten aktualisiert.',
  },

  forex: {
    title: 'Wechselkurse',
    subtitle:
      'Referenzkurse der Europäischen Zentralbank, einmal pro Werktag veröffentlicht.',
  },

  stocks: {
    title: 'Aktien',
    subtitle: 'Kurse und Marktkapitalisierungen der wichtigsten börsennotierten Werte.',
  },

  etf: {
    title: 'ETFs',
    subtitle: 'Börsengehandelte Indexfonds: Kurs, Veränderung und Volumen.',
  },

  commodities: {
    title: 'Rohstoffe',
    subtitle: 'Energie, Edel- und Industriemetalle, Agrarprodukte.',
  },

  indices: {
    title: 'Aktienindizes',
    subtitle: 'Die großen Weltindizes und ihre jüngste Entwicklung.',
  },

  asset: {
    priceLabel: (name: string) => `Kurs von ${name}`,
    statsTitle: 'Marktstatistiken',
    aboutTitle: (name: string) => `Über ${name}`,
    similarTitle: 'Vergleichbare Werte',
    rangeTitle: 'Zeitraum',
    ranges: { d1: '24 Std.', d7: '7 T.', d30: '30 T.', d90: '90 T.', y1: '1 J.' },
    chart: {
      kindTitle: 'Diagrammtyp',
      kinds: {
        area: 'Fläche',
        line: 'Linie',
        baseline: 'Abweichung',
        candles: 'Kerzen',
        bars: 'Balken',
      },
      optionsTitle: 'Anzeige',
      volume: 'Volumen',
      movingAverage: 'Gleitender Durchschnitt',
      priceLines: 'Extremwerte',
      loadingCandles: 'Kerzen werden geladen…',
      candlesUnavailable:
        'Diese Quelle veröffentlicht keine Kerzen für diesen Wert — die Ansichten Kerzen und Balken sind daher nicht verfügbar.',
      volumeUnavailable: 'Volumen für diesen Zeitraum nicht von der Quelle veröffentlicht.',
    },
    tabs: {
      overview: 'Diagramm',
      history: 'Wertentwicklung',
      stats: 'Statistiken',
      about: 'Über',
      faq: 'FAQ',
    },
    currencyLabel: 'Anzeigewährung',
    convertedNotice: (from: string, to: string, date: string) =>
      `Beträge von ${from} in ${to} umgerechnet zum EZB-Referenzkurs vom ${date}. Die Quelle notiert diesen Wert in ${from}.`,
    loadingSeries: 'Zeitreihe wird geladen…',
    performanceTitle: 'Wertentwicklung nach Zeitraum',
    performanceNote:
      'Veränderungen berechnet auf der für diesen Wert geladenen Jahresreihe; die 24-Stunden-Angabe wird unverändert von der Quelle übernommen.',
    rangeYearTitle: 'Extremwerte über ein Jahr',
    lowest: 'Tief',
    highest: 'Hoch',
    faq: {
      priceQ: (name: string) => `Wie hoch ist der Kurs von ${name} heute?`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} wird zu ${price} gehandelt. Letzter von unserer Quelle veröffentlichter Wert am ${updated}.`,
      capQ: (name: string) => `Wie hoch ist die Marktkapitalisierung von ${name}?`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `Die Marktkapitalisierung beträgt ${cap} und belegt damit Rang ${rank} in ihrer Anlageklasse.`
          : `Die Marktkapitalisierung beträgt ${cap}.`,
      athQ: (name: string) => `Was ist das Allzeithoch von ${name}?`,
      athA: (price: string, date: string | null) =>
        date
          ? `Das Allzeithoch liegt bei ${price}, erreicht am ${date}.`
          : `Das Allzeithoch liegt bei ${price}.`,
      supplyQ: (name: string) => `Wie viele Einheiten von ${name} wird es höchstens geben?`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `Das maximale Angebot beträgt ${max} ${symbol}, davon sind derzeit ${circulating} ${symbol} im Umlauf.`
          : `Das maximale Angebot beträgt ${max} ${symbol}.`,
      buyQ: (name: string) => `Kann man ${name} auf ZENKUU kaufen?`,
      buyA:
        'Nein. ZENKUU ist eine Informationsplattform: Wir führen keine Orders aus, halten keine Gelder und sind weder Broker noch Handelsplatz.',
    },
    stats: {
      marketCap: 'Marktkapitalisierung',
      volume: 'Volumen 24 Std.',
      circulating: 'Umlaufendes Angebot',
      total: 'Gesamtangebot',
      max: 'Maximales Angebot',
      ath: 'Allzeithoch',
      atl: 'Allzeittief',
      rank: 'Rang',
      low24h: 'Tief 24 Std.',
      high24h: 'Hoch 24 Std.',
      previousClose: 'Vorheriger Schlusskurs',
      exchange: 'Handelsplatz',
      high52w: '52-Wochen-Hoch',
      low52w: '52-Wochen-Tief',
    },
    noDescription: 'Die Quelle liefert keine Beschreibung für diesen Wert.',
    readOnly:
      'Reine Informationsseite. ZENKUU erlaubt weder Kauf noch Verkauf noch Ordererteilung.',
    officialLinks: 'Offizielle Links',
    website: 'Offizielle Website',
    notFoundTitle: 'Wert nicht gefunden',
    notFoundBody: 'Diese Kennung entspricht keinem unseren Quellen bekannten Wert.',
    backToRanking: 'Zurück zur Rangliste',
    chartUnavailable: 'Kurshistorie für diesen Wert nicht verfügbar.',
  },

  categories: {
    title: 'Kategorien und Sektoren',
    subtitle: 'Wertentwicklung der großen Krypto-Marktnarrative über 24 Stunden.',
    columns: {
      name: 'Kategorie',
      marketCap: 'Marktkapitalisierung',
      change: '24 Std.',
      volume: 'Volumen 24 Std.',
    },
  },

  news: {
    title: 'Marktnachrichten',
    subtitle: 'Aggregiert aus den öffentlichen Feeds der wichtigsten Herausgeber.',
    readOn: (source: string) => `Lesen auf ${source}`,
    unavailable: 'Nachrichten-Feed derzeit nicht verfügbar.',
  },

  sentiment: {
    title: 'Fear-&-Greed-Index',
    subtitle:
      'Zusammengesetztes Maß der Krypto-Marktstimmung, von 0 (extreme Angst) bis 100 (extreme Gier).',
    scale: {
      extremeFear: 'Extreme Angst',
      fear: 'Angst',
      neutral: 'Neutral',
      greed: 'Gier',
      extremeGreed: 'Extreme Gier',
    },
    disclaimer:
      'Ein Stimmungsindikator, keine Empfehlung. Er sagt keine Kursentwicklung voraus.',
  },

  assetClass: {
    crypto: 'Kryptowährungen',
    forex: 'Devisen',
    stock: 'Aktien',
    etf: 'ETFs',
    commodity: 'Rohstoffe',
    index: 'Indizes',
    nft: 'NFTs',
  },

  states: {
    unavailableTitle: 'Daten nicht verfügbar',
    connected: 'Verbunden',
    pending: 'Noch zu verbinden',
  },

  footer: {
    positioning: 'Informationsplattform, ohne Orderausführung und ohne Verwahrung von Geldern.',
    community: 'Community',
    locale: 'Deutsch · EUR',
    localeHint:
      'Die Website erscheint in mehreren Sprachen, mit dem Euro als Referenzwährung. Weitere Sprachen und Währungen folgen.',
    disclaimer:
      'ZENKUU ist eine reine Informationsplattform. Keine Kauf-, Verkaufs- oder Wallet-Anbindung. Die angezeigten Informationen stellen keine Anlageberatung dar.',
    dataNote: 'Marktdaten aus öffentlichen Quellen, alle 5 Minuten aktualisiert.',
    rights: (year: number) => `© ${year} ZENKUU`,
  },

  placeholder: {
    plannedTitle: 'Was diese Seite enthalten wird',
    meanwhileTitle: 'In der Zwischenzeit',
    meanwhileBody:
      'Die Seite Methodik beschreibt schon jetzt, woher unsere Zahlen stammen, wie oft sie aktualisiert werden und was wir mangels Quelle nicht anzeigen.',
    meanwhileCta: 'Zur Methodik',
  },

  notFound: {
    title: 'Diesen Gipfel gibt es nicht',
    body: 'Die gesuchte Seite wurde verschoben oder hat nie existiert. Beginnen Sie den Aufstieg erneut auf der Startseite.',
    cta: 'Zurück zur Startseite',
  },
}

export default de
