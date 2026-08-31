import type { MarketCapSeriesState } from '@zenkuu/data'
import { MIN_POINTS_FOR_CHART } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AreaSpark } from '@/components/charts/AreaSpark'
import { getPhrase } from '@/lib/content'

/**
 * Dominance de Bitcoin — répartition actuelle, et courbe de nos propres relevés.
 *
 * ── POURQUOI LA COURBE EST COURTE, ET POURQUOI C'EST LA SEULE HONNÊTE ────────
 *
 * La référence publie une dominance sur plusieurs années. L'endpoint qui la sert chez
 * CoinGecko est payant. On pourrait la reconstituer : l'historique de capitalisation
 * de Bitcoin est gratuit, et il suffirait de le diviser par celui du marché entier.
 * Sauf que ce dernier est exactement ce qui manque — le calculer depuis la dominance
 * ACTUELLE reviendrait à supposer qu'elle n'a pas bougé, c'est-à-dire à supposer la
 * réponse qu'on cherche.
 *
 * On trace donc ce qu'on a relevé nous-mêmes, à chaque lecture des statistiques
 * globales, et la profondeur réelle est écrite sous la courbe. Une courbe muette sur
 * son étendue laisse croire à un historique long ; celle-ci dit ce qu'elle couvre.
 *
 * ── LA RÉPARTITION DU JOUR, ELLE, EST COMPLÈTE ──────────────────────────────
 *
 * La source publie la part de chaque grand actif à l'instant présent. C'est une mesure
 * entière, pas un extrait — et c'est ce qui rend la barre de répartition plus
 * informative que la courbe qu'elle accompagne.
 */
export async function DominanceView({
  series,
  current,
}: {
  series: MarketCapSeriesState
  /** Part de marché par symbole, ex. `{ btc: 56.3, eth: 10.1 }`. */
  current?: Record<string, number>
}) {
  const t = await getPhrase()
  const points = series.points
    .filter((point) => typeof point.btcDominance === 'number')
    .map((point) => ({ x: point.timestamp, y: point.btcDominance as number }))

  const entries = Object.entries(current ?? {})
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const named = entries.reduce((total, [, value]) => total + value, 0)
  const others = Math.max(0, 100 - named)

  return (
    <div className="space-y-8">
      {/* ── RÉPARTITION DU JOUR ────────────────────────────────────────────── */}
      {entries.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">{t('Répartition actuelle')}</h2>
            <p className="tabular text-xs text-ink-muted">
              {t('part de la capitalisation mondiale')}
            </p>
          </div>

          {/* Une barre empilée plutôt que six chiffres : la dominance EST une
              répartition, et une part se lit mieux comme une longueur. */}
          <div
            className="flex h-3 overflow-hidden rounded-pill bg-surface-muted"
            role="img"
            aria-label={entries
              .map(([symbol, value]) => `${symbol.toUpperCase()} ${value.toFixed(1)} %`)
              .join(', ')}
          >
            {entries.map(([symbol, value], index) => (
              <span
                key={symbol}
                className="h-full"
                style={{
                  width: `${value}%`,
                  backgroundColor: `var(--color-data-${(index % 6) + 1})`,
                }}
              />
            ))}
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {entries.map(([symbol, value], index) => (
              <div key={symbol} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: `var(--color-data-${(index % 6) + 1})` }}
                  aria-hidden="true"
                />
                <dt className="font-medium uppercase text-ink">{symbol}</dt>
                <dd className="tabular text-ink-muted">{value.toFixed(1).replace('.', ',')} %</dd>
              </div>
            ))}

            {/* « Autres » est CALCULÉ par soustraction, et le dire évite de le faire
                passer pour une septième mesure publiée par la source. */}
            {others > 0.1 ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-pill bg-surface-muted"
                  aria-hidden="true"
                />
                <dt className="font-medium text-ink-muted">{t('Autres')}</dt>
                <dd className="tabular text-ink-muted">{others.toFixed(1).replace('.', ',')} %</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {/* ── COURBE DE NOS RELEVÉS ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">{t('Dominance de Bitcoin dans le temps')}</h2>
          {series.ready ? (
            <p className="text-xs text-ink-muted">
              {t('relevés ZENKUU sur {duree}').replace('{duree}', formatDepth(series.spanMinutes))}
            </p>
          ) : null}
        </div>

        {points.length >= MIN_POINTS_FOR_CHART ? (
          <div className="rounded-card border border-border-subtle bg-surface p-4">
            <AreaSpark
              data={points}
              color="var(--color-data-2)"
              height={220}
              format="percent"
            />
          </div>
        ) : (
          <EmptyState
            title={t('Courbe en cours de constitution')}
            description={t(
              'Aucune source gratuite ne publie l’historique de dominance : nous l’enregistrons à chaque lecture des statistiques globales. La courbe apparaîtra dès que suffisamment de points auront été relevés.',
            )}
          />
        )}
      </section>
    </div>
  )
}

/** Profondeur de la série, en clair. */
function formatDepth(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.round(hours / 24)} jours`
}
