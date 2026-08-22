'use client'

import { useSyncExternalStore } from 'react'

/**
 * Le visiteur demande-t-il moins de mouvement ?
 *
 * ── POURQUOI CE HOOK EXISTE ALORS QUE LE CSS S'EN CHARGE DÉJÀ ────────────────
 *
 * `globals.css` porte une règle `@media (prefers-reduced-motion: reduce)` qui coupe
 * toutes les transitions et animations du site. Elle suffit tant que le mouvement est
 * décrit en CSS.
 *
 * Recharts anime en JAVASCRIPT — il interpole les coordonnées de ses tracés image par
 * image et les écrit dans le DOM. Aucune règle CSS ne peut l'arrêter : la propriété
 * animée n'est pas `transition`, c'est l'attribut `d` d'un `<path>`. Le réglage doit
 * donc être LU et repassé à chaque graphique en `isAnimationActive`.
 *
 * ── `useSyncExternalStore` ET NON `useEffect` + `useState` ──────────────────
 *
 * La préférence système est un ÉTAT EXTERNE à React : elle vit dans le navigateur, elle
 * change sans que React en soit prévenu, et elle a une valeur différente au rendu
 * serveur. C'est la définition exacte de ce que ce hook sert à lire.
 *
 * L'écrire avec un `useState` initialisé puis corrigé dans un `useEffect` marcherait,
 * et produirait un rendu de plus à chaque montage — un `setState` synchrone dans un
 * effet déclenche une seconde passe avant la peinture. Le linter React le refuse, et
 * il a raison : sur une page qui monte huit figures, ce sont huit rendus en cascade.
 *
 * ── LA VALEUR SERVEUR EST `true`, ET C'EST LE SENS QUI PROTÈGE ──────────────
 *
 * `matchMedia` n'existe pas au rendu serveur, d'où un instantané serveur distinct.
 * Le poser à `false` — « pas de réduction demandée » — ferait jouer l'animation une
 * fois chez un visiteur qui n'en veut pas. À `true`, personne ne voit de mouvement non
 * désiré, et le seul coût est une animation manquée au tout premier affichage chez
 * ceux qui les acceptent.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  /* `matchMedia` manque dans certains environnements de test et sur les très vieux
     navigateurs. Son absence ne doit pas faire tomber un graphique : on ne s'abonne
     à rien, et l'instantané ci-dessous rend la valeur par défaut. */
  if (typeof window.matchMedia !== 'function') return () => {}

  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia(QUERY).matches
}

/** Instantané SERVEUR — voir la note sur le sens qui protège, en tête de fichier. */
function getServerSnapshot(): boolean {
  return true
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
