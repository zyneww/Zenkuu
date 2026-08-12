'use client'

import { Link } from '@/i18n/navigation'
import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, formatPercent } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { useFeature } from '@/components/billing/ProGate'
import { FEATURES, FREE_COMPARE_LIMIT, PRO_COMPARE_LIMIT } from '@/lib/billing'
import { AreaPlot } from '@/components/charts/AreaPlot'
import { dataColor } from '@/components/charts/chart-theme'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'

/**
 * Comparateur de deux à quatre actifs.
 *
 * ⚠️ LE GRAPHIQUE EST EN BASE 100, PAS EN PRIX. Superposer les cours bruts de Bitcoin
 * et d'un jeton à 0,003 € donnerait une ligne plate et une ligne collée à l'axe :
 * l'échelle serait dictée par le plus cher, et la forme du second serait invisible.
 * En ramenant chaque série à 100 à son premier point, on compare ce qui est
 * comparable — la TRAJECTOIRE — et l'axe devient lisible pour tous.
 *
 * Conséquence à dire : l'axe des ordonnées n'affiche pas des euros. C'est écrit sous
 * le graphique, faute de quoi le lecteur lira « 118 » comme un prix.
 *
 * ── POURQUOI LE PLAFOND S'ARRÊTE À SIX, MÊME EN OFFRE PRO ────────────────────
 *
 * Ce n'est pas une limite technique mais une limite de LISIBILITÉ, et c'est pour ça
 * qu'elle existe des deux côtés. La palette de données compte six teintes ordonnées
 * par distance perceptuelle (§3.1) : à la septième, deux courbes deviendraient
 * indiscernables et la comparaison — l'objet même de la page — cesserait de
 * fonctionner. Vendre « jusqu'à dix actifs » serait vendre un graphique illisible.
 *
 * Quatre en offre gratuite, six en offre Pro : le §2 promet « 2 à 4 », la promesse
 * est donc tenue sans abonnement, et l'abonnement AJOUTE deux emplacements plutôt
 * que d'en reprendre.
 */

export function ComparatorView({ assets }: { assets: MarketAsset[] }) {
  const extended = useFeature(FEATURES.deepData)
  const max = extended ? PRO_COMPARE_LIMIT : FREE_COMPARE_LIMIT

  const [selected, setSelected] = useState<string[]>(() =>
    assets.slice(0, 2).map((asset) => asset.id),
  )
  const [query, setQuery] = useState('')

  const chosen = useMemo(
    () =>
      selected
        .map((id) => assets.find((asset) => asset.id === id))
        .filter((asset): asset is MarketAsset => asset !== undefined),
    [assets, selected],
  )

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return assets.slice(0, 12)
    return assets
      .filter((asset) => `${asset.name} ${asset.symbol}`.toLowerCase().includes(needle))
      .slice(0, 12)
  }, [assets, query])

  /**
   * Séries ramenées en base 100.
   *
   * Les sparklines de la source comptent toutes le même nombre de points sur sept
   * jours, mais on n'en fait pas l'hypothèse : la longueur retenue est la PLUS COURTE
   * du lot, et chaque série est tronquée par la fin. Aligner par le début décalerait
   * les courbes dans le temps sans que rien ne le signale.
   */
  const series = useMemo(() => {
    const usable = chosen.filter((asset) => (asset.sparkline7d?.length ?? 0) > 1)
    if (usable.length === 0) return []

    const length = Math.min(...usable.map((asset) => asset.sparkline7d!.length))

    return Array.from({ length }, (_, index) => {
      const point: Record<string, number> = { index }
      for (const asset of usable) {
        const values = asset.sparkline7d!.slice(-length)
        const base = values[0]
        const value = values[index]
        if (base === undefined || value === undefined || base === 0) continue
        point[asset.id] = (value / base) * 100
      }
      return point
    })
  }, [chosen])

  /**
   * Bornes de l'axe des ordonnées, calculées sur les séries réellement affichées.
   *
   * Sans elles, l'échelle par défaut part de zéro : sur sept jours, des trajectoires
   * comprises entre 99 et 101 se retrouvent écrasées en une ligne plate en haut du
   * cadre, et la comparaison — l'objet même de la page — devient illisible. Un axe
   * qui part de zéro n'est honnête que si zéro veut dire quelque chose ; ici, la
   * référence est 100, et c'est l'ÉCART à 100 qu'on lit.
   */
  const domain = useMemo<[number, number]>(() => {
    const values = series.flatMap((point) =>
      Object.entries(point)
        .filter(([key]) => key !== 'index')
        .map(([, value]) => value),
    )
    if (values.length === 0) return [90, 110]

    const min = Math.min(...values)
    const max = Math.max(...values)
    // Fenêtre minimale de deux points de pourcentage : une journée sans mouvement
    // donnerait sinon un domaine de largeur nulle, et un tracé collé à une seule
    // ligne de pixels.
    const pad = Math.max((max - min) * 0.12, 1)
    return [min - pad, max + pad]
  }, [series])

  /*
   * Une série par actif, chacune indexée par son RANG et non par une date.
   *
   * La source ne date pas les points de ses sparklines : elle en garantit seulement
   * l'ordre et le pas régulier. Inventer des horodatages pour faire joli sur l'axe
   * afficherait des dates fausses ; l'axe des abscisses est donc masqué, et la
   * légende sous le graphique dit ce qu'on regarde — sept jours, base 100.
   */
  const plotSeries = useMemo(
    () =>
      chosen
        .map((asset, index) => ({
          id: asset.id,
          label: asset.name,
          color: dataColor(index),
          points: series
            .map((point) => ({ x: point.index as number, y: point[asset.id] }))
            .filter((point): point is { x: number; y: number } => point.y !== undefined),
        }))
        .filter((entry) => entry.points.length > 1),
    [chosen, series],
  )

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) {
        // Toujours au moins un actif : une comparaison vide n'a rien à montrer, et le
        // graphique disparaîtrait sans que le lecteur comprenne pourquoi.
        return current.length > 1 ? current.filter((entry) => entry !== id) : current
      }
      return current.length >= max ? current : [...current, id]
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">
            Actifs comparés ({chosen.length}/{max})
            {/*
              L'invitation n'apparaît QU'AU plafond, jamais avant : annoncée d'entrée,
              elle ferait passer un outil complet pour une démonstration bridée.
            */}
            {!extended && chosen.length >= max ? (
              <>
                {' — '}
                <Link
                  href="/tarifs"
                  className="text-xs font-normal text-brand hover:text-brand-strong"
                >
                  Zenkuu Pro en compare {PRO_COMPARE_LIMIT}
                </Link>
              </>
            ) : null}
          </h2>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Chercher un actif…"
            aria-label="Chercher un actif à comparer"
            className="w-56 rounded-card border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {chosen.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => toggle(asset.id)}
              className="flex items-center gap-2 rounded-card border px-2.5 py-1.5 text-xs font-medium text-ink transition-colors duration-150 hover:border-down"
              style={{ borderColor: dataColor(index) }}
            >
              <span
                className="h-2 w-2 shrink-0"
                style={{ backgroundColor: dataColor(index) }}
                aria-hidden="true"
              />
              {asset.name}
              <span className="text-ink-muted">retirer</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {options
            .filter((asset) => !selected.includes(asset.id))
            .map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggle(asset.id)}
                disabled={chosen.length >= max}
                className="rounded-card border border-border-subtle bg-surface px-2.5 py-1 text-xs text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                + {asset.symbol.toUpperCase()}
              </button>
            ))}
        </div>
      </div>

      {series.length > 1 ? (
        <div className="rounded-card border border-border-subtle bg-surface p-3">
          {/* Repère à 100 : la ligne de départ commune. Sans elle, on lit des courbes
              sans savoir de quel côté de la référence elles passent. */}
          <AreaPlot
            series={plotSeries}
            height={320}
            axes
            grid
            yDomain={domain}
            referenceLines={[100]}
            formatY={(value) => value.toFixed(1).replace('.', ',')}
            formatX={() => ''}
            formatTooltipX={() => 'Base 100 au début de la période'}
            formatTooltipY={(value) =>
              `${value.toFixed(1).replace('.', ',')} (${formatPercent(value - 100)})`
            }
          />

          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Sept jours, chaque série ramenée à <strong className="text-ink">100</strong> à
            son premier point. L’axe ne porte donc pas des euros mais un écart relatif :
            118 signifie « +18 % depuis le début de la période ». C’est le seul moyen de
            superposer des actifs dont les cours diffèrent d’un facteur mille.
          </p>
        </div>
      ) : (
        <p className="rounded-card border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          La source ne publie pas de série sur sept jours pour les actifs sélectionnés.
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-border-subtle">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <caption className="sr-only">Comparaison chiffrée</caption>
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-ink-muted">
                Indicateur
              </th>
              {chosen.map((asset, index) => (
                <th key={asset.id} scope="col" className="px-3 py-2.5 text-right">
                  <Link
                    href={assetHref(asset.assetClass, asset.id)}
                    className="inline-flex items-center gap-1.5 text-ink hover:text-brand-strong"
                  >
                    <AssetLogo asset={asset} size={18} />
                    <span className="font-medium">{asset.symbol.toUpperCase()}</span>
                  </Link>
                  <span
                    className="mt-1 block h-0.5 w-full"
                    style={{ backgroundColor: dataColor(index) }}
                    aria-hidden="true"
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            <Row label="Cours">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.price} from={asset.currency} />
                </Cell>
              ))}
            </Row>
            <Row label="Rang">
              {chosen.map((asset) => (
                <Cell key={asset.id}>{asset.rank !== undefined ? `#${asset.rank}` : '—'}</Cell>
              ))}
            </Row>
            <Row label="Capitalisation">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.marketCap} from={asset.currency} compact />
                </Cell>
              ))}
            </Row>
            <Row label="Volume 24 h">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.volume24h} from={asset.currency} compact />
                </Cell>
              ))}
            </Row>
            <Row label="Rotation (volume / capitalisation)">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  {(asset.marketCap ?? 0) > 0 && asset.volume24h !== undefined
                    ? `${((asset.volume24h / (asset.marketCap as number)) * 100).toFixed(1).replace('.', ',')} %`
                    : '—'}
                </Cell>
              ))}
            </Row>
            <Row label="Variation 24 h">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <ChangeBadge value={asset.change24h} size="sm" />
                </Cell>
              ))}
            </Row>
            <Row label="Variation 7 j">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <ChangeBadge value={asset.change7d} size="sm" />
                </Cell>
              ))}
            </Row>
            <Row label="Variation 30 j">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <ChangeBadge value={asset.change30d} size="sm" />
                </Cell>
              ))}
            </Row>
            <Row label="Offre en circulation">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  {asset.circulatingSupply !== undefined
                    ? new Intl.NumberFormat('fr-FR', {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      }).format(asset.circulatingSupply)
                    : '—'}
                </Cell>
              ))}
            </Row>
            <Row label="Part de l’offre maximale">
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  {/* Rapport de deux valeurs publiées, pas une estimation : il dit
                      quelle part des jetons prévus circule déjà. Absent dès que l'une
                      des deux manque — beaucoup de jetons n'ont pas d'offre maximale. */}
                  {asset.maxSupply && asset.circulatingSupply
                    ? `${((asset.circulatingSupply / asset.maxSupply) * 100).toFixed(0)} %`
                    : '—'}
                </Cell>
              ))}
            </Row>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="transition-colors duration-150 hover:bg-surface-muted/60">
      <th scope="row" className="px-3 py-2.5 text-left text-xs font-normal text-ink-muted">
        {label}
      </th>
      {children}
    </tr>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="tabular px-3 py-2.5 text-right text-ink">{children}</td>
}
