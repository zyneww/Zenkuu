/**
 * HÔTES D'IMAGES DES FLUX D'ACTUALITÉS — une seule liste, deux lecteurs.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE PLUTÔT QU'UNE LISTE DANS `next.config.ts`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Deux endroits ont besoin de savoir quels hôtes sont autorisés, et pour des raisons
 * différentes :
 *
 *   · `next.config.ts` — l'optimiseur d'images REFUSE tout hôte non déclaré. C'est
 *     une protection contre le relais ouvert : sans elle, n'importe qui pourrait
 *     faire redimensionner n'importe quelle image du web par notre serveur.
 *
 *   · le composant de rendu — il doit savoir AVANT de rendre si l'hôte passera.
 *     Sans ce test, un article dont l'éditeur a changé de CDN ferait lever une
 *     exception au rendu, c'est-à-dire une fiche entière en erreur 500 pour une
 *     vignette. `onError` n'aide pas : la vérification a lieu côté serveur, avant
 *     que le navigateur ne voie quoi que ce soit.
 *
 * Deux listes séparées divergeraient à la première ajoutée d'un côté seulement, et le
 * symptôme serait précisément celui qu'on veut éviter — une page en erreur pour une
 * image. Elles n'en font donc qu'une, et `next.config.ts` l'importe.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * COMMENT CETTE LISTE A ÉTÉ ÉTABLIE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Par MESURE, pas par supposition. Deux relevés distincts la composent :
 *
 *   · les flux de `providers/news.ts`, interrogés un à un, tous leurs attributs
 *     d'image extraits (`media:content`, `media:thumbnail`, `enclosure`, `<img>` du
 *     corps) — vingt-six hôtes ;
 *   · le flux Yahoo PAR SYMBOLE, qui n'en publie aucun dans son XML et dont les
 *     vignettes viennent toutes de l'`og:image` des pages liées — cinq hôtes de plus.
 *
 * Sept flux ne publient AUCUNE image dans leur XML — CNBC (deux flux), Seeking Alpha,
 * la SEC, la Fed, la BCE et France Info. Leurs articles passent par `fetchOgImage`,
 * qui lit la balise `og:image` de la page ; les hôtes ainsi découverts ne sont pas
 * tous prévisibles, et c'est exactement le cas que le garde du composant traite.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUI N'EST PAS FAIT, ET POURQUOI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Pas de joker `**`. Il ferait de notre optimiseur un service de redimensionnement
 * ouvert à tout le web, facturé à nous. La liste explicite coûte une ligne le jour où
 * un éditeur change de CDN ; le joker coûterait une facture.
 */

/**
 * Hôtes relevés sur les flux, par éditeur.
 *
 * L'ordre suit celui de `FEEDS` dans `providers/news.ts`, pour qu'un ajout de flux
 * trouve sa place sans avoir à parcourir la liste entière.
 */
export const NEWS_IMAGE_HOSTS: readonly string[] = [
  // ── Cryptomonnaies, anglais ─────────────────────────────────────────────
  'cdn.sanity.io', // CoinDesk
  'downloads.coindesk.com',
  's3-images.ctmedia.io', // Cointelegraph
  'www.tbstat.com', // The Block
  'cdn.decrypt.co',
  'img.decrypt.co',
  'bitcoinmagazine.com',
  'cryptoslate.com',
  'bitcoinist.com',
  'www.newsbtc.com',

  // ── Cryptomonnaies, français ────────────────────────────────────────────
  'journalducoin-com.exactdn.com',
  'cryptoast.fr',
  'www.cointribune.com',
  'bitcoin.fr',

  // ── Marchés & entreprises ───────────────────────────────────────────────
  'media.zenfs.com', // Yahoo Finance
  's.yimg.com',
  'images.mktw.net', // MarketWatch
  'content-media.investing.com',

  // ── Économie & macro ────────────────────────────────────────────────────
  'img.lemde.fr', // Le Monde
  'www.challenges.fr',
  'static.latribune.fr',
  'i.f1g.fr', // Le Figaro
  's.rfi.fr',
  'www.cafedelabourse.com',
  'static.euronews.com',

  /* ── Éditeurs atteints par le fil Yahoo PAR SYMBOLE ─────────────────────

     Ce flux-là ne publie aucune image dans son XML — mesuré, zéro sur six symboles.
     Ses vignettes viennent donc toutes de l'`og:image` des pages liées, et ces pages
     appartiennent à des éditeurs que Yahoo agrège sans que nous les ayons choisis.

     La liste est celle qui est RESSORTIE de la mesure, dominée par `s.yimg.com` (déjà
     inscrit plus haut au titre du flux Yahoo général). Elle est plus volatile que les
     autres : Yahoo change ses partenaires. Un éditeur non listé perd sa vignette et
     rien d'autre — c'est exactement le repli que ce fichier existe pour garantir. */
  '247wallst.com',
  'g.foolcdn.com', // Motley Fool
  'cdn.proactiveinvestors.com',
  'media.barchart.com',
  'www.moneydigest.com',

  // ── Commun à plusieurs sites WordPress ──────────────────────────────────
  // Le service d'emojis et de vignettes de WordPress.com, servi par Bitcoin Magazine
  // et Journal du Coin. Il ne sert que des images décoratives, mais il apparaît dans
  // les mêmes attributs : l'omettre ferait tomber les vignettes utiles de ces deux
  // flux au premier article qui en porte une.
  's.w.org',
]

const HOST_SET = new Set(NEWS_IMAGE_HOSTS)

/**
 * L'optimiseur d'images acceptera-t-il cette URL ?
 *
 * Répond `false` plutôt que de lever, sur une URL malformée comme sur un hôte inconnu :
 * l'appelant retire simplement la vignette, et l'article reste lisible. C'est le seul
 * comportement acceptable pour un élément décoratif — voir l'en-tête.
 */
export function isOptimizableNewsImage(url: string | undefined): url is string {
  if (!url) return false

  try {
    const parsed = new URL(url)
    /* Le protocole compte autant que l'hôte : `remotePatterns` n'autorise que HTTPS, et
       une URL en `http:` serait refusée par l'optimiseur même sur un hôte listé. */
    return parsed.protocol === 'https:' && HOST_SET.has(parsed.hostname)
  } catch {
    return false
  }
}
