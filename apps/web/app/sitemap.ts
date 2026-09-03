import type { MetadataRoute } from 'next'

import {
  YAHOO_UNIVERSE,
  getCryptoRanking,
  getDerivativeExchanges,
  getSpotExchanges,
  toSlug,
} from '@zenkuu/data'

import { HELP_ARTICLES } from '@/content/aide'
import { absoluteUrl, languageAlternates } from '@/lib/site'

/**
 * Sitemap dynamique (§9).
 *
 * Trois familles d'URL, obtenues par trois moyens de coût très différents :
 *
 *  1. les pages fixes et les contenus éditoriaux (aide, fiches Apprendre) — connus
 *     à la compilation, coût nul ;
 *  2. les fiches d'actifs de l'univers Yahoo — actions, ETF, indices et matières
 *     premières sont une LISTE STATIQUE dans le code, donc également gratuites ;
 *  3. les fiches crypto — seule famille qui exige un appel externe.
 *
 * Le point 3 est encapsulé dans un `DataResult` : si CoinGecko est indisponible ou
 * que le quota est atteint, le sitemap perd les URL crypto mais reste valide. Un
 * sitemap qui échoue est bien pire qu'un sitemap partiel — les moteurs le
 * redemandent moins souvent après une erreur.
 */

/** Combien de cryptos publier. Au-delà, la queue de classement n'a pas de trafic à capter. */
const CRYPTO_LIMIT = 100

/** Pages éditoriales et de navigation, avec leur rythme de changement réel. */
const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/categories', changeFrequency: 'daily', priority: 0.7 },

  /*
   * ── LES SIX PAGES DE CLASSE, ET LE SENS DE LA REDIRECTION ───────────────
   *
   * ⚠️ CETTE NOTE DISAIT L'INVERSE DE CE QUE FAIT LE SITE, ET LE CODE SOUS ELLE
   * LA CONTREDISAIT DÉJÀ.
   *
   * Elle expliquait que ces six pages avaient « quitté ce plan » parce qu'elles
   * redirigeaient vers les onglets de `/marches` — et les six lignes suivantes les
   * déclaraient quand même. Mesuré : c'est `/marches` qui rend aujourd'hui un 308
   * vers `/crypto`. La redirection a changé de sens, la note est restée.
   *
   * Le raisonnement qu'elle portait vaut toujours, et c'est pourquoi il est gardé :
   * un plan de site qui déclare une redirection est un défaut, pas une précaution.
   * Le robot suit le lien, arrive ailleurs qu'annoncé, et retient que ce fichier
   * décrit mal le site — Google le compte comme une erreur d'exploration. C'est
   * exactement pour cela que `/marches` NE FIGURE PAS ici, et que les six pages,
   * qui répondent 200, y figurent.
   */
  { path: '/crypto', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/actions', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/etf', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/indices', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/devises', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/matieres-premieres', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/derives', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/rachats', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/places', changeFrequency: 'daily', priority: 0.7 },
  { path: '/perpetuels', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/classements', changeFrequency: 'hourly', priority: 0.8 },
  /* Les quatre classements complets. Écrits un par un plutôt que dérivés d'une
     boucle : le fichier est une DÉCLARATION lue par un moteur de recherche, et une
     liste explicite se relit sans exécuter le code qui l'engendre. */
  { path: '/classements/hausses', changeFrequency: 'hourly', priority: 0.6 },
  { path: '/classements/baisses', changeFrequency: 'hourly', priority: 0.6 },
  { path: '/classements/volumes', changeFrequency: 'hourly', priority: 0.6 },
  { path: '/classements/rotation', changeFrequency: 'hourly', priority: 0.6 },
  /*
   * ⚠️ LES CINQ PAGES FILLES DE `/graphiques` ET `/glossaire` MANQUAIENT ICI.
   *
   * Elles répondent 200, portent du contenu propre, et n'étaient déclarées nulle
   * part. Une page absente d'un plan de site n'est pas invisible — un lien interne
   * suffit à la faire trouver — mais elle est explorée plus tard et moins souvent,
   * et c'est le genre d'omission qui ne se signale jamais : rien ne casse, la page
   * s'affiche, elle attend simplement un robot qui met des mois à venir.
   *
   * `/tableau-de-bord`, `/parametres`, `/connexion` et `/inscription` restent
   * volontairement dehors : ce sont des pages de compte, sans contenu à indexer.
   */
  { path: '/glossaire', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/graphiques', changeFrequency: 'daily', priority: 0.6 },
  { path: '/graphiques/dominance', changeFrequency: 'daily', priority: 0.6 },
  { path: '/graphiques/saison-altcoins', changeFrequency: 'daily', priority: 0.6 },
  { path: '/graphiques/tresoreries', changeFrequency: 'daily', priority: 0.6 },
  { path: '/graphiques/actifs-reels', changeFrequency: 'daily', priority: 0.6 },
  { path: '/graphiques/nft', changeFrequency: 'daily', priority: 0.6 },
  { path: '/nouvelles-cotations', changeFrequency: 'daily', priority: 0.6 },
  { path: '/actualites', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/screener', changeFrequency: 'daily', priority: 0.6 },
  { path: '/macro', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/comparateur', changeFrequency: 'daily', priority: 0.6 },
  { path: '/convertisseur', changeFrequency: 'daily', priority: 0.6 },
  { path: '/heatmap', changeFrequency: 'daily', priority: 0.6 },
  { path: '/sentiment', changeFrequency: 'daily', priority: 0.6 },
  { path: '/aide', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/pourquoi-zenkuu', changeFrequency: 'monthly', priority: 0.6 },
  // Priorité haute pour une page qui ne bouge presque jamais : « tarif » est la
  // requête d'un lecteur déjà décidé, et c'est la seule page du site dont la visite
  // se convertit directement.
  { path: '/bien-demarrer', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/a-propos', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/nouveautes', changeFrequency: 'weekly', priority: 0.4 },
]

/** Classes d'actifs dont l'univers est une liste statique — aucun appel réseau. */
const YAHOO_ROUTES: { assetClass: keyof typeof YAHOO_UNIVERSE; segment: string }[] = [
  { assetClass: 'stock', segment: 'actions' },
  { assetClass: 'etf', segment: 'etf' },
  { assetClass: 'index', segment: 'indices' },
  { assetClass: 'commodity', segment: 'matieres-premieres' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: { languages: languageAlternates(route.path) },
  }))

  /*
   * ── LES FICHES DE PLACE ENTRENT AU PLAN, LES DEUX FAMILLES ENSEMBLE ───────
   *
   * Les deux listes sont DÉJÀ en cache pour `/places` et `/perpetuels` : ce plan ne
   * coûte donc aucun appel supplémentaire en régime normal, et il retombe simplement
   * sur zéro entrée si la source est en panne au moment de la génération.
   *
   * Une place absente du plan reste atteignable — le plan de site ne conditionne pas
   * l'exploration, il la guide. Mieux vaut un plan incomplet un jour de panne qu'une
   * génération qui échoue.
   */
  const [spotPlaces, derivativePlaces] = await Promise.all([
    getSpotExchanges(100),
    getDerivativeExchanges(100),
  ])

  for (const place of [
    ...(spotPlaces.ok ? spotPlaces.data : []),
    ...(derivativePlaces.ok ? derivativePlaces.data : []),
  ]) {
    entries.push({
      url: absoluteUrl(`/places/${place.id}`),
      lastModified: now,
      /* Quotidien : le profil d'une place — pays, année, note — bouge très lentement,
         et c'est lui que la page revendique. Ses paires changent à la minute, mais un
         robot n'a pas à repasser toutes les heures pour elles. */
      changeFrequency: 'daily',
      priority: 0.5,
    })
  }

  for (const article of HELP_ARTICLES) {
    entries.push({
      url: absoluteUrl(`/aide/${article.slug}`),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    })
  }


  // Articles du blog. La boucle ne produit rien tant qu'aucun n'est publié, et se
  // remplit d'elle-même à la première parution : `lastModified` reprend la date de
  // révision réelle plutôt que l'heure de génération, sans quoi chaque
  // reconstruction du site annoncerait à tort que tous les articles ont changé.

  for (const { assetClass, segment } of YAHOO_ROUTES) {
    for (const entry of YAHOO_UNIVERSE[assetClass]) {
      entries.push({
        url: absoluteUrl(`/${segment}/${toSlug(entry.symbol)}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }
  }

  // Seule famille qui coûte un appel. Le classement est déjà en cache pour les pages
  // du site : à froid il consomme une requête, à chaud aucune.
  const ranking = await getCryptoRanking({ perPage: CRYPTO_LIMIT })

  if (ranking.ok) {
    for (const asset of ranking.data) {
      entries.push({
        url: absoluteUrl(`/crypto/${asset.id}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }
  }

  return entries
}
