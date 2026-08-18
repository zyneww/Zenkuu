import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getCryptoRanking } from '@zenkuu/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetList } from '@/components/AssetList'
import { ConverterWidget } from '@/components/widgets/ConverterWidget'
import { TickerWidget } from '@/components/widgets/TickerWidget'
import { getContent, getPhrase, getSeo } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages traduites. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  const seo = await getSeo()

  return {
    title: t('Widgets de marché'),
    description: seo(
      '/widgets',
      'Bandeau de cotations, convertisseur et classement compact — des widgets natifs ZENKUU, intégrables dans une page tierce.',
    ),
    alternates: { canonical: '/widgets' },
  }
}

/**
 * Vitrine des widgets.
 *
 * Décision d'architecture, tracée ici et dans ZENKUU.md : ces widgets sont NATIFS,
 * construits sur `@zenkuu/data`, plutôt que des iframes tierces. Trois raisons :
 * une iframe ne suit pas le thème clair/sombre, elle charge du JavaScript externe
 * sur chaque page qui l'affiche, et elle impose un watermark que l'on ne contrôle
 * pas. Les nôtres partagent le cache et les limiteurs de débit du reste du site.
 */
export default async function WidgetsPage() {
  const fr = await getContent()
  /*
   * 50 puis découpe locale, plutôt que 12 demandés à la source.
   *
   * La taille de page entre dans la clé de cache : demander douze lignes ouvrait une
   * entrée que PERSONNE d'autre ne partageait, donc un appel sortant à chaque
   * expiration — mesuré à plus de dix-sept secondes en période de quota atteint, pour
   * une donnée que `/crypto` venait de charger. Cinquante est la taille de page du
   * classement crypto : cette requête est donc, en pratique, toujours servie par le
   * cache. Les trente-huit lignes en trop ne coûtent rien — elles sont déjà en mémoire.
   */
  const ranking = await getCryptoRanking({ perPage: 50 })
  const assets = ranking.ok ? ranking.data.slice(0, 12) : []

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

      {!ranking.ok || assets.length === 0 ? (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={ranking.ok ? null : ranking.reason}
          source={ranking.source?.label ?? null}
        />
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Bandeau de cotations</h2>
            <TickerWidget assets={assets} />
            <EmbedHint path="/embed/ticker" />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">Convertisseur</h2>
              <ConverterWidget assets={assets} />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">Classement compact</h2>
              <Card>
                <CardHeader title="Top capitalisations" />
                <AssetList assets={assets.slice(0, 8)} showRank />
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
        {`<iframe src="https://votre-domaine${path}" width="100%" height="56" style="border:0" title="Cotations ZENKUU"></iframe>`}
      </pre>
      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        Remplacez le domaine par celui de votre instance. L’attribution CoinGecko
        exigée par ses conditions d’utilisation est incluse dans le widget.
      </p>
    </details>
  )
}
