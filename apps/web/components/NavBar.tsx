'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { NAV_MENUS, type NavMenu } from '@/content/navigation'
import { ZenkuuWordmark } from '@/components/BrandMark'
import { useContent, usePhrase } from '@/components/locale/ContentProvider'
import { AccountControl } from '@/components/account/AccountControl'
import { AuthOverlay, type AuthMode } from '@/components/account/AuthOverlay'
import { MobileNav } from '@/components/nav/MobileNav'
import { usePresence } from '@/components/nav/usePresence'
import { PreferenceOverlay, type PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { HeaderSearch } from '@/components/search/HeaderSearch'
import { SearchOverlay } from '@/components/search/SearchOverlay'

/**
 * Barre de navigation — filet pleine largeur, contenu centré sur celui de la page.
 *
 * L'ordre des éléments suit Token Terminal : logo, menus immédiatement à sa droite,
 * filet, accès rapides, puis actions rejetées à l'extrême droite.
 *
 * ── DEUX LARGEURS, ET IL EN FAUT DEUX ─────────────────────────────────────────
 *
 * Le `<header>` traverse l'écran : c'est lui qui porte le fond et le filet inférieur,
 * et un trait qui s'arrêterait à 1440px laisserait deux vides de part et d'autre — le
 * résultat se lit comme un défaut d'alignement plutôt que comme une intention.
 *
 * Son CONTENU, lui, est borné à la même largeur que la page (`.shell`). La barre a
 * longtemps été pleine largeur de bout en bout, au motif que les deux vides latéraux
 * ne se justifiaient plus une fois le contenu élargi. Le défaut était ailleurs : sur un
 * écran de 2100 pixels, le logo se collait au bord gauche et l'avatar au bord droit,
 * à plus de trois cents pixels du contenu qu'ils surplombent. La navigation ne
 * désignait plus la page qu'elle sert.
 *
 * Le filet reste donc traversant, les éléments s'alignent sur le contenu, et la
 * critique d'origine tombe : il n'y a plus de vide visible, seulement une bande dont
 * le contenu tient dans la même colonne que tout le reste.
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
   * Traverse en prop pour la même raison qu'`accountsEnabled` : c'est la lecture
   * d'une variable d'environnement, donc une opération serveur, dont seul le RÉSULTAT
   * — trois libellés au plus — a sa place dans le paquet client.
   */
  socialProviders: readonly string[]
}) {
  const fr = useContent()
  const t = usePhrase()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
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
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* STABLES, et il le faut : `HeaderSearch` pose son écouteur de raccourcis dans un
     effet qui dépend de `onOpenOverlay`. Une fonction recréée à chaque rendu ferait
     démonter puis remonter cet écouteur à chaque frappe. */
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closePreference = useCallback(() => setPreferenceTab(null), [])
  const closeAuth = useCallback(() => setAuthMode(null), [])

  // Fermeture au clic extérieur et à la touche Échap — deux réflexes attendus de
  // tout menu, et l'échappatoire indispensable pour une navigation au clavier.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null)
      }
      /*
       * LES RACCOURCIS DE RECHERCHE ONT QUITTÉ CE FICHIER.
       *
       * `Ctrl/⌘ + K` et `/` étaient traités ici, et ne savaient faire qu'une chose :
       * ouvrir la fenêtre modale. Depuis que l'en-tête porte un VRAI champ, la bonne
       * réaction dépend de ce qui est à l'écran — donner le focus au champ s'il est
       * visible, ouvrir la fenêtre sinon. Cette barre ne peut pas trancher : elle ne
       * sait pas si le champ est replié, et l'apprendre lui demanderait de recopier
       * son point de rupture. La règle vit donc dans `HeaderSearch`, qui est le seul
       * endroit d'où elle s'observe.
       */
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  /*
   * LE TIROIR NE SURVIT PAS À LA NAVIGATION QU'IL A PROVOQUÉE.
   *
   * Chaque entrée le referme déjà par son propre `onClick`, et cela suffit tant que
   * toutes les entrées sont des liens ordinaires. Mais la fermeture repose alors sur
   * un rappel recâblé à la main sur CHAQUE entrée : une entrée qui l'oublierait — un
   * lien externe, une destination pas encore construite, un jour une entrée qui fait
   * autre chose que naviguer — laisserait le panneau ouvert par-dessus la page
   * d'arrivée. Et comme il ne se ferme sinon qu'au survol, il faudrait alors repasser
   * la souris dessus pour s'en débarrasser.
   *
   * Observer le chemin énonce la règle une fois pour toutes, et au bon niveau : ce
   * tiroir sert à PARTIR d'ici, il n'a plus d'objet une fois qu'on est ailleurs.
   *
   * L'ajustement se fait PENDANT le rendu et non dans un effet — même motif, et
   * pour la même raison, que `usePresence` : un effet peindrait d'abord le panneau
   * ouvert sur la page d'arrivée, puis le corrigerait à l'image suivante. React
   * interrompt au contraire ce rendu-ci et le relance sans rien peindre entre les
   * deux. Le compilateur React refuse d'ailleurs la version en effet.
   */
  const pathname = usePathname()
  const [previousPathname, setPreviousPathname] = useState(pathname)
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname)
    setOpenMenu(null)
  }

  /* Ouverture au survol avec une temporisation à la fermeture : sans ce délai, le
     menu se referme dès que le curseur traverse le vide de quelques pixels entre le
     bouton et le panneau — un défaut classique et très irritant. */
  function openOnHover(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenMenu(label)
  }

  function closeOnHover() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140)
  }

  return (
    <>
      {/* `data-site-header` : point d'ancrage STABLE pour les barres qui doivent se
          poser juste en dessous — aujourd'hui la barre d'identité collante des fiches
          d'actif. Un attribut plutôt qu'un sélecteur de classe : `header.sticky`
          marcherait jusqu'au jour où quelqu'un remplacerait `sticky` par autre chose,
          et la barre se glisserait alors silencieusement sous la navigation. */}
      <header
        data-site-header
        className="sticky top-0 z-50 border-b border-border-subtle bg-canvas/95 backdrop-blur"
      >
        {/* `gap-4` sur grand écran, `gap-2` en dessous : à 393 px, quatre écarts de
            seize pixels coûtent un huitième de la largeur à des éléments déjà serrés. */}
        {/*
          `shell` et non `shell-bleed` : le CONTENU de la barre s'aligne sur celui de
          la page. Le `<header>` reste pleine largeur et garde son fond et son filet —
          c'est cette séparation qui permet le centrage sans rouvrir le défaut que
          l'ancienne disposition redoutait, un trait qui s'arrête à mi-écran.
        */}
        <div
          ref={navRef}
          /* `h-[var(--header-height)]` et non `h-16` : la même valeur sert de décalage
             aux en-têtes collants de `MarketTable`, qui se glisseraient derrière celui-ci
             si les deux divergeaient. Voir `--header-height` dans globals.css. */
          className="shell flex h-[var(--header-height)] items-center gap-2 lg:gap-4"
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
            <ZenkuuWordmark className="h-7 w-auto shrink-0" />
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
          {/* `shrink-0` : la navigation ne se contracte pas. C'est le groupe d'actions,
              à droite, qui cède — voir son `min-w-0`. */}
          <nav
            aria-label="Navigation principale"
            className="hidden shrink-0 items-center gap-0.5 xl:flex"
          >
            {NAV_MENUS.map((menu) =>
              /*
               * ── UN MENU SANS PANNEAU EST UN LIEN ───────────────────────────
               *
               * Le tri se fait ICI, à l'itération, et non par une sortie anticipée
               * dans `DropdownMenu`. La raison est la règle des hooks : une sortie
               * avant `usePresence` rendrait cet appel conditionnel, et le nombre de
               * hooks appelés varierait alors d'un menu à l'autre au sein du même
               * rendu de la barre. React n'a aucun moyen de rattacher l'état au bon
               * composant dans ce cas — c'est un des rares endroits où le linter
               * signale un vrai défaut plutôt qu'une préférence de style.
               *
               * Un `<Link>` et non un `<button>` qui navigue : le clic milieu,
               * l'ouverture dans un onglet, l'aperçu de la destination au survol et
               * le pré-chargement de Next viennent alors gratuitement. Et aucun
               * `aria-haspopup` : l'annoncer sur un élément qui n'ouvre rien ferait
               * attendre à un lecteur d'écran un panneau qui ne viendra jamais.
               *
               * La classe est celle du bouton, moins le chevron — les deux formes
               * doivent occuper la même hauteur, faute de quoi la barre se lit comme
               * deux barres accolées.
               */
              menu.href && menu.sections.length === 0 ? (
                <Link
                  key={menu.label}
                  href={menu.href}
                  className="flex items-center rounded-control px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  {t(menu.label)}
                </Link>
              ) : (
                <DropdownMenu
                  key={menu.label}
                  menu={menu}
                  isOpen={openMenu === menu.label}
                  onOpen={() => openOnHover(menu.label)}
                  onClose={closeOnHover}
                  onToggle={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
                  onNavigate={() => setOpenMenu(null)}
                />
              ),
            )}
          </nav>

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
            <AccountControl
              available={accountsEnabled}
              onOpenPreference={setPreferenceTab}
              onOpenAuth={setAuthMode}
            />
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
      <PreferenceOverlay
        tab={preferenceTab}
        onTabChange={setPreferenceTab}
        onClose={closePreference}
      />
      {/* `mode` retombe sur « connexion » quand la fenêtre est fermée : c'est une
          valeur qui ne sera jamais lue — le composant ne rend rien sans `open` — mais
          la propriété est requise, et un `null` forcerait à rendre son type nullable
          pour une situation qui ne se produit pas. */}
      <AuthOverlay
        open={authMode !== null}
        mode={authMode ?? 'signin'}
        onClose={closeAuth}
        socialProviders={socialProviders}
      />
    </>
  )
}

interface DropdownMenuProps {
  menu: NavMenu
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onToggle: () => void
  onNavigate: () => void
}

function DropdownMenu({ menu, isOpen, onOpen, onClose, onToggle, onNavigate }: DropdownMenuProps) {
  const fr = useContent()
  const t = usePhrase()
  const panelId = `menu-${menu.label.toLowerCase().replace(/\W+/g, '-')}`

  /* Le panneau survit à sa propre fermeture : `mounted` reste vrai pendant la
     disparition, le temps que la transition se joue. Voir components/nav/presence.ts. */
  const { state, mounted, onTransitionEnd } = usePresence(isOpen)

  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        onClick={onToggle}
        onFocus={onOpen}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        className={`flex items-center gap-1 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
          isOpen ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {t(menu.label)}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {mounted ? (
        <div
          id={panelId}
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          /*
           * LA FERMETURE EST POSÉE ICI, SUR LE PANNEAU, ET PLUS SUR CHAQUE ENTRÉE.
           *
           * Elle était recâblée à la main sur le `onClick` de chaque lien. Le tiroir
           * se refermait donc tant que toutes les entrées étaient des liens ordinaires
           * qui n'oubliaient pas le rappel — deux conditions qu'aucun code ne
           * garantissait. Les entrées `ready: false` sont d'ailleurs des `<span>` SANS
           * `onClick` : cliquer l'une d'elles laissait le panneau ouvert, et comme il
           * ne se ferme sinon qu'au départ du curseur, il fallait repasser la souris
           * dessus pour s'en débarrasser.
           *
           * Un clic sur le panneau signifie « j'ai choisi » quelle que soit l'entrée
           * touchée : la règle vaut donc pour le panneau entier. Elle survit à l'ajout
           * d'une entrée d'un genre nouveau — un lien externe, un bouton qui ouvre une
           * fenêtre — sans que personne n'ait à y penser.
           *
           * `onClick` et non `onPointerDown` : la navigation part du clic, et fermer
           * dès l'enfoncement retirerait le lien de sous le doigt avant qu'il ne soit
           * relâché.
           */
          onClick={onNavigate}
          className="menu-panel absolute left-1/2 top-full z-50 ml-[-10rem] w-80 pt-2"
        >
          <div className="overflow-hidden rounded-card border border-border-subtle bg-overlay p-1.5 shadow-overlay">
            {menu.sections.map((section, sectionIndex) => (
              <div key={section.label ?? sectionIndex}>
                {/* Séparateur entre sections, jamais avant la première : une ligne en
                    haut du panneau donnerait l'impression d'un groupe tronqué. */}
                {sectionIndex > 0 ? (
                  <hr className="my-1.5 border-0 border-t border-border-subtle" />
                ) : null}

                {section.label ? (
                  <p className="px-3 pb-1 pt-1.5 text-micro font-semibold uppercase tracking-wide text-ink-muted/70">
                    {t(section.label)}
                  </p>
                ) : null}

                <ul>
                  {section.items.map((item) => {
                    const Icon = item.icon

                    return (
                      <li key={`${section.label ?? ''}-${item.label}`}>
                        {item.ready && item.href ? (
                          // Pas de `onClick` ici : le panneau ferme pour tout le monde,
                          // voir son en-tête. Le remettre créerait une seconde source
                          // de vérité — celle qui manquait aux entrées d'un autre genre.
                          <Link
                            href={item.href}
                            className="group flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-surface-muted"
                          >
                            <Icon
                              className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand-strong"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-ink">
                                {t(item.label)}
                              </span>
                              <span className="block text-xs text-ink-muted">
                                {t(item.description)}
                              </span>
                            </span>
                          </Link>
                        ) : (
                          /* Entrée non construite : un <span> et non un lien
                             désactivé, pour qu'aucun clic ni aucune tabulation ne
                             mène nulle part. */
                          <span className="flex cursor-default items-start gap-2.5 rounded-lg px-3 py-2 opacity-55">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-medium text-ink">{t(item.label)}</span>
                                <span className="rounded bg-surface-muted px-1.5 py-0.5 text-micro font-medium uppercase tracking-wide text-ink-muted">
                                  {fr.nav.soonShort}
                                </span>
                              </span>
                              <span className="block text-xs text-ink-muted">
                                {t(item.description)}
                              </span>
                            </span>
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

