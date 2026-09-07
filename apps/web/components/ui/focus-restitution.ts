'use client'

import { useRef } from 'react'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RENDRE LE FOCUS AU DÉCLENCHEUR QUAND UNE FENÊTRE CONTRÔLÉE SE FERME
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE DÉFAUT, MESURÉ AU NAVIGATEUR ─────────────────────────────────────────
 *
 * Ouvrir la fenêtre de connexion depuis l'en-tête, puis la fermer par `Échap` :
 * `document.activeElement` valait `<body>`. Un lecteur au clavier était donc renvoyé
 * en tête de document et devait retraverser tout l'en-tête pour revenir là où il
 * était. C'est le point que la fiche « Modal » de Component Gallery insiste, et
 * l'un des trois que l'ARIA APG exige d'une boîte de dialogue.
 *
 * ── POURQUOI RADIX NE LE FAISAIT PAS ────────────────────────────────────────
 *
 * Il le fait très bien — quand il connaît le déclencheur, c'est-à-dire quand la
 * fenêtre est ouverte par un `<DialogTrigger>`. Les trois fenêtres concernées sont
 * CONTRÔLÉES : leur `open` vient d'un état du parent et le bouton qui l'ouvre vit
 * ailleurs dans l'arbre. Radix n'a donc aucun nœud à qui rendre le focus, et le laisse
 * retomber sur `<body>`.
 *
 * `SettingsAccount`, qui utilise bien `DialogTrigger`, n'a pas ce défaut et n'a pas
 * besoin de ce crochet.
 *
 * ── COMMENT ────────────────────────────────────────────────────────────────
 *
 * `onOpenAutoFocus` est émis par la zone de focus de Radix AVANT qu'elle ne déplace le
 * focus : `document.activeElement` y désigne encore le déclencheur. On le retient.
 *
 * `onCloseAutoFocus` est émis avant que Radix ne décide où aller. On l'empêche et on
 * rend le focus nous-mêmes.
 *
 * ⚠️ `isConnected` EST VÉRIFIÉ, ET CE N'EST PAS DE LA PRUDENCE. Le déclencheur peut
 * avoir disparu pendant que la fenêtre était ouverte — c'est le cas du bouton « Se
 * connecter », que la connexion réussie remplace par le menu du compte. Appeler
 * `focus()` sur un nœud détaché ne lève pas, mais laisse le focus sur `<body>` : dans
 * ce cas précis on laisse Radix faire, ce qui vaut mieux que de ne rien faire du tout.
 */
export function useRestitutionDuFocus(): {
  onOpenAutoFocus: (event: Event) => void
  onCloseAutoFocus: (event: Event) => void
} {
  const declencheur = useRef<HTMLElement | null>(null)

  return {
    onOpenAutoFocus: () => {
      const actif = document.activeElement
      declencheur.current = actif instanceof HTMLElement ? actif : null
    },
    onCloseAutoFocus: (event: Event) => {
      const cible = declencheur.current
      if (!cible?.isConnected) return

      event.preventDefault()
      cible.focus()
    },
  }
}
