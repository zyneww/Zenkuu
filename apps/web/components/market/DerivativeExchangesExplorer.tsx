'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

import type { DerivativeExchange } from '@zenkuu/data'
import { EmptyState, formatCompact } from '@zenkuu/ui'

import { ExchangeLogo } from '@/components/asset/ExchangeLogo'
import { Link } from '@/i18n/navigation'
import { TablePagination } from '@/components/ui/TablePagination'
import { SortableHeader, useTableSort, type SortAccessor } from '@/components/ui/SortableTable'
import { ColumnPicker, useColumnPreferences } from '@/components/ui/table-columns'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * REGISTRE DES PLACES DE PRODUITS DÉRIVÉS.
 *
 * ── CE QUE CE TABLEAU CLASSE, ET POURQUOI L'INTÉRÊT OUVERT D'ABORD ──────────
 *
 * Les places au comptant se classent par note de confiance : la question qu'on s'y
 * pose est « à qui se fier ». Sur les dérivés, la question est « où est l'argent »,
 * et la réponse est l'INTÉRÊT OUVERT — la somme des positions non dénouées.
 *
 * Le volume ne répond pas à la même chose. Une place peut afficher un volume
 * quotidien énorme fait d'allers-retours à la minute, sans qu'aucune position ne
 * subsiste le soir. L'intérêt ouvert, lui, mesure l'exposition qui reste : c'est
 * elle qui pèse lors d'un mouvement violent, et c'est elle qui se liquide en cascade.
 *
 * Le rapport des deux est affiché en colonne « Rotation » — un volume dix fois
 * supérieur à l'intérêt ouvert décrit une place de spéculation courte, un rapport
 * proche de un une place de couverture. Ce n'est pas un jugement, c'est une lecture.
 *
 * ── LES DEUX FILTRES NE SE VALENT PAS ───────────────────────────────────────
 *
 * « Décentralisées » repose sur NOTRE classification (voir `DerivativeExchange.kind`),
 * et l'onglet « Non classées » existe précisément pour que ce fait soit visible plutôt
 * que dissous dans l'un des deux autres. Une interface qui range tout dans deux cases
 * laisse croire qu'elle sait tout ranger.
 */

type FilterId = 'all' | 'dex' | 'cex' | 'unknown'

type SortKey = 'name' | 'openInterest' | 'volume' | 'turnover' | 'perpetual' | 'year'

const DEFAULT_PER_PAGE = 25

/** Volume rapporté à l'intérêt ouvert — voir l'en-tête. */
function turnover(row: DerivativeExchange): number | undefined {
  if (!row.openInterestBtc || !row.volume24hBtc) return undefined
  if (row.openInterestBtc <= 0) return undefined
  return row.volume24hBtc / row.openInterestBtc
}

export function DerivativeExchangesExplorer({
  exchanges,
}: {
  exchanges: DerivativeExchange[]
}) {
  const t = usePhrase()
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  /* La taille de page est RÉGLABLE, comme sur les tableaux de la référence : cent
     places tiennent en quatre pages de vingt-cinq, ou en une seule de cent. Le choix
     appartient au lecteur, qui seul sait s'il cherche une place ou s'il compare. */
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)

  /* Les décomptes portent sur la liste ENTIÈRE et non sur la page : un onglet qui
     afficherait « 6 » parce que la page courante en contient six ferait croire que le
     reste n'existe pas. */
  const counts = useMemo(
    () => ({
      all: exchanges.length,
      dex: exchanges.filter((row) => row.kind === 'dex').length,
      cex: exchanges.filter((row) => row.kind === 'cex').length,
      unknown: exchanges.filter((row) => row.kind === undefined).length,
    }),
    [exchanges],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return exchanges.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false
      if (filter === 'dex') return row.kind === 'dex'
      if (filter === 'cex') return row.kind === 'cex'
      if (filter === 'unknown') return row.kind === undefined
      return true
    })
  }, [exchanges, filter, query])

  const accessors = useMemo<Record<SortKey, SortAccessor<DerivativeExchange>>>(
    () => ({
      name: (row) => row.name,
      openInterest: (row) => row.openInterestBtc,
      volume: (row) => row.volume24hBtc,
      turnover,
      perpetual: (row) => row.perpetualPairs,
      year: (row) => row.yearEstablished,
    }),
    [],
  )

  const { rows, sort, toggle } = useTableSort<DerivativeExchange, SortKey>({
    rows: filtered,
    accessors,
    /* La source rend déjà les places par intérêt ouvert décroissant. Le déclarer plutôt
       que de laisser `null` fait porter sa flèche à la colonne concernée dès le premier
       rendu, au lieu de laisser croire qu'aucun tri n'est appliqué. */
    initial: { key: 'openInterest', direction: 'desc' },
    onSortChange: () => setPage(1),
  })

  /* ⚠️ CES LIBELLÉS SONT AFFICHÉS — voir la note jumelle dans `TreasuryTable`. */
  const prefs = useColumnPreferences('perpetuels', [
    { id: 'rank', label: t('Rang') },
    { id: 'name', label: t('Place'), locked: true },
    { id: 'kind', label: t('Nature') },
    { id: 'openInterest', label: t('Intérêt ouvert'), locked: true },
    { id: 'volume', label: t('Volume 24 h') },
    { id: 'turnover', label: t('Rotation') },
    { id: 'perpetual', label: t('Contrats') },
    { id: 'year', label: t('Depuis') },
  ])

  const visible = rows.slice((page - 1) * perPage, page * perPage)

  const FILTERS: { id: FilterId; label: string; hint: string }[] = [
    { id: 'all', label: 'Toutes', hint: 'Toutes les places publiées par la source' },
    {
      id: 'dex',
      label: 'Décentralisées',
      hint: 'Positions réglées par contrat autonome — classification ZENKUU',
    },
    {
      id: 'cex',
      label: 'Dépositaires',
      hint: 'Fonds détenus par l’opérateur — classification ZENKUU',
    },
    {
      id: 'unknown',
      label: 'Non classées',
      hint: 'Places que nous n’avons pas encore classées — ni l’un ni l’autre',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('Nature de la place')}>
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setFilter(entry.id)
                setPage(1)
              }}
              aria-pressed={filter === entry.id}
              title={t(entry.hint)}
              className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                filter === entry.id
                  ? 'bg-brand-soft text-brand-strong'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {t(entry.label)}
              <span className="tabular text-[0.6875rem] opacity-70">{counts[entry.id]}</span>
            </button>
          ))}
        </div>

        <InputGroup size="sm" className="min-w-[10rem] flex-1">
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => {
              const next = event.target.value

                    setQuery(next)
                    setPage(1)
                  }}
            placeholder={t('Rechercher une place…')}
            aria-label={t('Rechercher une place de dérivés')}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        <ColumnPicker prefs={prefs} />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={t('Aucune place ne correspond')}
          description={t('Essayez un autre filtre, ou effacez la recherche.')}
          compact
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card">
            {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. Ne
                restent que la place et son intérêt ouvert : c'est la question de la
                page, et elle tient dans 320 pixels. */}
            <table className="w-full border-collapse text-sm sm:min-w-[52rem]">
              <caption className="sr-only">{t('Places de produits dérivés, classées par intérêt ouvert')}</caption>

              <thead>
                <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
                  {prefs.isVisible('rank') ? (
                    <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
                      #
                    </th>
                  ) : null}
                  <SortableHeader
                    label={t('Place')}
                    sortKey="name"
                    align="left"
                    sort={sort}
                    onToggle={toggle}
                    columnPrefs={prefs}
                  />
                  {prefs.isVisible('kind') ? (
                    <th
                      scope="col"
                      className="hidden px-3 py-2.5 text-left font-medium md:table-cell"
                    >
                      {t('Nature')}
                    </th>
                  ) : null}
                  <SortableHeader
                    label={t('Intérêt ouvert ₿')}
                    sortKey="openInterest"
                    sort={sort}
                    onToggle={toggle}
                    columnPrefs={prefs}
                    title={t('Somme des positions non dénouées, en bitcoin')}
                  />
                  {prefs.isVisible('volume') ? (
                    <SortableHeader
                      label={t('Volume 24 h ₿')}
                      sortKey="volume"
                      className="hidden sm:table-cell"
                      sort={sort}
                      onToggle={toggle}
                      columnPrefs={prefs}
                    />
                  ) : null}
                  {prefs.isVisible('turnover') ? (
                    <SortableHeader
                      label={t('Rotation')}
                      sortKey="turnover"
                      className="hidden lg:table-cell"
                      sort={sort}
                      onToggle={toggle}
                      columnPrefs={prefs}
                      title={t('Volume 24 h rapporté à l’intérêt ouvert')}
                    />
                  ) : null}
                  {prefs.isVisible('perpetual') ? (
                    <SortableHeader
                      label={t('Perpétuels')}
                      sortKey="perpetual"
                      className="hidden md:table-cell"
                      sort={sort}
                      onToggle={toggle}
                      columnPrefs={prefs}
                      title={t('Nombre de contrats sans échéance cotés')}
                    />
                  ) : null}
                  {prefs.isVisible('year') ? (
                    <SortableHeader
                      label={t('Depuis')}
                      sortKey="year"
                      className="hidden lg:table-cell"
                      sort={sort}
                      onToggle={toggle}
                      columnPrefs={prefs}
                    />
                  ) : null}
                </tr>
              </thead>

              <tbody className="divide-y divide-border-subtle">
                {visible.map((row, index) => {
                  const rotation = turnover(row)

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-surface-muted/60">
                      {prefs.isVisible('rank') ? (
                        <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                          {(page - 1) * perPage + index + 1}
                        </td>
                      ) : null}

                      <th scope="row" className="px-3 py-2.5 text-left font-normal">
                        {/* La ligne mène à la FICHE de la place, pas au site de
                            l'opérateur : ce tableau situe l'activité, il n'y donne pas
                            accès (§1). Le lien sortant, lui, vit sur la fiche. */}
                        <Link
                          href={`/places/${row.id}`}
                          /* `prefetch={false}` — liste dense : chaque ligne mène à un rendu
                             serveur qui interroge la source, sur le limiteur de la page en
                             cours. Un clic au plus sera fait. Voir OPTIMISATION.md,
                             section « Réseau ». */
                          prefetch={false}
                          className="group flex min-w-0 items-center gap-2.5"
                        >
                          <ExchangeLogo name={row.name} src={row.image} size={22} />
                          <span className="min-w-0 truncate font-medium text-ink group-hover:text-brand">
                            {row.name}
                          </span>
                        </Link>
                      </th>

                      {prefs.isVisible('kind') ? (
                        <td className="hidden px-3 py-2.5 md:table-cell">
                          <KindBadge kind={row.kind} />
                        </td>
                      ) : null}

                      <td className="tabular px-3 py-2.5 text-right font-medium text-ink">
                        {row.openInterestBtc !== undefined
                          ? formatCompact(row.openInterestBtc)
                          : '—'}
                      </td>

                      {prefs.isVisible('volume') ? (
                        <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                          {row.volume24hBtc !== undefined
                            ? formatCompact(row.volume24hBtc)
                            : '—'}
                        </td>
                      ) : null}

                      {prefs.isVisible('turnover') ? (
                        <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                          {rotation !== undefined
                            ? `${rotation.toFixed(1).replace('.', ',')} ×`
                            : '—'}
                        </td>
                      ) : null}

                      {prefs.isVisible('perpetual') ? (
                        <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                          {row.perpetualPairs ?? '—'}
                          {/* Les contrats à ÉCHÉANCE sont annoncés en second et en
                              plus discret : sur ces places, ils sont minoritaires et
                              souvent nuls. Les mettre en colonne propre réserverait
                              cinquante pixels à une colonne de tirets. */}
                          {row.futuresPairs ? (
                            <span className="ml-1 text-micro opacity-70">
                              +{row.futuresPairs} éch.
                            </span>
                          ) : null}
                        </td>
                      ) : null}

                      {prefs.isVisible('year') ? (
                        <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                          {row.yearEstablished ?? '—'}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            perPage={perPage}
            total={rows.length}
            unit="place"
            onPageChange={setPage}
            /* Changer la taille de page RAMÈNE EN PAGE 1 : passer de 100 à 25 lignes
               depuis la page 3 laisserait une page qui n'existe plus, et le compteur
               annoncerait « 51 à 75 sur 60 ». */
            onPerPageChange={(next) => {
              setPerPage(next)
              setPage(1)
            }}
          />
        </>
      )}
    </div>
  )
}

/**
 * Étiquette de nature.
 *
 * Les trois états sont VISUELLEMENT DISTINCTS, y compris « non classée » : la rendre
 * vide ferait lire l'absence de classement comme une absence de donnée chez la
 * source, alors que c'est une lacune de notre part.
 */
function KindBadge({ kind }: { kind: DerivativeExchange['kind'] }) {
  const t = usePhrase()
  if (kind === 'dex') {
    return (
      <span
        className="rounded-control bg-up-soft px-1.5 py-0.5 text-micro font-medium text-up"
        title={t('Positions réglées sur chaîne par contrat autonome')}
      >{t('Décentralisée')}</span>
    )
  }

  if (kind === 'cex') {
    return (
      <span
        className="rounded-control bg-surface-muted px-1.5 py-0.5 text-micro font-medium text-ink-muted"
        title={t('Fonds détenus par l’opérateur de la plateforme')}
      >{t('Dépositaire')}</span>
    )
  }

  return (
    <span
      className="text-micro text-ink-muted opacity-70"
      title={t('ZENKUU n’a pas encore classé cette place')}
    >
      {t('non classée')}
    </span>
  )
}
