'use client'

import { PanelRight, Sparkles } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * COLONNE D'ACTUALITÉS, À DROITE DE LA FICHE — le panneau « Insights » de CoinGecko.
 *
 * ── POURQUOI ELLE REVIENT, APRÈS AVOIR ÉTÉ RETIRÉE ──────────────────────────
 *
 * Elle a existé, et le commentaire de `AssetLayoutFrame` raconte pourquoi elle est
 * partie : elle publiait les MÊMES articles que la section « Actualités », à quatre-
 * vingts pixels d'écart, sur une page devenue unique où l'on descend de l'un à
 * l'autre au défilement.
 *
 * L'argument était juste, et c'est la SECTION qui a tort. Une chronologie d'événements
 * ne se consulte pas après le graphique : elle se lit EN MÊME TEMPS que lui, parce
 * qu'on cherche à rattacher un décrochage à une date. Descendre de trois écrans pour
 * trouver l'article, puis remonter pour retrouver le creux, c'est exactement ce que la
 * colonne évite.
 *
 * La section pleine largeur est donc supprimée, et la colonne prend sa place. Il n'y a
 * plus de doublon — il n'y a plus qu'un fil, à l'endroit où il sert.
 *
 * ── LE REPLI EST MÉMORISÉ, ET LU SANS EFFET ─────────────────────────────────
 *
 * Trois cent vingt pixels, c'est un cinquième d'un écran de portable : quelqu'un qui
 * vient pour la courbe doit pouvoir les reprendre, et ne pas avoir à le redemander à
 * chaque fiche. Le choix vit donc dans `localStorage`.
 *
 * Il est lu par `useSyncExternalStore` et non dans un effet, pour la raison exposée
 * dans `table-columns.tsx` : un effet peindrait d'abord la colonne ouverte, puis la
 * refermerait — la page sauterait de 320 pixels sous les yeux à chaque chargement.
 * L'instantané SERVEUR répond « ouvert », ce qui est le seul état que le serveur puisse
 * honnêtement rendre, et l'hydratation reste cohérente.
 *
 * ── SOUS 1280 PIXELS, ELLE DEVIENT UN TIROIR ────────────────────────────────
 *
 * En dessous, la page tient déjà deux colonnes — le rail de chiffres et le contenu —
 * et une troisième les réduirait toutes les trois. La colonne cède donc sa place.
 *
 * ⚠️ ELLE NE DISPARAISSAIT PAS SEULEMENT : ELLE DEVENAIT INTROUVABLE. Aucun bouton ne
 * la rappelait, et l'argument d'alors — « le fil reste atteignable, `/actualites`
 * porte le même flux » — passait à côté de ce que la colonne sert à faire. On ne vient
 * pas y lire les actualités du jour ; on vient rattacher un décrochage de la courbe à
 * une date. Renvoyer vers une autre page, c'est retirer exactement la simultanéité qui
 * justifie la colonne.
 *
 * Elle se replie donc en LANGUETTE FIXE au bord droit de l'écran, qui ouvre le même fil
 * dans un tiroir latéral. Le contenu est le même, la position est la même — à droite —
 * et le geste est celui qu'on attend d'un panneau qu'on a vu se refermer.
 */

const STORAGE_KEY = 'zenkuu-fiche-actualites'

/**
 * `storage` ne se déclenche que dans les AUTRES onglets. Sans cet événement maison,
 * replier la colonne ne redessinerait pas la page qu'on a sous les yeux — alors
 * qu'elle se replierait bien dans l'onglet d'à côté.
 */
const LOCAL_EVENT = 'zenkuu:fiche-actualites'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(LOCAL_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(LOCAL_EVENT, onChange)
  }
}

/* L'instantané est une CHAÎNE et non un booléen : `useSyncExternalStore` compare par
   identité, et une chaîne se compare par valeur. Le sens est inversé — on ne stocke
   que le repli — pour que l'absence de clé signifie « ouvert », qui est le défaut. */
function readCollapsed(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CROCHET DE MESURE `useTailStickyTop` A ÉTÉ SUPPRIMÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Il calculait `top: min(160, hauteurFenêtre − hauteurPanneau − 32)` pour qu'une
 * colonne plus haute que la fenêtre remonte hors du champ jusqu'à ce que sa FIN
 * affleure le bas de l'écran. Cela demandait de mesurer la hauteur du panneau — que
 * `calc()` ne sait pas lire —, donc un `ResizeObserver`, un état, et un effet dont le
 * rattachement au remontage du panneau a déjà coûté une correction de bogue.
 *
 * Tout cela devient inutile dès lors que le fil défile CHEZ LUI : la colonne garde une
 * hauteur bornée à la fenêtre, `sticky top-32` la fixe, et il n'y a plus rien à
 * mesurer. Voir le commentaire du panneau pour le raisonnement complet, et
 * `overscroll-contain` pour ce qui rend l'ascenseur imbriqué acceptable.
 *
 * Quarante lignes de JavaScript remplacées par trois classes CSS, et un `ResizeObserver`
 * de moins à tenir en vie.
 */

export function AssetNewsAside({
  children,
  count,
}: {
  /** Le fil, rendu par l'appelant — `AssetNewsRail` est déjà un composant client. */
  children: React.ReactNode
  /** Nombre d'articles, annoncé sur le bouton quand la colonne est repliée. */
  count: number
}) {
  const t = usePhrase()
  const collapsed =
    useSyncExternalStore(subscribe, readCollapsed, () => '') === '1'

  function toggle() {
    try {
      if (collapsed) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* Navigation privée stricte : le choix ne survit pas à la session. */
    }
    window.dispatchEvent(new Event(LOCAL_EVENT))
  }

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * SOUS `xl` : UNE LANGUETTE FIXE, ET LE MÊME FIL DANS UN TIROIR
   * ══════════════════════════════════════════════════════════════════════════
   *
   * `fixed` et non `sticky` : sous cette largeur, la colonne n'a plus de place dans la
   * rangée — lui en rendre une repousserait le contenu. Une languette hors flux ne
   * prend aucune largeur et reste au bord quoi qu'on fasse défiler.
   *
   * `top-1/2` plutôt qu'un bord haut ou bas : c'est la hauteur où le regard est quand
   * il lit la courbe, et le seul endroit qui ne se dispute ni avec l'en-tête collant en
   * haut ni avec les commandes de période en bas.
   *
   * Le fil n'est monté qu'à l'OUVERTURE — `DrawerContent` vit dans un portail que
   * `vaul` ne peuple que si le tiroir est ouvert. Il n'y a donc pas deux copies de la
   * liste dans le document, seulement deux emplacements possibles.
   */
  const drawer = (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          title={t('Afficher les actualités')}
          className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-card border border-r-0 border-border-subtle bg-surface px-2 py-3 text-ink-muted shadow-overlay transition-colors duration-150 hover:text-ink xl:hidden"
        >
          <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
          <span className="text-[0.6875rem] font-medium [writing-mode:vertical-rl]">
            {t('Actualités')}
            {count > 0 ? ` · ${count}` : ''}
          </span>
        </button>
      </DrawerTrigger>

      <DrawerContent className="h-full w-[22rem] max-w-[90vw] bg-canvas xl:hidden">
        <DrawerHeader className="shrink-0 border-b border-border-subtle">
          <DrawerTitle className="flex items-center gap-1.5 text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            {t('Ce qui s’est passé')}
          </DrawerTitle>
        </DrawerHeader>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )

  if (collapsed) {
    return (
      <>
        {drawer}
        {collapsedTab(t, toggle, count)}
      </>
    )
  }

  return (
    <>
      {drawer}
      {expandedColumn(t, toggle, children)}
    </>
  )
}

/** La colonne repliée, réduite à sa languette — au-dessus de `xl` seulement. */
function collapsedTab(t: (text: string) => string, toggle: () => void, count: number) {
  {
    return (
      /* Repliée, la colonne devient une LANGUETTE VERTICALE de 40 pixels. Elle ne
         disparaît pas entièrement : un panneau qu'on a fermé et dont plus rien ne
         signale l'existence est un panneau qu'on ne rouvrira jamais. */
      /* Le repère porte un NOM, comme sa version dépliée. Il n'en avait pas, et
         l'asymétrie était réelle : replier la colonne faisait disparaître un repère
         nommé de la liste des régions d'un lecteur d'écran, et le remplaçait par un
         repère anonyme. Un repère sans nom n'aide personne à s'orienter. */
      <aside className="hidden shrink-0 xl:block" aria-label={t('Actualités de l’actif')}>
        <button
          type="button"
          onClick={toggle}
          title={t('Afficher les actualités')}
          className="sticky top-32 flex flex-col items-center gap-2 rounded-card border border-border-subtle bg-surface px-2 py-3 text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
        >
          <PanelRight className="h-4 w-4" aria-hidden="true" />
          {/* Le texte tourne d'un quart de tour : dans 40 pixels de large, c'est la
              seule façon d'écrire un mot entier plutôt qu'une icône seule. */}
          <span className="text-[0.6875rem] font-medium [writing-mode:vertical-rl]">
            {t('Actualités')}
            {count > 0 ? ` · ${count}` : ''}
          </span>
        </button>
      </aside>
    )
  }
}

/** La colonne dépliée — au-dessus de `xl` seulement. */
function expandedColumn(
  t: (text: string) => string,
  toggle: () => void,
  children: React.ReactNode,
) {
  return (
    <aside
      /* ── LE FILET QUI SÉPARE LA COLONNE DU CONTENU ────────────────────────
         Le pendant droit de celui que `.asset-rail` pose à gauche des sections
         (voir `globals.css`) : la fiche porte les deux délimitations verticales de
         la référence, une de chaque côté du graphique.

         `border-l` + `pl-6`, et non un `gap` plus large : une gouttière laisserait
         le filet flotter au milieu du vide. Attaché à la colonne, il en marque le
         bord — et la rangée étant en `items-stretch` (voir `AssetLayoutFrame`), il
         court sur toute la hauteur de la fiche au lieu de s'arrêter au dernier
         article. C'est exactement le montage de `NewsSidebar`, sur l'accueil.

         La largeur passe de 20 à 22 rem pour absorber le rembourrage : sans cela,
         la colonne perdrait 24 pixels de texte au profit du filet. */
      className="hidden w-[22rem] shrink-0 border-l border-border-subtle pl-6 xl:block"
      aria-label={t('Actualités de l’actif')}
    >
      {/*
        ══════════════════════════════════════════════════════════════════════
        LA COLONNE A SON PROPRE ASCENSEUR, ET RESTE VISIBLE JUSQU'EN BAS
        ══════════════════════════════════════════════════════════════════════

        Deux exigences qui paraissent s'exclure, et qui ne s'excluent pas :

          1. le fil défile CHEZ LUI, sans entraîner la page ;
          2. il reste à l'écran quoi qu'on fasse défiler, du haut jusqu'au bas.

        ── CE QUI A ÉTÉ ESSAYÉ AVANT, ET POURQUOI ON EN REVIENT ──────────────

        La version précédente supprimait l'ascenseur imbriqué et faisait défiler le fil
        AVEC la page, en le suivant par un `top` négatif mesuré. Le motif était réel :
        deux surfaces de défilement emboîtées piègent la molette — elle agit sur celle
        que le curseur survole, si bien qu'en descendant on tombe dans le fil, la page
        se fige, et l'on croit avoir atteint le bas.

        Mais ce montage avait son propre défaut : la colonne ne restait PAS visible.
        Elle remontait hors du champ à mesure qu'on descendait, jusqu'à ce que sa fin
        affleure le bas — après quoi le haut du fil, titre compris, était sorti de
        l'écran. Sur une fiche de plusieurs milliers de pixels, le panneau finissait
        donc par disparaître.

        ── CE QUI RÈGLE LE PIÈGE DE LA MOLETTE : `overscroll-contain` ────────

        C'est la propriété faite pour cela. Elle empêche le défilement d'une surface
        interne de se PROPAGER à son parent quand elle atteint sa butée : on peut donc
        lire le fil jusqu'au bout sans que la page bouge d'un pixel, et redescendre la
        page sans que le fil intercepte quoi que ce soit dès que le curseur en sort.

        Le montage devient alors le plus simple des trois :

            sticky top-32  +  hauteur bornée à la fenêtre  +  overflow-y-auto

        `top-32` (128 px) laisse passer les DEUX éléments collants qui la précèdent :
        l'en-tête du site (64 px) et la rangée de sommaire (48 px), plus une gouttière
        de 16. C'était `top-40` du temps où la fiche portait une TROISIÈME bande — la
        barre d'identité, qui a depuis fusionné avec le sommaire (voir
        `AssetLayoutFrame`). La colonne se collait donc 32 pixels trop bas, et son
        premier article s'alignait sur rien.

        La hauteur est bornée à ce qui reste sous elles, à quoi s'ajoute une marge
        basse : `100vh − 128 − 32`, soit les 10 rem ci-dessous. Les deux valeurs ne
        peuvent pas diverger sans que le panneau dépasse la fenêtre.

        C'est exactement la forme de CoinGecko, et le crochet de mesure
        `useTailStickyTop` disparaît avec ce changement : plus rien à mesurer, le CSS
        suffit — et avec lui s'en va le `ResizeObserver` dont le rattachement au
        remontage du panneau avait déjà coûté une correction.
      */}
      <div className="sticky top-32 flex max-h-[calc(100vh-10rem)] flex-col">
        {/*
          ── LE BOUTON DE REPLI PASSE À GAUCHE DU TITRE ──────────────────────

          Il fermait la rangée, à l'opposé du titre, séparé de lui par tout l'espace de
          la colonne. Un bouton posé au bout d'un vide de trois cents pixels ne se
          rattache à rien : il pouvait aussi bien commander le premier article.

          Collé au titre, il commande visiblement CE panneau. C'est aussi le sens du
          geste — l'icône pousse le panneau vers la droite, et elle part maintenant du
          bord vers lequel la colonne va disparaître.

          `justify-start` et non plus `justify-between` : c'est le changement qui compte,
          le reste suit.
        */}
        {/* `shrink-0` : l'en-tête ne doit PAS se comprimer quand le fil déborde. Sans
            lui, un conteneur flexible réduit d'abord ses enfants avant de faire défiler
            — le titre s'écraserait et le bouton perdrait sa zone de clic. */}
        <div className="flex shrink-0 items-center gap-2 pb-2">
          <IconButton
            size="icon-xs"
            variant="ghost"
            onClick={toggle}
            label={t('Masquer les actualités')}
            icon={PanelRight}
            className="shrink-0"
          />

          <h2 className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />{t('Ce qui s’est passé')}</h2>
        </div>

        {/*
          ── LA SURFACE DÉFILANTE, ET SES TROIS CLASSES QUI COMPTENT ──────────

          · `overflow-y-auto` — l'ascenseur, demandé ;
          · `overscroll-contain` — LA classe qui rend le montage acceptable : arrivé en
            butée, le défilement du fil ne se propage pas à la page. C'est ce qui évite
            le piège classique des deux surfaces emboîtées (voir l'en-tête du panneau) ;
          · `min-h-0` — obligatoire, et son absence ne se voit pas dans le code : un
            enfant de conteneur flexible a une hauteur minimale égale à son contenu, si
            bien que `max-h` sur le parent n'aurait AUCUN effet et que la colonne
            dépasserait la fenêtre sans jamais montrer d'ascenseur.

          `pr-1 -mr-1` : la barre de défilement occupe sa place sans rogner le texte ni
          décaler la colonne quand elle apparaît.
        */}
        {/* `scrollbar-none` : même retrait que sur la colonne de l'accueil, et pour la
            même raison — voir `NewsSidebar`. La compensation `pr-1 -mr-1` part avec la
            barre qu'elle servait à loger. */}
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </aside>
  )
}
