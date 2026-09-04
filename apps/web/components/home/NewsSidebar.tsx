import type { DataResult, NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { HomeNewsColumn } from '@/components/home/HomeNewsColumn'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COLONNE DE DROITE — UN ARTICLE EN GRAND, PUIS LE FIL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elle prend la place que la référence donne à son panneau « Insights » et à sa liste
 * « Latest Market News » : mêmes emplacements, contenu qui nous appartient.
 *
 * ⚠️ CETTE COLONNE A ÉTÉ RETIRÉE PUIS RÉTABLIE LE MÊME JOUR, SUR UNE MESURE FAUSSE.
 * Une sonde exécutée dans un navigateur neuf n'a trouvé aucun `<aside>` sur leur
 * accueil et a conclu que le panneau n'existait pas. Il est REPLIABLE, et replié par
 * défaut : `aside#right-sidebar`, 288 × 1201, apparaît dès qu'on le déplie, et
 * l'état est mémorisé par visiteur. Une absence mesurée n'est pas une absence.
 *
 * Largeur alignée sur la leur : 288 px, contre 340 auparavant.
 *
 * ── CE QUI EST RENDU ICI, ET CE QUI NE L'EST PLUS ──────────────────────────
 *
 * Ce composant garde ce qui ne dépend d'aucune interaction : l'état vide, le filet,
 * le collage, l'ascenseur. La une et le fil sont partis dans `HomeNewsColumn`, qui est
 * un composant CLIENT — la une tourne toutes les sept secondes, se met en pause au
 * survol, et le fil anime l'arrivée d'un article. Rien de tout cela ne se rend sur le
 * serveur.
 *
 * Le partage suit la règle du projet : le serveur pose la structure, le client porte
 * le comportement. `NewsItem` étant sérialisable, la frontière ne coûte rien.
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

  return (
    <aside
      aria-label={t('Actualités')}
      /* ── LE FILET QUI SÉPARE LA COLONNE DU TABLEAU ──────────────────────────
         C'est LA délimitation de la référence, et la seule qu'elle emploie ici : un
         filet vertical d'un peu plus d'un pixel, sur toute la hauteur, entre le
         classement et le panneau latéral. Relevé sur leur page à `1.25px`.

         Il remplace les contours des deux blocs qu'il contient, et c'est un échange,
         pas un ajout : une ligne dit « ceci n'est plus le tableau » mieux que deux
         cartes posées dans le vide, parce qu'elle le dit UNE fois, sur toute la
         hauteur, au lieu de le répéter bloc par bloc.

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
      /* `border-l-[1.25px]` : la valeur relevée sur `aside#right-sidebar`, et non le
         pixel entier de `border-l`. Le quart de pixel se voit — c'est un filet plus
         dense qu'un trait de un, plus léger qu'un de deux. */
      className="lg:self-stretch lg:border-l-[1.25px] lg:border-border-subtle lg:pl-6"
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
          cadre, ce qu'aucune barre n'était nécessaire pour annoncer. */}
      {/* ⚠️ LE DÉCALAGE RESTE CELUI DE L'EN-TÊTE, ET C'EST UN ÉCART ASSUMÉ. La
          référence colle son panneau à `top: 0` parce que son en-tête défile
          entièrement — rien ne le surplombe une fois la page descendue. Celui de
          ZENKUU est collant : coller le panneau à 0 le glisserait dessous. */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:max-h-[calc(100dvh-var(--header-height)-2rem)]">
        <div className="scrollbar-none flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain">
          <HomeNewsColumn articles={news.data} />
        </div>
      </div>
    </aside>
  )
}
