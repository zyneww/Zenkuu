import type { Metadata } from 'next'

import { getMoversUniverse, getNews, getRanking, type AssetClass, type MarketAsset, type NewsItem } from '@zenkuu/data'
import { listNewsBetween } from '@zenkuu/db'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { NewsFeed } from '@/components/news/NewsFeed'
import { citedAssets } from '@/components/news/mentions'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getContent, getPhrase } from '@/lib/content'

// Les actualités se renouvellent plus vite que les cours : régénération à 3 minutes,
// alignée sur le TTL propre au fil (`NEWS_TTL_SECONDS`).
export const revalidate = 180

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  title: fr.pages.news,
  description: fr.news.subtitle,
  alternates: { canonical: '/actualites' },
  }
}

/**
 * Fil d'actualités.
 *
 * Refonte : la page servait une liste plate de liens, tous de même poids, et ne
 * couvrait que la crypto alors que le site suit six classes d'actifs. Elle suit
 * désormais l'organisation d'un hub d'actualités — un article en tête, des filtres
 * de rubrique, puis une grille de cartes.
 *
 * Les rubriques sont RÉELLES : elles proviennent du périmètre éditorial de chaque
 * flux, pas d'une devinette sur le titre de l'article. Deux flux non-crypto ont été
 * ajoutés pour que ces filtres aient un sens.
 */
/** Lecture défensive du paramètre de date : il est saisissable à la main dans l'URL. */
function readDate(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null

  // Une date à venir n'a pas d'articles et ne peut pas en avoir : on retombe sur le
  // direct plutôt que d'afficher un jour vide inexplicable.
  return parsed > new Date() ? null : value
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const fr = await getContent()
  const t = await getPhrase()
  const requestedDate = readDate((await searchParams)['date'])

  /*
   * DEUX SOURCES, selon la date demandée.
   *
   * Aujourd'hui vient des flux en DIRECT : c'est plus frais que l'archive, dont la
   * dernière collecte peut remonter à une heure. Toute date antérieure vient de la
   * BASE, car les flux ne portent plus ces articles — c'est précisément la raison
   * d'être de l'archive.
   */
  const archive = requestedDate ? await readArchivedDay(requestedDate) : null

  /*
   * 72 et non 36, relevé EN MÊME TEMPS que la liste des flux passait de 4 à 29.
   *
   * La fusion se fait tour à tour — un article de chaque flux, puis le deuxième de
   * chacun (voir `fetchNews`). À 36, le lot s'arrêtait donc au premier tour et demi :
   * une bonne moitié des sources n'apparaissait jamais, et les filtres par source ne
   * proposaient qu'elles. 72 garantit près de trois tours complets, donc toutes les
   * sources représentées et des filtres qui portent sur un fil réel.
   */
  /*
   * L'UNIVERS EST CHARGÉ EN PARALLÈLE, POUR LES PASTILLES D'ACTIF.
   *
   * Chaque article porte la variation des actifs qu'il cite — c'est le meilleur trait
   * de la référence : un titre dit ce qui s'est passé, la pastille dit si le marché y
   * a réagi. Sans elle, la réponse est à deux clics et personne ne la cherche.
   *
   * ZÉRO APPEL SUPPLÉMENTAIRE : `getMoversUniverse(250)` est déjà chargé pour
   * l'accueil, le convertisseur, les mouvements et les cotations récentes. Il est ici
   * la cinquième lecture de la même entrée de cache.
   */
  /*
   * ── LES QUATRE CLASSES NON CRYPTO REJOIGNENT LES COTATIONS ────────────────
   *
   * Elles manquaient, et cela rendait INERTE la moitié de la table des mentions :
   * « NVIDIA », « S&P 500 » ou « Or » sont détectés dans les titres depuis toujours,
   * mais la pastille ne s'affiche QUE si une variation est connue pour l'identifiant.
   * Aucune ne l'était hors crypto — les entrées correspondantes n'ont donc jamais
   * produit une seule pastille, et le défaut d'identifiant qu'elles portaient (voir
   * `mentions.ts`) n'avait jamais eu l'occasion de se voir.
   *
   * Le coût est faible et partagé : ce sont les MÊMES clés de cache que les onglets
   * de `/marches`, et les quatre lectures partent en parallèle du fil d'actualités.
   */
  const QUOTED_CLASSES: AssetClass[] = ['stock', 'etf', 'index', 'commodity']

  const [news, universe, ...others] = await Promise.all([
    requestedDate ? Promise.resolve(null) : getNews(72),
    getMoversUniverse(250, 'eur'),
    ...QUOTED_CLASSES.map((assetClass) =>
      getRanking({ assetClass, page: 1, perPage: 25, currency: 'eur' }),
    ),
  ])

  /*
   * Table `identifiant → variation 24 h`, réduite aux actifs que les pastilles savent
   * nommer. La construire ici plutôt que de passer l'univers entier au composant
   * client évite d'expédier 250 objets complets dans le paquet de la page pour en lire
   * une poignée de nombres.
   */
  const quotes: Record<string, number> = {}
  /*
   * ── L'IDENTITÉ VISUELLE VOYAGE AVEC LA VARIATION ────────────────────────
   *
   * La colonne des plus cités alignait des noms nus. Or ces lignes mélangent quatre
   * classes d'actifs — Bitcoin, l'Or, Microsoft, le Nasdaq — et rien ne disait
   * laquelle : « Or » et « XRP » se lisent pareil en texte, alors qu'une pastille et
   * un pictogramme les séparent d'un coup d'œil.
   *
   * `AssetLogo` sait dessiner les six classes à partir de quatre champs. On ne retient
   * donc QUE ces quatre-là, comme pour `quotes` : expédier 250 actifs complets dans
   * le paquet de la page pour en lire un symbole serait le prix d'une commodité.
   */
  const icons: Record<string, IconSeed> = {}

  const remember = (asset: MarketAsset) => {
    if (asset.change24h !== undefined) quotes[asset.id] = asset.change24h
    icons[asset.id] = {
      symbol: asset.symbol,
      ...(asset.image ? { image: asset.image } : {}),
      name: asset.name,
      assetClass: asset.assetClass,
    }
  }

  if (universe.ok) for (const asset of universe.data) remember(asset)
  for (const result of others) {
    if (!result.ok) continue
    for (const asset of result.data) remember(asset)
  }

  const articles = archive ? archive.articles : (news?.ok ? news.data : [])

  return (
    <div className="space-y-8">
      {/* ── L'EN-TÊTE SE RESSERRE ────────────────────────────────────────────
          Le titre passait en `display-xl` au-dessus d'un sous-titre en `text-lg`, soit
          près de deux cents pixels avant le premier article. Sur blog.kraken.com, le
          titre de section tient sur une ligne et la une commence immédiatement : c'est
          une page qu'on vient LIRE, et le premier écran doit porter un article, pas
          une présentation de la rubrique.

          Le sous-titre n'est pas supprimé pour autant — il dit d'où viennent les
          articles, ce qu'aucun titre n'énonce — mais il descend d'un cran et passe à
          droite du titre, sur la même ligne quand la place le permet. */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-border-subtle pb-5">
        <h1 className="display-sm text-ink">{fr.news.title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-ink-muted">{fr.news.subtitle}</p>
      </header>

      {/* Le sélecteur de date a été RETIRÉ de la page. Le paramètre `?date=` reste lu
          et servi depuis l'archive — un lien déjà partagé continue de fonctionner —
          mais il n'occupe plus le haut d'une page qu'on vient lire au présent. */}
      {articles.length > 0 ? (
        <>
          <NewsFeed
            articles={articles}
            quotes={quotes}
            sidebar={<MostCited articles={articles} quotes={quotes} icons={icons} label={t('Les plus cités aujourd’hui')} />}
          />

          <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
            {t(
              'ZENKUU agrège des titres publiés par des éditeurs tiers et renvoie vers leurs articles. Aucun texte intégral n’est republié, et ZENKUU n’est l’auteur d’aucun de ces contenus.',
            )}
          </p>

          {/* La liste complète des quarante-deux éditeurs tenait ici sur six lignes de
              liens gris. Chaque carte porte déjà le nom et le logo de sa source, et le
              lien sortant y mène : répéter la liste en pied de page ajoutait un pavé
              que personne ne lit sous la seule chose qu'on veut y trouver — la suite
              des articles. */}
        </>
      ) : (
        <EmptyState
          title={
            requestedDate ? 'Aucune actualité ce jour-là' : fr.states.unavailableTitle
          }
          /*
           * Un jour d'archive vide N'EST PAS UNE PANNE, et le dire importe : c'est la
           * différence entre « le site est cassé » et « rien n'a été conservé ce
           * jour-là ». Le ton du bloc suit — neutre pour une date sans article,
           * avertissement pour une source qui ne répond pas.
           */
          description={
            requestedDate
              ? 'Aucun article n’a été archivé pour cette date. L’archive ne remonte pas avant la mise en service de la collecte.'
              : news && !news.ok
                ? news.reason
                : null
          }
          source={news?.source?.label ?? null}
          tone={requestedDate ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COLONNE DE TÊTE — LES ACTIFS QUE LE FIL DU JOUR NOMME LE PLUS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * blog.kraken.com pose ici un encadré « New listings now available for trading » :
 * une grille dense de jetons, à côté de l'article de une. La place est juste — c'est
 * le seul endroit de la page où un bloc court peut tenir sans couper le fil — mais le
 * contenu ne nous convient pas : nous ne référençons pas de cotations à ouvrir, et un
 * bloc de nouveautés ferait doublon avec `/nouvelles-cotations`.
 *
 * Ce qui va à cette place est ce qui manque au lecteur d'un fil : de quoi PARLE
 * l'actualité d'aujourd'hui, et comment ces actifs se comportent pendant qu'on la lit.
 *
 * ── C'EST UN DÉCOMPTE, PAS UN CLASSEMENT ÉDITORIAL ─────────────────────────
 *
 * Le nombre affiché est celui des articles du lot dont le TITRE ou l'extrait contient
 * l'une des formes cherchées. C'est vrai par construction, et le lecteur le vérifie
 * d'un coup d'œil en parcourant la page — la même garantie que celle qui autorise le
 * filtre par mention (voir l'en-tête de `mentions.ts`). Ce n'est PAS « les sujets les
 * plus importants du jour », qui serait une appréciation, ni une mesure d'audience,
 * que nous n'avons pas.
 *
 * Aucun appel réseau : le décompte se fait sur les articles déjà chargés, et les
 * variations sur la table déjà construite pour les pastilles.
 */
/** Les quatre champs dont `AssetLogo` a besoin pour dessiner n'importe quelle classe. */
interface IconSeed {
  symbol: string
  image?: string
  name: string
  assetClass: AssetClass
}

function MostCited({
  articles,
  quotes,
  icons,
  label,
}: {
  articles: NewsItem[]
  quotes: Record<string, number>
  icons: Record<string, IconSeed>
  label: string
}) {
  const counts = new Map<string, { label: string; assetId: string; assetClass: AssetClass; count: number }>()

  for (const article of articles) {
    for (const mention of citedAssets(`${article.title} ${article.excerpt ?? ''}`)) {
      /* Seuls les actifs dont on connaît la variation entrent : une ligne sans chiffre
         au milieu de lignes chiffrées ferait chercher un nombre qui n'arrivera pas —
         c'est la règle des pastilles, et elle vaut ici pour la même raison. */
      if (quotes[mention.assetId as string] === undefined) continue

      const existing = counts.get(mention.id)
      if (existing) existing.count += 1
      else
        counts.set(mention.id, {
          label: mention.label,
          assetId: mention.assetId as string,
          assetClass: mention.assetClass ?? 'crypto',
          count: 1,
        })
    }
  }

  /*
   * VINGT ET NON DOUZE.
   *
   * La colonne est haute comme l'article de une — près de six cents pixels — et douze
   * lignes s'arrêtaient bien avant son pied : la rangée se refermait sur un rectangle
   * vide bordé d'un filet, ce qui se lit comme un bloc qui n'a pas chargé. Vingt
   * remplissent la hauteur sans jamais la dépasser, la liste étant bornée par le
   * nombre d'actifs QUE LE LOT CITE RÉELLEMENT — rarement plus d'une quinzaine.
   */
  const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 20)
  if (top.length === 0) return null

  return (
    /*
      ── LA COLONNE VA JUSQU'EN BAS ────────────────────────────────────────────
      La liste s'arrêtait où ses lignes s'arrêtaient, et la rangée — dont la hauteur
      est fixée par l'article de une, près de six cents pixels — se refermait sur un
      rectangle vide bordé d'un filet. Un cadre vide se lit comme un bloc qui n'a pas
      chargé, pas comme une liste finie.

      `flex-1` sur la liste ET sur chaque ligne répartit la hauteur disponible entre
      les entrées réellement citées. Rien n'est inventé pour combler : ce sont les
      mêmes lignes, elles respirent simplement jusqu'au pied de la colonne. Et si le
      lot en citait vingt, `flex-1` ne grandit plus — la liste reprend sa densité.
    */
    <section className="flex h-full flex-col">
      <h2 className="mb-4 text-base font-semibold text-ink">{label}</h2>

      <ul className="flex flex-1 flex-col divide-y divide-border-subtle">
        {top.map((entry) => (
          <li key={entry.assetId} className="flex-1">
            <Link
              href={assetHref(entry.assetClass, entry.assetId)}
              className="group flex h-full items-center justify-between gap-3 py-2.5"
            >
              {/* L'ICÔNE OUVRE LA LIGNE. Ces vingt lignes mélangent cryptoactifs, ETF,
                  actions, indices et matières premières, et le nom seul ne dit pas
                  laquelle : « Or », « XRP » et « DAX » ont la même allure en texte.
                  `AssetLogo` distingue les six classes — pastille de jeton, drapeau,
                  pictogramme, logo d'émetteur — et retombe sur un monogramme quand la
                  source n'a pas d'image, ce qui ne laisse jamais de case vide. */}
              {icons[entry.assetId] ? (
                <AssetLogo asset={icons[entry.assetId] as IconSeed} size={22} />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink group-hover:text-brand-strong">
                  {entry.label}
                </span>
                {/* « cité dans N articles » et non « N mentions » : la première forme
                    dit ce qui a été compté, la seconde laisse imaginer un poids. */}
                <span className="block text-[0.6875rem] text-ink-muted">
                  cité dans {entry.count} article{entry.count > 1 ? 's' : ''}
                </span>
              </span>
              <ChangeBadge value={quotes[entry.assetId] as number} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Articles archivés pour un jour donné.
 *
 * Les bornes sont calculées en heure LOCALE DU SERVEUR et non en UTC. C'est un choix
 * assumé et imparfait : un lecteur à Tokyo qui demande le 10 verra le 10 parisien.
 * L'alternative — déduire son fuseau — exigerait de rendre la page côté client ou de
 * la sortir du cache, pour un décalage de quelques heures sur une frange d'articles.
 */
async function readArchivedDay(iso: string) {
  const from = new Date(`${iso}T00:00:00`)
  const to = new Date(from.getTime() + 86_400_000)

  const rows = await listNewsBetween(from, to, 200)

  return {
    articles: rows.map(
      (row): NewsItem => ({
        id: `archive:${row.id}`,
        title: row.title,
        url: row.url,
        source: row.sourceLabel,
        category: row.category,
        lang: row.lang,
        publishedAt: row.publishedAt.toISOString(),
        ...(row.excerpt ? { excerpt: row.excerpt } : {}),
        ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
        ...(row.author ? { author: row.author } : {}),
      }),
    ),
  }
}

/*
 * `archiveStart` VIVAIT ICI et a disparu avec le calendrier.
 *
 * Elle ne servait qu'à lui : elle distinguait « base absente », « schéma non appliqué »
 * et « archive vide » pour que le sélecteur de date sache quoi annoncer. Sans
 * sélecteur, ces trois états n'ont plus de destinataire — et le paramètre `?date=`,
 * lui, reste servi par `readArchivedDay` ci-dessus.
 */
