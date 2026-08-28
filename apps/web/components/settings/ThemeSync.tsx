'use client'

import { useEffect } from 'react'

import { applyTheme, useSettings } from '@/lib/stores/settings'

/**
 * Suivi du thème de l'appareil — sans rien afficher.
 *
 * Ce fichier portait une bascule clair/sombre dans l'en-tête. Le bouton est retiré :
 * l'en-tête n'a plus à porter une préférence qui vit déjà, avec ses TROIS choix
 * (clair, sombre, suivre l'appareil), dans le panneau d'affichage. Deux icônes ne
 * pouvaient de toute façon en exprimer que deux, et le troisième — celui par défaut —
 * est justement celui qu'un pictogramme ne sait pas dessiner.
 *
 * Ce qui restait à sauver, c'est l'écouteur : « suivre l'appareil » doit suivre
 * l'appareil MÊME PENDANT LA VISITE. Sans lui, un système qui bascule en sombre au
 * coucher du soleil — le réglage par défaut de macOS, d'iOS et d'Android — laisserait
 * la page en clair jusqu'au prochain rechargement, alors que le visiteur a
 * explicitement demandé à ce que son appareil décide.
 *
 * Il vit dans un composant plutôt que dans le store parce qu'un écouteur posé au
 * chargement du module s'installerait aussi dans les paquets qui n'affichent pas de
 * thème — les widgets embarqués — et n'aurait jamais rien à qui se désabonner. Monté
 * dans `NavBar`, il ne s'installe que là où il y a une page à repeindre.
 */
export function ThemeSync() {
  const theme = useSettings((state) => state.theme)

  useEffect(() => {
    if (theme !== 'system') return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme('system')

    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])

  return null
}
