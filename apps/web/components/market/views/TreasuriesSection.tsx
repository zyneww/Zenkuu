import { getTreasuries } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { TreasuryOverview } from '@/components/market/TreasuryOverview'
import { TreasuryTable } from '@/components/market/TreasuryTable'
import { getPhrase } from '@/lib/content'

export async function TreasuriesSection() {
  const t = await getPhrase()
  /*
   * Les deux registres partent ENSEMBLE, et chacun peut échouer seul : le fournisseur
   * est plafonné à cinq appels par minute, et il est normal que le second attende. Un
   * `Promise.all` classique suffit ici — `runStandalone` ne rejette jamais, il rend un
   * résultat en échec.
   */
  const [bitcoin, ethereum] = await Promise.all([
    getTreasuries('bitcoin'),
    getTreasuries('ethereum'),
  ])

  if (!bitcoin.ok && !ethereum.ok) {
    return (
      <EmptyState
        title={t('Registres de trésorerie indisponibles')}
        description={bitcoin.reason}
        source={bitcoin.source?.label ?? null}
        tone="warning"
      />
    )
  }

  /*
   * La vue d'ensemble passe AVANT les deux registres, et elle est construite à partir
   * d'eux — aucun appel supplémentaire. Les tableaux répondent à « qui détient quoi » ;
   * les quatre compteurs et la carte répondent à « combien sont-ils, et à quel point
   * est-ce concentré », question que deux cents lignes triées laissent deviner sans
   * jamais la montrer.
   */
  const reports = [
    ...(bitcoin.ok ? [{ coin: 'bitcoin', label: 'Bitcoin', unit: 'BTC', report: bitcoin.data }] : []),
    ...(ethereum.ok
      ? [{ coin: 'ethereum', label: 'Ethereum', unit: 'ETH', report: ethereum.data }]
      : []),
  ]

  return (
    <div className="space-y-10">
      <TreasuryOverview reports={reports} />

      {bitcoin.ok ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display-sm text-ink">Bitcoin</h2>
            <p className="tabular text-sm text-ink-muted">
              {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                bitcoin.data.totalHoldings,
              )}{' '}
              BTC détenus
              {bitcoin.data.percentOfMarketCap !== undefined
                ? ` · ${bitcoin.data.percentOfMarketCap.toFixed(2).replace('.', ',')} % de la capitalisation`
                : ''}
            </p>
          </div>
          <TreasuryTable report={bitcoin.data} unit="BTC" />
        </section>
      ) : null}

      {ethereum.ok ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display-sm text-ink">Ethereum</h2>
            <p className="tabular text-sm text-ink-muted">
              {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                ethereum.data.totalHoldings,
              )}{' '}
              ETH détenus
              {ethereum.data.percentOfMarketCap !== undefined
                ? ` · ${ethereum.data.percentOfMarketCap.toFixed(2).replace('.', ',')} % de la capitalisation`
                : ''}
            </p>
          </div>
          <TreasuryTable report={ethereum.data} unit="ETH" />
        </section>
      ) : null}

      <SourceNote
        strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={`${(bitcoin.ok ? bitcoin.source : ethereum.source)?.label ?? ''} · montants en USD`}
        href={(bitcoin.ok ? bitcoin.source : ethereum.source)?.attributionUrl ?? '#'}
      />
    </div>
  )
}
