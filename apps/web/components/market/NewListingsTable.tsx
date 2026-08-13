'use client'

import { useMemo, useState } from 'react'

import type { NewListing } from '@zenkuu/data'
import { ChangeBadge, formatCurrency } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { monogram } from '@/components/asset/monogram'
import { matchListing, type ListingMatch } from '@/lib/listing-match'

/**
 * Tableau des cotations récentes.
 *
 * Deux différences de fond avec les autres tableaux du site, toutes deux imposées par
 * la nature de la donnée :
 *
 * 1. UNE LIGNE SUR DEUX EST CLIQUABLE, ET C'EST UN PROGRÈS RÉCENT. Ces actifs
 *    viennent d'une source dont les identifiants ne sont pas ceux de nos fiches —
 *    `btc-bitcoin` ici, `bitcoin` ailleurs — et aucune ligne ne menait donc nulle
 *    part. Le rapprochement se fait désormais par SYMBOLE ET NOM (voir
 *    `lib/listing-match.ts`), jamais par symbole seul : des dizaines de jetons
 *    réutilisent « SOL » ou « BTC », et un lien plausible et faux est pire qu'un lien
 *    absent. Les lignes sans correspondance restent inertes, comme avant.
 *
 * 2. LES MONTANTS SONT EN DOLLARS, quel que soit le réglage de devise du site. La
 *    source ne cote qu'en dollars sur cet endpoint ; convertir supposerait d'appliquer
 *    un taux qui n'est pas celui de la cotation (§5). L'unité est donc annoncée dans
 *    l'en-tête de colonne plutôt que masquée.
 */

type SortKey = 'firstDataAt' | 'marketCap' | 'volume24h' | 'change24h' | 'change7d'

const COLUMNS: { key: SortKey; label: string; hideOn?: string }[] = [
  { key: 'change24h', label: '24 h' },
  { key: 'change7d', label: '7 j', hideOn: 'hidden md:table-cell' },
  { key: 'volume24h', label: 'Volume 24 h', hideOn: 'hidden lg:table-cell' },
  { key: 'marketCap', label: 'Capitalisation', hideOn: 'hidden sm:table-cell' },
  { key: 'firstDataAt', label: 'Suivi depuis' },
]

export function NewListingsTable({
  listings,
  index,
}: {
  listings: NewListing[]
  /**
   * Index de rapprochement avec l'univers des fiches.
   *
   * Passé en prop plutôt que construit ici : sa matière — l'univers CoinGecko — est
   * chargée côté SERVEUR, et ce composant est client. Le lui faire récupérer
   * ajouterait un aller-retour réseau pour une donnée que la page a déjà en main.
   */
  index: Map<string, ListingMatch>
}) {
  const [sort, setSort] = useState<SortKey>('firstDataAt')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? listings.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) || item.symbol.toLowerCase().includes(needle),
        )
      : listings

    return [...filtered].sort((a, b) => {
      if (sort === 'firstDataAt') return b.firstDataAt.localeCompare(a.firstDataAt)
      // Un actif dont la source ne publie pas la grandeur triée part EN FIN de liste
      // plutôt qu'en tête : le traiter comme zéro le placerait au milieu des vraies
      // valeurs nulles, et en tête sur un tri croissant.
      const left = a[sort]
      const right = b[sort]
      if (left === undefined && right === undefined) return 0
      if (left === undefined) return 1
      if (right === undefined) return -1
      return right - left
    })
  }, [listings, sort, query])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="sr-only">Filtrer par nom ou symbole</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer par nom ou symbole"
            className="w-56 rounded-card border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>

        <p className="tabular text-xs text-ink-muted">
          {rows.length} actif{rows.length > 1 ? 's' : ''}
          {query ? ` sur ${listings.length}` : ''}
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-subtle">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-ink-muted">
                Actif
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-ink-muted">
                Cours (USD)
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-3 py-2.5 text-right text-xs font-medium ${column.hideOn ?? ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setSort(column.key)}
                    aria-pressed={sort === column.key}
                    className={`transition-colors duration-150 ${
                      sort === column.key ? 'text-ink' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {column.label}
                    {sort === column.key ? ' ↓' : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {rows.map((item) => (
              <tr key={item.id} className="transition-colors duration-150 hover:bg-surface-muted">
                <td className="px-3 py-2.5">
                  <Identity listing={item} match={matchListing(item, index)} />
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">
                  {formatCurrency(item.price, 'USD') ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ChangeBadge value={item.change24h} size="sm" />
                </td>
                <td className="hidden px-3 py-2.5 text-right md:table-cell">
                  <ChangeBadge value={item.change7d} size="sm" />
                </td>
                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                  {formatCurrency(item.volume24h, 'USD', { compact: true }) ?? '—'}
                </td>
                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                  {formatCurrency(item.marketCap, 'USD', { compact: true }) ?? '—'}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink-muted">
                  {formatListedSince(item.firstDataAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          Aucun actif ne correspond à « {query} ».
        </p>
      ) : null}
    </div>
  )
}

/**
 * Identité d'une ligne — logo, nom, symbole, et lien SI la fiche existe.
 *
 * ── DEUX RENDUS, ET LA DIFFÉRENCE SE VOIT ────────────────────────────────────
 *
 * Avec correspondance : vignette servie par CoinGecko, et la ligne devient un lien.
 * Sans : un monogramme sur aplat de marque, et rien de cliquable.
 *
 * Le monogramme n'est pas un pis-aller décoratif. Un emplacement d'image vide se lit
 * comme un chargement bloqué ; deux lettres disent qu'il n'y a rien à charger. Et
 * l'absence de lien, elle, est INFORMATIVE : elle signale que cet actif n'est pas
 * dans les 250 premières capitalisations, ce qui est très exactement l'information
 * qu'un lecteur de cette page a besoin d'avoir.
 */
function Identity({ listing, match }: { listing: NewListing; match?: ListingMatch }) {
  const badge = match?.image ? (
    // eslint-disable-next-line @next/next/no-img-element -- vignettes 20px hors domaines optimisés
    <img
      src={match.image}
      alt=""
      width={20}
      height={20}
      className="shrink-0 rounded-pill"
      loading="lazy"
    />
  ) : (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-[0.5rem] font-bold text-brand-strong"
      aria-hidden="true"
    >
      {monogram(listing.name, listing.symbol)}
    </span>
  )

  const body = (
    <>
      {badge}
      <span className="truncate font-medium text-ink">{listing.name}</span>
      <span className="tabular shrink-0 text-xs uppercase text-ink-muted">{listing.symbol}</span>
    </>
  )

  if (!match) {
    return <span className="flex items-center gap-2">{body}</span>
  }

  return (
    <Link
      href={`/crypto/${match.id}`}
      className="group flex items-center gap-2 transition-colors hover:text-brand-strong"
    >
      {body}
    </Link>
  )
}

/**
 * Ancienneté du référencement, en clair.
 *
 * « il y a 3 jours » informe mieux qu'une date brute sur une page dont le sujet EST la
 * nouveauté — mais au-delà d'un mois l'écart relatif cesse de parler, et la date
 * reprend l'avantage.
 */
function formatListedSince(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (!Number.isFinite(days) || days < 0) return '—'
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 31) return `il y a ${days} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
