'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { NAV_MENUS, type NavMenu } from '@/content/navigation'
import { ZenkuuWordmark } from '@/components/BrandMark'
import { useContent } from '@/components/locale/ContentProvider'
import { AccountMenu } from '@/components/auth/AccountMenu'
import { AuthButtons } from '@/components/auth/AuthButtons'
import { AuthOverlay, type AuthMode } from '@/components/auth/AuthOverlay'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { usePresence } from '@/components/nav/usePresence'
import { PreferenceOverlay, type PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { SettingsMenu } from '@/components/settings/SettingsMenu'
import { SearchTrigger } from '@/components/search/SearchTrigger'
import { SearchOverlay } from '@/components/search/SearchOverlay'

/**
 * Barre de navigation — bande pleine largeur, alignée à gauche.
 *
 * La disposition suit Token Terminal : logo au bord gauche de l'écran, menus
 * immédiatement à sa droite, filet, accès rapides, puis actions rejetées à
 * l'extrême droite. Elle REMPLACE une bande centrée de 1240px calquée sur AniList,
 * dont les deux vides symétriques ne se justifiaient plus une fois le contenu
 * élargi.
 *
 * La barre traverse l'écran alors que le contenu, lui, reste borné à 1440px : les
 * deux ne s'alignent donc pas, et c'est voulu — un filet qui s'arrête à mi-écran se
 * lit comme un défaut d'alignement. Voir `.shell` et `.shell-bleed` dans
 * globals.css, seuls endroits où ces largeurs sont définies.
 */
export function NavBar() {
  const fr = useContent()
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
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [preferenceTab, setPreferenceTab] = useState<PreferenceTab | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeAuth = useCallback(() => setAuthMode(null), [])
  const closePreference = useCallback(() => setPreferenceTab(null), [])

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
      // Ctrl/Cmd + K : le raccourci que tout habitué d'un site de marché essaie en
      // premier. `preventDefault` évite que Firefox n'ouvre sa propre barre de
      // recherche par-dessus la nôtre.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }

      /*
       * « / » seul — le raccourci annoncé par la pastille du champ de recherche.
       *
       * Il n'ouvre RIEN si le curseur est déjà dans une zone de saisie : sans ce
       * garde-fou, taper une barre oblique dans le filtre d'un tableau — ou dans le
       * champ de recherche de la fenêtre elle-même — la ferait disparaître au profit
       * d'une nouvelle fenêtre. `isContentEditable` couvre les zones riches, que le
       * test sur le nom de balise ne voit pas.
       */
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null
        const tag = target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (target?.isContentEditable) return
        event.preventDefault()
        setSearchOpen(true)
      }
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
        <div ref={navRef} className="shell-bleed flex h-16 items-center gap-4">
          {/* GROUPE 1 — logo puis menus, collés à gauche. Les deux `flex-1 basis-0`
              qui encadraient la navigation ont disparu : ils servaient à la poser sur
              l'axe exact de la page, ce qui n'est plus l'objectif. */}
          <Link
            href="/"
            className="flex shrink-0 items-center text-ink transition-opacity hover:opacity-80"
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

          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 lg:flex">
            {NAV_MENUS.map((menu) => (
              <DropdownMenu
                key={menu.label}
                menu={menu}
                isOpen={openMenu === menu.label}
                onOpen={() => openOnHover(menu.label)}
                onClose={closeOnHover}
                onToggle={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
                onNavigate={() => setOpenMenu(null)}
              />
            ))}
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
            Quatre éléments, dans l'ordre de lecture : recherche, offre, session,
            réglages. Le tiroir hamburger a été DÉMONTÉ — il portait trois sujets sans
            rapport (compte, réglages, navigation repliée) derrière une seule icône
            muette, ce qui obligeait à l'ouvrir pour savoir ce qu'il contenait.
            Chaque bouton annonce désormais ce qu'il fait.
          */}
          <div className="relative ml-auto flex items-center gap-2">
            <SearchTrigger onOpen={() => setSearchOpen(true)} />

            {/* S'efface de lui-même pour un abonné, et sans boutique configurée. */}
            <UpgradeButton />

            {/* Hors session seulement — `AccountMenu` prend le relais une fois connecté. */}
            <AuthButtons onOpen={setAuthMode} />

            {/*
              Les deux se relaient sans jamais coexister : chacun rend `null` dans
              l'état de session qui ne le concerne pas. La décision vit dans les
              composants et non ici, parce qu'elle exige `useUser()` — un hook qui
              lève sans fournisseur Clerk, et que cette barre ne peut donc pas appeler
              (voir l'en-tête d'`AuthButtons`).
            */}
            <SettingsMenu onOpenPreference={setPreferenceTab} />
            <AccountMenu onOpenPreference={setPreferenceTab} />
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
      <AuthOverlay mode={authMode} onClose={closeAuth} onSwitch={setAuthMode} />
      <PreferenceOverlay
        tab={preferenceTab}
        onTabChange={setPreferenceTab}
        onClose={closePreference}
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
        className={`flex items-center gap-1 rounded-card px-3 py-2 text-sm font-medium transition-colors ${
          isOpen ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {menu.label}
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
                  <p className="px-3 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-muted/70">
                    {section.label}
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
                                {item.label}
                              </span>
                              <span className="block text-xs text-ink-muted">
                                {item.description}
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
                                <span className="text-sm font-medium text-ink">{item.label}</span>
                                <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-ink-muted">
                                  {fr.nav.soonShort}
                                </span>
                              </span>
                              <span className="block text-xs text-ink-muted">
                                {item.description}
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

