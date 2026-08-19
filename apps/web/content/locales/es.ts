import type { Translation } from './index'
import { esPhrases } from './phrases/es'

/**
 * Textos de la interfaz — español.
 *
 * Completo. Tipado como `Translation`, de modo que el compilador rechaza cualquier
 * clave que no exista en `content/fr.ts`: una errata no puede colarse en silencio.
 *
 * `footer.poweredByCoinGecko` no aparece aquí a propósito — es una atribución
 * contractual que debe permanecer en inglés.
 */
const es: Translation = {
  phrases: esPhrases,

  site: {
    name: 'Zenkuu',
    tagline: 'Seguimiento y análisis de mercados multiactivo',
    description:
      'Criptomonedas, divisas, acciones, ETF, materias primas e índices: precios, capitalizaciones y tendencias en un mismo lugar. Plataforma de análisis de solo lectura.',
  },

  nav: {
    home: 'Inicio',
    soon: 'Próximamente',
    soonShort: 'Pronto',
    openMenu: 'Abrir el menú',
    searchPlaceholder: 'Buscar un activo',
    searchSoon: 'La búsqueda universal llegará con las próximas clases de activos.',
    skipToContent: 'Ir al contenido principal',
  },

  search: {
    title: 'Búsqueda universal',
    open: 'Abrir la búsqueda',
    close: 'Cerrar la búsqueda',
    placeholder: 'Buscar un activo, un símbolo…',
    trendingTitle: 'Tendencias',
    trendingHint: 'los más consultados en 24 h',
    trendingEmpty: 'Tendencias no disponibles por el momento.',
    otherAssets: 'Acciones, ETF, índices y materias primas',
    loading: 'Buscando…',
    noResult: (query: string) => `Ningún activo coincide con «${query}».`,
    cryptoUnavailable:
      'La fuente de cripto está saturada por el momento. Las demás clases de activos siguen disponibles.',
    hint: 'Ctrl + K para reabrir la búsqueda',
  },

  locale: {
    open: 'Idioma y moneda',
    language: 'Idioma',
    languageHint:
      'El sitio se publica en francés, inglés y español. Los demás idiomas llegarán con sus archivos de traducción: preferimos no ofrecer nada antes que una traducción automática.',
    currency: 'Moneda local',
    currencyHint: (date: string) =>
      `Conversión al tipo de referencia del BCE del ${date}. Las fuentes cotizan en euros; la moneda elegida se aplica a todo el sitio.`,
    search: 'Buscar',
    noMatch: 'Ninguna moneda coincide.',
    convertedFrom: (from: string, date: string) =>
      `convertido desde ${from} · tipo BCE del ${date}`,
  },

  auth: {
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    unavailableTitle: 'Cuentas próximamente',
    unavailableBody:
      'La autenticación aún no está configurada en esta instancia. Las cuentas harán persistente la lista de seguimiento y darán acceso a las alertas de precio y a las preferencias de visualización.',
    signInTitle: 'Iniciar sesión en ZENKUU',
    signInSubtitle: 'Recupera tu lista de seguimiento y tus preferencias.',
    signUpTitle: 'Crear una cuenta ZENKUU',
    signUpSubtitle:
      'Gratis. No pedimos datos bancarios: ZENKUU no gestiona fondos ni operaciones.',

    close: 'Cerrar',
    overlaySignInTitle: 'Bienvenido a ZENKUU',
    overlaySignInSubtitle: 'Inicia sesión o regístrate en segundos.',
    overlaySignUpTitle: 'Crea tu cuenta',
    overlaySignUpSubtitle: 'Gratis, sin datos bancarios.',
    switchToSignUp: '¿Aún no tienes cuenta?',
    switchToSignIn: '¿Ya tienes una cuenta?',

    benefitsTitle: 'Lo que aporta la cuenta',
    benefits: [
      'Tu lista de seguimiento conservada y recuperada en todos tus dispositivos',
      'Moneda de visualización y tema memorizados',
      'Tus ajustes aplicados nada más entrar, sin volver a configurarlos',
    ],
    benefitsNote:
      'ZENKUU no ejecuta ninguna orden, no custodia fondos y no revende datos. Una cuenta solo sirve para recuperar tus ajustes.',
    legalPrefix: 'Al continuar, aceptas nuestras condiciones de uso, descritas',
    legalLink: 'en la página Acerca de',
  },

  theme: {
    switchToDark: 'Cambiar al tema oscuro',
    switchToLight: 'Cambiar al tema claro',
  },

  pages: {
    home: 'Inicio',
    crypto: 'Criptomonedas',
    forex: 'Divisas',
    stocks: 'Acciones',
    etf: 'ETF',
    commodities: 'Materias primas',
    indices: 'Índices',
    categories: 'Categorías',
    news: 'Noticias',
    sentiment: 'Sentimiento del mercado',
    movers: 'Subidas y bajadas',
    notFound: 'Página no encontrada',
    learn: 'Aprender',
    getStarted: 'Primeros pasos',
    blog: 'Blog',
    methodology: 'Metodología y fuentes',
    developers: 'API y desarrolladores',
    help: 'Centro de ayuda',
    changelog: 'Novedades',
    about: 'Acerca de',
  },

  globalStats: {
    marketCap: 'Capitalización total',
    volume: 'Volumen 24 h',
    dominanceBtc: 'Dominancia BTC',
    dominanceEth: 'Dominancia ETH',
    activeAssets: 'Criptos activas',
    unavailable: 'Estadísticas globales no disponibles por el momento',
    caption: (value: string, change: string) =>
      `La capitalización mundial de las criptomonedas asciende a ${value}, es decir ${change} en las últimas 24 horas.`,
  },

  home: {
    classMoversHint: (size: number) => `Entre los ${size} activos seguidos de esta clase`,
    trendingTitle: 'Tendencias',
    gainersTitle: 'Mayores subidas',
    losersTitle: 'Mayores bajadas',
    moversHint: (size: number) => `Entre las ${size} mayores capitalizaciones`,
    topMarketCapTitle: 'Mayores capitalizaciones',
    marketCapCardTitle: 'Capitalización del mercado',
    marketCapSeriesLabel: (minutes: number) =>
      `Evolución de la capitalización total en los últimos ${minutes} minutos`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `Mediciones ZENKUU en ${Math.round(minutes / 60)} h`
        : `Mediciones ZENKUU en ${minutes} min`,
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Curva en construcción: ninguna fuente gratuita publica el histórico de la capitalización mundial, así que registramos nuestras propias mediciones.'
        : `Curva en construcción — ${count} medición${count > 1 ? 'es' : ''} registrada${count > 1 ? 's' : ''}. Trazamos nuestras propias mediciones, a falta de una fuente gratuita para este histórico.`,
    volumeCardTitle: 'Volumen negociado 24 h',
    narrativesTitle: 'Sectores más activos · 24 h',
    newsTitle: 'Últimas noticias',
    sentimentTitle: 'Sentimiento del mercado',
    coverageTitle: 'Cobertura por clase de activo',
    forexTitle: 'Divisas · referencia BCE',
    forexHint: 'Tipos publicados una vez por día hábil',
    watchlistTitle: 'Mi lista de seguimiento',
    watchlistEmptyTitle: 'Tu lista de seguimiento está vacía',
    watchlistEmptyBody:
      'Los activos añadidos desde una ficha aparecerán aquí. La lista está vinculada a tu cuenta.',
    seeAll: 'Ver todo',
    tabs: {
      all: 'Todo',
      trending: 'Tendencias',
      gainers: 'Subidas',
      losers: 'Bajadas',
      categories: 'Categorías',
    },

    summaryTitle: "Resumen de los mercados",
    topIndicesTitle: "Índices principales",
    volumeLeadersTitle: "Mayores volúmenes",
    economyTitle: "Economía",
    heroMarketCap: "Capitalización cripto",
    heroLoading: "Cargando la serie…",
    heroUnavailable: "Serie momentáneamente no disponible.",
  },

  market: {
    columns: {
      rank: '#',
      name: 'Activo',
      price: 'Precio',
      change1h: '1 h',
      change24h: '24 h',
      change7d: '7 d',
      volume: 'Volumen 24 h',
      marketCap: 'Capitalización',
      chart: '7 días',
      variation: 'Variación',
      watch: 'Seguir',
      dayRange: 'Mínimo / máximo 24 h',
    },
    sortByMarketCap: 'Ordenar por capitalización',
    sortByVolume: 'Ordenar por volumen',
    sortNotSupported:
      'La ordenación se aplica a toda la clasificación. Las columnas de variación no son ordenables: la fuente no lo permite a escala del mercado entero.',
    previous: 'Página anterior',
    next: 'Página siguiente',
    pageLabel: (page: number) => `Página ${page}`,
    emptyPage: 'No hay ningún activo en esta página. Vuelve a la primera página.',
  },

  crypto: {
    title: 'Clasificación de criptomonedas',
    subtitle: 'Precio, capitalización y volumen en euros, actualizados cada 5 minutos.',
  },

  forex: {
    title: 'Tipos de cambio',
    subtitle:
      'Tipos de referencia publicados por el Banco Central Europeo, una vez por día hábil.',
  },

  stocks: {
    title: 'Acciones',
    subtitle: 'Cotizaciones y capitalizaciones de los principales valores cotizados.',
  },

  etf: {
    title: 'ETF',
    subtitle: 'Fondos cotizados en bolsa: precio, variación y volumen.',
  },

  commodities: {
    title: 'Materias primas',
    subtitle: 'Energía, metales preciosos e industriales, productos agrícolas.',
  },

  indices: {
    title: 'Índices bursátiles',
    subtitle: 'Los grandes índices mundiales y su evolución reciente.',
  },

  asset: {
    priceLabel: (name: string) => `Precio de ${name}`,
    statsTitle: 'Estadísticas de mercado',
    aboutTitle: (name: string) => `Acerca de ${name}`,
    similarTitle: 'Activos comparables',
    rangeTitle: 'Periodo',
    ranges: { d1: '24 h', d7: '7 d', d30: '30 d', d90: '90 d', y1: '1 año' },
    chart: {
      kindTitle: 'Tipo de gráfico',
      kinds: {
        area: 'Área',
        line: 'Línea',
        baseline: 'Diferencia',
        candles: 'Velas',
        bars: 'Barras',
      },
      optionsTitle: 'Visualización',
      volume: 'Volumen',
      movingAverage: 'Media móvil',
      priceLines: 'Extremos',
      loadingCandles: 'Cargando velas…',
      candlesUnavailable:
        'Esta fuente no publica velas para este activo, por lo que las vistas Velas y Barras no están disponibles.',
      volumeUnavailable: 'Volumen no publicado por la fuente para este periodo.',
    },
    tabs: {
      overview: 'Gráfico',
      history: 'Rendimiento',
      stats: 'Estadísticas',
      about: 'Acerca de',
      faq: 'Preguntas frecuentes',
    },
    currencyLabel: 'Moneda de visualización',
    convertedNotice: (from: string, to: string, date: string) =>
      `Importes convertidos de ${from} a ${to} al tipo de referencia del BCE del ${date}. La fuente cotiza este activo en ${from}.`,
    loadingSeries: 'Cargando la serie…',
    performanceTitle: 'Rendimiento por periodo',
    performanceNote:
      'Variaciones calculadas sobre la serie de un año cargada para este activo; la de 24 h se toma tal cual de la fuente.',
    rangeYearTitle: 'Extremos en un año',
    lowest: 'Mínimo',
    highest: 'Máximo',
    faq: {
      priceQ: (name: string) => `¿Cuál es el precio de ${name} hoy?`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} se negocia a ${price}. Último valor publicado por nuestra fuente el ${updated}.`,
      capQ: (name: string) => `¿Cuál es la capitalización de ${name}?`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `Su capitalización asciende a ${cap}, lo que lo sitúa en el puesto ${rank} de su clase de activo.`
          : `Su capitalización asciende a ${cap}.`,
      athQ: (name: string) => `¿Cuál es el máximo histórico de ${name}?`,
      athA: (price: string, date: string | null) =>
        date
          ? `Su máximo histórico es de ${price}, alcanzado el ${date}.`
          : `Su máximo histórico es de ${price}.`,
      supplyQ: (name: string) => `¿Cuántas unidades de ${name} existirán como máximo?`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `La oferta máxima es de ${max} ${symbol}, de los cuales ${circulating} ${symbol} están actualmente en circulación.`
          : `La oferta máxima es de ${max} ${symbol}.`,
      buyQ: (name: string) => `¿Se puede comprar ${name} en ZENKUU?`,
      buyA:
        'No. ZENKUU es una plataforma de información: no ejecutamos órdenes, no custodiamos fondos y no somos ni bróker ni casa de cambio.',
    },
    stats: {
      marketCap: 'Capitalización',
      volume: 'Volumen 24 h',
      circulating: 'Oferta en circulación',
      total: 'Oferta total',
      max: 'Oferta máxima',
      ath: 'Máximo histórico',
      atl: 'Mínimo histórico',
      rank: 'Puesto',
      low24h: 'Mínimo 24 h',
      high24h: 'Máximo 24 h',
      previousClose: 'Cierre anterior',
      exchange: 'Mercado de cotización',
      high52w: 'Máximo 52 semanas',
      low52w: 'Mínimo 52 semanas',
    },
    noDescription: 'La fuente no proporciona ninguna descripción para este activo.',
    readOnly:
      'Página informativa únicamente. ZENKUU no permite comprar, vender ni cursar órdenes.',
    officialLinks: 'Enlaces oficiales',
    website: 'Sitio oficial',
    notFoundTitle: 'Activo no encontrado',
    notFoundBody: 'Este identificador no corresponde a ningún activo conocido por nuestras fuentes.',
    backToRanking: 'Volver a la clasificación',
    chartUnavailable: 'Histórico de precios no disponible para este activo.',
  },

  categories: {
    title: 'Categorías y sectores',
    subtitle: 'Rendimiento de las grandes narrativas del mercado cripto en 24 horas.',
    columns: {
      name: 'Categoría',
      marketCap: 'Capitalización',
      change: '24 h',
      volume: 'Volumen 24 h',
    },
  },

  news: {
    title: 'Noticias de los mercados',
    subtitle: 'Agregadas desde los flujos públicos de los principales editores.',
    readOn: (source: string) => `Leer en ${source}`,
    unavailable: 'Flujo de noticias no disponible por el momento.',
  },

  sentiment: {
    title: 'Índice Fear & Greed',
    subtitle:
      'Medida compuesta del sentimiento del mercado cripto, de 0 (miedo extremo) a 100 (codicia extrema).',
    scale: {
      extremeFear: 'Miedo extremo',
      fear: 'Miedo',
      neutral: 'Neutral',
      greed: 'Codicia',
      extremeGreed: 'Codicia extrema',
    },
    disclaimer:
      'Indicador de sentimiento, no una recomendación. No predice ninguna evolución de precios.',
  },

  assetClass: {
    crypto: 'Criptomonedas',
    forex: 'Divisas',
    stock: 'Acciones',
    etf: 'ETF',
    commodity: 'Materias primas',
    index: 'Índices',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: 'Datos no disponibles',
    connected: 'Conectado',
    pending: 'Por conectar',
  },

  footer: {
    positioning: 'Plataforma informativa, sin ejecución de órdenes ni custodia de fondos.',
    community: 'Comunidad',
    locale: 'Español · EUR',
    localeHint:
      'El sitio se publica en varios idiomas, con el euro como moneda de referencia. Seguirán más idiomas y monedas.',
    disclaimer:
      'ZENKUU es una plataforma de información de solo lectura. Sin función de compra, venta o conexión de monedero. La información mostrada no constituye asesoramiento de inversión.',
    dataNote:
      'Datos de mercado facilitados por fuentes públicas, actualizados cada 5 minutos.',
    rights: (year: number) => `© ${year} ZENKUU`,
  },

  placeholder: {
    plannedTitle: 'Lo que contendrá esta página',
    meanwhileTitle: 'Mientras tanto',
    meanwhileBody:
      'La página Metodología detalla ya de dónde vienen nuestras cifras, con qué frecuencia se actualizan y qué no mostramos por falta de fuente.',
    meanwhileCta: 'Ver la metodología',
  },

  notFound: {
    title: 'Esta cumbre no existe',
    body: 'La página que buscas se ha movido o nunca existió. Retoma la ascensión desde el inicio.',
    cta: 'Volver al inicio',
  },
}

export default es
