import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CACHE_TTL_SECONDS, getCategories } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { SectorHeatmap } from '@/components/tools/SectorHeatmap'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Heatmap sectorielle',
  description:
    'Les secteurs du marché crypto en une figure : la surface porte la capitalisation, la couleur porte la variation sur 24 heures.',
  alternates: { canonical: '/heatmap' },
}

/**
 * Heatmap sectorielle.
 *
 * AUCUN APPEL SUPPLÉMENTAIRE : la liste des secteurs est déjà chargée et mise en cache
 * pour `/categories`, et la source la livre entière en une seule réponse. Cette page
 * est une seconde LECTURE de la même donnée — celle qui répond à « où le marché
 * bouge-t-il ? » plutôt qu'à « combien pèse ce secteur ? ».
 *
 * Le format s'écarte de la référence du secteur, qui découpe une carte thermique par
 * ACTIF. Le nôtre découpe par SECTEUR, parce que c'est là que notre donnée est bonne :
 * la source publie capitalisation et variation par catégorie sans appel dédié, alors
 * qu'une carte par actif exigerait de recharger le classement complet et n'apporterait
 * rien que le tableau ne dise déjà.
 */
/** Nombres de secteurs proposés. Borné : la valeur vient de l'URL. */
const COUNTS = [20, 40, 80]

export default async function HeatmapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = Number(Array.isArray(params['secteurs']) ? params['secteurs'][0] : params['secteurs'])
  const count = COUNTS.includes(raw) ? raw : 40

  const categories = await getCategories()

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Heatmap sectorielle</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Les secteurs en un coup d’œil : la surface porte la capitalisation, la couleur
          porte la variation sur 24 heures. Cliquez un rectangle pour ouvrir le secteur.
        </p>
      </header>

      {categories.ok && categories.data.length > 0 ? (
        <>
          <SectorHeatmap categories={categories.data} count={count} />
          <SourceNote
            label={`${categories.source.label} · montants en USD`}
            href={categories.source.attributionUrl}
          />
        </>
      ) : (
        <EmptyState
          title="Secteurs indisponibles"
          description={categories.ok ? null : categories.reason}
          tone="warning"
        />
      )}

      <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
        <h2 className="text-sm font-semibold text-ink">Comment lire cette carte</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Deux variables sur une seule figure. Un grand rectangle rouge et un petit
          rectangle rouge affichent la même variation dans un tableau — ici, le premier
          concerne une part du marché que le second ne pèse pas. C’est ce rapprochement
          qu’un tableau demande de faire mentalement, ligne à ligne.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          Les surfaces ne partagent pas un tout : un actif appartient à plusieurs
          secteurs, si bien que leur somme dépasse la capitalisation mondiale. La carte
          compare les secteurs entre eux, elle ne les additionne pas. Le détail de chacun
          est sur sa page — voir{' '}
          <Link href="/categories" className="text-brand hover:underline">
            tous les secteurs
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
