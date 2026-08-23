'use client'

import { useEffect, useRef } from 'react'

import { CACHE_TTL_SECONDS } from '@zenkuu/data'

import { useRouter } from '@/i18n/navigation'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA FICHE SE RAFRAÎCHIT SEULE, À LA CADENCE DE SA PROPRE DONNÉE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI BOUGEAIT DÉJÀ, ET CE QUI NE BOUGEAIT PAS ──────────────────────────
 *
 * Deux chiffres seulement vivaient en direct : le cours de l'en-tête et la fin de la
 * courbe, tous deux poussés par le WebSocket de Binance (voir `useLiveTicker`). Tout
 * le reste — capitalisation, volume 24 h, amplitude, variations, rang, places de
 * cotation, offre en circulation — était figé à l'instant du rendu et le RESTAIT tant
 * qu'on ne rechargeait pas la page.
 *
 * C'est le défaut que ce composant corrige, et il n'était pas cosmétique : un onglet
 * laissé ouvert une heure affichait un « Volume 24 h » d'il y a une heure, avec la même
 * autorité qu'un chiffre juste. Un nombre périmé qui ne dit pas qu'il l'est est pire
 * qu'un nombre absent (§5).
 *
 * ── POURQUOI CETTE CADENCE, ET PAS PLUS RAPIDE ───────────────────────────────
 *
 * `CACHE_TTL_SECONDS` — la fenêtre de fraîcheur du cache applicatif, elle-même alignée
 * sur le `revalidate` des pages. C'est le bon nombre pour une raison simple : EN DEÇÀ,
 * IL N'Y A RIEN DE NEUF À CHERCHER. Un rafraîchissement plus fréquent re-servirait les
 * mêmes valeurs mises en cache, en payant un rendu serveur pour rien.
 *
 * Aller plus vite supposerait de resserrer le cache, ce que le quota interdit : sans
 * clé, CoinGecko refuse au-delà d'une poignée d'appels par minute (voir l'en-tête de
 * `providers/coingecko.ts`). La cadence est donc dictée par la SOURCE, pas choisie.
 *
 * Lire la constante plutôt que réécrire « 180 » ferme la question une fois pour
 * toutes : le jour où une clé d'API resserre la fenêtre, la page suit sans qu'on ait à
 * penser à ce fichier.
 *
 * ── UN ONGLET CACHÉ NE RAFRAÎCHIT RIEN ───────────────────────────────────────
 *
 * C'est la moitié de l'intérêt du composant. Un onglet de fiche oublié dans une
 * fenêtre en arrière-plan déclencherait un rendu serveur toutes les trois minutes, à
 * perpétuité, pour un contenu que personne ne regarde — vingt onglets ouverts sur
 * autant d'actifs et c'est notre propre quota qui saute.
 *
 * Au RETOUR sur l'onglet, en revanche, il faut rafraîchir tout de suite : c'est
 * précisément le moment où l'écart entre ce qui est affiché et la réalité est le plus
 * grand. Le garde `elapsed` évite qu'un simple aller-retour entre deux fenêtres ne
 * déclenche un rendu à chaque bascule.
 */
export function AssetLiveRefresh() {
  const router = useRouter()
  /* Initialisée à zéro puis datée dans l'effet : `Date.now()` est une fonction impure,
     et l'appeler pendant le rendu est refusé par le compilateur React — un rendu doit
     pouvoir être rejoué sans changer de résultat. Zéro est d'ailleurs le bon sens :
     avant le montage, rien n'a encore été rafraîchi. */
  const lastAt = useRef(0)

  useEffect(() => {
    const period = CACHE_TTL_SECONDS * 1000
    lastAt.current = Date.now()

    const refresh = () => {
      lastAt.current = Date.now()
      /*
       * `router.refresh()` et non `location.reload()`.
       *
       * Il ne redemande que la charge utile des composants SERVEUR et la réconcilie :
       * l'état client survit — période choisie sur le graphique, colonne d'actualités
       * repliée, position de défilement. Un rechargement complet rejetterait tout cela
       * toutes les trois minutes, ce qui serait bien pire que la donnée périmée qu'on
       * cherche à corriger.
       */
      router.refresh()
    }

    const tick = () => {
      if (document.hidden) return
      refresh()
    }

    const onVisibility = () => {
      if (document.hidden) return
      /* Retour sur l'onglet : on ne rafraîchit que si la donnée a eu le temps de se
         démoder. Sans ce garde, alterner entre deux fenêtres déclencherait un rendu
         serveur à chaque bascule. */
      if (Date.now() - lastAt.current < period) return
      refresh()
    }

    const timer = window.setInterval(tick, period)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router])

  return null
}
