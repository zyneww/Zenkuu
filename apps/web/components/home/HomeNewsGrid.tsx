import type { DataResult, NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { ArticleCard } from '@/components/news/NewsFeed'
import { getContent } from '@/lib/content'

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

  /* Quatre articles, soit exactement une rangée pleine. La référence n'en montre pas
     davantage sur son accueil : le reste vit sur la page d'actualités, où le filtrage
     existe. Une deuxième rangée ici allongerait une page déjà longue de cent lignes
     de tableau, sans ajouter de moyen de s'y retrouver. */
  const articles = news.data.slice(0, 4)

  return (
    <section aria-labelledby="accueil-actualites" className="flex flex-col gap-4">
      {/* `display-xl` sur un `h2`, et non `text-2xl` : la référence donne à ce titre
          de section exactement le traitement de ses titres de page — 24 px, graisse
          700, interlettrage normal. `text-2xl` vaut 28 px dans l'échelle ZENKUU, qui
          ne possède pas de cran à 24. Le nom du cran dit « titre de page » ; ce qu'il
          encode est le traitement mesuré, et il est le même ici. */}
      <h2 id="accueil-actualites" className="display-xl text-ink">
        {fr.home.newsTitle}
      </h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {articles.map((article) => (
          <ArticleCard key={article.url} article={article} />
        ))}
      </div>
    </section>
  )
}
