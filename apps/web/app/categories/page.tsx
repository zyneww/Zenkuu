import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getCategories } from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { CategoryExplorer } from '@/components/categories/CategoryExplorer'
import { SectorHighlights } from '@/components/categories/SectorHighlights'
import { fr } from '@/content/fr'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.pages.categories,
  description: fr.categories.subtitle,
  alternates: { canonical: '/categories' },
}

/**
 * Secteurs et narratifs de marché.
 *
 * Refonte : la page servait un tableau unique. Elle suit désormais l'ordre de
 * lecture d'une page de catégories de plateforme — repères éditoriaux d'abord
 * (secteurs en tête et en repli), puis exploration filtrable, en grille ou en
 * tableau selon ce que le lecteur cherche à faire.
 *
 * Ce qui est repris : la hiérarchie (synthèse → filtres → grille de tuiles) et la
 * présence d'une performance 24 h sur chaque tuile.
 * Ce qui est changé : pas de sous-navigation par blockchain ni de compteur d'actifs
 * par secteur — la source ne publie ni l'un ni l'autre, et les afficher supposerait
 * de les estimer (§5). La grille reste sur la palette et la typographie ZENITH.
 */
export default async function CategoriesPage() {
  const categories = await getCategories(40)

  if (!categories.ok || categories.data.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EmptyState
          title={fr.states.unavailableTitle}
          description={categories.ok ? null : categories.reason}
          source={categories.source?.label ?? null}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      <SectorHighlights categories={categories.data} />

      <CategoryExplorer categories={categories.data} />

      {/* La source ne publie ces agrégats qu'en dollars : on l'écrit plutôt que
          de convertir nous-mêmes vers l'euro (§5). */}
      <SourceNote
        label={`${categories.source.label} · montants en USD`}
        href={categories.source.attributionUrl}
      />
    </div>
  )
}

function PageHeader() {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.categories.title}</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{fr.categories.subtitle}</p>
    </header>
  )
}
