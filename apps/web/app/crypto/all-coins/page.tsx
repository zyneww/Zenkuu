import type { Metadata } from 'next'
import Link from 'next/link'

import { CACHE_TTL_SECONDS, getMoversUniverse } from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { RankingBoard } from '@/components/market/RankingBoard'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Classements crypto',
  description:
    'Plus fortes hausses, plus fortes baisses, volumes les plus élevés et rotation la plus forte, sur 1 heure à 30 jours.',
  alternates: { canonical: '/crypto/all-coins' },
}

/**
 * Classements crypto.
 *
 * La page change de VOCATION. Elle servait un second tableau de cotation paginé, ce
 * qui faisait doublon avec `/crypto` : deux pages où l'on trie les mêmes colonnes,
 * l'une après l'autre. Elle présente désormais plusieurs palmarès SIMULTANÉS —
 * hausses, baisses, volumes, rotation — que l'on compare d'un seul regard.
 *
 * Le partage des rôles est net : `/crypto` reste la page des cours, celle-ci est la
 * page des classements. Aucune des deux ne peut remplacer l'autre.
 *
 * Disposition différente de la référence, qui empile des onglets au-dessus d'un
 * tableau unique : on ne voit alors qu'un classement à la fois, et comparer impose
 * de mémoriser. Ici les quatre tiennent dans une grille à deux colonnes, avec une
 * SEULE période commune — comparer des hausses sur 1 h à des baisses sur 7 j n'aurait
 * aucun sens, et une période par colonne rendrait l'erreur facile.
 *
 * Un seul appel réseau alimente les quatre : c'est le même univers, trié quatre fois.
 */
export default async function RankingsPage() {
  const result = await getMoversUniverse(250, 'eur')

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Classements crypto</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Quatre palmarès à confronter : ce qui monte, ce qui baisse, ce qui s’échange le
          plus, et ce qui tourne le plus vite au regard de sa taille.
        </p>
      </header>

      {result.ok && result.data.length > 0 ? (
        <>
          <RankingBoard assets={result.data} />

          <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
            <h2 className="text-sm font-semibold text-ink">Comment lire ces classements</h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              Le périmètre est <strong className="text-ink">borné aux 250 plus grandes
              capitalisations</strong>, et ce n’est pas une limite technique : sur un jeton
              minuscule, un seul échange déplace le cours de dizaines de points. Un
              classement non borné ne remonterait que ce bruit.
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              La <strong className="text-ink">rotation</strong> rapporte le volume de 24 heures
              à la capitalisation. Une rotation élevée signale un actif très échangé au
              regard de sa taille — ce qui décrit une activité, jamais une direction.
            </p>
            <p className="text-sm text-ink-muted">
              Pour le détail des cours :{' '}
              <Link href="/crypto" className="text-brand hover:underline">
                cotations crypto
              </Link>{' '}
              ·{' '}
              <Link href="/crypto/mouvements" className="text-brand hover:underline">
                données de marché
              </Link>
            </p>
          </section>

          <SourceNote
            label={result.source.label}
            href={result.source.attributionUrl}
            updatedAt={result.data[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title="Classements momentanément indisponibles"
          description={result.ok ? null : result.reason}
          source={result.source?.label ?? null}
          tone={result.ok ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}
