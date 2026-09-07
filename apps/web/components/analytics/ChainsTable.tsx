'use client'

import { useMemo, useState } from 'react'

import type { DefiChain } from '@zenkuu/data'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Money } from '@/components/locale/Money'
import { useFormatters } from '@/components/locale/useFormatters'
import { TablePagination } from '@/components/ui/TablePagination'
import { Link } from '@/i18n/navigation'

/**
 * LES CHAÎNES CLASSÉES PAR VALEUR IMMOBILISÉE.
 *
 * ── LA PART EST CALCULÉE SUR LE TOTAL REÇU, ET LA PAGE LE DIT ──────────────
 *
 * Le dénominateur est la somme des chaînes de CE tableau, pas le total mondial de la
 * finance décentralisée. Les deux diffèrent : la source publie quatre cent soixante-six
 * chaînes et on en garde cent. Rapporter au second donnerait des parts qui ne somment
 * jamais à 100 % sans qu'on sache pourquoi ; le premier se somme exactement, et c'est
 * la part DANS CE TABLEAU — ce que le lecteur a sous les yeux.
 *
 * C'est le même raisonnement que `ExchangeTickersTable` tient sur sa colonne
 * « Volume % », et il n'y a pas de raison d'en tenir deux.
 *
 * ── LE LIEN VERS LA FICHE N'EXISTE PAS TOUJOURS ────────────────────────────
 *
 * `geckoId` est la clé de jointure avec nos propres pages. La source ne le publie pas
 * pour toutes les chaînes — une chaîne sans jeton coté n'en a pas —, et la ligne reste
 * alors du texte. Un lien vers `/crypto/undefined` serait un lien mort, ce que le
 * cahier des charges interdit nommément.
 */
const PAR_PAGE_INITIAL = 25

export function ChainsTable({ chains }: { chains: DefiChain[] }) {
  const t = usePhrase()
  const nombres = useFormatters()

  const [page, setPage] = useState(1)
  const [parPage, setParPage] = useState<number>(PAR_PAGE_INITIAL)

  const total = useMemo(() => chains.reduce((somme, chain) => somme + chain.tvl, 0), [chains])

  if (chains.length === 0) return null

  const debut = (page - 1) * parPage
  const visibles = chains.slice(debut, debut + parPage)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            {/* ⚠️ LA RANGÉE D'EN-TÊTE NE PORTAIT NI TAILLE NI GRAISSE, et ses cellules
                sortaient donc en 14 px — LA TAILLE EXACTE DES DONNÉES qu'elles
                surmontent. Relevé au navigateur : sept en-têtes à 14/500 au-dessus de
                cent soixante-quinze cellules à 14/400. Seule la graisse les
                distinguait, ce qui ne suffit pas à faire lire une ligne comme un
                en-tête.

                Les quatre autres tableaux du site posent taille, graisse et encre SUR
                LA RANGÉE — 12 px, 600, encre atténuée. Celui-ci les rejoint, et ses
                `<th>` cessent de redéclarer chacun sa graisse et son encre. */}
            {/* ⚠️ `[&>th]:font-semibold` ET NON `font-semibold` SEUL, ET LA MESURE
                L'A IMPOSÉ. La feuille de l'agent utilisateur porte `th { font-weight:
                bold }` : une règle qui vise LE `th`, donc elle bat toute graisse héritée
                de cette rangée. Relevé au navigateur après un premier essai — les
                en-têtes sortaient en 700 quand leurs voisins triables, qui posent la
                classe sur eux-mêmes, sortaient en 600.

                La taille et l'encre, elles, s'héritent normalement : elles restent sur
                la rangée. */}
            <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] [&>th]:font-semibold text-ink-muted">
              <th scope="col" className="px-4 py-2.5 text-right">
                #
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                {t('Chaîne')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                {t('Jeton')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('Valeur immobilisée')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('Part')}
              </th>
            </tr>
          </thead>

          <tbody>
            {visibles.map((chain, index) => (
              <tr key={chain.name} className="border-b border-border-subtle last:border-b-0">
                <td className="tabular px-4 py-2.5 text-right text-ink-muted">
                  {debut + index + 1}
                </td>

                <td className="px-4 py-2.5">
                  {chain.geckoId ? (
                    <Link
                      href={{ pathname: '/crypto/[id]', params: { id: chain.geckoId } }}
                      className="font-medium text-ink hover:underline"
                    >
                      {chain.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{chain.name}</span>
                  )}
                </td>

                <td className="px-4 py-2.5 text-ink-muted">
                  {chain.symbol ? (
                    <span className="text-micro font-semibold uppercase">{chain.symbol}</span>
                  ) : (
                    '—'
                  )}
                </td>

                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink">
                  <Money value={chain.tvl} from="USD" compact />
                </td>

                <td className="tabular px-4 py-2.5 text-right text-ink-muted">
                  {total > 0 ? `${nombres.fixed((chain.tvl / total) * 100, 2) ?? '—'} %` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        perPage={parPage}
        total={chains.length}
        /* La clé française, non traduite : c'est `TablePagination` qui traduit — voir
           sa liste blanche `UNITS`. */
        unit="chaîne"
        onPageChange={setPage}
        onPerPageChange={(valeur) => {
          setParPage(valeur)
          setPage(1)
        }}
      />
    </div>
  )
}
