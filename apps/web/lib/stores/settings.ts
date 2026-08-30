'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { LAYOUT_STORAGE_KEY, THEME_STORAGE_KEY } from '@/components/ThemeScript'

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

/**
 * Largeur de la fiche actif — « Compact » ou « Étirée ».
 *
 * `compact` est la disposition historique : le contenu se borne à 1 680 px et se
 * centre (voir `.shell` dans `globals.css`). `wide` retire ce plafond sur les fiches
 * d'actif, comme le fait CoinMarketCap, dont la fiche occupe toute la largeur de
 * l'écran quelle qu'elle soit.
 *
 * ⚠️ LE RÉGLAGE NE TOUCHE QUE LES FICHES D'ACTIF, pas le site entier : c'est ce qui
 * a été demandé, et un classement de 18 000 lignes étalé sur 3 000 px se lit moins
 * bien, pas mieux.
 */
export type LayoutMode = 'compact' | 'wide'

/** Attribut posé sur `<html>` — c'est lui que la feuille de style lit. */
export const LAYOUT_ATTRIBUTE = 'data-layout'

/* La clé vit dans `ThemeScript` — le script d'amorçage la lit avant l'hydratation,
   et deux littéraux pour une même clé finiraient par diverger. */
export { LAYOUT_STORAGE_KEY }

interface SettingsState {
  theme: ThemeMode
  layout: LayoutMode
  currency: string
  language: string
  /**
   * Bandeau de repères du marché (`GlobalStatsBar`) replié ou non.
   *
   * ⚠️ PAS DE CLÉ BRUTE NI DE SCRIPT D'AMORÇAGE ICI, contrairement au thème et à la
   * largeur des fiches : replier ce bandeau ne fait pas sauter la mise en page — la
   * section reste montée, seul son contenu apparaît ou non — alors que le flash de
   * thème ou le saut de largeur sont visibles sur TOUTE la page. Le repli se lit donc
   * après l'hydratation, comme la devise ou la langue plus haut. Un visiteur qui
   * l'avait replié verra le bandeau un instant avant qu'il ne se replie à nouveau —
   * compromis assumé plutôt qu'un second script d'amorçage pour un réglage mineur.
   * Par défaut : DÉPLIÉ (affiché).
   */
  statsBarCollapsed: boolean
  setTheme: (theme: ThemeMode) => void
  setLayout: (layout: LayoutMode) => void
  setCurrency: (currency: string) => void
  setLanguage: (language: string) => void
  setStatsBarCollapsed: (collapsed: boolean) => void
}

/**
 * Applique la largeur au DOM et à la clé lue avant l'hydratation.
 *
 * Même mécanique que `applyTheme`, et pour la même raison : sans écriture dans une
 * clé brute que le script d'amorçage sait lire, la page s'afficherait d'abord en
 * compact puis sauterait en pleine largeur à l'hydratation — un déplacement de tout
 * le contenu, visible à chaque chargement.
 */
export function applyLayout(layout: LayoutMode): void {
  if (typeof window === 'undefined') return

  if (layout === 'wide') document.documentElement.setAttribute(LAYOUT_ATTRIBUTE, 'wide')
  else document.documentElement.removeAttribute(LAYOUT_ATTRIBUTE)

  try {
    if (layout === 'wide') localStorage.setItem(LAYOUT_STORAGE_KEY, 'wide')
    else localStorage.removeItem(LAYOUT_STORAGE_KEY)
  } catch {
    /* Stockage indisponible : le réglage vaut pour cette session. */
  }
}

/**
 * `startViewTransition` n'est pas encore dans les types du DOM embarqués.
 *
 * L'API est disponible dans les navigateurs à moteur Chromium et WebKit ; le type
 * l'annonce donc OPTIONNELLE, ce qui force le seul contrôle qui compte à l'exécution
 * — « ce navigateur sait-il faire ? » — au lieu de le supposer.
 */
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE FONDU DE BASCULE PASSE PAR L'API DE TRANSITION DE VUE, ET NON PAR UNE
 * TRANSITION CSS SUR TOUT LE DOCUMENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A ÉTÉ ESSAYÉ D'ABORD, ET POURQUOI C'ÉTAIT MAUVAIS ────────────────
 *
 * Une classe posée le temps du fondu activait `transition: background-color…` sur
 * `html.theme-switching *`. C'est la recette la plus répandue, et elle a DEUX
 * défauts, tous deux mesurés sur l'accueil :
 *
 *   1. Elle installe une transition sur CHAQUE nœud du document. Sur une page qui
 *      porte un tableau de marché, cela fait plusieurs milliers d'éléments à
 *      restyler pour animer, en pratique, deux ou trois grands aplats.
 *   2. Le fondu ne démarrait qu'au bout d'environ 150 ms — le temps du recalcul
 *      ci-dessus. Mesure : fond encore blanc à 150 ms, déjà noir à 450 ms. Le
 *      résultat se voyait comme un retard, pas comme un fondu.
 *
 * ── CE QUE FAIT L'API NATIVE ────────────────────────────────────────────────
 *
 * Le navigateur photographie la page, applique le changement, photographie à
 * nouveau, et fond les deux images SUR LE COMPOSITEUR. Aucun élément n'est
 * restylé pour l'animation, et le fondu démarre à la frame suivante quelle que
 * soit la taille du document.
 *
 * La durée et la courbe se règlent en CSS sur `::view-transition-old(root)` et
 * `::view-transition-new(root)` — voir globals.css, où la règle
 * `prefers-reduced-motion` les ramène aussi à l'instantané.
 *
 * ⚠️ LE REPLI N'EST PAS UNE DÉGRADATION VISIBLE : un navigateur sans l'API bascule
 * sèchement, c'est-à-dire exactement comme le site le faisait avant ce fondu.
 */
function swapTheme(root: HTMLElement, dark: boolean): void {
  const apply = () => root.classList.toggle('dark', dark)

  const doc = document as DocumentWithViewTransition
  /* Rien à fondre si l'apparence ne change pas : c'est le cas à chaque rehydratage
     du store, qui rappelle `applyTheme` avec le thème déjà en place. */
  if (dark === root.classList.contains('dark') || typeof doc.startViewTransition !== 'function') {
    apply()
    return
  }

  doc.startViewTransition(apply)
}

/** Applique le thème au DOM et à la clé lue par `ThemeScript`. */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)

  swapTheme(root, dark)

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
      layout: 'compact',
      currency: 'EUR',
      language: 'fr',
      statsBarCollapsed: false,

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      setLayout: (layout) => {
        applyLayout(layout)
        set({ layout })
      },
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
      setStatsBarCollapsed: (collapsed) => set({ statsBarCollapsed: collapsed }),
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
        applyLayout(state.layout)
      },
    },
  ),
)
