import type { GlobalMarketStats, MarketCapSeriesState } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { MetricCard } from '@/components/charts/MetricCard'
import { Money } from '@/components/locale/Money'
import { getPhrase } from '@/lib/content'

/**
 * Les deux agrégats qui situent le marché : sa taille et son activité.
 *
 * Ils remplacent les quatre cartes de cours qui occupaient cette place. Le changement
 * n'est pas cosmétique : Bitcoin, Ethereum, Tether et BNB figuraient déjà aux quatre
 * premières lignes du tableau juste en dessous, avec leur courbe et leur variation.
 * Quatre cartes pour redire ce que le tableau dit mieux occupaient le premier écran
 * sans rien apprendre. La capitalisation mondiale et le volume, eux, ne sont nulle
 * part ailleurs sous forme de courbe.
 *
 * ⚠️ LA COURBE VIENT DE NOS PROPRES RELEVÉS, pas d'un historique publié : aucune
 * source gratuite ne diffuse celui de la capitalisation mondiale. Elle ne remonte donc
 * qu'à la mise en service du processus, et sa profondeur réelle est écrite sous le
 * chiffre plutôt que laissée à deviner — une courbe muette sur son étendue laisse
 * croire à un historique long.
 */
export async function GlobalPulse({
  stats,
  series,
  sparkHeight,
}: {
  stats: GlobalMarketStats
  series: MarketCapSeriesState
  /** Transmis tel quel aux deux cartes — voir `MetricCard`. */
  sparkHeight?: number
}) {
  const t = await getPhrase()
  const capPoints = series.points.map((point) => ({ x: point.timestamp, y: point.value }))

  // Les points antérieurs au relevé du volume n'en portent pas : les écarter plutôt
  // que les lire comme des zéros, ce qui creuserait un faux effondrement en début de
  // courbe.
  const volumePoints = series.points
    .filter((point) => typeof point.volume === 'number')
    .map((point) => ({ x: point.timestamp, y: point.volume as number }))

  const depth = series.ready ? formatDepth(series.spanMinutes) : null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricCard
        label={t('Capitalisation mondiale')}
        color="var(--color-data-1)"
        value={<Money value={stats.totalMarketCap} from={stats.currency} compact />}
        hint={
          <span className="flex items-center gap-2">
            <ChangeBadge value={stats.marketCapChange24h} size="sm" />
            {depth ? (
              <span className="text-ink-muted">
                {t('relevés sur {depth}').replace('{depth}', depth)}
              </span>
            ) : null}
          </span>
        }
        {...(series.ready && capPoints.length > 1 ? { series: capPoints } : {})}
        {...(sparkHeight ? { sparkHeight } : {})}
        format="compact"
      />

      <MetricCard
        label={t('Volume échangé sur 24 h')}
        color="var(--color-data-4)"
        value={<Money value={stats.totalVolume24h} from={stats.currency} compact />}
        hint={
          <span className="text-ink-muted">
            {stats.totalMarketCap > 0
              ? t('{share} % de la capitalisation').replace(
                  '{share}',
                  ((stats.totalVolume24h / stats.totalMarketCap) * 100)
                    .toFixed(1)
                    .replace('.', ','),
                )
              : t('Rapporté à la capitalisation mondiale')}
          </span>
        }
        {...(volumePoints.length > 1 ? { series: volumePoints } : {})}
        {...(sparkHeight ? { sparkHeight } : {})}
        format="compact"
      />
    </div>
  )
}

/** Profondeur de la série, en clair. */
function formatDepth(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  return `${hours} h`
}
