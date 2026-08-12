'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { GLASS_STORAGE_KEY, THEME_STORAGE_KEY } from '@/components/ThemeScript'

/**
 * Store des préférences d'affichage : thème, devise, langue.
 *
 * Trois réglages jusqu'ici dispersés — le thème dans un script inline, la devise
 * dans un contexte React — désormais réunis derrière le panneau unique de l'en-tête.
 *
 * Contrainte structurante : `ThemeScript` s'exécute AVANT l'hydratation pour éviter
 * le flash de thème clair, et il lit une clé brute (`zenkuu-theme`) avec des valeurs
 * brutes. Zustand/persist, lui, sérialise un objet sous sa propre clé. Les deux
 * formats ne peuvent pas être confondus : le store écrit donc AUSSI la clé attendue
 * par le script, en plus de son propre état. Sans cette double écriture, le thème
 * choisi serait perdu au rechargement et le flash reviendrait.
 */

export type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: ThemeMode
  /**
   * Mode Liquid Glass — surfaces translucides. EXPÉRIMENTAL.
   *
   * Un booléen distinct de `theme`, et non une quatrième valeur de celui-ci : le
   * thème règle la clarté du fond, ceci la matière des surfaces. Les deux se
   * combinent, et les fondre en un seul réglage forcerait à abandonner clair/sombre
   * pour activer le verre.
   */
  glass: boolean
  currency: string
  language: string
  setTheme: (theme: ThemeMode) => void
  setGlass: (glass: boolean) => void
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

/**
 * Applique le mode verre au DOM et à la clé lue par `ThemeScript`.
 *
 * Même double écriture que pour le thème, et pour la même raison : le script
 * anti-flash s'exécute avant tout JavaScript d'application et ne sait lire qu'une
 * clé brute. « 1 » / absence plutôt que « true » / « false » — un booléen
 * sérialisé en chaîne invite à la faute classique où `Boolean('false')` vaut vrai.
 */
export function applyGlass(glass: boolean): void {
  if (typeof window === 'undefined') return

  document.documentElement.classList.toggle('glass', glass)

  try {
    if (glass) localStorage.setItem(GLASS_STORAGE_KEY, '1')
    else localStorage.removeItem(GLASS_STORAGE_KEY)
  } catch {
    /* localStorage indisponible : le mode reste appliqué pour cette session. */
  }
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      glass: false,
      currency: 'EUR',
      language: 'fr',

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      setGlass: (glass) => {
        applyGlass(glass)
        set({ glass })
      },
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'zenkuu-settings',
      // Le rehydratage doit repropager le thème au DOM : `persist` restaure l'état
      // JavaScript, pas la classe CSS que `ThemeScript` avait posée depuis l'ancienne
      // valeur. Sans cela, un changement en « system » suivi d'un rechargement
      // laisserait la classe et l'état désaccordés.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        applyTheme(state.theme)
        applyGlass(state.glass)
      },
    },
  ),
)
