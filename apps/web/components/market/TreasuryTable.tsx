'use client'

import { useMemo, useState } from 'react'
import { emphasise } from '@/components/locale/emphasise'
import { Table, TableBody, TableHeader } from '@/components/ui/table'

import type { TreasuryHolder, TreasuryReport } from '@zenkuu/data'

import { SortableHeader, useTableSort, type SortAccessor } from '@/components/ui/SortableTable'
import { TablePagination } from '@/components/ui/TablePagination'
import { DEFAULT_ROWS } from '@/lib/limits'
import { ColumnPicker, useColumnPreferences } from '@/components/ui/table-columns'
import { usePhrase } from '@/components/locale/ContentProvider'
import { useFormatters } from '@/components/locale/useFormatters'

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
  const nombres = useFormatters()

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
  /* ⚠️ CES SEPT LIBELLÉS SONT AFFICHÉS, et six d'entre eux sortaient en français.

     Ils ne servent pas qu'à identifier une colonne dans le code : le sélecteur
     « Personnaliser » les rend en toutes lettres, un par ligne, avec un champ de
     recherche qui filtre dessus. Un lecteur allemand ouvrait donc une liste de sept
     entrées françaises pour choisir ses colonnes.

     Le défaut ne se voyait pas au relevé automatique : ce sont des chaînes passées en
     PROPRIÉTÉ à un crochet, pas du texte écrit dans du JSX. */
  const prefs = useColumnPreferences('tresoreries', [
    { id: 'rank', label: t('Rang') },
    { id: 'name', label: t('Société'), locked: true },
    { id: 'holdings', label: t('{unit} détenus').replace('{unit}', unit), locked: true },
    { id: 'currentValue', label: t('Valeur actuelle') },
    { id: 'entryValue', label: t('Coût d’entrée') },
    { id: 'gain', label: t('Plus-value latente') },
    { id: 'supply', label: t('% de l’offre') },
  ])

  /* Même remise à un que les autres registres triés : la page 3 par plus-value ne
     désigne pas les mêmes sociétés que la page 3 par avoirs. */
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(DEFAULT_ROWS)

  const sortSignature = `${sort?.key ?? ''}${sort?.direction ?? ''}|${report.holders.length}`
  const [lastSort, setLastSort] = useState(sortSignature)
  if (sortSignature !== lastSort) {
    setLastSort(sortSignature)
    setPage(1)
  }

  const start = (page - 1) * perPage
  const visible = rows.slice(start, start + perPage)

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
            <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
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
                label={t('{unit} détenus').replace('{unit}', unit)}
                sortKey="holdings"
                sort={sort}
                onToggle={toggle}
                columnPrefs={prefs}
              />
              {prefs.isVisible('currentValue') ? (
                <SortableHeader
                  label={t('Valeur actuelle $')}
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
                  label={t('Plus-value latente')}
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
            {visible.map((holder, index) => {
              const gain =
                holder.entryValueUsd !== undefined && holder.currentValueUsd !== undefined
                  ? ((holder.currentValueUsd - holder.entryValueUsd) / holder.entryValueUsd) * 100
                  : undefined

              return (
                <tr key={`${holder.name}-${index}`} className="transition-colors hover:bg-surface-muted">
                  {prefs.isVisible('rank') ? (
                    <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                      {/* Le rang suit la POSITION DANS LE REGISTRE, pas dans la page :
                          repartir à 1 en page 2 ferait deux premiers détenteurs. */}
                      {start + index + 1}
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
                    {nombres.compact(holder.holdings)}
                  </td>

                  {prefs.isVisible('currentValue') ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink sm:table-cell">
                      {holder.currentValueUsd !== undefined
                        ? nombres.compact(holder.currentValueUsd)
                        : '—'}
                    </td>
                  ) : null}

                  {prefs.isVisible('entryValue') ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                      {holder.entryValueUsd !== undefined
                        ? nombres.compact(holder.entryValueUsd)
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
                        : `${gain >= 0 ? '+' : ''}${nombres.fixed(gain, 1) ?? '—'} %`}
                    </td>
                  ) : null}

                  {prefs.isVisible('supply') ? (
                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                      {holder.percentOfSupply !== undefined
                        ? `${nombres.fixed(holder.percentOfSupply, 3) ?? '—'} %`
                        : '—'}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        perPage={perPage}
        total={report.holders.length}
        unit="société"
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setPerPage(size)
          setPage(1)
        }}
      />

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        {emphasise(
          t(
            'Registre **déclaratif** : il recense ce que des sociétés cotées ont annoncé détenir, à la date de leur annonce. Ce n’est ni une lecture on-chain, ni un état vérifié — une société qui aurait vendu sans le publier y figure encore. La plus-value affichée est **latente** : rien n’a été réalisé.',
          ),
        )}
      </p>
    </div>
  )
}
