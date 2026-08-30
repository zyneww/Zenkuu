'use client'

import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, Sparkline } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { TablePagination } from '@/components/ui/TablePagination'
import { ColumnHeader, ColumnPicker, useColumnPreferences } from '@/components/ui/table-columns'
import { assetHref } from '@/lib/asset-routes'

/**
 * Classement COMPLET d'un palmarès — la page derrière « Voir en détail ».
 *
 * ── CE QU'ELLE AJOUTE AUX DIX PREMIÈRES LIGNES ───────────────────────────────
 *
 * Les palmarès de `/classements` et de `/mouvements` montrent dix lignes
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
  showAthDate = false,
}: {
  /** Déjà triés par la page. */
  assets: MarketAsset[]
  /** Champ de variation mis en avant. */
  field: keyof MarketAsset
  periodLabel: string
  /** Grandeur affichée dans la colonne de droite. */
  metric?: 'price' | 'volume' | 'turnover'
  /**
   * Date du plus haut historique, en colonne.
   *
   * Un drapeau et non une colonne toujours rendue : cette date n'a de sens que sur le
   * palmarès « écart au sommet », où elle répond à « quand ce record a-t-il été
   * posé ». La référence la porte sur cette page-là et sur aucune autre. Sur les
   * quatre autres palmarès, elle serait une colonne de dates sans rapport avec le
   * critère de tri.
   */
  showAthDate?: boolean
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

  /* Aucune de ces colonnes n'est triable ici, et c'est délibéré (voir l'en-tête) : le
     classement est CELUI QU'ON A DEMANDÉ en arrivant. Leur menu ne porte donc que le
     masquage, ce qui reste utile — on vient parfois voir un palmarès sans vouloir de
     sa capitalisation. */
  const prefs = useColumnPreferences('palmares', [
    { id: 'rank', label: 'Rang' },
    { id: 'name', label: 'Actif', locked: true },
    { id: 'price', label: 'Prix', locked: true },
    { id: 'change', label: periodLabel },
    { id: 'metric', label: metric === 'turnover' ? 'Rotation' : 'Volume 24 h' },
    { id: 'marketCap', label: 'Capitalisation' },
    { id: 'chart', label: '7 jours' },
  ])

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ColumnPicker prefs={prefs} />
      </div>

      <div className="overflow-x-auto rounded-card">
        {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`, qui pose
            la règle pour tous les tableaux du site. */}
        <table className="w-full border-collapse text-sm sm:min-w-[44rem]">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
              {prefs.isVisible('rank') ? (
                <ColumnHeader
                  label="#"
                  columnId="rank"
                  columnPrefs={prefs}
                  align="left"
                  className="hidden sm:table-cell"
                />
              ) : null}
              <ColumnHeader label="Actif" columnId="name" columnPrefs={prefs} align="left" />
              <ColumnHeader label="Prix" columnId="price" columnPrefs={prefs} />
              {prefs.isVisible('change') ? (
                <ColumnHeader label={periodLabel} columnId="change" columnPrefs={prefs} />
              ) : null}
              {prefs.isVisible('metric') ? (
                <ColumnHeader
                  label={metric === 'turnover' ? 'Rotation' : 'Volume 24 h'}
                  columnId="metric"
                  columnPrefs={prefs}
                  className="hidden sm:table-cell"
                />
              ) : null}
              {prefs.isVisible('marketCap') ? (
                <ColumnHeader
                  label="Capitalisation"
                  columnId="marketCap"
                  columnPrefs={prefs}
                  className="hidden md:table-cell"
                />
              ) : null}
              {showAthDate ? (
                <ColumnHeader
                  label="Date du sommet"
                  columnId="athDate"
                  columnPrefs={prefs}
                  className="hidden md:table-cell"
                />
              ) : null}
              {prefs.isVisible('chart') ? (
                <ColumnHeader
                  label="7 jours"
                  columnId="chart"
                  columnPrefs={prefs}
                  className="hidden lg:table-cell"
                />
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {rows.map((asset, index) => (
              <tr key={asset.id} className="transition-colors hover:bg-surface-muted">
                {prefs.isVisible('rank') ? (
                  <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                    {/* Le rang est celui du CLASSEMENT, pas de la page : la ligne 1 de la
                        page 3 est la 51e du palmarès, et l'écrire « 1 » ferait croire à
                        trois premières places. */}
                    {(page - 1) * perPage + index + 1}
                  </td>
                ) : null}

                <td className="px-3 py-2.5">
                  {/* Le symbole est POUSSÉ À DROITE de la colonne plutôt que collé au
                      nom — même raisonnement que dans `MarketTable` : c'est la seule
                      façon d'obtenir une colonne de symboles alignée sous des noms de
                      longueurs très inégales. */}
                  <Link
                    href={assetHref(asset.assetClass, asset.id)}
                    className="group flex min-w-0 items-center gap-3"
                  >
                    <AssetLogo asset={asset} size={22} />
                    {/* Graisse 600 : le nom de l'actif est la seule cellule que la
                        référence épaissit — voir `MarketTable`, où la règle est posée. */}
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink group-hover:text-brand">
                      {asset.name}
                    </span>
                    <span className="shrink-0 text-right text-xs uppercase text-ink-muted">
                      {asset.symbol}
                    </span>
                  </Link>
                </td>

                <td className="tabular px-3 py-2.5 text-right text-ink">
                  <Money value={asset.price} from={asset.currency} />
                </td>

                {prefs.isVisible('change') ? (
                  <td className="px-3 py-2.5 text-right">
                    <ChangeBadge
                      value={asset[field] as number | undefined}
                      periodLabel={periodLabel}
                      size="sm"
                    />
                  </td>
                ) : null}

                {prefs.isVisible('metric') ? (
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                    {metric === 'turnover' ? (
                      turnover(asset)
                    ) : (
                      <Money value={asset.volume24h} from={asset.currency} compact />
                    )}
                  </td>
                ) : null}

                {prefs.isVisible('marketCap') ? (
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                    <Money value={asset.marketCap} from={asset.currency} compact />
                  </td>
                ) : null}

                {showAthDate ? (
                  <td className="hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                    {/* Un tiret cadratin plutôt qu'une cellule vide : sur un actif dont
                        la source ne date pas le sommet, la case blanche se lit comme un
                        défaut d'affichage. */}
                    {asset.athDate ? formatAthDate(asset.athDate) : '—'}
                  </td>
                ) : null}

                {prefs.isVisible('chart') ? (
                  <td className="hidden px-3 py-2.5 text-right lg:table-cell">
                    {asset.sparkline7d ? (
                      <span className="inline-block">
                        <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
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

/**
 * Date du sommet, au format court.
 *
 * `toLocaleDateString` sans locale explicite suit celle du NAVIGATEUR, ce qui est le
 * bon comportement ici : ce composant est client, et la date est une donnée brute que
 * le lecteur lit dans sa propre convention. Une date invalide rend un tiret plutôt que
 * « Invalid Date ».
 */
function formatAthDate(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  return new Date(t).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
