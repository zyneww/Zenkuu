'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { THEME_STORAGE_KEY } from '@/components/ThemeScript'

/**
 * Store des préférences d'affichage : thème, devise, langue.
 *
 * Trois réglages jusqu'ici dispersés — le thème dans un script inline, la devise
 * dans un contexte React — désormais réunis derrière le panneau unique de l'en-tête.
 *
 * Contrainte structurante : `ThemeScript` s'exécute AVANT l'hydratation pour éviter
 * le flash de thème clair, et il lit une clé brute (`zenith-theme`) avec des valeurs
 * brutes. Zustand/persist, lui, sérialise un objet sous sa propre clé. Les deux
 * formats ne peuvent pas être confondus : le store écrit donc AUSSI la clé attendue
 * par le script, en plus de son propre état. Sans cette double écriture, le thème
 * choisi serait perdu au rechargement et le flash reviendrait.
 */

export type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: ThemeMode
  currency: string
  language: string
  setTheme: (theme: ThemeMode) => void
  setCurrency: (currency: string) => void
  setLanguage: (language: string) => void
}

/** Applique le thème au DOM et à la clé lue par `ThemeScript`. */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)

  document.documentElement.classList.toggle('dark', dark)

  try {
    if (theme === 'system') {
      // Absence de clé = « suivre le système », c'est la convention que
      // `ThemeScript` applique déjà. On la respecte plutôt que d'inventer une
      // troisième valeur qu'il ne saurait pas lire.
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch {
    /* localStorage indisponible (navigation privée stricte) : le thème reste appliqué pour cette session. */
  }
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      currency: 'EUR',
      language: 'fr',

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'zenith-settings',
      // Le rehydratage doit repropager le thème au DOM : `persist` restaure l'état
      // JavaScript, pas la classe CSS que `ThemeScript` avait posée depuis l'ancienne
      // valeur. Sans cela, un changement en « system » suivi d'un rechargement
      // laisserait la classe et l'état désaccordés.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
