'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableHeader } from '@/components/ui/table'

import type { DexPool } from '@zenkuu/data'
import { ChangeBadge, formatCompact } from '@zenkuu/ui'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Link } from '@/i18n/navigation'
import { SortableHeader, useTableSort, type SortAccessor } from '@/components/ui/SortableTable'
import { TablePagination } from '@/components/ui/TablePagination'
import { DEFAULT_ROWS } from '@/lib/limits'

/**
 * Tableau de POOLS DE LIQUIDITÉ.
 *
 * ── CE QU'IL MONTRE, ET CE QU'IL REFUSE DE MONTRER ───────────────────────────
 *
 * Réserve, volume, transactions, frais. Pas de bouton « échanger », pas de champ de
 * montant, pas de lien vers l'interface du protocole : le §1 pose que ce site
 * observe et n'exécute rien, et un pool est précisément l'endroit où la tentation
 * inverse est la plus forte — la page de référence, elle, propose de négocier.
 *
 * ── LES CHIFFRES SONT EN DOLLARS, ET C'EST ÉCRIT ─────────────────────────────
 *
 * La source ne cote qu'en dollars (voir `DexPool`). Les convertir dans la devise du
 * lecteur supposerait de choisir un taux et un instant, ce qui transformerait une
 * mesure en estimation (§5). L'en-tête de colonne porte donc « $ » : mieux vaut une
 * unité étrangère annoncée qu'une conversion silencieuse.
 *
 * ── ACHETEURS ET VENDEURS PLUTÔT QUE « TRANSACTIONS » ────────────────────────
 *
 * Le compte brut des transactions se gonfle tout seul : un robot d'arbitrage en
 * signe des centaines par heure à lui seul. Le nombre d'ADRESSES distinctes des deux
 * côtés dit quelque chose de différent et de plus difficile à truquer — combien de
 * mains, et non combien de gestes.
 */
type PoolSortKey = 'name' | 'network' | 'price' | 'change' | 'liquidity' | 'volume' | 'traders'

export function DexPoolTable({
  pools,
  /** Rend la chaîne visible — inutile quand tous les pools sont sur la même. */
  showNetwork = false,
}: {
  pools: DexPool[]
  showNetwork?: boolean
}) {
  /*
   * `h24` ET NON LA MOYENNE DES FENÊTRES.
   *
   * `priceChange` porte six fenêtres — cinq minutes à vingt-quatre heures — et la
   * colonne affichée est celle des vingt-quatre heures. Trier sur autre chose que ce
   * qui est AFFICHÉ produirait un tableau dont l'ordre ne se lit nulle part : le
   * lecteur verrait des pourcentages en désordre et conclurait à un défaut.
   *
   * « Acheteurs / vendeurs » se trie sur le nombre d'ACHETEURS. La cellule montre deux
   * nombres, et il faut en choisir un : c'est celui qui répond à « où va l'argent »,
   * la question que pose cette colonne.
   */
  const accessors = useMemo<Record<PoolSortKey, SortAccessor<DexPool>>>(
    () => ({
      name: (pool) => pool.name,
      network: (pool) => pool.network,
      price: (pool) => pool.priceUsd,
      change: (pool) => pool.priceChange?.['h24'],
      liquidity: (pool) => pool.liquidityUsd,
      volume: (pool) => pool.volume24hUsd,
      traders: (pool) => pool.trades24h?.buyers,
    }),
    [],
  )

  const t = usePhrase()
  const { rows, sort, toggle } = useTableSort<DexPool, PoolSortKey>({
    rows: pools,
    accessors,
  })

  /*
   * La page est REMISE À UN quand le tri change, et pour la même raison que partout
   * ailleurs : la page 4 d'un classement par volume ne désigne pas les mêmes pools que
   * la page 4 d'un classement par réserve. Y rester dépose le lecteur au hasard.
   *
   * L'ajustement se fait PENDANT LE RENDU plutôt que dans un effet : un effet peindrait
   * d'abord la page 4 du nouveau tri avant de la corriger.
   */
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(DEFAULT_ROWS)

  const sortSignature = `${sort?.key ?? ''}${sort?.direction ?? ''}|${pools.length}`
  const [lastSort, setLastSort] = useState(sortSignature)
  if (sortSignature !== lastSort) {
    setLastSort(sortSignature)
    setPage(1)
  }

  if (pools.length === 0) return null

  const visible = rows.slice((page - 1) * perPage, page * perPage)

  return (
    /* `rounded-card` sur l'enveloppe, angles VIFS à l'intérieur : le tableau est un
       instrument qu'on parcourt, ses cellules doivent s'abouter. Voir la doctrine des
       deux familles de rayons dans globals.css. */
    <div className="rounded-card">
      {/* COLONNES PRIORITAIRES SOUS `sm`.

          Sept colonnes ne tiennent pas dans 320 pixels, et un tableau qui défile
          latéralement cache la moitié de ses chiffres derrière un geste que personne ne
          devine. On garde donc les quatre qui décrivent un pool — quelle paire, à quel
          prix, dans quel sens, sur quelle profondeur — et l'on rend les trois autres
          dès que la largeur revient. Le volume et le compte d'adresses répondent à une
          question d'analyse, pas de repérage : ils peuvent attendre l'écran large. */}
      <Table className="border-collapse sm:min-w-[52rem]">
        <TableHeader className="[&_tr]:border-b-0">
          <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
            <SortableHeader label={t('Paire')} sortKey="name" align="left" sort={sort} onToggle={toggle} />
            {showNetwork ? (
              <SortableHeader
                label={t('Chaîne')}
                sortKey="network"
                align="left"
                className="hidden sm:table-cell"
                sort={sort}
                onToggle={toggle}
              />
            ) : null}
            <SortableHeader label={t('Prix $')} sortKey="price" sort={sort} onToggle={toggle} />
            <SortableHeader label={t('24 h')} sortKey="change" sort={sort} onToggle={toggle} />
            <SortableHeader label={t('Réserve $')} sortKey="liquidity" sort={sort} onToggle={toggle} />
            <SortableHeader
              label={t('Volume 24 h $')}
              sortKey="volume"
              className="hidden md:table-cell"
              sort={sort}
              onToggle={toggle}
            />
            <SortableHeader
              label={t('Acheteurs / vendeurs')}
              sortKey="traders"
              className="hidden md:table-cell"
              sort={sort}
              onToggle={toggle}
            />
          </tr>
        </TableHeader>

        <TableBody className="divide-y divide-border-subtle">
          {visible.map((pool) => (
            <tr key={pool.id} className="transition-colors hover:bg-surface-muted">
              <td className="px-3 py-2">
                <Link
                  href={`/pool/${pool.network}/${pool.address}`}
                  className="group block min-w-0"
                >
                  <span className="block truncate font-medium text-ink group-hover:text-brand">
                    {pool.name}
                  </span>
                  {pool.dex ? (
                    <span className="block truncate text-[0.6875rem] text-ink-muted">
                      {pool.dex}
                      {pool.feePercent !== undefined
                        ? ` · ${pool.feePercent.toString().replace('.', ',')} %`
                        : ''}
                    </span>
                  ) : null}
                </Link>
              </td>

              {showNetwork ? (
                <td className="hidden px-3 py-2 sm:table-cell">
                  <span className="rounded-control bg-surface-muted px-1.5 py-0.5 text-[0.6875rem] uppercase text-ink-muted">
                    {pool.network}
                  </span>
                </td>
              ) : null}

              <td className="tabular px-3 py-2 text-right text-ink">
                {pool.priceUsd !== undefined ? formatPrice(pool.priceUsd) : '—'}
              </td>

              <td className="px-3 py-2 text-right">
                <ChangeBadge value={pool.priceChange?.['h24']} size="sm" />
              </td>

              <td className="tabular px-3 py-2 text-right text-ink">
                {pool.liquidityUsd !== undefined ? formatCompact(pool.liquidityUsd) : '—'}
              </td>

              <td className="tabular hidden px-3 py-2 text-right text-ink md:table-cell">
                {pool.volume24hUsd !== undefined ? formatCompact(pool.volume24hUsd) : '—'}
              </td>

              <td className="tabular hidden px-3 py-2 text-right text-ink-muted md:table-cell">
                {pool.trades24h ? (
                  <>
                    <span className="text-up">{pool.trades24h.buyers}</span>
                    <span className="mx-1">/</span>
                    <span className="text-down">{pool.trades24h.sellers}</span>
                  </>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </TableBody>
      </Table>

      {/* « paire » et non « pool » : la colonne de gauche porte le NOM DE LA PAIRE
          (SOL / USDC), et l'unité doit nommer ce que le lecteur voit compter. Les
          unités reconnues sont énumérées par `TablePagination` — une unité inconnue
          retombe silencieusement sur « résultat ». */}
      <TablePagination
        page={page}
        perPage={perPage}
        total={pools.length}
        unit="paire"
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setPerPage(size)
          setPage(1)
        }}
      />
    </div>
  )
}

/**
 * Prix on-chain — la précision suit l'ORDRE DE GRANDEUR.
 *
 * Un jeton peut valoir 75 dollars ou 0,000000042. Deux décimales rendraient le
 * second « 0,00 », c'est-à-dire un zéro affiché là où il y a une valeur — le genre
 * d'erreur qu'un site de marché ne peut pas se permettre. On monte donc jusqu'à huit
 * décimales significatives quand le prix descend sous le centième.
 */
function formatPrice(value: number): string {
  const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : 8
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value)
}
