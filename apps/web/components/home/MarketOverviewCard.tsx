import type { DataResult, GlobalMarketStats, MarketCapSeriesState } from '@zenith/data'
import { ChangeBadge, EmptyState, Sparkline, formatCompact, formatNumber } from '@zenith/ui'

import { Money } from '@/components/locale/Money'

import { fr } from '@/content/fr'

/**
 * Carte de synthèse du marché — équivalent du bloc « Market Cap » de CoinGecko.
 *
 * La courbe pose un problème de source : CoinGecko ne publie l'historique de la
 * capitalisation mondiale que sur ses offres payantes (401 sur le palier gratuit),
 * et aucune alternative gratuite n'existe. Plutôt qu'un tracé approximatif — celui
 * de Bitcoin, par exemple, présenté comme celui du marché entier — la courbe est
 * construite à partir de NOS PROPRES RELEVÉS, un point à chaque lecture des
 * statistiques globales (cf. `market-cap-series.ts`). Chaque point est donc une
 * valeur réellement lue à un instant daté, jamais interpolée.
 *
 * Conséquence visible : la courbe est absente au démarrage et se remplit au fil des
 * heures. La carte le dit, au lieu de laisser un vide inexpliqué.
 */
export function MarketOverviewCard({
  result,
  series,
}: {
  result: DataResult<GlobalMarketStats>
  series: MarketCapSeriesState
}) {
  if (!result.ok) {
    return (
      <EmptyState
        title={fr.globalStats.unavailable}
        description={result.reason}
        source={result.source?.label ?? null}
        compact
      />
    )
  }

  const stats = result.data
  // Les deux gros chiffres passent par <Money> pour suivre la devise choisie.
  const btc = stats.dominance['btc']
  const eth = stats.dominance['eth']

  return (
    <div className="flex h-full flex-col justify-between rounded-card border border-border-subtle bg-surface p-4">
      <div>
        <p className="text-xs text-ink-muted">{fr.home.marketCapCardTitle}</p>
        <p className="tabular mt-1 text-2xl font-bold text-ink">
          <Money value={stats.totalMarketCap} from={stats.currency} compact />
        </p>
        <div className="mt-1">
          <ChangeBadge value={stats.marketCapChange24h} size="sm" />
        </div>

        <div className="mt-3">
          {series.ready ? (
            <>
              <Sparkline
                values={series.points.map((point) => point.value)}
                width={260}
                height={44}
                label={fr.home.marketCapSeriesLabel(series.spanMinutes)}
              />
              <p className="mt-1 text-[0.625rem] text-ink-muted">
                {fr.home.marketCapSeriesHint(series.spanMinutes)}
              </p>
            </>
          ) : (
            /* Série trop courte : on explique pourquoi plutôt que de laisser un
               espace vide, et surtout plutôt que de tracer une courbe estimée. */
            <p className="rounded-lg bg-surface-muted px-2.5 py-2 text-[0.625rem] leading-relaxed text-ink-muted">
              {fr.home.marketCapSeriesBuilding(series.points.length)}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border-subtle pt-3 text-xs">
        <div>
          <dt className="text-ink-muted">{fr.globalStats.volume}</dt>
          <dd className="tabular font-semibold text-ink">
            <Money value={stats.totalVolume24h} from={stats.currency} compact />
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr.globalStats.activeAssets}</dt>
          <dd className="tabular font-semibold text-ink">
            {formatCompact(stats.activeAssets) ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr.globalStats.dominanceBtc}</dt>
          <dd className="tabular font-semibold text-ink">
            {btc === undefined ? '—' : `${formatNumber(btc, 1)} %`}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr.globalStats.dominanceEth}</dt>
          <dd className="tabular font-semibold text-ink">
            {eth === undefined ? '—' : `${formatNumber(eth, 1)} %`}
          </dd>
        </div>
      </dl>
    </div>
  )
}
