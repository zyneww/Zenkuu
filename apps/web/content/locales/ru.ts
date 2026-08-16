import type { Translation } from './index'

/**
 * Тексты интерфейса — русский.
 *
 * Частичный перевод, и это сделано намеренно : см. `it.ts`, где изложен критерий.
 * Переведены разделы, присутствующие на КАЖДОЙ странице ; длинные и
 * специализированные откатываются на английский, который `content/locales/index.ts`
 * ставит перед французским.
 */
const ru: Translation = {
  site: {
    name: 'Zenkuu',
    tagline: 'Отслеживание и анализ мультиактивных рынков',
    description:
      'Криптовалюты, валюты, акции, ETF, сырьевые товары и индексы — котировки, капитализация и тенденции в одном месте. Платформа только для чтения.',
  },

  nav: {
    home: 'Главная',
    soon: 'Скоро',
    soonShort: 'Скоро',
    openMenu: 'Открыть меню',
    searchPlaceholder: 'Найти актив',
    searchSoon: 'Универсальный поиск появится вместе со следующими классами активов.',
    skipToContent: 'Перейти к основному содержанию',
  },

  search: {
    title: 'Универсальный поиск',
    open: 'Открыть поиск',
    close: 'Закрыть поиск',
    placeholder: 'Найти актив, символ…',
    trendingTitle: 'В тренде',
    trendingHint: 'самые просматриваемые за 24 часа',
    trendingEmpty: 'Тренды временно недоступны.',
    otherAssets: 'Акции, ETF, индексы и сырьевые товары',
    loading: 'Идёт поиск…',
    noResult: (query: string) => `Ни один актив не соответствует « ${query} ».`,
    cryptoUnavailable:
      'Криптоисточник временно перегружен. Остальные классы активов доступны.',
    hint: 'Ctrl + K, чтобы снова открыть поиск',
  },

  locale: {
    open: 'Язык и валюта',
    language: 'Язык',
    currency: 'Местная валюта',
    search: 'Поиск',
    noMatch: 'Ни одна валюта не соответствует.',
  },

  theme: {
    switchToDark: 'Переключить на тёмную тему',
    switchToLight: 'Переключить на светлую тему',
  },

  pages: {
    home: 'Главная',
    crypto: 'Криптовалюты',
    forex: 'Валюты',
    stocks: 'Акции',
    etf: 'ETF',
    commodities: 'Сырьевые товары',
    indices: 'Индексы',
    categories: 'Категории',
    news: 'Новости',
    sentiment: 'Настроение рынка',
    movers: 'Рост и падение',
    notFound: 'Страница не найдена',
    learn: 'Обучение',
    getStarted: 'С чего начать',
    blog: 'Блог',
    methodology: 'Методология и источники',
    developers: 'API и разработчики',
    help: 'Центр помощи',
    changelog: 'Что нового',
    about: 'О нас',
  },

  globalStats: {
    marketCap: 'Общая капитализация',
    volume: 'Объём за 24 ч',
    dominanceBtc: 'Доминирование BTC',
    dominanceEth: 'Доминирование ETH',
    activeAssets: 'Активные криптовалюты',
    unavailable: 'Глобальная статистика временно недоступна',
    caption: (value: string, change: string) =>
      `Мировая капитализация криптовалют составляет ${value}, то есть ${change} за последние 24 часа.`,
  },

  home: {
    trendingTitle: 'В тренде',
    gainersTitle: 'Наибольший рост',
    losersTitle: 'Наибольшее падение',
    moversHint: (size: number) => `Среди ${size} крупнейших капитализаций`,
    classMoversHint: (size: number) => `Среди ${size} отслеживаемых активов этого класса`,
    summaryTitle: 'Обзор рынков',
    topIndicesTitle: 'Основные индексы',
    volumeLeadersTitle: 'Наибольшие объёмы',
    economyTitle: 'Экономика',
    heroMarketCap: 'Капитализация крипто',
    heroLoading: 'Загрузка ряда…',
    heroUnavailable: 'Ряд временно недоступен.',
    newsTitle: 'Последние новости',
    sentimentTitle: 'Настроение рынка',
    coverageTitle: 'Охват по классам активов',
    seeAll: 'Смотреть всё',
  },

  assetClass: {
    crypto: 'Криптовалюты',
    forex: 'Валюты',
    stock: 'Акции',
    etf: 'ETF',
    commodity: 'Сырьевые товары',
    index: 'Индексы',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: 'Данные недоступны',
    connected: 'Подключено',
    pending: 'Ожидает подключения',
  },

  auth: {
    signIn: 'Войти',
    signUp: 'Зарегистрироваться',
  },

  notFound: {
    title: 'Такой вершины не существует',
    body: 'Страница, которую вы ищете, была перемещена или никогда не существовала. Начните восхождение с главной страницы.',
    cta: 'Вернуться на главную',
  },
}

export default ru
