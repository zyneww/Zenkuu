'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'

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
 * ── LA DIRECTIVE `'use client'` EST REVENUE, ET POUR UNE SEULE RAISON ────────
 *
 * Elle avait disparu quand le fichier a perdu ses deux boutons : il ne faisait plus
 * que placer des colonnes, sans un seul crochet. Elle revient avec la FUSION DES DEUX
 * BANDES COLLANTES (voir plus bas) — ce composant possède désormais la rangée de
 * sommaire, et doit savoir si elle est collée ou non.
 *
 * Le coût est nul : son unique appelant, `AssetTabs`, est lui-même un composant
 * client, et un module importé par un composant client en devient un.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * TROIS BANDES COLLANTES SONT DEVENUES DEUX
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La fiche empilait, du haut vers le bas : l'en-tête du site (64 px), une bande
 * d'identité `fixed` qui apparaissait au défilement (48 px), puis cette rangée de
 * sommaire (44 px). Soit 156 pixels de chrome permanent au-dessus d'une page dont le
 * contenu est un graphique — et, au milieu de la bande d'identité, un vide de
 * plusieurs centaines de pixels que rien n'occupait.
 *
 * Les deux dernières n'en font plus qu'une. Cette rangée porte les onglets en
 * permanence et RÉVÈLE l'identité de l'actif — logo, nom, code, cours, variation —
 * dès qu'elle se colle, c'est-à-dire au moment précis où l'en-tête de la fiche quitte
 * l'écran. C'est ce que fait la référence, et la page y gagne 44 pixels de hauteur
 * utile à chaque écran.
 *
 * ── COMMENT ON SAIT QU'ELLE EST COLLÉE ───────────────────────────────────────
 *
 * `position: sticky` ne prévient de rien : il n'existe ni événement ni pseudo-classe
 * pour l'état « collé » (`:stuck` a été proposé, jamais implémenté). Le motif retenu
 * est celui que tout le monde emploie — une SENTINELLE d'un pixel posée juste
 * au-dessus de la rangée. Tant qu'elle est visible, la rangée est dans le flux ; dès
 * qu'elle passe sous l'en-tête du site, la rangée est collée.
 *
 * ⚠️ Cette sentinelle-ci n'a rien à voir avec celle que portait `AssetStickyBar` : la
 * sienne vivait dans le rail de chiffres et son emplacement était un piège documenté.
 * Celle-ci est le frère immédiat de la rangée qu'elle surveille — elle ne peut pas
 * être déplacée par erreur sans que le rapport saute aux yeux.
 *
 * La marge haute de l'observateur vaut la hauteur de l'en-tête, MESURÉE et non écrite
 * en dur : la coder à 64 marcherait aujourd'hui et se décalerait au premier changement
 * de son rembourrage, sans que rien ne le signale.
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
  identity,
  aside,
  children,
}: {
  rail: React.ReactNode
  /**
   * Barre de sommaire, rendue PLEINE LARGEUR au-dessus de la grille.
   *
   * ── ELLE EST COLLANTE ─────────────────────────────────────────────────────
   *
   * Tant qu'elle commandait des panneaux exclusifs, elle n'avait pas à suivre : on la
   * quittait des yeux dès le clic, et le panneau demandé occupait l'écran. Sur une
   * page unique, elle est le seul repère qui dise OÙ L'ON EST dans une fiche de
   * plusieurs milliers de pixels. Elle doit donc rester à l'écran.
   *
   * Elle s'arrête à `--header-height` et non plus à 112 pixels : la bande d'identité
   * qui occupait les 48 pixels intermédiaires a fusionné avec elle (voir l'en-tête).
   * La valeur est LUE dans le jeton plutôt que recopiée — les deux ne peuvent donc
   * plus diverger.
   *
   * Le fond est OPAQUE (`bg-canvas`) et non translucide : le contenu qui passe
   * derrière une bande de 44 pixels au milieu d'un graphique se lit comme une
   * salissure, là où le même effet sur un en-tête de 64 pixels passe pour une matière.
   */
  tabsBar?: React.ReactNode
  /**
   * Identité compacte de l'actif — révélée quand la rangée se colle.
   *
   * Elle arrive en nœud déjà rendu plutôt qu'en données : c'est `AssetStickyBar`, un
   * composant client branché sur le flux de cours, et ce cadre n'a aucune raison de
   * connaître la notion d'actif. Il place des colonnes et tient une rangée.
   */
  identity?: React.ReactNode
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
  /* Déstructuré ICI, et non lu par `stuck.xxx` au fil du rendu : le compilateur React
     traite tout accès de membre sur un objet qui PORTE une référence comme un accès à
     cette référence pendant le rendu, et le refuse. La déstructuration sort le booléen
     de l'objet une fois pour toutes. */
  const { sentinelRef, stuck } = useStuck()

  return (
    <>
      {/* La SENTINELLE de la rangée collante — voir l'en-tête. Un pixel de haut, dans
          le flux, juste avant elle : c'est sa sortie de l'écran qui dit que la rangée
          s'est collée. `col-span-full` n'est pas nécessaire ici (ce conteneur n'est pas
          une grille), et son absence est délibérée : la sentinelle ne doit pas être
          confondue avec celle, plus délicate, que portait `AssetStickyBar`. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {/* ── LA RANGÉE PORTE LE SOMMAIRE, ET L'IDENTITÉ QUAND ELLE EST COLLÉE ──

          Elle a porté deux groupes (sommaire à gauche, réglages de page à droite), puis
          le sommaire seul. Elle porte aujourd'hui le sommaire et, dès qu'elle se colle,
          l'identité de l'actif que la bande `fixed` d'autrefois affichait sur sa propre
          ligne. Voir l'en-tête pour ce que cette fusion a rendu à la page.

          `gap-3` et `items-center` : trois groupes de hauteurs différentes — une ligne
          d'identité de 20 pixels, des onglets de 44, un bouton de 28 — qui doivent
          partager une ligne de base optique. `items-end`, qui alignait autrefois deux
          groupes au-dessus du même filet, les aurait tous collés au trait de
          sélection. */}
      <div className="sticky top-[var(--header-height)] z-30 flex items-center gap-3 border-b border-border-subtle bg-canvas">
        {/*
          ── L'IDENTITÉ APPARAÎT, ELLE NE POUSSE PAS ────────────────────────────

          Elle est rendue EN PERMANENCE et seulement masquée : la monter au moment où
          la rangée se colle ferait sauter les onglets de deux cents pixels vers la
          droite au premier défilement, et le trait de sélection — mesuré en pixels sur
          le bouton actif — se retrouverait à côté de sa cible le temps d'une image.

          `w-0 overflow-hidden` plutôt que `hidden` : le groupe garde sa place dans
          l'arbre et ses mesures restent valides, mais il ne prélève aucune largeur tant
          qu'il est replié. La transition porte donc sur une largeur qui s'ouvre, ce qui
          se lit comme un glissement et non comme une apparition.

          `inert` retire l'ensemble du parcours clavier quand il est replié — un contenu
          de largeur nulle reste focalisable sans cet attribut, et la tabulation s'y
          perdrait.
        */}
        {identity !== undefined ? (
          <div
            aria-hidden={!stuck}
            inert={!stuck}
            className={`flex shrink-0 items-center gap-2 overflow-hidden transition-[width,opacity] duration-200 ${
              stuck ? 'w-auto opacity-100' : 'w-0 opacity-0'
            }`}
          >
            {identity}
          </div>
        ) : null}

        {tabsBar !== undefined ? <div className="min-w-0 flex-1">{tabsBar}</div> : null}

        {/*
          ── LE RETOUR EN HAUT SUIT L'IDENTITÉ ──────────────────────────────────

          Il appartenait à la bande `fixed` et la fermait à droite. Il reste attaché au
          même état : il n'a de sens qu'une fois la page défilée, et une flèche « haut
          de page » affichée en haut de page ne commande rien.

          Le libellé subsiste en `aria-label` — voir `IconButton`. C'est la convention
          de CoinGecko et de TradingView : à vingt-huit pixels, l'icône tient partout, y
          compris sur téléphone où la fiche fait le plus d'écrans.
        */}
        <div
          aria-hidden={!stuck}
          inert={!stuck}
          className={`shrink-0 transition-opacity duration-200 ${
            stuck ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <IconButton
            size="icon-xs"
            variant="outline"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            label="Remonter en haut de la page"
            icon={ArrowUp}
          />
        </div>
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

/**
 * « La rangée de sommaire est-elle collée ? »
 *
 * ── UN OBSERVATEUR, PAS UN ÉCOUTEUR DE DÉFILEMENT ────────────────────────────
 *
 * Un `scroll` réveillerait le fil principal à chaque image pendant toute la descente
 * de la page — plusieurs milliers de pixels sur une fiche — pour ne changer d'avis que
 * deux fois. `IntersectionObserver` ne le réveille qu'au franchissement.
 *
 * ── LA HAUTEUR DE L'EN-TÊTE EST MESURÉE ──────────────────────────────────────
 *
 * Elle sert de marge haute à l'observateur : la sentinelle doit être déclarée « sortie »
 * quand elle passe DERRIÈRE l'en-tête collant, pas quand elle quitte la fenêtre — ce
 * qui arriverait 64 pixels trop tard. Écrire 64 en dur marcherait aujourd'hui et se
 * décalerait au premier changement de son rembourrage ; on lit donc le nœud, par
 * `data-site-header`, comme le faisait déjà l'ancienne bande.
 *
 * ── LE PREMIER RENDU DIT « NON COLLÉE », ET C'EST LE BON DÉFAUT ──────────────
 *
 * C'est l'état d'une page au chargement, et c'est aussi ce que le serveur rend : aucun
 * écart d'hydratation, et l'identité ne clignote pas avant de se replier.
 */
function useStuck(): { sentinelRef: React.RefObject<HTMLDivElement | null>; stuck: boolean } {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const [offset, setOffset] = useState(64)

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector<HTMLElement>('[data-site-header]')
      setOffset(header?.getBoundingClientRect().height ?? 64)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry?.isIntersecting),
      { rootMargin: `-${offset}px 0px 0px 0px`, threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [offset])

  return { sentinelRef, stuck }
}
