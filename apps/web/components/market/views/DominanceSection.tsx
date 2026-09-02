import { Suspense } from 'react'

import { getCryptoGlobalStats, getMarketCapSeriesState } from '@zenkuu/data'
import { SourceNote, formatShare } from '@zenkuu/ui'
import { getLocale } from 'next-intl/server'

import { StatCard } from '@/components/charts/StatCard'

import { DominanceView } from '@/components/market/DominanceView'
import { LoadingNote } from '@/components/market/ChartsShell'
import { BasketSection } from '@/components/market/views/BasketSection'
import { getPhrase } from '@/lib/content'

/**
 * LA DOMINANCE, EN DEUX MESURES QUI NE SE CONFONDENT PAS.
 *
 * Celle du haut est la vraie : Bitcoin rapporté au marché entier, telle que la source
 * la publie. Sa profondeur est celle de NOS PROPRES RELEVÉS — quelques heures, et
 * elle repart de zéro à chaque redéploiement (voir `market-cap-series`).
 *
 * Celle du bas couvre un an, mais porte sur un panier de neuf actifs. Ce n'est PAS la
 * dominance au sens strict, et c'est pourquoi les deux blocs cohabitent au lieu que
 * l'un remplace l'autre : le premier donne la mesure exacte sur une fenêtre courte,
 * le second une mesure approchante sur une fenêtre longue. Chacun dit lequel il est.
 */
export async function DominanceSection() {
  const t = await getPhrase()
  const locale = await getLocale()
  const globalStats = await getCryptoGlobalStats('eur')
  const series = getMarketCapSeriesState('EUR')

  const stats = globalStats.ok ? globalStats.data : null

  return (
    <div className="space-y-10">
      {/* ── LA BANDE DE TÊTE ────────────────────────────────────────────────
          Trois parts, la valeur en grand — le motif d'ASXN, déjà posé sur
          /graphiques et /graphiques/actifs-reels (voir `StatCard`).

          La page ouvrait directement sur la barre empilée. Elle est bonne — une
          dominance EST une répartition, et une part se lit mieux comme une longueur —
          mais elle ne DONNE PAS le chiffre : il fallait survoler ou lire la légende.
          Les trois premières parts passent devant, en toutes lettres.

          « Reste » est calculé, et c'est le seul de la bande : cent moins les deux
          premières. Ce n'est pas une donnée inventée mais une soustraction sur des
          parts qui sont affichées juste en dessous — et il porte son nom, qui dit
          exactement ce qu'il est. */}
      {stats && stats.dominance['btc'] !== undefined ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label={t('Dominance de Bitcoin')}
            value={formatShare(stats.dominance['btc'], locale) ?? '—'}
          />
          {stats.dominance['eth'] !== undefined ? (
            <StatCard
              label={t('Dominance d’Ethereum')}
              value={formatShare(stats.dominance['eth'], locale) ?? '—'}
            />
          ) : null}
          <StatCard
            label={t('Reste du marché')}
            value={
              formatShare(
                100 - stats.dominance['btc'] - (stats.dominance['eth'] ?? 0),
                locale,
              ) ?? '—'
            }
            note={t('Toutes les autres cryptomonnaies réunies')}
          />
        </div>
      ) : null}

      <div className="space-y-6">
        <DominanceView
          series={series}
          current={globalStats.ok ? globalStats.data.dominance : undefined}
        />
        {globalStats.ok ? (
          <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={globalStats.source.label}
            href={globalStats.source.attributionUrl}
            updatedAt={globalStats.data.lastUpdated}
          />
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="rounded-card border border-brand/25 bg-brand-soft/55 px-4 py-3">
          <h2 className="text-xs font-semibold text-ink">{t('Et sur un an ?')}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">
            {t(
              'La dominance ci-dessus est la vraie : Bitcoin rapporté au marché entier, tel que la source le publie. Sa profondeur est celle de nos propres relevés, c’est-à-dire quelques heures. Pour voir la tendance sur douze mois, il faut accepter une mesure approchante — la part de Bitcoin dans un panier de neuf actifs, dont la composition est listée sous les courbes. Elle est tracée dans le cadre « Part de Bitcoin dans le panier », juste en dessous.',
            )}
          </p>
        </div>

        <Suspense fallback={<LoadingNote label={t('Assemblage du panier de capitalisations…')} />}>
          <BasketSection stats={null} />
        </Suspense>
      </div>
    </div>
  )
}
