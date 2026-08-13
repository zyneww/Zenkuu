import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getTrendingPools, type AssetClass } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { DexPoolTable } from '@/components/market/DexPoolTable'
import { MarketPageView } from '@/components/market/MarketPageView'
import { getContent } from '@/lib/content'
import { assetClassFromSegment, marketHref } from '@/lib/asset-routes'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
    title: 'Marchés avancés',
    description:
      `Classement filtrable des six classes d’actifs suivies par ${fr.site.name}, ` +
      'et pools de liquidité on-chain les plus actifs.',
    alternates: { canonical: '/marches' },
  }
}

/**
 * Classe demandée par l'URL, en lecture DÉFENSIVE.
 *
 * Le paramètre est saisissable à la main et finit dans une clé de cache côté données.
 * Une valeur inconnue retombe donc sur la crypto plutôt que d'ouvrir une requête sur
 * une classe qui n'existe pas.
 */
function readAssetClass(raw: string | string[] | undefined): AssetClass {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 'crypto'
  return assetClassFromSegment(value) ?? 'crypto'
}

/**
 * MARCHÉS AVANCÉS — les six classes sur une seule page, plus la chaîne.
 *
 * ── EN QUOI ELLE DIFFÈRE DES SIX PAGES DE CLASSEMENT ─────────────────────────
 *
 * `/crypto`, `/actions`, `/etf`… existent déjà et restent : chacune est une URL
 * indexable, avec son titre, sa description et son contenu propre. Elles répondent à
 * « montre-moi les cryptomonnaies ».
 *
 * Celle-ci répond à autre chose — « fais-moi voir le marché, et laisse-moi changer
 * d'angle sans recharger mon contexte ». D'où les onglets qui restent SUR PLACE
 * (`?classe=`) plutôt que de renvoyer vers les pages dédiées : le lecteur qui compare
 * les six classes ne veut pas six pages, il veut six vues.
 *
 * ── ET POURQUOI ELLE SEULE PORTE LES POOLS ───────────────────────────────────
 *
 * Le bandeau on-chain est ce qui la rend « avancée ». Il montre où la liquidité se
 * déplace RÉELLEMENT, y compris sur des chaînes secondaires qu'aucun classement
 * centralisé ne voit — un jeton peut faire des millions de volume quotidien sans
 * figurer sur une seule place de cotation.
 *
 * Il ne s'affiche que sur l'onglet crypto, et c'est une contrainte de la matière :
 * une action Total n'a pas de pool de liquidité.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const assetClass = readAssetClass(params['classe'])
  const fr = await getContent()

  return (
    <MarketPageView
      assetClass={assetClass}
      title="Marchés avancés"
      subtitle={
        'Les six classes d’actifs suivies, triables et paginées sur une seule page. ' +
        'Lecture seule : aucun ordre ne part d’ici.'
      }
      searchParams={params}
      basePath={assetClass === 'crypto' ? '/marches' : `/marches?classe=${marketHref(assetClass).slice(1)}`}
      classHref={(target) =>
        target === 'crypto' ? '/marches' : `/marches?classe=${marketHref(target).slice(1)}`
      }
    >
      {assetClass === 'crypto' ? <OnChainBand /> : null}

      {/* Renvoi vers la page dédiée : cette vue est une TRAVERSÉE des classes, pas un
          remplacement. La page de classement garde ce que celle-ci ne peut pas offrir
          — son propre titre indexable, ses métadonnées, son contenu éditorial. */}
      <p className="text-xs text-ink-muted">
        Vue transversale.{' '}
        <a
          href={marketHref(assetClass)}
          className="text-brand transition-colors hover:text-brand-strong"
        >
          Page dédiée aux {fr.assetClass[assetClass].toLowerCase()}
        </a>{' '}
        pour la fiche complète de cette classe.
      </p>
    </MarketPageView>
  )
}

/**
 * Bandeau des pools les plus actifs, toutes chaînes confondues.
 *
 * Composant SÉPARÉ et non un bloc dans la page : il fait son propre appel réseau, et
 * l'isoler permet à Next.js de le rendre en flux — la page n'attend pas la réponse
 * on-chain pour afficher son tableau de cotations. Le fournisseur est plafonné à
 * vingt-quatre appels par minute, il est donc le plus susceptible d'être lent.
 */
async function OnChainBand() {
  const pools = await getTrendingPools()

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Pools de liquidité les plus actifs</h2>
        <p className="text-xs text-ink-muted">
          Toutes chaînes · réserve et transactions relevées sur la chaîne, pas sur une place
        </p>
      </div>

      {pools.ok && pools.data.length > 0 ? (
        <>
          <DexPoolTable pools={pools.data.slice(0, 10)} showNetwork />
          <SourceNote label={pools.source.label} href={pools.source.attributionUrl} />
        </>
      ) : (
        <EmptyState
          title="Données on-chain indisponibles"
          description={pools.ok ? null : pools.reason}
          source={pools.source?.label ?? null}
          compact
        />
      )}
    </section>
  )
}
