'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { ExchangeRates, RateOrigin } from '@zenkuu/data'
import { CURRENCY_CODES } from '@zenkuu/data/currencies'

export const CURRENCY_STORAGE_KEY = 'zenkuu-currency'

/** Devise de référence du site : celle dans laquelle les sources sont interrogées. */
export const BASE_CURRENCY = 'EUR'

interface CurrencyContextValue {
  currency: string
  setCurrency: (code: string) => void
  /**
   * Devises réellement convertibles.
   *
   * Dérivées des TAUX REÇUS, jamais du catalogue : proposer une devise dont le taux
   * manque afficherait des montants inchangés sans le signaler — exactement le genre
   * de chiffre faux que le §5 proscrit. Si une source est en panne, sa part de la
   * liste disparaît du sélecteur, et c'est le comportement voulu.
   */
  available: string[]
  /** Facteur à appliquer à un montant exprimé dans `from`. */
  convert: (amount: number, from?: string) => number
  /** Date de publication du taux, affichée partout où une conversion a lieu. */
  ratesDate: string | null
  /**
   * Provenance du taux de la devise courante.
   *
   * La table mélange un fixing de banque centrale et des cours de marché : une
   * attribution unique en pied de page mentirait sur une moitié des devises. Chaque
   * affichage converti peut donc nommer SA source.
   */
  origin: RateOrigin | null
  /** L'utilisateur regarde-t-il une autre devise que celle des sources ? */
  isConverted: boolean
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

/**
 * Devise d'affichage, partagée par TOUT le site.
 *
 * Auparavant, le sélecteur ne pilotait que la fiche actif : changer de devise
 * n'avait aucun effet sur les classements, ce qui est difficilement défendable.
 * Le contexte remonte donc au layout.
 *
 * La conversion s'appuie sur un taux BCE unique plutôt que sur un rechargement des
 * données dans la devise cible. Redemander serait plus exact — CoinGecko cote
 * nativement en plusieurs devises — mais coûterait un appel par table et par
 * changement, sur un quota gratuit qui n'en tolère qu'une poignée par minute. Le
 * compromis est rendu visible : partout où un montant est converti, l'interface
 * affiche la devise d'origine et la date du taux (§5).
 */
export function CurrencyProvider({
  children,
  rates,
}: {
  children: ReactNode
  rates: ExchangeRates | null
}) {
  const [currency, setCurrencyState] = useState(BASE_CURRENCY)

  // Préférence relue au montage, pas au premier rendu : le serveur ne connaît pas
  // le choix de l'utilisateur, et l'appliquer avant l'hydratation provoquerait un
  // écart entre le HTML rendu et le DOM attendu par React.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- voir commentaire ci-dessus
      if (stored && rates?.rates[stored]) setCurrencyState(stored)
    } catch {
      /* Stockage refusé : on reste sur la devise de référence. */
    }
  }, [rates])

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code)
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code)
    } catch {
      /* La bascule reste valable pour la session en cours. */
    }
  }, [])

  const value = useMemo<CurrencyContextValue>(() => {
    // Ordre du CATALOGUE et non alphabétique : le sélecteur affiche des groupes
    // (courantes, monnaies, crypto, métaux) dont l'ordre porte du sens. Un tri
    // alphabétique brut mélangerait le bitcoin et le bolívar.
    const available = rates
      ? CURRENCY_CODES.filter((code) => rates.rates[code] !== undefined)
      : [BASE_CURRENCY]

    const convert = (amount: number, from: string = BASE_CURRENCY): number => {
      if (from === currency) return amount
      const target = rates?.rates[currency]
      const source = rates?.rates[from]
      // Taux manquant : on renvoie le montant tel quel plutôt qu'un chiffre
      // approché. L'appelant affiche alors la devise d'origine.
      if (!target || !source) return amount
      return (amount * target) / source
    }

    return {
      currency,
      setCurrency,
      available,
      convert,
      ratesDate: rates?.origins[currency]?.date ?? rates?.date ?? null,
      origin: rates?.origins[currency] ?? null,
      isConverted: currency !== BASE_CURRENCY,
    }
  }, [currency, rates, setCurrency])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

/**
 * Accès à la devise courante.
 *
 * Renvoie une valeur de repli hors fournisseur plutôt que de lever : cela permet
 * d'utiliser les composants concernés dans un contexte serveur ou un test sans
 * monter tout l'arbre.
 */
export function useCurrency(): CurrencyContextValue {
  return (
    useContext(CurrencyContext) ?? {
      currency: BASE_CURRENCY,
      setCurrency: () => undefined,
      available: [BASE_CURRENCY],
      convert: (amount: number) => amount,
      ratesDate: null,
      origin: null,
      isConverted: false,
    }
  )
}
