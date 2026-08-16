import type { Translation } from './index'

/**
 * 界面文本 — 简体中文。
 *
 * 有意为之的部分翻译（判断标准见 `it.ts`）：每个页面都会出现的部分已翻译，冗长且专业
 * 的部分回退到英文 —— `content/locales/index.ts` 之所以把英文排在法文之前，正是为此。
 */
const zh: Translation = {
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
    noResult: (query: string) => `没有资产与「${query}」匹配。`,
    cryptoUnavailable: '加密数据源暂时繁忙，其他资产类别仍可查阅。',
    hint: '按 Ctrl + K 重新打开搜索',
  },

  locale: {
    open: '语言与货币',
    language: '语言',
    currency: '显示货币',
    search: '搜索',
    noMatch: '没有匹配的货币。',
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
    trendingTitle: '热门',
    gainersTitle: '涨幅榜',
    losersTitle: '跌幅榜',
    moversHint: (size: number) => `在市值前 ${size} 名之中`,
    classMoversHint: (size: number) => `在该类别追踪的 ${size} 项资产中`,
    summaryTitle: '市场概览',
    topIndicesTitle: '主要指数',
    volumeLeadersTitle: '成交量榜',
    economyTitle: '经济',
    heroMarketCap: '加密货币市值',
    heroLoading: '正在加载数据…',
    heroUnavailable: '数据暂时不可用。',
    newsTitle: '最新新闻',
    sentimentTitle: '市场情绪',
    coverageTitle: '各资产类别覆盖情况',
    seeAll: '查看全部',
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
  },

  notFound: {
    title: '此峰并不存在',
    body: '您要找的页面已迁移或从未存在。请从首页重新出发。',
    cta: '返回首页',
  },
}

export default zh
