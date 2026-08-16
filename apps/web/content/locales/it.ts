import type { Translation } from './index'

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
    noResult: (query: string) => `Nessun asset corrisponde a « ${query} ».`,
    cryptoUnavailable:
      'La fonte cripto è momentaneamente satura. Le altre classi di attività restano consultabili.',
    hint: 'Ctrl + K per riaprire la ricerca',
  },

  locale: {
    open: 'Lingua e valuta',
    language: 'Lingua',
    currency: 'Valuta locale',
    search: 'Cerca',
    noMatch: 'Nessuna valuta corrisponde.',
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
    trendingTitle: 'Tendenze',
    gainersTitle: 'Maggiori rialzi',
    losersTitle: 'Maggiori ribassi',
    moversHint: (size: number) => `Tra le ${size} maggiori capitalizzazioni`,
    classMoversHint: (size: number) => `Tra i ${size} asset seguiti di questa classe`,
    summaryTitle: 'Riepilogo dei mercati',
    topIndicesTitle: 'Indici principali',
    volumeLeadersTitle: 'Volumi più alti',
    economyTitle: 'Economia',
    heroMarketCap: 'Capitalizzazione cripto',
    heroLoading: 'Caricamento della serie…',
    heroUnavailable: 'Serie momentaneamente non disponibile.',
    newsTitle: 'Ultime notizie',
    sentimentTitle: 'Sentiment di mercato',
    coverageTitle: 'Copertura per classe di attività',
    seeAll: 'Vedi tutto',
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
  },

  notFound: {
    title: 'Questa vetta non esiste',
    body: 'La pagina che cerchi è stata spostata o non è mai esistita. Riparti dalla home page.',
    cta: 'Torna alla home',
  },
}

export default it
