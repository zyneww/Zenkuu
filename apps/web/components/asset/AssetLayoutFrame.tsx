/**
 * Cadre à deux colonnes de la fiche : les chiffres à gauche, le contenu à droite.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CE FICHIER A PERDU SES DEUX BOUTONS, ET C'EST L'ESSENTIEL DE SON HISTOIRE.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La rangée du sommaire portait à droite deux commandes : « Actualités », qui
 * dépliait une troisième colonne d'articles, et « Rail complet », un menu à trois
 * dispositions (rail large, rail étroit, chiffres en bandeau pleine largeur), dont le
 * choix était mémorisé d'une visite à l'autre.
 *
 * ── POURQUOI LA COLONNE D'ACTUALITÉS DISPARAÎT ────────────────────────────────
 *
 * Elle affichait les MÊMES articles que la section « Actualités » de la fiche, dans
 * une présentation plus courte. L'argument d'alors tenait à la lecture simultanée :
 * on parcourait la chronologie EN REGARDANT le graphique, pour rattacher un
 * décrochage à un événement daté — ce que l'onglet, qui remplaçait le graphique, ne
 * permettait pas.
 *
 * Cet argument est mort avec les onglets. La fiche est désormais une page unique où
 * l'on descend du graphique aux actualités par un simple défilement, sans rien
 * perdre en chemin. Maintenir la colonne reviendrait à publier deux fois le même fil
 * à quatre-vingts pixels d'écart.
 *
 * ── POURQUOI LE SÉLECTEUR DE DISPOSITION DISPARAÎT ────────────────────────────
 *
 * Il répondait à une vraie question — sur un portable de treize pouces, le rail
 * prélève 288 pixels sur 900 et la courbe se retrouve à l'étroit — mais il y
 * répondait en la posant AU LECTEUR, qui n'a aucun moyen de savoir laquelle des trois
 * dispositions lui convient avant de les avoir toutes essayées. Trois états à tenir,
 * trois rendus à vérifier, un stockage à lire au montage et le reflux de mise en page
 * qui va avec — pour un réglage que la mesure ne départageait pas.
 *
 * Reste le défaut qu'il servait à corriger, et il se corrige mieux en CSS : le rail
 * passe SOUS le contenu en dessous de `lg`, exactement là où il devenait trop cher.
 * Aucun bouton n'est nécessaire pour cela, et le résultat ne dépend plus de ce que le
 * lecteur a cliqué six mois plus tôt.
 *
 * ── CE QUI SUBSISTE, ET POURQUOI CE FICHIER N'A PAS DISPARU AVEC EUX ──────────
 *
 * La grille elle-même, et la rangée de sommaire pleine largeur qui la surplombe. La
 * barre de sommaire vivait autrefois dans la colonne de droite, avec les panneaux
 * qu'elle commandait ; deux défauts en découlaient. De forme : son filet s'arrêtait
 * au bord de la colonne, si bien que la page portait deux traits horizontaux de
 * longueurs différentes à quelques pixels l'un de l'autre. De fond : la barre NOMME
 * les sections de la fiche entière, et la reléguer à droite la faisait lire comme un
 * réglage du graphique, au même rang que « Prix ▾ » ou « Comparer ▾ ».
 *
 * ── LA DIRECTIVE `'use client'` TOMBE, SANS QUE LE FICHIER CHANGE DE CAMP ─────
 *
 * Elle était là pour ses deux boutons, son stockage local et ses trois effets. Rien
 * de tout cela ne subsiste : le composant ne fait plus que placer deux colonnes, sans
 * un seul crochet.
 *
 * Il reste néanmoins DANS le paquet client, parce que son unique appelant —
 * `AssetTabs` — en est un : un module importé par un composant client le devient. Ce
 * qu'on gagne n'est donc pas du poids mais de la clarté, et la liberté de l'appeler
 * un jour depuis un composant serveur sans avoir à le démonter d'abord.
 *
 * ── CE QUE LA MESURE AVAIT APPRIS, ET QUI RESTE VRAI ──────────────────────────
 *
 * Relevé au navigateur sur la fiche du bitcoin, fenêtre de 2390 px : le rail faisait
 * 1884 pixels de haut pour un contenu de 1147. Ce déséquilibre était l'argument de la
 * disposition « pleine largeur ». Il se résorbe autrement depuis que la page est
 * unique : le contenu de droite ne vaut plus un onglet mais CINQ sections empilées,
 * soit plusieurs milliers de pixels. C'est désormais le rail qui est le plus court.
 */

export function AssetLayoutFrame({
  rail,
  tabsBar,
  children,
}: {
  rail: React.ReactNode
  /**
   * Barre de sommaire, rendue PLEINE LARGEUR au-dessus de la grille.
   *
   * ── ELLE EST COLLANTE, ET C'EST NOUVEAU ───────────────────────────────────
   *
   * Tant qu'elle commandait des panneaux exclusifs, elle n'avait pas à suivre : on la
   * quittait des yeux dès le clic, et le panneau demandé occupait l'écran. Sur une
   * page unique, elle est le seul repère qui dise OÙ L'ON EST dans une fiche de
   * plusieurs milliers de pixels. Elle doit donc rester à l'écran.
   *
   * `top-28`, soit 112 pixels, et la valeur n'est pas choisie au jugé : l'en-tête du
   * site occupe les 64 premiers pixels et la barre d'identité de la fiche les 48
   * suivants. S'arrêter plus haut la ferait glisser sous l'une des deux.
   *
   * Le fond est OPAQUE (`bg-canvas`) et non translucide : le contenu qui passe
   * derrière une bande de 44 pixels au milieu d'un graphique se lit comme une
   * salissure, là où le même effet sur un en-tête de 64 pixels passe pour une matière.
   */
  tabsBar?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      {/* ── UNE SEULE RANGÉE POUR LE SOMMAIRE ─────────────────────────────────

          Elle en portait deux : le sommaire à gauche, les réglages de page à droite.
          Trente pixels de vide séparaient les deux groupes, pour deux contrôles qui
          tenaient largement sur une ligne — puis les deux contrôles ont été retirés
          (voir l'en-tête), et il ne reste que le sommaire.

          `items-end` était là pour aligner deux groupes de hauteurs différentes au-
          dessus du même filet. Il n'a plus rien à aligner et disparaît avec eux. */}
      <div className="sticky top-28 z-30 flex border-b border-border-subtle bg-canvas">
        {tabsBar !== undefined ? <div className="min-w-0 flex-1">{tabsBar}</div> : null}
      </div>

      {/*
        ── LA GRILLE, ET LE SEUIL QUI LA COMMANDE ─────────────────────────────

        Deux colonnes à partir de `lg`, une seule en dessous.

        Le rail est PREMIER dans le document, et il le reste. Deux raisons, dont une
        seule saute aux yeux. Sur téléphone, la grille s'effondre en une colonne et les
        chiffres arrivent donc avant le graphique — ce qui est le bon ordre : une
        courbe dont l'échelle est illisible sur 375 pixels apprend moins que quatre
        nombres. Et surtout, la sentinelle de la barre d'identité collante est le
        PREMIER ENFANT du rail : sa position dans le flux définit le seuil auquel cette
        barre apparaît. Reléguer le rail après le contenu la renverrait à plusieurs
        milliers de pixels du haut, donc hors champ dès le chargement, et la barre
        s'afficherait par-dessus le cours qu'elle est censée remplacer. C'est un défaut
        qui a déjà été constaté une fois — voir `AssetStickyBar`.

        `items-start` : sans lui, la colonne courte s'étirerait à la hauteur de la
        longue, et le rail d'une paire de devises — qui n'a ni offre ni communauté —
        finirait par un vide de plusieurs centaines de pixels.

        18rem et non 16 : les groupes du rail sont des panneaux, et un panneau prélève
        32 px de marge interne. À 16rem il ne restait que 224 px pour un libellé, une
        valeur et parfois un écart — d'où les « Plus haut hi… » tronqués. C'est aussi
        la largeur EXACTE de la colonne latérale de la référence, mesurée au navigateur.
      */}
      <div className="grid items-start gap-6 pt-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="min-w-0">{rail}</div>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  )
}
