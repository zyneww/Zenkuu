import type { DataResult, GlobalMarketStats, MarketCapSeriesState } from '@zenkuu/data'
import { ChangeBadge, EmptyState, Sparkline, formatCompact, formatNumber } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'

import { getContent } from '@/lib/content'

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
export async function MarketOverviewCard({
  result,
  series,
}: {
  result: DataResult<GlobalMarketStats>
  series: MarketCapSeriesState
}) {
  const fr = await getContent()
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
    /*
      PAS DE `h-full` ICI, ET C'EST UNE CORRECTION DE FOND.

      Cette carte portait `flex h-full flex-col justify-between`, dans l'intention
      qu'elle comble le bas de sa colonne. Elle produisait l'inverse.

      `h-full` vaut `height: 100%`, et ce pourcentage se résout sur la hauteur de la
      BOÎTE PARENTE — pas sur la place qui reste. Sur l'accueil, cette carte ferme une
      colonne de grille que la colonne voisine étire à 2196 pixels ; `h-full` lui
      accordait donc 2196 pixels À PARTIR de son propre sommet, situé 800 pixels plus
      bas. La carte débordait de 800 pixels sous sa colonne, se peignait par-dessus le
      pied de page — les agrégats venaient recouvrir la mention de copyright — et
      allongeait la page d'un millier de pixels de vide noir.

      Le défaut ne se voyait que sur l'accueil : partout ailleurs, la colonne n'est pas
      étirée, sa hauteur n'est donc pas définie, et `height: 100%` est simplement
      ignoré. C'est ce qui l'a laissé passer.

      La grille de l'accueil pose désormais `items-start`, ce qui supprime l'étirement
      à la source ; cette carte prend sa hauteur naturelle, comme toutes ses voisines.
    */
    <div className="flex flex-col rounded-card border border-border-subtle bg-surface p-4">
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
              <p className="mt-1 text-micro text-ink-muted">
                {fr.home.marketCapSeriesHint(series.spanMinutes)}
              </p>
            </>
          ) : (
            /* Série trop courte : on explique pourquoi plutôt que de laisser un
               espace vide, et surtout plutôt que de tracer une courbe estimée. */
            <p className="rounded-lg bg-surface-muted px-2.5 py-2 text-micro leading-relaxed text-ink-muted">
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
