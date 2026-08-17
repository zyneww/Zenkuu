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
  aside,
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
  /**
   * Colonne d'actualités, à droite du contenu.
   *
   * ── ELLE REVIENT, ET LE COMMENTAIRE DU HAUT DE CE FICHIER A EU TORT ─────
   *
   * Il explique longuement pourquoi la colonne a été retirée : elle doublait la
   * section « Actualités » sur une page devenue unique. Le constat était exact et la
   * conclusion inverseée — c'est la SECTION qui a été supprimée depuis, pas la
   * colonne. Voir l'en-tête de `AssetNewsAside` pour le raisonnement complet.
   *
   * Elle est passée par ici plutôt que rendue dans les sections, parce qu'elle doit
   * accompagner la page ENTIÈRE : placée dans « Aperçu », elle disparaîtrait dès
   * qu'on descend vers « Places », c'est-à-dire au moment où l'on continue de lire.
   */
  aside?: React.ReactNode
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
      {/*
        ── TROIS COLONNES À PARTIR DE `xl`, DEUX À `lg`, UNE EN DESSOUS ───────

        La colonne d'actualités n'entre PAS dans la grille : elle est posée en frère
        d'un conteneur `flex`, avec sa propre largeur fixe. Le motif est concret — une
        troisième piste de grille exigerait de redéclarer les deux autres à chaque
        point d'arrêt, et de définir ce que devient la piste vide quand la colonne est
        repliée. En `flex`, elle se retire d'elle-même et le contenu reprend la place.

        `min-w-0` sur la zone centrale est OBLIGATOIRE et non décoratif : un enfant de
        `flex` a une largeur minimale automatique égale à son contenu, et le graphique
        comme les tableaux dépasseraient alors leur colonne au lieu de défiler — c'est
        le piège que `scripts/audit-overflow.mjs` existe pour traquer.
      */}
      {/*
        ══════════════════════════════════════════════════════════════════════
        ⚠️ `items-stretch` ET NON `items-start` — LA COLONNE COLLANTE EN DÉPEND
        ══════════════════════════════════════════════════════════════════════

        Cette rangée portait `items-start`, ce qui paraît anodin et cassait le
        comportement collant de la colonne d'actualités. Constaté au navigateur : à
        3000 pixels de défilement, le panneau était à −2719, c'est-à-dire très loin
        hors de l'écran.

        La raison n'est pas dans le panneau mais ICI. `position: sticky` ne peut se
        déplacer que DANS LA BOÎTE DE SON PARENT : c'est la course dont il dispose. Avec
        `items-start`, la colonne prend la hauteur de son contenu — un millier de pixels
        — alors que la rangée en fait plusieurs milliers. Le panneau remplissait donc sa
        colonne entièrement, sans un pixel de course, et défilait comme un bloc ordinaire.

        `items-stretch` (le défaut de flexbox, ici écrit en clair pour qu'on ne le
        retire pas par distraction) étire la colonne sur toute la hauteur de la rangée.
        Le panneau y trouve alors la course qu'il lui faut et reste visible jusqu'en bas.

        Ce qui justifiait `items-start` a disparu depuis : la zone centrale était une
        GRILLE dont les pistes s'étiraient, et l'alignement en tête évitait que le rail
        de chiffres ne soit distendu. Le rail flotte désormais (voir plus bas), et un
        flottant ne s'étire pas.
      */}
      <div className="flex items-stretch gap-6 pt-4">
        {/*
          ── LA GRILLE A CÉDÉ LA PLACE À UN FLOTTANT ───────────────────────────

          Cette zone était `grid lg:grid-cols-[18rem_1fr]`. Une grille impose ses
          pistes sur TOUTE sa hauteur : le rail s'arrêtait après la fiche technique et
          laissait dix-huit rems de vide sur des milliers de pixels, pendant que les
          tableaux de droite étaient à l'étroit.

          Le rail flotte donc, et chaque section ouvre son propre contexte de
          formatage : elle se rétrécit tant qu'elle longe le rail, et reprend toute la
          largeur dès qu'elle commence sous lui. Les trois règles et leur raisonnement
          complet vivent dans `globals.css` — c'est du CSS pur, sans mesure ni
          JavaScript.

          `flow-root` sur le conteneur : sans lui, un flottant plus haut que ses
          voisines déborderait hors de cette boîte et passerait sous la colonne
          d'actualités.

          `min-w-0` reste OBLIGATOIRE, et pour la raison notée plus bas : un enfant de
          `flex` a une largeur minimale égale à son contenu, et les tableaux
          dépasseraient leur colonne au lieu de défiler.
        */}
        <div className="min-w-0 flex-1 [display:flow-root]">
          <div className="asset-rail min-w-0">{rail}</div>
          {children}
        </div>

        {/*
          LA COLONNE EST ENVELOPPÉE, ET CE N'EST PAS COSMÉTIQUE.

          Posée nue en second enfant du conteneur flexible, elle faisait apparaître un
          avertissement de clé manquante pointant sur ce composant — le compilateur
          React, actif sur ce projet, regroupe les enfants dynamiques d'un même parent
          en tableau lorsqu'il les mémoïse, et un élément reçu en prop n'a pas de clé à
          lui.

          L'enveloppe rend le second enfant STATIQUE : le tableau disparaît, et avec lui
          la question de la clé. Elle ne coûte aucun nœud visible — `contents` retire la
          boîte de la mise en page, la colonne se pose donc exactement comme avant.
        */}
        <div className="contents">{aside}</div>
      </div>
    </>
  )
}
