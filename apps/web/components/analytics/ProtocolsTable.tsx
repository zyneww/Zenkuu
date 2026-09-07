'use client'

import { useState } from 'react'

import type { DefiProtocol } from '@zenkuu/data'

import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { usePhrase } from '@/components/locale/ContentProvider'
import { Money } from '@/components/locale/Money'
import { TablePagination } from '@/components/ui/TablePagination'
import { Link } from '@/i18n/navigation'

/**
 * UN TABLEAU DE PROTOCOLES — SERT L'APERÇU ET LA PAGE DES ACTIFS TOKENISÉS.
 *
 * Les deux montrent la même chose avec un filtre différent en amont : tous les
 * protocoles d'un côté, ceux que la source range en `RWA` de l'autre. Écrire deux
 * composants aurait produit deux tableaux à corriger en double.
 *
 * ── LA COLONNE « CATÉGORIE » EST OPTIONNELLE, ET C'EST TOUTE LA DIFFÉRENCE ──
 *
 * Sur l'aperçu elle porte l'information principale — un lecteur balaie la liste pour
 * voir quelles familles dominent. Sur la page des actifs tokenisés, tous les
 * protocoles portent la MÊME étiquette : la colonne y répéterait « RWA » cent
 * cinquante-huit fois. L'appelant décide, parce que lui seul sait s'il a filtré.
 *
 * ── LES CHAÎNES SONT TRONQUÉES À TROIS, ET LE RESTE EST COMPTÉ ─────────────
 *
 * Un protocole multi-chaînes en liste jusqu'à trente-deux (mesuré sur Binance CEX).
 * Les écrire toutes ferait d'une ligne de tableau un paragraphe. Trois puis « +29 »
 * disent l'essentiel : sur quoi il est principalement déployé, et qu'il y en a
 * beaucoup d'autres.
 */
const PAR_PAGE_INITIAL = 25
const CHAINES_VISIBLES = 3

export function ProtocolsTable({
  protocols,
  showCategory = false,
}: {
  protocols: DefiProtocol[]
  /** Voir l'en-tête : inutile quand l'appelant a déjà filtré sur une catégorie. */
  showCategory?: boolean
}) {
  const t = usePhrase()

  const [page, setPage] = useState(1)
  const [parPage, setParPage] = useState<number>(PAR_PAGE_INITIAL)

  if (protocols.length === 0) return null

  const debut = (page - 1) * parPage
  const visibles = protocols.slice(debut, debut + parPage)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            {/* ⚠️ LA RANGÉE D'EN-TÊTE NE PORTAIT NI TAILLE NI GRAISSE, et ses cellules
                sortaient donc en 14 px — LA TAILLE EXACTE DES DONNÉES qu'elles
                surmontent. Relevé au navigateur : sept en-têtes à 14/500 au-dessus de
                cent soixante-quinze cellules à 14/400. Seule la graisse les
                distinguait, ce qui ne suffit pas à faire lire une ligne comme un
                en-tête.

                Les autres tableaux du site posent taille, graisse et encre SUR LA
                RANGÉE — 12 px, 600, encre atténuée. Celui-ci les rejoint, et ses `<th>`
                cessent de redéclarer chacun sa graisse et son encre. */}
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
                {t('Protocole')}
              </th>
              {showCategory ? (
                <th scope="col" className="px-4 py-2.5 text-left">
                  {t('Catégorie')}
                </th>
              ) : null}
              <th scope="col" className="px-4 py-2.5 text-left">
                {t('Chaînes')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('Valeur immobilisée')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('24 h')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('7 j')}
              </th>
            </tr>
          </thead>

          <tbody>
            {visibles.map((protocol, index) => {
              const reste = protocol.chains.length - CHAINES_VISIBLES

              return (
                <tr key={protocol.slug} className="border-b border-border-subtle last:border-b-0">
                  <td className="tabular px-4 py-2.5 text-right text-ink-muted">
                    {debut + index + 1}
                  </td>

                  <td className="px-4 py-2.5">
                    {/* Le lien mène à NOTRE fiche quand le jeton en a une, jamais chez
                        la source : envoyer le lecteur dehors depuis un tableau interne
                        est une sortie qu'on ne lui a pas proposée. Sans identifiant,
                        c'est du texte — pas un lien mort. */}
                    {protocol.geckoId ? (
                      <Link
                        href={{ pathname: '/crypto/[id]', params: { id: protocol.geckoId } }}
                        className="font-medium text-ink hover:underline"
                      >
                        {protocol.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{protocol.name}</span>
                    )}
                  </td>

                  {showCategory ? (
                    <td className="px-4 py-2.5 text-ink-muted">{protocol.category ?? '—'}</td>
                  ) : null}

                  <td className="px-4 py-2.5 text-ink-muted">
                    {protocol.chains.length === 0
                      ? '—'
                      : `${protocol.chains.slice(0, CHAINES_VISIBLES).join(', ')}${
                          reste > 0 ? ` +${reste}` : ''
                        }`}
                  </td>

                  <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink">
                    <Money value={protocol.tvl} from="USD" compact />
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    <ChangeBadge value={protocol.change1d} size="sm" />
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    <ChangeBadge value={protocol.change7d} size="sm" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        perPage={parPage}
        total={protocols.length}
        /* La clé française, non traduite — voir la liste blanche `UNITS`. */
        unit="protocole"
        onPageChange={setPage}
        onPerPageChange={(valeur) => {
          setParPage(valeur)
          setPage(1)
        }}
      />
    </div>
  )
}
