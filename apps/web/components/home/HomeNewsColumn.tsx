'use client'

import { ArrowUpRight } from 'lucide-react'
import { type CSSProperties, useState } from 'react'

import type { NewsItem } from '@zenkuu/data'

import { RelativeTime } from '@/components/home/RelativeTime'
import { useContent, usePhrase } from '@/components/locale/ContentProvider'
import { SourceDot, Thumbnail } from '@/components/news/NewsFeed'
import { useArrivals } from '@/components/news/useArrivals'
import { Link } from '@/i18n/navigation'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COLONNE D'ACTUALITÉS DE L'ACCUEIL — UNE UNE QUI TOURNE, PUIS LE FIL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE AJOUTE À L'ANCIENNE ──────────────────────────────────────────
 *
 * L'article de tête ne montrait que le plus récent. Il en présente maintenant CINQ,
 * l'un après l'autre, sept secondes chacun, avec un anneau qui se remplit au-dessus.
 * Le fil du dessous reprend là où la rotation s'arrête — aucun article n'est montré
 * deux fois.
 *
 * ⚠️ LA RÉFÉRENCE CITÉE PAR LE BRIEF NE FAIT PAS CELA. Mesuré sur tokenomist.ai : sa
 * page d'accueil n'a ni carrousel d'actualités ni anneau de progression. Le
 * comportement décrit a donc été construit d'après la DESCRIPTION du brief, pas
 * relevé — c'est une conception, pas une copie, et l'écart est signalé plutôt que
 * dissimulé derrière une mesure qui n'existe pas.
 *
 * ── POURQUOI CE COMPOSANT EST CLIENT, ET L'ANCIEN NON ───────────────────────
 *
 * `NewsSidebar` reste serveur : elle décide de l'état vide, du filet, du collage et de
 * l'ascenseur — tout ce qui ne dépend d'aucune interaction. Elle délègue ici ce qui en
 * dépend : la rotation, la pause au survol, la détection d'un article qui arrive.
 *
 * Le partage suit la même règle que partout dans le projet : le serveur pose la
 * structure, le client porte le comportement. `NewsItem` étant sérialisable, la
 * frontière ne coûte rien.
 *
 * ── LES HAUTEURS SONT RÉSERVÉES, ET C'EST LA MOITIÉ DU TRAVAIL ──────────────
 *
 * Une rotation entre cinq articles de hauteurs différentes ferait sauter tout ce qui
 * suit dans la colonne, sept secondes sur sept. Le titre est donc borné à deux lignes
 * ET porte la hauteur de deux lignes ; le chapeau est borné à trois ET porte la
 * hauteur de trois, même quand la source n'en fournit aucun.
 *
 * C'est la même raison qui fait rendre les cinq articles EN MÊME TEMPS, empilés dans
 * une seule cellule de grille : le bloc prend la hauteur du plus grand, une bonne fois,
 * au lieu de la recalculer à chaque changement. Le fondu n'a alors plus rien à pousser.
 */
/** Combien d'articles passent à la une avant que le fil ne reprenne. */
const EN_ROTATION = 5

/** La durée d'un article à la une. Elle est LUE PAR LE CSS, via `--anneau-duree`. */
const DUREE = '7s'

const RAYON = 7
const COURSE = 2 * Math.PI * RAYON

export function HomeNewsColumn({ articles }: { articles: NewsItem[] }) {
  const fr = useContent()

  const une = articles.slice(0, EN_ROTATION)
  const suite = articles.slice(une.length)

  return (
    <>
      <Spotlight articles={une} />
      {suite.length > 0 ? (
        <Feed articles={suite} title={fr.home.newsTitle} seeAll={fr.home.seeAll} />
      ) : null}
    </>
  )
}

/**
 * L'article de tête, et la rotation entre les cinq premiers.
 *
 * ── L'ANNEAU EST L'HORLOGE, PAS UN DÉCOR ────────────────────────────────────
 *
 * Il n'y a AUCUN `setTimeout` ici. L'avance se déclenche sur la fin de l'animation de
 * l'anneau (`onAnimationEnd`), si bien que la barre de progression et le changement
 * d'article ne peuvent pas diverger : c'est le même événement.
 *
 * La pause au survol devient alors une seule ligne — `animationPlayState: 'paused'` —
 * et elle est EXACTE. Un compteur en JavaScript posé à côté d'une animation CSS
 * repartirait de zéro là où l'anneau reprend à mi-course.
 *
 * `prefers-reduced-motion` supprime l'animation en CSS ; sans fin d'animation, rien
 * n'avance, et la rotation s'arrête d'elle-même sans qu'une seule condition ne soit
 * écrite ici. Les pastilles restent cliquables : le lecteur garde la main.
 *
 * ── LE SURVOL MET EN PAUSE, LE CLAVIER AUSSI ────────────────────────────────
 *
 * `onFocusCapture` / `onBlurCapture` doublent le survol : la rotation ne doit pas
 * emporter un lien pendant qu'on le tabule. Les versions « capture » attrapent le
 * focus des enfants, que `onFocus` sur un `<section>` ne verrait pas remonter.
 */
function Spotlight({ articles }: { articles: NewsItem[] }) {
  const t = usePhrase()
  const [index, setIndex] = useState(0)
  const [enPause, setEnPause] = useState(false)

  /* Le fil peut rétrécir entre deux rafraîchissements ; l'index le suit sans planter. */
  const actif = Math.min(index, articles.length - 1)
  const rotatif = articles.length > 1

  return (
    <section
      aria-label={t('Actualités à la une')}
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocusCapture={() => setEnPause(true)}
      onBlurCapture={() => setEnPause(false)}
      className="flex flex-col gap-2"
    >
      {rotatif ? (
        <div className="flex items-center gap-1">
          {articles.map((article, position) => {
            const courant = position === actif

            return (
              <button
                key={article.id}
                type="button"
                aria-label={t('Afficher l’actualité {n}').replace('{n}', String(position + 1))}
                aria-current={courant ? 'true' : undefined}
                onClick={() => setIndex(position)}
                className="flex size-5 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                {courant ? (
                  /* `-rotate-90` : un cercle SVG part à trois heures. La rotation le
                     fait partir en haut, là où on lit une progression. */
                  <svg viewBox="0 0 18 18" className="size-[18px] -rotate-90" aria-hidden="true">
                    <circle
                      cx="9"
                      cy="9"
                      r={RAYON}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      opacity="0.35"
                    />
                    <circle
                      cx="9"
                      cy="9"
                      r={RAYON}
                      fill="none"
                      stroke="var(--color-brand)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="anneau-progression"
                      style={
                        {
                          strokeDasharray: COURSE,
                          '--anneau-course': COURSE,
                          '--anneau-duree': DUREE,
                          animationPlayState: enPause ? 'paused' : 'running',
                        } as CSSProperties
                      }
                      onAnimationEnd={() => setIndex((n) => (n + 1) % articles.length)}
                    />
                  </svg>
                ) : (
                  <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Les cinq articles occupent LA MÊME cellule de grille : le bloc prend une fois
          pour toutes la hauteur du plus grand, et le fondu ne pousse rien. */}
      <div className="grid">
        {articles.map((article, position) => (
          <Une key={article.id} article={article} visible={position === actif} />
        ))}
      </div>
    </section>
  )
}

/**
 * Un article à la une — sans cadre, comme toute la colonne (voir `NewsSidebar`).
 *
 * `inert` plutôt qu'un simple `opacity: 0` : un article invisible reste dans le
 * document, et sans lui ses liens resteraient tabulables. Le lecteur au clavier
 * traverserait cinq articles dont il n'en voit qu'un.
 */
function Une({ article, visible }: { article: NewsItem; visible: boolean }) {
  const t = usePhrase()

  return (
    <div
      className={`[grid-area:1/1] transition-opacity duration-500 ease-out motion-reduce:transition-none${visible ? '' : ' pointer-events-none'}`}
      style={{ opacity: visible ? 1 : 0 }}
      inert={!visible}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col gap-3"
      >
        {/* La couverture n'est PAS conditionnée à `imageUrl` : `Thumbnail` retombe
            elle-même sur une tuile portant le nom de l'éditeur quand l'image manque ou
            qu'elle échoue à charger. Un trou dans la carte de tête se remarquerait
            plus qu'une tuile de couleur — et, ici, ferait sauter la rotation. */}
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

          {/* Deux lignes bornées ET deux lignes réservées : `line-clamp-2` empêche un
              titre long de pousser, `min-h` empêche un titre court de tirer. Les deux
              sont nécessaires — l'un sans l'autre laisse la moitié du saut. */}
          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-ink group-hover:text-brand">
            {article.title}
          </h3>

          {/* Le `<p>` est TOUJOURS rendu, vide au besoin : le conditionner ferait
              perdre trois lignes de hauteur dès qu'une source ne fournit pas de
              chapeau, c'est-à-dire au milieu de la rotation. */}
          <p className="line-clamp-3 min-h-[3.66rem] text-xs leading-relaxed text-ink-muted">
            {article.excerpt}
          </p>

          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-ink">
            {t('Lire l’article')}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
          </span>
        </div>
      </a>
    </div>
  )
}

/**
 * Le reste du fil, du plus récent au plus ancien.
 *
 * ── CE QU'IL FAIT DE PLUS QUE L'ANCIEN ──────────────────────────────────────
 *
 * Un article qui ARRIVE — après un `router.refresh()` ou une navigation douce — entre
 * en fondu et pousse ses voisines au lieu de les faire sauter. `useArrivals` fait la
 * distinction entre une arrivée et le premier affichage de la page, sans quoi les
 * quinze lignes s'animeraient à chaque chargement.
 *
 * Les titres sont bornés à deux lignes : toutes les lignes ont alors la même hauteur,
 * et une insertion ne redistribue plus la colonne entière.
 *
 * ── PAS DE BOUTON « VOIR PLUS », UN LIEN VERS LA PAGE ───────────────────────
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
  const arrivants = useArrivals(articles.map((article) => article.id))

  return (
    /* Sans cadre lui non plus — voir `NewsSidebar`. Ce qui le sépare de l'article de
       tête n'est pas une bordure de carte mais un FILET, posé au-dessus de son titre :
       une ligne pour une séparation, au lieu de deux contours pour la même. */
    <section className="border-t border-border-subtle pt-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <Link href="/actualites" className="shrink-0 text-xs font-medium text-ink hover:underline">
          {seeAll}
        </Link>
      </div>

      {/* AUCUN ascenseur ici : la colonne entière en a un. Cette liste en portait un
          second, imbriqué dans le premier — deux surfaces défilantes l'une dans
          l'autre, dont la molette ne sait laquelle servir. */}
      <ol className="divide-y divide-border-subtle">
        {articles.map((article) => (
          <li
            key={article.id}
            className={arrivants.has(article.id) ? 'actu-arrivee' : undefined}
          >
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-1 py-2.5 pr-1"
            >
              {/* `line-clamp-2` borne, `min-h` réserve : toutes les lignes ont alors la
                  même hauteur, et l'insertion d'un article ne redistribue plus la
                  colonne. Ne pas y ajouter `block` — il écraserait le `display:
                  -webkit-box` dont dépend le rognage. */}
              <span className="line-clamp-2 min-h-[2.06rem] text-xs font-medium leading-snug text-ink group-hover:text-brand">
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
