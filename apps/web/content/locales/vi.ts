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
    open: 'Ngôn ngữ và tiền tệ',
    language: 'Ngôn ngữ',
    currency: 'Tiền tệ hiển thị',
    search: 'Tìm kiếm',
    noMatch: 'Không có tiền tệ nào khớp.',
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
    trendingTitle: 'Xu hướng',
    gainersTitle: 'Tăng mạnh nhất',
    losersTitle: 'Giảm mạnh nhất',
    moversHint: (size: number) => `Trong ${size} vốn hoá lớn nhất`,
    classMoversHint: (size: number) => `Trong ${size} tài sản được theo dõi của lớp này`,
    summaryTitle: 'Tổng quan thị trường',
    topIndicesTitle: 'Các chỉ số chính',
    volumeLeadersTitle: 'Khối lượng lớn nhất',
    economyTitle: 'Kinh tế',
    heroMarketCap: 'Vốn hoá tiền mã hoá',
    heroLoading: 'Đang tải dữ liệu…',
    heroUnavailable: 'Dữ liệu tạm thời không khả dụng.',
    newsTitle: 'Tin mới nhất',
    sentimentTitle: 'Tâm lý thị trường',
    coverageTitle: 'Phạm vi theo lớp tài sản',
    seeAll: 'Xem tất cả',
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
  },

  notFound: {
    title: 'Đỉnh núi này không tồn tại',
    body: 'Trang bạn tìm đã được chuyển đi hoặc chưa từng tồn tại. Hãy bắt đầu lại từ trang chủ.',
    cta: 'Về trang chủ',
  },
}

export default vi
