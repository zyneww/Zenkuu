'use client'

import { Link } from '@/i18n/navigation'
import { useCallback, useState } from 'react'

import { NAV_MENUS } from '@/content/navigation'
import { ZenkuuWordmark } from '@/components/BrandMark'
import { useContent } from '@/components/locale/ContentProvider'
import { AccountControl } from '@/components/account/AccountControl'
import { MobileNav } from '@/components/nav/MobileNav'
import { NavMenus } from '@/components/nav/NavMenus'
import { PreferenceOverlay, type PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { ThemeSync } from '@/components/settings/ThemeSync'
import { HeaderSearch } from '@/components/search/HeaderSearch'
import { AuthDialog } from '@/components/account/AuthDialog'
import type { AuthMode } from '@/components/account/auth-mode'
import { SearchOverlay } from '@/components/search/SearchOverlay'

/**
 * Barre de navigation — pleine largeur, deux groupes aux deux bords.
 *
 * ── LE CONTENU N'EST PLUS CENTRÉ SUR CELUI DE LA PAGE ────────────────────────
 *
 * Il l'était : `.shell` bornait la barre à 1680 px comme le corps, au motif que sur un
 * très grand écran le logo se collait au bord pendant que le contenu commençait trois
 * cents pixels plus loin.
 *
 * Le montage est repris à `.shell-bleed`, et l'argument d'origine tombe pour une
 * raison simple : une barre de navigation n'appartient pas à la page, elle appartient à
 * la FENÊTRE. C'est ce que font les trois références du secteur — OKX, Binance,
 * TradingView : logo collé au bord gauche, actions collées au bord droit, quelle que
 * soit la largeur du contenu en dessous. La barre cesse alors d'être un bandeau posé
 * au-dessus d'une colonne pour devenir le cadre de l'application.
 *
 * L'effet secondaire compte autant que l'intention : la navigation gagne les trois
 * cents pixels que la marge lui prenait, ce qui laisse la place aux panneaux à
 * plusieurs colonnes du nouveau système de menus (voir `NavMenus`).
 *
 * Le `<header>` porte toujours le fond et le filet inférieur, et ce filet a toujours
 * traversé l'écran — c'est le CONTENU qui change de largeur, pas le trait.
 *
 * ── DEUX GROUPES, ET RIEN AU MILIEU ─────────────────────────────────────────
 *
 * À gauche : marque puis menus, sans conteneur intermédiaire — une navigation
 * accrochée au logo commence toujours au même endroit, là où une navigation centrée
 * flotte et se déplace dès qu'on lui ajoute une entrée. À droite : recherche et
 * compte, poussés au bord par `ml-auto`.
 *
 * Voir `.shell` et `.shell-bleed` dans globals.css, seuls endroits où ces largeurs
 * sont définies.
 */
export function NavBar({
  accountsEnabled,
  socialProviders,
}: {
  accountsEnabled: boolean
  /**
   * Fournisseurs d'identité dont les identifiants sont renseignés.
   *
   * Traverse en prop pour la même raison qu'`accountsEnabled` : c'est la lecture d'une
   * variable d'environnement, donc une opération serveur, dont seul le RÉSULTAT —
   * trois libellés au plus — a sa place dans le paquet client.
   */
  socialProviders: readonly string[]
}) {
  const fr = useContent()
  const [searchOpen, setSearchOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  /*
   * L'état des deux fenêtres vit ICI, pas dans les composants qui les déclenchent.
   *
   * Plusieurs entrées les ouvrent — les boutons de session, le menu de réglages, le
   * menu de compte — et la fenêtre de préférences change d'onglet depuis
   * l'intérieur. Un état local à chacun obligerait à passer par un contexte pour un
   * seul niveau de profondeur.
   *
   * `null` = fermée, ce qui évite de tenir un booléen d'ouverture ET un mode en
   * parallèle : deux variables dont l'une peut contredire l'autre.
   */
  const [preferenceTab, setPreferenceTab] = useState<PreferenceTab | null>(null)

  /*
   * LA FENÊTRE D'AUTHENTIFICATION REVIENT DANS CE FICHIER, ET POUR UNE RAISON.
   *
   * Elle en était partie quand la connexion s'était réduite à un champ d'adresse
   * déroulé sous le bouton de compte : un panneau `absolute` s'ancre à son bouton
   * quel que soit le filtre porté par un ancêtre, là où une modale `fixed` s'ancrait
   * à la bande de l'en-tête à cause du `backdrop-filter` que celui-ci porte.
   *
   * Le panneau ne porte plus que deux boutons, et le formulaire — désormais flanqué
   * des fournisseurs d'identité — a retrouvé sa fenêtre. Elle est donc rendue ICI,
   * hors du `<header>`, à côté de la fenêtre de préférences qui résout exactement le
   * même problème de la même façon.
   *
   * `null` = fermée, même convention que `preferenceTab` : un booléen d'ouverture ET
   * un mode en parallèle, ce sont deux variables dont l'une peut contredire l'autre.
   */

  /* STABLES, et il le faut : `HeaderSearch` pose son écouteur de raccourcis dans un
     effet qui dépend de `onOpenOverlay`. Une fonction recréée à chaque rendu ferait
     démonter puis remonter cet écouteur à chaque frappe. */
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closePreference = useCallback(() => setPreferenceTab(null), [])

  /*
   * TOUTE LA MÉCANIQUE DES MENUS A QUITTÉ CE FICHIER.
   *
   * Elle y occupait la moitié du composant : un état d'ouverture, deux temporisations,
   * un écouteur de clic extérieur, un écouteur d'Échap, une remise à zéro au changement
   * de chemin — et un panneau par menu, monté et démonté à tour de rôle.
   *
   * `NavMenus` porte désormais l'ensemble, parce que le nouveau geste l'exige : un
   * panneau UNIQUE qui se déplace d'un menu à l'autre a besoin de connaître la position
   * de tous les boutons, ce qu'un composant par menu ne peut structurellement pas
   * savoir. Voir son en-tête.
   *
   * Ce qui reste ici est ce qui n'est pas un menu : les deux fenêtres modales, la
   * recherche, et la disposition de la barre.
   *
   * LES RACCOURCIS DE RECHERCHE, eux, sont partis plus tôt et pour un autre motif :
   * `Ctrl/⌘ + K` et `/` doivent donner le focus au champ s'il est visible et ouvrir la
   * fenêtre sinon. Cette barre ne peut pas trancher — elle ne sait pas si le champ est
   * replié. La règle vit dans `HeaderSearch`, seul endroit d'où elle s'observe.
   */

  return (
    <>
      {/* `data-site-header` : point d'ancrage STABLE pour les barres qui doivent se
          poser juste en dessous — aujourd'hui la barre d'identité collante des fiches
          d'actif. Un attribut plutôt qu'un sélecteur de classe : `header.sticky`
          marcherait jusqu'au jour où quelqu'un remplacerait `sticky` par autre chose,
          et la barre se glisserait alors silencieusement sous la navigation. */}
      <header
        data-site-header
        /* ── PHASE 3 : `bg-canvas/80 backdrop-blur-md`, LES VALEURS DU DOCUMENT ─────

            À 95 % d'opacité, le flou ne servait à rien : il n'y avait presque rien à
            travers quoi flouter. À 80 %, le contenu défile visiblement sous la barre et
            le flou devient ce qu'il doit être — une matière, pas un réglage.

            ── CE QUE JE N'APPLIQUE PAS DE LA PHASE 3, ET POURQUOI ────────────

            ⚠️ PAS DE PILULE DE NAVIGATION FLOTTANTE. Le document décrit une barre
            aérienne où les menus vivent dans une pilule centrale à fond translucide.
            C'est une belle forme, et elle DÉFERAIT un travail demandé explicitement :
            l'en-tête a été calé sur les mesures de CoinGecko — logo 32 px, liens 13 px
            en graisse 400, hauteur 64 px, conteneur 1 680 px — et l'alignement des
            menus sur la première lettre de leur intitulé a été vérifié à ZÉRO PIXEL
            d'écart.

            Une pilule centrale recentre les menus et casse cet alignement. Entre une
            consigne précise, exécutée et mesurée, et une suggestion générale d'un
            document de style, je garde la première. Le jour où la pilule est voulue
            malgré cela, c'est une décision à prendre en connaissance de ce qu'elle
            coûte. */
        className="sticky top-0 z-50 border-b border-border-subtle bg-canvas/80 backdrop-blur-md"
      >
        {/* `gap-4` sur grand écran, `gap-2` en dessous : à 393 px, quatre écarts de
            seize pixels coûtent un huitième de la largeur à des éléments déjà serrés. */}
        {/*
          `shell-bleed` et non `shell` : la barre traverse l'écran, logo au bord gauche
          et actions au bord droit. Voir l'en-tête du composant pour le motif du
          changement — et `globals.css`, où les deux largeurs sont définies.
        */}
        <div
          /* `h-[var(--header-height)]` et non `h-16` : la même valeur sert de décalage
             aux en-têtes collants de `MarketTable`, qui se glisseraient derrière celui-ci
             si les deux divergeaient. Voir `--header-height` dans globals.css. */
          /* `shell-header` et non `shell-bleed` : la largeur du CONTENU de la barre
             suit désormais le réglage d'affichage — centrée sur 1 680 px en
             « Compact » (CoinGecko), étalée bord à bord en « Étirée »
             (CoinMarketCap). Le filet du `<header>` reste traversant dans les deux
             cas. Voir `.shell-header` dans globals.css. */
          className="shell-header flex h-[var(--header-height)] items-center gap-2 lg:gap-4"
        >
          {/*
            LE TIROIR EST LE PREMIER ÉLÉMENT DE LA BARRE, avant le logo.

            C'est la place qu'il occupe sur toutes les références, et ce n'est pas une
            convention gratuite : le bouton qui OUVRE la navigation se lit comme le
            point de départ de la barre, et le poser à droite le ferait confondre avec
            les actions de compte. Il disparaît de lui-même au-dessus de `lg`, là où la
            barre de menus reprend le relais.
          */}
          <MobileNav />

          {/*
            ── DEUX ZONES, ET LA NAVIGATION APPARTIENT À CELLE DE GAUCHE ───────

            La barre a longtemps porté sa navigation sur l'AXE de l'écran, tenue là par
            deux `flex-1 basis-0` de part et d'autre. Ce centrage a été retiré : la
            référence de la refonte — tokenomist.ai, et avec lui CoinGecko, Binance,
            TradingView — colle logo et navigation ensemble à gauche, et rejette la
            recherche et le compte à droite.

            Ce n'est pas qu'une préférence de composition. Une navigation centrée n'a
            pas de bord auquel se raccrocher : elle FLOTTE, et sa position dépend de la
            largeur des deux groupes qui l'entourent. Ajouter une entrée de menu la
            déplaçait donc toute entière, et l'œil qui revenait à la barre devait la
            chercher. Accrochée au logo, elle commence toujours au même endroit.

            D'où un seul groupe à gauche — marque puis menus, sans conteneur
            intermédiaire — et le groupe d'actions poussé à droite par `ml-auto`.
          */}
          <Link
            href="/"
            /* `min-h-11` sans changer la taille du dessin : la marque mesure 28 pixels
               de haut, ce qui en fait la cible la plus ratée du site au doigt — et la
               plus consultée, puisqu'elle est le retour à l'accueil. La hauteur de la
               ZONE tactile n'a pas à suivre celle du glyphe. */
            className="flex min-h-11 shrink-0 items-center text-ink transition-opacity hover:opacity-80"
            aria-label={`${fr.site.name} — ${fr.site.tagline}`}
          >
            {/*
              UN SEUL DESSIN, TEINTÉ PAR L'ENCRE DU THÈME.

              Deux PNG se relayaient ici, l'un masqué par l'autre selon le thème. Ce
              montage répondait à une contrainte du logo précédent, qui mêlait une
              fleur en dégradé rose-violet à un mot quasi noir : l'inverser aurait
              blanchi le mot mais fait virer la fleur au vert.

              Le logo actuel est monochrome. Un tracé qui prend `currentColor` suit
              donc l'encre sans qu'aucune variante n'ait à exister — et sans qu'une
              image soit chargée pour rien dans le thème qui ne l'affiche pas.

              La hauteur seule est fixée : la largeur découle du `viewBox`, ce qui
              interdit toute déformation. Voir components/BrandMark.tsx.
            */}
            {/* `h-8` et non `h-7` : le logo de CoinGecko fait 32 px de haut, mesuré le
                2026-09-02, et le nôtre en faisait 28.

                ⚠️ SEULE LA HAUTEUR EST REPRISE, PAS LA LARGEUR. Le leur fait 146 px ;
                le nôtre en fera 176, parce que son `viewBox` (549.86 × 100) impose son
                rapport et que `w-auto` le respecte. Forcer 146 px écraserait le dessin
                — c'est exactement ce que la note de `BrandMark` interdit. Deux
                logotypes de même hauteur se lisent comme deux logotypes de même
                importance, quelle que soit la longueur du mot. */}
            <ZenkuuWordmark className="h-8 w-auto shrink-0" />
          </Link>

          {/*
            ── LE SEUIL EST À 1280 ET NON À 1024 ───────────────────────────────

            Il était à `lg`, c'est-à-dire précisément la largeur d'un iPad en paysage.
            Résultat mesuré : les TRENTE-SIX pages du site débordaient de 214 px sur ce
            format, et sur celui-là seulement. La barre de menus s'allumait à 1024 px
            alors que le compte y est intenable — logo 154, cinq menus 380, groupe
            d'actions 615 : 1 149 px pour 1 024 disponibles.

            Le tiroir couvre donc aussi les tablettes en paysage. Ce n'est pas un repli
            par défaut : à 1024 px on tient une tablette à deux mains, le pouce atteint
            le coin supérieur gauche, et un tiroir s'y manipule mieux qu'une rangée de
            menus au survol — il n'y a pas de survol sur un écran tactile.
          */}
          {/* La barre entière — boutons, panneau, ouverture, fermeture — vit dans
              `NavMenus`. Elle ne se contracte pas (`shrink-0` chez elle) : c'est le
              groupe d'actions, à droite, qui cède — voir son `min-w-0`. */}
          <NavMenus menus={NAV_MENUS} />

          {/*
            Le SECOND GROUPE a disparu, et le filet qui le précédait avec lui.

            Il portait trois raccourcis — Heatmap, Screener, Sentiment — dont les trois
            destinations figurent déjà dans les menus ci-dessus. Le filet ne survit pas
            au groupe qu'il séparait : un trait entre les menus et les actions ne
            sépare plus rien, il se lit comme une erreur de rendu.

            Il ne reste donc que deux groupes, et `ml-auto` suffit à les tenir aux deux
            bords. Voir content/navigation.ts pour le motif du retrait.
          */}

          {/*
            GROUPE 2 — actions, rejetées à droite par `ml-auto`.

            `relative` est ICI, et l'endroit compte. Il portait auparavant sur le
            conteneur de la barre, alors borné à 1240px : posé sur le `<header>`
            pleine largeur, le tiroir se collait au bord droit de l'écran, donc à
            plusieurs centaines de pixels du bouton qui l'ouvre. Or ce conteneur est
            DÉSORMAIS pleine largeur lui aussi — l'ancienne parade ne protégeait plus
            de rien. Ancré au groupe qui contient le bouton, le tiroir tombe sous lui
            quelle que soit la largeur de la fenêtre.
          */}
          {/*
            Trois éléments, dans l'ordre de lecture : recherche, session, réglages. Le
            tiroir hamburger a été DÉMONTÉ — il portait trois sujets sans rapport
            (compte, réglages, navigation repliée) derrière une seule icône muette, ce
            qui obligeait à l'ouvrir pour savoir ce qu'il contenait. Chaque bouton
            annonce désormais ce qu'il fait.

            ── « ZENKUU PRO » A QUITTÉ LA BARRE, PUIS LE SITE ──────────────────

            C'était le seul aplat coloré de l'en-tête, donc son point le plus vif — et
            il désignait une offre commerciale au milieu d'outils de consultation. Sur
            une barre dont la navigation est centrée, il pesait doublement : un bouton
            doré de 110 pixels dans le groupe de droite déséquilibre les deux côtés, et
            le centre optique s'écarte du centre géométrique.

            L'abonnement lui-même a depuis été supprimé, avec la facturation adossée au
            fournisseur d'identité tiers. Il n'y a plus de page de tarifs à atteindre,
            et plus aucune fonction réservée : voir `lib/limits.ts`.

            `ml-auto` revient à la place de `flex-1 basis-0` : la navigation n'étant
            plus centrée, ce groupe n'a plus à réserver une zone symétrique de celle du
            logo — il lui suffit d'être poussé au bord droit. `min-w-0` reste, sans quoi
            la largeur minimale du groupe est celle de son contenu : le champ de
            recherche refuserait de se contracter et pousserait la navigation hors de
            l'écran au lieu de rétrécir.
          */}
          <div className="relative ml-auto flex min-w-0 items-center justify-end gap-1 sm:gap-2">
            <HeaderSearch onOpenOverlay={openSearch} />

            {/*
              LA BASCULE DE THÈME RETOURNE AU PANNEAU — IL N'EN RESTE QUE L'ÉCOUTEUR.

              Elle a occupé cette place, à côté de la recherche, au motif que c'est la
              préférence la plus souvent changée du site. C'est vrai le premier jour et
              faux ensuite : on choisit son thème une fois, alors qu'on cherche un actif
              à chaque visite. Un bouton permanent pour un geste unique, c'est de la
              place prise à la recherche et une icône de plus à écarter du regard.

              Le panneau d'affichage la porte, et mieux : avec ses TROIS choix, dont
              « suivre l'appareil » — celui par défaut, que deux icônes ne savent pas
              dessiner. `ThemeSync` n'affiche rien ; il garde seulement ce choix vivant
              quand l'appareil bascule pendant la visite.
            */}
            <ThemeSync />

            {/*
              LA ROUE DENTÉE A FUSIONNÉ AVEC LE COMPTE.

              Les deux boutons se sont d'abord exclus — le menu de compte reprenait
              langue, devise et thème — puis ont coexisté, sur l'argument d'une
              répartition nette : l'AFFICHAGE d'un côté, ce qui n'existe qu'avec un
              compte de l'autre.

              La répartition était juste sur le papier et invisible à l'écran. Un
              engrenage n'annonce pas « l'affichage », il annonce « des réglages » ; le
              bouton voisin en portait aussi. Deux entrées répondaient donc à la même
              question, et il fallait ouvrir les deux pour savoir laquelle.

              Il n'en reste qu'une. Le panneau porte l'affichage dans tous les cas, et
              y ajoute soit le formulaire de connexion, soit le menu de compte — voir
              `AccountControl`, qui décrit ses trois formes. Le visiteur anonyme garde
              donc l'accès aux réglages, ce qui était le seul acquis à préserver.
            */}
            <AccountControl available={accountsEnabled} onOpenAuth={setAuthMode} />
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
      <PreferenceOverlay
        tab={preferenceTab}
        onTabChange={setPreferenceTab}
        onClose={closePreference}
      />
      {/* `mode` retombe sur « connexion » quand la fenêtre est fermée : une valeur
          jamais lue — le composant ne rend rien sans `open` — mais la propriété est
          requise, et la rendre nullable pour un cas qui ne se produit pas coûterait
          plus cher que cette ligne. */}
      <AuthDialog
        open={authMode !== null}
        mode={authMode ?? 'signin'}
        onClose={() => setAuthMode(null)}
        socialProviders={socialProviders}
      />
    </>
  )
}
