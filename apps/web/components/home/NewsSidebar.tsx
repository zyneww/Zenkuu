import { ArrowUpRight } from 'lucide-react'

import type { DataResult, NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { RelativeTime } from '@/components/home/RelativeTime'
import { SourceDot, Thumbnail } from '@/components/news/NewsFeed'
import { Link } from '@/i18n/navigation'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COLONNE DE DROITE — UN ARTICLE EN GRAND, PUIS LE FIL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elle prend la place que la référence donne à son panneau « Insights » et à sa liste
 * « Latest Market News » : mêmes emplacements, contenu qui nous appartient.
 *
 * ── DEUX BLOCS, ET LE PREMIER PREND TOUT CE QUE L'ARTICLE PORTE ────────────
 *
 *   1. À LA UNE   couverture, source, date, titre, résumé — le dernier article publié
 *   2. LE FIL     les suivants, du plus récent au plus ancien, titre et heure
 *
 * Le découpage suit la donnée : `NewsItem` porte une vignette et un résumé, dont
 * l'affichage coûte de la hauteur. Les donner à UN article le distingue ; les donner
 * aux douze ferait une colonne de dix écrans qu'on ne parcourt pas.
 *
 * ── LES LIENS SORTENT DU SITE, ET LE DISENT ────────────────────────────────
 *
 * Ce fil agrège des éditeurs tiers : chaque titre mène chez eux, en nouvelle fenêtre,
 * avec `rel="noopener noreferrer"`. C'est aussi pourquoi la source est écrite sur
 * chaque ligne plutôt qu'une fois en tête de colonne — un lecteur doit savoir chez qui
 * il part AVANT de cliquer, pas après.
 *
 * ── ELLE NE BOUGE PAS, ET ELLE A SON PROPRE ASCENSEUR ──────────────────────
 *
 * C'est le montage de `AssetNewsAside`, celui des fiches d'actif, repris ici à
 * l'identique — et ce n'est pas une commodité : cette colonne pose exactement le même
 * problème, et il a déjà été résolu là-bas après deux tentatives ratées. En reprendre
 * une troisième forme ferait diverger deux panneaux d'actualités du même site.
 *
 *     sticky top-40  +  hauteur bornée à la fenêtre  +  overflow-y-auto
 *
 * Les trois vont ENSEMBLE. `sticky` seul laissait la colonne s'allonger sous la
 * fenêtre : à côté d'un tableau de cent lignes, on ne pouvait pas atteindre le bas du
 * fil sans dépasser le tableau, et le panneau remontait hors du champ. Borner sa
 * hauteur sans `overflow-y-auto` couperait simplement les derniers articles.
 *
 * `overscroll-contain` est la classe qui rend l'ensemble tenable. Deux surfaces de
 * défilement emboîtées piègent la molette — elle agit sur celle que survole le curseur,
 * si bien qu'en descendant on tombe dans le fil et que la page se fige. Cette propriété
 * empêche le défilement du fil de se PROPAGER à la page une fois en butée, sans le
 * bloquer chez lui. Voir l'en-tête de `AssetNewsAside` pour l'historique complet.
 *
 * ── LE DÉCALAGE SUIT L'EN-TÊTE, ET N'EST PLUS UN NOMBRE ROND ───────────────
 *
 * C'était `top-40`, soit 160 px : l'en-tête (64 px) plus la hauteur de ce que la
 * colonne devait laisser passer quand elle commençait à mi-page. Depuis qu'elle part
 * du HAUT de la page, ces cent pixels de plus sont un trou : le fil se collait cent
 * pixels sous la barre, et le premier article s'alignait sur les cartes de mouvements
 * au lieu du titre.
 *
 * Le décalage se calcule donc sur `--header-height`, qui est la seule chose qu'il ait
 * réellement à dépasser, plus une gouttière. La borne de hauteur lui répond au lieu
 * d'être écrite à part : `100dvh` moins ce même décalage, moins une marge basse. Les
 * deux valeurs ne peuvent plus diverger.
 *
 * `dvh` et non `vh` : sur mobile `100vh` vaut la hauteur BARRES D'OUTILS MASQUÉES,
 * c'est-à-dire plus que ce qu'on voit tant que la barre d'adresse est là. Le collage
 * ne s'applique qu'au-dessus de `lg`, mais une tablette en portrait passe ce seuil.
 *
 * En dessous de `lg`, la colonne passe SOUS le tableau et tout est retiré — collage
 * comme ascenseur imbriqué. Coller un bloc en pleine largeur sur un téléphone
 * masquerait le contenu qu'on fait défiler, et un ascenseur interne y serait le piège
 * à molette décrit plus haut, sans le bénéfice.
 */
export async function NewsSidebar({ news }: { news: DataResult<NewsItem[]> }) {
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

  const [lead, ...rest] = news.data as [NewsItem, ...NewsItem[]]

  return (
    <aside
      aria-label={t('Actualités')}
      /* ── LE FILET QUI SÉPARE LA COLONNE DU TABLEAU ──────────────────────────
         C'est LA délimitation de la référence, et la seule qu'elle emploie ici : un
         filet vertical d'un peu plus d'un pixel, sur toute la hauteur, entre le
         classement et le panneau latéral. Relevé sur leur page à `1.25px`.

         Il remplace les contours des deux blocs qu'il contient (voir `Spotlight`), et
         c'est un échange, pas un ajout : une ligne dit « ceci n'est plus le tableau »
         mieux que deux cartes posées dans le vide, parce qu'elle le dit UNE fois, sur
         toute la hauteur, au lieu de le répéter bloc par bloc.

         `border-l` + `pl-6` et non un `gap` de grille : la gouttière laisserait le
         filet flotter au milieu du vide. Attaché à la colonne, il en marque le bord.

         `lg:` seulement : sous ce point de rupture la colonne passe SOUS le tableau,
         et un filet vertical y séparerait deux blocs déjà empilés l'un sur l'autre.

         ⚠️ `self-stretch` ET NON `self-start`, et c'est ce qui donne au filet sa
         hauteur. La grille de la page est en `items-start` : ses éléments se réduisent
         à leur contenu, et le filet se serait arrêté à la fin du dernier article, à
         mi-hauteur du tableau. Étiré, ce bloc épouse la rangée entière — et c'est le
         DIV INTÉRIEUR qui colle, pas lui. C'est aussi ce que fait `AssetNewsAside`, et
         pour la même raison. */
      className="lg:self-stretch lg:border-l lg:border-border-subtle lg:pl-6"
    >
      {/* `min-h-0` sur la surface défilante est OBLIGATOIRE et son absence ne se voit
          pas : un enfant de conteneur flexible a une hauteur minimale égale à son
          contenu, si bien que le `max-h` du parent n'aurait aucun effet et que la
          colonne dépasserait la fenêtre sans jamais montrer d'ascenseur.

          ── L'ASCENSEUR DÉFILE, MAIS NE SE DESSINE PLUS ────────────────────

          Cette colonne portait la SEULE barre de défilement visible du site — une
          gouttière claire de seize pixels, courant sur toute la hauteur de la fenêtre,
          juste à côté du filet d'un pixel qui délimite la colonne. Deux verticales
          parallèles d'épaisseurs très inégales, dont une seule sépare quelque chose :
          la barre pesait plus lourd que la délimitation qu'elle longeait.

          `scrollbar-none` la retire sans rien retirer au défilement : molette, pavé
          tactile, touches et glisser fonctionnent à l'identique. Ce qui dit que la
          colonne continue reste ce qui le disait déjà — un article coupé par le bas du
          cadre, ce qu'aucune barre n'était nécessaire pour annoncer.

          `pr-1 -mr-1` PART AVEC ELLE : cette compensation réservait la largeur de la
          barre pour que le texte ne saute pas à son apparition. Sans barre, elle ne
          décalait plus que la colonne. */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:max-h-[calc(100dvh-var(--header-height)-2rem)]">
        <div className="scrollbar-none flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain">
          <Spotlight article={lead} readLabel={t('Lire l’article')} />

          {rest.length > 0 ? (
            <Feed articles={rest} title={fr.home.newsTitle} seeAll={fr.home.seeAll} />
          ) : null}
        </div>
      </div>
    </aside>
  )
}

/**
 * Zone BLEUE de la référence : l'article de tête, avec tout ce qu'il porte.
 *
 * ── SANS CADRE, ET C'EST LA RÈGLE DE TOUTE LA COLONNE ──────────────────────
 *
 * Il vivait dans une carte bordée, posée dans une colonne elle-même séparée du tableau
 * par un filet. Relevé sur la référence : les articles de leur colonne latérale n'ont
 * NI bordure, NI fond, NI rayon — mesuré à `0px` sur les trois. Ce qui les délimite
 * est le filet vertical de la colonne, et rien d'autre.
 *
 * Le raisonnement vaut ici : un cadre autour de chaque bloc d'une colonne déjà encadrée
 * empile deux délimitations pour une seule séparation. Le contenu porte alors trois
 * filets entre lui et le tableau — celui de sa carte, celui de la colonne, et la
 * gouttière — là où un seul suffit à dire « ceci n'est plus le tableau ».
 */
function Spotlight({ article, readLabel }: { article: NewsItem; readLabel: string }) {
  return (
    <section>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col gap-3"
      >
        {/* La couverture n'est PAS conditionnée à `imageUrl` : `Thumbnail` retombe
            elle-même sur une tuile portant le nom de l'éditeur quand l'image manque ou
            qu'elle échoue à charger. Un trou dans la carte de tête se remarquerait
            plus qu'une tuile de couleur. */}
        <span className="block overflow-hidden rounded-card">
          <Thumbnail url={article.imageUrl ?? ''} source={article.source} tall />
        </span>

        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
            <SourceDot source={article.source} url={article.url} />
            <span className="truncate font-medium text-ink">{article.source}</span>
            <span aria-hidden="true">·</span>
            <RelativeTime iso={article.publishedAt} />
          </p>

          <h3 className="text-base font-semibold leading-snug text-ink group-hover:text-brand-strong">
            {article.title}
          </h3>

          {/* `line-clamp-3` : le résumé donne le sujet, il ne remplace pas l'article.
              Sans borne, un flux qui publie ses trois premiers paragraphes pousserait
              le fil du dessous hors de l'écran. */}
          {article.excerpt ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-ink-muted">{article.excerpt}</p>
          ) : null}

          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand">
            {readLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(nouvelle fenêtre)</span>
          </span>
        </div>
      </a>
    </section>
  )
}

/**
 * Zone VERTE de la référence : le reste du fil, du plus récent au plus ancien.
 *
 * ── PAS DE BOUTON « VOIR PLUS », UN LIEN VERS LA PAGE ──────────────────────
 *
 * Un bouton qui déplie n'aurait rien de plus à montrer : la page ne demande qu'une
 * douzaine d'articles, et en charger davantage au clic demanderait un point de
 * terminaison, un état de chargement et une gestion d'erreur pour économiser un clic
 * vers `/actualites`, qui porte déjà le fil complet avec ses filtres et sa recherche.
 */
function Feed({
  articles,
  title,
  seeAll,
}: {
  articles: NewsItem[]
  title: string
  seeAll: string
}) {
  return (
    /* Sans cadre lui non plus — voir `Spotlight`. Ce qui le sépare de l'article de
       tête n'est plus une bordure de carte mais un FILET, posé au-dessus de son titre :
       une ligne pour une séparation, au lieu de deux contours pour la même. */
    <section className="border-t border-border-subtle pt-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <Link
          href="/actualites"
          className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
        >
          {seeAll}
        </Link>
      </div>

      {/* AUCUN ascenseur ici, et c'est important : la colonne entière en a un
          désormais. Cette liste en portait un second, imbriqué dans le premier — deux
          surfaces défilantes l'une dans l'autre, dont la molette ne sait laquelle
          servir. La liste s'allonge donc librement, et c'est la colonne qui la fait
          défiler. */}
      <ol className="divide-y divide-border-subtle">
        {articles.map((article) => (
          <li key={article.id}>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-1 py-2.5 pr-1"
            >
              <span className="text-xs font-medium leading-snug text-ink group-hover:text-brand-strong">
                {article.title}
              </span>
              <span className="flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
                <SourceDot source={article.source} url={article.url} />
                <span className="truncate">{article.source}</span>
                <span aria-hidden="true">·</span>
                <RelativeTime iso={article.publishedAt} />
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
