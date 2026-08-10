import type { GlobalMarketStats } from '@zenith/data'
import { ChangeBadge, formatPercent } from '@zenith/ui'

import { Money } from '@/components/locale/Money'

/**
 * Bande macro : capitalisation, volume, dominance.
 *
 * La référence accompagne chacun de ces chiffres d'une courbe sur 24 h à 1 an. On ne
 * le fait pas, et l'écart est une contrainte de source, non un choix : aucune API
 * gratuite ne publie l'historique de la capitalisation mondiale ni celui de la
 * dominance. ZENITH enregistre bien sa propre série de capitalisation (voir la carte
 * de l'accueil), mais elle ne remonte qu'à la mise en service — la présenter comme
 * un historique de marché serait trompeur.
 *
 * Les dominances sont affichées EN BARRE cumulée plutôt qu'en camembert : ce sont
 * des parts d'un même tout, et une barre se compare à l'œil bien mieux que des
 * secteurs angulaires.
 */
export function MacroBand({ stats }: { stats: GlobalMarketStats }) {
  const dominance = Object.entries(stats.dominance)
    .map(([symbol, share]) => ({ symbol: symbol.toUpperCase(), share }))
    .filter((entry) => Number.isFinite(entry.share) && entry.share > 0)
    .sort((a, b) => b.share - a.share)
    .slice(0, 4)

  const named = dominance.reduce((sum, entry) => sum + entry.share, 0)
  // Le reste n'est pas une donnée publiée mais une SOUSTRACTION évidente : ce qui
  // n'est pas dans les quatre premières dominances est, par définition, ailleurs.
  const rest = Math.max(0, 100 - named)

  return (
    <section className="space-y-6" aria-labelledby="macro-titre">
      <h2 id="macro-titre" className="display-md text-ink">
        Vue macro
      </h2>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4">
        <Cell
          label="Capitalisation mondiale"
          value={<Money value={stats.totalMarketCap} from={stats.currency} compact />}
          badge={<ChangeBadge value={stats.marketCapChange24h} size="sm" />}
        />
        <Cell
          label="Volume 24 h"
          value={<Money value={stats.totalVolume24h} from={stats.currency} compact />}
        />
        <Cell
          label="Actifs suivis"
          value={new Intl.NumberFormat('fr-FR').format(stats.activeAssets)}
        />
        <Cell
          label="Volume / capitalisation"
          value={
            // Rapport de rotation : quelle part de la capitalisation change de mains
            // en une journée. Deux nombres déjà affichés, mais leur RAPPORT dit
            // quelque chose qu'aucun des deux ne dit seul.
            stats.totalMarketCap > 0
              ? formatPercent((stats.totalVolume24h / stats.totalMarketCap) * 100)?.replace('+', '')
              : '—'
          }
        />
      </dl>

      {dominance.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Dominance</h3>

          <div
            className="flex h-2.5 overflow-hidden rounded-pill bg-surface-muted"
            role="img"
            aria-label={dominance
              .map((entry) => `${entry.symbol} ${entry.share.toFixed(1)} %`)
              .join(', ')}
          >
            {dominance.map((entry, index) => (
              <div
                key={entry.symbol}
                style={{ width: `${entry.share}%` }}
                className={index === 0 ? 'bg-brand' : index === 1 ? 'bg-brand-strong' : 'bg-ink-muted'}
              />
            ))}
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-1">
            {dominance.map((entry) => (
              <div key={entry.symbol} className="flex items-baseline gap-1.5">
                <dt className="text-xs font-medium text-ink">{entry.symbol}</dt>
                <dd className="tabular text-xs text-ink-muted">{entry.share.toFixed(1)} %</dd>
              </div>
            ))}
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs text-ink-muted">Autres</dt>
              <dd className="tabular text-xs text-ink-muted">{rest.toFixed(1)} %</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  )
}

function Cell({
  label,
  value,
  badge,
}: {
  label: string
  value: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="bg-surface px-3 py-3">
      <dt className="text-[0.6875rem] text-ink-muted">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="tabular text-lg font-semibold text-ink">{value}</span>
        {badge}
      </dd>
    </div>
  )
}
