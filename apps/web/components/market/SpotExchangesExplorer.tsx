'use client'

import { useState } from 'react'

import type { SpotExchange } from '@zenkuu/data'

import { SpotExchangesTable } from '@/components/market/SpotExchangesPanel'
import { Pagination } from '@/components/ui/Pagination'

const PAGE_SIZES = [25, 50, 100] as const

/**
 * Le registre complet des places, paginé.
 *
 * ── POURQUOI PAGINER UNE LISTE DÉJÀ BORNÉE ───────────────────────────────────
 *
 * Cent lignes tiennent techniquement dans une page ; elles ne se lisent pas. Le
 * classement est ordonné par note de confiance, donc l'information décroît avec le
 * rang : demander au lecteur de faire défiler quatre écrans pour atteindre des places
 * dont il n'a probablement pas besoin coûte plus que de lui offrir une page suivante.
 *
 * ── LE DÉNOMINATEUR NE BOUGE PAS AVEC LA PAGE ────────────────────────────────
 *
 * ⚠️ La part du volume est calculée par `SpotExchangesTable` sur les lignes qu'on lui
 * passe. Lui donner la tranche courante ferait de la page 2 un marché à part entière,
 * où la sixième place pèserait soudain 40 % — un chiffre faux, et faux d'une manière
 * qui ne se voit pas. On lui passe donc TOUTES les places, et l'on découpe après :
 * la part reste rapportée au même total d'un bout à l'autre du registre.
 *
 * D'où le `slice` opéré ici plutôt qu'à l'intérieur du tableau.
 */
export function SpotExchangesExplorer({ exchanges }: { exchanges: SpotExchange[] }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(PAGE_SIZES[0])

  /*
   * Le total sert de dénominateur pour TOUTES les pages : il est calculé une fois sur
   * la liste entière, puis passé au tableau, qui ne recalcule rien.
   */
  const total = exchanges.reduce((sum, exchange) => sum + exchange.volume24hBtc, 0)
  const start = (page - 1) * perPage
  const visible = exchanges.slice(start, start + perPage)

  return (
    <div className="space-y-4">
      <SpotExchangesTable exchanges={visible} shareTotal={total} startRank={start + 1} />

      <Pagination
        page={page}
        perPage={perPage}
        total={exchanges.length}
        unit="place"
        perPageChoices={PAGE_SIZES}
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setPerPage(size)
          // Repartir en tête : la page 3 de vingt-cinq lignes n'a pas d'équivalent en
          // cent, et y rester déposerait le lecteur au milieu du classement.
          setPage(1)
        }}
      />
    </div>
  )
}
