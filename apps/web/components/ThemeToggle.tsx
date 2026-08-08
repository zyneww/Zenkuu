'use client'

import { useEffect, useState } from 'react'

import { fr } from '@/content/fr'
import { THEME_STORAGE_KEY } from '@/components/ThemeScript'

type Theme = 'light' | 'dark'

/**
 * Bascule clair / sombre.
 *
 * L'état initial est lu depuis le DOM (la classe déjà posée par `ThemeScript`) et
 * non depuis `localStorage` : au premier rendu serveur, le composant ne connaît pas
 * le thème, et deviner produirait une icône erronée pendant une frame. On part donc
 * de `null` et on se synchronise au montage.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  // Tant que l'utilisateur n'a rien choisi explicitement, on continue de suivre le
  // système : changer le thème de l'OS en cours de session met la page à jour.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const onChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_STORAGE_KEY)) return
      const next: Theme = event.matches ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', event.matches)
      setTheme(next)
    }

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* Stockage refusé : la bascule reste valable pour la session en cours. */
    }
    setTheme(next)
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-card text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      aria-label={isDark ? fr.theme.switchToLight : fr.theme.switchToDark}
      title={isDark ? fr.theme.switchToLight : fr.theme.switchToDark}
    >
      {/* Avant synchronisation, on rend un gabarit neutre de mêmes dimensions :
          cela évite que le header ne saute de quelques pixels à l'hydratation. */}
      {theme === null ? (
        <span className="h-4 w-4" aria-hidden="true" />
      ) : isDark ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
