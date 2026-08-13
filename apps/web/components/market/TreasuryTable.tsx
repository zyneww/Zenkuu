import type { TreasuryReport } from '@zenkuu/data'
import { formatCompact } from '@zenkuu/ui'

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
export function TreasuryTable({ report, unit }: { report: TreasuryReport; unit: string }) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-card border border-border-subtle">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[0.6875rem] uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-3 py-2 font-medium">
                #
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Société
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {unit} détenus
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                Valeur actuelle $
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
                Coût d’entrée $
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
                Plus-value latente
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
                % de l’offre
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {report.holders.map((holder, index) => {
              const gain =
                holder.entryValueUsd !== undefined && holder.currentValueUsd !== undefined
                  ? ((holder.currentValueUsd - holder.entryValueUsd) / holder.entryValueUsd) * 100
                  : undefined

              return (
                <tr key={`${holder.name}-${index}`} className="transition-colors hover:bg-surface-muted">
                  <td className="tabular px-3 py-2.5 text-xs text-ink-muted">{index + 1}</td>

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

                  <td className="tabular hidden px-3 py-2.5 text-right text-ink sm:table-cell">
                    {holder.currentValueUsd !== undefined
                      ? formatCompact(holder.currentValueUsd)
                      : '—'}
                  </td>

                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                    {holder.entryValueUsd !== undefined
                      ? formatCompact(holder.entryValueUsd)
                      : '—'}
                  </td>

                  <td
                    className={`tabular hidden px-3 py-2.5 text-right lg:table-cell ${
                      gain === undefined ? 'text-ink-muted' : gain >= 0 ? 'text-up' : 'text-down'
                    }`}
                  >
                    {gain === undefined
                      ? '—'
                      : `${gain >= 0 ? '+' : ''}${gain.toFixed(1).replace('.', ',')} %`}
                  </td>

                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                    {holder.percentOfSupply !== undefined
                      ? `${holder.percentOfSupply.toFixed(3).replace('.', ',')} %`
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
