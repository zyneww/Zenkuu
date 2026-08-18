import type { Translation } from './index'
import { trPhrases } from './phrases/tr'

/**
 * Arayüz metinleri — Türkçe.
 *
 * Bilinçli olarak kısmi bir çeviri (ölçüt için bkz. `it.ts`) : HER sayfada görünen
 * bölümler çevrildi ; uzun ve uzmanlık gerektiren bölümler İngilizceye düşer —
 * `content/locales/index.ts` İngilizceyi Fransızcadan önce koymasının nedeni tam da budur.
 */
const tr: Translation = {
  phrases: trPhrases,

  site: {
    name: 'Zenkuu',
    tagline: 'Çok varlıklı piyasa takibi ve analizi',
    description:
      'Kripto paralar, dövizler, hisse senetleri, ETF’ler, emtialar ve endeksler — fiyatlar, piyasa değerleri ve eğilimler tek bir yerde. Yalnızca bilgi amaçlı platform.',
  },

  nav: {
    home: 'Ana sayfa',
    soon: 'Yakında',
    soonShort: 'Yakında',
    openMenu: 'Menüyü aç',
    searchPlaceholder: 'Varlık ara',
    searchSoon: 'Evrensel arama, sonraki varlık sınıflarıyla birlikte gelecek.',
    skipToContent: 'Ana içeriğe geç',
  },

  search: {
    title: 'Evrensel arama',
    open: 'Aramayı aç',
    close: 'Aramayı kapat',
    placeholder: 'Varlık veya sembol ara…',
    trendingTitle: 'Öne çıkanlar',
    trendingHint: 'son 24 saatte en çok görüntülenenler',
    trendingEmpty: 'Öne çıkanlar geçici olarak kullanılamıyor.',
    otherAssets: 'Hisse senetleri, ETF’ler, endeksler ve emtialar',
    loading: 'Aranıyor…',
    noResult: (query: string) => `« ${query} » ile eşleşen varlık yok.`,
    cryptoUnavailable:
      'Kripto kaynağı geçici olarak yoğun. Diğer varlık sınıfları görüntülenebilir.',
    hint: 'Aramayı yeniden açmak için Ctrl + K',
  },

  locale: {
    open: 'Dil ve para birimi',
    language: 'Dil',
    currency: 'Görüntüleme para birimi',
    search: 'Ara',
    noMatch: 'Eşleşen para birimi yok.',
  },

  theme: {
    switchToDark: 'Koyu temaya geç',
    switchToLight: 'Açık temaya geç',
  },

  pages: {
    home: 'Ana sayfa',
    crypto: 'Kripto paralar',
    forex: 'Dövizler',
    stocks: 'Hisse senetleri',
    etf: 'ETF’ler',
    commodities: 'Emtialar',
    indices: 'Endeksler',
    categories: 'Kategoriler',
    news: 'Haberler',
    sentiment: 'Piyasa duyarlılığı',
    movers: 'Yükselenler ve düşenler',
    notFound: 'Sayfa bulunamadı',
    learn: 'Öğren',
    getStarted: 'Başlarken',
    blog: 'Blog',
    methodology: 'Yöntem ve kaynaklar',
    developers: 'API ve geliştiriciler',
    help: 'Yardım merkezi',
    changelog: 'Yenilikler',
    about: 'Hakkımızda',
  },

  globalStats: {
    marketCap: 'Toplam piyasa değeri',
    volume: '24 s hacim',
    dominanceBtc: 'BTC hakimiyeti',
    dominanceEth: 'ETH hakimiyeti',
    activeAssets: 'Aktif kripto paralar',
    unavailable: 'Küresel istatistikler geçici olarak kullanılamıyor',
    caption: (value: string, change: string) =>
      `Kripto paraların küresel piyasa değeri ${value}, son 24 saatte ${change}.`,
  },

  home: {
    trendingTitle: 'Öne çıkanlar',
    gainersTitle: 'En çok yükselenler',
    losersTitle: 'En çok düşenler',
    moversHint: (size: number) => `En büyük ${size} piyasa değeri arasında`,
    classMoversHint: (size: number) => `Bu sınıfta takip edilen ${size} varlık arasında`,
    summaryTitle: 'Piyasa özeti',
    topIndicesTitle: 'Başlıca endeksler',
    volumeLeadersTitle: 'En yüksek hacimler',
    economyTitle: 'Ekonomi',
    heroMarketCap: 'Kripto piyasa değeri',
    heroLoading: 'Veri yükleniyor…',
    heroUnavailable: 'Veri geçici olarak kullanılamıyor.',
    newsTitle: 'Son haberler',
    sentimentTitle: 'Piyasa duyarlılığı',
    coverageTitle: 'Varlık sınıfına göre kapsam',
    seeAll: 'Tümünü gör',
  },

  assetClass: {
    crypto: 'Kripto paralar',
    forex: 'Dövizler',
    stock: 'Hisse senetleri',
    etf: 'ETF’ler',
    commodity: 'Emtialar',
    index: 'Endeksler',
    nft: 'NFT’ler',
  },

  states: {
    unavailableTitle: 'Veri kullanılamıyor',
    connected: 'Bağlandı',
    pending: 'Bağlanacak',
  },

  auth: {
    signIn: 'Giriş yap',
    signUp: 'Kaydol',
  },

  notFound: {
    title: 'Bu zirve mevcut değil',
    body: 'Aradığınız sayfa taşınmış ya da hiç var olmamış. Tırmanışa ana sayfadan yeniden başlayın.',
    cta: 'Ana sayfaya dön',
  },
}

export default tr
