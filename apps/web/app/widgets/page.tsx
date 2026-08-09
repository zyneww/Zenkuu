import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getCryptoRanking } from '@zenith/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenith/ui'

import { AssetList } from '@/components/AssetList'
import { ConverterWidget } from '@/components/widgets/ConverterWidget'
import { TickerWidget } from '@/components/widgets/TickerWidget'
import { fr } from '@/content/fr'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Widgets de marché',
  description:
    'Bandeau de cotations, convertisseur et classement compact — des widgets natifs ZENITH, intégrables dans une page tierce.',
  alternates: { canonical: '/widgets' },
}

/**
 * Vitrine des widgets.
 *
 * Décision d'architecture, tracée ici et dans ZENITH.md : ces widgets sont NATIFS,
 * construits sur `@zenith/data`, plutôt que des iframes tierces. Trois raisons :
 * une iframe ne suit pas le thème clair/sombre, elle charge du JavaScript externe
 * sur chaque page qui l'affiche, et elle impose un watermark que l'on ne contrôle
 * pas. Les nôtres partagent le cache et les limiteurs de débit du reste du site.
 */
export default async function WidgetsPage() {
  const ranking = await getCryptoRanking({ perPage: 12 })

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Widgets de marché</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Des composants autonomes alimentés par les mêmes sources que le reste du
          site. Ils suivent le thème, ne chargent aucun script tiers, et peuvent être
          intégrés dans une page externe.
        </p>
      </header>

      {!ranking.ok || ranking.data.length === 0 ? (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={ranking.ok ? null : ranking.reason}
          source={ranking.source?.label ?? null}
        />
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Bandeau de cotations</h2>
            <TickerWidget assets={ranking.data} />
            <EmbedHint path="/embed/ticker" />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">Convertisseur</h2>
              <ConverterWidget assets={ranking.data} />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">Classement compact</h2>
              <Card>
                <CardHeader title="Top capitalisations" />
                <AssetList assets={ranking.data.slice(0, 8)} showRank />
              </Card>
            </section>
          </div>

          <SourceNote label={ranking.source.label} href={ranking.source.attributionUrl} />
        </>
      )}
    </div>
  )
}

function EmbedHint({ path }: { path: string }) {
  return (
    <details className="rounded-card border border-border-subtle bg-surface-muted p-3">
      <summary className="cursor-pointer text-xs font-medium text-ink">
        Intégrer ce widget
      </summary>
      <pre className="mt-2 overflow-x-auto rounded bg-surface p-2 text-[0.6875rem] text-ink-muted">
        {`<iframe src="https://votre-domaine${path}" width="100%" height="56" style="border:0" title="Cotations ZENITH"></iframe>`}
      </pre>
      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        Remplacez le domaine par celui de votre instance. L’attribution CoinGecko
        exigée par ses conditions d’utilisation est incluse dans le widget.
      </p>
    </details>
  )
}
