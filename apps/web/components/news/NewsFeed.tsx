'use client'

import { ArrowUpRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { NEWS_CATEGORY_LABELS, NEWS_LANG_LABELS, type NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { formatAbsolute, useRelativeTime } from '@/components/locale/useRelativeTime'
import { availableMentions, mentions } from '@/components/news/mentions'

/**
 * Fil d'actualités : rubriques, sources, recherche, vignettes.
 *
 * ── DEUX REGISTRES, ET UN SEUL POINT DE BASCULE ───────────────────────────────
 *
 * Un article EN TÊTE, très large, puis une grille uniforme. Rien entre les deux.
 *
 * La version précédente dégradait en trois temps — tête, grille de six, puis liste
 * compacte sans vignette — en se réclamant de la hiérarchie. C'était une hiérarchie
 * INVENTÉE : le fil arrive trié par date, et rien ne dit que le septième article
 * mérite moins qu'un autre. Trois traitements pour une seule information, la
 * fraîcheur, faisaient surtout croire à un classement éditorial inexistant.
 *
 * Le premier article, lui, garde son égard : il EST le plus récent, et c'est une
 * propriété réelle. Un seul cran de mise en avant l'exprime sans mentir.
 *
 * VIGNETTES : hébergées par l'éditeur, jamais recopiées. Elles proviennent des
 * balises `media:content` et `enclosure` que les flux publient PRÉCISÉMENT pour être
 * reprises par les agrégateurs — c'est la fonction de ces balises. Deux précautions
 * accompagnent l'affichage : `referrerPolicy="no-referrer"`, qui empêche l'éditeur
 * de savoir depuis quelle page l'image est chargée, et `loading="lazy"`, qui évite
 * de déclencher trente requêtes tierces au premier rendu.
 *
 * Aucun texte intégral n'est repris : titre, extrait fourni par le flux, source et
 * date, avec lien sortant. La syndication autorise l'annonce, pas la reprise.
 */

/**
 * Ordres de tri proposés.
 *
 * Trois seulement, et chacun répond à une question qu'on se pose réellement devant
 * un fil : quoi de neuf, qu'ai-je manqué, où est cet article dont je me souviens du
 * titre. Un tri « par pertinence » a été écarté : nous ne mesurons pas l'audience
 * des articles (voir la note de la page), et l'inventer serait afficher un
 * classement sans donnée derrière.
 */
const SORTS = [
  { id: 'recent', label: 'Plus récents' },
  { id: 'oldest', label: 'Plus anciens' },
  { id: 'title', label: 'Titre (A→Z)' },
] as const

type SortId = (typeof SORTS)[number]['id']

export function NewsFeed({ articles }: { articles: NewsItem[] }) {
  const [category, setCategory] = useState<string>('all')
  const [source, setSource] = useState<string>('all')
  const [lang, setLang] = useState<string>('all')
  const [mention, setMention] = useState<string>('all')
  const [sort, setSort] = useState<SortId>('recent')
  const [query, setQuery] = useState('')

  // Seules les rubriques et sources réellement présentes dans le lot sont
  // proposées : un filtre qui ne renverrait jamais rien vaut moins qu'un filtre absent.
  const categories = useMemo(
    () => [
      ...new Set(
        articles
          .map((article) => article.category)
          .filter((value): value is string => Boolean(value)),
      ),
    ],
    [articles],
  )

  const sources = useMemo(
    () => [...new Set(articles.map((article) => article.source))].sort(),
    [articles],
  )

  const langs = useMemo(
    () => [
      ...new Set(
        articles.map((article) => article.lang).filter((value): value is string => Boolean(value)),
      ),
    ],
    [articles],
  )

  /* Même règle que pour les rubriques : seuls les actifs réellement cités par au
     moins un article du lot sont proposés. Voir `mentions.ts`. */
  const assetOptions = useMemo(
    () => availableMentions(articles.map((article) => `${article.title} ${article.excerpt ?? ''}`)),
    [articles],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const selectedMention = assetOptions.find((option) => option.id === mention)

    return articles.filter((article) => {
      if (category !== 'all' && article.category !== category) return false
      if (source !== 'all' && article.source !== source) return false
      if (lang !== 'all' && article.lang !== lang) return false

      if (selectedMention) {
        const text = `${article.title} ${article.excerpt ?? ''}`
        if (!mentions(text, selectedMention)) return false
      }

      if (!needle) return true
      return `${article.title} ${article.excerpt ?? ''}`.toLowerCase().includes(needle)
    })
  }, [articles, category, source, lang, mention, assetOptions, query])

  /* Le tri est appliqué APRÈS le filtrage et sur une COPIE : `sort` modifie le
     tableau en place, et trier `visible` renverrait le tableau mémorisé, que React
     considérerait inchangé faute d'identité nouvelle. */
  const ordered = useMemo(() => {
    const copy = [...visible]
    if (sort === 'title') return copy.sort((a, b) => a.title.localeCompare(b.title, 'fr'))

    copy.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
    return sort === 'recent' ? copy.reverse() : copy
  }, [visible, sort])

  const [featured, ...rest] = ordered

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {categories.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rubriques">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="Tout" />
            {categories.map((entry) => (
              <FilterChip
                key={entry}
                active={category === entry}
                onClick={() => setCategory(entry)}
                label={NEWS_CATEGORY_LABELS[entry as keyof typeof NEWS_CATEGORY_LABELS] ?? entry}
              />
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/*
            « Articles mentionnant X » et NON « Actualités X » — la formulation est
            porteuse de sens, pas un détail de rédaction. Ce filtre cherche un mot
            dans un titre : dire « mentionnant » énonce exactement ce qu'il fait, et
            reste vrai. Dire « Actualités Bitcoin » affirmerait que l'article PARLE de
            Bitcoin, ce que la présence d'un mot ne prouve pas — et ce serait de la
            donnée inventée au sens du §5. Voir l'en-tête de `mentions.ts`.
          */}
          {assetOptions.length > 0 ? (
            <>
              <label htmlFor="filtre-actif" className="sr-only">
                Filtrer par actif mentionné
              </label>
              <select
                id="filtre-actif"
                value={mention}
                onChange={(event) => setMention(event.target.value)}
                className="rounded-card border border-border-subtle bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="all">Tous les sujets</option>
                {assetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    Mentionnant {option.label}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {langs.length > 1 ? (
            <>
              <label htmlFor="filtre-langue" className="sr-only">
                Filtrer par langue
              </label>
              <select
                id="filtre-langue"
                value={lang}
                onChange={(event) => setLang(event.target.value)}
                className="rounded-card border border-border-subtle bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="all">Toutes les langues</option>
                {langs.map((entry) => (
                  <option key={entry} value={entry}>
                    {NEWS_LANG_LABELS[entry as keyof typeof NEWS_LANG_LABELS] ?? entry}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {sources.length > 1 ? (
            <>
              <label htmlFor="filtre-source" className="sr-only">
                Filtrer par source
              </label>
              <select
                id="filtre-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="rounded-card border border-border-subtle bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="all">Toutes les sources</option>
                {sources.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </>
          ) : null}

        </div>
      </div>

      {/*
        L'ARTICLE EN TÊTE EST HORS DE LA BARRE D'OUTILS, et au-dessus d'elle.

        C'est la disposition de la référence, et elle se justifie : la barre —
        compteur, tri, recherche — porte sur la GRILLE. La placer avant l'article
        mis en avant laisserait croire qu'un tri ou une recherche le change, alors
        qu'il reste par construction le premier résultat.
      */}
      {featured ? <FeaturedArticle article={featured} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-5">
        {/* Le compteur passe en titre de section : c'est l'information qui répond à
            « combien y en a-t-il ? », et la reléguer en petite ligne grise sous les
            filtres la faisait manquer. */}
        <p className="text-base font-semibold text-ink" aria-live="polite">
          {ordered.length} article{ordered.length > 1 ? 's' : ''}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher dans les actualités"
              className="w-full rounded-card border border-border-subtle bg-surface py-2 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </div>

          <label htmlFor="tri-actualites" className="sr-only">
            Trier les actualités
          </label>
          <select
            id="tri-actualites"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortId)}
            className="rounded-card border border-border-subtle bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
          >
            {SORTS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!featured ? (
        <EmptyState
          title="Aucun article ne correspond"
          description="Essayez un autre terme, une autre rubrique ou une autre source."
          compact
        />
      ) : rest.length > 0 ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <li key={article.id}>
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function FeaturedArticle({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group grid gap-6 sm:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] sm:items-center"
    >
      {/* L'article en tête garde toujours un visuel : sur deux colonnes, une case
          vide déséquilibrerait la carte entière. */}
      <span className="block overflow-hidden rounded-card">
        {article.imageUrl ? (
          <Thumbnail url={article.imageUrl} source={article.source} tall />
        ) : (
          <BrandTile source={article.source} className="block aspect-[16/10]" />
        )}
      </span>

      <div className="min-w-0 space-y-2.5">
        <ArticleMeta article={article} />
        <h2 className="display-sm text-ink group-hover:text-brand-strong">{article.title}</h2>
        {article.excerpt ? (
          <p className="text-sm leading-relaxed text-ink-muted">{article.excerpt}</p>
        ) : null}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
          Lire chez {article.source}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(nouvelle fenêtre)</span>
        </span>
      </div>
    </a>
  )
}

function ArticleCard({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex h-full flex-col gap-3"
    >
      {/*
        La carte n'a PLUS DE CADRE ni de fond : la vignette délimite déjà le bloc, et
        l'entourer d'un filet revenait à tracer deux contours l'un dans l'autre. C'est
        ce que fait la référence, et c'est aussi la règle de surface unique du design
        system : une carte se distingue par sa structure, pas en se soulevant.
      */}
      <span className="block overflow-hidden rounded-card">
        {article.imageUrl ? (
          <Thumbnail url={article.imageUrl} source={article.source} />
        ) : (
          <BrandTile source={article.source} className="block aspect-[16/9]" />
        )}
      </span>

      <div className="flex flex-1 flex-col gap-1.5">
        <ArticleByline article={article} />
        <h3 className="text-sm font-semibold leading-snug text-ink group-hover:text-brand-strong">
          {article.title}
        </h3>
        {article.category ? (
          <span className="mt-0.5 self-start rounded bg-brand-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-brand-strong">
            {NEWS_CATEGORY_LABELS[article.category as keyof typeof NEWS_CATEGORY_LABELS] ??
              article.category}
          </span>
        ) : null}
      </div>
    </a>
  )
}

/**
 * Signature d'une carte : pastille de source, nom, date.
 *
 * La référence affiche ici un AVATAR d'auteur. Nous n'en avons pas — un flux RSS
 * donne un nom, jamais un portrait — et en fabriquer un serait inventer une identité
 * visuelle à la place de l'éditeur. La pastille porte donc l'initiale de la SOURCE,
 * qui est une information que nous avons réellement, et reprend la teinte stable que
 * `BrandTile` dérive déjà du même nom : un même média garde la même couleur partout
 * sur la page.
 *
 * La date est ABSOLUE ici, là où l'article en tête la donne en relatif. Ce n'est pas
 * une incohérence : la tête répond à « est-ce frais ? », la grille à « de quand est-ce
 * que ça date ? » quand on la parcourt triée par titre ou à l'envers.
 */
function ArticleByline({ article }: { article: NewsItem }) {
  return (
    <p className="flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
      <SourceDot source={article.source} />
      <span className="truncate font-medium text-ink">{article.author ?? article.source}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={article.publishedAt} className="shrink-0">
        {formatAbsolute(article.publishedAt)}
      </time>
    </p>
  )
}

function SourceDot({ source }: { source: string }) {
  let sum = 0
  for (let index = 0; index < source.length; index += 1) sum += source.charCodeAt(index)
  const tint = TILE_TINTS[sum % TILE_TINTS.length]

  return (
    <span
      aria-hidden="true"
      title={source}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.5rem] font-bold ${tint}`}
    >
      {source.slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * Vignette d'article, avec repli sur une pastille de marque.
 *
 * `<img>` natif et non `next/image` : l'optimiseur exigerait de déclarer chaque
 * domaine d'éditeur dans la configuration, et la liste changerait à chaque flux
 * ajouté. Le rapport 16/9 est imposé par le conteneur pour que la grille reste
 * alignée quelles que soient les dimensions d'origine.
 *
 * ── POURQUOI UN REPLI, ALORS QUE L'URL VIENT D'ÊTRE VÉRIFIÉE ──────────────────
 *
 * Parce qu'elle ne l'a pas été. Trois des vingt-neuf éditeurs répondent 403 à un
 * agrégateur — mesuré sur The Block et Seeking Alpha — et leurs images se comportent
 * de même. D'autres expirent leurs URL, ou les servent derrière un référent
 * obligatoire que `no-referrer` supprime précisément.
 *
 * Sans ce repli, ces cartes afficheraient l'icône d'image brisée du navigateur, qui
 * se lit comme une panne de notre site. La pastille, elle, montre le nom du média :
 * elle informe au lieu de signaler une erreur.
 *
 * ── DEUX CAUSES D'ÉCHEC ONT ÉTÉ SUPPRIMÉES À LA SOURCE ────────────────────────
 *
 * Le repli restait juste, mais il se déclenchait bien plus souvent que nécessaire —
 * et comme il est élégant, personne ne voyait qu'il masquait deux défauts évitables.
 *
 * 1. LE RÉFÉRENT VIDE. La vignette partait en `no-referrer`, et l'en-tête de ce
 *    fichier le reconnaissait déjà à demi-mot : certains éditeurs servent leurs
 *    images derrière un référent obligatoire. Les protections anti-hotlink les plus
 *    répandues ne comparent pas le domaine, elles refusent simplement les requêtes
 *    SANS référent — celles qui ressemblent à un aspirateur. On envoie donc
 *    `origin` : le domaine du site, et rien d'autre. Aucun chemin ne fuite, donc
 *    aucune information sur l'article consulté, et le contrôle est satisfait.
 *
 * 2. LE CONTENU MIXTE. Plusieurs flux RSS publient encore des vignettes en `http://`.
 *    Sur une page servie en HTTPS, le navigateur les bloque AVANT toute requête :
 *    l'échec est silencieux, il n'apparaît qu'en console, et il est indiscernable
 *    d'un 404. `upgradeToHttps` réécrit le protocole — tous les hébergeurs
 *    concernés servent la même ressource en TLS, c'est leur balise RSS qui n'a pas
 *    suivi.
 */
function Thumbnail({
  url,
  source,
  tall = false,
}: {
  url: string
  source: string
  tall?: boolean
}) {
  const [failed, setFailed] = useState(false)

  const shape = `block shrink-0 overflow-hidden ${
    tall ? 'aspect-[16/10] rounded-card' : 'aspect-[16/9]'
  }`

  const safeUrl = upgradeToHttps(url)
  if (failed || !safeUrl) return <BrandTile source={source} className={shape} />

  return (
    <span className={`${shape} bg-surface-muted`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- vignettes distantes, domaines variables */}
      <img
        src={safeUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        referrerPolicy="origin"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
    </span>
  )
}

/**
 * `http://` → `https://`, et rejet de tout ce qui n'est ni l'un ni l'autre.
 *
 * Le rejet compte autant que la réécriture : un flux mal formé peut livrer une URL
 * relative, un `data:` tronqué ou une chaîne vide. Aucune ne produirait d'image, mais
 * toutes déclencheraient une requête — ou pire, un `javascript:` sur un attribut que
 * le navigateur n'exécute pas ici, mais qu'on n'a aucune raison de laisser passer.
 * Renvoyer `null` fait basculer directement sur la pastille de marque, sans
 * l'aller-retour inutile par `onError`.
 */
function upgradeToHttps(url: string): string | null {
  if (url.startsWith('https://')) return url
  if (url.startsWith('http://')) return `https://${url.slice('http://'.length)}`
  // `//exemple.com/image.jpg` — forme héritée, dite « relative au protocole ».
  if (url.startsWith('//')) return `https:${url}`
  return null
}

/**
 * Pastille portant le nom du média, quand aucune image n'est disponible.
 *
 * La teinte dérive du nom par une somme de codes de caractères : elle est donc
 * STABLE — CoinDesk garde la même d'une page à l'autre et d'une session à l'autre —
 * sans qu'aucune couleur n'ait à être attribuée à la main aux vingt-neuf sources.
 *
 * Puisée dans la palette de DONNÉES et non d'interface : ces fonds distinguent des
 * catégories, ils ne signalent ni action ni état. Réserver la palette d'interface à
 * ce qui se clique est ce qui garde le magenta lisible comme couleur du site.
 */
const TILE_TINTS = [
  'bg-data-1/10 text-data-1',
  'bg-data-2/10 text-data-2',
  'bg-data-3/10 text-data-3',
  'bg-data-4/10 text-data-4',
  'bg-data-5/10 text-data-5',
  'bg-data-6/10 text-data-6',
]

function BrandTile({ source, className }: { source: string; className: string }) {
  let sum = 0
  for (let index = 0; index < source.length; index += 1) sum += source.charCodeAt(index)
  const tint = TILE_TINTS[sum % TILE_TINTS.length]

  return (
    <span className={`${className} ${tint} flex items-center justify-center px-3`} aria-hidden="true">
      <span className="truncate text-sm font-semibold tracking-tight">{source}</span>
    </span>
  )
}

function ArticleMeta({ article }: { article: NewsItem }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-ink-muted">
      {article.category ? (
        <span className="font-medium text-brand">
          {NEWS_CATEGORY_LABELS[article.category as keyof typeof NEWS_CATEGORY_LABELS] ??
            article.category}
        </span>
      ) : null}
      <span>{article.source}</span>
      {article.author ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="truncate">{article.author}</span>
        </>
      ) : null}
      <span aria-hidden="true">·</span>
      {/*
        Sur un fil d'actualité, c'est la FRAÎCHEUR qui compte, pas l'horodatage :
        « il y a 2 h » se saisit sans calcul mental, « 14:32 » demande de connaître
        l'heure qu'il est. La date absolue reste dans l'infobulle et dans `dateTime`,
        pour qui veut la précision.

        Le calcul passe par `useRelativeTime`, et le commentaire qui tenait ici
        auparavant était FAUX : il affirmait que ce libellé n'était évalué que dans
        le navigateur « puisque le composant porte 'use client' ». Un composant
        client est pourtant rendu une première fois par le serveur, et le même écart
        d'hydratation que Sentry a relevé sur les places de cotation guettait donc
        ici. Voir l'en-tête du crochet.
      */}
      <time dateTime={article.publishedAt} title={formatAbsolute(article.publishedAt)}>
        <RelativeTime iso={article.publishedAt} />
      </time>
    </p>
  )
}

/** Un composant, et non un appel direct : un crochet ne s'appelle pas en boucle. */
function RelativeTime({ iso }: { iso: string }) {
  return <>{useRelativeTime(iso)}</>
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
