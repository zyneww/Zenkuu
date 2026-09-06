'use client'

import { useCallback, useSyncExternalStore } from 'react'

import type { AssetClass } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES RECHERCHES RÉCENTES — CE QUE LE NAVIGATEUR RETIENT, ET RIEN D'AUTRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur `tokenomist.ai` : le panneau de recherche ouvre sur une section
 * « Recent Search » avec un bouton « Clear History », au-dessus de la liste des plus
 * consultés.
 *
 * ── CE QU'ON MÉMORISE : L'ACTIF OUVERT, PAS LA REQUÊTE TAPÉE ────────────────
 *
 * La distinction n'est pas cosmétique. « bit », « bitc », « bitco » sont trois
 * requêtes qui mènent au même endroit, et une liste qui les garderait toutes serait
 * une liste de frappes plutôt qu'une liste de destinations. Ce qu'on retient est donc
 * la ligne CHOISIE — un actif, son nom, son symbole, sa classe —, c'est-à-dire
 * exactement ce qu'on veut retrouver. C'est aussi ce qui rend la liste immédiatement
 * cliquable : elle porte des actifs, pas des chaînes à retaper.
 *
 * ── LE STOCKAGE EST LOCAL, ET IL LE RESTE ───────────────────────────────────
 *
 * `localStorage`, jamais la base : ces lignes n'ont aucune valeur hors de ce
 * navigateur, elles n'ont pas à traverser le réseau, et un visiteur anonyme y a droit
 * autant qu'un visiteur connecté. C'est aussi ce qui rend le bouton « Effacer »
 * honnête — il efface pour de bon, sans qu'une copie subsiste ailleurs.
 *
 * ⚠️ TOUT ACCÈS EST ENVELOPPÉ. `localStorage` LÈVE — pas seulement rend `null` — dans
 * une fenêtre privée verrouillée, sous un navigateur qui bloque le stockage de site,
 * et dans certains contextes de capture d'écran. Une exception ici viderait la
 * recherche entière, qui est le composant le plus visité du site.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POURQUOI `useSyncExternalStore` ET NON UN ÉTAT REMPLI PAR UN EFFET
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La première version lisait le stockage dans un `useEffect` et poussait le résultat
 * dans un `useState`. Le linter l'a refusée, et il avait raison : « Calling setState
 * synchronously within an effect can trigger cascading renders ». Un effet sert à
 * SYNCHRONISER React avec un système extérieur, pas à charger l'état initial.
 *
 * `localStorage` EST un système extérieur, et ce crochet est exactement ce que React
 * propose pour en lire un : un instantané côté client, un instantané côté serveur, et
 * un abonnement pour les changements. Le rendu serveur obtient une liste vide sans
 * jamais toucher à `window`, et le client la remplace au premier rendu — sans effet,
 * sans rendu en cascade, et sans divergence d'hydratation.
 *
 * ⚠️ L'INSTANTANÉ DOIT ÊTRE RÉFÉRENTIELLEMENT STABLE, et c'est le piège de ce
 * crochet : `getSnapshot` est appelé à chaque rendu, et rendre un tableau neuf à
 * chaque appel ferait boucler React à l'infini — il compare les instantanés par
 * identité. D'où le cache de module, qui n'est reconstruit qu'à l'écriture.
 */

const CLE = 'zenkuu-recherches-recentes'

/**
 * Huit lignes.
 *
 * La référence en montre deux dans son état ordinaire ; huit est le point où la
 * section commence à demander un défilement dans un panneau qui en porte déjà trois.
 * Au-delà, une « liste récente » cesse d'être récente.
 */
const MAX = 8

export interface RecentSearch {
  id: string
  assetClass: AssetClass
  name: string
  symbol: string
  /** Vignette de la source, quand elle en publie une. */
  image?: string
}

/** Le même tableau à chaque appel — voir la note sur la stabilité de l'instantané. */
const VIDE: readonly RecentSearch[] = Object.freeze([])

/**
 * Cache de module.
 *
 * `null` veut dire « pas encore lu » ; c'est ce qui fait que le stockage n'est
 * déchiffré qu'une fois par session plutôt qu'à chaque rendu.
 */
let cache: readonly RecentSearch[] | null = null
const abonnes = new Set<() => void>()

function valider(parsed: unknown): readonly RecentSearch[] {
  if (!Array.isArray(parsed)) return VIDE
  /* On revalide ligne par ligne plutôt que de faire confiance à la forme : ce
     stockage survit aux déploiements, et une version antérieure du site a pu y écrire
     une autre structure. Une ligne incomplète est écartée, pas réparée. */
  return parsed.filter(
    (entry): entry is RecentSearch =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as RecentSearch).id === 'string' &&
      typeof (entry as RecentSearch).name === 'string' &&
      typeof (entry as RecentSearch).symbol === 'string' &&
      typeof (entry as RecentSearch).assetClass === 'string',
  )
}

function lire(): readonly RecentSearch[] {
  if (cache !== null) return cache
  try {
    const brut = window.localStorage.getItem(CLE)
    cache = brut ? valider(JSON.parse(brut)) : VIDE
  } catch {
    cache = VIDE
  }
  return cache
}

function ecrire(entries: readonly RecentSearch[]): void {
  cache = entries
  try {
    window.localStorage.setItem(CLE, JSON.stringify(entries))
  } catch {
    /* Quota plein, stockage refusé : la liste reste juste EN MÉMOIRE pour cette
       session, et ne survivra pas au rechargement. C'est une dégradation acceptable ;
       une exception non rattrapée ne le serait pas. */
  }
  for (const notifier of abonnes) notifier()
}

/**
 * Abonnement.
 *
 * ⚠️ L'ÉVÉNEMENT `storage` N'EST PAS DU CONFORT : il est émis dans les AUTRES onglets
 * du même site. Sans lui, effacer l'historique dans un onglet laisserait les autres
 * afficher une liste que le stockage ne porte plus — et le premier clic mènerait vers
 * une ligne effacée. Le cache est invalidé plutôt que relu : la relecture aura lieu au
 * prochain instantané demandé.
 */
function subscribe(notifier: () => void): () => void {
  abonnes.add(notifier)

  const surStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CLE) return
    cache = null
    notifier()
  }
  window.addEventListener('storage', surStorage)

  return () => {
    abonnes.delete(notifier)
    window.removeEventListener('storage', surStorage)
  }
}

/** Historique de recherche, et les deux gestes qui le modifient. */
export function useRecentSearches() {
  const entries = useSyncExternalStore(subscribe, lire, () => VIDE)

  const remember = useCallback((entry: RecentSearch) => {
    /* L'actif remonte en tête plutôt que d'être ajouté en double — c'est le
       comportement attendu d'une liste « récente », et il évite qu'une seule
       destination consultée souvent remplisse les huit lignes. */
    const precedent = lire()
    ecrire([entry, ...precedent.filter((line) => line.id !== entry.id)].slice(0, MAX))
  }, [])

  const clear = useCallback(() => {
    cache = VIDE
    try {
      window.localStorage.removeItem(CLE)
    } catch {
      /* Voir `ecrire` : l'effacement à l'écran a eu lieu, c'est ce que le lecteur
         demandait. */
    }
    for (const notifier of abonnes) notifier()
  }, [])

  return { entries, remember, clear }
}
