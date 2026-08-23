'use client'

import { useMemo } from 'react'
import { Table, TableBody, TableHeader } from '@/components/ui/table'

import type { TreasuryHolder, TreasuryReport } from '@zenkuu/data'
import { formatCompact } from '@zenkuu/ui'

import { SortableHeader, useTableSort, type SortAccessor } from '@/components/ui/SortableTable'
import { ColumnPicker, useColumnPreferences } from '@/components/ui/table-columns'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Registre des détenteurs institutionnels.
 *
 * ── LA PLUS-VALUE EST LATENTE, ET LE MOT EST DANS LE TABLEAU ─────────────────
 *
 * L'écart entre ce qu'une société a payé et ce que sa position vaut aujourd'hui n'est
 * pas un gain : rien n'a été vendu. La colonne s'appelle donc « latente », et la
 * mention figure sous le tableau plutôt qu'en note de bas de page — c'est la
 * différence entre un chiffre lu et un chiffre compris.
 *
 * ── UNE LIGNE SANS VALEUR D'ENTRÉE N'AFFICHE PAS ZÉRO ────────────────────────
 *
 * Plusieurs sociétés ne publient pas leur prix d'acquisition, et la source rend alors
 * `0`. Le fournisseur écarte déjà cette valeur (voir `TreasuryHolder.entryValueUsd`) ;
 * ici, la cellule affiche un tiret. Calculer une plus-value sur une entrée à zéro
 * donnerait « +100 % » sur toutes ces lignes, c'est-à-dire un chiffre inventé (§5).
 */
type HolderSortKey = 'name' | 'holdings' | 'currentValue' | 'entryValue' | 'gain' | 'supply'

export function TreasuryTable({ report, unit }: { report: TreasuryReport; unit: string }) {
  const t = usePhrase()
  /*
   * LA PLUS-VALUE EST CALCULÉE DANS L'EXTRACTEUR, pas stockée sur la ligne.
   *
   * C'est une grandeur DÉRIVÉE — l'écart relatif entre valeur actuelle et coût
   * d'entrée — et le corps du tableau la recalcule déjà pour l'afficher. La dupliquer
   * dans un champ ferait vivre deux formules pour un seul chiffre, avec la certitude
   * qu'elles divergeraient le jour où l'une serait corrigée.
   *
   * `undefined` quand l'une des deux valeurs manque, et surtout quand le coût d'entrée
   * est nul : une plus-value calculée sur une entrée à zéro rendrait « +∞ » ou
   * « +100 % » selon l'arrondi, sur toutes les sociétés qui ne publient pas leur prix
   * d'acquisition. Le tri les renvoie alors en fin de liste, où elles disent
   * exactement ce qu'on sait d'elles : rien.
   */
  const accessors = useMemo<Record<HolderSortKey, SortAccessor<TreasuryHolder>>>(
    () => ({
      name: (holder) => holder.name,
      holdings: (holder) => holder.holdings,
      currentValue: (holder) => holder.currentValueUsd,
      entryValue: (holder) => holder.entryValueUsd,
      gain: (holder) =>
        holder.entryValueUsd !== undefined &&
        holder.entryValueUsd > 0 &&
        holder.currentValueUsd !== undefined
          ? ((holder.currentValueUsd - holder.entryValueUsd) / holder.entryValueUsd) * 100
          : undefined,
      supply: (holder) => holder.percentOfSupply,
    }),
    [],
  )

  const { rows, sort, toggle } = useTableSort<TreasuryHolder, HolderSortKey>({
    rows: report.holders,
    accessors,
    /* Le registre arrive TRIÉ par avoirs décroissants — c'est l'ordre de la source, et
       celui qui répond à « qui détient le plus ». Le déclarer ici plutôt que de laisser
       `null` fait que la colonne concernée porte sa flèche dès le premier rendu, au
       lieu de laisser croire qu'aucun tri n'est appliqué. */
    initial: { key: 'holdings', direction: 'desc' },
  })

  /* « Société » et « détenus » sont verrouillées : sans le nom ni la quantité, un
     registre de détenteurs ne détient plus rien. Tout le reste est dérivable ou
     secondaire, donc retirable. */
  const prefs = useColumnPreferences('tresoreries', [
    { id: 'rank', label: 'Rang' },
    { id: 'name', label: 'Société', locked: true },
    { id: 'holdings', label: `${unit} détenus`, locked: true },
    { id: 'currentValue', label: 'Valeur actuelle' },
    { id: 'entryValue', label: 'Coût d’entrée' },
    { id: 'gain', label: 'Plus-value latente' },
    { id: 'supply', label: '% de l’offre' },
  ])

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColumnPicker prefs={prefs} />
      </div>

      <div className="rounded-card">
        {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. Le rang
            disparaît avec les autres : le registre arrive TRIÉ par avoirs décroissants,
            l'ordre des lignes le dit déjà. */}
        <Table className="border-collapse sm:min-w-[46rem]">
          <TableHeader className="[&_tr]:border-b-0">
            <tr className="border-b border-border-subtle text-left text-[0.6875rem] uppercase tracking-wide text-ink-muted">
              {prefs.isVisible('rank') ? (
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                  #
                </th>
              ) : null}
              <SortableHeader
                label={t('Société')}
                sortKey="name"
                align="left"
                sort={sort}
                onToggle={toggle}
                columnPrefs={prefs}
              />
              <SortableHeader
                label={`${unit} détenus`}
                sortKey="holdings"
                sort={sort}
                onToggle={toggle}
                columnPrefs={prefs}
              />
              {prefs.isVisible('currentValue') ? (
                <SortableHeader
                  label="Valeur actuelle $"
                  sortKey="currentValue"
                  className="hidden sm:table-cell"
                  sort={sort}
                  onToggle={toggle}
                  columnPrefs={prefs}
                />
              ) : null}
              {prefs.isVisible('entryValue') ? (
                <SortableHeader
                  label={t('Coût d’entrée $')}
                  sortKey="entryValue"
                  className="hidden md:table-cell"
                  sort={sort}
                  onToggle={toggle}
                  columnPrefs={prefs}
                />
              ) : null}
              {prefs.isVisible('gain') ? (
                <SortableHeader
                  label="Plus-value latente"
                  sortKey="gain"
                  className="hidden lg:table-cell"
                  sort={sort}
                  onToggle={toggle}
                  columnPrefs={prefs}
                />
              ) : null}
              {prefs.isVisible('supply') ? (
                <SortableHeader
                  label={t('% de l’offre')}
                  sortKey="supply"
                  className="hidden lg:table-cell"
                  sort={sort}
                  onToggle={toggle}
                  columnPrefs={prefs}
                />
              ) : null}
            </tr>
          </TableHeader>

          <TableBody className="divide-y divide-border-subtle">
            {rows.map((holder, index) => {
              const gain =
                holder.entryValueUsd !== undefined && holder.currentValueUsd !== undefined
                  ? ((holder.currentValueUsd - holder.entryValueUsd) / holder.entryValueUsd) * 100
                  : undefined

              return (
                <tr key={`${holder.name}-${index}`} className="transition-colors hover:bg-surface-muted">
                  {prefs.isVisible('rank') ? (
                    <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                      {index + 1}
                    </td>
                  ) : null}

                  <td className="px-3 py-2.5">
                    <span className="block truncate font-medium text-ink">{holder.name}</span>
                    <span className="block truncate text-[0.6875rem] text-ink-muted">
                      {holder.ticker ?? '—'}
                      {holder.country ? ` · ${holder.country}` : ''}
                    </span>
                  </td>

                  <td className="tabular px-3 py-2.5 text-right text-ink">
                    {formatCompact(holder.holdings)}
                  </td>

                  {prefs.isVisible('currentValue') ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink sm:table-cell">
                      {holder.currentValueUsd !== undefined
                        ? formatCompact(holder.currentValueUsd)
                        : '—'}
                    </td>
                  ) : null}

                  {prefs.isVisible('entryValue') ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                      {holder.entryValueUsd !== undefined
                        ? formatCompact(holder.entryValueUsd)
                        : '—'}
                    </td>
                  ) : null}

                  {prefs.isVisible('gain') ? (
                    <td
                      className={`tabular hidden px-3 py-2.5 text-right lg:table-cell ${
                        gain === undefined ? 'text-ink-muted' : gain >= 0 ? 'text-up' : 'text-down'
                      }`}
                    >
                      {gain === undefined
                        ? '—'
                        : `${gain >= 0 ? '+' : ''}${gain.toFixed(1).replace('.', ',')} %`}
                    </td>
                  ) : null}

                  {prefs.isVisible('supply') ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                      {holder.percentOfSupply !== undefined
                        ? `${holder.percentOfSupply.toFixed(3).replace('.', ',')} %`
                        : '—'}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        Registre <strong className="text-ink">déclaratif</strong> : il recense ce que des
        sociétés cotées ont annoncé détenir, à la date de leur annonce. Ce n’est ni une
        lecture on-chain, ni un état vérifié — une société qui aurait vendu sans le publier
        y figure encore. La plus-value affichée est <strong className="text-ink">latente</strong> :
        rien n’a été réalisé.
      </p>
    </div>
  )
}
