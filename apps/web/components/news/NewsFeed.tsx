'use client'

import { ChevronDown, Search } from 'lucide-react'
import { createContext, useContext, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { NEWS_CATEGORY_LABELS, NEWS_LANG_LABELS, type NewsItem } from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { useLocale } from 'next-intl'

import { formatAbsolute } from '@/components/locale/useRelativeTime'
import { availableMentions, citedAssets, mentions } from '@/components/news/mentions'
import { usePhrase } from '@/components/locale/ContentProvider'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'

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

/**
 * Libellé de rubrique, TRADUIT.
 *
 * `NEWS_CATEGORY_LABELS` vit dans le paquet de données et n'y connaît que le français :
 * c'est une table de quatre libellés éditoriaux, pas un dictionnaire d'interface. Les
 * quatre traversaient donc les douze langues en l'état, et la page anglaise affichait
 * « Presse crypto » sur ses puces, ses pastilles de couverture et ses cartes.
 *
 * La traduction se fait AU RENDU, comme pour toute autre phrase du site, plutôt qu'en
 * versant une table de langues dans le paquet de données — qui sert aussi le serveur,
 * où aucune locale de requête n'est connue.
 */
function useCategoryLabel() {
  const t = usePhrase()
  return (category: string) =>
    t(NEWS_CATEGORY_LABELS[category as keyof typeof NEWS_CATEGORY_LABELS] ?? category)
}

export function NewsFeed({
  articles,
  quotes,
}: {
  articles: NewsItem[]
  /**
   * Colonne de droite de la rangée de tête, à côté de l'article mis en avant.
   *
   * Optionnelle, et son absence n'est pas un cas dégradé : la rangée reprend alors
   * toute la largeur. C'est ce qui permet au même composant de servir `/actualites`,
   * où la colonne porte les actifs les plus cités du jour, et la fiche d'actif, où
   * elle n'aurait rien à porter — on est déjà sur l'actif dont parlent les articles.
   *
   * Un nœud déjà rendu plutôt qu'un drapeau : ce composant est client, la colonne est
   * calculée sur le serveur, et lui faire traverser des données brutes obligerait à
   * expédier dans le paquet ce qui tient en quelques lignes de HTML.
   */
  /**
   * ⚠️ CETTE PROPRIÉTÉ N'EST PLUS RENDUE, ET C'EST DÉLIBÉRÉ.
   *
   * La rangée de une était `[1fr 320px]` : l'article à gauche, cette colonne à droite.
   * La disposition de la référence pose DEUX colonnes égales — image et texte — et une
   * troisième n'y a pas de place. Voir la note de la rangée.
   *
   * Elle reste dans le type parce que `/actualites` la passe toujours : la retirer
   * demanderait de toucher l'appelant pour un gain nul, et la garder documente ce qui
   * a été mis de côté plutôt que de l'effacer sans trace.
   */
  sidebar?: React.ReactNode
  /**
   * Variation sur 24 h des actifs cités, par identifiant de fiche.
   *
   * Absente, les pastilles ne se rendent pas — ce qui est le bon comportement sur la
   * fiche d'actif, où ce composant sert aussi : on est déjà sur l'actif dont parlent
   * les articles, et lui coller sa propre variation sous chaque titre n'apprend rien.
   */
  quotes?: Record<string, number>
}) {
  const t = usePhrase()
  const categoryLabel = useCategoryLabel()
  const [category, setCategory] = useState<string>('all')
  const [source, setSource] = useState<string>('all')
  const [lang, setLang] = useState<string>('all')
  const [mention, setMention] = useState<string>('all')
  const [sort, setSort] = useState<SortId>('recent')
  const [query, setQuery] = useState('')

  /* Le panneau des listes déroulantes, replié par défaut — voir la note de la barre.
     Fermé, la rangée de puces et le champ de recherche sont tout ce qui sépare le
     titre de section du premier article. */
  const [moreOpen, setMoreOpen] = useState(false)

  /*
   * ── « VOIR PLUS » REMPLACE LA BARRE DE PAGINATION ──────────────────────
   *
   * Le pied portait « Affichage de 1 à 24 sur 72 », trois numéros de page et un
   * sélecteur de lignes — le vocabulaire d'un TABLEAU, appliqué à un fil. Les deux ne
   * se lisent pas pareil : on parcourt un tableau en sautant à une page, on parcourt
   * un fil en descendant. Passer à la page 2 d'un fil trillé par date fait en outre
   * PERDRE le fil : on ne sait plus à quel article on s'était arrêté.
   *
   * Un seul bouton qui ALLONGE la liste conserve tout ce qui est déjà lu, garde le
   * coût borné (les vignettes distantes n'arrivent que par lots) et supprime deux
   * réglages qui n'avaient pas de question derrière eux.
   *
   * Vingt-quatre par lot : huit rangées de la grille à trois colonnes. Un multiple du
   * nombre de colonnes évite la dernière rangée boiteuse à une ou deux cartes.
   */
  const STEP = 24
  const [shown, setShown] = useState(STEP)

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

  /*
   * RETOUR EN PAGE 1 QUAND LE FIL CHANGE SOUS LES PIEDS.
   *
   * Six réglages composent ce fil, et chacun peut le raccourcir. Rester en page 7
   * d'un fil qui n'en compte plus deux afficherait un vide sans explication.
   *
   * L'ajustement se fait PENDANT LE RENDU et non dans un effet : un effet peindrait
   * d'abord la page vide, puis la corrigerait — le lecteur verrait le défaut. React
   * documente ce motif, qui relance le rendu avant l'affichage. La signature est une
   * chaîne plutôt qu'un tableau de dépendances parce qu'on la COMPARE, et deux
   * tableaux de même contenu ne sont jamais égaux.
   */
  const signature = `${category}|${source}|${lang}|${mention}|${sort}|${query.trim()}`
  const [lastSignature, setLastSignature] = useState(signature)
  if (signature !== lastSignature) {
    setLastSignature(signature)
    setShown(STEP)
  }

  const slice = ordered.slice(0, shown)
  const remaining = ordered.length - slice.length

  /*
   * L'ÉGARD DE LA MISE EN AVANT REPOSE SUR UNE PROPRIÉTÉ RÉELLE.
   *
   * Cet article EST le plus récent du fil filtré. Le vingt-cinquième ne l'est pas, et
   * lui donner la même place inventerait un classement éditorial que nous ne mesurons
   * pas.
   *
   * La liste ne se REDÉCOUPANT plus en pages, l'article de tête ne change jamais en
   * cours de lecture : la garde « seulement en page 1 » qui tenait ici est devenue
   * sans objet le jour où « Voir plus » a remplacé la barre de pagination.
   */
  const featured = slice[0]
  const rest = slice.slice(1)

  return (
    <QuotesContext.Provider value={quotes ?? {}}>
    <div className="space-y-6">
      {/*
        ══════════════════════════════════════════════════════════════════════
        LA RANGÉE DE TÊTE — L'ARTICLE EN GRAND, PUIS LA COLONNE
        ══════════════════════════════════════════════════════════════════════

        Composition relevée sur blog.kraken.com : l'article mis en avant occupe les
        deux tiers gauches, une colonne étroite tient le tiers droit, et un FILET
        VERTICAL les sépare — pas une gouttière, pas deux cartes. La rangée se referme
        sur un filet horizontal qui court sur toute la largeur, et c'est ce trait qui
        marque le passage de la une à la grille.

        La rangée est AVANT la barre d'outils, alors qu'elle contient le premier
        article. Ce n'est pas un accident de rangement : la barre — compteur, tri,
        recherche — porte sur la GRILLE. La poser au-dessus de l'article en tête
        laisserait croire qu'un tri ou une recherche le change, alors qu'il reste par
        construction le premier résultat.

        Sans `sidebar` et sans article en tête (page 2 et suivantes), toute cette
        rangée disparaît plutôt que de laisser un filet horizontal seul en haut de la
        page — un trait qui ne sépare rien se lit comme un défaut de rendu.
      */}
      {/*
        ══════════════════════════════════════════════════════════════════════════
        LA UNE — SON PROPRE INTITULÉ, PUIS DEUX COLONNES ÉGALES
        ══════════════════════════════════════════════════════════════════════════

        ── CE QUI A CHANGÉ, ET POURQUOI CE N'EST PAS DE L'HABILLAGE ─────────────

        La rangée de tête était `[1fr 320px]` : l'article à gauche, une colonne
        « Les plus cités aujourd'hui » à droite. L'article y était EMPILÉ — couverture
        pleine largeur, puis le texte dessous — parce que la colonne voisine fixait la
        hauteur et qu'une image à côté du texte s'y perdait.

        La référence pose deux colonnes ÉGALES : l'image occupe exactement la moitié,
        le texte l'autre. C'est ce qui donne à la une son échelle — la couverture y est
        deux fois plus large que celles de la grille, et le titre a la place de tenir
        en 24 px sur deux lignes au lieu de se replier en petit.

        ⚠️ LA COLONNE « LES PLUS CITÉS » A DISPARU DE CETTE RANGÉE. Elle ne peut pas y
        rester : deux colonnes égales plus une troisième font trois, et la une cesse
        d'être une une. Ce que cela retire est nommé — le classement des actifs les plus
        mentionnés du jour n'est plus affiché sur cette page. La `sidebar` reste une
        propriété du composant et reste passée par la fiche d'actif, où elle sert.

        L'INTITULÉ est nouveau. Sans lui, le premier article ressemblait à une carte de
        la grille qu'on aurait agrandie sans raison ; nommé, il devient un choix
        éditorial — c'est la même pièce, et le mot change ce qu'elle dit.
      */}
      {featured ? (
        <section className="space-y-4 border-b border-border-subtle pb-8">
          {/* L'intitulé de la une est PLUS PETIT que celui de la grille, et c'est
              l'ordre de la référence : « 🔥 Featured Article » y est une étiquette
              posée sur un article, quand « Discover our Latest Articles » ouvre une
              section entière. L'émoji reste HORS de la phrase traduite — c'est un
              pictogramme, il n'a rien à faire dans une table de traduction. */}
          <h2 className="text-xl font-bold text-ink">🔥 {t('À la une')}</h2>
          <FeaturedArticle article={featured} />
        </section>
      ) : null}

      <h2 className="display-sm text-ink">{t('Découvrir les derniers articles')}</h2>

      {/*
        ══════════════════════════════════════════════════════════════════════════
        UNE SEULE BARRE : LES PUCES À GAUCHE, LA RECHERCHE À DROITE
        ══════════════════════════════════════════════════════════════════════════

        La page portait DEUX barres d'outils sous le titre de section — puces et trois
        listes déroulantes sur la première, compteur, recherche et tri sur la seconde —
        soit quatre-vingts pixels de réglages avant le premier article de la grille.

        La référence n'en pose qu'une : la rangée de puces, et le champ de recherche
        seul à son extrémité droite. C'est la disposition retenue ici.

        LES TROIS LISTES ET LE TRI NE SONT PAS SUPPRIMÉS, ils passent derrière la puce
        « Plus de filtres » — l'équivalent du « More Tags ⌄ » que la référence pose au
        bout de la même rangée. Repliés, ils ne coûtent plus une ligne à qui vient lire ;
        dépliés, ils sont exactement là où on les cherche.

        LE COMPTEUR passe en région vocale seule. Il servait à annoncer aux lecteurs
        d'écran qu'un filtre venait de raccourcir la liste, ce qu'il continue de faire ;
        à l'œil, la grille et le bouton « Voir plus (N restants) » le disent déjà.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/*
          « Familles de presse » et non « Rubriques ».

          Ces puces filtrent sur `source.category`, c'est-à-dire la spécialité de
          l'ÉDITEUR — jamais le sujet de l'article, que rien ici ne déduit (§5, et voir
          `NEWS_CATEGORY_LABELS`). « Rubriques » promettait un classement par sujet, et
          le lecteur en tirait la conclusion naturelle : qu'un article estampillé
          « Presse crypto » parlait de crypto. Un média spécialisé qui reprend une
          dépêche générale suffit à démentir.
        */}
        {categories.length > 1 ? (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t('Familles de presse')}
            /* La mise en garde ci-dessous a quitté la page pour le panneau replié : à
               l'œil elle ajoutait une ligne que la référence n'a pas. Elle reste
               attachée ICI, au survol du groupe de puces, c'est-à-dire à l'endroit
               exact où la méprise se produit. */
            title={t(
              'Ces rubriques désignent la spécialité de l’éditeur, non le sujet de l’article : nous ne déduisons jamais un thème d’un titre.',
            )}
          >
            <FilterChip
              active={category === 'all'}
              onClick={() => setCategory('all')}
              label={t('Tout')}
            />
            {categories.map((entry) => (
              <FilterChip
                key={entry}
                active={category === entry}
                onClick={() => setCategory(entry)}
                label={categoryLabel(entry)}
              />
            ))}

            {/* La puce de dépliage ferme la rangée, comme le « More Tags ⌄ » de la
                référence. Elle n'apparaît que s'il y a quelque chose à déplier : sur un
                lot d'une seule source et d'une seule langue, les trois listes se
                masquent d'elles-mêmes, et le tri — qui reste, lui, toujours utile —
                suffit à ce que le panneau ne s'ouvre jamais sur du vide. */}
            <FilterChip
              active={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
              label={
                <>
                  {t('Plus de filtres')}
                  <ChevronDown
                    aria-hidden="true"
                    className={`ml-1 h-3.5 w-3.5 transition-transform duration-150 ${moreOpen ? 'rotate-180' : ''}`}
                  />
                </>
              }
            />
          </div>
        ) : (
          <span />
        )}

        {/* `InputGroup` de shadcn/ui plutôt qu'un `<input>` habillé à la main : il porte
            la loupe, l'anneau de focus et les états invalide/désactivé de tous les
            champs du site — et il fait du champ et de son icône UNE seule saisie, avec
            un seul anneau autour des deux. */}
        <InputGroup size="sm" className="w-full sm:w-56">
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Rechercher…')}
            aria-label={t('Rechercher dans les actualités')}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Le compteur n'est plus PEINT — il n'a jamais été là pour l'œil, qui a la
          grille et le « Voir plus (N restants) » sous les yeux, mais pour annoncer aux
          lecteurs d'écran qu'un filtre vient de raccourcir la liste. `sr-only` garde
          l'annonce et rend la ligne à la page. */}
      <p className="sr-only" aria-live="polite">
        {ordered.length} article{ordered.length > 1 ? 's' : ''}
      </p>

      {moreOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          {/*
            « Articles mentionnant X » et NON « Actualités X » — la formulation est
            porteuse de sens, pas un détail de rédaction. Ce filtre cherche un mot
            dans un titre : dire « mentionnant » énonce exactement ce qu'il fait, et
            reste vrai. Dire « Actualités Bitcoin » affirmerait que l'article PARLE de
            Bitcoin, ce que la présence d'un mot ne prouve pas — et ce serait de la
            donnée inventée au sens du §5. Voir l'en-tête de `mentions.ts`.
          */}
          {/*
            ── LES TROIS FILTRES PASSENT À `NativeSelect` DE SHADCN/UI ─────────

            C'étaient trois `<select>` nus portant chacun la même ligne de classes
            recopiée — bordure, fond, padding, focus. Trois copies d'un même contrôle
            divergent au premier ajustement, et c'est déjà arrivé : leur focus
            répondait `focus:border-brand` quand tout le reste de la page répond par un
            anneau.

            `NativeSelect` garde le `<select>` NATIF — donc le sélecteur du système en
            mobilité, la navigation au clavier et la recherche par frappe — et n'ajoute
            que l'habillage et le chevron. C'est le bon échange : rien de ce que le
            natif faisait bien n'est réimplementé.
          */}
          {assetOptions.length > 0 ? (
            <NativeSelect
              size="sm"
              className="w-max"
              aria-label={t('Filtrer par actif mentionné')}
              value={mention}
              onChange={(event) => setMention(event.target.value)}
            >
              {([
                { label: t('Tous les sujets'), value: 'all' },
                ...assetOptions.map((option) => ({
                  label: `Mentionnant ${option.label}`,
                  value: option.id,
                })),
              ]).map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : null}

          {langs.length > 1 ? (
            <NativeSelect
              size="sm"
              className="w-max"
              aria-label={t('Filtrer par langue')}
              value={lang}
              onChange={(event) => setLang(event.target.value)}
            >
              {([
                { label: t('Toutes les langues'), value: 'all' },
                ...langs.map((entry) => ({
                  label: t(NEWS_LANG_LABELS[entry as keyof typeof NEWS_LANG_LABELS] ?? entry),
                  value: entry,
                })),
              ]).map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : null}

          {sources.length > 1 ? (
            <NativeSelect
              size="sm"
              className="w-max"
              aria-label={t('Filtrer par source')}
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              {([
                { label: t('Toutes les sources'), value: 'all' },
                ...sources.map((entry) => ({ label: entry, value: entry })),
              ]).map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : null}

          <NativeSelect
            size="sm"
            className="w-max"
            aria-label={t('Trier les actualités')}
            value={sort}
            onChange={(event) => setSort(event.target.value as SortId)}
          >
            {(SORTS.map((entry) => ({ label: t(entry.label), value: entry.id }))).map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          {/*
            LA PHRASE QUI DÉSAMORCE LA MÉPRISE.

            Les puces sont lues comme un classement par sujet — c'est ce qu'annonce
            n'importe quelle barre de filtres d'un site d'actualité. Ici elles portent
            sur la spécialité de l'éditeur, et l'écart entre les deux ne se devine pas :
            il se constate seulement en tombant sur une dépêche générale estampillée
            « Presse crypto », c'est-à-dire trop tard, et au prix de la confiance.

            Elle était écrite en clair sous les puces, où la référence ne pose rien.
            Elle est descendue dans ce panneau — celui des filtres qu'elle qualifie — et
            reste accrochée au survol du groupe de puces lui-même (voir son `title`),
            c'est-à-dire à l'endroit exact où la méprise se produit.
          */}
          <p className="w-full text-xs text-ink-muted">
            {t(
              'Ces rubriques désignent la spécialité de l’éditeur, non le sujet de l’article : nous ne déduisons jamais un thème d’un titre.',
            )}
          </p>
        </div>
      ) : null}

      {ordered.length === 0 ? (
        <EmptyState
          title={t('Aucun article ne correspond')}
          description={t('Essayez un autre terme, une autre rubrique ou une autre source.')}
          compact
        />
      ) : (
        <>
          {rest.length > 0 ? (
            /*
              ══════════════════════════════════════════════════════════════════
              LA GRILLE EST RÉGLÉE PAR DES FILETS, ET NON ESPACÉE PAR UNE GOUTTIÈRE
              ══════════════════════════════════════════════════════════════════

              C'est la seconde chose qu'on relève sur blog.kraken.com : les cartes ne
              flottent pas dans du blanc, elles occupent les cases d'une TRAME. Un
              trait horizontal sous chaque rangée, un trait vertical entre chaque
              colonne, et du remplissage à l'intérieur des cases plutôt qu'entre elles.

              Ce n'est pas qu'une affaire de goût. Des cartes sans cadre séparées par
              une gouttière laissent l'œil hésiter sur ce qui va avec quoi — le titre
              du dessus ou l'image du dessous — dès que les hauteurs diffèrent, ce qui
              est la règle avec des titres de une à trois lignes. La trame répond une
              fois pour toutes.

              ⚠️ LA GRILLE À FILETS A ÉTÉ REMPLACÉE PAR UNE GRILLE À GOUTTIÈRES.

              Chaque case portait son filet bas et son filet droit, le conteneur avalant
              celui de la dernière colonne par un `-mr-px`. Le dessin était propre et
              c'était le bon choix tant que les cartes n'avaient qu'un titre : les
              filets tenaient lieu de séparation là où le blanc ne suffisait pas.

              Les cartes portent désormais un CHAPÔ de cinq lignes. Le blanc suffit —
              une carte de deux cents pixels de haut se délimite toute seule — et les
              filets, eux, se mettaient à couper des blocs de hauteurs très inégales,
              laissant sous les cartes courtes un vide bordé qui se lit comme une case
              manquante.

              `gap-x-4 gap-y-8` : la gouttière verticale est plus large que
              l'horizontale, parce que deux cartes l'une SOUS l'autre se touchent par
              leurs textes, quand deux cartes côte à côte se touchent par leurs images.
            */
            <ul className="grid items-start gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          ) : null}

          {/*
            ── UN SEUL BOUTON, ET IL DIT COMBIEN IL RESTE ────────────────────

            Le fil rendait ses articles d'un bloc : autant de vignettes distantes
            chargées pour une page qu'on parcourt rarement en entier. Le lot borne ce
            coût, et « Voir plus » rend la profondeur atteignable sans redécouper la
            lecture en pages.

            Le RESTE est écrit dans le bouton — « Voir plus (48 restants) » — parce
            qu'un « Voir plus » nu ne dit pas s'il ouvre trois articles ou trois cents,
            et que c'est précisément ce qu'on veut savoir avant de cliquer. Quand il
            n'en reste plus, le bouton disparaît : rien d'autre n'a à l'annoncer, la
            grille s'arrête et le compteur du haut donne déjà le total.
          */}
          {remaining > 0 ? (
            <div className="flex justify-center pt-2">
              {/* `Button` de shadcn/ui, variante `outline` : le même bouton que partout
                  ailleurs sur le site, avec son relief, son anneau de focus et son état
                  pressé. Le décompte reste dans l'étiquette — voir la note du dessus. */}
              <Button
                variant="outline"
                size="default"
                onClick={() => setShown((current) => current + STEP)}
              >
                {t('Voir plus')}
                <span className="tabular ml-1.5 text-ink-muted">
                  ({remaining} {remaining > 1 ? t('restants') : t('restant')})
                </span>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
    </QuotesContext.Provider>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA CARTE N'EST PLUS UN `<a>` — ELLE EN CONTIENT UN QUI S'ÉTEND
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Toute la carte était enveloppée dans un lien vers l'éditeur. C'est ce qui
 * interdisait aux pastilles d'actif d'être cliquables : un lien dans un lien est un
 * HTML invalide, que le navigateur défait à sa façon — lien mort, lien qui capture le
 * clic de l'autre, ou deux liens frères là où le balisage en décrivait un imbriqué.
 *
 * Le montage est inversé. La carte devient un `<article class="relative">`, et c'est
 * le TITRE qui porte le lien sortant, avec un pseudo-élément étendu à toute la carte
 * (`after:absolute after:inset-0`). Le résultat est identique au clic — la carte
 * entière reste une cible — et il est meilleur au clavier comme au lecteur d'écran :
 * le lien s'annonce par son titre, au lieu de lire d'un trait la vignette, la source,
 * la date, le titre, l'extrait et les pastilles.
 *
 * Les pastilles se posent alors AU-DESSUS de ce pseudo-élément (`relative z-10`) : ce
 * sont de vrais liens vers nos fiches, frères du lien sortant et non ses enfants.
 */
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'ARTICLE DE UNE — DEUX COLONNES ÉGALES, IMAGE PUIS TEXTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── TROIS COMPOSITIONS SE SONT SUCCÉDÉ, ET LA TROISIÈME EST CELLE-CI ────────
 *
 * D'abord DEUX COLONNES à largeur fixe — image bornée à 26 rem, texte à droite,
 * l'ensemble centré verticalement. Elle a été abandonnée pour deux raisons réelles :
 * la vignette plafonnait quelle que soit la place disponible, si bien que l'article
 * « mis en avant » avait sur grand écran une image plus petite que celles de la
 * grille ; et centré dans une rangée dont la hauteur venait d'une colonne voisine, le
 * texte flottait au milieu du vide.
 *
 * Puis EMPILÉE — couverture pleine largeur, texte dessous. Elle corrigeait les deux
 * défauts, et en créait un autre : la une occupait toute la hauteur du premier écran
 * pour un seul article, et la grille ne commençait qu'après un défilement.
 *
 * Celle-ci est la composition de la référence : deux colonnes ÉGALES, `1fr 1fr`.
 * L'image prend exactement la moitié — donc deux fois la largeur d'une carte de la
 * grille, ce qui lui rend son rang — et le texte l'autre moitié, aligné en haut.
 *
 * Ce qui rendait la première version fausse a disparu entre-temps : la colonne
 * voisine n'existe plus (voir la note de la rangée), donc plus rien ne fixe la
 * hauteur, et la largeur n'est plus bornée par une valeur en rem mais par une
 * fraction.
 *
 * ── L'ORDRE DU TEXTE EST CELUI DES CARTES ───────────────────────────────────
 *
 * Rubrique, titre, chapô, actifs cités, signature. Le même que `ArticleCard`, et
 * c'est voulu : une une n'est pas un autre objet, c'est la même carte en grand. Seule
 * la taille du titre change — 24 px contre 18 — parce qu'elle a la place.
 */
function FeaturedArticle({ article }: { article: NewsItem }) {
  const categoryLabel = useCategoryLabel()

  return (
    <article className="group relative grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      {/* La une garde TOUJOURS un visuel : une case vide au sommet de la page se lit
          comme une image cassée. `Thumbnail` retombe elle-même sur une tuile portant
          le nom de l'éditeur. */}
      <span className="relative block overflow-hidden rounded-card">
        {article.imageUrl ? (
          <Thumbnail url={article.imageUrl} source={article.source} wide />
        ) : (
          <BrandTile source={article.source} className="block aspect-[16/9]" />
        )}

        <CoverTag article={article} />
      </span>

      <div className="min-w-0 space-y-2.5">
        {article.category ? (
          <span className="block text-xs font-semibold text-ink">
            {categoryLabel(article.category)}
          </span>
        ) : null}

        <h3 className="display-sm text-ink">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
          >
            {article.title}
          </a>
        </h3>

        {article.excerpt ? (
          <p className="text-sm leading-relaxed text-ink-muted">{article.excerpt}</p>
        ) : null}

        <CitedAssetChips article={article} />

        <ArticleByline article={article} />
      </div>
    </article>
  )
}

/**
 * La pastille de rubrique POSÉE SUR LA COUVERTURE, en haut à gauche.
 *
 * ── POURQUOI SUR L'IMAGE, ALORS QU'ELLE EST DÉJÀ SOUS ELLE ──────────────────
 *
 * Elle ne l'est pas : la ligne sous la couverture porte la rubrique de l'ÉDITEUR
 * (« Presse crypto »), celle-ci porte la même information dans le registre de la
 * référence — une étiquette visible sans lire, à l'endroit où l'œil arrive d'abord.
 * Sur une grille de vingt vignettes, c'est elle qui permet d'écarter d'un balayage
 * ce qu'on ne cherche pas.
 *
 * ⚠️ LE FOND EST TRANSLUCIDE ET FLOUTÉ, ET C'EST UNE NÉCESSITÉ, PAS UN EFFET. La
 * pastille se pose sur des couvertures dont on ne sait rien — certaines sont
 * blanches, d'autres noires, d'autres portent un logo clair au coin supérieur gauche.
 * Un aplat opaque trancherait sur les unes et disparaîtrait sur les autres ; le flou
 * garantit un contraste minimal quelle que soit l'image dessous.
 */
function CoverTag({ article }: { article: NewsItem }) {
  const categoryLabel = useCategoryLabel()
  if (!article.category) return null

  return (
    <span className="absolute left-3 top-3 rounded-pill bg-canvas/70 px-2.5 py-1 text-[0.6875rem] font-medium text-ink backdrop-blur-md">
      {categoryLabel(article.category)}
    </span>
  )
}

function ArticleCard({ article }: { article: NewsItem }) {
  const categoryLabel = useCategoryLabel()

  return (
    /*
      La carte n'a PAS DE CADRE ni de fond : la vignette délimite déjà le bloc, et
      l'entourer d'un filet revenait à tracer deux contours l'un dans l'autre. C'est
      aussi la règle de surface unique du design system : une carte se distingue par sa
      structure, pas en se soulevant.
    */
    <article className="group relative flex h-full flex-col gap-3">
      <span className="block overflow-hidden rounded-card">
        {article.imageUrl ? (
          <Thumbnail url={article.imageUrl} source={article.source} />
        ) : (
          <BrandTile source={article.source} className="block aspect-[16/9]" />
        )}
      </span>

      {/*
        ══════════════════════════════════════════════════════════════════════════
        L'ORDRE DE LECTURE A ÉTÉ RETOURNÉ
        ══════════════════════════════════════════════════════════════════════════

        La carte se lisait : signature, titre, actifs cités, puis la famille de presse
        en pastille tout en bas. Deux choses y étaient mal placées.

        LA SIGNATURE OUVRAIT LA CARTE. « Crypto Briefing · 24 août » avant le titre :
        on apprenait QUI publie avant de savoir QUOI. Sur une grille de vingt cartes,
        cela fait vingt noms d'éditeurs à traverser pour trouver un sujet. Elle ferme
        désormais la carte, où elle répond à la question qu'on se pose APRÈS avoir lu
        le titre — « puis-je faire confiance à ça ? ».

        LA FAMILLE DE PRESSE FERMAIT LA CARTE, en bas, détachée de tout. C'est une
        étiquette de CLASSEMENT : sa place est au-dessus du titre, où elle annonce le
        registre avant qu'on ne lise. C'est ce que fait la référence, et c'est aussi ce
        que font les filtres de cette page, qui trient précisément là-dessus.

        ⚠️ LE CHAPÔ EST NOUVEAU, et c'est le vrai apport. `excerpt` existait sur
        `NewsItem` depuis toujours et n'était rendu NULLE PART : la grille montrait des
        titres nus, ce qui oblige à ouvrir un article pour savoir s'il vaut la peine.
        Cinq lignes au plus — `line-clamp-5`, la valeur de la référence — parce qu'un
        résumé de flux RSS n'a pas de longueur garantie et qu'une carte de dix lignes
        casserait l'alignement de la rangée.
      */}
      <div className="flex flex-1 flex-col gap-2">
        {article.category ? (
          <span className="text-xs font-semibold text-ink">
            {categoryLabel(article.category)}
          </span>
        ) : null}

        <h3 className="text-base font-bold leading-snug text-ink">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
          >
            {article.title}
          </a>
        </h3>

        {article.excerpt ? (
          <p className="line-clamp-5 text-sm leading-relaxed text-ink-muted">{article.excerpt}</p>
        ) : null}

        <CitedAssetChips article={article} />

        {/* `mt-auto` : la signature se colle au BAS de la carte, quelle que soit la
            longueur du chapô. Sans lui, les signatures d'une même rangée flottent à
            des hauteurs différentes et la grille perd sa ligne de pied. */}
        <div className="mt-auto pt-1">
          <ArticleByline article={article} />
        </div>
      </div>
    </article>
  )
}

/**
 * Pastilles des actifs cités par l'article, avec leur variation du moment.
 *
 * ── CE QUE ÇA CHANGE POUR LE LECTEUR ───────────────────────────────────
 *
 * Repris de la référence, et c'est son meilleur trait. Un titre d'actualité dit ce
 * qui s'est passé ; il ne dit pas si le marché y a réagi. La pastille met les deux
 * côte à côte : « XRP, Zcash et Bitcoin testent des niveaux clés » suivi de
 * « XRP ▾1,5 % » répond à la question qu'on se pose en lisant le titre, sans quitter
 * la page.
 *
 * Elle ne s'affiche QUE si la variation est connue. Une pastille sans nombre au milieu
 * de pastilles chiffrées ferait chercher un chiffre qui n'arrivera pas.
 */
function CitedAssetChips({ article }: { article: NewsItem }) {
  const quotes = useContext(QuotesContext)
  const cited = citedAssets(`${article.title} ${article.excerpt ?? ''}`)

  const shown = cited.filter((mention) => quotes[mention.assetId!] !== undefined)
  if (shown.length === 0) return null

  return (
    <p className="relative z-10 flex flex-wrap items-center gap-1.5">
      {/*
        DES LIENS VERS NOS FICHES, ENFIN.

        Ils étaient des `<span>`, et l'ancienne note ici l'expliquait par une
        contrainte réelle : la carte entière était un `<a>` vers l'éditeur, et un lien
        dans un lien est un HTML invalide. La contrainte a été LEVÉE plutôt que
        contournée — la carte n'enveloppe plus rien, c'est son titre qui porte le lien
        sortant et l'étend par un pseudo-élément (voir `ArticleCard`). Les pastilles
        sont donc des FRÈRES de ce lien, posés au-dessus de lui par `z-10`.

        Ce que la pastille dit ne change pas : de quoi parle cet article, et comment
        cet actif se comporte pendant qu'on le lit. Ce qui change est qu'on peut
        désormais y aller — et c'est le geste qu'on a en lisant le chiffre.

        `stopPropagation` est INUTILE ici et n'y est pas : les deux liens sont frères,
        un clic sur la pastille ne traverse jamais celui du titre.
      */}
      {shown.slice(0, 3).map((mention) => (
        <Link
          key={mention.id}
          href={assetHref(mention.assetClass ?? 'crypto', mention.assetId as string)}
          className="inline-flex items-center gap-1.5 rounded-control bg-surface-muted px-1.5 py-0.5 text-micro transition-colors duration-150 hover:bg-brand-soft"
        >
          <span className="font-medium text-ink">{mention.label}</span>
          <ChangeBadge value={quotes[mention.assetId!]} size="sm" />
        </Link>
      ))}

      {/* Le compte des cités NON MONTRÉS, et non le compte total : trois pastilles plus
          « 3 de plus » ferait croire à six actifs quand il y en a trois de plus. */}
      {shown.length > 3 ? (
        <span className="text-micro text-ink-muted">+{shown.length - 3}</span>
      ) : null}
    </p>
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
  const locale = useLocale()

  return (
    <p className="flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
      <SourceDot source={article.source} url={article.url} />
      <span className="truncate font-medium text-ink">{article.author ?? article.source}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={article.publishedAt} className="shrink-0">
        {formatAbsolute(article.publishedAt, locale)}
      </time>
    </p>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA PASTILLE DE SOURCE — LE LOGO DU MÉDIA, ET L'INITIALE DESSOUS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elle ne portait qu'une lettre sur un fond teinté. La lettre distingue mal — « C »
 * désigne CoinDesk, Cointelegraph, CryptoSlate, CryptoPotato, Crypto Briefing,
 * Challenges et Cointribune, soit sept des quarante-deux flux — et surtout, un lecteur
 * reconnaît un logo de presse bien plus vite qu'il ne déchiffre une initiale.
 *
 * ── LE DOMAINE VIENT DE L'ARTICLE, PAS D'UNE TABLE ─────────────────────────
 *
 * `article.url` pointe chez l'éditeur : son nom d'hôte EST son domaine. Aucune table
 * de correspondance à tenir, donc aucune ligne à oublier quand un flux s'ajoute — et
 * la règle vaut aussi pour les articles rejoués depuis l'archive, dont la source n'est
 * plus dans la liste des flux actifs.
 *
 * ── L'INITIALE EST DESSOUS, ET C'EST CE QUI REND LE MONTAGE SÛR ────────────
 *
 * Le logo est superposé À une pastille déjà complète, et non affiché à sa place. Ce
 * détail répond à un défaut mesuré ailleurs dans ce dépôt (voir `AssetLogo`) : quand
 * une vingtaine de vignettes distantes partent en même temps, celles qui restent EN
 * ATTENTE ne déclenchent jamais `onError` — un repli conditionnel laisse donc des
 * cases vides, pas des lettres. Empilé, le repli est déjà peint : l'image le recouvre
 * si elle arrive, et rien ne manque si elle n'arrive pas.
 *
 * `loading="lazy"` borne le nombre de requêtes réellement émises au premier écran, et
 * `referrerPolicy="no-referrer"` évite d'annoncer au service quelle page est consultée.
 */
export function SourceDot({ source, url }: { source: string; url?: string }) {
  const [failed, setFailed] = useState(false)
  const domain = url ? publisherDomain(url) : null

  let sum = 0
  for (let index = 0; index < source.length; index += 1) sum += source.charCodeAt(index)
  const tint = TILE_TINTS[sum % TILE_TINTS.length]

  return (
    <span
      aria-hidden="true"
      title={source}
      className={`relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.5rem] font-bold ${tint}`}
    >
      {source.slice(0, 1).toUpperCase()}

      {domain && !failed ? (
        /* eslint-disable-next-line @next/next/no-img-element -- favicon distante, domaine variable */
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          /* `bg-surface` sous l'image : la plupart des favicons sont dessinées pour un
             fond blanc et beaucoup sont transparentes. Sans plaque, la lettre teintée
             transparaîtrait à travers et les deux repères se superposeraient. */
          className="absolute inset-0 h-full w-full rounded-full bg-surface object-contain"
        />
      ) : null}
    </span>
  )
}

/**
 * Nom d'hôte de l'éditeur, sans `www.`.
 *
 * `try` obligatoire : `article.url` vient d'un flux RSS, donc d'une source qu'on ne
 * contrôle pas. Une URL relative ou tronquée ferait lever `new URL` au milieu du
 * rendu d'une liste, ce qui emporterait la page entière pour une favicon.
 */
function publisherDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
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
export function Thumbnail({
  url,
  source,
  tall = false,
  wide = false,
}: {
  url: string
  source: string
  /** Format de la colonne latérale — un peu plus haut que large de rapport. */
  tall?: boolean
  /**
   * Format de l'article de tête, DEUX FOIS plus large que haut.
   *
   * Il ne s'agit pas d'un goût de cadrage. Le rapport 16/10 de `tall` est juste dans
   * une colonne de 320 px, où il produit une vignette de 200 px. Appliqué à l'article
   * de tête — qui occupe désormais toute la largeur de sa colonne, soit près de mille
   * pixels — il donnait une image de six cents pixels de haut : le titre passait sous
   * la ligne de flottaison, et la page s'ouvrait sur une photographie sans texte.
   *
   * Le rapport RELEVÉ sur la référence est 16/9 — 620 px sur 343 —, et non le 2/1 qui
   * tenait ici : la couverture de la une y a exactement la forme de celles de la
   * grille, en deux fois plus large. C'est aussi le rapport de la tuile de repli
   * (`BrandTile`), qui divergeait donc silencieusement quand l'image manquait.
   */
  wide?: boolean
}) {
  const [failed, setFailed] = useState(false)

  const shape = `block shrink-0 overflow-hidden ${
    wide ? 'aspect-[16/9] rounded-card' : tall ? 'aspect-[16/10] rounded-card' : 'aspect-[16/9]'
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

/**
 * Variations des actifs cités, fournies par la page.
 *
 * Un CONTEXTE plutôt qu'une prop traversée de main en main : la carte d'article est
 * rendue par trois composants différents (mis en avant, grille, méta), et faire
 * descendre une table de cotations à travers les trois ajouterait un paramètre à
 * chacun pour une donnée dont deux d'entre eux n'ont rien à faire.
 *
 * Vide par défaut : `NewsFeed` sert aussi la fiche d'actif, où les pastilles n'ont pas
 * lieu d'être — on est déjà sur l'actif dont parlent les articles.
 */
const QuotesContext = createContext<Record<string, number>>({})



/**
 * Puce de filtre — `Button` de shadcn/ui, en pastille.
 *
 * La teinte porte l'état : `primary` pour la rubrique active, `secondary` pour les
 * autres. C'est la même paire que sur tous les groupes de choix du site, et elle
 * remplace deux jeux de classes écrits à la main qui ne se ressemblaient qu'à peu
 * près d'un composant à l'autre.
 *
 * `rounded-full` en surcharge : le bouton arrive en `rounded-lg`, et la forme
 * pastille est ce qui distingue un FILTRE d'une action — on peut en cocher un
 * parmi plusieurs, là où un bouton déclenche.
 */
/**
 * Pastille de filtre — TEINTÉE quand elle est active, jamais pleine.
 *
 * ── POURQUOI L'APLAT PLEIN A ÉTÉ ABANDONNÉ ──────────────────────────────────
 *
 * La pastille active portait la couleur de marque à pleine saturation, texte sombre
 * dessus. Sur une rangée de cinq, elle devenait l'élément le plus lumineux de la
 * page — plus vif que le titre, plus vif que la une — pour dire une chose secondaire :
 * quel filtre est en cours.
 *
 * La référence teinte au lieu de remplir : fond à 10 % de l'accent, texte à l'accent
 * plein. La pastille se distingue nettement de ses voisines sans monter au premier
 * plan, ce qui est exactement son rang dans la page.
 *
 * `h-8` et `px-3` : les mesures relevées chez elle. `rounded-pill` parce qu'une
 * étiquette de filtre est une forme close — voir la doctrine des deux familles de
 * rayons dans `globals.css`.
 */
function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  /* `ReactNode` et non `string` : la puce de dépliage porte un chevron à côté de son
     texte, et c'est le seul écart. */
  label: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 shrink-0 items-center rounded-pill px-3 text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-brand-soft text-brand-strong'
          : 'bg-surface text-ink-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
