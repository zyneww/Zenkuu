import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CACHE_TTL_SECONDS, getMoversUniverse } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { ScreenerView } from '@/components/tools/ScreenerView'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Screener',
  description:
    'Filtrer les 250 plus grandes capitalisations crypto sur la capitalisation, le volume et la variation — sans compte et sans exécution d’ordre.',
  alternates: { canonical: '/screener' },
}

/**
 * Screener.
 *
 * PÉRIMÈTRE BORNÉ ET ANNONCÉ. Un screener qui laisserait croire qu'il balaie les
 * quinze mille jetons référencés alors qu'il en voit deux cent cinquante mentirait sur
 * son résultat : « aucun actif ne satisfait ces critères » n'a pas le même sens selon
 * l'ensemble examiné. La borne est donc écrite en tête, avec sa raison.
 *
 * Cette raison est double, et aucune n'est technique au sens paresseux : la source
 * plafonne une page à 250 lignes, et surtout, en dessous de quelques millions de
 * capitalisation, un seul échange déplace un cours de dizaines de points — un filtre
 * non borné remonterait d'abord ce bruit.
 */
export default async function ScreenerPage() {
  const universe = await getMoversUniverse(250, 'eur')

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Screener</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Filtrer le marché sur vos critères — capitalisation, volume, variation — parmi
          les 250 plus grandes capitalisations crypto.
        </p>
      </header>

      {universe.ok && universe.data.length > 0 ? (
        <>
          <ScreenerView assets={universe.data} />
          <SourceNote
            label={universe.source.label}
            href={universe.source.attributionUrl}
            updatedAt={universe.data[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title="Univers indisponible"
          description={universe.ok ? null : universe.reason}
          tone="warning"
        />
      )}

      <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
        <h2 className="text-sm font-semibold text-ink">Pourquoi 250 et pas tout le marché</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Deux raisons. La source plafonne une page de classement à 250 lignes, et
          balayer les quinze mille jetons référencés demanderait une soixantaine
          d’appels par affichage — infaisable sur un accès gratuit. Surtout, en dessous
          de quelques millions de capitalisation, un seul échange déplace un cours de
          dizaines de points : un filtre non borné remonterait d’abord ce bruit, et le
          présenterait comme un résultat.
        </p>
        <p className="text-sm text-ink-muted">
          Le filtrage est instantané parce qu’il porte sur des données déjà reçues avec
          la page — aucun aller-retour serveur n’est déclenché à chaque réglage. Voir la{' '}
          <Link href="/methodologie" className="text-brand hover:underline">
            méthodologie
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
