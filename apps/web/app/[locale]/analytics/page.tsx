import type { Metadata } from 'next'

import { getDefiChains, getDefiProtocols, getFeeOverview } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AnalyticsShell } from '@/components/analytics/AnalyticsShell'
import { FeeSeries } from '@/components/analytics/FeeSeries'
import { ProtocolsTable } from '@/components/analytics/ProtocolsTable'
import { StatStrip } from '@/components/analytics/StatStrip'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * APERÇU — CE QUE LA FINANCE DÉCENTRALISÉE PÈSE AUJOURD'HUI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Trois chiffres, une série, un tableau. C'est l'ordre de Token Terminal et de
 * Blockworks, et il suit la question qu'on se pose en arrivant : combien, depuis
 * quand, et qui.
 *
 * ── LES TROIS CHIFFRES SONT DES SOMMES, ET ILS DISENT LEUR PÉRIMÈTRE ───────
 *
 * « Valeur immobilisée » est la somme des CENT premières chaînes, pas de toutes. La
 * source en publie quatre cent soixante-six ; la queue pèse quelques millions et
 * coûterait autant de lignes à transporter. Le libellé annonce le périmètre plutôt que
 * de laisser croire à un total mondial.
 *
 * ── UNE HEURE DE CACHE, ET LA PAGE PEUT ÊTRE STATIQUE ──────────────────────
 *
 * `revalidate` à 3 600 : les quatre lectures partagent ce TTL côté données, et rien
 * ici ne dépend de la requête. Une page qui se régénère chaque heure est servie depuis
 * le disque le reste du temps, ce qui est le seul régime tenable pour des réponses de
 * plusieurs mégaoctets.
 */
export const revalidate = 3_600

const TITLE = 'Analytics'
const LEAD =
  'Ce que la finance décentralisée immobilise, ce qu’elle encaisse et ce qu’elle rémunère — mesuré par DefiLlama, repris sans retouche.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: await pageAlternates('/analytics'),
  }
}

export default async function Page() {
  const t = await getPhrase()

  /* Les trois appels partent ensemble : ils visent le même hôte mais des chemins
     différents, et rien ne dépend du résultat d'un autre. */
  const [chains, protocols, fees] = await Promise.all([
    getDefiChains(100),
    getDefiProtocols(50),
    getFeeOverview(),
  ])

  const totalTvl = chains.ok ? chains.data.reduce((somme, chain) => somme + chain.tvl, 0) : undefined

  return (
    <AnalyticsShell current="/analytics" title={TITLE} lead={LEAD}>
      {/* ⚠️ CHAQUE BLOC SE RETIRE SÉPARÉMENT. Les trois lectures viennent du même
          fournisseur mais de trois chemins : l'un peut échouer quand les autres
          répondent, et une page entièrement vide parce qu'un seul agrégat manque serait
          une panne fabriquée. */}
      <StatStrip
        items={[
          {
            key: 'tvl',
            label: t('Valeur immobilisée'),
            value: totalTvl,
            unit: 'usd',
            note: t('Somme des cent premières chaînes.'),
          },
          {
            key: 'fees',
            label: t('Frais payés sur 24 h'),
            value: fees.ok ? fees.data.total24h : undefined,
            unit: 'usd',
            ...(fees.ok && fees.data.change1d !== undefined ? { change: fees.data.change1d } : {}),
            note: t('Ce que les utilisateurs paient, tous protocoles confondus.'),
          },
          {
            key: 'fees30',
            label: t('Frais payés sur 30 j'),
            value: fees.ok ? fees.data.total30d : undefined,
            unit: 'usd',
            ...(fees.ok && fees.data.change30d !== undefined ? { change: fees.data.change30d } : {}),
            note: t('La même mesure, sur une fenêtre où le bruit quotidien s’efface.'),
          },
        ]}
      />

      {fees.ok && fees.data.series.length > 1 ? (
        <section aria-labelledby="frais-titre" className="space-y-3">
          <div className="space-y-1">
            <h2 id="frais-titre" className="display-sm text-ink">
              {t('Frais payés, mois par mois')}
            </h2>
            <p className="max-w-3xl text-xs leading-[1.425] text-ink-muted">
              {t(
                'Les frais sont ce que les utilisateurs paient. Ce n’est PAS le revenu des protocoles : une partie va aux fournisseurs de liquidité, et la source publie les deux séparément.',
              )}
            </p>
          </div>

          <FeeSeries points={fees.data.series} />
        </section>
      ) : null}

      {protocols.ok ? (
        <section aria-labelledby="protocoles-titre" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="protocoles-titre" className="display-sm text-ink">
              {t('Les plus gros protocoles')}
            </h2>
            <Link
              href="/analytics/tokenized-assets"
              className="shrink-0 text-xs font-medium text-ink hover:underline"
            >
              {t('Voir les actifs tokenisés')}
            </Link>
          </div>

          <ProtocolsTable protocols={protocols.data} showCategory />
        </section>
      ) : (
        <EmptyState
          title={t('Classement des protocoles indisponible')}
          description={protocols.reason}
          source={protocols.source?.label ?? null}
          tone="warning"
        />
      )}

      <p className="text-micro text-ink-muted">
        {t('Source : {source}').replace('{source}', 'DefiLlama')}
      </p>
    </AnalyticsShell>
  )
}
