import type { Translation } from './index'

/**
 * インターフェースのテキスト — 日本語。
 *
 * 意図的な部分翻訳です（基準は `it.ts` を参照）。すべてのページに現れるセクションを
 * 翻訳し、長く専門的なセクションは英語にフォールバックします。`content/locales/index.ts`
 * がフランス語より先に英語を挟むのは、まさにこのためです。
 *
 * ── 数字の単位について ────────────────────────────────────────────────────────
 *
 * 金額の書式はここでは扱いません（`packages/ui/src/format.ts` が担当）。日本語では
 * 「億」「兆」が本来の区切りですが、書式化は共通の実装に委ねられており、この
 * ファイルの文字列がそれを上書きすることはありません。
 */
const ja: Translation = {
  site: {
    name: 'Zenkuu',
    tagline: 'マルチアセット市場の追跡と分析',
    description:
      '暗号資産、為替、株式、ETF、商品、指数 — 価格・時価総額・トレンドを一箇所に。閲覧専用のプラットフォームです。',
  },

  nav: {
    home: 'ホーム',
    soon: '近日公開',
    soonShort: '近日',
    openMenu: 'メニューを開く',
    searchPlaceholder: '銘柄を検索',
    searchSoon: '統合検索は次の資産クラスとともに提供されます。',
    skipToContent: '本文へスキップ',
  },

  search: {
    title: '統合検索',
    open: '検索を開く',
    close: '検索を閉じる',
    placeholder: '銘柄名やシンボルを検索…',
    trendingTitle: 'トレンド',
    trendingHint: '過去24時間で最も閲覧された銘柄',
    trendingEmpty: 'トレンドは一時的に利用できません。',
    otherAssets: '株式・ETF・指数・商品',
    loading: '検索中…',
    noResult: (query: string) => `「${query}」に一致する銘柄はありません。`,
    cryptoUnavailable:
      '暗号資産のデータ元が一時的に混雑しています。他の資産クラスは引き続き閲覧できます。',
    hint: 'Ctrl + K で検索を再度開けます',
  },

  locale: {
    open: '言語と通貨',
    language: '言語',
    currency: '表示通貨',
    search: '検索',
    noMatch: '一致する通貨がありません。',
  },

  theme: {
    switchToDark: 'ダークテーマに切り替える',
    switchToLight: 'ライトテーマに切り替える',
  },

  pages: {
    home: 'ホーム',
    crypto: '暗号資産',
    forex: '為替',
    stocks: '株式',
    etf: 'ETF',
    commodities: '商品',
    indices: '指数',
    categories: 'カテゴリー',
    news: 'ニュース',
    sentiment: '市場センチメント',
    movers: '値上がり・値下がり',
    notFound: 'ページが見つかりません',
    learn: '学ぶ',
    getStarted: 'はじめに',
    blog: 'ブログ',
    methodology: '手法と情報源',
    developers: 'API・開発者向け',
    help: 'ヘルプセンター',
    changelog: '更新情報',
    about: 'Zenkuu について',
  },

  globalStats: {
    marketCap: '時価総額',
    volume: '24時間出来高',
    dominanceBtc: 'BTC ドミナンス',
    dominanceEth: 'ETH ドミナンス',
    activeAssets: '取扱暗号資産数',
    unavailable: '全体統計は一時的に利用できません',
    caption: (value: string, change: string) =>
      `暗号資産の世界時価総額は ${value}、過去24時間で ${change} です。`,
  },

  home: {
    trendingTitle: 'トレンド',
    gainersTitle: '値上がり率上位',
    losersTitle: '値下がり率上位',
    moversHint: (size: number) => `時価総額上位 ${size} 銘柄のうち`,
    classMoversHint: (size: number) => `このクラスで追跡中の ${size} 銘柄のうち`,
    summaryTitle: '市場サマリー',
    topIndicesTitle: '主要指数',
    volumeLeadersTitle: '出来高上位',
    economyTitle: '経済',
    heroMarketCap: '暗号資産の時価総額',
    heroLoading: 'データを読み込み中…',
    heroUnavailable: 'データは一時的に利用できません。',
    newsTitle: '最新ニュース',
    sentimentTitle: '市場センチメント',
    coverageTitle: '資産クラス別の対応状況',
    seeAll: 'すべて表示',
  },

  assetClass: {
    crypto: '暗号資産',
    forex: '為替',
    stock: '株式',
    etf: 'ETF',
    commodity: '商品',
    index: '指数',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: 'データを取得できません',
    connected: '接続済み',
    pending: '未接続',
  },

  auth: {
    signIn: 'ログイン',
    signUp: '新規登録',
  },

  notFound: {
    title: 'その頂は存在しません',
    body: 'お探しのページは移動したか、もともと存在しません。ホームから登り直してください。',
    cta: 'ホームに戻る',
  },
}

export default ja
