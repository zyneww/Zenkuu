import type { Translation } from './index'
import { jaPhrases } from './phrases/ja'

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
  phrases: jaPhrases,

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
    convertedFrom: (from: string, date: string) => `${date} の欧州中央銀行レートで ${from} から換算`,
    currencyHint: (date: string) =>
      `${date} の欧州中央銀行の参照レートで換算しています。情報源はユーロ建てで、選んだ通貨はサイト全体に適用されます。`,
    open: '言語と通貨',
    language: '言語',
    currency: '表示通貨',
    search: '検索',
    noMatch: '一致する通貨がありません。',

    languageHint: "「翻訳済み」と記された言語は画面表示が切り替わります。それ以外は翻訳ファイルが用意されるまで設定だけを保存します。未校正の機械翻訳を出すより、足りないものをそのまま伝えることを選んでいます。",
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
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? '曲線を作成中です。世界の時価総額の履歴を公開している無料の情報源がないため、当サイトで計測値を記録しています。'
        : `曲線を作成中 — これまでの計測は${count}件。`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `${Math.round(minutes / 60)}時間分の ZENKUU 計測`
        : `${minutes}分間の ZENKUU 計測`,
    marketCapSeriesLabel: (minutes: number) =>
      `直近${minutes}分の時価総額の推移`,
    trendingTitle: 'トレンド',
    gainersTitle: '値上がり率上位',
    losersTitle: '値下がり率上位',
    moversHint: (size: number) => `時価総額上位 ${size} 銘柄のうち`,
    classMoversHint: (size: number) => `このクラスで追跡中の ${size} 銘柄のうち`,
    summaryTitle: '市場サマリー',
    crossAssetTitle: '主要市場',
    volumeLeadersTitle: '出来高上位',
    economyTitle: '経済',
    heroMarketCap: '暗号資産の時価総額',
    heroLoading: 'データを読み込み中…',
    heroUnavailable: 'データは一時的に利用できません。',
    newsTitle: '最新ニュース',
    sentimentTitle: '市場センチメント',
    coverageTitle: '資産クラス別の対応状況',
    seeAll: 'すべて表示',

    topMarketCapTitle: "時価総額上位",
    marketCapCardTitle: "市場全体の時価総額",
    volumeCardTitle: "24 時間の出来高",
    narrativesTitle: "動きの大きいセクター · 24 時間",
    forexTitle: "通貨 · ECB 参照レート",
    forexHint: "レートは営業日ごとに 1 回公表されます",
    watchlistTitle: "ウォッチリスト",
    watchlistEmptyTitle: "ウォッチリストは空です",
    watchlistEmptyBody: "銘柄ページから追加した銘柄がここに並びます。リストはアカウントに紐づきます。",
    tabs: {
      all: "すべて",
      trending: "話題",
      gainers: "値上がり",
      losers: "値下がり",
      categories: "カテゴリー",
    },
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

    unavailableTitle: "アカウントは近日提供",
    unavailableBody: "この環境では認証がまだ設定されていません。アカウントを使うとウォッチリストが保存され、価格アラートと表示設定が利用できるようになります。",
    signInTitle: "ZENKUU にログイン",
    signInSubtitle: "ウォッチリストと設定を復元します。",
    signUpTitle: "ZENKUU アカウントを作成",
    signUpSubtitle: "無料。銀行情報は不要です — ZENKUU は資産も取引も扱いません。",
    close: "閉じる",
    overlaySignInTitle: "ZENKUU へようこそ",
    overlaySignInSubtitle: "数秒でログインまたは登録できます。",
    overlaySignUpTitle: "アカウントを作成",
    overlaySignUpSubtitle: "無料、銀行情報なし。",
    switchToSignUp: "アカウントをお持ちでないですか？",
    switchToSignIn: "すでにアカウントをお持ちですか？",
    benefitsTitle: "アカウントでできること",
    benefits: [
      "ウォッチリストが保存され、どの端末からでも同じ内容を確認できます",
      "表示通貨とテーマを記憶します",
      "設定は開いた時点で反映され、設定し直す必要がありません",
    ],
    benefitsNote: "ZENKUU は注文を執行せず、資産も預からず、データを転売しません。アカウントは設定を引き継ぐためだけのものです。",
    legalPrefix: "続行すると、当サイトの利用規約に同意したものとみなされます。規約は",
    legalLink: "「概要」ページに記載しています",
  },

  notFound: {
    title: 'その頂は存在しません',
    body: 'お探しのページは移動したか、もともと存在しません。ホームから登り直してください。',
    cta: 'ホームに戻る',
  },


  market: {
    pageLabel: (page: number) => `${page} ページ`,
    columns: {
      rank: "#",
      name: "銘柄",
      price: "価格",
      change1h: "1 時間",
      change24h: "24 時間",
      change7d: "7 日",
      volume: "出来高 24 時間",
      marketCap: "時価総額",
      chart: "7 日間",
      variation: "変動率",
      watch: "ウォッチ",
      dayRange: "24 時間の安値 / 高値",
    },
    sortByMarketCap: "時価総額で並べ替え",
    sortByVolume: "出来高で並べ替え",
    sortNotSupported: "並べ替えはランキング全体に及びます。変動率の列は並べ替えできません。データ元が市場全体の規模でそれを許していないためです。",
    previous: "前のページ",
    next: "次のページ",
    emptyPage: "このページには銘柄がありません。最初のページに戻ってください。",
  },

  crypto: {
    title: "暗号資産ランキング",
    subtitle: "ユーロ建ての価格、時価総額、出来高。5 分ごとに更新されます。",
  },

  forex: {
    title: "為替レート",
    subtitle: "欧州中央銀行が営業日ごとに 1 回公表する参照レート。",
  },

  stocks: {
    title: "株式",
    subtitle: "主要上場企業の株価と時価総額。",
  },

  etf: {
    title: "ETF",
    subtitle: "上場インデックスファンドの価格、変動率、出来高。",
  },

  commodities: {
    title: "商品",
    subtitle: "エネルギー、貴金属と産業用金属、農産物。",
  },

  indices: {
    title: "株価指数",
    subtitle: "世界の主要指数と直近の動き。",
  },

  asset: {
    convertedNotice: (from: string, to: string, date: string) =>
      `金額は ${date} の欧州中央銀行の参照レートで ${from} から ${to} に換算しています。情報源はこの銘柄を ${from} 建てで表示しています。`,
    aboutTitle: (name: string) => `${name} について`,
    priceLabel: (name: string) => `${name} の価格`,
    statsTitle: "市場統計",
    similarTitle: "類似の銘柄",
    rangeTitle: "期間",
    ranges: {
      d1: "24 時間",
      d7: "7 日",
      d30: "30 日",
      d90: "90 日",
      y1: "1 年",
    },
    chart: {
      kindTitle: "チャートの種類",
      kinds: {
        area: "エリア",
        line: "ライン",
        baseline: "基準比",
        candles: "ローソク足",
        bars: "バー",
      },
      optionsTitle: "表示",
      volume: "出来高",
      movingAverage: "移動平均",
      priceLines: "高安値",
      loadingCandles: "ローソク足を読み込み中…",
      candlesUnavailable: "このデータ元は当該銘柄のローソク足を公表していないため、ローソク足とバーの表示は利用できません。",
      volumeUnavailable: "この期間の出来高はデータ元が公表していません。",
    },
    tabs: {
      overview: "チャート",
      history: "騰落率",
      stats: "統計",
      about: "概要",
      faq: "よくある質問",
    },
    currencyLabel: "表示通貨",
    loadingSeries: "系列を読み込み中…",
    performanceTitle: "期間別の騰落率",
    performanceNote: "変動率は当該銘柄について読み込んだ 1 年分の系列から算出しています。24 時間の値はデータ元の公表値をそのまま用いています。",
    rangeYearTitle: "1 年間の高安値",
    lowest: "安値",
    highest: "高値",
    faq: {
      buyQ: (name: string) => `ZENKUU で ${name} を購入できますか？`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `最大供給量は ${max} ${symbol} で、うち ${circulating} ${symbol} が現在流通しています。`
          : `最大供給量は ${max} ${symbol} です。`,
      supplyQ: (name: string) => `${name} は最大で何単位まで存在しますか？`,
      athA: (price: string, date: string | null) =>
        date
          ? `史上最高値は ${price} で、${date} に記録されました。`
          : `史上最高値は ${price} です。`,
      athQ: (name: string) => `${name} の史上最高値は？`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `時価総額は ${cap} で、同じ資産クラスの中で ${rank} 位です。`
          : `時価総額は ${cap} です。`,
      capQ: (name: string) => `${name} の時価総額は？`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} は ${price} で取引されています。情報源が公開した最新の値は ${updated} 時点のものです。`,
      priceQ: (name: string) => `${name} の今日の価格は？`,
      buyA: "いいえ。ZENKUU は情報プラットフォームです。注文を執行せず、資産も預からず、ブローカーでも取引所でもありません。",
    },
    stats: {
      marketCap: "時価総額",
      volume: "出来高 24 時間",
      circulating: "流通供給量",
      total: "総供給量",
      max: "最大供給量",
      ath: "史上最高値",
      atl: "史上最安値",
      rank: "順位",
      low24h: "24 時間安値",
      high24h: "24 時間高値",
      previousClose: "前日終値",
      exchange: "上場市場",
      high52w: "52 週高値",
      low52w: "52 週安値",
    },
    noDescription: "この銘柄について、データ元は説明を提供していません。",
    readOnly: "情報提供のみのページです。ZENKUU では売買も注文もできません。",
    officialLinks: "公式リンク",
    website: "公式サイト",
    notFoundTitle: "銘柄が見つかりません",
    notFoundBody: "この識別子に該当する銘柄は、当サイトのデータ元にありません。",
    backToRanking: "ランキングに戻る",
    chartUnavailable: "この銘柄の価格履歴は利用できません。",
  },

  categories: {
    title: "カテゴリーとセクター",
    subtitle: "暗号資産市場の主要テーマの 24 時間騰落率。",
    columns: {
      name: "カテゴリー",
      marketCap: "時価総額",
      change: "24 時間",
      volume: "出来高 24 時間",
    },
  },

  news: {
    readOn: (source: string) => `${source} で読む`,
    title: "市場ニュース",
    subtitle: "主要媒体の公開フィードから集約しています。",
    unavailable: "ニュースフィードは一時的に利用できません。",
  },

  sentiment: {
    title: "Fear & Greed 指数",
    subtitle: "暗号資産市場のセンチメントを 0（極度の恐怖）から 100（極度の強欲）で示す複合指標。",
    scale: {
      extremeFear: "極度の恐怖",
      fear: "恐怖",
      neutral: "中立",
      greed: "強欲",
      extremeGreed: "極度の強欲",
    },
    disclaimer: "センチメント指標であり、推奨ではありません。価格の先行きを予測するものではありません。",
  },

  footer: {
    rights: (year: number) => `© ${year} ZENKUU`,
    positioning: "情報プラットフォーム。注文の執行も資産の保管も行いません。",
    community: "コミュニティ",
    locale: "日本語 · EUR",
    localeHint: "本サイトはフランス語で公開し、基準通貨はユーロです。他の言語と通貨は順次追加します。",
    disclaimer: "ZENKUU は閲覧専用の情報プラットフォームです。購入、売却、ウォレット接続の機能はありません。掲載する情報は投資助言ではありません。",
    dataNote: "市場データは公開されたデータ元から取得し、5 分ごとに更新しています。",
  },

  placeholder: {
    plannedTitle: "このページに載る予定の内容",
    meanwhileTitle: "それまでのあいだ",
    meanwhileBody: "「方法論」のページでは、数値の出どころ、更新頻度、データ元がなく掲載していない項目をすでに説明しています。",
    meanwhileCta: "方法論を見る",
  },}

export default ja
