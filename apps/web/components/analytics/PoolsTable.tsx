'use client'

import { useMemo, useState } from 'react'

import type { YieldPool } from '@zenkuu/data'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Money } from '@/components/locale/Money'
import { useFormatters } from '@/components/locale/useFormatters'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TablePagination } from '@/components/ui/TablePagination'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES POOLS DE RENDEMENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── DEUX COLONNES DE TAUX, ET LA SECONDE EST LÀ POUR CONTREDIRE LA PREMIÈRE ─
 *
 * `apy` est le taux du JOUR, annualisé par la source depuis le rendement récent du
 * pool. `apyMean30d` est sa moyenne sur trente jours. Les afficher côte à côte est le
 * seul moyen honnête de montrer un rendement : un pool à 40 % aujourd'hui et 4 % en
 * moyenne mensuelle n'est pas un pool à 40 %, c'est un pool qui vient de recevoir une
 * distribution.
 *
 * Le détail base / récompense dit la même chose autrement — d'où viennent les points.
 * Un taux entièrement porté par des jetons distribués s'éteint le jour où la
 * distribution s'arrête ; un taux de base vient de l'activité du pool.
 *
 * ── LE TRI PAR TAUX N'EST PAS LE TRI PAR DÉFAUT, ET C'EST DÉLIBÉRÉ ─────────
 *
 * Ouvrir sur le taux décroissant ferait de cette page un palmarès du rendement, donc
 * une recommandation implicite — ce que le §5 interdit. Le défaut est la TAILLE : elle
 * dit où l'argent est réellement placé, ce qui est un constat et non un conseil.
 *
 * Le tri par taux reste accessible, parce que le masquer serait paternaliste ; il est
 * simplement le second choix et non le premier.
 *
 * ── LE FILTRE « MONNAIES INDEXÉES » RÉPOND À UNE VRAIE QUESTION ────────────
 *
 * Un pool de deux jetons volatils et un pool de deux stablecoins ne se comparent pas :
 * le premier porte un risque de perte impermanente que le second n'a pas, et leurs
 * taux ne mesurent donc pas la même chose. La source publie le drapeau ; le filtre
 * s'appuie dessus plutôt que sur une devinette faite sur les symboles.
 */
const PAR_PAGE_INITIAL = 25

type Tri = 'taille' | 'taux'
type Filtre = 'tous' | 'stables'

export function PoolsTable({ pools }: { pools: YieldPool[] }) {
  const t = usePhrase()
  const nombres = useFormatters()

  const [tri, setTri] = useState<Tri>('taille')
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [page, setPage] = useState(1)
  const [parPage, setParPage] = useState<number>(PAR_PAGE_INITIAL)

  const lignes = useMemo(() => {
    const retenus = filtre === 'stables' ? pools.filter((pool) => pool.stablecoin) : pools
    return [...retenus].sort((a, b) =>
      tri === 'taux' ? b.apy - a.apy : b.tvlUsd - a.tvlUsd,
    )
  }, [pools, tri, filtre])

  if (pools.length === 0) return null

  /* Un changement de tri ou de filtre remet la page à 1 : rester à la page 5 après
     avoir filtré désigne une page qui n'a plus le même contenu, quand elle existe. */
  const debut = (page - 1) * parPage
  const visibles = lignes.slice(debut, debut + parPage)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          size="sm"
          label={t('Trier par')}
          value={tri}
          onChange={(valeur) => {
            setTri(valeur)
            setPage(1)
          }}
          options={[
            { key: 'taille' as const, label: t('Taille') },
            { key: 'taux' as const, label: t('Taux') },
          ]}
        />

        <SegmentedControl
          size="sm"
          label={t('Composition')}
          value={filtre}
          onChange={(valeur) => {
            setFiltre(valeur)
            setPage(1)
          }}
          options={[
            { key: 'tous' as const, label: t('Tous') },
            { key: 'stables' as const, label: t('Monnaies indexées') },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
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
              <th scope="col" className="px-4 py-2.5 text-left">
                {t('Pool')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                {t('Protocole')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                {t('Chaîne')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('Valeur immobilisée')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('Taux du jour')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                {t('Moyenne 30 j')}
              </th>
            </tr>
          </thead>

          <tbody>
            {visibles.map((pool) => (
              <tr key={pool.id} className="border-b border-border-subtle last:border-b-0">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-ink">{pool.symbol}</span>
                  {pool.stablecoin ? (
                    <span className="ml-2 text-micro text-ink-muted">
                      {t('Monnaies indexées')}
                    </span>
                  ) : null}
                </td>

                <td className="px-4 py-2.5 text-ink-muted">{pool.project}</td>
                <td className="px-4 py-2.5 text-ink-muted">{pool.chain}</td>

                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink">
                  <Money value={pool.tvlUsd} from="USD" compact />
                </td>

                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right">
                  <span className="font-semibold text-ink">
                    {`${nombres.fixed(pool.apy, 2) ?? '—'} %`}
                  </span>
                  {/* Le détail base / récompense sous le taux, en petit : il explique
                      d'où vient le nombre du dessus sans lui disputer la place.

                      ⚠️ LE SEUIL EST CELUI DE L'AFFICHAGE, PAS ZÉRO. La condition était
                      `> 0`, et la ligne sortait « dont 0,00 % de récompenses » —
                      mesurée au navigateur sur WEETH, dont la part de récompenses vaut
                      quelques millièmes de point. Une mention qui annonce zéro ne dit
                      rien et fait douter du nombre au-dessus ; le seuil est donc le
                      premier centième affichable. */}
                  {pool.apyReward !== undefined && pool.apyReward >= 0.005 ? (
                    <span className="block text-micro text-ink-muted">
                      {t('dont {n} % de récompenses').replace(
                        '{n}',
                        nombres.fixed(pool.apyReward, 2) ?? '—',
                      )}
                    </span>
                  ) : null}
                </td>

                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink-muted">
                  {pool.apyMean30d !== undefined
                    ? `${nombres.fixed(pool.apyMean30d, 2) ?? '—'} %`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        perPage={parPage}
        total={lignes.length}
        /* La clé française, non traduite — voir la liste blanche `UNITS`. */
        unit="pool"
        onPageChange={setPage}
        onPerPageChange={(valeur) => {
          setParPage(valeur)
          setPage(1)
        }}
      />
    </div>
  )
}
