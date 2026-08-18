import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CACHE_TTL_SECONDS, getMoversUniverse, getNewListings } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { NewListingsTable } from '@/components/market/NewListingsTable'
import { buildListingIndex } from '@/lib/listing-match'
import { getPhrase, getSeo } from '@/lib/content'

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
    title: t('Nouvelles cryptomonnaies'),
    description: seo(
      '/nouvelles-cotations',
      'Les cryptomonnaies référencées le plus récemment : cours, capitalisation, volume et date du premier relevé de prix connu.',
    ),
    alternates: { canonical: '/nouvelles-cotations' },
  }
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
 * La contrepartie était assumée et visible : les lignes ne menaient à aucune fiche,
 * parce que les identifiants des deux sources ne se correspondent pas. Elle est
 * DEPUIS LEVÉE pour les actifs qu'on sait reconnaître — l'univers des 250 premières
 * capitalisations, déjà en cache pour l'accueil et le convertisseur, sert d'index de
 * rapprochement par symbole ET nom (voir `lib/listing-match.ts`). Les autres restent
 * inertes, et cette inertie est INFORMATIVE : elle dit que l'actif n'est pas dans les
 * 250 premières, ce qui est exactement ce qu'un lecteur de cette page veut savoir.
 *
 * Aucun appel réseau supplémentaire : `getMoversUniverse(250)` est partagé avec trois
 * autres pages.
 *
 * Disposition volontairement différente de la référence, qui empile un grand tableau
 * sous une barre d'onglets : ici, un avertissement de risque D'ABORD — sur une page
 * qui liste par construction les actifs les moins éprouvés du marché, le contexte doit
 * précéder les chiffres, pas les suivre en note de bas de page.
 */
export default async function NewListingsPage() {
  const t = await getPhrase()
  const [listings, universe] = await Promise.all([
    /*
     * 300 et non 100 — « remonter plus loin en arrière ».
     *
     * Coinpaprika ne pagine pas cet endpoint : il rend la liste, on la tronque. Le
     * coût réseau est donc IDENTIQUE à 100, seule la clé de cache change — le même
     * raisonnement que pour `getNews`. La profondeur supplémentaire recule d'environ
     * un mois l'horizon des cotations visibles.
     */
    getNewListings(300),
    getMoversUniverse(250, 'eur'),
  ])

  const index = buildListingIndex(universe.ok ? universe.data : [])

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t("Nouvelles cryptomonnaies")}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t("Les trois cents actifs dont la source a relevé un cours pour la première fois le plus récemment, du plus récent au plus ancien. Ceux que nous suivons par ailleurs portent leur logo et mènent à leur fiche.")}</p>
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
          <NewListingsTable listings={listings.data} index={index} />
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
        <Link href="/classements" className="text-brand hover:underline">
          classements complets
        </Link>{' '}
        ou les{' '}
        <Link href="/points-marquants" className="text-brand hover:underline">
          points marquants du jour
        </Link>
        .
      </p>
    </div>
  )
}
