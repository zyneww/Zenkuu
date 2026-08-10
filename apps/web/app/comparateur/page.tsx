import type { Metadata } from 'next'
import Link from 'next/link'

import { CACHE_TTL_SECONDS, getRanking } from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { ComparatorView } from '@/components/tools/ComparatorView'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Comparateur',
  description:
    'Comparer deux à quatre cryptomonnaies : trajectoires en base 100 sur sept jours, capitalisation, volume, rotation et offre.',
  alternates: { canonical: '/comparateur' },
}

/**
 * Comparateur.
 *
 * Construit sur l'univers de 250 actifs déjà chargé — donc aucun appel réseau
 * supplémentaire, quel que soit le nombre d'actifs comparés. La variante « une requête
 * de fiche par actif » aurait apporté quelques champs de plus (valorisation diluée,
 * TVL) au prix de quatre appels par comparaison, sur un quota qui en tolère cinq par
 * minute : la page aurait été inutilisable dès le deuxième visiteur.
 *
 * Ce que ce choix retire est réel et assumé : pas de comparaison entre classes
 * d'actifs (une action et une cryptomonnaie viennent de deux sources aux champs
 * différents), et pas d'historique au-delà de sept jours.
 */
export default async function ComparatorPage() {
  // `getRanking` et non `getMoversUniverse` : c'est le seul des deux qui demande les
  // SÉRIES 7 JOURS à la source, et sans elles le graphique en base 100 n'a rien à
  // tracer.
  //
  // `perPage: 50` est la taille de page du classement crypto : cette requête partage
  // donc sa clé de cache avec `/crypto`, et n'est en pratique jamais un appel de plus.
  // Cinquante candidats suffisent largement à un comparateur qui en affiche quatre.
  const universe = await getRanking({ assetClass: 'crypto', currency: 'eur', perPage: 50 })

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Comparateur</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Deux à quatre cryptomonnaies côte à côte : trajectoires ramenées à une base
          commune, puis les chiffres qui les séparent.
        </p>
      </header>

      {universe.ok && universe.data.length > 1 ? (
        <>
          <ComparatorView assets={universe.data} />
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
        <h2 className="text-sm font-semibold text-ink">Ce que le comparateur ne compare pas</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Le périmètre est la crypto seule. Rapprocher une action et une cryptomonnaie
          supposerait de mettre en regard des champs que deux sources différentes ne
          définissent pas de la même façon — un « volume » de place boursière et un
          volume agrégé de places crypto ne se comparent pas ligne à ligne. Nous
          préférons ne pas offrir la comparaison plutôt que d’en offrir une fausse.
        </p>
        <p className="text-sm text-ink-muted">
          Pour une lecture complète d’un actif, voir sa fiche depuis les{' '}
          <Link href="/crypto" className="text-brand hover:underline">
            cotations
          </Link>
          , ou filtrer le marché avec le{' '}
          <Link href="/screener" className="text-brand hover:underline">
            screener
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
