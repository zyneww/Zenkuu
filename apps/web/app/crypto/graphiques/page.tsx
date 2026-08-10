import type { Metadata } from 'next'
import Link from 'next/link'

import {
  CACHE_TTL_SECONDS,
  getAssetHistory,
  getCryptoGlobalStats,
  getMarketCapSeriesState,
  getSentimentHistory,
  type PriceHistory,
} from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { GlobalChartsView } from '@/components/market/GlobalChartsView'
import { MacroBand } from '@/components/market/MacroBand'
import { MarketOverviewCard } from '@/components/home/MarketOverviewCard'
import { SentimentHistoryView } from '@/components/sentiment/SentimentHistoryView'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Graphiques globaux',
  description:
    'Capitalisation, volumes, dominance et sentiment du marché crypto sur un an — cours, capitalisation et volume de Bitcoin et d’Ethereum, relevés à la source.',
  alternates: { canonical: '/crypto/graphiques' },
}

/**
 * Graphiques globaux.
 *
 * ⚠️ CE QUE CETTE PAGE NE PEUT PAS MONTRER, ET POURQUOI. La référence ouvre sur une
 * courbe de la capitalisation MONDIALE sur plusieurs années. Aucune source gratuite
 * ne la publie : l'endpoint correspondant de CoinGecko répond 401 hors abonnement, et
 * la reconstituer depuis la capitalisation de Bitcoin divisée par sa dominance
 * actuelle serait une estimation présentée comme une mesure — précisément ce que le
 * §5 interdit, d'autant que la dominance a bougé sur toute période un peu longue.
 *
 * Trois réponses honnêtes, toutes retenues ici :
 *  · la capitalisation totale est tracée sur NOS PROPRES RELEVÉS, avec sa profondeur
 *    réelle affichée — courte, mais chaque point a été lu chez la source ;
 *  · les courbes longues portent sur Bitcoin et Ethereum, dont la source publie
 *    réellement un an de capitalisation, de volume et de cours ;
 *  · le sentiment, lui, remonte à un an, parce que sa source le publie.
 *
 * La disposition suit cette gradation : ce que l'on sait de l'instant (macro), ce que
 * l'on sait de la durée (courbes longues), ce que l'on sait de l'humeur (sentiment).
 */
export default async function GlobalChartsPage() {
  const [globalStats, btc, eth, sentiment] = await Promise.all([
    getCryptoGlobalStats('eur'),
    getAssetHistory('bitcoin', 'crypto', 365, 'eur'),
    getAssetHistory('ethereum', 'crypto', 365, 'eur'),
    getSentimentHistory(365),
  ])

  // Lu APRÈS `getCryptoGlobalStats` : c'est cet appel qui vient d'ajouter le point du
  // jour à la série enregistrée.
  const marketCapSeries = getMarketCapSeriesState('EUR')

  const histories: Partial<Record<'bitcoin' | 'ethereum', PriceHistory>> = {}
  if (btc.ok) histories.bitcoin = btc.data
  if (eth.ok) histories.ethereum = eth.data

  return (
    <div className="space-y-12 sm:space-y-16">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Graphiques globaux</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          L’état du marché dans la durée : agrégats mondiaux, capitalisation et volumes
          des deux plus grandes cryptomonnaies, puis l’indice de sentiment sur un an.
        </p>
      </header>

      {globalStats.ok ? (
        <>
          <MacroBand stats={globalStats.data} />
          <SourceNote
            label={globalStats.source.label}
            href={globalStats.source.attributionUrl}
            updatedAt={globalStats.data.lastUpdated}
          />
        </>
      ) : (
        <EmptyState title="Agrégats mondiaux indisponibles" description={globalStats.reason} />
      )}

      <MarketOverviewCard result={globalStats} series={marketCapSeries} />

      {btc.ok || eth.ok ? (
        <>
          <GlobalChartsView histories={histories} />
          <SourceNote
            label={(btc.ok ? btc.source : eth.ok ? eth.source : { label: '' }).label}
            href={
              (btc.ok ? btc.source : eth.ok ? eth.source : { attributionUrl: '#' }).attributionUrl
            }
          />
        </>
      ) : (
        <EmptyState
          title="Courbes longues indisponibles"
          description={btc.ok ? null : btc.reason}
          tone="warning"
        />
      )}

      {sentiment.ok && sentiment.data.length > 1 ? (
        <div className="space-y-4">
          <SentimentHistoryView points={sentiment.data} />
          <p className="text-sm text-ink-muted">
            L’indice et sa méthode sont détaillés sur la{' '}
            <Link href="/sentiment" className="text-brand hover:underline">
              page dédiée au sentiment
            </Link>
            .
          </p>
          <SourceNote label={sentiment.source.label} href={sentiment.source.attributionUrl} />
        </div>
      ) : null}
    </div>
  )
}
