import type { Translation } from './index'

/**
 * Textos da interface — português do Brasil.
 *
 * Tradução parcial e deliberada : ver `it.ts`, que explica o critério. As seções
 * presentes em TODAS as páginas são traduzidas ; as longas e especializadas recaem
 * sobre o inglês, que `content/locales/index.ts` interpõe antes do francês.
 *
 * ── POR QUE pt-BR E NÃO pt ────────────────────────────────────────────────────
 *
 * O seletor declara `pt-BR`, e a distinção não é cosmética : « ações » e « ativos »
 * não são os termos de Portugal, nem a formatação de números a mesma. Servir um
 * português genérico daria a duas populações um texto que não é o de nenhuma delas.
 */
const ptBR: Translation = {
  site: {
    name: 'Zenkuu',
    tagline: 'Acompanhamento e análise de mercados multiativos',
    description:
      'Criptomoedas, moedas, ações, ETFs, commodities e índices — preços, capitalizações e tendências em um só lugar. Plataforma somente de consulta.',
  },

  nav: {
    home: 'Início',
    soon: 'Em breve',
    soonShort: 'Em breve',
    openMenu: 'Abrir o menu',
    searchPlaceholder: 'Buscar um ativo',
    searchSoon: 'A busca universal chega com as próximas classes de ativos.',
    skipToContent: 'Ir para o conteúdo principal',
  },

  search: {
    title: 'Busca universal',
    open: 'Abrir a busca',
    close: 'Fechar a busca',
    placeholder: 'Buscar um ativo, um símbolo…',
    trendingTitle: 'Tendências',
    trendingHint: 'os mais consultados nas últimas 24 h',
    trendingEmpty: 'Tendências temporariamente indisponíveis.',
    otherAssets: 'Ações, ETFs, índices e commodities',
    loading: 'Buscando…',
    noResult: (query: string) => `Nenhum ativo corresponde a « ${query} ».`,
    cryptoUnavailable:
      'A fonte de cripto está temporariamente saturada. As demais classes de ativos seguem disponíveis.',
    hint: 'Ctrl + K para reabrir a busca',
  },

  locale: {
    open: 'Idioma e moeda',
    language: 'Idioma',
    currency: 'Moeda local',
    search: 'Buscar',
    noMatch: 'Nenhuma moeda corresponde.',
  },

  theme: {
    switchToDark: 'Mudar para o tema escuro',
    switchToLight: 'Mudar para o tema claro',
  },

  pages: {
    home: 'Início',
    crypto: 'Criptomoedas',
    forex: 'Moedas',
    stocks: 'Ações',
    etf: 'ETFs',
    commodities: 'Commodities',
    indices: 'Índices',
    categories: 'Categorias',
    news: 'Notícias',
    sentiment: 'Sentimento do mercado',
    movers: 'Altas e baixas',
    notFound: 'Página não encontrada',
    learn: 'Aprender',
    getStarted: 'Primeiros passos',
    blog: 'Blog',
    methodology: 'Metodologia e fontes',
    developers: 'API e desenvolvedores',
    help: 'Central de ajuda',
    changelog: 'Novidades',
    about: 'Sobre',
  },

  globalStats: {
    marketCap: 'Capitalização total',
    volume: 'Volume 24 h',
    dominanceBtc: 'Dominância BTC',
    dominanceEth: 'Dominância ETH',
    activeAssets: 'Criptos ativas',
    unavailable: 'Estatísticas globais temporariamente indisponíveis',
    caption: (value: string, change: string) =>
      `A capitalização global das criptomoedas é de ${value}, ou seja ${change} nas últimas 24 horas.`,
  },

  home: {
    trendingTitle: 'Tendências',
    gainersTitle: 'Maiores altas',
    losersTitle: 'Maiores baixas',
    moversHint: (size: number) => `Entre as ${size} maiores capitalizações`,
    classMoversHint: (size: number) => `Entre os ${size} ativos acompanhados desta classe`,
    summaryTitle: 'Resumo dos mercados',
    topIndicesTitle: 'Principais índices',
    volumeLeadersTitle: 'Maiores volumes',
    economyTitle: 'Economia',
    heroMarketCap: 'Capitalização cripto',
    heroLoading: 'Carregando a série…',
    heroUnavailable: 'Série temporariamente indisponível.',
    newsTitle: 'Últimas notícias',
    sentimentTitle: 'Sentimento do mercado',
    coverageTitle: 'Cobertura por classe de ativo',
    seeAll: 'Ver tudo',
  },

  assetClass: {
    crypto: 'Criptomoedas',
    forex: 'Moedas',
    stock: 'Ações',
    etf: 'ETFs',
    commodity: 'Commodities',
    index: 'Índices',
    nft: 'NFTs',
  },

  states: {
    unavailableTitle: 'Dados indisponíveis',
    connected: 'Conectado',
    pending: 'A conectar',
  },

  auth: {
    signIn: 'Entrar',
    signUp: 'Cadastrar-se',
  },

  notFound: {
    title: 'Este cume não existe',
    body: 'A página que você procura foi movida ou nunca existiu. Recomece a subida pela página inicial.',
    cta: 'Voltar ao início',
  },
}

export default ptBR
