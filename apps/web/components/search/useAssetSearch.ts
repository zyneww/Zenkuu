'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { SearchResult, TrendingAsset } from '@zenkuu/data'

export interface SearchResponse {
  crypto: SearchResult[]
  autres: SearchResult[]
  cryptoIndisponible: boolean
  requeteTropCourte: boolean
}

/**
 * Le délai n'est pas un réglage de confort mais une contrainte de QUOTA : sans lui,
 * taper « bitcoin » déclencherait sept requêtes vers une API qui n'en tolère que cinq
 * par minute. Combiné au seuil de deux caractères et au cache serveur, il ramène un
 * mot tapé à un seul appel réseau.
 */
const DEBOUNCE_MS = 250

/** En dessous, on ne part pas en réseau : une lettre ramène tout le catalogue. */
const MIN_QUERY = 2

/**
 * Machinerie de la recherche d'actifs — anti-rebond, annulation des réponses
 * obsolètes, tendances chargées une fois.
 *
 * ── POURQUOI CE CROCHET EXISTE ────────────────────────────────────────────────
 *
 * Cette logique vivait entièrement dans `SearchOverlay`. Le jour où l'en-tête a reçu
 * un VRAI champ de saisie — avec son propre tiroir de résultats — il y avait deux
 * façons de procéder : recopier les quatre mécanismes, ou les extraire. Recopier
 * revenait à garantir la divergence : le seuil de deux caractères aurait été relevé
 * d'un côté et pas de l'autre, l'annulation aurait été oubliée dans la copie, et le
 * quota aurait sauté sans que personne ne comprenne pourquoi le champ de l'en-tête
 * échoue là où la fenêtre marche.
 *
 * Les deux surfaces partagent donc ce crochet, et ne se distinguent plus que par leur
 * mise en forme — ce qui est exactement la différence qu'il y a entre elles.
 *
 * ── CE QU'IL NE FAIT PAS ──────────────────────────────────────────────────────
 *
 * Il ne décide ni de l'ouverture ni de la fermeture. Un champ en ligne s'ouvre au
 * focus et se ferme au clic extérieur ; une fenêtre modale s'ouvre sur un raccourci
 * et se ferme sur Échap. Ce sont deux politiques différentes, et les mélanger ici
 * aurait ramené le couplage qu'on vient de défaire.
 */
export function useAssetSearch({ active }: { active: boolean }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [trending, setTrending] = useState<TrendingAsset[]>([])
  const trendingLoaded = useRef(false)

  /**
   * Tendances chargées à la PREMIÈRE activation, puis conservées pour la session.
   *
   * Elles ne sont volontairement pas récupérées dans le layout : Next.js aligne le
   * `revalidate` d'une page sur le plus court de tous les appels de son rendu, si
   * bien qu'un seul fetch à 5 minutes placé dans le layout ramènerait TOUT le site à
   * 5 minutes. Les charger ici sort cet appel du rendu des pages.
   */
  useEffect(() => {
    if (!active || trendingLoaded.current) return
    trendingLoaded.current = true

    fetch('/api/tendances')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.trending) setTrending(payload.trending as TrendingAsset[])
      })
      .catch(() => {
        // Panne des tendances : la recherche reste pleinement utilisable. On
        // réautorise une tentative à la prochaine activation.
        trendingLoaded.current = false
      })
  }, [active])

  useEffect(() => {
    if (!active) return

    const term = query.trim()
    if (term.length < MIN_QUERY) {
      // Réaction à `query` en dessous du seuil : vide le résultat précédent sans
      // attendre une réponse réseau qui n'aura pas lieu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    // `AbortController` : une réponse lente pour « bit » ne doit pas écraser la
    // réponse déjà arrivée pour « bitcoin ». Sans cela, l'affichage revient en
    // arrière de façon aléatoire selon la latence réseau.
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/recherche?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(String(response.status))
        setResults((await response.json()) as SearchResponse)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, active])

  /**
   * Remise à zéro de la SAISIE seulement.
   *
   * `trending` survit délibérément : rouvrir la recherche doit être instantané, et
   * ces données ne se démodent pas en quelques secondes.
   *
   * `useCallback` avec une liste de dépendances VIDE, et ce n'est pas de la
   * micro-optimisation : `SearchOverlay` appelle cette fonction depuis un effet qui
   * la liste en dépendance. Une identité recréée à chaque rendu y ferait rejouer
   * l'effet à chaque rendu — ce qui ne boucle pas, parce que Réact abandonne le
   * re-rendu quand l'état ne change pas, mais qui ne tient que par cet accident.
   * Les trois setters de `useState` sont stables par contrat, la liste vide est donc
   * exacte.
   */
  const reset = useCallback(() => {
    setQuery('')
    setResults(null)
    setLoading(false)
  }, [])

  const term = query.trim()

  return {
    query,
    setQuery,
    reset,
    results,
    loading,
    trending,
    /** Vrai tant que la saisie est trop courte pour interroger le réseau. */
    showTrending: term.length < MIN_QUERY,
    /** Les deux classes réunies, dans l'ordre d'affichage. */
    found: results ? [...results.crypto, ...results.autres] : [],
  }
}
