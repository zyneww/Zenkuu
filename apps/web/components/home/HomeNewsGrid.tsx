import type { DataResult, NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { NewsRail } from '@/components/home/NewsRail'
import { ArticleCard } from '@/components/news/NewsFeed'
import { CarouselItem } from '@/components/ui/carousel'
import { Link } from '@/i18n/navigation'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES ACTUALITÉS DE L'ACCUEIL — UNE GRILLE SOUS LE TABLEAU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE BLOC REMPLACE UNE COLONNE LATÉRALE, ET LA MESURE L'A IMPOSÉ ─────────
 *
 * `NewsSidebar` posait les actualités dans une colonne fixe de 340 px à droite du
 * tableau, sur toute la hauteur de la page. Son en-tête affirmait que c'était la
 * structure de la référence — « C'est LA délimitation de la référence, et la seule
 * qu'elle emploie ici : un filet vertical [...] entre le classement et le panneau
 * latéral ».
 *
 * Relevé le 2026-08-30 sur leur accueil, à 2116 px de large : la page ne contient
 * AUCUN `<aside>`, aucune grille à deux colonnes de plus de 900 px, et rien à droite
 * du tableau — qui occupe ses 1270 px de conteneur, bord à bord. Les seuls éléments
 * collants de la page sont `th.gecko-sticky` et `td.gecko-sticky`, la colonne de nom
 * figée DANS le tableau.
 *
 * Leurs actualités sont un bloc pleine largeur SOUS le classement, à 7736 px du haut,
 * après les 6964 px de tableau. La colonne latérale décrivait donc soit une autre
 * page — la fiche d'actif en a une, et `AssetNewsAside` la sert —, soit un état
 * antérieur de leur site.
 *
 * ── LES DIMENSIONS SONT RELEVÉES, PAS CHOISIES ─────────────────────────────
 *
 *   titre        `h2` 24 px, graisse 700
 *   grille       4 colonnes de 302,5 px, gouttière 20 px
 *   carte        303 × 437 px, image en tête
 *
 * `gap-5` vaut les 20 px mesurés. Les colonnes sont déclarées en `repeat(4,...)` à
 * partir de `xl` seulement : à 1270 px de conteneur, quatre colonnes donnent bien
 * 302,5 px, mais sous cette largeur elles tomberaient à 200 px et la carte perdrait
 * son image avant son titre. Deux paliers intermédiaires descendent à 2 puis 1.
 *
 * ── POURQUOI `ArticleCard` ET PAS UNE CARTE DE PLUS ────────────────────────
 *
 * `/actualites` rend déjà cette carte, à ce format, avec sa vignette 16/9, sa
 * signature et ses pastilles d'actifs cités. En écrire une seconde ferait diverger
 * deux grilles d'actualités du même site le jour où l'une gagne un champ. Elle est
 * simplement exportée depuis `NewsFeed`.
 *
 * Ce composant est un composant SERVEUR qui rend un composant client : c'est le sens
 * qui fonctionne. Les articles sont déjà lus côté serveur par la page.
 */
export async function HomeNewsGrid({ news }: { news: DataResult<NewsItem[]> }) {
  const fr = await getContent()
  const t = await getPhrase()

  if (!news.ok || news.data.length === 0) {
    return (
      <EmptyState
        title={fr.states.unavailableTitle}
        description={news.ok ? null : news.reason}
        source={news.source?.label ?? null}
        tone={news.ok ? 'neutral' : 'warning'}
        compact
      />
    )
  }

  /*
   * ── DOUZE ARTICLES, ET NON QUATRE ─────────────────────────────────────────
   *
   * Quatre était le compte d'une RANGÉE pleine, et la note d'alors le justifiait par
   * la longueur de la page : « une deuxième rangée allongerait une page déjà longue de
   * cent lignes de tableau, sans ajouter de moyen de s'y retrouver ».
   *
   * L'argument portait sur la HAUTEUR, et il tombe avec elle : un rail qui défile
   * horizontalement occupe la hauteur d'une seule rangée quel que soit le nombre
   * d'articles. Et le « moyen de s'y retrouver » qui manquait, ce sont précisément les
   * deux flèches et le lien de sortie ajoutés ici.
   *
   * Douze plutôt que le flux entier : au-delà, le rail devient un second site
   * d'actualités, et c'est la page dédiée qui doit prendre le relais.
   */
  const articles = news.data.slice(0, 12)

  return (
    <section aria-labelledby="accueil-actualites" className="flex flex-col gap-4">
      {/* `display-xl` sur un `h2`, et non `text-2xl` : la référence donne à ce titre
          de section exactement le traitement de ses titres de page — 24 px, graisse
          700, interlettrage normal. `text-2xl` vaut 28 px dans l'échelle ZENKUU, qui
          ne possède pas de cran à 24. Le nom du cran dit « titre de page » ; ce qu'il
          encode est le traitement mesuré, et il est le même ici. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="accueil-actualites" className="display-xl text-ink">
          {fr.home.newsTitle}
        </h2>

        {/* LE LIEN DE SORTIE EST DANS L'EN-TÊTE, et non après les cartes. Posé à la fin
            d'un rail qui défile, il ne serait atteignable qu'après avoir poussé douze
            articles — c'est-à-dire au moment précis où l'on n'en a plus besoin. */}
        <Link href="/actualites" className="text-sm font-medium text-ink-muted hover:text-ink">
          {t('Voir toutes les actualités')} ›
        </Link>
      </div>

      {/* `basis-[min(320px,80vw)]` : une largeur POSÉE, et non `basis-auto`. Sans elle,
          embla étire chaque carte à la largeur du rail et n'en montre qu'une — le piège
          déjà documenté dans `CategoryRail`. Le `min()` garde la carte lisible sur un
          téléphone, où 320 px dépasseraient l'écran. */}
      <NewsRail
        label={fr.home.newsTitle}
        previousLabel={t('Actualités précédentes')}
        nextLabel={t('Actualités suivantes')}
      >
        {articles.map((article) => (
          <CarouselItem key={article.url} className="basis-[min(320px,80vw)] pl-5">
            <ArticleCard article={article} />
          </CarouselItem>
        ))}
      </NewsRail>
    </section>
  )
}
