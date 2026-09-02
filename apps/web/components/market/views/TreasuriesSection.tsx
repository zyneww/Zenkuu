import { getTreasuries } from '@zenkuu/data'
import { EmptyState, SourceNote, formatCompact, formatShare } from '@zenkuu/ui'
import { getLocale } from 'next-intl/server'

import { StatCard } from '@/components/charts/StatCard'

import { TreasuryOverview } from '@/components/market/TreasuryOverview'
import { TreasuryTable } from '@/components/market/TreasuryTable'
import { getPhrase } from '@/lib/content'

export async function TreasuriesSection() {
  const t = await getPhrase()
  /* Le locale AFFICHÉ, pour que les milliers se séparent comme la langue lue les
     sépare. Il était écrit `'fr-FR'` en dur, ce qui donnait des points là où
     l'allemand veut des points mais l'anglais des virgules. */
  const locale = await getLocale()
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

      {/* ══════════════════════════════════════════════════════════════════
          LA BANDE REMPLACE DEUX LIGNES DE TEXTE — ET CORRIGE TROIS DÉFAUTS

          Les totaux vivaient dans un paragraphe posé à droite du titre, et trois
          choses y clochaient :

          1. `Intl.NumberFormat('fr-FR')` EN DUR. Un lecteur allemand voyait
             « 1.005.000 » écrit à la française. Le locale affiché est passé au
             composant, qui formate dans la langue qu'on lit.
          2. « BTC détenus » et « % de la capitalisation » n'étaient PAS dans `t()` :
             du français sur /de, /ja, /zh — le défaut que ce projet a corrigé partout
             ailleurs.
          3. La forme. Deux chiffres publiés par la source, rendus en petit et en gris
             à côté d'un titre, alors que ce sont les deux réponses que la page
             apporte : combien, et quelle part du total.

          Les valeurs elles-mêmes sont INCHANGÉES : `totalHoldings` et
          `percentOfMarketCap` viennent de la source, ils ne sont pas calculés ici.
          ══════════════════════════════════════════════════════════════════ */}
      {bitcoin.ok ? (
        <section className="space-y-3">
          <h2 className="display-sm text-ink">Bitcoin</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label={t('Détenu en trésorerie')}
              value={`${formatCompact(bitcoin.data.totalHoldings, locale) ?? '—'} BTC`}
              note={t('{n} détenteurs').replace('{n}', String(bitcoin.data.holders.length))}
            />
            {bitcoin.data.percentOfMarketCap !== undefined ? (
              <StatCard
                label={t('Part de la capitalisation')}
                value={formatShare(bitcoin.data.percentOfMarketCap, locale) ?? '—'}
              />
            ) : null}
          </div>

          <TreasuryTable report={bitcoin.data} unit="BTC" />
        </section>
      ) : null}

      {ethereum.ok ? (
        <section className="space-y-3">
          <h2 className="display-sm text-ink">Ethereum</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label={t('Détenu en trésorerie')}
              value={`${formatCompact(ethereum.data.totalHoldings, locale) ?? '—'} ETH`}
              note={t('{n} détenteurs').replace('{n}', String(ethereum.data.holders.length))}
            />
            {ethereum.data.percentOfMarketCap !== undefined ? (
              <StatCard
                label={t('Part de la capitalisation')}
                value={formatShare(ethereum.data.percentOfMarketCap, locale) ?? '—'}
              />
            ) : null}
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
