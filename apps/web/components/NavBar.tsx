'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { NAV_MENUS, type NavMenu } from '@/content/navigation'
import { fr } from '@/content/fr'
import { ThemeToggle } from '@/components/ThemeToggle'

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
  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

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
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-canvas/95 backdrop-blur">
      <div
        ref={navRef}
        className="mx-auto flex h-16 max-w-[1040px] items-center justify-between gap-6 px-4"
      >
        {/* `flex-1` sur les deux groupes latéraux, `basis-0` pour qu'ils partagent
            l'espace à parts strictement égales : c'est la condition pour que la
            navigation tombe sur l'axe exact de la page. Avec un simple
            `justify-between`, le groupe de droite étant plus étroit que le logo, les
            menus se retrouvaient décalés de 27 pixels vers la gauche (mesuré). */}
        <div className="flex flex-1 basis-0 items-center">
          <Link
            href="/"
            className="flex shrink-0 items-center text-ink transition-opacity hover:opacity-80"
            aria-label={`${fr.site.name} — ${fr.site.tagline}`}
          >
            {/* Masque CSS plutôt qu'<img> : le logo prend la couleur du texte et suit
                donc le thème sombre sans second fichier (cf. .brand-mark dans globals.css). */}
            <span
              className="brand-mark brand-mark-logo h-8 w-7"
              role="img"
              aria-label={fr.site.name}
            />
            <span className="sr-only">{fr.site.name}</span>
          </Link>
        </div>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {NAV_MENUS.map((menu) => (
            <DropdownMenu
              key={menu.label}
              menu={menu}
              isOpen={openMenu === menu.label}
              onOpen={() => openOnHover(menu.label)}
              onClose={closeOnHover}
              onToggle={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            />
          ))}
        </nav>

        <div className="flex flex-1 basis-0 items-center justify-end gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-card text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label={fr.nav.searchPlaceholder}
            title={fr.nav.searchSoon}
          >
            <SearchIcon />
          </button>

          <ThemeToggle />

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-card text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink md:hidden"
            aria-label={fr.nav.openMenu}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {mobileOpen ? <MobileMenu onNavigate={() => setMobileOpen(false)} /> : null}
    </header>
  )
}

interface DropdownMenuProps {
  menu: NavMenu
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onToggle: () => void
}

function DropdownMenu({ menu, isOpen, onOpen, onClose, onToggle }: DropdownMenuProps) {
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
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className="absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-2"
        >
          <ul className="overflow-hidden rounded-card border border-border-subtle bg-surface p-1.5 shadow-lg">
            {menu.items.map((item) => (
              <li key={item.label}>
                {item.ready && item.href ? (
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 transition-colors hover:bg-surface-muted"
                  >
                    <span className="block text-sm font-medium text-ink">{item.label}</span>
                    <span className="block text-xs text-ink-muted">{item.description}</span>
                  </Link>
                ) : (
                  /* Entrée non construite : un <span> et non un lien désactivé, pour
                     qu'aucun clic ni aucune tabulation ne mène nulle part. */
                  <span className="block cursor-default rounded-lg px-3 py-2 opacity-55">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{item.label}</span>
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-ink-muted">
                        {fr.nav.soonShort}
                      </span>
                    </span>
                    <span className="block text-xs text-ink-muted">{item.description}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="max-h-[70vh] overflow-y-auto border-t border-border-subtle bg-surface px-4 py-3 md:hidden">
      {NAV_MENUS.map((menu) => (
        <section key={menu.label} className="mb-4 last:mb-0">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {menu.label}
          </h2>
          <ul>
            {menu.items.map((item) => (
              <li key={item.label}>
                {item.ready && item.href ? (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className="block py-1.5 text-sm text-ink"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 py-1.5 text-sm text-ink-muted opacity-60">
                    {item.label}
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.625rem] uppercase">
                      {fr.nav.soonShort}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
