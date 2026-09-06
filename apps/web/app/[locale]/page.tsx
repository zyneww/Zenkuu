import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

import { CACHE_TTL_SECONDS, getCryptoGlobalStats, getNews } from '@zenkuu/data'

import { CryptoBoard } from '@/components/home/CryptoBoard'
import { HomeNewsGrid } from '@/components/home/HomeNewsGrid'
import { AssetLiveRefresh } from '@/components/asset/AssetLiveRefresh'
import { MarketRibbon } from '@/components/home/MarketRibbon'
import { NewsSidebar } from '@/components/home/NewsSidebar'
import { PriceHeader } from '@/components/home/PriceHeader'
import { getContent } from '@/lib/content'

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
 *     2. REPÈRES       capitalisation, dominance,   jusqu'en bas, sans
 *                      volume, indice altcoin,      jamais bouger
 *                      peur et avidité, hors
 *                      crypto, pools en tendance
 *     3. TABLEAU       cent cryptomonnaies
 *     4. BLOCS DU BAS  découverte, cotations,
 *                      secteurs, pools, actualités,
 *                      palmarès, places, carte
 *                      thermique, extrêmes, dérivés
 *
 * Le point 2 reprend la tête de page de MEXC — trois cartes de trois lignes ; le
 * bandeau de cours défilant qui les précédait a été retiré le 2026-09-06
 * — et le point 4 la disposition de CRYPTORANK. Les deux tournent sur les sources de
 * Zenkuu : voir `MarketRibbon` et `MarketWidgets`, dont les en-têtes justifient bloc
 * par bloc ce qui est repris tel quel et ce qui est substitué faute de source.
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
 *     `HighlightGrid`    → tendances/hausses/baisses tenues par `HomeWidgets`
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
  const [news, globals] = await Promise.all([getNews(14), getCryptoGlobalStats('eur')])

  return (
    /*
      ── DEUX COLONNES, ET LA GRILLE D'ACTUALITÉS EN PLUS ─────────────────────

      ⚠️ CETTE NOTE A DIT LE CONTRAIRE PENDANT QUELQUES HEURES, SUR UNE MESURE
      FAUSSE. Elle affirmait : « aucun `<aside>`, rien à droite du tableau », relevé
      à 2116 px de large, et la colonne avait été retirée pour cela.

      Le panneau de la référence est REPLIABLE — `gecko-sidebar-expanded-panel`,
      `gecko-sidebar-inner` — et l'état est mémorisé par visiteur. Le premier relevé
      s'est fait dans un navigateur neuf, où il est replié par défaut : la sonde n'a
      rien vu et a conclu qu'il n'existait pas. Relevé de nouveau dans un navigateur
      où il est déplié : `aside#right-sidebar`, 288 × 1201, collant à `top: 0`,
      filet gauche de 1,25 px, portant « Insights » et « Portfolio ».

      LA LEÇON EST GÉNÉRALE : une absence mesurée n'est pas une absence. Un composant
      replié, masqué sous un point de rupture, ou différé rend exactement le même
      `querySelectorAll` vide qu'un composant inexistant.

      La grille du bas, elle, était juste : la référence a bien LES DEUX — le panneau
      à droite ET une grille d'actualités pleine largeur sous le classement, relevée
      à 7736 px du haut. Voir `HomeNewsGrid`.

      `minmax(0,1fr)` et non `1fr` : une piste en `1fr` refuse de passer sous la
      taille minimale de son contenu, et le tableau la ferait déborder au lieu de
      rétrécir. `items-start` : la colonne ne s'étire pas d'elle-même — c'est elle
      qui demande `self-stretch`, pour que son filet coure sur toute la hauteur.
    */
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
      {/* `min-w-0` est OBLIGATOIRE et son absence ne se voit pas tout de suite : sans
          lui, la largeur minimale de cette piste est celle de son contenu le plus
          large — le tableau — et la page défilerait horizontalement au lieu de
          laisser le tableau rétrécir. */}
      <div className="flex min-w-0 flex-col gap-8">
        <PriceHeader globals={globals} />

      {/* ── LA HAUTEUR DU SUBSTITUT EST MESURÉE, PLUS DEVINÉE ───────────────
          Elle a valu 210 px, puis 149. Les deux notes précédentes avaient le bon
          diagnostic — « un substitut plus haut que ce qu'il remplace fait remonter la
          page au moment où le bloc arrive » — et comparaient la mauvaise chose.

          ⚠️ CE NOMBRE N'EST PAS LA HAUTEUR DU RUBAN, C'EST CELLE DU CADRE SEUL.
          `BlockSkeleton` empile une ligne de titre (`h-5`, 20 px) et un écart
          (`gap-3`, 12 px) AVANT le cadre : son total vaut donc la valeur écrite ici
          plus 32 px. Écrire 149 pour un ruban de 149 px laissait 32 px de décalage,
          soit exactement ce que la note d'avant croyait avoir refermé.

          Relevé au navigateur le 2026-09-06, après le retrait du bandeau défilant :
          le ruban rend 94 px — trois cartes, plus de bande de cours au-dessus.
          94 − 20 − 12 = 62.

          Vérifié après coup : `document.scrollingElement` ne bouge plus à l'arrivée
          du bloc. Une hauteur écrite à la main n'est juste que le jour où on la
          mesure : celle-ci l'a été, et tout changement du contenu du ruban la rendra
          fausse à nouveau. */}
      {/* ══════════════════════════════════════════════════════════════════════
          L'ACCUEIL SE RAFRAÎCHIT SEUL, COMME LES FICHES

          Il ne le faisait pas. Le bandeau de cours, le tableau, les trois palmarès et
          les agrégats de tête étaient figés à l'instant du rendu et le RESTAIENT :
          l'onglet laissé ouvert affichait des cours d'il y a une heure avec la même
          autorité qu'un chiffre juste, et rien ne disait lequel des deux on lisait.

          C'est le même défaut que les fiches d'actif ont déjà corrigé, et c'est le même
          composant qui le corrige — sa cadence est celle de `CACHE_TTL_SECONDS`, donc
          celle du cache : en deçà, il n'y aurait rien de neuf à chercher. Il ne réveille
          rien quand l'onglet est caché, et rafraîchit au retour dessus.

          Voir `AssetLiveRefresh`, dont l'en-tête porte le raisonnement complet.
          ══════════════════════════════════════════════════════════════════════ */}
      <AssetLiveRefresh />

      <Suspense fallback={<BlockSkeleton height="h-[62px]" />}>
        <MarketRibbon />
      </Suspense>

      {/* Le filet de section sépare le bloc de tête du classement. */}
      <Suspense fallback={<BoardSkeleton />}>
        <div className="border-t border-border-subtle pt-8">
          <CryptoBoard />
        </div>
      </Suspense>

      {/* ⚠️ `MarketWidgets` A ÉTÉ RETIRÉ D'ICI, ET LES ACTUALITÉS SONT RESTÉES.

          La grappe occupait cette place : huit lectures, 3 728 pixels mesurés, dont la
          note disait qu'elle « reprend l'ordre et la densité de la référence ». C'était
          vrai, et c'était le problème — la page reproduisait la longueur de CoinGecko
          sans en avoir la matière. Le composant n'est pas supprimé : sa place ici a
          disparu, pas son code.

          `HomeNewsGrid` reste, et n'est plus une grille : c'est un RAIL qui défile, avec
          ses deux flèches et son lien de sortie. Ce qui justifiait de le retirer — le
          doublon avec le panneau de droite — tenait à ce que les deux blocs montraient
          les MÊMES quatre titres. Le rail en porte douze et se parcourt ; le panneau en
          porte quelques-uns qu'on lit du coin de l'œil en regardant le tableau. Les
          deux ne se répètent plus. */}
      <HomeNewsGrid news={news} />
      </div>

      <NewsSidebar news={news} />
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
