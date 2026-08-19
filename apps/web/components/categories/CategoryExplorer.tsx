'use client'

import { LayoutGrid, List, Search } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useMemo, useState } from 'react'

import type { MarketCategory } from '@zenkuu/data'
import { ChangeBadge, EmptyState, formatCurrency } from '@zenkuu/ui'

import { CategoryCard } from '@/components/categories/CategoryCard'
import { Pagination } from '@/components/ui/Pagination'
import { SortableHeader } from '@/components/ui/SortableTable'
import { usePhrase } from '@/components/locale/ContentProvider'

type SortKey = 'marketCap' | 'volume' | 'change' | 'name'
type Direction = 'asc' | 'desc'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'marketCap', label: 'Capitalisation' },
  { key: 'volume', label: 'Volume 24 h' },
  { key: 'change', label: 'Variation 24 h' },
  { key: 'name', label: 'Nom' },
]

/**
 * Pagination EN MÉMOIRE, et c'est ce qui la distingue de celle des classements.
 *
 * La source publie près de 750 secteurs, et les envoie TOUS en une fois. Changer de
 * page ne coûte donc aucun appel réseau, et surtout : le tri et la recherche portent
 * sur les 750 lignes, pas sur la cinquantaine affichée. C'était l'objection classique
 * à la pagination — « elle casse la recherche » — et elle ne tient pas ici.
 *
 * Les classements d'actifs, eux, sont paginés PAR LA SOURCE : chaque page y est un
 * appel, et leur barre ne connaît pas le total. Deux mécaniques, une seule barre.
 *
 * ⚠️ Ce nombre n'est plus qu'un DÉFAUT. Le lecteur le change dans la barre, et la
 * valeur choisie doit rester l'une de celles qu'elle propose — sinon le sélecteur
 * s'ouvrirait sur un choix vide.
 */
const PAGE_SIZE = 50

export function CategoryExplorer({ categories }: { categories: MarketCategory[] }) {
  const t = usePhrase()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [direction, setDirection] = useState<Direction>('desc')
  const [view, setView] = useState<'grid' | 'table'>('table')

  /*
   * PAGINÉ PLUTÔT QU'ACCUMULÉ.
   *
   * Un bouton « Afficher 50 secteurs de plus » ne sait qu'AVANCER : arrivé au
   * quatrième clic, on a deux cents lignes à l'écran, aucun moyen de revenir aux
   * cinquante précédentes, et le numéro de rang n'a plus de repère. Il ne dit pas non
   * plus où l'on en est — seulement combien il reste.
   *
   * Une page, elle, est un lieu : on y revient, on la quitte, et le compteur de la
   * barre répond à « où suis-je » avant qu'on se le demande.
   */
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(PAGE_SIZE)

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

  /* Le filtre peut rendre la page courante inexistante : on la borne au rendu plutôt
     qu'en effet de bord, ce qui évite un rendu intermédiaire vide. */
  const pageCount = Math.max(1, Math.ceil(visible.length / perPage))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * perPage
  const rendered = visible.slice(start, start + perPage)

  function applySort(key: SortKey) {
    if (key === sort) {
      setDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
    } else {
      setSort(key)
      // Un nouveau critère repart en décroissant — l'ordre attendu d'un classement —
      // sauf le nom, qui se lit naturellement de A à Z.
      setDirection(key === 'name' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  return (
    <section className="space-y-5" aria-labelledby="explorer-secteurs">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="explorer-secteurs" className="display-md text-ink">{t('Tous les secteurs')}</h2>
          {/* Le décompte est explicité : la source publie environ 750 entrées, mais
              la moitié sont des rubriques de taxonomie sans aucun actif valorisé —
              ni capitalisation, ni volume, ni composant (vérifié sur la réponse
              brute). Les afficher alignerait des centaines de lignes de tirets. Dire
              pourquoi le nombre est ce qu'il est évite de le prendre pour un
              plafond arbitraire. */}
          <p className="mt-1 text-sm text-ink-muted">
            {t(
              '{n} secteurs cotés. La source en publie davantage, mais les autres ne portent aucun actif valorisé.',
            ).replace('{n}', String(categories.length))}
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
              setPage(1)
            }}
            placeholder={t('Filtrer les secteurs…')}
            aria-label={t('Filtrer les secteurs par nom ou par définition')}
            className="w-full rounded-card border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t('Trier les secteurs')}
        >
          {SORTS.map((entry) => (
            <SortChip
              key={entry.key}
              active={sort === entry.key}
              direction={sort === entry.key ? direction : undefined}
              onClick={() => applySort(entry.key)}
              label={t(entry.label)}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1" role="group" aria-label={t('Mode d’affichage')}>
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

      {/* Ne subsiste que pour NOMMER le filtre : le décompte nu vit désormais dans le
          compteur de la barre de pagination, et l'écrire deux fois ferait douter qu'il
          s'agisse du même nombre. */}
      {query.trim() ? (
        <p className="text-xs text-ink-muted" aria-live="polite">
          {visible.length} secteur{visible.length > 1 ? 's' : ''} correspondant à «{' '}
          {query.trim()} »
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={t('Aucun secteur ne correspond')}
          description={t('Essayez un autre terme, ou effacez le filtre.')}
          compact
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rendered.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        /* Le rang REPART DU BON NUMÉRO à chaque page : en page 3 sur cinquante lignes,
           la première ligne est la 101ᵉ du classement, pas la première. Une numérotation
           qui recommence à 1 sur chaque page annulerait tout l'intérêt du rang. */
        <CategoryTable
          categories={rendered}
          startRank={start + 1}
          sort={sort}
          direction={direction}
          onSort={applySort}
        />
      )}

      {visible.length > 0 ? (
        <Pagination
          page={currentPage}
          perPage={perPage}
          total={visible.length}
          unit="secteur"
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size)
            setPage(1)
          }}
        />
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
  /*
   * LES EN-TÊTES COMMANDENT LE MÊME TRI QUE LA RANGÉE DE BOUTONS.
   *
   * Le tri existait déjà, complet et bidirectionnel, mais il se pilotait UNIQUEMENT
   * depuis une rangée de pastilles posée au-dessus du tableau. Or c'est sur l'en-tête
   * de colonne qu'on clique d'instinct — c'est le geste de tous les tableaux, et la
   * demande le disait explicitement.
   *
   * Les deux commandes partagent `applySort` et lisent le même état : elles ne peuvent
   * donc pas se contredire, et la pastille se met à jour quand on trie par l'en-tête.
   * C'était la seule façon d'ajouter la seconde entrée sans créer deux vérités.
   */
  sort,
  direction,
  onSort,
}: {
  categories: MarketCategory[]
  startRank: number
  sort: SortKey
  direction: Direction
  onSort: (key: SortKey) => void
}) {
  const t = usePhrase()
  /* L'état du tri est porté ici par DEUX variables — clé et sens — là où le composant
     partagé n'en attend qu'une. On les assemble plutôt que de refondre l'explorateur :
     sa logique de tri gère des cas que le mécanisme générique ne connaît pas, comme le
     nom qui repart en croissant quand tous les autres repartent en décroissant. */
  const sortState = { key: sort, direction }
  return (
    <div className="overflow-x-auto rounded-card bg-surface">
      {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. */}
      <table className="w-full border-collapse text-sm sm:min-w-[680px]">
        <caption className="sr-only">{t('Secteurs de marché')}</caption>
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">#</th>
            <SortableHeader
              label="Secteur"
              sortKey="name"
              align="left"
              sort={sortState}
              onToggle={onSort}
            />
            {/* « Principaux actifs » n'est PAS triable, et ne peut pas l'être : la
                cellule liste plusieurs jetons, dont l'ordre vient de la source. Trier
                dessus reviendrait à classer sur le nom du premier de la liste, ce qui
                n'est le critère de personne. */}
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
              {t('Principaux actifs')}
            </th>
            <SortableHeader
              label={t('Variation 24 h')}
              sortKey="change"
              sort={sortState}
              onToggle={onSort}
            />
            <SortableHeader
              label="Volume 24 h"
              sortKey="volume"
              className="hidden md:table-cell"
              sort={sortState}
              onToggle={onSort}
            />
            <SortableHeader
              label={t('Capitalisation')}
              sortKey="marketCap"
              sort={sortState}
              onToggle={onSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {categories.map((category, index) => (
            <tr key={category.id} className="transition-colors hover:bg-surface-muted/60">
              <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                {startRank + index}
              </td>
              <th scope="row" className="px-3 py-2.5 text-left font-medium">
                {/* Le nom porte le lien, pas la ligne entière : la ligne contient déjà
                    les logos des actifs, eux-mêmes cliquables. Deux zones cliquables
                    imbriquées produisent un HTML invalide et un piège au clavier. */}
                <Link
                  href={`/categories/${category.id}`}
                  /* `inline-flex items-center` et non le `inline` par défaut : le
                     plancher tactile de globals.css repose sur `min-height`, qui n'a
                     AUCUN effet sur une boîte en ligne. Ce lien restait donc à 18 pixels
                     dans une ligne qui en fait quarante — la moitié de la ligne visible
                     ne déclenchait rien. Les autres tableaux y échappaient déjà, leurs
                     liens portant `flex` pour aligner un logo. */
                  className="inline-flex items-center text-ink transition-colors hover:text-brand-strong hover:underline"
                >
                  {category.name}
                </Link>
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
            className="h-5 w-5 rounded-pill border border-surface bg-surface-muted object-contain"
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
  const t = usePhrase()
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
          {direction === 'desc'
            ? t(', trié du plus grand au plus petit')
            : t(', trié du plus petit au plus grand')}
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
