'use client'

import { useLocale } from 'next-intl'
import { CalendarDays } from 'lucide-react'
import { Search } from 'lucide-react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { usePhrase } from '@/components/locale/ContentProvider'
import { useMemo, useState } from 'react'

import type { NewListing } from '@zenkuu/data'
import { ChangeBadge } from '@/components/locale/ChangeBadge'

import { Link, type AppHref } from '@/i18n/navigation'
import { monogram } from '@/components/asset/monogram'
import { DateRangeCalendar } from '@/components/ui/DateRangeCalendar'
import { TablePagination } from '@/components/ui/TablePagination'
import { SortableHeader, useTableSort, type SortAccessor } from '@/components/ui/SortableTable'
import { DEFAULT_ROWS } from '@/lib/limits'
import { matchListing, type ListingMatch } from '@/lib/listing-match'
import { useFormatters } from '@/components/locale/useFormatters'

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

/**
 * Colonnes triables — TOUTES le sont désormais, y compris les deux premières.
 *
 * Le nom et le cours ne l'étaient pas, sans autre raison que d'avoir été écrits à la
 * main hors de la boucle. Le manque se remarquait à l'usage : chercher un jeton par
 * son nom dans une liste de cent lignes triées par date demande de la parcourir
 * entièrement, alors que le champ de filtre juste au-dessus laisse croire que la
 * colonne obéit aussi.
 */
type SortKey = 'name' | 'price' | 'firstDataAt' | 'marketCap' | 'volume24h' | 'change24h' | 'change7d'

const COLUMNS: { key: SortKey; label: string; hideOn?: string; align?: 'left' | 'right' }[] = [
  { key: 'name', label: 'Actif', align: 'left' },
  { key: 'price', label: 'Cours (USD)' },
  { key: 'change24h', label: '24 h' },
  { key: 'change7d', label: '7 j', hideOn: 'hidden md:table-cell' },
  { key: 'volume24h', label: 'Volume 24 h', hideOn: 'hidden lg:table-cell' },
  { key: 'marketCap', label: 'Capitalisation', hideOn: 'hidden sm:table-cell' },
  /* « Suivi depuis » disparaît sous `sm` malgré son importance ici : le tableau arrive
     TRIÉ par cette colonne, et l'ordre des lignes en dit déjà l'essentiel — les plus
     récentes en tête. C'est la même économie que pour le rang des classements. */
  { key: 'firstDataAt', label: 'Suivi depuis', hideOn: 'hidden sm:table-cell' },
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
  const locale = useLocale()

  const nombres = useFormatters()

  const t = usePhrase()
  const [query, setQuery] = useState('')

  /**
   * PÉRIODE DE RÉFÉRENCEMENT, bornée par un calendrier.
   *
   * Le tri par « suivi depuis » répond à « quoi de plus récent ». Il ne répond pas à
   * « qu'est-ce qui est arrivé la semaine du 3 », qui est la question qu'on se pose
   * quand on revient sur un mouvement de marché daté — et à laquelle un tri, par
   * construction, ne répondra jamais : il ordonne, il ne délimite pas.
   *
   * Le filtre porte sur `firstDataAt`, seule date que la source publie.
   */
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(DEFAULT_ROWS)

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let filtered = needle
      ? listings.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) || item.symbol.toLowerCase().includes(needle),
        )
      : listings

    if (range) {
      /* Comparaison sur les dix premiers caractères ISO — `2026-08-13`. Passer par
         `Date.parse` introduirait le fuseau du lecteur dans une borne qu'il a choisie
         sur un calendrier local : le 13 sélectionné à Tokyo exclurait les cotations
         du 13 au matin à Paris. Les chaînes ISO se comparent lexicographiquement, et
         c'est exactement la sémantique voulue. */
      filtered = filtered.filter((item) => {
        const day = item.firstDataAt.slice(0, 10)
        return day >= range.from && day <= range.to
      })
    }

    /*
     * LE TRI LUI-MÊME A QUITTÉ CE FICHIER.
     *
     * Il vivait ici sous forme d'un comparateur écrit à la main, et il était
     * UNIDIRECTIONNEL : cliquer deux fois sur la même colonne ne faisait rien, la
     * flèche affichée était un « ↓ » fixe, et aucun `aria-sort` n'annonçait l'état à
     * un lecteur d'écran. Le mécanisme partagé apporte les trois, et applique le même
     * traitement des valeurs absentes que celui rédigé ici — elles sortent du tri
     * plutôt que de se faire passer pour des zéros.
     *
     * Ne reste dans ce `useMemo` que ce qui lui est propre : le filtre textuel et la
     * plage de dates.
     */
    return filtered
  }, [listings, query, range])

  /*
   * `firstDataAt` est une DATE ISO, comparée comme du texte.
   *
   * C'est exact et ce n'est pas un raccourci : le format `AAAA-MM-JJ` est construit
   * pour que l'ordre lexicographique coïncide avec l'ordre chronologique. Convertir en
   * `Date` pour comparer coûterait une allocation par comparaison, soit des milliers
   * sur une liste de cent lignes, pour le même résultat.
   */
  const accessors = useMemo<Record<SortKey, SortAccessor<NewListing>>>(
    () => ({
      name: (item) => item.name,
      price: (item) => item.price,
      firstDataAt: (item) => item.firstDataAt,
      marketCap: (item) => item.marketCap,
      volume24h: (item) => item.volume24h,
      change24h: (item) => item.change24h,
      change7d: (item) => item.change7d,
    }),
    [],
  )

  const {
    rows: sortedRows,
    sort,
    toggle,
  } = useTableSort<NewListing, SortKey>({
    rows,
    accessors,
    /* Le tableau arrive trié par date de référencement décroissante — « quoi de neuf »
       est la question que pose cette page. Le premier rendu doit donc porter ce tri,
       et non l'ordre brut de la source. */
    initial: { key: 'firstDataAt', direction: 'desc' },
  })

  /*
   * TOUT CHANGEMENT DE FILTRE OU DE TRI RAMÈNE EN PAGE 1.
   *
   * Sans cela, taper trois lettres en page 4 vide le tableau : la liste filtrée ne
   * compte plus quatre pages, et rien à l'écran n'explique pourquoi. Le compteur dit
   * alors « 76 à 100 sur 12 », c'est-à-dire un rang supérieur au total.
   *
   * L'ajustement se fait PENDANT le rendu, même motif que `usePresence` : un effet
   * peindrait d'abord le tableau vide, puis le corrigerait à l'image suivante.
   */
  /* `sort` est un OBJET depuis le passage au tri partagé : l'interpoler directement
     produirait « [object Object] » pour tous les tris, si bien que la signature ne
     changerait jamais d'une colonne à l'autre — et la page ne reviendrait plus à 1.
     Ses deux champs sont donc écrits séparément. */
  const sortSignature = sort ? `${sort.key}:${sort.direction}` : 'aucun'
  const signature = `${query}|${sortSignature}|${range?.from ?? ''}|${range?.to ?? ''}|${perPage}`
  const [previousSignature, setPreviousSignature] = useState(signature)
  if (previousSignature !== signature) {
    setPreviousSignature(signature)
    setPage(1)
  }

  /* `sortedRows` et non `rows` : découper la liste NON TRIÉE afficherait la bonne
     tranche d'un ordre que personne ne voit — le tri n'aurait alors d'effet visible
     qu'au moment où la pagination change. Le typage ne peut pas signaler cet écart,
     les deux variables ayant exactement le même type. */
  const pageRows = sortedRows.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup size="sm" className="w-56">
            <InputGroupInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Filtrer par nom ou symbole')}
              aria-label={t('Filtrer par nom ou symbole')}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>

          {/*
            ── LE CALENDRIER EST REPLIÉ ────────────────────────────────────────

            `Calendar` est une grille de mois EN LIGNE, sans déclencheur : c'est la
            bonne forme dans une colonne de filtres, où il est le sujet. Dans une barre
            d'outils au-dessus d'un tableau, il occupait deux cents pixels de haut en
            permanence et repoussait les cotations sous la ligne de flottaison — pour
            un réglage dont la plupart des lecteurs ne se servent jamais.

            `<details>` plutôt qu'un état React : le repli d'un panneau qui n'a aucune
            conséquence ailleurs n'a pas besoin d'un rendu, et l'élément natif apporte
            le clavier, `aria-expanded` et le fonctionnement sans JavaScript.

            Le résumé porte la PÉRIODE CHOISIE quand il y en a une : un panneau replié
            qui masque un filtre actif est le meilleur moyen de laisser quelqu'un
            devant une liste tronquée sans qu'il comprenne pourquoi.
          */}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-control border border-border-subtle px-2.5 py-1.5 text-xs text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {range ? `${range.from} → ${range.to}` : 'Période'}
            </summary>

            <div className="absolute left-0 top-full z-30 mt-1 rounded-card border border-border-subtle bg-overlay p-3 shadow-overlay">
              <DateRangeCalendar value={range} onChange={setRange} />
            </div>
          </details>
        </div>

        <p className="tabular text-xs text-ink-muted">
          {rows.length} actif{rows.length > 1 ? 's' : ''}
          {query || range ? ` sur ${listings.length}` : ''}
        </p>
      </div>

      <div className="overflow-x-auto rounded-card">
        {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. */}
        <table className="w-full border-collapse text-sm sm:min-w-[42rem]">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              {COLUMNS.map((column) => (
                <SortableHeader
                  key={column.key}
                  label={t(column.label)}
                  sortKey={column.key}
                  sort={sort}
                  onToggle={toggle}
                  align={column.align ?? 'right'}
                  className={column.hideOn ?? ''}
                />
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {pageRows.map((item) => (
              <tr key={item.id} className="transition-colors duration-150 hover:bg-surface-muted">
                <td className="px-3 py-2.5">
                  <Identity listing={item} match={matchListing(item, index)} />
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">
                  {nombres.currency(item.price, 'USD') ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ChangeBadge value={item.change24h} size="sm" />
                </td>
                <td className="hidden px-3 py-2.5 text-right md:table-cell">
                  <ChangeBadge value={item.change7d} size="sm" />
                </td>
                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                  {nombres.currency(item.volume24h, 'USD', { compact: true }) ?? '—'}
                </td>
                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                  {nombres.currency(item.marketCap, 'USD', { compact: true }) ?? '—'}
                </td>
                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                  {formatListedSince(item.firstDataAt, locale)}
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
      ) : (
        <TablePagination
          page={page}
          perPage={perPage}
          total={rows.length}
          unit="cotation"
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      )}
    </div>
  )
}

/**
 * Identité d'une ligne — logo, nom, symbole, et un lien qui mène TOUJOURS quelque part.
 *
 * ── LE LOGO N'EST PLUS RÉSERVÉ AUX ACTIFS RECONNUS ───────────────────────────
 *
 * Il ne s'affichait que sur les lignes rapprochées de notre univers, soit une sur
 * deux — et surtout la mauvaise moitié : sur une page dont le sujet EST le nouvel
 * arrivant, un actif coté il y a trois jours n'est presque jamais dans les 250
 * premières capitalisations. C'était donc l'exception qui portait une image.
 *
 * Coinpaprika sert ses logos à un chemin prévisible, déduit de l'identifiant. Toutes
 * les lignes en ont un. Celui de CoinGecko garde la priorité quand il existe : c'est
 * le même que sur la fiche d'arrivée, et une vignette qui change en cours de route
 * fait douter d'être au bon endroit.
 *
 * ── LES 404 SONT PRÉVUS, ET C'EST LE POINT ───────────────────────────────────
 *
 * L'adresse est fabriquée, pas publiée : un actif sur quelques dizaines n'a pas
 * d'image derrière. Sans `onError`, ces lignes afficheraient l'icône d'image cassée du
 * navigateur — visuellement pire que l'absence de vignette qu'on vient de corriger.
 * L'état de repli bascule alors sur le monogramme, qui dit « il n'y a rien à charger »
 * là où un cadre vide dit « ça charge encore ».
 *
 * ── ET LE LIEN EXISTE MÊME SANS CORRESPONDANCE ───────────────────────────────
 *
 * Avec correspondance, il mène droit à la fiche. Sans, il passe par le résolveur, qui
 * cherche à la demande et redirige — un appel par CLIC, mis en cache, au lieu de trois
 * cents résolutions à chaque rendu. L'ancienne version laissait ces lignes inertes ;
 * c'était honnête, mais cela revenait à ne pas répondre à la question la plus
 * fréquente de la page.
 */
function Identity({ listing, match }: { listing: NewListing; match?: ListingMatch }) {
  const [failed, setFailed] = useState(false)

  const source = match?.image ?? listing.logo
  const badge =
    source && !failed ? (
      // eslint-disable-next-line @next/next/no-img-element -- vignettes 20px hors domaines optimisés
      <img
        src={source}
        alt=""
        width={20}
        height={20}
        className="shrink-0 rounded-pill"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    ) : (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-[0.5rem] font-bold text-brand-strong"
        aria-hidden="true"
      >
        {monogram(listing.name, listing.symbol)}
      </span>
    )

  /*
   * La destination est directe quand on sait, indirecte quand on cherche.
   *
   * Le terme envoyé au résolveur est le NOM et non le symbole : « Mumu The Bull »
   * n'a qu'un candidat, « MUMU » en a plusieurs, et la recherche renverrait alors le
   * plus gros plutôt que celui qu'on a cliqué.
   */
  /* L'encodage de `terme` n'est plus fait ici : next-intl encode les paramètres qu'on
     lui confie, et le faire deux fois transformerait « Yield Basis » en
     « Yield%2520Basis ». */
  const href: AppHref = match
    ? { pathname: '/crypto/[id]', params: { id: match.id } }
    : { pathname: '/resoudre/[terme]', params: { terme: listing.name } }

  return (
    <Link
      href={href}
      className="group flex items-center gap-2 transition-colors hover:text-brand"
    >
      {badge}
      <span className="truncate font-medium text-ink group-hover:text-brand">
        {listing.name}
      </span>
      <span className="tabular shrink-0 text-xs uppercase text-ink-muted">{listing.symbol}</span>
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
function formatListedSince(iso: string, locale: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (!Number.isFinite(days) || days < 0) return '—'
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 31) return `il y a ${days} j`
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
