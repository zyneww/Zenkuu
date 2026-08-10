'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, Search } from 'lucide-react'

import { NAV_MENUS, type NavMenu } from '@/content/navigation'
import { fr } from '@/content/fr'
import { AuthButtons, MobileAuthLinks } from '@/components/auth/AuthButtons'
import { AuthOverlay, type AuthMode } from '@/components/auth/AuthOverlay'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { SearchOverlay } from '@/components/search/SearchOverlay'

/**
 * Barre de navigation — bande centrée façon AniList (§3.2).
 *
 * La disposition reprend celle d'AniList : un conteneur de largeur limitée, centré
 * dans la page, avec le logo calé à son bord gauche, les menus au centre et les
 * actions à droite. C'est l'écart voulu par rapport à CoinGecko, dont le contenu
 * d'en-tête part du bord gauche de l'écran (§7).
 */
export function NavBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  /*
   * L'état de la fenêtre de compte vit ICI, pas dans le composant qui l'affiche.
   *
   * Deux entrées l'ouvrent — les boutons de l'en-tête et le menu mobile — et une
   * troisième la fait changer d'onglet depuis l'intérieur. Un état interne au
   * composant obligerait chacune de ces entrées à passer par un contexte, pour un
   * seul niveau de profondeur. `null` = fermée, ce qui évite d'avoir à tenir un
   * booléen d'ouverture ET un mode en parallèle : deux variables dont l'une peut
   * contredire l'autre.
   */
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeAuth = useCallback(() => setAuthMode(null), [])

  // Fermeture au clic extérieur et à la touche Échap — deux réflexes attendus de
  // tout menu, et l'échappatoire indispensable pour une navigation au clavier.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
        setMobileOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null)
        setMobileOpen(false)
      }
      // Ctrl/Cmd + K : le raccourci que tout habitué d'un site de marché essaie en
      // premier. `preventDefault` évite que Firefox n'ouvre sa propre barre de
      // recherche par-dessus la nôtre.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
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
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-canvas/95 backdrop-blur">
        <div
          ref={navRef}
          className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4"
        >
          {/* `flex-1 basis-0` sur les deux groupes latéraux pour qu'ils partagent
              l'espace à parts strictement égales : c'est la condition pour que la
              navigation tombe sur l'axe exact de la page. Avec un simple
              `justify-between`, le groupe de droite étant plus étroit que le logo,
              les menus se retrouvaient décalés de 27 pixels vers la gauche (mesuré). */}
          <div className="flex flex-1 basis-0 items-center">
            <Link
              href="/"
              className="flex shrink-0 items-center text-ink transition-opacity hover:opacity-80"
              aria-label={`${fr.site.name} — ${fr.site.tagline}`}
            >
              {/*
                Image RÉELLE, et non plus masque CSS.

                Le logo précédent était une silhouette monochrome : le masque le
                colorait en `currentColor`, ce qui le faisait suivre le thème sans
                second fichier. `logo2.svg` ne peut pas être traité ainsi — c'est un
                dessin tracé qui mêle des aplats quasi noirs (259 chemins) et quasi
                blancs (117), et un masque, qui ne lit que la silhouette, l'écraserait
                en une seule teinte et le rendrait méconnaissable.

                `dark:invert` règle le seul vrai problème que pose ce fichier : le
                logotype est dessiné en sombre pour un fond blanc, et il disparaissait
                presque entièrement sur l'ardoise du thème sombre (vérifié à l'écran).
                L'inversion est ici EXACTE et non approchée — le fichier ne contient
                aucune couleur saturée, ses 382 aplats sont tous en niveaux de gris
                (vérifié : aucun dont les canaux R, G et B s'écartent de plus de 12).
                Inverser une image en gris ne fait que permuter le noir et le blanc,
                sans dérive de teinte. Sur un logo coloré, ce serait à proscrire.

                Le `viewBox` du fichier a été RECADRÉ sur le dessin. La zone de dessin
                d'origine (1152×767) n'était remplie qu'à 32 % : le logotype, mesuré à
                917×310, flottait avec 28 % de marge au-dessus de lui. Affiché à
                hauteur d'en-tête, il se réduisait donc à une vignette illisible. Le
                `viewBox` ramené à `99 206 933 326` cadre le dessin, ce qui lui rend
                sa largeur utile sans toucher à un seul chemin.

                Dimensions écrites en dur : sans elles, le navigateur ne réserve pas
                la place du logo avant son chargement et l'en-tête tressaute au
                premier rendu (décalage de mise en page, pénalisé au §9). 92×32
                respecte le rapport 933:326 du cadrage.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG local : l'optimiseur de Next ne traite pas ce format */}
              <img
                src="/brand/logo2.svg"
                alt={fr.site.name}
                width={92}
                height={32}
                className="h-8 w-[92px] shrink-0 dark:invert"
              />
            </Link>
          </div>

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

          <div className="flex flex-1 basis-0 items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-card text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label={fr.search.open}
              title={`${fr.search.open} (Ctrl + K)`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Sélecteur de devise et bascule de thème fusionnés en une seule
                entrée : trois réglages d'affichage pour trois contrôles distincts
                encombraient l'en-tête sans que leur parenté soit lisible. */}
            <SettingsPanel />

            <AuthButtons onOpen={setAuthMode} />

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-card text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
              aria-label={fr.nav.openMenu}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <MobileMenu onNavigate={() => setMobileOpen(false)} onOpenAuth={setAuthMode} />
        ) : null}
      </header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
      <AuthOverlay mode={authMode} onClose={closeAuth} onSwitch={setAuthMode} />
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
  const panelId = `menu-${menu.label.toLowerCase().replace(/\W+/g, '-')}`

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

      {isOpen ? (
        <div id={panelId} className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-2">
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
                          <Link
                            href={item.href}
                            onClick={onNavigate}
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

function MobileMenu({
  onNavigate,
  onOpenAuth,
}: {
  onNavigate: () => void
  onOpenAuth: (mode: AuthMode) => void
}) {
  return (
    <div className="max-h-[70vh] overflow-y-auto border-t border-border-subtle bg-surface px-4 py-3 lg:hidden">
      <MobileAuthLinks
        onOpen={(mode) => {
          // Le menu se referme AVANT l'ouverture de la fenêtre : les deux se
          // superposeraient sinon, et le menu resterait ouvert derrière au retour.
          onNavigate()
          onOpenAuth(mode)
        }}
      />

      {NAV_MENUS.map((menu) => (
        <section key={menu.label} className="mb-4 last:mb-0">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {menu.label}
          </h2>
          <ul>
            {menu.sections.flatMap((section) =>
              section.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={`${menu.label}-${item.label}`}>
                    {item.ready && item.href ? (
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className="flex items-center gap-2 py-1.5 text-sm text-ink"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        {item.label}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 py-1.5 text-sm text-ink-muted opacity-60">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {item.label}
                        <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.625rem] uppercase">
                          {fr.nav.soonShort}
                        </span>
                      </span>
                    )}
                  </li>
                )
              }),
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}
