/**
 * Agrégation d'actualités depuis des flux RSS publics.
 *
 * Pourquoi du RSS plutôt qu'une API d'actualités ? Parce que toutes celles testées
 * exigent désormais une clé : `/news` de CoinGecko renvoie 401 sur le palier gratuit,
 * CryptoCompare aussi, et NewsData.io plafonne bas. Le RSS, lui, est publié par les
 * éditeurs POUR être syndiqué : c'est gratuit, stable depuis vingt ans, et sans quota.
 *
 * On n'affiche que titre, extrait, source et horodatage, avec un lien sortant vers
 * l'article d'origine. On ne republie jamais le texte intégral : la syndication
 * autorise l'annonce, pas la reprise.
 */

import { createHttpClient } from '../http'
import type { NewsItem } from '../types'
import { ProviderError } from '../types'

interface FeedSource {
  id: string
  label: string
  url: string
  /**
   * Rubrique du flux.
   *
   * Elle est portée par le FLUX, pas déduite de l'article. C'est la différence entre
   * une catégorie vraie et une catégorie devinée : un flux « marchés actions » ne
   * publie que de l'actualité actions, tandis que deviner la rubrique en cherchant
   * des mots-clés dans un titre produirait des étiquettes fausses — donc de la
   * donnée inventée, que le §5 proscrit au même titre qu'un chiffre inventé.
   */
  category: NewsCategory
  /** Langue de publication, déclarée par le flux. Même raisonnement que la rubrique. */
  lang: NewsLang
}

export type NewsCategory = 'crypto' | 'marches' | 'economie' | 'regulation'

export type NewsLang = 'fr' | 'en'

/** Libellés affichés — définis ici pour rester alignés sur les flux eux-mêmes. */
export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  crypto: 'Cryptomonnaies',
  marches: 'Marchés & entreprises',
  economie: 'Économie & macro',
  regulation: 'Régulation & banques centrales',
}

export const NEWS_LANG_LABELS: Record<NewsLang, string> = {
  fr: 'Français',
  en: 'Anglais',
}

/**
 * Flux suivis — 29 sources, contre 4 auparavant.
 *
 * ── CHACUN A ÉTÉ INTERROGÉ AVANT D'ÊTRE INSCRIT ICI ───────────────────────────
 *
 * Un flux mort ne coûte pas qu'une source manquante : il fait apparaître une case à
 * cocher dans les filtres qui ne renverra jamais rien. Le lecteur croit alors avoir
 * filtré alors qu'il a vidé sa page, et rien ne le lui dit.
 *
 * Neuf candidats ont été écartés à ce titre, tous par refus du serveur et non par
 * choix éditorial : Les Échos, Boursorama, le FMI, BFM Bourse, Zonebourse, ABC
 * Bourse, Capital et Les Échos Investir répondent 403 ou 404 à un agrégateur.
 * Certains reviendront peut-être avec une autre adresse ; les réessayer coûte une
 * requête, les inscrire à l'aveugle coûte un filtre trompeur.
 *
 * ── RÉPARTITION ───────────────────────────────────────────────────────────────
 *
 *   crypto      12   (8 anglais, 4 français)
 *   marchés      6   (6 anglais)
 *   économie     8   (8 français)
 *   régulation   3   (3 anglais)
 *
 * Le déséquilibre anglais/français sur les marchés est SUBI, pas choisi : les trois
 * quotidiens économiques français de référence refusent tous l'accès à leur flux.
 * Le filtre de langue permet au lecteur francophone de s'en tenir au français, au
 * prix d'un fil plus étroit — un arbitrage qui lui appartient.
 */
const FEEDS: FeedSource[] = [
  // ── Cryptomonnaies, anglais ───────────────────────────────────────────────
  { id: 'coindesk', label: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'crypto', lang: 'en' },
  { id: 'cointelegraph', label: 'Cointelegraph', url: 'https://cointelegraph.com/rss', category: 'crypto', lang: 'en' },
  { id: 'theblock', label: 'The Block', url: 'https://www.theblock.co/rss.xml', category: 'crypto', lang: 'en' },
  { id: 'decrypt', label: 'Decrypt', url: 'https://decrypt.co/feed', category: 'crypto', lang: 'en' },
  { id: 'bitcoinmag', label: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/feed', category: 'crypto', lang: 'en' },
  { id: 'cryptoslate', label: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', category: 'crypto', lang: 'en' },
  { id: 'bitcoinist', label: 'Bitcoinist', url: 'https://bitcoinist.com/feed/', category: 'crypto', lang: 'en' },
  { id: 'newsbtc', label: 'NewsBTC', url: 'https://www.newsbtc.com/feed/', category: 'crypto', lang: 'en' },

  // ── Cryptomonnaies, français ──────────────────────────────────────────────
  { id: 'journalducoin', label: 'Journal du Coin', url: 'https://journalducoin.com/feed/', category: 'crypto', lang: 'fr' },
  { id: 'cryptoast', label: 'Cryptoast', url: 'https://cryptoast.fr/feed/', category: 'crypto', lang: 'fr' },
  { id: 'cointribune', label: 'Cointribune', url: 'https://www.cointribune.com/feed/', category: 'crypto', lang: 'fr' },
  { id: 'bitcoinfr', label: 'Bitcoin.fr', url: 'https://bitcoin.fr/feed/', category: 'crypto', lang: 'fr' },

  // ── Marchés & entreprises ─────────────────────────────────────────────────
  { id: 'yahoo-finance', label: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'marches', lang: 'en' },
  { id: 'cnbc-markets', label: 'CNBC Markets', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', category: 'marches', lang: 'en' },
  { id: 'cnbc-business', label: 'CNBC Business', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', category: 'marches', lang: 'en' },
  { id: 'marketwatch', label: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', category: 'marches', lang: 'en' },
  { id: 'investing', label: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss', category: 'marches', lang: 'en' },
  { id: 'seekingalpha', label: 'Seeking Alpha', url: 'https://seekingalpha.com/market_currents.xml', category: 'marches', lang: 'en' },

  // ── Régulation & banques centrales ────────────────────────────────────────
  // Sources primaires : ce que l'autorité publie elle-même, avant tout commentaire.
  { id: 'sec', label: 'SEC', url: 'https://www.sec.gov/news/pressreleases.rss', category: 'regulation', lang: 'en' },
  { id: 'fed', label: 'Federal Reserve', url: 'https://www.federalreserve.gov/feeds/press_all.xml', category: 'regulation', lang: 'en' },
  { id: 'ecb', label: 'BCE', url: 'https://www.ecb.europa.eu/rss/press.html', category: 'regulation', lang: 'en' },

  // ── Économie & macro ──────────────────────────────────────────────────────
  { id: 'francetvinfo', label: 'France Info éco', url: 'https://www.francetvinfo.fr/economie.rss', category: 'economie', lang: 'fr' },
  { id: 'lemonde-eco', label: 'Le Monde Économie', url: 'https://www.lemonde.fr/economie/rss_full.xml', category: 'economie', lang: 'fr' },
  { id: 'challenges', label: 'Challenges', url: 'https://www.challenges.fr/rss.xml', category: 'economie', lang: 'fr' },
  { id: 'latribune', label: 'La Tribune', url: 'https://www.latribune.fr/feed.xml', category: 'economie', lang: 'fr' },
  { id: 'lefigaro-eco', label: 'Le Figaro Économie', url: 'https://www.lefigaro.fr/rss/figaro_economie.xml', category: 'economie', lang: 'fr' },
  { id: 'rfi-eco', label: 'RFI Économie', url: 'https://www.rfi.fr/fr/économie/rss', category: 'economie', lang: 'fr' },
  { id: 'cafedelabourse', label: 'Café de la Bourse', url: 'https://www.cafedelabourse.com/feed', category: 'economie', lang: 'fr' },
  { id: 'euronews-eco', label: 'Euronews Business', url: 'https://fr.euronews.com/rss?level=theme&name=business', category: 'economie', lang: 'fr' },
]

const http = createHttpClient({
  providerId: 'rss-news',
  // Les flux vivent sur des domaines différents : on passe l'URL absolue à chaque appel.
  baseUrl: 'https://example.invalid',
  /*
   * ⚠️ CE PLAFOND EST PAR MINUTE, PAS PAR APPEL — la confusion coûte cher.
   *
   * `fetchNews` interroge les VINGT-NEUF flux à chaque appel, quel que soit le nombre
   * d'articles demandé : l'accueil qui en affiche six paie autant que la page
   * d'actualités qui en affiche soixante-douze. Deux pages consultées dans la même
   * minute font donc 58 requêtes.
   *
   * Réglé à 40, le limiteur ENDORMAIT tout le reste de la fenêtre — mesuré : cent
   * secondes d'attente sur l'accueil, contre trois secondes pour les mêmes flux
   * interrogés directement. Le symptôme ne désignait pas sa cause, la page semblant
   * simplement « lente ».
   *
   * 240 laisse passer huit collectes complètes par minute. Le risque habituel d'un
   * plafond haut — épuiser le quota d'une API — n'existe pas ici : ces requêtes vont
   * vers vingt-neuf domaines DISTINCTS, dont aucun n'en reçoit plus d'une par appel.
   * Le plafond ne sert donc que de garde-fou contre un emballement.
   */
  maxRequestsPerWindow: 240,
  /*
   * ZÉRO ESPACEMENT, et c'est le contraire d'une négligence.
   *
   * Le limiteur SÉRIALISE les requêtes et attend `minIntervalMs` entre chacune. À
   * 200 ms — valeur calibrée quand la liste comptait quatre flux, soit 0,8 s — la
   * facture passe à 5,8 secondes pour vingt-neuf, avant même qu'une seule réponse
   * n'arrive. Mesuré : le premier rendu de la page dépassait la minute.
   *
   * Or un espacement protège un SERVEUR, en évitant de le marteler. Ici les
   * vingt-neuf requêtes partent vers vingt-neuf DOMAINES DISTINCTS, dont aucun n'en
   * reçoit plus d'une : il n'y a rien à ménager, et le délai ne fait que retarder.
   *
   * `maxRequestsPerWindow` reste, lui, à 40 : il borne le volume total par fenêtre,
   * ce qui garde son sens quelle que soit la répartition des domaines.
   */
  minIntervalMs: 0,
  timeoutMs: 8_000,

  /*
   * AUCUNE SECONDE TENTATIVE APRÈS EXPIRATION — le seul réglage qui compte pour le
   * temps de réponse de la page.
   *
   * Le client réessaie par défaut, ce qui est juste pour une source UNIQUE dont
   * l'échec vide la page. Ici l'échec d'un flux sur vingt-neuf ne coûte qu'une
   * source, tandis que sa reprise fait attendre TOUT LE FIL une seconde fois.
   *
   * Mesuré avant correction : le premier rendu dépassait les trois minutes, chaque
   * flux lent comptant deux fois douze secondes. Un flux absent est rattrapé au
   * passage suivant de la collecte horaire ; un lecteur qui attend, non.
   */
  retryOnTimeout: false,
  // Aligné sur le TTL du fil d'actualités, plus court que le défaut.
  revalidateSeconds: 180,

  /*
   * PAS DE CACHE DISQUE POUR CES FLUX — la correction la plus déterminante du lot.
   *
   * Vingt-neuf flux RSS pèsent environ six méga-octets de XML par collecte. Écrits
   * un à un dans le cache de Next, ils dominaient tout le reste : `fetchNews(72)`
   * prend 5,7 secondes en direct et dépassait 90 secondes à travers Next, mesuré sur
   * cette machine. La page ne semblait pas cassée, seulement lente — le pire
   * symptôme, celui qu'on attribue au réseau ou à la source.
   *
   * Rien n'est perdu : `runStandalone` met en cache le RÉSULTAT PARSÉ pour les mêmes
   * 180 secondes. C'est le même effet utile, sur un objet des dizaines de fois plus
   * petit que les XML dont il est tiré.
   */
  bypassNextCache: true,
  headers: {
    Accept: 'application/rss+xml, application/xml, text/xml',
    'User-Agent': 'ZenkuuBot/1.0 (+https://zenkuu.example; agrégateur RSS)',
  },
})

/**
 * Extraction du premier contenu d'une balise.
 *
 * Un vrai parseur XML serait plus robuste, mais ajouterait une dépendance pour lire
 * cinq champs dans un format très stable. Le compromis est explicite : si un flux
 * change de forme au point de casser ces expressions, l'article est simplement
 * ignoré — jamais rendu à moitié.
 */
function extractTag(xml: string, tag: string): string | undefined {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'),
  )
  if (!match?.[1]) return undefined

  return decodeEntities(
    match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim(),
  )
}

/**
 * Décodage des entités HTML d'un flux.
 *
 * Les entités NUMÉRIQUES sont traitées d'abord et de façon générique, décimales
 * (`&#8217;`) comme hexadécimales (`&#x2019;`). La liste nommée qui suit ne couvre
 * que ce qui n'a pas de forme numérique évidente.
 *
 * Le cas hexadécimal manquait, et le défaut était visible à l'écran : le flux de
 * France Info encode ses accents ainsi, et les titres s'affichaient « Face &#xE0; la
 * crise du logement ». Une liste d'entités énumérées à la main est condamnée à
 * rater celles qu'on n'a pas prévues — d'où la conversion par code de caractère.
 *
 * `&amp;` est décodé EN DERNIER, après les autres : le faire avant transformerait
 * « &amp;#233; » en « &#233; », qu'une passe ultérieure décoderait à tort en « é »
 * alors que le flux voulait écrire le texte littéral.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => safeCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;|&apos;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Caractère correspondant à un point de code, ou chaîne vide s'il est invalide.
 *
 * `String.fromCodePoint` LÈVE sur une valeur hors plage — un flux mal formé ferait
 * alors échouer l'analyse de tout le lot, et le fil entier disparaîtrait à cause
 * d'un caractère. On préfère perdre le caractère.
 */
function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ''
  try {
    return String.fromCodePoint(code)
  } catch {
    return ''
  }
}

/**
 * Vignette d'un article, extraite du flux.
 *
 * Trois emplacements possibles, essayés dans cet ordre parce qu'ils vont du plus
 * fiable au plus approximatif :
 *  1. `<media:content url="…">` — la convention Media RSS, celle de Cointelegraph ;
 *  2. `<enclosure url="…">` — la balise RSS 2.0 d'origine, encore très répandue ;
 *  3. le premier `<img src="…">` du corps HTML de la description.
 *
 * La troisième est un repli assumé : un flux met parfois un pixel de suivi en tête
 * de sa description, d'où le filtre sur l'extension d'image. Une URL non reconnue
 * est ignorée plutôt que rendue — une vignette cassée est pire qu'aucune vignette.
 */
function extractImage(block: string): string | undefined {
  const candidates = [
    block.match(/<media:content[^>]+url="([^"]+)"/i)?.[1],
    block.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image\//i)?.[1],
    block.match(/<enclosure[^>]+type="image\/[^"]*"[^>]*url="([^"]+)"/i)?.[1],
    block.match(/<img[^>]+src="([^"]+)"/i)?.[1],
  ]

  for (const candidate of candidates) {
    if (!candidate?.startsWith('http')) continue
    // Les URL sans extension d'image reconnaissable sont souvent des pixels de
    // suivi ou des redirections de comptage, pas des illustrations.
    if (!/\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(candidate)) continue
    return candidate.replace(/&amp;/g, '&')
  }

  return undefined
}

function parseFeed(xml: string, source: FeedSource): NewsItem[] {
  const items: NewsItem[] = []
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? []

  for (const block of blocks) {
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link') ?? extractTag(block, 'guid')
    if (!title || !link || !link.startsWith('http')) continue

    const published = extractTag(block, 'pubDate') ?? extractTag(block, 'dc:date')
    const parsed = published ? new Date(published) : null

    const item: NewsItem = {
      id: `${source.id}:${link}`,
      title,
      url: link,
      source: source.label,
      category: source.category,
      lang: source.lang,
      publishedAt:
        parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString(),
    }

    const description = extractTag(block, 'description')
    if (description) {
      item.excerpt = description.length > 220 ? `${description.slice(0, 217)}…` : description
    }

    const image = extractImage(block)
    if (image) item.imageUrl = image

    const author = extractTag(block, 'dc:creator')
    if (author) item.author = author

    items.push(item)
  }

  return items
}

/**
 * Récupère la vignette d'un article sur SA PROPRE PAGE, quand le flux n'en donne pas.
 *
 * ── POURQUOI C'EST NÉCESSAIRE ─────────────────────────────────────────────────
 *
 * Mesuré sur les vingt-neuf flux : huit ne publient AUCUNE image — The Block, les
 * deux CNBC, Seeking Alpha, la Fed, la SEC, la BCE, Cryptoast. Ce n'est pas un
 * oubli de leur part : un flux RSS n'a jamais eu vocation à illustrer, et la balise
 * `media:content` est une extension que chacun adopte ou non.
 *
 * Or ces pages ont bien une image — celle que Slack, Discord ou Twitter affichent en
 * aperçu, déclarée en `<meta property="og:image">`. On lit la même.
 *
 * ── CE QUE ÇA COÛTE, ET COMMENT C'EST BORNÉ ───────────────────────────────────
 *
 * Une requête HTTP par article sans image. Trois précautions la rendent supportable :
 *
 *   · `Range: bytes=0-65535` — les balises `meta` sont dans le `<head>`, donc dans
 *     les tout premiers kilo-octets. On ne télécharge pas l'article entier. Un
 *     serveur qui ignore l'en-tête enverra tout, d'où la limite de taille ci-dessous.
 *   · 6 secondes de délai maximal — au-delà, l'article part sans image plutôt que
 *     de retarder tout le fil.
 *   · échec TOUJOURS silencieux — une vignette manquante n'est pas une panne, et le
 *     rendu prévoit déjà ce cas.
 */
async function fetchOgImage(articleUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'ZenkuuBot/1.0 (+https://zenkuu.example; agrégateur RSS)',
        Range: 'bytes=0-65535',
      },
      signal: AbortSignal.timeout(6_000),
      redirect: 'follow',
    })
    if (!response.ok && response.status !== 206) return undefined

    const head = (await response.text()).slice(0, 65_536)

    /*
     * L'ordre des attributs varie d'un site à l'autre : `property` peut précéder ou
     * suivre `content`. Deux expressions plutôt qu'une seule permissive, qui
     * accepterait aussi n'importe quelle balise entre les deux.
     */
    const match =
      head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
      head.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)

    const found = match?.[1]?.trim()
    if (!found) return undefined

    /* Certains sites déclarent un chemin relatif, que le navigateur résoudrait
       contre SA page — donc contre la nôtre, où il ne mène nulle part. */
    const absolute = new URL(found, articleUrl).toString()
    return absolute.startsWith('http') ? absolute : undefined
  } catch {
    return undefined
  }
}

/**
 * Complète les vignettes manquantes, en bornant le nombre de requêtes.
 *
 * Le plafond n'est pas une précaution abstraite : sans lui, un lot de trente-six
 * articles dont trente sans image déclencherait trente requêtes tierces avant que
 * la page ne puisse être rendue. On sert donc les premiers articles — ceux qui sont
 * vus en haut de page — et les suivants s'affichent sans vignette, ce que la mise en
 * page prévoit déjà.
 */
async function fillMissingImages(items: NewsItem[], budget = 8): Promise<NewsItem[]> {
  const targets = items.filter((item) => !item.imageUrl).slice(0, budget)
  if (targets.length === 0) return items

  const resolved = new Map<string, string>()
  await Promise.all(
    targets.map(async (item) => {
      const image = await fetchOgImage(item.url)
      if (image) resolved.set(item.id, image)
    }),
  )

  return items.map((item) => {
    const image = resolved.get(item.id)
    return image ? { ...item, imageUrl: image } : item
  })
}

export async function fetchNews(limit = 12): Promise<NewsItem[]> {
  // Un éditeur en panne ne doit pas vider tout le fil : on garde ce qui répond.
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const xml = await http.getText(feed.url)
      return parseFeed(xml, feed)
    }),
  )

  // Chaque flux garde sa propre pile, triée par fraîcheur. Les fusionner tout de
  // suite empêcherait de garantir la représentation de chacun.
  const perFeed = results
    .filter((outcome): outcome is PromiseFulfilledResult<NewsItem[]> => outcome.status === 'fulfilled')
    .map((outcome) =>
      [...outcome.value].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
    )
    .filter((items) => items.length > 0)

  if (perFeed.length === 0) {
    throw new ProviderError('rss-news', 'Aucun flux d’actualités n’a répondu', { retryable: true })
  }

  /*
   * TOUR À TOUR entre les flux, et non tri chronologique global.
   *
   * Le tri global paraissait évident et produisait pourtant un fil monosource :
   * mesuré, les 36 articles affichés venaient TOUS de Yahoo Finance, qui publie
   * plusieurs fois par heure là où Cointelegraph publie quelques fois par jour. Le
   * plus bavard raflait la totalité, et un site de suivi crypto affichait zéro
   * actualité crypto — un défaut invisible au typage comme au test HTTP.
   *
   * On prend donc le plus récent de chaque flux, puis le deuxième de chaque flux, et
   * ainsi de suite. Chaque source est représentée dès les premiers rangs, et un flux
   * épuisé cède simplement son tour.
   */
  const merged: NewsItem[] = []
  for (let rank = 0; merged.length < limit; rank += 1) {
    const round = perFeed.map((items) => items[rank]).filter(Boolean) as NewsItem[]
    if (round.length === 0) break

    // À l'intérieur d'un tour, l'ordre reste chronologique : la lecture garde une
    // cohérence de fraîcheur, sans qu'un flux puisse monopoliser les premiers rangs.
    round.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    merged.push(...round)
  }

  /* Les vignettes se complètent APRÈS la sélection, pas avant : compléter d'abord
     dépenserait des requêtes pour des articles qui n'entrent pas dans le lot. */
  return fillMissingImages(merged.slice(0, limit))
}

export const NEWS_SOURCES = FEEDS.map((feed) => feed.label).join(', ')
