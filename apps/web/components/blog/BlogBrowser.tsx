'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@zenkuu/ui'

import { BlogCard } from '@/components/blog/BlogCard'
import { BLOG_CATEGORIES, type Article, type BlogCategory } from '@/content/blog'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Filtres et liste des articles.
 *
 * Catégories et recherche sont côté CLIENT, contrairement aux vues de `/crypto` qui
 * passent par l'URL. Le critère est le volume : un blog se compte en dizaines
 * d'articles, tous déjà présents dans le HTML, et un aller-retour serveur pour
 * filtrer dix cartes serait une latence sans contrepartie. Les classements de marché
 * se comptent en milliers, d'où leur tri serveur.
 *
 * La grille passe en LISTE COMPACTE au-delà des douze premiers résultats. Une grille
 * de cartes est faite pour parcourir, une liste pour balayer : au-delà de quelques
 * écrans, les cartes forcent à défiler longtemps pour peu de titres.
 *
 * Le seuil est passé de six à douze avec le passage à trois colonnes : six cartes
 * remplissaient deux rangées sur deux colonnes, elles n'en remplissent plus que deux
 * sur trois. Douze rend à la grille les quatre rangées qu'elle avait — le seuil
 * compte des RANGÉES, pas des articles.
 */
const GRID_SIZE = 12

export function BlogBrowser({ articles }: { articles: Article[] }) {
  const t = usePhrase()
  const [category, setCategory] = useState<BlogCategory | 'toutes'>('toutes')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return articles.filter((article) => {
      if (category !== 'toutes' && article.category !== category) return false
      if (!needle) return true

      // La recherche porte sur le titre ET le chapô : un lecteur cherche souvent un
      // mot du sujet plutôt qu'un mot du titre.
      return `${article.title} ${article.summary}`.toLowerCase().includes(needle)
    })
  }, [articles, category, query])

  const grid = visible.slice(0, GRID_SIZE)
  const archive = visible.slice(GRID_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Puces INTÉGRÉES au flux plutôt qu'une barre collante : une barre qui suit
            le défilement mange de la hauteur sur mobile, et le lecteur d'un article
            n'a pas besoin des filtres sous les yeux en permanence. */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('Filtrer par catégorie')}>
          <CategoryChip
            active={category === 'toutes'}
            onClick={() => setCategory('toutes')}
            label="Toutes"
          />
          {BLOG_CATEGORIES.map((entry) => (
            <CategoryChip
              key={entry.id}
              active={category === entry.id}
              onClick={() => setCategory(entry.id)}
              label={entry.label}
              title={entry.description}
            />
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Rechercher un article…')}
            aria-label={t('Rechercher parmi les articles du blog')}
            className="w-full rounded-card border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={t('Aucun article ne correspond')}
          description={t('Essayez un autre terme, ou revenez à toutes les catégories.')}
          compact
        />
      ) : (
        <>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {visible.length} article{visible.length > 1 ? 's' : ''}
          </p>

          {/* Trois colonnes séparées par des FILETS et non des cartes détachées — la
              grammaire de la référence, et celle du design system : la structure se
              trace, elle ne s'empile pas. */}
          <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((article) => (
              <BlogCard key={article.slug} article={article} />
            ))}
          </div>

          {archive.length > 0 ? (
            <section className="space-y-4 pt-4" aria-labelledby="archives-titre">
              <h2 id="archives-titre" className="display-sm text-ink">
                Archives
              </h2>
              <div className="space-y-4">
                {archive.map((article) => (
                  <BlogCard key={article.slug} article={article} compact />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean
  onClick: () => void
  label: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
