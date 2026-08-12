'use client'

import { useEffect, useState } from 'react'

import { BINANCE_DATA_HOST, subscribeTicker, toBinancePair } from './binance-market'

/**
 * Dernier cours d'un actif, en direct — WebSocket d'abord, sondage en repli.
 *
 * ── POURQUOI LES DEUX, ET PAS SEULEMENT LE PLUS RAPIDE ────────────────────────
 *
 * Le WebSocket est meilleur sur les deux tableaux à la fois : il pousse un cours par
 * seconde là où le sondage en demandait un toutes les quatre, et il n'ouvre qu'UNE
 * connexion là où le sondage émettait neuf cents requêtes par heure d'onglet ouvert.
 * Il n'y a donc aucun arbitrage à faire entre fraîcheur et coût.
 *
 * Il a en revanche un mode de défaillance que le sondage n'a pas : `wss://` est
 * bloqué par une partie des réseaux d'entreprise et des extensions de filtrage, qui
 * laissent passer le HTTPS ordinaire. Sans repli, ces visiteurs verraient un cours
 * définitivement figé — et rien à l'écran ne le leur dirait, ce qui est la pire
 * forme du défaut : un chiffre périmé porte la même autorité qu'un chiffre juste.
 *
 * Le repli ne se déclenche donc PAS sur une erreur — le navigateur n'en signale
 * aucune quand un intermédiaire avale la connexion — mais sur un SILENCE. Si rien
 * n'est arrivé dans le délai ci-dessous, on considère le flux perdu et le sondage
 * prend le relais pour toute la durée de vie du montage.
 *
 * ── CE QUE CE CROCHET NE FAIT PAS ─────────────────────────────────────────────
 *
 * Il ne convertit pas. Le cours rendu est celui de la paire en USDT, assimilé à
 * l'USD (voir `binance-market.ts`) ; c'est à l'appelant d'appliquer le taux de la
 * devise choisie, parce que lui seul sait s'il affiche un montant ou s'il alimente
 * une série déjà libellée dans une autre devise.
 *
 * Il ne se substitue jamais à la donnée du serveur : `null` signifie « pas de
 * direct », et l'appelant doit alors montrer ce qu'il montrait déjà (§5).
 */

/** Silence au-delà duquel on tient le WebSocket pour perdu et on sonde. */
const STREAM_GRACE_MS = 6_000

/**
 * Cadence du repli. Quatre secondes, comme le sondage qu'il remplace : c'est déjà
 * bien plus rapide que les trois minutes de notre cache applicatif, et Binance
 * compte cet appel pour un poids de 1 sur un plafond de 1 200 par minute.
 */
const POLL_INTERVAL_MS = 4_000
const FETCH_TIMEOUT_MS = 4_000

export interface LiveTick {
  /** Cours de la paire, en USDT — assimilé à l'USD. */
  price: number
  /** Horodatage du relevé, tel que la source l'annonce. */
  at: number
}

export function useLiveTicker(symbol: string | undefined, enabled = true): LiveTick | null {
  const [tick, setTick] = useState<LiveTick | null>(null)

  useEffect(() => {
    // Remise à zéro AVANT toute chose : un cours affiché pour l'actif précédent ne
    // doit pas survivre au changement d'actif le temps que la nouvelle paire réponde.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTick(null)

    if (!enabled || !symbol) return

    const pair = toBinancePair(symbol)
    let cancelled = false
    let streamAlive = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const unsubscribe = subscribeTicker(pair, (price, at) => {
      if (cancelled) return
      streamAlive = true
      setTick({ price, at })
    })

    /*
     * Sondage de secours, armé APRÈS le délai de grâce et une seule fois.
     *
     * Il ne coupe pas le WebSocket : si celui-ci se réveille plus tard — le cas d'un
     * portable qui sort de veille — ses messages reprennent la main naturellement,
     * puisque les deux écrivent dans le même état et que le flux écrit plus souvent.
     */
    const graceTimer = setTimeout(() => {
      if (cancelled || streamAlive) return

      async function poll(): Promise<void> {
        if (cancelled) return
        try {
          const response = await fetch(
            `${BINANCE_DATA_HOST}/api/v3/ticker/price?symbol=${pair}`,
            { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
          )
          if (!response.ok) {
            // Paire inconnue : on n'insiste pas. L'appelant garde la donnée serveur.
            if (pollTimer) clearInterval(pollTimer)
            return
          }
          const payload = (await response.json()) as { price?: string }
          const price = Number(payload.price)
          if (!cancelled && Number.isFinite(price)) setTick({ price, at: Date.now() })
        } catch {
          if (pollTimer) clearInterval(pollTimer)
        }
      }

      void poll()
      pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS)
    }, STREAM_GRACE_MS)

    return () => {
      cancelled = true
      clearTimeout(graceTimer)
      if (pollTimer) clearInterval(pollTimer)
      unsubscribe()
    }
  }, [symbol, enabled])

  return tick
}
