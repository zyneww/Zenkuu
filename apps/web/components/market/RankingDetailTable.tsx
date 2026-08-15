'use client'

import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, Sparkline } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { Pagination } from '@/components/ui/Pagination'
import { assetHref } from '@/lib/asset-routes'

/**
 * Classement COMPLET d'un palmarès — la page derrière « Voir en détail ».
 *
 * ── CE QU'ELLE AJOUTE AUX DIX PREMIÈRES LIGNES ───────────────────────────────
 *
 * Les palmarès de `/crypto/all-coins` et de `/crypto/mouvements` montrent dix lignes
 * chacun, ce qui est le bon nombre pour COMPARER quatre classements d'un regard. Ce
 * n'est pas le bon nombre pour chercher un actif précis, ni pour voir où s'arrête une
 * hausse — deux usages qui demandent la liste entière.
 *
 * D'où une page à part plutôt qu'un panneau qui s'allonge : les deux formes servent
 * deux lectures, et étendre la première détruirait ce qui la rend lisible.
 *
 * ── LE TRI EST DÉJÀ FAIT, ET NE SE REFAIT PAS ────────────────────────────────
 *
 * Les lignes arrivent classées par la page, qui seule sait sur quelle grandeur et sur
 * quelle période. Ce composant ne trie rien : il découpe. Lui donner des en-têtes
 * cliquables ferait de lui un second `/crypto`, alors que la page dit précisément
 * « voici LE classement que tu as demandé ».
 *
 * La pagination vit en mémoire et non dans l'URL. La liste entière est déjà chargée —
 * elle vient du même appel que les palmarès — et la faire voyager par l'adresse
 * coûterait un aller-retour serveur pour découper un tableau qu'on a déjà en main.
 */

export function RankingDetailTable({
  assets,
  field,
  periodLabel,
  metric = 'price',
}: {
  /** Déjà triés par la page. */
  assets: MarketAsset[]
  /** Champ de variation mis en avant. */
  field: keyof MarketAsset
  periodLabel: string
  /** Grandeur affichée dans la colonne de droite. */
  metric?: 'price' | 'volume' | 'turnover'
}) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const rows = useMemo(
    () => assets.slice((page - 1) * perPage, page * perPage),
    [assets, page, perPage],
  )

  /*
   * Changer la taille de page RAMÈNE EN PAGE 1.
   *
   * Sans cela, passer de 100 à 25 lignes en page 3 laisse un état où la page demandée
   * n'existe plus : le tableau se vide, et rien à l'écran n'explique pourquoi. Le
   * compteur affiche alors « 51 à 75 sur 60 », c'est-à-dire un nombre plus grand que
   * le total.
   */
  function changePerPage(next: number) {
    setPerPage(next)
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-card border border-border-subtle">
        {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`, qui pose
            la règle pour tous les tableaux du site. */}
        <table className="w-full border-collapse text-sm sm:min-w-[44rem]">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[0.6875rem] uppercase tracking-wide text-ink-muted">
              <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                #
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Actif
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Prix
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {periodLabel}
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                {metric === 'turnover' ? 'Rotation' : 'Volume 24 h'}
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
                Capitalisation
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
                7 jours
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {rows.map((asset, index) => (
              <tr key={asset.id} className="transition-colors hover:bg-surface-muted">
                <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                  {/* Le rang est celui du CLASSEMENT, pas de la page : la ligne 1 de la
                      page 3 est la 51e du palmarès, et l'écrire « 1 » ferait croire à
                      trois premières places. */}
                  {(page - 1) * perPage + index + 1}
                </td>

                <td className="px-3 py-2.5">
                  <Link
                    href={assetHref(asset.assetClass, asset.id)}
                    className="group flex min-w-0 items-center gap-2.5"
                  >
                    <AssetLogo asset={asset} size={22} />
                    <span className="min-w-0 truncate font-medium text-ink group-hover:text-brand-strong">
                      {asset.name}
                      <span className="ml-1.5 text-xs uppercase text-ink-muted">
                        {asset.symbol}
                      </span>
                    </span>
                  </Link>
                </td>

                <td className="tabular px-3 py-2.5 text-right text-ink">
                  <Money value={asset.price} from={asset.currency} />
                </td>

                <td className="px-3 py-2.5 text-right">
                  <ChangeBadge
                    value={asset[field] as number | undefined}
                    periodLabel={periodLabel}
                    size="sm"
                  />
                </td>

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                  {metric === 'turnover' ? (
                    turnover(asset)
                  ) : (
                    <Money value={asset.volume24h} from={asset.currency} compact />
                  )}
                </td>

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                  <Money value={asset.marketCap} from={asset.currency} compact />
                </td>

                <td className="hidden px-3 py-2.5 text-right lg:table-cell">
                  {asset.sparkline7d ? (
                    <span className="inline-block">
                      <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        perPage={perPage}
        total={assets.length}
        unit="actif"
        onPageChange={setPage}
        onPerPageChange={changePerPage}
      />
    </div>
  )
}

/** Volume rapporté à la capitalisation — un RAPPORT de deux valeurs publiées. */
function turnover(asset: MarketAsset): string {
  const cap = asset.marketCap ?? 0
  const volume = asset.volume24h ?? 0
  if (cap <= 0 || volume <= 0) return '—'
  return `${((volume / cap) * 100).toFixed(0)} %`
}
