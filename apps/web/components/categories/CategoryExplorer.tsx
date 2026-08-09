'use client'

import { LayoutGrid, List, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { MarketCategory } from '@zenith/data'
import { ChangeBadge, EmptyState, formatCurrency } from '@zenith/ui'

import { CategoryCard } from '@/components/categories/CategoryCard'

type SortKey = 'marketCap' | 'volume' | 'change' | 'name'
type Direction = 'asc' | 'desc'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'marketCap', label: 'Capitalisation' },
  { key: 'volume', label: 'Volume 24 h' },
  { key: 'change', label: 'Variation 24 h' },
  { key: 'name', label: 'Nom' },
]

/**
 * Pas de pagination, mais un affichage PROGRESSIF.
 *
 * La source publie près de 750 secteurs. Une pagination par pages numérotées
 * obligerait à quitter la page pour parcourir la suite, et casserait la recherche —
 * qui doit porter sur l'ensemble, pas sur la page courante. Un « voir plus » qui
 * allonge la liste conserve la position de lecture et laisse le filtre s'appliquer à
 * la totalité.
 *
 * Le tri et le filtrage portent donc TOUJOURS sur les 750 lignes ; seul le nombre
 * d'éléments rendus est limité. C'est possible ici parce que tout est déjà en
 * mémoire — contrairement aux classements d'actifs, paginés côté serveur.
 */
const PAGE_SIZE = 50

export function CategoryExplorer({ categories }: { categories: MarketCategory[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [direction, setDirection] = useState<Direction>('desc')
  const [view, setView] = useState<'grid' | 'table'>('table')
  const [shown, setShown] = useState(PAGE_SIZE)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? categories.filter(
          (category) =>
            category.name.toLowerCase().includes(needle) ||
            // La recherche couvre aussi la définition du secteur : « prêt » doit
            // trouver « Lending/Borrowing » même si le mot n'est pas dans le nom.
            category.description?.toLowerCase().includes(needle),
        )
      : categories

    // Copie avant tri : `sort` mute en place, et muter la prop réordonnerait la
    // liste du parent à chaque rendu.
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name, 'fr')
        case 'change':
          // Les valeurs absentes partent TOUJOURS en fin de liste, quel que soit le
          // sens du tri : une donnée manquante n'est ni la plus forte hausse ni la
          // plus forte baisse, et la faire remonter en tête croissant serait faux.
          return compare(a.marketCapChange24h, b.marketCapChange24h)
        case 'volume':
          return compare(a.volume24h, b.volume24h)
        default:
          return compare(a.marketCap, b.marketCap)
      }
    })

    return direction === 'desc' ? sorted : reverseKeepingMissingLast(sorted, sort)
  }, [categories, query, sort, direction])

  const rendered = visible.slice(0, shown)
  const remaining = visible.length - rendered.length

  function applySort(key: SortKey) {
    if (key === sort) {
      setDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
    } else {
      setSort(key)
      // Un nouveau critère repart en décroissant — l'ordre attendu d'un classement —
      // sauf le nom, qui se lit naturellement de A à Z.
      setDirection(key === 'name' ? 'asc' : 'desc')
    }
    setShown(PAGE_SIZE)
  }

  return (
    <section className="space-y-5" aria-labelledby="explorer-secteurs">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="explorer-secteurs" className="display-md text-ink">
            Tous les secteurs
          </h2>
          {/* Le décompte est explicité : la source publie environ 750 entrées, mais
              la moitié sont des rubriques de taxonomie sans aucun actif valorisé —
              ni capitalisation, ni volume, ni composant (vérifié sur la réponse
              brute). Les afficher alignerait des centaines de lignes de tirets. Dire
              pourquoi le nombre est ce qu'il est évite de le prendre pour un
              plafond arbitraire. */}
          <p className="mt-1 text-sm text-ink-muted">
            {categories.length} secteurs cotés. La source en publie davantage, mais les
            autres ne portent aucun actif valorisé.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setShown(PAGE_SIZE)
            }}
            placeholder="Filtrer les secteurs…"
            aria-label="Filtrer les secteurs par nom ou par définition"
            className="w-full rounded-card border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Trier les secteurs"
        >
          {SORTS.map((entry) => (
            <SortChip
              key={entry.key}
              active={sort === entry.key}
              direction={sort === entry.key ? direction : undefined}
              onClick={() => applySort(entry.key)}
              label={entry.label}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Mode d’affichage">
          <ViewButton
            active={view === 'table'}
            onClick={() => setView('table')}
            label="Affichage en tableau"
            icon={List}
          />
          <ViewButton
            active={view === 'grid'}
            onClick={() => setView('grid')}
            label="Affichage en grille"
            icon={LayoutGrid}
          />
        </div>
      </div>

      <p className="text-xs text-ink-muted" aria-live="polite">
        {visible.length} secteur{visible.length > 1 ? 's' : ''}
        {query.trim() ? ` correspondant à « ${query.trim()} »` : ''}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="Aucun secteur ne correspond"
          description="Essayez un autre terme, ou effacez le filtre."
          compact
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rendered.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <CategoryTable categories={rendered} startRank={1} />
      )}

      {remaining > 0 ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShown((current) => current + PAGE_SIZE)}
            className="rounded-card border border-border-subtle bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand-strong"
          >
            Afficher {Math.min(PAGE_SIZE, remaining)} secteurs de plus
            <span className="ml-1.5 text-ink-muted">({remaining} restants)</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}

/** Tri numérique décroissant, valeurs absentes rejetées en fin de liste. */
function compare(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return b - a
}

/**
 * Inversion du sens qui GARDE les valeurs absentes en dernier.
 *
 * Un simple `.reverse()` les remonterait en tête du tri croissant, où elles
 * passeraient pour les plus petites valeurs — alors qu'elles ne sont pas des valeurs.
 */
function reverseKeepingMissingLast(sorted: MarketCategory[], sort: SortKey): MarketCategory[] {
  if (sort === 'name') return [...sorted].reverse()

  const field: keyof MarketCategory =
    sort === 'change' ? 'marketCapChange24h' : sort === 'volume' ? 'volume24h' : 'marketCap'

  const rated = sorted.filter((category) => category[field] !== undefined)
  const missing = sorted.filter((category) => category[field] === undefined)
  return [...rated.reverse(), ...missing]
}

function CategoryTable({
  categories,
  startRank,
}: {
  categories: MarketCategory[]
  startRank: number
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <caption className="sr-only">Secteurs de marché</caption>
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
            <th scope="col" className="px-3 py-2.5 font-medium">#</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Secteur</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
              Principaux actifs
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Variation 24 h</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
              Volume 24 h
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Capitalisation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {categories.map((category, index) => (
            <tr key={category.id} className="transition-colors hover:bg-surface-muted/60">
              <td className="tabular px-3 py-2.5 text-xs text-ink-muted">{startRank + index}</td>
              <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                {category.name}
              </th>
              <td className="hidden px-3 py-2.5 sm:table-cell">
                <TopAssets category={category} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <ChangeBadge value={category.marketCapChange24h} size="sm" />
              </td>
              <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                {formatCurrency(category.volume24h, 'USD', { compact: true }) ?? '—'}
              </td>
              <td className="tabular px-3 py-2.5 text-right text-ink">
                {formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Logos des trois principaux actifs, CLIQUABLES vers leur fiche.
 *
 * Ils étaient auparavant purement décoratifs, faute d'identifiants. La source les
 * publie dans la même réponse : les rendre cliquables transforme un ornement en
 * point d'entrée, sans coût. Le nom accompagne chaque lien en lecture d'écran seule —
 * une image sans texte alternatif ne serait pas atteignable au clavier.
 */
export function TopAssets({ category }: { category: MarketCategory }) {
  const logos = category.topAssets ?? []
  const ids = category.topAssetIds ?? []
  if (logos.length === 0) return <span className="text-xs text-ink-muted">—</span>

  return (
    <span className="flex items-center gap-1">
      {logos.map((src, index) => {
        const id = ids[index]

        const image = (
          // eslint-disable-next-line @next/next/no-img-element -- logos distants
          <img
            src={src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={20}
            height={20}
            className="h-5 w-5 rounded-full border border-surface bg-surface-muted object-contain"
          />
        )

        // Sans identifiant, le logo reste une vignette : mieux vaut une image inerte
        // qu'un lien vers une page qui n'existe pas.
        return id ? (
          <Link
            key={`${category.id}-${id}`}
            href={`/crypto/${id}`}
            className="transition-opacity hover:opacity-75"
          >
            {image}
            <span className="sr-only">{id}</span>
          </Link>
        ) : (
          <span key={`${category.id}-${index}`}>{image}</span>
        )
      })}
    </span>
  )
}

function SortChip({
  active,
  direction,
  onClick,
  label,
}: {
  active: boolean
  direction?: Direction
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      {label}
      {active ? (
        <span aria-hidden="true" className="ml-1 text-[0.7em]">
          {direction === 'desc' ? '▼' : '▲'}
        </span>
      ) : null}
      {active ? (
        <span className="sr-only">
          , trié {direction === 'desc' ? 'du plus grand au plus petit' : 'du plus petit au plus grand'}
        </span>
      ) : null}
    </button>
  )
}

function ViewButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: typeof LayoutGrid
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`rounded-card border p-2 transition-colors ${
        active
          ? 'border-brand bg-brand-soft text-brand-strong'
          : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
