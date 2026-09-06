'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { AssetClass, MarketAsset, SearchResult } from '@zenkuu/data'

export interface SearchResponse {
  crypto: SearchResult[]
  autres: SearchResult[]
  cryptoIndisponible: boolean
  requeteTropCourte: boolean
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUI RENDAIT LA RECHERCHE LENTE — ET CE QUI NE L'A JAMAIS RENDUE LENTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Mesuré sur `/api/recherche`, en développement :
 *
 *     requête inédite   ~300–400 ms   (aller-retour CoinGecko)
 *     requête déjà vue   ~20 ms       (cache applicatif du serveur)
 *
 * Le serveur n'était donc PAS le problème. Les trois causes étaient ici, et elles
 * s'additionnaient au point de faire paraître interminable un appel de vingt
 * millisecondes :
 *
 *   1. ANTI-REBOND DE 250 ms. Il s'ajoutait à chaque frappe — y compris quand la
 *      réponse était déjà connue et qu'il n'y avait strictement rien à attendre.
 *
 *   2. AUCUNE MÉMOIRE. Effacer un caractère puis le retaper — le geste le plus
 *      courant d'une recherche — repartait en réseau pour une requête déjà résolue
 *      quelques centaines de millisecondes plus tôt.
 *
 *   3. LA LISTE SE VIDAIT À CHAQUE FRAPPE. `setResults(null)` puis un état de
 *      chargement : le tiroir clignotait du vide au plein à chaque caractère. C'est
 *      la cause la plus INSIDIEUSE, parce qu'elle ne coûte aucune milliseconde et
 *      qu'elle est pourtant la plus visible — un panneau qui se vide se lit comme un
 *      panneau qui recommence de zéro.
 *
 * ── LES TROIS RÉPONSES ────────────────────────────────────────────────────────
 *
 *   1. Une MÉMOIRE de session (`answers`), consultée AVANT tout : une requête déjà
 *      vue s'affiche dans l'image suivante, sans anti-rebond ni réseau.
 *   2. L'anti-rebond descend à 140 ms, ce que la mémoire rend sûr — il ne protège
 *      plus que les frappes réellement inédites.
 *   3. Les résultats PRÉCÉDENTS restent affichés pendant qu'on cherche les suivants.
 *      Le tiroir ne se vide plus jamais entre deux états pleins.
 *
 * ── LE QUOTA RESTE TENU, ET C'EST LA CONTRAINTE QUI COMMANDE ─────────────────
 *
 * L'anti-rebond n'est pas un réglage de confort : sans lui, taper « bitcoin »
 * lancerait sept requêtes vers une source qui n'en tolère qu'une poignée par minute.
 * Le descendre de 250 à 140 ms ne change rien à ce calcul — c'est la mémoire qui a
 * rendu la marge, en supprimant les allers-retours redondants qui la mangeaient.
 * Combiné au seuil de deux caractères et au cache serveur, un mot tapé reste UN appel.
 */
const DEBOUNCE_MS = 140

/** En dessous, on ne part pas en réseau : une lettre ramène tout le catalogue. */
const MIN_QUERY = 2

/**
 * Nombre de réponses gardées en mémoire pour la session.
 *
 * Cent : une recherche va rarement au-delà de quelques dizaines de requêtes
 * distinctes, et une réponse pèse huit entrées de catalogue. Le plafond n'est pas là
 * pour économiser de la mémoire mais pour BORNER : un cache sans limite dans un
 * onglet laissé ouvert une journée est une fuite, même lente.
 */
const MEMORY_LIMIT = 100

/** Forme de comparaison — « BitCoin », « bitcoin » et « bitcoin » sont la même requête. */
function key(query: string): string {
  return query.trim().toLowerCase()
}

/**
 * Machinerie de la recherche d'actifs — mémoire, anti-rebond, annulation des réponses
 * obsolètes, tendances chargées une fois.
 *
 * ── POURQUOI CE CROCHET EXISTE ────────────────────────────────────────────────
 *
 * Cette logique vivait entièrement dans `SearchOverlay`. Le jour où l'en-tête a reçu
 * un VRAI champ de saisie — avec son propre tiroir de résultats — il y avait deux
 * façons de procéder : recopier les mécanismes, ou les extraire. Recopier revenait à
 * garantir la divergence : le seuil de deux caractères aurait été relevé d'un côté et
 * pas de l'autre, l'annulation aurait été oubliée dans la copie, et le quota aurait
 * sauté sans que personne ne comprenne pourquoi le champ de l'en-tête échoue là où la
 * fenêtre marche.
 *
 * Les deux surfaces partagent donc ce crochet, et ne se distinguent plus que par leur
 * mise en forme — ce qui est exactement la différence qu'il y a entre elles.
 *
 * ⚠️ LA MÉMOIRE N'EST PAS PARTAGÉE ENTRE LES DEUX SURFACES, et c'est un choix : elles
 * ne sont jamais ouvertes en même temps (l'une est sous `md`, l'autre au-dessus), et
 * un cache de module survivrait à la navigation sans que rien ne l'invalide.
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
  const [trending, setTrending] = useState<MarketAsset[]>([])
  const trendingLoaded = useRef(false)

  /**
   * État de suivi des tendances — `null` tant qu'on ne l'a pas.
   *
   * ⚠️ `null` ET NON UN ENSEMBLE VIDE, ET LA DIFFÉRENCE EST TOUT L'INTÉRÊT.
   *
   * Un ensemble vide dit « aucun de ces actifs n'est suivi » ; `null` dit « je ne sais
   * pas encore ». L'étoile est une BASCULE : rendue à « non suivi » sur un actif déjà
   * suivi, elle le retirerait au premier clic. Les deux états doivent donc rester
   * distincts, et la ligne n'affiche rien tant que la réponse n'est pas revenue.
   */
  const [followed, setFollowed] = useState<{
    available: boolean
    ids: Set<string>
    /**
     * Les lignes de la liste de suivi, pour la section du panneau.
     *
     * Servies par la MÊME réponse que les identifiants — voir `/api/suivi`, où les
     * deux lectures partagent une seule requête de base. Un second appel pour la même
     * liste aurait été payé par chaque ouverture du panneau.
     */
    entries: { assetClass: AssetClass; assetId: string; label: string; symbol: string }[]
  } | null>(null)
  const followedLoaded = useRef(false)

  /* Une `Map` dans une référence, pas dans un état : y écrire ne doit RIEN redessiner.
     C'est l'affectation de `results` qui provoque le rendu, et elle a déjà lieu. */
  const answers = useRef(new Map<string, SearchResponse>())

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
        if (payload?.trending) setTrending(payload.trending as MarketAsset[])
      })
      .catch(() => {
        // Panne des tendances : la recherche reste pleinement utilisable. On
        // réautorise une tentative à la prochaine activation.
        trendingLoaded.current = false
      })
  }, [active])

  /**
   * État de suivi, chargé à la première activation lui aussi.
   *
   * Un effet SÉPARÉ de celui des tendances, et non une promesse groupée : les deux
   * réponses n'ont ni le même coût ni les mêmes conséquences en cas de panne. Les
   * tendances en panne vident la liste ; le suivi en panne laisse une liste complète
   * sans étoiles. Les attendre ensemble ferait payer à l'une le délai de l'autre.
   *
   * ⚠️ IL N'EST PAS RETENTÉ APRÈS UN ÉCHEC, là où les tendances le sont. Une liste de
   * suivi indisponible n'empêche RIEN — on cherche, on navigue, on clique — et
   * relancer l'appel à chaque ouverture de la recherche insisterait sur une panne qui
   * ne gêne personne.
   */
  useEffect(() => {
    if (!active || followedLoaded.current) return
    followedLoaded.current = true

    fetch('/api/suivi')
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          payload: {
            available: boolean
            ids: string[]
            /* Une classe inconnue ne peut pas arriver ici : `/api/suivi` écarte les
               lignes dont la classe ne mène à aucune page. Voir `getWatchlistEntries`. */
            entries?: { assetClass: AssetClass; assetId: string; label: string; symbol: string }[]
          } | null,
        ) => {
          if (payload)
            setFollowed({
              available: payload.available,
              ids: new Set(payload.ids),
              /* `?? []` : une réponse antérieure au champ `entries` — servie par un
                 cache de navigateur, ou par un déploiement en cours de bascule — ne
                 doit pas faire tomber la section. Elle s'affiche vide, ce qui est
                 aussi ce qu'elle montre à qui ne suit rien. */
              entries: payload.entries ?? [],
            })
        },
      )
      .catch(() => {
        /* Silence assumé : `followed` reste `null`, donc aucune étoile ne s'affiche.
           Mieux vaut pas d'étoile qu'une étoile qui se trompe de sens. */
      })
  }, [active])

  useEffect(() => {
    if (!active) return

    const term = query.trim()

    if (term.length < MIN_QUERY) {
      /* Sous le seuil, on RÉTABLIT l'affichage des tendances — c'est le seul endroit
         où vider les résultats est juste, puisque le tiroir montre alors autre chose
         qu'une liste vide. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null)
      setLoading(false)
      return
    }

    /*
     * ── LA MÉMOIRE, CONSULTÉE AVANT L'ANTI-REBOND ─────────────────────────────
     *
     * L'ordre est tout : placée après le minuteur, elle aurait encore coûté 140 ms
     * pour une réponse déjà en main. Ici, effacer un caractère puis le retaper affiche
     * le résultat dans l'image suivante.
     */
    const known = answers.current.get(key(term))
    if (known) {
      setResults(known)
      setLoading(false)
      return
    }

    /*
     * ⚠️ ON NE VIDE PAS `results` ICI, et c'est le cœur du correctif.
     *
     * L'ancienne version posait `null` à chaque frappe : le tiroir se vidait, affichait
     * un état de chargement, puis se remplissait. Trois états visibles pour une
     * recherche de vingt millisecondes.
     *
     * Les résultats de « bitcoi » restent donc affichés pendant qu'on cherche
     * « bitcoin ». Ils sont périmés d'un caractère, jamais faux, et le drapeau
     * `loading` dit qu'une réponse est en route.
     */
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
        const payload = (await response.json()) as SearchResponse

        /* Bornage FIFO : la plus ancienne entrée part quand le plafond est atteint.
           Une `Map` conserve son ordre d'insertion, la première clé est donc la plus
           vieille — aucun horodatage à tenir. */
        if (answers.current.size >= MEMORY_LIMIT) {
          const oldest = answers.current.keys().next().value
          if (oldest !== undefined) answers.current.delete(oldest)
        }
        answers.current.set(key(term), payload)

        setResults(payload)
      } catch (error) {
        /* Un échec RÉSEAU laisse les résultats précédents en place plutôt que de vider
           le tiroir : ils restent la meilleure réponse disponible, et la vraie panne
           serait de faire croire qu'il n'y a rien à trouver. */
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
   * `trending` et la mémoire des réponses survivent délibérément : rouvrir la
   * recherche doit être instantané, et ces données ne se démodent pas en quelques
   * secondes.
   *
   * `useCallback` avec une liste de dépendances VIDE, et ce n'est pas de la
   * micro-optimisation : `SearchOverlay` appelle cette fonction depuis un effet qui
   * la liste en dépendance. Une identité recréée à chaque rendu y ferait rejouer
   * l'effet à chaque rendu — ce qui ne boucle pas, parce que React abandonne le
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
    followed,
    /** Vrai tant que la saisie est trop courte pour interroger le réseau. */
    showTrending: term.length < MIN_QUERY,
    /** Les deux classes réunies, dans l'ordre d'affichage. */
    found: results ? [...results.crypto, ...results.autres] : [],
  }
}
