'use client'

import { useCallback, useMemo, useState } from 'react'

import type { SpotExchange } from '@zenkuu/data'

import { SpotExchangesTable } from '@/components/market/SpotExchangesPanel'
import { TablePagination } from '@/components/ui/TablePagination'
import { useTableSort, type SortAccessor } from '@/components/ui/SortableTable'

/* Ce registre OUVRE à 100, comme la page Exchanges de la référence qui rend cent
   plateformes d'un coup — c'est le seul tableau du site dans ce cas. Les crans
   proposés restent en revanche ceux de tous les autres : une liste à part faisait
   lire « 25 » ici et « 10 » ailleurs pour le même geste. */
const OPENS_AT = 100

/** Colonnes triables du registre — les cinq que porte l'en-tête. */
export type ExchangeSortKey = 'name' | 'volume' | 'share' | 'trust' | 'country'

/**
 * Le registre complet des places, trié et paginé.
 *
 * ── POURQUOI PAGINER UNE LISTE DÉJÀ BORNÉE ───────────────────────────────────
 *
 * Cent lignes tiennent techniquement dans une page ; elles ne se lisent pas. Le
 * classement est ordonné par note de confiance, donc l'information décroît avec le
 * rang : demander au lecteur de faire défiler quatre écrans pour atteindre des places
 * dont il n'a probablement pas besoin coûte plus que de lui offrir une page suivante.
 *
 * ── LE DÉNOMINATEUR NE BOUGE NI AVEC LA PAGE, NI AVEC LE TRI ─────────────────
 *
 * ⚠️ La part du volume est calculée par `SpotExchangesTable` sur les lignes qu'on lui
 * passe. Lui donner la tranche courante ferait de la page 2 un marché à part entière,
 * où la sixième place pèserait soudain 40 % — un chiffre faux, et faux d'une manière
 * qui ne se voit pas. On lui passe donc le total de TOUTES les places, et l'on découpe
 * après : la part reste rapportée au même total d'un bout à l'autre du registre.
 *
 * Le tri ne le touche pas non plus, et c'est heureux : réordonner cent lignes ne
 * change évidemment pas la somme de leurs volumes. Le total est donc calculé sur la
 * liste D'ORIGINE, une fois pour toutes.
 *
 * ── LE RANG SUIT LE TRI, ET C'EST VOULU ─────────────────────────────────────
 *
 * La colonne de gauche numérote la POSITION DANS L'AFFICHAGE, pas le rang de
 * confiance d'origine. Trier par volume et lire « 1 » en tête est exact : c'est la
 * première par volume. Conserver le rang d'origine ferait un tableau trié dont la
 * première colonne serait en désordre, ce qui se lit comme un défaut.
 */
export function SpotExchangesExplorer({ exchanges }: { exchanges: SpotExchange[] }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(OPENS_AT)

  /*
   * Le total sert de dénominateur pour TOUTES les pages : il est calculé une fois sur
   * la liste entière, puis passé au tableau, qui ne recalcule rien.
   */
  const total = useMemo(
    () => exchanges.reduce((sum, exchange) => sum + exchange.volume24hBtc, 0),
    [exchanges],
  )

  /*
   * `share` trie sur le VOLUME BRUT et non sur le pourcentage, et les deux donnent
   * rigoureusement le même ordre : la part est le volume divisé par une constante.
   * Recalculer le pourcentage ligne à ligne pour comparer coûterait cent divisions
   * pour un résultat identique.
   */
  const accessors = useMemo<Record<ExchangeSortKey, SortAccessor<SpotExchange>>>(
    () => ({
      name: (exchange) => exchange.name,
      volume: (exchange) => exchange.volume24hBtc,
      share: (exchange) => exchange.volume24hBtc,
      trust: (exchange) => exchange.trustScore,
      country: (exchange) => exchange.country,
    }),
    [],
  )

  const backToFirstPage = useCallback(() => setPage(1), [])

  const { rows, sort, toggle } = useTableSort<SpotExchange, ExchangeSortKey>({
    rows: exchanges,
    accessors,
    onSortChange: backToFirstPage,
  })

  const start = (page - 1) * perPage
  const visible = rows.slice(start, start + perPage)

  return (
    <div className="space-y-4">
      <SpotExchangesTable
        exchanges={visible}
        shareTotal={total}
        startRank={start + 1}
        sort={sort}
        onToggleSort={toggle}
      />

      <TablePagination
        page={page}
        perPage={perPage}
        total={exchanges.length}
        unit="place"
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
