import type { Translation } from './index'
import { itPhrases } from './phrases/it'

/**
 * Testi dell'interfaccia — italiano.
 *
 * ── TRADUZIONE PARZIALE, E LA COSA È VOLUTA ───────────────────────────────────
 *
 * Sono tradotte le sezioni presenti su OGNI pagina: navigazione, ricerca,
 * intestazioni di tabella, stati, piè di pagina. Le sezioni lunghe e specialistiche —
 * metodologia, guide, glossario delle metriche — ricadono sull'inglese, che
 * `content/locales/index.ts` interpone prima del francese proprio per questo.
 *
 * Non è una scorciatoia ma il modo in cui il tipo `DeepPartial` è stato pensato: un
 * file può coprire la navigazione prima delle tabelle. Una traduzione automatica non
 * riletta di duemila parole di metodologia varrebbe meno dell'inglese di partenza.
 */
const it: Translation = {
  phrases: itPhrases,

  site: {
    name: 'Zenkuu',
    tagline: 'Monitoraggio e analisi dei mercati multi-asset',
    description:
      'Criptovalute, valute, azioni, ETF, materie prime e indici — prezzi, capitalizzazioni e tendenze in un unico posto. Piattaforma di sola consultazione.',
  },

  nav: {
    home: 'Home',
    soon: 'Presto disponibile',
    soonShort: 'Presto',
    openMenu: 'Apri il menu',
    searchPlaceholder: 'Cerca un asset',
    searchSoon: 'La ricerca universale arriverà con le prossime classi di attività.',
    skipToContent: 'Vai al contenuto principale',
  },

  search: {
    title: 'Ricerca universale',
    open: 'Apri la ricerca',
    close: 'Chiudi la ricerca',
    placeholder: 'Cerca un asset, un simbolo…',
    trendingTitle: 'Tendenze',
    trendingHint: 'i più consultati nelle ultime 24 ore',
    trendingEmpty: 'Tendenze momentaneamente non disponibili.',
    otherAssets: 'Azioni, ETF, indici e materie prime',
    loading: 'Ricerca in corso…',
    cryptoUnavailable:
      'La fonte cripto è momentaneamente satura. Le altre classi di attività restano consultabili.',
    hint: 'Ctrl + K per riaprire la ricerca',
  },

  locale: {
    convertedFrom: (from: string, date: string) => `convertito da ${from} al tasso BCE del ${date}`,
    currencyHint: (date: string) =>
      `Conversione al tasso di riferimento BCE del ${date}. Le fonti quotano in euro; la valuta scelta si applica a tutto il sito.`,
    open: 'Lingua e valuta',
    language: 'Lingua',
    currency: 'Valuta locale',
    search: 'Cerca',
    noMatch: 'Nessuna valuta corrisponde.',

    languageHint: "Le lingue contrassegnate come tradotte cambiano l’interfaccia. Le altre registrano la tua preferenza in attesa del rispettivo file di traduzione: preferiamo dichiarare ciò che manca piuttosto che servire una traduzione automatica non riletta.",
  },

  theme: {
    switchToDark: 'Passa al tema scuro',
    switchToLight: 'Passa al tema chiaro',
  },

  pages: {
    home: 'Home',
    crypto: 'Criptovalute',
    forex: 'Valute',
    stocks: 'Azioni',
    etf: 'ETF',
    commodities: 'Materie prime',
    indices: 'Indici',
    categories: 'Categorie',
    news: 'Notizie',
    sentiment: 'Sentiment di mercato',
    movers: 'Rialzi e ribassi',
    notFound: 'Pagina non trovata',
    learn: 'Impara',
    getStarted: 'Per iniziare',
    blog: 'Blog',
    methodology: 'Metodologia e fonti',
    developers: 'API e sviluppatori',
    help: 'Centro assistenza',
    changelog: 'Novità',
    about: 'Chi siamo',
  },

  globalStats: {
    marketCap: 'Capitalizzazione totale',
    volume: 'Volume 24 h',
    dominanceBtc: 'Dominanza BTC',
    dominanceEth: 'Dominanza ETH',
    activeAssets: 'Cripto attive',
    unavailable: 'Statistiche globali momentaneamente non disponibili',
    caption: (value: string, change: string) =>
      `La capitalizzazione globale delle criptovalute è di ${value}, ossia ${change} nelle ultime 24 ore.`,
  },

  home: {
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Curva in costruzione: nessuna fonte gratuita pubblica lo storico della capitalizzazione mondiale, perciò registriamo le nostre rilevazioni.'
        : `Curva in costruzione — ${count} rilevazioni finora.`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `Rilevazioni ZENKUU su ${Math.round(minutes / 60)} h`
        : `Rilevazioni ZENKUU su ${minutes} min`,
    marketCapSeriesLabel: (minutes: number) =>
      `Andamento della capitalizzazione totale negli ultimi ${minutes} minuti`,
    trendingTitle: 'Tendenze',
    gainersTitle: 'Maggiori rialzi',
    losersTitle: 'Maggiori ribassi',
    moversHint: (size: number) => `Tra le ${size} maggiori capitalizzazioni`,
    classMoversHint: (size: number) => `Tra i ${size} asset seguiti di questa classe`,
    summaryTitle: 'Riepilogo dei mercati',
    crossAssetTitle: 'Mercati principali',
    volumeLeadersTitle: 'Volumi più alti',
    economyTitle: 'Economia',
    heroMarketCap: 'Capitalizzazione cripto',
    heroLoading: 'Caricamento della serie…',
    heroUnavailable: 'Serie momentaneamente non disponibile.',
    newsTitle: 'Ultime notizie',
    sentimentTitle: 'Sentiment di mercato',
    coverageTitle: 'Copertura per classe di attività',
    seeAll: 'Vedi tutto',

    topMarketCapTitle: "Maggiori capitalizzazioni",
    marketCapCardTitle: "Capitalizzazione di mercato",
    volumeCardTitle: "Volume negoziato 24 h",
    narrativesTitle: "Settori più attivi · 24 h",
    forexTitle: "Valute · riferimento BCE",
    forexHint: "Tassi pubblicati una volta per giorno lavorativo",
    watchlistTitle: "La mia watchlist",
    watchlistEmptyTitle: "La tua watchlist è vuota",
    watchlistEmptyBody: "Gli asset aggiunti da una scheda compariranno qui. L’elenco è collegato al tuo account.",
    tabs: {
      all: "Tutto",
      trending: "Tendenze",
      gainers: "Rialzi",
      losers: "Ribassi",
      categories: "Categorie",
    },
  },

  assetClass: {
    crypto: 'Criptovalute',
    forex: 'Valute',
    stock: 'Azioni',
    etf: 'ETF',
    commodity: 'Materie prime',
    index: 'Indici',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: 'Dati non disponibili',
    connected: 'Collegato',
    pending: 'Da collegare',
  },

  auth: {
    signIn: 'Accedi',
    signUp: 'Registrati',

    unavailableTitle: "Account presto disponibili",
    unavailableBody: "L’autenticazione non è ancora configurata su questa istanza. Gli account renderanno persistente la watchlist e daranno accesso agli avvisi di prezzo e alle preferenze di visualizzazione.",
    signInTitle: "Accedi a ZENKUU",
    signInSubtitle: "Ritrova la tua watchlist e le tue preferenze.",
    signUpTitle: "Crea un account ZENKUU",
    signUpSubtitle: "Gratuito. Nessun dato bancario richiesto — ZENKUU non gestisce fondi né transazioni.",
    close: "Chiudi",
    overlaySignInTitle: "Benvenuto su ZENKUU",
    overlaySignInSubtitle: "Accesso o registrazione in pochi secondi.",
    overlaySignUpTitle: "Crea il tuo account",
    overlaySignUpSubtitle: "Gratuito, senza dati bancari.",
    switchToSignUp: "Non hai ancora un account?",
    switchToSignIn: "Hai già un account?",
    benefitsTitle: "Cosa offre l’account",
    benefits: [
      "La tua watchlist conservata e ritrovata su tutti i dispositivi",
      "Valuta di visualizzazione e tema memorizzati",
      "Le tue impostazioni applicate all’apertura, senza riconfigurare nulla",
    ],
    benefitsNote: "ZENKUU non esegue alcun ordine, non detiene fondi e non rivende dati. Un account serve solo a ritrovare le tue impostazioni.",
    legalPrefix: "Continuando, accetti le nostre condizioni d’uso, descritte",
    legalLink: "nella pagina Chi siamo",
  },

  notFound: {
    title: 'Questa vetta non esiste',
    body: 'La pagina che cerchi è stata spostata o non è mai esistita. Riparti dalla home page.',
    cta: 'Torna alla home',
  },


  market: {
    pageLabel: (page: number) => `Pagina ${page}`,
    columns: {
      rank: "#",
      name: "Asset",
      price: "Prezzo",
      change1h: "1 h",
      change24h: "24 h",
      change7d: "7 g",
      volume: "Volume 24 h",
      marketCap: "Capitalizzazione",
      chart: "7 giorni",
      variation: "Variazione",
      watch: "Seguito",
      dayRange: "Minimo / massimo 24 h",
    },
    sortByMarketCap: "Ordina per capitalizzazione",
    sortByVolume: "Ordina per volume",
    sortNotSupported: "L’ordinamento riguarda l’intera classifica. Le colonne di variazione non sono ordinabili: la fonte non lo consente sull’insieme del mercato.",
    previous: "Pagina precedente",
    next: "Pagina successiva",
    emptyPage: "Nessun asset in questa pagina della classifica. Torna alla prima pagina.",
  },

  crypto: {
    title: "Classifica delle criptovalute",
    subtitle: "Prezzi, capitalizzazione e volume in euro, aggiornati ogni 5 minuti.",
  },

  forex: {
    title: "Tassi di cambio",
    subtitle: "Tassi di riferimento pubblicati dalla Banca centrale europea, una volta per giorno lavorativo.",
  },

  stocks: {
    title: "Azioni",
    subtitle: "Quotazioni e capitalizzazioni dei principali titoli quotati.",
  },

  etf: {
    title: "ETF",
    subtitle: "Fondi indicizzati quotati: prezzo, variazione e volume.",
  },

  commodities: {
    title: "Materie prime",
    subtitle: "Energia, metalli preziosi e industriali, prodotti agricoli.",
  },

  indices: {
    title: "Indici azionari",
    subtitle: "I grandi indici mondiali e il loro andamento recente.",
  },

  asset: {
    convertedNotice: (from: string, to: string, date: string) =>
      `Importi convertiti da ${from} a ${to} al tasso di riferimento BCE del ${date}. La fonte quota questo asset in ${from}.`,
    aboutTitle: (name: string) => `Che cos'è ${name}`,
    statsTitle: "Statistiche di mercato",
    similarTitle: "Asset comparabili",
    rangeTitle: "Periodo",
    ranges: {
      d1: "24 h",
      d7: "7 g",
      d30: "30 g",
      d90: "90 g",
      y1: "1 anno",
    },
    chart: {
      kindTitle: "Tipo di grafico",
      kinds: {
        area: "Area",
        line: "Linea",
        baseline: "Scarto",
        candles: "Candele",
        bars: "Barre",
      },
      optionsTitle: "Visualizzazione",
      volume: "Volume",
      movingAverage: "Media mobile",
      priceLines: "Estremi",
      loadingCandles: "Caricamento delle candele…",
      candlesUnavailable: "Questa fonte non pubblica candele per questo asset: le viste Candele e Barre non sono quindi disponibili.",
      volumeUnavailable: "Volume non pubblicato dalla fonte per questo periodo.",
    },
    tabs: {
      overview: "Grafico",
      history: "Performance",
      stats: "Statistiche",
      about: "Informazioni",
      faq: "FAQ",
    },
    currencyLabel: "Valuta di visualizzazione",
    loadingSeries: "Caricamento della serie…",
    performanceTitle: "Performance per periodo",
    performanceNote: "Variazioni calcolate sulla serie di un anno caricata per questo asset; quella a 24 ore è ripresa così com’è dalla fonte.",
    rangeYearTitle: "Estremi su un anno",
    lowest: "Minimo",
    highest: "Massimo",
    stats: {
      marketCap: "Capitalizzazione",
      volume: "Volume 24 h",
      circulating: "Offerta circolante",
      total: "Offerta totale",
      max: "Offerta massima",
      ath: "Massimo storico",
      atl: "Minimo storico",
      rank: "Posizione",
      low24h: "Minimo 24 h",
      high24h: "Massimo 24 h",
      previousClose: "Chiusura precedente",
      exchange: "Borsa di quotazione",
      high52w: "Massimo 52 settimane",
      low52w: "Minimo 52 settimane",
    },
    noDescription: "La fonte non fornisce alcuna descrizione per questo asset.",
    readOnly: "Pagina solo informativa. ZENKUU non consente acquisti, vendite né invio di ordini.",
    officialLinks: "Link ufficiali",
    website: "Sito ufficiale",
    notFoundTitle: "Asset non trovato",
    notFoundBody: "Questo identificativo non corrisponde ad alcun asset noto alle nostre fonti.",
    backToRanking: "Torna alla classifica",
    chartUnavailable: "Storico dei prezzi non disponibile per questo asset.",
  },

  categories: {
    title: "Categorie e settori",
    subtitle: "Performance dei grandi narrativi del mercato cripto nelle ultime 24 ore.",
    columns: {
      name: "Categoria",
      marketCap: "Capitalizzazione",
      change: "24 h",
      volume: "Volume 24 h",
    },
  },

  news: {
    readOn: (source: string) => `Leggi su ${source}`,
    title: "Notizie dai mercati",
    subtitle: "Aggregate dai flussi pubblici dei principali editori.",
    unavailable: "Flusso di notizie momentaneamente non disponibile.",
  },

  sentiment: {
    title: "Indice Fear & Greed",
    subtitle: "Misura composita del sentiment del mercato cripto, da 0 (paura estrema) a 100 (avidità estrema).",
    scale: {
      extremeFear: "Paura estrema",
      fear: "Paura",
      neutral: "Neutro",
      greed: "Avidità",
      extremeGreed: "Avidità estrema",
    },
    disclaimer: "Indicatore di sentiment, non una raccomandazione. Non prevede alcun andamento di prezzo.",
  },

  footer: {
    rights: (year: number) => `© ${year} ZENKUU`,
    positioning: "Piattaforma informativa, senza esecuzione di ordini né custodia di fondi.",
    community: "Comunità",
    locale: "Italiano · EUR",
    localeHint: "Il sito è pubblicato in francese, con l’euro come valuta di riferimento. Seguiranno altre lingue e valute.",
    disclaimer: "ZENKUU è una piattaforma informativa di sola consultazione. Nessuna funzione di acquisto, vendita o collegamento a un portafoglio. Le informazioni mostrate non costituiscono consulenza finanziaria.",
    dataNote: "Dati di mercato forniti da fonti pubbliche, aggiornati ogni 5 minuti.",
  },

  placeholder: {
    plannedTitle: "Cosa conterrà questa pagina",
    meanwhileTitle: "Nel frattempo",
    meanwhileBody: "La pagina Metodologia illustra fin d’ora da dove vengono i nostri dati, con quale frequenza sono aggiornati e cosa non mostriamo per mancanza di fonte.",
    meanwhileCta: "Vedi la metodologia",
  },}

export default it
