'use client'

import { useEffect, useState } from 'react'

import type { DexPool } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { usePanelVisible } from '@/components/asset/panel-visibility'
import { DexPoolTable } from '@/components/market/DexPoolTable'
import { Link } from '@/i18n/navigation'

/**
 * POOLS DE LIQUIDITÉ DU JETON — notre réponse à « l'écosystème applicatif ».
 *
 * ── CE QUE CE BLOC REMPLACE, ET POURQUOI CE N'EST PAS UN PIS-ALLER ────────────
 *
 * La référence consacre un onglet entier aux applications déployées SUR une chaîne :
 * leur valeur verrouillée, leur volume, leurs prêts en cours. Aucune de nos sources ne
 * publie cet inventaire, et le §5 interdit de le reconstituer à vue de nez.
 *
 * Les pools répondent à une question voisine et, pour un lecteur, souvent plus utile :
 * où ce jeton s'échange-t-il SANS INTERMÉDIAIRE, et avec quelle profondeur. Un pool est
 * un contrat à une adresse précise, sur une chaîne nommée, dont la réserve est publique
 * — c'est-à-dire l'inverse d'une estimation. Là où l'onglet « Places » liste les
 * carnets d'ordres tenus par des entreprises, celui-ci liste les réserves tenues par du
 * code.
 *
 * ── UNE SEULE CHAÎNE INTERROGÉE, ET ELLE EST CHOISIE ──────────────────────────
 *
 * Un jeton répandu porte dix adresses de contrat, une par chaîne. Les interroger toutes
 * ferait dix appels pour une section, sur une source plafonnée à vingt-quatre par
 * minute. La chaîne est donc choisie par ordre de préférence — voir `CHAIN_PRIORITY` —
 * et l'encadré dit laquelle, pour qu'on ne prenne pas la liquidité d'une chaîne pour
 * celle du jeton entier.
 *
 * ── ET RIEN N'EST CHARGÉ TANT QUE L'ONGLET N'EST PAS OUVERT ───────────────────
 *
 * Même règle que l'onglet « Analyse » : les cinq panneaux sont dans le document dès le
 * premier rendu, un chargement au montage ferait donc payer cet appel à tout le monde.
 */

/**
 * Ordre de préférence des chaînes.
 *
 * Ce n'est pas un classement de qualité mais de LIQUIDITÉ OBSERVÉE : pour un jeton
 * présent sur plusieurs chaînes, c'est presque toujours sa chaîne d'origine ou la plus
 * profonde qui porte les pools significatifs, et les autres n'en ont que des copies
 * ponctuelles. Afficher un pool de trente mille dollars sur une chaîne secondaire quand
 * il en existe un de trois cents millions ailleurs donnerait une idée fausse.
 *
 * Une chaîne hors de cette liste reste utilisable : elle passe simplement après celles
 * qui y figurent, dans l'ordre où la source publie les contrats.
 */
const CHAIN_PRIORITY = [
  'ethereum',
  'solana',
  'base',
  'binance-smart-chain',
  'arbitrum-one',
  'polygon-pos',
  'optimistic-ethereum',
  'avalanche',
  'the-open-network',
  'tron',
]

/** Libellés lisibles. Les identifiants de la source ne sont pas des noms. */
const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  solana: 'Solana',
  base: 'Base',
  'binance-smart-chain': 'BNB Chain',
  'polygon-pos': 'Polygon',
  'arbitrum-one': 'Arbitrum',
  'optimistic-ethereum': 'Optimism',
  avalanche: 'Avalanche',
  tron: 'Tron',
  fantom: 'Fantom',
  cronos: 'Cronos',
  celo: 'Celo',
  linea: 'Linea',
  scroll: 'Scroll',
  blast: 'Blast',
  mantle: 'Mantle',
  sui: 'Sui',
  aptos: 'Aptos',
  'the-open-network': 'TON',
  'near-protocol': 'NEAR',
  hyperevm: 'HyperEVM',
  'sei-v2': 'Sei',
  zksync: 'zkSync',
}

export function AssetPools({
  contracts,
  assetName,
}: {
  /** Adresses par chaîne, telles que `AssetDetail.contracts` les porte. */
  contracts: Record<string, string>
  assetName: string
}) {
  const visible = usePanelVisible()
  const [pools, setPools] = useState<DexPool[] | null>(null)
  const [settled, setSettled] = useState(false)

  const platforms = Object.keys(contracts)
  const chosen =
    CHAIN_PRIORITY.find((chain) => platforms.includes(chain)) ?? platforms[0] ?? undefined
  const address = chosen ? contracts[chosen] : undefined

  useEffect(() => {
    if (!visible || !chosen || !address) return

    let cancelled = false
    void fetch(
      `/api/pools?plateforme=${encodeURIComponent(chosen)}&adresse=${encodeURIComponent(address)}`,
    )
      .then((response) => response.json())
      .catch(() => null)
      .then((payload: { ok?: boolean; pools?: DexPool[] } | null) => {
        if (cancelled) return
        if (payload?.ok && Array.isArray(payload.pools)) setPools(payload.pools)
        setSettled(true)
      })

    return () => {
      cancelled = true
    }
  }, [visible, chosen, address])

  // Jeton natif d'une chaîne — bitcoin, ether — ou chaîne que nous ne savons pas
  // interroger : la section n'existe pas. Un encadré « aucun pool » serait faux, la
  // question ne se pose simplement pas pour un actif sans contrat.
  if (!chosen || !address) return null

  const chainLabel = CHAIN_LABELS[chosen] ?? chosen

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="display-sm text-ink">Pools de liquidité</h2>
        <Link
          href="/marches"
          className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
        >
          Tous les marchés on-chain
        </Link>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        Là où l’onglet « Places » liste les carnets d’ordres tenus par des entreprises,
        ceux-ci sont des réserves tenues par du code : deux jetons déposés dans un contrat,
        à une adresse publique. Les chiffres portent sur{' '}
        <strong className="font-medium text-ink">{chainLabel}</strong> seulement — {assetName}{' '}
        {platforms.length > 1
          ? `est déployé sur ${platforms.length} chaînes, et nous interrogeons la plus profonde plutôt que toutes`
          : 'n’est déployé que sur cette chaîne'}
        .
      </p>

      {!settled ? (
        <div className="space-y-2" aria-live="polite">
          <div className="h-9 animate-pulse rounded bg-surface" />
          <div className="h-9 animate-pulse rounded bg-surface" />
          <div className="h-9 animate-pulse rounded bg-surface" />
        </div>
      ) : pools && pools.length > 0 ? (
        <>
          <DexPoolTable pools={pools} />
          <SourceNote label="GeckoTerminal · montants en USD" href="https://www.geckoterminal.com" />
        </>
      ) : (
        <EmptyState
          title={`Aucun pool référencé sur ${chainLabel}`}
          description={`Notre source on-chain ne publie pas de pool pour cette adresse. Cela signifie que ${assetName} s’échange essentiellement sur des places centralisées — voir l’onglet « Places » — ou sur une chaîne que nous ne savons pas encore interroger.`}
          compact
        />
      )}
    </section>
  )
}
