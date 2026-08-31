import type { Translation } from './index'
import { zhPhrases } from './phrases/zh'

/**
 * 界面文本 — 简体中文。
 *
 * 有意为之的部分翻译（判断标准见 `it.ts`）：每个页面都会出现的部分已翻译，冗长且专业
 * 的部分回退到英文 —— `content/locales/index.ts` 之所以把英文排在法文之前，正是为此。
 */
const zh: Translation = {
  phrases: zhPhrases,

  site: {
    name: 'Zenkuu',
    tagline: '多资产市场追踪与分析',
    description:
      '加密货币、外汇、股票、ETF、大宗商品与指数 —— 价格、市值与趋势尽在一处。只读信息平台。',
  },

  nav: {
    home: '首页',
    soon: '即将推出',
    soonShort: '即将',
    openMenu: '打开菜单',
    searchPlaceholder: '搜索资产',
    searchSoon: '通用搜索将随下一批资产类别一同上线。',
    skipToContent: '跳至主要内容',
  },

  search: {
    title: '通用搜索',
    open: '打开搜索',
    close: '关闭搜索',
    placeholder: '搜索资产或代码…',
    trendingTitle: '热门',
    trendingHint: '过去 24 小时浏览最多',
    trendingEmpty: '热门数据暂时不可用。',
    otherAssets: '股票、ETF、指数与大宗商品',
    loading: '正在搜索…',
    cryptoUnavailable: '加密数据源暂时繁忙，其他资产类别仍可查阅。',
    hint: '按 Ctrl + K 重新打开搜索',
  },

  locale: {
    convertedFrom: (from: string, date: string) => `按 ${date} 的欧洲央行汇率自 ${from} 换算`,
    currencyHint: (date: string) =>
      `按 ${date} 的欧洲央行参考汇率换算。数据源以欧元计价；所选货币适用于全站。`,
    open: '语言与货币',
    language: '语言',
    currency: '显示货币',
    search: '搜索',
    noMatch: '没有匹配的货币。',

    languageHint: "标注为已翻译的语言会切换界面。其余语言只会记住你的选择，等待各自的翻译文件——我们宁可如实说明缺什么，也不愿提供未经校对的机器翻译。",
  },

  theme: {
    switchToDark: '切换到深色主题',
    switchToLight: '切换到浅色主题',
  },

  pages: {
    home: '首页',
    crypto: '加密货币',
    forex: '外汇',
    stocks: '股票',
    etf: 'ETF',
    commodities: '大宗商品',
    indices: '指数',
    categories: '分类',
    news: '新闻',
    sentiment: '市场情绪',
    movers: '涨跌榜',
    notFound: '页面未找到',
    learn: '学习',
    getStarted: '快速入门',
    blog: '博客',
    methodology: '方法与数据来源',
    developers: 'API 与开发者',
    help: '帮助中心',
    changelog: '更新日志',
    about: '关于我们',
  },

  globalStats: {
    marketCap: '总市值',
    volume: '24 小时成交量',
    dominanceBtc: 'BTC 占比',
    dominanceEth: 'ETH 占比',
    activeAssets: '活跃加密资产',
    unavailable: '全球统计暂时不可用',
    caption: (value: string, change: string) =>
      `加密货币全球总市值为 ${value}，过去 24 小时变动 ${change}。`,
  },

  home: {
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? '曲线仍在积累：没有免费数据源公布全球市值的历史，因此由我们自行记录读数。'
        : `曲线积累中 — 目前已有 ${count} 次读数。`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `ZENKUU ${Math.round(minutes / 60)} 小时记录`
        : `ZENKUU ${minutes} 分钟记录`,
    marketCapSeriesLabel: (minutes: number) =>
      `最近 ${minutes} 分钟总市值走势`,
    trendingTitle: '热门',
    gainersTitle: '涨幅榜',
    losersTitle: '跌幅榜',
    moversHint: (size: number) => `在市值前 ${size} 名之中`,
    classMoversHint: (size: number) => `在该类别追踪的 ${size} 项资产中`,
    summaryTitle: '市场概览',
    crossAssetTitle: '主要市场',
    volumeLeadersTitle: '成交量榜',
    economyTitle: '经济',
    heroMarketCap: '加密货币市值',
    heroLoading: '正在加载数据…',
    heroUnavailable: '数据暂时不可用。',
    newsTitle: '最新新闻',
    sentimentTitle: '市场情绪',
    coverageTitle: '各资产类别覆盖情况',
    seeAll: '查看全部',

    topMarketCapTitle: "市值前列",
    marketCapCardTitle: "市场总市值",
    volumeCardTitle: "24 小时成交额",
    narrativesTitle: "最活跃板块 · 24 小时",
    forexTitle: "货币 · 欧洲央行参考汇率",
    forexHint: "汇率每个工作日公布一次",
    watchlistTitle: "我的自选",
    watchlistEmptyTitle: "你的自选列表为空",
    watchlistEmptyBody: "从详情页添加的资产会显示在这里。列表与你的账户关联。",
    tabs: {
      all: "全部",
      trending: "热门",
      gainers: "涨幅",
      losers: "跌幅",
      categories: "分类",
    },
  },

  assetClass: {
    crypto: '加密货币',
    forex: '外汇',
    stock: '股票',
    etf: 'ETF',
    commodity: '大宗商品',
    index: '指数',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: '数据不可用',
    connected: '已连接',
    pending: '待连接',
  },

  auth: {
    signIn: '登录',
    signUp: '注册',

    unavailableTitle: "账户即将开放",
    unavailableBody: "本实例尚未配置身份验证。有了账户，自选列表会长期保存，并可使用价格提醒和显示偏好。",
    signInTitle: "登录 ZENKUU",
    signInSubtitle: "找回你的自选列表和偏好设置。",
    signUpTitle: "创建 ZENKUU 账户",
    signUpSubtitle: "免费。无需银行信息——ZENKUU 既不经手资金，也不处理交易。",
    close: "关闭",
    overlaySignInTitle: "欢迎来到 ZENKUU",
    overlaySignInSubtitle: "几秒即可登录或注册。",
    overlaySignUpTitle: "创建你的账户",
    overlaySignUpSubtitle: "免费，无需银行信息。",
    switchToSignUp: "还没有账户？",
    switchToSignIn: "已经有账户了？",
    benefitsTitle: "账户能带来什么",
    benefits: [
      "自选列表得以保存，在所有设备上都能找回",
      "记住显示货币与主题",
      "打开即应用你的设置，无需重新配置",
    ],
    benefitsNote: "ZENKUU 不执行任何委托，不托管资金，也不转售数据。账户只用于找回你的设置。",
    legalPrefix: "继续即表示你接受我们的使用条款，条款说明见",
    legalLink: "“关于”页面",
  },

  notFound: {
    title: '此峰并不存在',
    body: '您要找的页面已迁移或从未存在。请从首页重新出发。',
    cta: '返回首页',
  },


  market: {
    pageLabel: (page: number) => `第 ${page} 页`,
    columns: {
      rank: "#",
      name: "资产",
      price: "价格",
      change1h: "1 小时",
      change24h: "24 小时",
      change7d: "7 天",
      volume: "24 小时成交量",
      marketCap: "市值",
      chart: "7 天走势",
      variation: "涨跌幅",
      watch: "关注",
      dayRange: "24 小时最低 / 最高",
    },
    sortByMarketCap: "按市值排序",
    sortByVolume: "按成交量排序",
    sortNotSupported: "排序作用于整个榜单。涨跌幅列无法排序：数据源不支持在全市场范围内这样做。",
    previous: "上一页",
    next: "下一页",
    emptyPage: "榜单的这一页没有资产。请返回第一页。",
  },

  crypto: {
    title: "加密货币排行",
    subtitle: "以欧元计的价格、市值与成交量，每 5 分钟更新一次。",
  },

  forex: {
    title: "汇率",
    subtitle: "欧洲中央银行每个工作日公布一次的参考汇率。",
  },

  stocks: {
    title: "股票",
    subtitle: "主要上市公司的股价与市值。",
  },

  etf: {
    title: "ETF",
    subtitle: "交易所交易的指数基金：价格、涨跌与成交量。",
  },

  commodities: {
    title: "大宗商品",
    subtitle: "能源、贵金属与工业金属、农产品。",
  },

  indices: {
    title: "股票指数",
    subtitle: "全球主要指数及其近期走势。",
  },

  asset: {
    convertedNotice: (from: string, to: string, date: string) =>
      `金额按 ${date} 的欧洲央行参考汇率自 ${from} 换算为 ${to}。数据源以 ${from} 为该资产计价。`,
    aboutTitle: (name: string) => `关于 ${name}`,
    statsTitle: "市场统计",
    similarTitle: "可比资产",
    rangeTitle: "周期",
    ranges: {
      d1: "24 小时",
      d7: "7 天",
      d30: "30 天",
      d90: "90 天",
      y1: "1 年",
    },
    chart: {
      kindTitle: "图表类型",
      kinds: {
        area: "面积图",
        line: "折线图",
        baseline: "基准差",
        candles: "K 线",
        bars: "美国线",
      },
      optionsTitle: "显示",
      volume: "成交量",
      movingAverage: "移动平均",
      priceLines: "极值",
      loadingCandles: "正在加载 K 线…",
      candlesUnavailable: "该数据源不提供此资产的 K 线数据——因此 K 线与美国线视图不可用。",
      volumeUnavailable: "数据源未公布该时段的成交量。",
    },
    tabs: {
      overview: "图表",
      history: "表现",
      stats: "统计",
      about: "简介",
      faq: "常见问题",
    },
    currencyLabel: "显示货币",
    loadingSeries: "正在加载数据序列…",
    performanceTitle: "各周期表现",
    performanceNote: "涨跌幅根据为该资产加载的一年期序列计算；24 小时的数值直接取自数据源。",
    rangeYearTitle: "一年内极值",
    lowest: "最低",
    highest: "最高",
    stats: {
      marketCap: "市值",
      volume: "24 小时成交量",
      circulating: "流通量",
      total: "总供应量",
      max: "最大供应量",
      ath: "历史最高",
      atl: "历史最低",
      rank: "排名",
      low24h: "24 小时最低",
      high24h: "24 小时最高",
      previousClose: "前收盘价",
      exchange: "上市市场",
      high52w: "52 周最高",
      low52w: "52 周最低",
    },
    noDescription: "数据源未提供该资产的介绍。",
    readOnly: "仅供参考的信息页面。ZENKUU 不提供买入、卖出或下单功能。",
    officialLinks: "官方链接",
    website: "官方网站",
    notFoundTitle: "未找到该资产",
    notFoundBody: "此标识与我们数据源中的任何资产都不匹配。",
    backToRanking: "返回排行",
    chartUnavailable: "该资产暂无价格历史。",
  },

  categories: {
    title: "分类与板块",
    subtitle: "加密市场主要叙事在 24 小时内的表现。",
    columns: {
      name: "分类",
      marketCap: "市值",
      change: "24 小时",
      volume: "24 小时成交量",
    },
  },

  news: {
    readOn: (source: string) => `在 ${source} 阅读`,
    title: "市场资讯",
    subtitle: "汇集自各大媒体的公开信息流。",
    unavailable: "资讯流暂时不可用。",
  },

  sentiment: {
    title: "恐惧与贪婪指数",
    subtitle: "衡量加密市场情绪的综合指标，从 0（极度恐惧）到 100（极度贪婪）。",
    scale: {
      extremeFear: "极度恐惧",
      fear: "恐惧",
      neutral: "中性",
      greed: "贪婪",
      extremeGreed: "极度贪婪",
    },
    disclaimer: "这是情绪指标，不是投资建议。它不预测任何价格走势。",
  },

  footer: {
    rights: (year: number) => `© ${year} ZENKUU`,
    positioning: "信息平台，不执行委托，也不托管资金。",
    community: "社区",
    locale: "简体中文 · EUR",
    localeHint: "本站以法语发布，以欧元为基准货币。其他语言和货币将陆续推出。",
    disclaimer: "ZENKUU 是只读的信息平台。没有买入、卖出或连接钱包的功能。所显示的信息不构成投资建议。",
    dataNote: "市场数据来自公开数据源，每 5 分钟更新一次。",
  },

  placeholder: {
    plannedTitle: "本页将会包含的内容",
    meanwhileTitle: "在此之前",
    meanwhileBody: "“方法”页面已经说明了我们的数字从何而来、多久更新一次，以及因缺少数据源而未予展示的内容。",
    meanwhileCta: "查看方法",
  },}

export default zh
