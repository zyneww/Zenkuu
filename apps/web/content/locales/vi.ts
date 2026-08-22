import type { Translation } from './index'
import { viPhrases } from './phrases/vi'

/**
 * Văn bản giao diện — tiếng Việt.
 *
 * Bản dịch một phần và có chủ đích (xem `it.ts` để biết tiêu chí) : các phần xuất hiện
 * trên MỌI trang đều được dịch ; các phần dài và chuyên sâu quay về tiếng Anh, vốn được
 * `content/locales/index.ts` đặt trước tiếng Pháp chính vì lý do này.
 */
const vi: Translation = {
  phrases: viPhrases,

  site: {
    name: 'Zenkuu',
    tagline: 'Theo dõi và phân tích thị trường đa tài sản',
    description:
      'Tiền mã hoá, ngoại tệ, cổ phiếu, ETF, hàng hoá và chỉ số — giá, vốn hoá và xu hướng ở cùng một nơi. Nền tảng chỉ để tra cứu.',
  },

  nav: {
    home: 'Trang chủ',
    soon: 'Sắp ra mắt',
    soonShort: 'Sắp có',
    openMenu: 'Mở menu',
    searchPlaceholder: 'Tìm một tài sản',
    searchSoon: 'Tìm kiếm tổng hợp sẽ ra mắt cùng các lớp tài sản tiếp theo.',
    skipToContent: 'Đến nội dung chính',
  },

  search: {
    title: 'Tìm kiếm tổng hợp',
    open: 'Mở tìm kiếm',
    close: 'Đóng tìm kiếm',
    placeholder: 'Tìm tài sản, mã…',
    trendingTitle: 'Xu hướng',
    trendingHint: 'được xem nhiều nhất trong 24 giờ qua',
    trendingEmpty: 'Xu hướng tạm thời không khả dụng.',
    otherAssets: 'Cổ phiếu, ETF, chỉ số và hàng hoá',
    loading: 'Đang tìm…',
    noResult: (query: string) => `Không có tài sản nào khớp với « ${query} ».`,
    cryptoUnavailable:
      'Nguồn dữ liệu tiền mã hoá đang quá tải. Các lớp tài sản khác vẫn tra cứu được.',
    hint: 'Ctrl + K để mở lại tìm kiếm',
  },

  locale: {
    convertedFrom: (from: string, date: string) => `quy đổi từ ${from} theo tỷ giá ECB ngày ${date}`,
    currencyHint: (date: string) =>
      `Quy đổi theo tỷ giá tham chiếu ECB ngày ${date}. Các nguồn niêm yết bằng euro; đơn vị tiền đã chọn áp dụng cho toàn bộ trang web.`,
    open: 'Ngôn ngữ và tiền tệ',
    language: 'Ngôn ngữ',
    currency: 'Tiền tệ hiển thị',
    search: 'Tìm kiếm',
    noMatch: 'Không có tiền tệ nào khớp.',

    languageHint: "Những ngôn ngữ được đánh dấu là đã dịch sẽ thay đổi giao diện. Các ngôn ngữ còn lại chỉ ghi nhớ lựa chọn của bạn trong khi chờ tệp dịch — chúng tôi thà nói rõ điều gì còn thiếu hơn là đưa ra bản dịch máy chưa hiệu đính.",
  },

  theme: {
    switchToDark: 'Chuyển sang giao diện tối',
    switchToLight: 'Chuyển sang giao diện sáng',
  },

  pages: {
    home: 'Trang chủ',
    crypto: 'Tiền mã hoá',
    forex: 'Ngoại tệ',
    stocks: 'Cổ phiếu',
    etf: 'ETF',
    commodities: 'Hàng hoá',
    indices: 'Chỉ số',
    categories: 'Danh mục',
    news: 'Tin tức',
    sentiment: 'Tâm lý thị trường',
    movers: 'Tăng và giảm',
    notFound: 'Không tìm thấy trang',
    learn: 'Học',
    getStarted: 'Bắt đầu',
    blog: 'Blog',
    methodology: 'Phương pháp và nguồn',
    developers: 'API và nhà phát triển',
    help: 'Trung tâm trợ giúp',
    changelog: 'Có gì mới',
    about: 'Giới thiệu',
  },

  globalStats: {
    marketCap: 'Tổng vốn hoá',
    volume: 'Khối lượng 24 h',
    dominanceBtc: 'Thị phần BTC',
    dominanceEth: 'Thị phần ETH',
    activeAssets: 'Tiền mã hoá đang hoạt động',
    unavailable: 'Thống kê toàn cầu tạm thời không khả dụng',
    caption: (value: string, change: string) =>
      `Tổng vốn hoá tiền mã hoá toàn cầu là ${value}, tức ${change} trong 24 giờ qua.`,
  },

  home: {
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Đường biểu diễn đang hình thành: không nguồn miễn phí nào công bố lịch sử vốn hóa toàn cầu, nên chúng tôi tự ghi lại số liệu.'
        : `Đường biểu diễn đang hình thành — đã ghi ${count} lần.`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `Số liệu ZENKUU ghi trong ${Math.round(minutes / 60)} giờ`
        : `Số liệu ZENKUU ghi trong ${minutes} phút`,
    marketCapSeriesLabel: (minutes: number) =>
      `Diễn biến tổng vốn hóa trong ${minutes} phút gần nhất`,
    trendingTitle: 'Xu hướng',
    gainersTitle: 'Tăng mạnh nhất',
    losersTitle: 'Giảm mạnh nhất',
    moversHint: (size: number) => `Trong ${size} vốn hoá lớn nhất`,
    classMoversHint: (size: number) => `Trong ${size} tài sản được theo dõi của lớp này`,
    summaryTitle: 'Tổng quan thị trường',
    crossAssetTitle: 'Các thị trường chính',
    volumeLeadersTitle: 'Khối lượng lớn nhất',
    economyTitle: 'Kinh tế',
    heroMarketCap: 'Vốn hoá tiền mã hoá',
    heroLoading: 'Đang tải dữ liệu…',
    heroUnavailable: 'Dữ liệu tạm thời không khả dụng.',
    newsTitle: 'Tin mới nhất',
    sentimentTitle: 'Tâm lý thị trường',
    coverageTitle: 'Phạm vi theo lớp tài sản',
    seeAll: 'Xem tất cả',

    topMarketCapTitle: "Vốn hoá lớn nhất",
    marketCapCardTitle: "Vốn hoá thị trường",
    volumeCardTitle: "Khối lượng giao dịch 24 giờ",
    narrativesTitle: "Ngành sôi động nhất · 24 giờ",
    forexTitle: "Tiền tệ · tham chiếu ECB",
    forexHint: "Tỷ giá công bố một lần mỗi ngày làm việc",
    watchlistTitle: "Danh sách theo dõi của tôi",
    watchlistEmptyTitle: "Danh sách theo dõi của bạn đang trống",
    watchlistEmptyBody: "Những tài sản được thêm từ trang chi tiết sẽ hiện ở đây. Danh sách gắn với tài khoản của bạn.",
    tabs: {
      all: "Tất cả",
      trending: "Xu hướng",
      gainers: "Tăng giá",
      losers: "Giảm giá",
      categories: "Danh mục",
    },
  },

  assetClass: {
    crypto: 'Tiền mã hoá',
    forex: 'Ngoại tệ',
    stock: 'Cổ phiếu',
    etf: 'ETF',
    commodity: 'Hàng hoá',
    index: 'Chỉ số',
    nft: 'NFT',
  },

  states: {
    unavailableTitle: 'Không có dữ liệu',
    connected: 'Đã kết nối',
    pending: 'Chờ kết nối',
  },

  auth: {
    signIn: 'Đăng nhập',
    signUp: 'Đăng ký',

    unavailableTitle: "Tài khoản sắp có",
    unavailableBody: "Xác thực chưa được cấu hình trên bản triển khai này. Tài khoản sẽ giúp danh sách theo dõi được lưu lại và mở quyền dùng cảnh báo giá cùng tuỳ chọn hiển thị.",
    signInTitle: "Đăng nhập ZENKUU",
    signInSubtitle: "Lấy lại danh sách theo dõi và các tuỳ chọn của bạn.",
    signUpTitle: "Tạo tài khoản ZENKUU",
    signUpSubtitle: "Miễn phí. Không cần thông tin ngân hàng — ZENKUU không quản lý tiền cũng không xử lý giao dịch.",
    close: "Đóng",
    overlaySignInTitle: "Chào mừng đến với ZENKUU",
    overlaySignInSubtitle: "Đăng nhập hoặc đăng ký trong vài giây.",
    overlaySignUpTitle: "Tạo tài khoản của bạn",
    overlaySignUpSubtitle: "Miễn phí, không cần thông tin ngân hàng.",
    switchToSignUp: "Chưa có tài khoản?",
    switchToSignIn: "Bạn đã có tài khoản?",
    benefitsTitle: "Tài khoản mang lại gì",
    benefits: [
      "Danh sách theo dõi được giữ lại và tìm thấy trên mọi thiết bị",
      "Ghi nhớ tiền tệ hiển thị và giao diện sáng/tối",
      "Thiết lập của bạn được áp dụng ngay khi mở, không phải cấu hình lại",
    ],
    benefitsNote: "ZENKUU không thực hiện lệnh nào, không giữ tiền và không bán lại dữ liệu. Tài khoản chỉ dùng để tìm lại thiết lập của bạn.",
    legalPrefix: "Khi tiếp tục, bạn chấp nhận điều khoản sử dụng của chúng tôi, được mô tả",
    legalLink: "trên trang Giới thiệu",
  },

  notFound: {
    title: 'Đỉnh núi này không tồn tại',
    body: 'Trang bạn tìm đã được chuyển đi hoặc chưa từng tồn tại. Hãy bắt đầu lại từ trang chủ.',
    cta: 'Về trang chủ',
  },


  market: {
    pageLabel: (page: number) => `Trang ${page}`,
    columns: {
      rank: "#",
      name: "Tài sản",
      price: "Giá",
      change1h: "1 giờ",
      change24h: "24 giờ",
      change7d: "7 ngày",
      volume: "Khối lượng 24 giờ",
      marketCap: "Vốn hoá",
      chart: "7 ngày",
      variation: "Biến động",
      watch: "Theo dõi",
      dayRange: "Thấp nhất / cao nhất 24 giờ",
    },
    sortByMarketCap: "Sắp xếp theo vốn hoá",
    sortByVolume: "Sắp xếp theo khối lượng",
    sortNotSupported: "Việc sắp xếp áp dụng cho toàn bộ bảng xếp hạng. Các cột biến động không sắp xếp được: nguồn không cho phép làm vậy trên toàn thị trường.",
    previous: "Trang trước",
    next: "Trang sau",
    emptyPage: "Không có tài sản nào ở trang này của bảng xếp hạng. Hãy quay lại trang đầu.",
  },

  crypto: {
    title: "Bảng xếp hạng tiền mã hoá",
    subtitle: "Giá, vốn hoá và khối lượng tính bằng euro, cập nhật mỗi 5 phút.",
  },

  forex: {
    title: "Tỷ giá hối đoái",
    subtitle: "Tỷ giá tham chiếu do Ngân hàng Trung ương châu Âu công bố, một lần mỗi ngày làm việc.",
  },

  stocks: {
    title: "Cổ phiếu",
    subtitle: "Giá và vốn hoá của các doanh nghiệp niêm yết chủ chốt.",
  },

  etf: {
    title: "ETF",
    subtitle: "Quỹ chỉ số niêm yết: giá, biến động và khối lượng.",
  },

  commodities: {
    title: "Hàng hoá",
    subtitle: "Năng lượng, kim loại quý và kim loại công nghiệp, nông sản.",
  },

  indices: {
    title: "Chỉ số chứng khoán",
    subtitle: "Các chỉ số lớn của thế giới và diễn biến gần đây.",
  },

  asset: {
    convertedNotice: (from: string, to: string, date: string) =>
      `Số tiền được quy đổi từ ${from} sang ${to} theo tỷ giá tham chiếu ECB ngày ${date}. Nguồn niêm yết tài sản này bằng ${from}.`,
    aboutTitle: (name: string) => `Về ${name}`,
    priceLabel: (name: string) => `Giá ${name}`,
    statsTitle: "Thống kê thị trường",
    similarTitle: "Tài sản tương đương",
    rangeTitle: "Khoảng thời gian",
    ranges: {
      d1: "24 giờ",
      d7: "7 ngày",
      d30: "30 ngày",
      d90: "90 ngày",
      y1: "1 năm",
    },
    chart: {
      kindTitle: "Kiểu biểu đồ",
      kinds: {
        area: "Vùng",
        line: "Đường",
        baseline: "Chênh lệch",
        candles: "Nến",
        bars: "Thanh",
      },
      optionsTitle: "Hiển thị",
      volume: "Khối lượng",
      movingAverage: "Trung bình động",
      priceLines: "Cực trị",
      loadingCandles: "Đang tải nến…",
      candlesUnavailable: "Nguồn này không công bố dữ liệu nến cho tài sản trên — vì vậy chế độ Nến và Thanh không khả dụng.",
      volumeUnavailable: "Nguồn không công bố khối lượng cho khoảng thời gian này.",
    },
    tabs: {
      overview: "Biểu đồ",
      history: "Hiệu suất",
      stats: "Thống kê",
      about: "Giới thiệu",
      faq: "Hỏi đáp",
    },
    currencyLabel: "Tiền tệ hiển thị",
    loadingSeries: "Đang tải chuỗi dữ liệu…",
    performanceTitle: "Hiệu suất theo kỳ",
    performanceNote: "Biến động được tính trên chuỗi một năm đã tải cho tài sản này; con số 24 giờ lấy nguyên từ nguồn.",
    rangeYearTitle: "Cực trị trong một năm",
    lowest: "Thấp nhất",
    highest: "Cao nhất",
    faq: {
      buyQ: (name: string) => `Có thể mua ${name} trên ZENKUU không?`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `Nguồn cung tối đa là ${max} ${symbol}, trong đó ${circulating} ${symbol} đang lưu hành.`
          : `Nguồn cung tối đa là ${max} ${symbol}.`,
      supplyQ: (name: string) => `Tối đa sẽ có bao nhiêu đơn vị ${name}?`,
      athA: (price: string, date: string | null) =>
        date
          ? `Đỉnh lịch sử là ${price}, đạt được ngày ${date}.`
          : `Đỉnh lịch sử là ${price}.`,
      athQ: (name: string) => `Đỉnh lịch sử của ${name} là bao nhiêu?`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `Vốn hóa đạt ${cap}, xếp thứ ${rank} trong lớp tài sản của nó.`
          : `Vốn hóa đạt ${cap}.`,
      capQ: (name: string) => `Vốn hóa của ${name} là bao nhiêu?`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} đang giao dịch ở mức ${price}. Giá trị mới nhất do nguồn của chúng tôi công bố ngày ${updated}.`,
      priceQ: (name: string) => `Hôm nay giá ${name} là bao nhiêu?`,
      buyA: "Không. ZENKUU là nền tảng thông tin: chúng tôi không thực hiện lệnh, không giữ tiền và không phải là môi giới hay sàn giao dịch.",
    },
    stats: {
      marketCap: "Vốn hoá",
      volume: "Khối lượng 24 giờ",
      circulating: "Lượng lưu hành",
      total: "Tổng cung",
      max: "Cung tối đa",
      ath: "Đỉnh lịch sử",
      atl: "Đáy lịch sử",
      rank: "Hạng",
      low24h: "Thấp nhất 24 giờ",
      high24h: "Cao nhất 24 giờ",
      previousClose: "Đóng cửa phiên trước",
      exchange: "Sàn niêm yết",
      high52w: "Cao nhất 52 tuần",
      low52w: "Thấp nhất 52 tuần",
    },
    noDescription: "Nguồn không cung cấp mô tả cho tài sản này.",
    readOnly: "Trang chỉ mang tính thông tin. ZENKUU không cho phép mua, bán hay đặt lệnh.",
    officialLinks: "Liên kết chính thức",
    website: "Trang chính thức",
    notFoundTitle: "Không tìm thấy tài sản",
    notFoundBody: "Mã này không khớp với bất kỳ tài sản nào mà nguồn của chúng tôi biết.",
    backToRanking: "Quay lại bảng xếp hạng",
    chartUnavailable: "Không có lịch sử giá cho tài sản này.",
  },

  categories: {
    title: "Danh mục và ngành",
    subtitle: "Hiệu suất của các chủ đề lớn trên thị trường tiền mã hoá trong 24 giờ.",
    columns: {
      name: "Danh mục",
      marketCap: "Vốn hoá",
      change: "24 giờ",
      volume: "Khối lượng 24 giờ",
    },
  },

  news: {
    readOn: (source: string) => `Đọc trên ${source}`,
    title: "Tin tức thị trường",
    subtitle: "Tổng hợp từ các nguồn tin công khai của những đơn vị xuất bản lớn.",
    unavailable: "Dòng tin tạm thời không khả dụng.",
  },

  sentiment: {
    title: "Chỉ số Fear & Greed",
    subtitle: "Thước đo tổng hợp tâm lý thị trường tiền mã hoá, từ 0 (sợ hãi tột độ) đến 100 (tham lam tột độ).",
    scale: {
      extremeFear: "Sợ hãi tột độ",
      fear: "Sợ hãi",
      neutral: "Trung tính",
      greed: "Tham lam",
      extremeGreed: "Tham lam tột độ",
    },
    disclaimer: "Chỉ báo tâm lý, không phải khuyến nghị. Nó không dự đoán bất kỳ diễn biến giá nào.",
  },

  footer: {
    rights: (year: number) => `© ${year} ZENKUU`,
    positioning: "Nền tảng thông tin, không thực hiện lệnh và không giữ tiền.",
    community: "Cộng đồng",
    locale: "Tiếng Việt · EUR",
    localeHint: "Trang được xuất bản bằng tiếng Pháp, lấy euro làm tiền tệ tham chiếu. Các ngôn ngữ và tiền tệ khác sẽ có sau.",
    disclaimer: "ZENKUU là nền tảng thông tin chỉ để đọc. Không có chức năng mua, bán hay kết nối ví. Thông tin hiển thị không phải là lời khuyên đầu tư.",
    dataNote: "Dữ liệu thị trường lấy từ các nguồn công khai, cập nhật mỗi 5 phút.",
  },

  placeholder: {
    plannedTitle: "Trang này sẽ có gì",
    meanwhileTitle: "Trong lúc chờ",
    meanwhileBody: "Trang Phương pháp đã nêu rõ số liệu của chúng tôi đến từ đâu, được cập nhật bao lâu một lần và điều gì chúng tôi không hiển thị vì thiếu nguồn.",
    meanwhileCta: "Xem phương pháp",
  },}

export default vi
