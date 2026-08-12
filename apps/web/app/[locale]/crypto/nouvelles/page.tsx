import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CACHE_TTL_SECONDS, getNewListings } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { NewListingsTable } from '@/components/market/NewListingsTable'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Nouvelles cryptomonnaies',
  description:
    'Les cryptomonnaies référencées le plus récemment : cours, capitalisation, volume et date du premier relevé de prix connu.',
  alternates: { canonical: '/crypto/nouvelles' },
}

/**
 * Nouvelles cryptomonnaies.
 *
 * Page bâtie sur une source DIFFÉRENTE du reste du site, et c'est le point qui mérite
 * d'être compris : notre fournisseur crypto principal réserve sa liste des actifs
 * récemment référencés à son offre payante, et aucun champ de son API gratuite ne
 * permet de la reconstituer. Coinpaprika, lui, publie la date du premier relevé de
 * prix — une mesure, pas une déduction.
 *
 * La contrepartie est assumée et visible : les lignes ne mènent à aucune fiche, parce
 * que les identifiants des deux sources ne se correspondent pas (voir
 * `NewListingsTable`). Un lien fabriqué serait plus agréable et faux une fois sur deux.
 *
 * Disposition volontairement différente de la référence, qui empile un grand tableau
 * sous une barre d'onglets : ici, un avertissement de risque D'ABORD — sur une page
 * qui liste par construction les actifs les moins éprouvés du marché, le contexte doit
 * précéder les chiffres, pas les suivre en note de bas de page.
 */
export default async function NewListingsPage() {
  const listings = await getNewListings(100)

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Nouvelles cryptomonnaies</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Les cent actifs dont la source a relevé un cours pour la première fois le plus
          récemment, du plus récent au plus ancien.
        </p>
      </header>

      <aside className="border-l-2 border-accent bg-surface-muted p-4 text-sm leading-relaxed text-ink-muted">
        <p>
          <strong className="text-ink">Ce que « suivi depuis » signifie.</strong> C’est la
          date du premier cours relevé par la source, et non la date de création du jeton
          ni celle de son premier échange ailleurs. Les deux coïncident souvent, jamais
          par construction.
        </p>
        <p className="mt-2">
          Un actif récemment référencé a, par définition, peu d’historique, souvent peu de
          liquidité, et une capitalisation qui peut se réordonner en quelques heures.
          ZENKUU publie ces chiffres, ne les recommande pas, et ne propose aucune fonction
          d’achat ou de vente.
        </p>
      </aside>

      {listings.ok && listings.data.length > 0 ? (
        <>
          <NewListingsTable listings={listings.data} />
          <SourceNote
            label={`${listings.source.label} · montants en USD`}
            href={listings.source.attributionUrl}
            updatedAt={listings.data[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title="Cotations récentes indisponibles"
          description={listings.ok ? 'La source n’a renvoyé aucune cotation exploitable.' : listings.reason}
          source={listings.source?.label ?? null}
          tone="warning"
        />
      )}

      <p className="text-sm text-ink-muted">
        Pour le marché établi, voir les{' '}
        <Link href="/crypto/all-coins" className="text-brand hover:underline">
          classements complets
        </Link>{' '}
        ou les{' '}
        <Link href="/crypto/highlights" className="text-brand hover:underline">
          points marquants du jour
        </Link>
        .
      </p>
    </div>
  )
}
