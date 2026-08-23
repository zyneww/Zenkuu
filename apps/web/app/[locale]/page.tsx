import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

import { CACHE_TTL_SECONDS, getCryptoGlobalStats, getNews } from '@zenkuu/data'

import { CryptoBoard } from '@/components/home/CryptoBoard'
import { GlobalAnalyses } from '@/components/home/analyses/GlobalAnalyses'
import { MarketPanorama } from '@/components/home/MarketPanorama'
import { MoversRow } from '@/components/home/MoversRow'
import { NewsSidebar } from '@/components/home/NewsSidebar'
import { PriceHeader } from '@/components/home/PriceHeader'
import { getContent, getPhrase } from '@/lib/content'

// Régénération alignée sur le TTL du cache applicatif : les deux durées de vie doivent
// coïncider, sinon la fraîcheur affichée devient imprévisible (§9).
//
// Next.js analyse `revalidate` statiquement et refuse une constante importée : la valeur
// doit donc être écrite en clair. Le garde-fou juste en dessous fait échouer le typecheck
// si CACHE_TTL_SECONDS s'en écarte — les deux ne peuvent pas diverger en silence.
export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Titre écrit en entier, contrairement aux autres pages.
 *
 * Le gabarit « Zenkuu | %s » du layout ne s'applique qu'aux segments ENFANTS.
 * `app/page.tsx` partageant le segment racine avec `app/layout.tsx`, un titre simple y
 * remplacerait le gabarit au lieu de le traverser — l'onglet afficherait « Accueil »
 * tout court. La forme `absolute` lève l'ambiguïté.
 */
export async function generateMetadata() {
  const fr = await getContent()
  return {
    title: { absolute: `${fr.site.name} | ${fr.pages.home}` },
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ACCUEIL — UNE PAGE DE COTATIONS, DANS L'ORDRE DE LA RÉFÉRENCE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── L'ORDRE DES BLOCS ───────────────────────────────────────────────────────
 *
 * La page est une GRILLE À DEUX COLONNES sur toute sa hauteur, et non une pile de
 * blocs dont l'un se trouve être à deux colonnes.
 *
 *     COLONNE DE GAUCHE                          COLONNE DE DROITE
 *     1. EN-TÊTE       titre, sous-titre,        LE FIL D'ACTUALITÉS
 *                      cinq chiffres              — du haut de la page
 *     2. TROIS CARTES  tendances, hausses,          jusqu'en bas, sans
 *                      baisses                      jamais bouger
 *     3. TABLEAU       cent cryptomonnaies
 *     4. PANORAMA      indices, crypto, devises,
 *                      matières premières
 *     5. ANALYSES      sentiment, secteurs, flux, macro
 *
 * ── POURQUOI LA COLONNE D'ACTUALITÉS REMONTE AU HAUT DE LA PAGE ────────────
 *
 * Elle commençait À CÔTÉ DU TABLEAU, c'est-à-dire après le titre, le sous-titre, le
 * bandeau de chiffres et les trois cartes — quelque huit cents pixels plus bas. Deux
 * conséquences, et la seconde est la plus coûteuse :
 *
 *   · le premier écran ne portait aucune actualité, alors que c'est la moitié de ce
 *     qu'on vient chercher sur une page d'accueil de marché ;
 *   · surtout, la colonne ne pouvait pas tenir : sa hauteur était bornée par CELLE DU
 *     TABLEAU. Passé le tableau, la grille se refermait et le fil s'en allait vers le
 *     haut, laissant le convertisseur et la carte thermique occuper la pleine largeur.
 *     Le lecteur qui descendait perdait le fil en route.
 *
 * C'est la disposition de CoinGecko, et le déplacement de la grille d'un cran vers le
 * haut suffit à obtenir les deux : la colonne part au niveau du titre, et sa piste de
 * grille court jusqu'au dernier bloc de la page. Le collage (`sticky`) qu'elle portait
 * déjà a enfin de la place pour agir — voir `NewsSidebar`, où les trois propriétés qui
 * le rendent tenable sont expliquées.
 *
 * ── CE QUI A QUITTÉ CETTE PAGE, ET OÙ LE RETROUVER ─────────────────────────
 *
 *     `MarketPulse`      → les mêmes chiffres, tenus par l'en-tête
 *     `HighlightGrid`    → tendances/hausses/baisses tenues par `MoversRow`
 *     `EditorialBand`    → /blog et /apprendre
 *     `MarketDate`       → la fraîcheur est dans le sous-titre de l'en-tête
 *     `HomeConverter`    → /convertisseur
 *     `HomeHeatmap`      → /heatmap
 *
 * Les deux derniers sont les plus récents à partir, et le motif est écrit en entier
 * dans l'en-tête de `MarketPanorama` : ce sont des OUTILS, c'est-à-dire des surfaces
 * qu'on ouvre avec une question en tête. Le bas de la page la plus visitée du site
 * revient à un RELEVÉ — où en sont les indices, le dollar, le pétrole, les taux — puis
 * aux analyses, qui sont ce que la référence ne sait pas faire.
 *
 * ⚠️ Contrairement aux quatre premiers, ces deux-là sont SUPPRIMÉS DU DÉPÔT et pas
 * seulement de la page : c'étaient des enveloppes propres à l'accueil autour de
 * `Converter` et de `MarketHeatmap`, que `/convertisseur` et `/heatmap` rendent
 * directement. Les garder aurait laissé deux modules que rien n'importe, et dont le
 * prochain lecteur aurait dû établir lui-même qu'ils ne servent plus.
 *
 * ── QUATRE GRAPPES SOUS `<Suspense>` ───────────────────────────────────────
 *
 * La page n'attend elle-même que deux appels légers — un agrégat et un fil
 * d'actualités — dont dépendent l'en-tête et la colonne de droite. Les cartes, le
 * tableau, le panorama et les analyses touchent des points de terminaison différents,
 * et rien n'oblige la plus rapide à attendre la plus lente : chacune a son propre
 * substitut, à sa hauteur.
 *
 * ── AUCUNE ENTRÉE PROPRE AU VISITEUR ───────────────────────────────────────
 *
 * Ni `searchParams`, ni cookie : ce que rend cette page est le même pour tout le
 * monde, et `revalidate = 180` gouverne donc réellement la fraîcheur de ses données.
 * C'est aussi la raison pour laquelle le tableau pagine CÔTÉ CLIENT — voir `CryptoBoard`.
 */
export default async function HomePage() {
  const t = await getPhrase()
  const [news, globals] = await Promise.all([getNews(14), getCryptoGlobalStats('eur')])

  return (
    /*
      ── LA GRILLE TIENT LA PAGE ENTIÈRE ──────────────────────────────────────

      COLONNE DE DROITE À LARGEUR FIXE, et non à un tiers de la page. Un tiers paraît
      le choix naturel, et c'est le mauvais : les deux colonnes n'ont pas le même
      appétit. Le fil porte des titres sur deux lignes — au-delà de 340 px il gagne du
      blanc, pas de la lisibilité. Le tableau, lui, a onze colonnes dont la plus étroite
      ne se comprime plus : chaque pixel qu'on lui prend en retire une (voir les seuils
      de `MarketTable`). Tout le surplus des grands écrans va donc au tableau.

      `minmax(0,1fr)` et non `1fr` : une piste de grille en `1fr` refuse de passer sous
      la taille minimale de son contenu, et un tableau large la ferait déborder au lieu
      de rétrécir.

      `items-start` : la colonne de droite ne s'étire pas d'elle-même — c'est elle qui
      demande `self-stretch`, parce que son filet vertical doit courir sur toute la
      hauteur. Voir `NewsSidebar`.
    */
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* `min-w-0` sur la colonne de gauche est OBLIGATOIRE et son absence ne se voit
          pas tout de suite : sans lui, la largeur minimale de cette piste est celle de
          son contenu le plus large — le tableau — et la page défilerait
          horizontalement au lieu de laisser le tableau rétrécir. */}
      <div className="flex min-w-0 flex-col gap-8">
        <PriceHeader globals={globals} />

        <Suspense fallback={<CardsSkeleton />}>
          <MoversRow />
        </Suspense>

        {/* Le filet de section sépare le bloc de tête du classement. Il est posé sur le
            bloc et non sur la grille : la grille traverse désormais toute la page, et
            un filet en travers de ses deux colonnes couperait la colonne d'actualités
            en son milieu. */}
        <Suspense fallback={<BoardSkeleton />}>
          <div className="border-t border-border-subtle pt-8">
            <CryptoBoard />
          </div>
        </Suspense>

        <Suspense fallback={<BlockSkeleton height="h-[320px]" />}>
          <MarketPanorama />
        </Suspense>

        {/* ── LES ANALYSES ────────────────────────────────────────────────────
            `GlobalAnalyses` était parti sur `/graphiques` quand l'accueil s'est
            resserré sur les cotations. Il revient, et pas au même endroit : en BAS de
            page, après le relevé, là où le lecteur qui est descendu jusque-là cherche
            une lecture plutôt qu'un cours.

            Le composant rend un fragment de cartes, sans grille : c'est l'appelant qui
            décide de leur disposition, et il le faut — la même série de cartes tient
            sur deux colonnes ici, à côté d'une colonne d'actualités, et sur trois sur
            `/graphiques` où elle occupe la pleine largeur. */}
        <Suspense fallback={<BlockSkeleton height="h-[560px]" />}>
          <section
            className="flex flex-col gap-3 border-t border-border-subtle pt-8"
            aria-label={t('Analyses')}
          >
            <h2 className="text-sm font-normal text-ink-muted">{t('Analyses')}</h2>
            {/*
              ── LA DERNIÈRE CARTE PREND TOUTE LA RANGÉE QUAND ELLE Y EST SEULE ──

              `GlobalAnalyses` rend CINQ cartes dans une grille à deux colonnes : la
              cinquième — l'inflation annuelle — se retrouvait seule à gauche, avec six
              cent quarante pixels de vide à sa droite. Une carte isolée à mi-largeur
              se lit comme une carte qui n'a pas chargé, et son histogramme de huit
              années y était comprimé sans raison.

              Le sélecteur porte les DEUX conditions : dernière ET de rang impair. Une
              sixième carte formerait une rangée complète, où l'étalement serait faux —
              la règle se désactive alors d'elle-même, sans qu'on ait à y revenir.
            */}
            <div className="grid gap-3 xl:grid-cols-2 xl:[&>section:last-child:nth-child(odd)]:col-span-2">
              <GlobalAnalyses />
            </div>
          </section>
        </Suspense>
      </div>

      <NewsSidebar news={news} />
    </div>
  )
}

/** Substitut des trois cartes — même grille, même hauteur que cinq lignes. */
function CardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <Skeleton
          key={index}
          className="h-[228px] rounded-card border border-border-subtle bg-surface-muted"
        />
      ))}
    </div>
  )
}

/**
 * Substitut du tableau.
 *
 * HAUTEUR FIXE plutôt qu'un nombre de lignes : le tableau réel mesure sa hauteur sur
 * ses en-têtes, sa barre d'outils et son pied de pagination, qu'un empilement de
 * rectangles n'approcherait qu'au hasard. Une hauteur ronde ne prétend rien.
 */
function BoardSkeleton() {
  return <BlockSkeleton height="h-[720px]" />
}

/**
 * Substitut générique : une ligne de titre, puis un cadre à la hauteur annoncée.
 *
 * La hauteur est passée par l'appelant plutôt que devinée, et c'est ce qui empêche la
 * page de sauter sous les yeux quand un bloc arrive : un substitut plus court que ce
 * qu'il remplace décale tout ce qui le suit au moment précis où le lecteur y arrive.
 */
function BlockSkeleton({ height }: { height: string }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-5 w-48 rounded-control bg-surface-muted" />
      <Skeleton
        className={`${height} rounded-panel border border-border-subtle bg-surface-muted`}
      />
    </div>
  )
}
