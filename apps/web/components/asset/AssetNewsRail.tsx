'use client'

import { ArrowUpRight, Newspaper } from 'lucide-react'

import type { NewsItem } from '@zenkuu/data'

import { IconTile } from '@/components/reui/icon-tile'
import { SourceDot, Thumbnail } from '@/components/news/NewsFeed'
import { useRelativeTime } from '@/components/locale/useRelativeTime'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FIL D'ACTUALITÉS DE LA FICHE — UNE UNE EN GRAND, PUIS LA CHRONOLOGIE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE RAIL ÉTAIT, ET POURQUOI IL CHANGE ──────────────────────────────
 *
 * Il empilait des lignes de taille égale, groupées par journée (« AUJOURD'HUI »,
 * « HIER », « 21 AOÛT »), chacune avec une vignette carrée de 48 pixels et le nom de
 * l'éditeur en pastille bordée. C'était la forme du panneau « Recently Happened to »
 * de la référence, et elle était défendable : elle sacrifie le confort de lecture à la
 * DENSITÉ TEMPORELLE, ce qu'on veut quand on cherche à rattacher un décrochage de la
 * courbe à un événement daté.
 *
 * Elle avait un défaut que la densité n'excuse pas : RIEN N'Y ÉTAIT PLUS IMPORTANT QUE
 * LE RESTE. Douze lignes identiques, dont la première — l'article le plus récent et le
 * plus lu — se distinguait uniquement par sa position. La colonne de la page d'accueil
 * a résolu cela depuis longtemps, et l'a résolu mieux : un article de tête qui prend
 * tout ce qu'il porte (couverture, source, date, titre, chapeau), puis le fil.
 *
 * Les deux panneaux d'actualités du site partagent donc désormais la même forme. Ce
 * n'est pas de l'uniformité pour l'uniformité : deux colonnes du même site qui
 * présentent les mêmes objets de deux façons différentes obligent le lecteur à
 * réapprendre à les lire d'une page à l'autre.
 *
 * ── LES LOGOS DES MÉDIAS ─────────────────────────────────────────────────────
 *
 * Le nom de l'éditeur était écrit dans une pastille bordée — « CoinDesk », « The
 * Block », « Yahoo Finance ». Il est désormais précédé de sa MARQUE, par `SourceDot`,
 * exactement comme sur l'accueil. Un logo se reconnaît sans être lu : dans une colonne
 * qu'on parcourt du regard, c'est ce qui dit le plus vite d'où vient un article.
 *
 * `SourceDot` retombe sur une tuile teintée portant l'initiale quand la favicon manque
 * ou échoue — il n'y a donc jamais de trou dans la ligne.
 *
 * ── CE QUI DISPARAÎT : LE GROUPEMENT PAR JOURNÉE ─────────────────────────────
 *
 * Il coûtait un titre collant tous les deux ou trois articles, dans une colonne de
 * 320 pixels. L'heure relative de chaque ligne (« il y a 11 h », « avant-hier ») porte
 * la même information au même endroit, sans occuper de rangée à elle seule — et c'est
 * ce que fait la colonne de l'accueil.
 *
 * ── LES LIENS SORTENT DU SITE, ET LE DISENT ──────────────────────────────────
 *
 * Ce fil agrège des éditeurs tiers : chaque titre mène chez eux, en nouvelle fenêtre,
 * avec `rel="noopener noreferrer nofollow"`. C'est aussi pourquoi la source est écrite
 * sur chaque ligne plutôt qu'une fois en tête de colonne — un lecteur doit savoir chez
 * qui il part AVANT de cliquer, pas après.
 */
export function AssetNewsRail({
  news,
  name,
}: {
  /** Articles DÉJÀ filtrés sur l'actif par l'appelant. */
  news: NewsItem[]
  name: string
}) {
  if (news.length === 0) {
    return (
      /*
        ── L'ÉTAT VIDE PORTE UNE TUILE D'ICÔNE (ReUI `icon-tile`) ──────────────

        Le paragraphe nu qui tenait cette place se lisait comme une phrase perdue dans
        une boîte. Une tuile lui donne un point d'ancrage visuel sans rien promettre :
        elle dit « il n'y a rien ici », pas « quelque chose a échoué ».

        `variant="soft"` et non `solid` : c'est une ABSENCE, pas un avertissement. Une
        pastille pleine et colorée à cet endroit ferait lire comme une panne ce qui
        n'est qu'un silence des sources.
      */
      <div className="flex flex-col items-center gap-2 rounded-card border border-border-subtle bg-surface px-3 py-5 text-center">
        <IconTile variant="soft" size="sm" className="text-ink-muted" aria-hidden="true">
          <Newspaper />
        </IconTile>
        <p className="text-xs leading-relaxed text-ink-muted">
          Aucun de nos flux n’a écrit « {name} » récemment. Ce n’est pas la preuve qu’il ne
          s’est rien passé — seulement qu’aucune de nos sources ne l’a nommé.
        </p>
      </div>
    )
  }

  /*
   * Tri décroissant AVANT tout le reste.
   *
   * Les flux arrivent agrégés source par source, donc dans un ordre qui n'a rien de
   * chronologique. Sans ce tri, « la une » serait le premier article du premier flux —
   * c'est-à-dire un article au hasard — et non le plus récent.
   */
  const sorted = [...news].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  const [lead, ...rest] = sorted as [NewsItem, ...NewsItem[]]

  return (
    <div className="flex flex-col gap-3">
      <Spotlight article={lead} />
      {rest.length > 0 ? <Feed articles={rest} /> : null}
    </div>
  )
}

/**
 * L'ARTICLE DE TÊTE, avec tout ce qu'il porte.
 *
 * ── SANS CADRE, ET C'EST LA RÈGLE DE TOUTE LA COLONNE ────────────────────────
 *
 * Ni bordure, ni fond, ni rayon — mesuré à `0px` sur les trois chez la référence. Ce
 * qui délimite cette colonne est le filet vertical qui la sépare du contenu, et rien
 * d'autre. Un cadre autour de chaque bloc d'une colonne déjà encadrée empile deux
 * délimitations pour une seule séparation.
 */
function Spotlight({ article }: { article: NewsItem }) {
  return (
    <section>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="group flex flex-col gap-2.5"
      >
        {/* La couverture n'est PAS conditionnée à `imageUrl` : `Thumbnail` retombe
            elle-même sur une tuile portant le nom de l'éditeur quand l'image manque ou
            qu'elle échoue à charger. Un trou en tête de colonne se remarquerait plus
            qu'une tuile de couleur. */}
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

          <h3 className="text-sm font-semibold leading-snug text-ink group-hover:text-brand-strong">
            {article.title}
          </h3>

          {/* `line-clamp-3` : le chapeau donne le sujet, il ne remplace pas l'article.
              Sans borne, un flux qui publie ses trois premiers paragraphes pousserait le
              fil du dessous hors de l'écran. */}
          {article.excerpt ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-ink-muted">
              {article.excerpt}
            </p>
          ) : null}

          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand">
            Lire l’article
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(nouvelle fenêtre)</span>
          </span>
        </div>
      </a>
    </section>
  )
}

/**
 * LE RESTE DU FIL, du plus récent au plus ancien.
 *
 * ── AUCUN ASCENSEUR ICI ──────────────────────────────────────────────────────
 *
 * La colonne entière en a un (voir `AssetNewsAside`). Une liste défilante imbriquée
 * dedans donnerait deux surfaces emboîtées, dont la molette ne saurait laquelle servir.
 * La liste s'allonge donc librement, et c'est la colonne qui la fait défiler.
 *
 * ── LA VIGNETTE RESTE, EN PETIT ──────────────────────────────────────────────
 *
 * Quarante-huit pixels, dans la hauteur que le titre occupe déjà sur deux lignes : elle
 * ne coûte rien en hauteur et gagne ce qu'aucun texte ne donne aussi vite — la
 * reconnaissance de l'article déjà vu ailleurs. Elle est DÉCORATIVE (`Thumbnail` pose
 * `aria-hidden`), le lien portant déjà le titre.
 */
function Feed({ articles }: { articles: NewsItem[] }) {
  return (
    /* Le filet au-dessus du titre remplace le contour d'une carte : une ligne pour une
       séparation, au lieu de deux contours pour la même. */
    <section className="border-t border-border-subtle pt-3">
      <ol className="divide-y divide-border-subtle">
        {articles.map((article) => (
          <li key={article.id}>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex gap-2.5 py-2.5"
            >
              <span className="block w-12 shrink-0">
                <Thumbnail url={article.imageUrl ?? ''} source={article.source} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium leading-snug text-ink transition-colors group-hover:text-brand-strong">
                  {article.title}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
                  <SourceDot source={article.source} url={article.url} />
                  <span className="truncate">{article.source}</span>
                  <span aria-hidden="true">·</span>
                  <RelativeTime iso={article.publishedAt} />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Isolé dans son composant : `useRelativeTime` est un crochet, il ne peut pas être
 * appelé dans la boucle de rendu du parent.
 *
 * Il est CLIENT pour une raison de fond, pas de commodité : « il y a 11 h » dépend de
 * l'horloge du LECTEUR. Rendu par le serveur, le libellé serait faux pour la moitié de
 * la planète et provoquerait en prime un écart d'hydratation.
 */
function RelativeTime({ iso }: { iso: string }) {
  return <>{useRelativeTime(iso)}</>
}
