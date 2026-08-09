'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, Search } from 'lucide-react'

import { NAV_MENUS, type NavMenu } from '@/content/navigation'
import { fr } from '@/content/fr'
import { AuthButtons } from '@/components/auth/AuthButtons'
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
  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeSearch = useCallback(() => setSearchOpen(false), [])

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
              {/* Masque CSS plutôt qu'<img> : le logo prend la couleur du texte et
                  suit donc le thème sombre sans second fichier (cf. globals.css). */}
              <span
                className="brand-mark brand-mark-logo h-8 w-7"
                role="img"
                aria-label={fr.site.name}
              />
              <span className="sr-only">{fr.site.name}</span>
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

            <AuthButtons />

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

        {mobileOpen ? <MobileMenu onNavigate={() => setMobileOpen(false)} /> : null}
      </header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
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
          <div className="overflow-hidden rounded-card border border-border-subtle bg-surface p-1.5 shadow-lg">
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

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="max-h-[70vh] overflow-y-auto border-t border-border-subtle bg-surface px-4 py-3 lg:hidden">
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
