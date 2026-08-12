import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import {
  CACHE_TTL_SECONDS,
  getCategories,
  getCategoryAssets,
  type MarketCategory,
} from '@zenkuu/data'
import { ChangeBadge, EmptyState, SourceNote, formatCurrency } from '@zenkuu/ui'

import { MarketTable } from '@/components/market/MarketTable'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Fiche d'un secteur — le CONTENU derrière une ligne du classement sectoriel.
 *
 * Sans cette page, un secteur est un nom et un pourcentage : le lecteur voit que
 * « IA » progresse de 6 % sans pouvoir savoir de quels jetons on parle. La rendre
 * accessible depuis chaque ligne, chaque carte et chaque mise en avant transforme un
 * tableau de bord en objet consultable.
 *
 * DEUX SOURCES POUR UNE PAGE, et l'ordre compte : la liste des secteurs porte les
 * agrégats (capitalisation, volume, définition), le classement filtré porte les
 * composants. La première est déjà en cache — c'est le même appel unique qui alimente
 * `/categories` —, si bien que cette page n'en coûte qu'un seul de plus.
 */
async function loadCategory(id: string): Promise<MarketCategory | null> {
  const categories = await getCategories()
  if (!categories.ok) return null
  return categories.data.find((category) => category.id === id) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const category = await loadCategory(id)

  if (!category) return { title: 'Secteur introuvable' }

  return {
    title: category.name,
    description:
      category.description?.slice(0, 155) ??
      `Les cryptomonnaies du secteur ${category.name} : capitalisation, volume et variations, classées par capitalisation.`,
    alternates: { canonical: `/categories/${category.id}` },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Séquentiel et non parallèle, contrairement au reste du site : si le secteur
  // n'existe pas, la page part en 404 et le second appel n'aurait servi à rien. Le
  // premier est de toute façon servi par le cache dans l'immense majorité des cas.
  const category = await loadCategory(id)
  if (!category) notFound()

  const assets = await getCategoryAssets(category.id, 'eur', 50, 1)

  return (
    <div className="space-y-10">
      <nav aria-label="Fil d’Ariane" className="text-sm text-ink-muted">
        <Link href="/categories" className="hover:text-brand-strong hover:underline">
          Secteurs
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-ink">{category.name}</span>
      </nav>

      <header className="space-y-5 border-b border-border-subtle pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="display-xl text-ink">{category.name}</h1>
          <ChangeBadge value={category.marketCapChange24h} filled />
        </div>

        {category.description ? (
          <p className="max-w-3xl text-base leading-relaxed text-ink-muted">
            {category.description}
          </p>
        ) : null}

        <dl className="flex flex-wrap gap-x-12 gap-y-4">
          <Stat
            label="Capitalisation du secteur"
            value={formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
          />
          <Stat
            label="Volume 24 h"
            value={formatCurrency(category.volume24h, 'USD', { compact: true }) ?? '—'}
          />
          <Stat
            label="Actifs listés ici"
            value={assets.ok ? String(assets.data.length) : '—'}
          />
        </dl>
      </header>

      <section className="space-y-4" aria-labelledby="composants-titre">
        <div className="space-y-1">
          <h2 id="composants-titre" className="display-md text-ink">
            Les actifs de ce secteur
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            Les cinquante plus grandes capitalisations rattachées à ce secteur. Le
            rattachement est décidé par la source, pas par ZENKUU : un même actif relève
            souvent de plusieurs secteurs à la fois. La colonne <strong className="text-ink">#</strong>{' '}
            reprend le rang MONDIAL par capitalisation — d’où ses sauts : elle situe
            chaque actif dans l’ensemble du marché, pas dans ce seul secteur.
          </p>
        </div>

        {assets.ok && assets.data.length > 0 ? (
          <>
            <MarketTable
              assets={assets.data}
              assetClass="crypto"
              page={1}
              perPage={assets.data.length}
              sortBy="marketCap"
              direction="desc"
              // Le tri serveur porterait sur l'ensemble du classement, pas sur le
              // sous-ensemble affiché : proposer des en-têtes cliquables laisserait
              // croire à un tri du secteur alors qu'il rechargerait autre chose.
              sortable={false}
              paginated={false}
              basePath={`/categories/${category.id}`}
              chartPosition="end"
            />
            <SourceNote
              label={assets.source.label}
              href={assets.source.attributionUrl}
              updatedAt={assets.data[0]?.lastUpdated}
            />
          </>
        ) : (
          <EmptyState
            title="Composition du secteur indisponible"
            description={
              assets.ok
                ? 'La source ne rattache aucun actif coté à ce secteur pour le moment.'
                : assets.reason
            }
            source={assets.source?.label ?? null}
            tone={assets.ok ? 'neutral' : 'warning'}
          />
        )}
      </section>

      <p className="text-sm text-ink-muted">
        Les capitalisations sectorielles ne s’additionnent pas — un actif appartenant à
        plusieurs secteurs y serait compté plusieurs fois. Voir la{' '}
        <Link href="/methodologie" className="text-brand hover:underline">
          méthodologie
        </Link>
        .
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="tabular mt-1 text-2xl font-semibold text-ink">{value}</dd>
    </div>
  )
}
