'use client'

import { ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { ExchangeTicker } from '@zenkuu/data'
import { EmptyState, formatCompact, formatPercent } from '@zenkuu/ui'

import { ExchangeLogo } from '@/components/asset/ExchangeLogo'
import { Link } from '@/i18n/navigation'
import { TablePagination } from '@/components/ui/TablePagination'
import { SortableHeader, useTableSort, type SortAccessor } from '@/components/ui/SortableTable'
import { ExpandingSearch } from '@/components/ui/ExpandingSearch'
import { useRelativeTime } from '@/components/locale/useRelativeTime'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * PAIRES COTÉES SUR UNE PLACE.
 *
 * ── UN TABLEAU, DEUX JEUX DE COLONNES ───────────────────────────────────────
 *
 * Au comptant, ce qui compte est la QUALITÉ de la cotation : l'écart entre l'offre et
 * la demande, la note de confiance de la paire, la fraîcheur du dernier échange. Sur
 * les dérivés, c'est l'EXPOSITION : l'intérêt ouvert du contrat et son taux de
 * financement, qui dit qui paie qui pour tenir sa position.
 *
 * Les colonnes suivent donc la nature de la place, et rien d'autre. Un tableau qui
 * afficherait les deux jeux montrerait une moitié de tirets quel que soit le cas —
 * la source ne publie jamais les deux pour une même paire.
 *
 * ── LA NOTE DE CONFIANCE EST UN FEU, PAS UN NOMBRE ──────────────────────────
 *
 * La source publie `green`, `yellow` ou `red` par paire — pas un score. On la rend
 * donc en pastille de couleur avec son libellé en infobulle, plutôt que de la traduire
 * en note chiffrée qu'elle n'est pas.
 */

type SortKey = 'pair' | 'price' | 'spread' | 'volume' | 'openInterest' | 'funding'

/* 50, comme leur page d'échange — relevé le 2026-08-31 sur `/en/exchanges/binance`.
   La source en renvoie cent au plus ; le sélecteur du pied couvre le reste. */
const DEFAULT_PER_PAGE = 50

export function ExchangeTickersTable({
  tickers,
  derivatives,
}: {
  tickers: ExchangeTicker[]
  /** Décide du jeu de colonnes — voir l'en-tête. */
  derivatives: boolean
}) {
  const t = usePhrase()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)

  /* Au moins une paire porte-t-elle une note ? Voir la note de la colonne. */
  /*
   * ── LA PART DU VOLUME, CALCULÉE SUR LES PAIRES REÇUES ────────────────────
   *
   * Relevé le 2026-08-31 : leur page d'échange porte une colonne « Volume % ». Elle
   * dit ce que chaque paire pèse dans l'activité de la place — un chiffre qui situe,
   * là où le volume brut demande de comparer des ordres de grandeur à l'œil.
   *
   * ⚠️ LE DÉNOMINATEUR EST LE TOTAL DES PAIRES REÇUES, pas le volume déclaré par la
   * place. Les deux diffèrent : la source ne renvoie que les cent premières paires,
   * et le profil de la place annonce un volume qui inclut tout le reste. Rapporter
   * au second donnerait des parts qui ne somment jamais à 100 % sans qu'on sache
   * pourquoi. Le premier se somme exactement — c'est la part DANS CE TABLEAU, ce que
   * le lecteur a sous les yeux.
   *
   * En dollars, comme le volume affiché : mêler `volumeUsd` et `volume` — unités de
   * l'actif de base — additionnerait des bitcoins et des dollars.
   */
  const totalVolumeUsd = useMemo(
    () => tickers.reduce((sum, t) => sum + (t.volumeUsd ?? 0), 0),
    [tickers],
  )

  const hasTrust = useMemo(
    () => tickers.some((ticker) => ticker.trustScore !== undefined),
    [tickers],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return tickers

    return tickers.filter((ticker) =>
      `${ticker.base} ${ticker.target}`.toLowerCase().includes(needle),
    )
  }, [tickers, query])

  const accessors = useMemo<Record<SortKey, SortAccessor<ExchangeTicker>>>(
    () => ({
      pair: (row) => `${row.base}/${row.target}`,
      price: (row) => row.last,
      spread: (row) => row.spreadPercentage,
      volume: (row) => row.volumeUsd ?? row.volume,
      openInterest: (row) => row.openInterestUsd,
      funding: (row) => row.fundingRate,
    }),
    [],
  )

  const { rows, sort, toggle } = useTableSort<ExchangeTicker, SortKey>({
    rows: filtered,
    accessors,
    /* La source rend ses paires par volume décroissant. Le déclarer plutôt que de
       laisser `null` fait porter sa flèche à la colonne concernée dès le premier
       rendu, au lieu de laisser croire qu'aucun tri n'est appliqué. */
    initial: { key: derivatives ? 'openInterest' : 'volume', direction: 'desc' },
    onSortChange: () => setPage(1),
  })

  const visible = rows.slice((page - 1) * perPage, page * perPage)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display-sm text-ink">{t('Paires cotées')}</h2>
          <p className="text-xs text-ink-muted">
            Les {tickers.length} paires les plus actives publiées par la source, pas
            l’intégralité du catalogue de la place.
          </p>
        </div>

        <ExpandingSearch
          value={query}
          onChange={(next) => {
            setQuery(next)
            setPage(1)
          }}
          placeholder={t('Filtrer une paire…')}
          label={t('Filtrer les paires de cette place')}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={t('Aucune paire ne correspond')}
          description={t('Effacez la recherche pour retrouver la liste complète.')}
          compact
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card">
            {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. Ne
                restent que la paire et son cours : c'est ce qu'on vient vérifier. */}
            <table className="w-full border-collapse text-sm sm:min-w-[44rem]">
              <caption className="sr-only">{t('Paires cotées sur cette place')}</caption>

              <thead>
                <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
                  <SortableHeader
                    label="Paire"
                    sortKey="pair"
                    align="left"
                    sort={sort}
                    onToggle={toggle}
                  />
                  <SortableHeader label="Prix" sortKey="price" sort={sort} onToggle={toggle} />

                  {derivatives ? (
                    <>
                      <SortableHeader
                        /* L'UNITÉ EST DANS L'EN-TÊTE, et elle doit y être : la place,
                           elle, affiche son intérêt ouvert en BITCOIN quelques
                           centimètres plus haut. Deux colonnes du même nom dans deux
                           unités différentes, sur la même page, sans que rien ne le
                           dise — c'est ainsi qu'on lit un chiffre pour un autre. */
                        label={t('Intérêt ouvert $')}
                        sortKey="openInterest"
                        className="hidden sm:table-cell"
                        sort={sort}
                        onToggle={toggle}
                        title={t('Positions non dénouées sur ce contrat, en dollars')}
                      />
                      <SortableHeader
                        label="Financement"
                        sortKey="funding"
                        className="hidden md:table-cell"
                        sort={sort}
                        onToggle={toggle}
                        title={t('Taux échangé entre acheteurs et vendeurs, par période de financement')}
                      />
                    </>
                  ) : (
                    <>
                      <SortableHeader
                        label={t('Écart')}
                        sortKey="spread"
                        className="hidden md:table-cell"
                        sort={sort}
                        onToggle={toggle}
                        title={t('Écart entre la meilleure offre et la meilleure demande')}
                      />
                      {/*
                        ── « CONFIANCE » PAR PAIRE N'EXISTE QUE SI LA SOURCE LA PUBLIE

                        Elle était affichée sans condition, et la source a cessé de la
                        renseigner : mesuré sur Kraken, 100 valeurs nulles sur 100. La
                        colonne rendait donc cent tirets sous un en-tête qui promettait
                        un jugement.

                        Le test porte sur la PRÉSENCE RÉELLE dans les données reçues et
                        non sur une constante : si la source la republie un jour, la
                        colonne revient d'elle-même. La note de la PLACE, elle, subsiste
                        et s'affiche en haut de page — c'est un autre champ.
                      */}
                      {hasTrust ? (
                        <th
                          scope="col"
                          className="hidden px-3 py-2.5 text-right font-medium lg:table-cell"
                        >
                          Confiance
                        </th>
                      ) : null}
                    </>
                  )}

                  <SortableHeader
                    label="Volume 24 h"
                    sortKey="volume"
                    className="hidden sm:table-cell"
                    sort={sort}
                    onToggle={toggle}
                  />

                  {totalVolumeUsd > 0 ? (
                    <th
                      scope="col"
                      className="hidden px-3 py-2.5 text-right font-medium lg:table-cell"
                      title={t('Part de cette paire dans le volume des paires affichées')}
                    >
                      {t('Part du volume')}
                    </th>
                  ) : null}

                  <th
                    scope="col"
                    className="hidden px-3 py-2.5 text-right font-medium lg:table-cell"
                  >
                    {t('Cotée')}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-subtle">
                {visible.map((ticker, index) => (
                  <tr
                    key={`${ticker.base}-${ticker.target}-${index}`}
                    className="transition-colors hover:bg-surface-muted/60"
                  >
                    <th scope="row" className="px-3 py-2.5 text-left font-normal">
                      <span className="flex items-center gap-2">
                        {/*
                          L'ICÔNE DE L'ACTIF DE BASE, ET LE LIEN QUI VA AVEC.

                          Le tableau alignait cent lignes de texte nu là où la même
                          donnée porte une icône partout ailleurs sur le site — et
                          surtout, il n'offrait AUCUN chemin vers la fiche de l'actif
                          coté. On arrivait sur la place par un actif, on y voyait cent
                          actifs, et aucun n'était atteignable.

                          Le lien est posé sur l'icône ET le nom, et il n'existe que si
                          la source a publié un `coinId` : sans lui, le symbole de place
                          (« 1000BONK ») ne désigne rien d'unique et l'URL déduite mènerait
                          à un 404 — voir la note du champ dans `types.ts`.
                        */}
                        <ExchangeLogo
                          name={ticker.base}
                          {...(ticker.image ? { src: ticker.image } : {})}
                          size={20}
                        />

                        {ticker.coinId ? (
                          <Link
                            href={`/crypto/${ticker.coinId}`}
                            className="font-medium text-ink transition-colors hover:text-brand"
                          >
                            {ticker.base}
                            {ticker.target ? (
                              <span className="text-ink-muted">/{ticker.target}</span>
                            ) : null}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">
                            {ticker.base}
                            {ticker.target ? (
                              <span className="text-ink-muted">/{ticker.target}</span>
                            ) : null}
                          </span>
                        )}

                        {/* Le lien vers la paire chez l'opérateur est une SORTIE du
                            site, marquée comme telle. `nofollow` : nous citons une
                            plateforme d'échange sans la cautionner (§1). */}
                        {ticker.tradeUrl ? (
                          <a
                            href={ticker.tradeUrl}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            title={`Voir ${ticker.base}/${ticker.target} chez l’opérateur`}
                            className="text-ink-muted transition-colors hover:text-brand"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
                          </a>
                        ) : null}
                      </span>
                    </th>

                    <td className="tabular px-3 py-2.5 text-right font-medium text-ink">
                      {ticker.last > 0 ? formatPrice(ticker.last) : '—'}
                    </td>

                    {derivatives ? (
                      <>
                        <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                          {ticker.openInterestUsd !== undefined
                            ? formatCompact(ticker.openInterestUsd)
                            : '—'}
                        </td>
                        <td
                          className={`tabular hidden px-3 py-2.5 text-right md:table-cell ${
                            ticker.fundingRate === undefined
                              ? 'text-ink-muted'
                              : ticker.fundingRate >= 0
                                ? 'text-up'
                                : 'text-down'
                          }`}
                        >
                          {ticker.fundingRate !== undefined
                            ? formatPercent(ticker.fundingRate)
                            : '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                          {ticker.spreadPercentage !== undefined
                            ? `${ticker.spreadPercentage.toFixed(2).replace('.', ',')} %`
                            : '—'}
                        </td>
                        {hasTrust ? (
                          <td className="hidden px-3 py-2.5 text-right lg:table-cell">
                            <TrustDot score={ticker.trustScore} />
                          </td>
                        ) : null}
                      </>
                    )}

                    <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                      {ticker.volumeUsd !== undefined
                        ? `${formatCompact(ticker.volumeUsd)} $`
                        : ticker.volume !== undefined
                          ? formatCompact(ticker.volume)
                          : '—'}
                    </td>

                    {totalVolumeUsd > 0 ? (
                      <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                        {/* Sans signe : une PART n'a pas de direction. `formatPercent`
                            préfixe d'un « + » toute valeur positive, ce qui ferait lire
                            « +12,40 % » comme une hausse au lieu d'une proportion. */}
                        {ticker.volumeUsd !== undefined
                          ? `${((ticker.volumeUsd / totalVolumeUsd) * 100).toFixed(2).replace('.', ',')} %`
                          : '—'}
                      </td>
                    ) : null}

                    <td className="hidden px-3 py-2.5 text-right text-xs text-ink-muted lg:table-cell">
                      {ticker.lastTradedAt ? <TradedAt iso={ticker.lastTradedAt} /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            perPage={perPage}
            total={rows.length}
            unit="paire"
            onPageChange={setPage}
            onPerPageChange={(next) => {
              setPerPage(next)
              setPage(1)
            }}
          />
        </>
      )}
    </section>
  )
}

/**
 * Prix d'une paire.
 *
 * PAS de conversion de devise : le chiffre est exprimé dans la devise de COTATION de
 * la paire, laquelle figure dans son nom. Le convertir en euros demanderait un taux
 * par devise de cotation — et il y en a des dizaines sur une grande place — pour
 * transformer une mesure en estimation (§5).
 *
 * Le nombre de décimales suit l'ordre de grandeur : « 0,00 » sur un jeton coté un
 * millionième de dollar n'apprend rien, « 63 150,04837 » sur le bitcoin est du bruit.
 */
function formatPrice(value: number): string {
  const digits = value >= 1000 ? 2 : value >= 1 ? 4 : 8
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value)
}

/** Isolé : `useRelativeTime` est un crochet, il ne peut pas vivre dans une boucle. */
function TradedAt({ iso }: { iso: string }) {
  return <>{useRelativeTime(iso)}</>
}

/**
 * Note de confiance d'une paire, en feu tricolore.
 *
 * La couleur seule ne suffit pas — huit pour cent des hommes distinguent mal le rouge
 * du vert. Le libellé accompagne donc la pastille en infobulle ET en texte pour les
 * lecteurs d'écran ; la couleur n'est qu'un raccourci pour ceux qui la perçoivent.
 */
function TrustDot({ score }: { score?: string }) {
  if (!score) return <span className="text-ink-muted">—</span>

  const label =
    score === 'green' ? 'Bonne' : score === 'yellow' ? 'Moyenne' : score === 'red' ? 'Faible' : score
  const tone =
    score === 'green' ? 'bg-up' : score === 'yellow' ? 'bg-[var(--color-warning)]' : 'bg-down'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted" title={label}>
      <span className={`h-2 w-2 shrink-0 rounded-pill ${tone}`} aria-hidden="true" />
      {label}
    </span>
  )
}
