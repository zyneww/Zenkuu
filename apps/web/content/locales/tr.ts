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
    convertedFrom: (from: string, date: string) => `${date} tarihli AMB kuruyla ${from} cinsinden çevrildi`,
    currencyHint: (date: string) =>
      `${date} tarihli AMB referans kuruyla çevrildi. Kaynaklar euro cinsinden fiyatlar; seçilen para birimi sitenin tamamında geçerlidir.`,
    open: 'Dil ve para birimi',
    language: 'Dil',
    currency: 'Görüntüleme para birimi',
    search: 'Ara',
    noMatch: 'Eşleşen para birimi yok.',

    languageHint: "Çevrildi olarak işaretli diller arayüzü değiştirir. Diğerleri, çeviri dosyaları hazır olana dek tercihinizi kaydeder — düzeltilmemiş bir makine çevirisi sunmaktansa neyin eksik olduğunu söylemeyi yeğliyoruz.",
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
    marketCapSeriesBuilding: (count: number) =>
      count === 0
        ? 'Eğri henüz oluşuyor: hiçbir ücretsiz kaynak dünya piyasa değerinin geçmişini yayımlamıyor, bu yüzden kendi ölçümlerimizi kaydediyoruz.'
        : `Eğri oluşuyor — şimdiye dek ${count} ölçüm.`,
    marketCapSeriesHint: (minutes: number) =>
      minutes >= 120
        ? `${Math.round(minutes / 60)} saatlik ZENKUU ölçümleri`
        : `${minutes} dakikalık ZENKUU ölçümleri`,
    marketCapSeriesLabel: (minutes: number) =>
      `Son ${minutes} dakikada toplam piyasa değerinin seyri`,
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

    topMarketCapTitle: "En büyük piyasa değerleri",
    marketCapCardTitle: "Piyasa değeri",
    volumeCardTitle: "24 saatlik işlem hacmi",
    narrativesTitle: "En hareketli sektörler · 24 sa",
    forexTitle: "Para birimleri · AMB referansı",
    forexHint: "Kurlar iş günü başına bir kez yayımlanır",
    watchlistTitle: "İzleme listem",
    watchlistEmptyTitle: "İzleme listeniz boş",
    watchlistEmptyBody: "Bir varlık sayfasından eklediğiniz varlıklar burada görünecek. Liste hesabınıza bağlıdır.",
    tabs: {
      all: "Tümü",
      trending: "Öne çıkanlar",
      gainers: "Yükselenler",
      losers: "Düşenler",
      categories: "Kategoriler",
    },
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

    unavailableTitle: "Hesaplar yakında",
    unavailableBody: "Bu örnekte kimlik doğrulama henüz yapılandırılmadı. Hesaplar izleme listesini kalıcı kılacak, fiyat uyarılarına ve görüntüleme tercihlerine erişim verecek.",
    signInTitle: "ZENKUU’ya giriş yap",
    signInSubtitle: "İzleme listenizi ve tercihlerinizi geri alın.",
    signUpTitle: "ZENKUU hesabı oluştur",
    signUpSubtitle: "Ücretsiz. Banka bilgisi istenmez — ZENKUU ne fon ne de işlem yönetir.",
    close: "Kapat",
    overlaySignInTitle: "ZENKUU’ya hoş geldiniz",
    overlaySignInSubtitle: "Saniyeler içinde giriş yapın ya da kaydolun.",
    overlaySignUpTitle: "Hesabınızı oluşturun",
    overlaySignUpSubtitle: "Ücretsiz, banka bilgisi olmadan.",
    switchToSignUp: "Henüz hesabınız yok mu?",
    switchToSignIn: "Zaten hesabınız var mı?",
    benefitsTitle: "Hesabın sağladıkları",
    benefits: [
      "İzleme listeniz saklanır ve tüm cihazlarınızda karşınıza çıkar",
      "Görüntüleme para birimi ve tema hatırlanır",
      "Ayarlarınız açılışta uygulanır, yeniden yapılandırmaya gerek kalmaz",
    ],
    benefitsNote: "ZENKUU hiçbir emir gerçekleştirmez, fon tutmaz ve veri satmaz. Hesap yalnızca ayarlarınıza yeniden ulaşmak içindir.",
    legalPrefix: "Devam ederek kullanım koşullarımızı kabul etmiş olursunuz; koşullar",
    legalLink: "Hakkında sayfasında açıklanmıştır",
  },

  notFound: {
    title: 'Bu zirve mevcut değil',
    body: 'Aradığınız sayfa taşınmış ya da hiç var olmamış. Tırmanışa ana sayfadan yeniden başlayın.',
    cta: 'Ana sayfaya dön',
  },


  market: {
    pageLabel: (page: number) => `Sayfa ${page}`,
    columns: {
      rank: "#",
      name: "Varlık",
      price: "Fiyat",
      change1h: "1 sa",
      change24h: "24 sa",
      change7d: "7 g",
      volume: "Hacim 24 sa",
      marketCap: "Piyasa değeri",
      chart: "7 gün",
      variation: "Değişim",
      watch: "İzle",
      dayRange: "24 sa en düşük / en yüksek",
    },
    sortByMarketCap: "Piyasa değerine göre sırala",
    sortByVolume: "Hacme göre sırala",
    sortNotSupported: "Sıralama tüm listeyi kapsar. Değişim sütunları sıralanamaz: kaynak buna piyasanın tamamı ölçeğinde izin vermiyor.",
    previous: "Önceki sayfa",
    next: "Sonraki sayfa",
    emptyPage: "Listenin bu sayfasında varlık yok. İlk sayfaya dönün.",
  },

  crypto: {
    title: "Kripto para sıralaması",
    subtitle: "Euro cinsinden fiyat, piyasa değeri ve hacim; 5 dakikada bir güncellenir.",
  },

  forex: {
    title: "Döviz kurları",
    subtitle: "Avrupa Merkez Bankası’nın iş günü başına bir kez yayımladığı referans kurlar.",
  },

  stocks: {
    title: "Hisse senetleri",
    subtitle: "Başlıca halka açık şirketlerin fiyatları ve piyasa değerleri.",
  },

  etf: {
    title: "ETF’ler",
    subtitle: "Borsada işlem gören endeks fonları: fiyat, değişim ve hacim.",
  },

  commodities: {
    title: "Emtialar",
    subtitle: "Enerji, değerli ve sanayi metalleri, tarım ürünleri.",
  },

  indices: {
    title: "Borsa endeksleri",
    subtitle: "Başlıca dünya endeksleri ve son seyirleri.",
  },

  asset: {
    convertedNotice: (from: string, to: string, date: string) =>
      `Tutarlar, ${date} tarihli AMB referans kuruyla ${from} biriminden ${to} birimine çevrildi. Kaynak bu varlığı ${from} cinsinden fiyatlıyor.`,
    aboutTitle: (name: string) => `${name} hakkında`,
    priceLabel: (name: string) => `${name} fiyatı`,
    statsTitle: "Piyasa istatistikleri",
    similarTitle: "Benzer varlıklar",
    rangeTitle: "Dönem",
    ranges: {
      d1: "24 sa",
      d7: "7 g",
      d30: "30 g",
      d90: "90 g",
      y1: "1 yıl",
    },
    chart: {
      kindTitle: "Grafik türü",
      kinds: {
        area: "Alan",
        line: "Çizgi",
        baseline: "Sapma",
        candles: "Mum",
        bars: "Çubuk",
      },
      optionsTitle: "Görünüm",
      volume: "Hacim",
      movingAverage: "Hareketli ortalama",
      priceLines: "Uç değerler",
      loadingCandles: "Mumlar yükleniyor…",
      candlesUnavailable: "Bu kaynak, bu varlık için mum verisi yayımlamıyor — Mum ve Çubuk görünümleri bu nedenle kullanılamaz.",
      volumeUnavailable: "Kaynak bu dönem için hacim yayımlamıyor.",
    },
    tabs: {
      overview: "Grafik",
      history: "Getiri",
      stats: "İstatistikler",
      about: "Hakkında",
      faq: "SSS",
    },
    currencyLabel: "Görüntüleme para birimi",
    loadingSeries: "Seri yükleniyor…",
    performanceTitle: "Döneme göre getiri",
    performanceNote: "Değişimler bu varlık için yüklenen bir yıllık seri üzerinden hesaplanır; 24 saatlik değer kaynaktan olduğu gibi alınır.",
    rangeYearTitle: "Bir yıllık uç değerler",
    lowest: "En düşük",
    highest: "En yüksek",
    faq: {
      buyQ: (name: string) => `ZENKUU üzerinden ${name} satın alınabilir mi?`,
      supplyA: (max: string, symbol: string, circulating: string | null) =>
        circulating
          ? `Azami arz ${max} ${symbol}; bunun ${circulating} ${symbol} kadarı şu anda dolaşımda.`
          : `Azami arz ${max} ${symbol}.`,
      supplyQ: (name: string) => `En fazla kaç adet ${name} var olacak?`,
      athA: (price: string, date: string | null) =>
        date
          ? `Tüm zamanların zirvesi ${price}; ${date} tarihinde görüldü.`
          : `Tüm zamanların zirvesi ${price}.`,
      athQ: (name: string) => `${name} için tüm zamanların zirvesi nedir?`,
      capA: (cap: string, rank?: number) =>
        rank
          ? `Piyasa değeri ${cap} olup, bu onu kendi varlık sınıfında ${rank}. sıraya yerleştirir.`
          : `Piyasa değeri ${cap}.`,
      capQ: (name: string) => `${name} için piyasa değeri nedir?`,
      priceA: (name: string, price: string, updated: string) =>
        `${name} ${price} seviyesinde işlem görüyor. Kaynağımızın yayımladığı son değer: ${updated}.`,
      priceQ: (name: string) => `${name} bugün kaç para?`,
      buyA: "Hayır. ZENKUU bir bilgi platformudur: hiçbir emir gerçekleştirmez, fon tutmaz, ne aracı kurum ne de borsadır.",
    },
    stats: {
      marketCap: "Piyasa değeri",
      volume: "Hacim 24 sa",
      circulating: "Dolaşımdaki arz",
      total: "Toplam arz",
      max: "Azami arz",
      ath: "Tüm zamanların zirvesi",
      atl: "Tüm zamanların dibi",
      rank: "Sıra",
      low24h: "24 sa en düşük",
      high24h: "24 sa en yüksek",
      previousClose: "Önceki kapanış",
      exchange: "İşlem gördüğü borsa",
      high52w: "52 hafta en yüksek",
      low52w: "52 hafta en düşük",
    },
    noDescription: "Kaynak bu varlık için bir açıklama vermiyor.",
    readOnly: "Yalnızca bilgi sayfası. ZENKUU alım, satım ya da emir iletimine izin vermez.",
    officialLinks: "Resmî bağlantılar",
    website: "Resmî site",
    notFoundTitle: "Varlık bulunamadı",
    notFoundBody: "Bu tanımlayıcı, kaynaklarımızın bildiği hiçbir varlığa karşılık gelmiyor.",
    backToRanking: "Sıralamaya dön",
    chartUnavailable: "Bu varlık için fiyat geçmişi kullanılamıyor.",
  },

  categories: {
    title: "Kategoriler ve sektörler",
    subtitle: "Kripto piyasasının başlıca temalarının 24 saatlik getirisi.",
    columns: {
      name: "Kategori",
      marketCap: "Piyasa değeri",
      change: "24 sa",
      volume: "Hacim 24 sa",
    },
  },

  news: {
    readOn: (source: string) => `${source} üzerinde oku`,
    title: "Piyasa haberleri",
    subtitle: "Başlıca yayıncıların herkese açık akışlarından derlenmiştir.",
    unavailable: "Haber akışı şu an kullanılamıyor.",
  },

  sentiment: {
    title: "Fear & Greed endeksi",
    subtitle: "Kripto piyasası duyarlılığının bileşik ölçüsü: 0 (aşırı korku) ile 100 (aşırı açgözlülük) arasında.",
    scale: {
      extremeFear: "Aşırı korku",
      fear: "Korku",
      neutral: "Nötr",
      greed: "Açgözlülük",
      extremeGreed: "Aşırı açgözlülük",
    },
    disclaimer: "Duyarlılık göstergesidir, tavsiye değildir. Hiçbir fiyat hareketini öngörmez.",
  },

  footer: {
    rights: (year: number) => `© ${year} ZENKUU`,
    positioning: "Bilgi platformu; emir gerçekleştirmez, fon saklamaz.",
    community: "Topluluk",
    locale: "Türkçe · EUR",
    localeHint: "Site Fransızca yayımlanır ve referans para birimi eurodur. Başka diller ve para birimleri sonradan eklenecek.",
    disclaimer: "ZENKUU yalnızca okunabilir bir bilgi platformudur. Alım, satım ya da cüzdan bağlama işlevi yoktur. Gösterilen bilgiler yatırım tavsiyesi değildir.",
    dataNote: "Piyasa verileri kamuya açık kaynaklardan gelir, 5 dakikada bir güncellenir.",
  },

  placeholder: {
    plannedTitle: "Bu sayfada neler olacak",
    meanwhileTitle: "Bu arada",
    meanwhileBody: "Yöntem sayfası, rakamlarımızın nereden geldiğini, hangi sıklıkta güncellendiğini ve kaynak yokluğunda neyi göstermediğimizi şimdiden açıklıyor.",
    meanwhileCta: "Yöntemi gör",
  },}

export default tr
