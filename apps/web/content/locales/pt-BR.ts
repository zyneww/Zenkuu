import type { Translation } from './index'
import { ptBRPhrases } from './phrases/pt-BR'

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
  phrases: ptBRPhrases,

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
  
    languageHint: "Os idiomas marcados como traduzidos alteram a interface. Os demais registram sua preferência à espera do respectivo arquivo de tradução — preferimos declarar o que falta a servir uma tradução automática não revisada.",
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
  
    topMarketCapTitle: "Maiores capitalizações",
    marketCapCardTitle: "Capitalização de mercado",
    volumeCardTitle: "Volume negociado 24 h",
    narrativesTitle: "Setores mais ativos · 24 h",
    forexTitle: "Moedas · referência BCE",
    forexHint: "Taxas publicadas uma vez por dia útil",
    watchlistTitle: "Minha lista de acompanhamento",
    watchlistEmptyTitle: "Sua lista de acompanhamento está vazia",
    watchlistEmptyBody: "Os ativos adicionados a partir de uma página aparecerão aqui. A lista está vinculada à sua conta.",
    tabs: {
      all: "Tudo",
      trending: "Em alta",
      gainers: "Altas",
      losers: "Baixas",
      categories: "Categorias",
    },
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
  
    unavailableTitle: "Contas em breve",
    unavailableBody: "A autenticação ainda não está configurada nesta instância. As contas tornarão a lista de acompanhamento persistente e darão acesso a alertas de preço e preferências de exibição.",
    signInTitle: "Entrar no ZENKUU",
    signInSubtitle: "Recupere sua lista de acompanhamento e suas preferências.",
    signUpTitle: "Criar uma conta ZENKUU",
    signUpSubtitle: "Gratuito. Nenhum dado bancário solicitado — o ZENKUU não movimenta fundos nem transações.",
    close: "Fechar",
    overlaySignInTitle: "Bem-vindo ao ZENKUU",
    overlaySignInSubtitle: "Entre ou cadastre-se em segundos.",
    overlaySignUpTitle: "Criar sua conta",
    overlaySignUpSubtitle: "Gratuito, sem dados bancários.",
    switchToSignUp: "Ainda não tem conta?",
    switchToSignIn: "Já tem uma conta?",
    benefitsTitle: "O que a conta oferece",
    benefits: [
      "Sua lista de acompanhamento guardada e disponível em todos os seus aparelhos",
      "Moeda de exibição e tema memorizados",
      "Suas preferências aplicadas já na abertura, sem reconfigurar",
    ],
    benefitsNote: "O ZENKUU não executa ordens, não custodia fundos e não revende dados. Uma conta serve apenas para recuperar suas preferências.",
    legalPrefix: "Ao continuar, você aceita nossos termos de uso, descritos",
    legalLink: "na página Sobre",
  },

  notFound: {
    title: 'Este cume não existe',
    body: 'A página que você procura foi movida ou nunca existiu. Recomece a subida pela página inicial.',
    cta: 'Voltar ao início',
  },


  market: {
    columns: {
      rank: "#",
      name: "Ativo",
      price: "Preço",
      change1h: "1 h",
      change24h: "24 h",
      change7d: "7 d",
      volume: "Volume 24 h",
      marketCap: "Capitalização",
      chart: "7 dias",
      variation: "Variação",
      watch: "Acompanhar",
      dayRange: "Mínima / máxima 24 h",
    },
    sortByMarketCap: "Ordenar por capitalização",
    sortByVolume: "Ordenar por volume",
    sortNotSupported: "A ordenação abrange toda a classificação. As colunas de variação não são ordenáveis: a fonte não permite fazê-lo em todo o mercado.",
    previous: "Página anterior",
    next: "Próxima página",
    emptyPage: "Nenhum ativo nesta página da classificação. Volte à primeira página.",
  },

  crypto: {
    title: "Classificação das criptomoedas",
    subtitle: "Preços, capitalização e volume em euros, atualizados a cada 5 minutos.",
  },

  forex: {
    title: "Taxas de câmbio",
    subtitle: "Taxas de referência publicadas pelo Banco Central Europeu, uma vez por dia útil.",
  },

  stocks: {
    title: "Ações",
    subtitle: "Cotações e capitalizações das principais empresas listadas.",
  },

  etf: {
    title: "ETFs",
    subtitle: "Fundos de índice negociados em bolsa: cotação, variação e volume.",
  },

  commodities: {
    title: "Commodities",
    subtitle: "Energia, metais preciosos e industriais, produtos agrícolas.",
  },

  indices: {
    title: "Índices de bolsa",
    subtitle: "Os grandes índices mundiais e sua evolução recente.",
  },

  asset: {
    statsTitle: "Estatísticas de mercado",
    similarTitle: "Ativos comparáveis",
    rangeTitle: "Período",
    ranges: {
      d1: "24 h",
      d7: "7 d",
      d30: "30 d",
      d90: "90 d",
      y1: "1 ano",
    },
    chart: {
      kindTitle: "Tipo de gráfico",
      kinds: {
        area: "Área",
        line: "Linha",
        baseline: "Desvio",
        candles: "Candles",
        bars: "Barras",
      },
      optionsTitle: "Exibição",
      volume: "Volume",
      movingAverage: "Média móvel",
      priceLines: "Extremos",
      loadingCandles: "Carregando os candles…",
      candlesUnavailable: "Esta fonte não publica candles para este ativo — as visualizações Candles e Barras ficam, portanto, indisponíveis.",
      volumeUnavailable: "Volume não publicado pela fonte para este período.",
    },
    tabs: {
      overview: "Gráfico",
      history: "Desempenho",
      stats: "Estatísticas",
      about: "Sobre",
      faq: "FAQ",
    },
    currencyLabel: "Moeda de exibição",
    loadingSeries: "Carregando a série…",
    performanceTitle: "Desempenho por período",
    performanceNote: "Variações calculadas sobre a série de um ano carregada para este ativo; a de 24 horas vem tal como publicada pela fonte.",
    rangeYearTitle: "Extremos em um ano",
    lowest: "Mínima",
    highest: "Máxima",
    faq: {
      buyA: "Não. O ZENKUU é uma plataforma de informação: não executamos ordens, não custodiamos fundos e não somos corretora nem exchange.",
    },
    stats: {
      marketCap: "Capitalização",
      volume: "Volume 24 h",
      circulating: "Oferta circulante",
      total: "Oferta total",
      max: "Oferta máxima",
      ath: "Máxima histórica",
      atl: "Mínima histórica",
      rank: "Posição",
      low24h: "Mínima 24 h",
      high24h: "Máxima 24 h",
      previousClose: "Fechamento anterior",
      exchange: "Bolsa de negociação",
      high52w: "Máxima 52 semanas",
      low52w: "Mínima 52 semanas",
    },
    noDescription: "A fonte não fornece descrição para este ativo.",
    readOnly: "Página apenas informativa. O ZENKUU não permite compra, venda nem envio de ordens.",
    officialLinks: "Links oficiais",
    website: "Site oficial",
    notFoundTitle: "Ativo não encontrado",
    notFoundBody: "Este identificador não corresponde a nenhum ativo conhecido pelas nossas fontes.",
    backToRanking: "Voltar à classificação",
    chartUnavailable: "Histórico de preços indisponível para este ativo.",
  },

  categories: {
    title: "Categorias e setores",
    subtitle: "Desempenho das grandes narrativas do mercado cripto em 24 horas.",
    columns: {
      name: "Categoria",
      marketCap: "Capitalização",
      change: "24 h",
      volume: "Volume 24 h",
    },
  },

  news: {
    title: "Notícias dos mercados",
    subtitle: "Agregadas a partir dos feeds públicos dos principais veículos.",
    unavailable: "Fluxo de notícias momentaneamente indisponível.",
  },

  sentiment: {
    title: "Índice Fear & Greed",
    subtitle: "Medida composta do sentimento do mercado cripto, de 0 (medo extremo) a 100 (ganância extrema).",
    scale: {
      extremeFear: "Medo extremo",
      fear: "Medo",
      neutral: "Neutro",
      greed: "Ganância",
      extremeGreed: "Ganância extrema",
    },
    disclaimer: "Indicador de sentimento, não uma recomendação. Ele não prevê nenhuma evolução de preço.",
  },

  footer: {
    positioning: "Plataforma de informação, sem execução de ordens nem custódia de fundos.",
    community: "Comunidade",
    locale: "Português · EUR",
    localeHint: "O site é publicado em francês, com o euro como moeda de referência. Outros idiomas e moedas virão a seguir.",
    disclaimer: "O ZENKUU é uma plataforma de informação somente leitura. Nenhuma função de compra, venda ou conexão a uma carteira. As informações exibidas não constituem recomendação de investimento.",
    dataNote: "Dados de mercado fornecidos por fontes públicas, atualizados a cada 5 minutos.",
  },

  placeholder: {
    plannedTitle: "O que esta página trará",
    meanwhileTitle: "Enquanto isso",
    meanwhileBody: "A página Metodologia já detalha de onde vêm nossos números, com que frequência são atualizados e o que não exibimos por falta de fonte.",
    meanwhileCta: "Ver a metodologia",
  },}

export default ptBR
