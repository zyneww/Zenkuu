'use client'

import { createContext, useContext } from 'react'

/**
 * « Ce panneau d'onglet est-il affiché ? »
 *
 * ── POURQUOI PAS UN INTERSECTIONOBSERVER ─────────────────────────────────────
 *
 * C'était la première implémentation : observer géométriquement le panneau, en
 * comptant sur le fait qu'un onglet inactif porte `hidden`, donc `display: none`,
 * donc une boîte de dimensions nulles qui n'intersecte rien.
 *
 * Honnêteté sur ce qui s'est passé : quand le chargement est resté bloqué, cette
 * mécanique a d'abord été soupçonnée — à tort. Le vrai coupable était ailleurs, dans
 * un verrou `useState` qui relançait son propre effet et annulait les requêtes en
 * vol (l'histoire complète est dans `AssetAnalysis.tsx`). L'observateur n'y était
 * pour rien, et l'aurait tout autant subi.
 *
 * Le contexte a néanmoins été gardé, pour une raison qui tient sans ce faux procès :
 * on DÉDUISAIT une information que le parent possède déjà de façon certaine.
 * `AssetTabs` sait exactement quel onglet est actif. Le lui demander est direct et
 * exact ; l'observation géométrique était un raisonnement indirect sur un effet de
 * bord de la mise en page, avec toute la surface de panne que cela suppose — et,
 * accessoirement, une mécanique qu'on soupçonne en premier quand quelque chose ne
 * marche pas, ce qui a un coût.
 *
 * ── LA VALEUR PAR DÉFAUT EST `true`, ET C'EST DÉLIBÉRÉ ───────────────────────
 *
 * Un composant utilisé hors de tout onglet est visible par définition. Le défaut
 * inverse le rendrait muet et sans erreur — la pire des pannes, celle qui ne se
 * signale pas.
 */
const PanelVisibilityContext = createContext(true)

export function PanelVisibilityProvider({
  visible,
  children,
}: {
  visible: boolean
  children: React.ReactNode
}) {
  return (
    <PanelVisibilityContext.Provider value={visible}>{children}</PanelVisibilityContext.Provider>
  )
}

export function usePanelVisible(): boolean {
  return useContext(PanelVisibilityContext)
}
