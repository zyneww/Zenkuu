'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { usePhrase } from '@/components/locale/ContentProvider'

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
  identity,
  aside,
  children,
}: {
  rail: React.ReactNode
  /**
   * Identité compacte de l'actif — montrée quand la page a été défilée.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ TROIS PROPS ONT DISPARU D'ICI : `tabsBar`, `headline` ET `quote`
   * ══════════════════════════════════════════════════════════════════════════
   *
   * La rangée collante portait, à l'état déplié, l'identité COMPLÈTE à gauche, le
   * bloc de cours à droite et la barre de sommaire en bande basse — 170 pixels de
   * chrome au-dessus du contenu, qui se repliaient en 56 au défilement.
   *
   * Les trois ont été retirés du produit : le sommaire n'existe plus (la fiche est
   * une page qu'on descend), l'identité complète et le cours ont pris la forme de
   * la référence — un en-tête ordinaire, puis une carte de cours en tête de colonne
   * (voir `AssetHeadline` et `AssetPriceCard`).
   *
   * Ce qui reste ici est ce que ces deux blocs NE FONT PAS : accompagner la page
   * une fois qu'on l'a quittée des yeux. La rangée n'a donc plus de forme dépliée,
   * seulement une bande qui apparaît au défilement.
   *
   * ── ELLE NE PREND PLUS UN PIXEL AU FLUX ───────────────────────────────────
   *
   * C'est la conséquence la plus utile du retrait. La rangée changeait de HAUTEUR
   * en se collant, et `position: sticky` gardant l'élément dans le flux, tout le
   * contenu remontait de 114 pixels à cet instant précis. Un cale d'une hauteur
   * inverse existait pour compenser, et les deux valeurs devaient être tenues
   * accordées à la main.
   *
   * La rangée est désormais une boîte de hauteur NULLE, dont la bande est posée en
   * absolu. Elle ne participe donc plus à la mise en page : rien ne bouge quand elle
   * apparaît, et il n'y a plus de cale ni de couple de valeurs à maintenir.
   *
   * Elle arrive en nœud déjà rendu plutôt qu'en données : c'est `AssetStickyBar`, un
   * composant client branché sur le flux de cours, et ce cadre n'a aucune raison de
   * connaître la notion d'actif. Il place des colonnes et tient une bande.
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
  const t = usePhrase()
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

      {/* ══════════════════════════════════════════════════════════════════════
          LA BANDE D'ACCOMPAGNEMENT — HAUTEUR NULLE DANS LE FLUX

          ── CE QU'ELLE REMPLACE ─────────────────────────────────────────────

          Une rangée collante de 170 pixels qui portait l'identité complète, le bloc
          de cours et la barre de sommaire, et se repliait en 56 au défilement. Les
          trois contenus sont partis (voir la note de la prop `identity`), et avec eux
          la mécanique qu'ils imposaient : deux états superposés en fondu, un `pb-7`
          mesuré au pixel, et un cale d'exactement 7,125rem chargé de rendre au flux
          ce que le repli lui prenait.

          ── POURQUOI LA BOÎTE EST DE HAUTEUR NULLE ──────────────────────────

          `position: sticky` ne sort PAS l'élément du flux : sa boîte continue
          d'occuper sa place. Une bande qui apparaît en changeant de hauteur déplace
          donc tout ce qui la suit, à l'instant précis où elle apparaît — un saut sous
          les yeux, pendant qu'on défile. C'est ce que le cale compensait.

          Une boîte à `h-0` dont la bande est posée en ABSOLU ne participe à aucun
          calcul de mise en page. La bande se peint par-dessus le contenu quand elle
          se montre, et rien ne bouge — sans cale, et sans deux valeurs à tenir
          accordées à la main.

          Le fond est OPAQUE (`bg-canvas`) et non translucide : le contenu qui passe
          derrière une bande de 56 pixels au milieu d'un graphique se lit comme une
          salissure, là où le même effet sur l'en-tête du site passe pour une matière.

          `top-[var(--header-height)]` est LU dans le jeton plutôt que recopié : la
          bande se pose sous l'en-tête du site, et les deux ne peuvent pas diverger.
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-[var(--header-height)] z-30 h-0">
        <div
          aria-hidden={!stuck}
          inert={!stuck}
          /* `invisible` EN PLUS de `opacity-0` : une opacité nulle laisse le contenu
             cliquable. `inert` couvre le clavier, `invisible` couvre le pointeur —
             les deux sont nécessaires, et l'oubli du second faisait cliquer sur un
             bouton qu'on ne voyait plus. */
          className={`absolute inset-x-0 top-0 flex h-14 items-center gap-4 border-b border-border-subtle bg-canvas transition-opacity duration-300 ${
            stuck ? 'visible opacity-100' : 'invisible opacity-0'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">{identity}</div>

          {/* La flèche n'a de sens qu'une fois la page défilée — affichée en haut de
              page, elle ne commande rien. Elle vit donc dans la bande, qui n'existe
              qu'à ce moment-là. */}
          <IconButton
            size="icon-xs"
            variant="outline"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            label={t('Remonter en haut de la page')}
            icon={ArrowUp}
            className="shrink-0"
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

          {/*
            ── LA RANGÉE D'ONGLETS OUVRE LA COLONNE PRINCIPALE ──────────────────

            C'est la place de la référence, au pixel près : à gauche, en tête de la
            colonne du graphique, séparée de lui par un filet, et non centrée dans une
            bande qui traverse la page.

            `[display:flow-root]` : sans lui, cette boîte n'ouvrirait pas de contexte de
            formatage et se glisserait SOUS le rail flottant au lieu de commencer à sa
            droite. C'est la même règle que `.asset-section`, et elle est écrite ici
            plutôt qu'en classe utilitaire parce qu'elle ne vaut qu'au-dessus de `lg` —
            en dessous le rail ne flotte pas, et un contexte de formatage de plus n'y
            change rien.

            `mb-4` : le filet de la rangée doit respirer avant la barre d'outils du
            graphique, sans quoi les deux se lisent comme un seul bloc de commandes.
          */}
          {/* ⚠️ LA RANGÉE D'ONGLETS N'EST PLUS ICI — elle a rejoint la bande collante,
              où elle reste atteignable une fois la page défilée. Voir sa note là-haut.
              Le filet qui la soulignait appartenait à cette rangée : il part avec elle,
              la bande collante ayant déjà le sien. */}
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
