'use client'

import { PanelRight, Sparkles } from 'lucide-react'
import { useSyncExternalStore } from 'react'

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
 * ── ELLE DISPARAÎT SOUS 1280 PIXELS, SANS BOUTON POUR LA RAPPELER ───────────
 *
 * En dessous, la page tient déjà deux colonnes — le rail de chiffres et le contenu —
 * et une troisième les réduirait toutes les trois. Le fil reste atteignable :
 * `/actualites` porte le même flux, filtrable par actif.
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
 * hauteur bornée à la fenêtre, `sticky top-40` la fixe, et il n'y a plus rien à
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

  if (collapsed) {
    return (
      /* Repliée, la colonne devient une LANGUETTE VERTICALE de 40 pixels. Elle ne
         disparaît pas entièrement : un panneau qu'on a fermé et dont plus rien ne
         signale l'existence est un panneau qu'on ne rouvrira jamais. */
      /* Le repère porte un NOM, comme sa version dépliée. Il n'en avait pas, et
         l'asymétrie était réelle : replier la colonne faisait disparaître un repère
         nommé de la liste des régions d'un lecteur d'écran, et le remplaçait par un
         repère anonyme. Un repère sans nom n'aide personne à s'orienter. */
      <aside className="hidden shrink-0 xl:block" aria-label="Actualités de l’actif">
        <button
          type="button"
          onClick={toggle}
          title="Afficher les actualités"
          className="sticky top-40 flex flex-col items-center gap-2 rounded-card border border-border-subtle bg-surface px-2 py-3 text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
        >
          <PanelRight className="h-4 w-4" aria-hidden="true" />
          {/* Le texte tourne d'un quart de tour : dans 40 pixels de large, c'est la
              seule façon d'écrire un mot entier plutôt qu'une icône seule. */}
          <span className="text-[0.6875rem] font-medium [writing-mode:vertical-rl]">
            Actualités
            {count > 0 ? ` · ${count}` : ''}
          </span>
        </button>
      </aside>
    )
  }

  return (
    <aside className="hidden w-[20rem] shrink-0 xl:block" aria-label="Actualités de l’actif">
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

            sticky top-40  +  hauteur bornée à la fenêtre  +  overflow-y-auto

        `top-40` (160 px) laisse passer l'en-tête du site, la barre d'identité et la
        barre de sommaire — les trois éléments collants qui la précèdent. La hauteur est
        bornée à ce qui reste sous elles, à quoi s'ajoute une marge basse.

        C'est exactement la forme de CoinGecko, et le crochet de mesure
        `useTailStickyTop` disparaît avec ce changement : plus rien à mesurer, le CSS
        suffit — et avec lui s'en va le `ResizeObserver` dont le rattachement au
        remontage du panneau avait déjà coûté une correction.
      */}
      <div className="sticky top-40 flex max-h-[calc(100vh-11rem)] flex-col">
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
          <button
            type="button"
            onClick={toggle}
            title="Masquer les actualités"
            aria-label="Masquer les actualités"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
          >
            <PanelRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <h2 className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
            Ce qui s’est passé
          </h2>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 -mr-1">
          {children}
        </div>
      </div>
    </aside>
  )
}
