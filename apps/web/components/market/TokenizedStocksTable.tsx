'use client'

import { useState } from 'react'

import type { TokenizedStock } from '@zenkuu/data'
import { formatCurrency } from '@zenkuu/ui'

import { usePhrase } from '@/components/locale/ContentProvider'
import { TablePagination } from '@/components/ui/TablePagination'
import { Link } from '@/i18n/navigation'
import { DEFAULT_ROWS } from '@/lib/limits'

/**
 * Le catalogue des actions tokenisées, PAR PAGES.
 *
 * ── POURQUOI IL A QUITTÉ `RealWorldAssetsSection` ────────────────────────────
 *
 * Il y vivait comme un composant serveur, et rendait le catalogue ENTIER : cinq cents
 * lignes dans un seul `<tbody>`, mesurées sur la page en fonctionnement. C'était
 * invisible à la lecture du code — la source ne dit nulle part combien de jetons elle
 * publie, et douze auraient été aussi plausibles.
 *
 * Cinq cents lignes ne sont pas seulement longues à parcourir : elles pèsent dans le
 * HTML envoyé, dans l'arbre que le navigateur construit, et dans tout ce que le
 * défilement doit repeindre. La pagination est ici une mesure de POIDS avant d'être
 * une commodité de lecture.
 *
 * ── CE QUE LE PASSAGE AU CLIENT COÛTE, ET POURQUOI C'EST ACCEPTABLE ─────────
 *
 * Un composant serveur ne peut pas tenir d'état, donc pas de page courante. Le
 * découpage doit donc se faire dans le navigateur — ou alors dans l'URL, ce qui
 * imposerait un aller-retour serveur par page pour des lignes DÉJÀ toutes chargées.
 *
 * Le coût réel est faible : les données arrivent en propriétés depuis le composant
 * serveur parent, qui garde l'appel à la source et son cache. Ce fichier ne fait que
 * découper un tableau déjà constitué, et `usePhrase` remplace `getPhrase` sans changer
 * les chaînes.
 */
export function TokenizedStocksTable({ tokens }: { tokens: TokenizedStock[] }) {
  const t = usePhrase()

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(DEFAULT_ROWS)

  const start = (page - 1) * perPage
  const visible = tokens.slice(start, start + perPage)

  return (
    <div className="space-y-2">
      {/* Sans cadre ni filets, comme le tableau des catégories : sur une grille de
          nombres cadrés à droite, la structure se lit dans les chiffres. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm sm:min-w-[640px]">
          <caption className="sr-only">{t('Actions tokenisées')}</caption>
          <thead>
            <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
              <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
                #
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t('Jeton')}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
                {t('Émetteur')}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                {t('Prix')}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">
                {t('Volume 24 h')}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                {t('Capitalisation')}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((token, index) => (
              <tr key={token.id} className="transition-colors hover:bg-surface-muted/60">
                <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                  {/* Le rang porte sur le CATALOGUE, pas sur la page : repartir à 1
                      en page 2 ferait deux premiers jetons. */}
                  {start + index + 1}
                </td>
                <th scope="row" className="px-3 py-2.5 text-left font-medium">
                  <span className="flex items-center gap-2">
                    {token.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- logos distants
                      <img
                        src={token.image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded-pill border border-surface bg-surface-muted object-contain"
                      />
                    ) : null}
                    <Link
                      href={`/crypto/${token.id}`}
                      className="inline-flex items-center text-ink transition-colors hover:text-brand hover:underline"
                    >
                      {token.name}
                    </Link>
                    <span className="text-xs uppercase text-ink-muted">{token.symbol}</span>
                  </span>
                </th>
                <td className="hidden px-3 py-2.5 text-ink-muted md:table-cell">
                  {token.issuer ?? '—'}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">
                  {formatCurrency(token.priceUsd, 'USD') ?? '—'}
                </td>
                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                  {formatCurrency(token.volume24hUsd, 'USD', { compact: true }) ?? '—'}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">
                  {formatCurrency(token.marketCapUsd, 'USD', { compact: true }) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        perPage={perPage}
        total={tokens.length}
        unit="actif"
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setPerPage(size)
          setPage(1)
        }}
      />
    </div>
  )
}
