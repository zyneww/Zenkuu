'use client'

import { ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { AssetTicker } from '@zenith/data'
import { formatCurrency, formatPercent } from '@zenith/ui'

import { Money } from '@/components/locale/Money'

/**
 * Places de cotation d'un actif.
 *
 * Seul module de la fiche à coûter un appel réseau dédié, d'où sa mise en cache à
 * 30 minutes : la liste des places et leur poids relatif bougent à l'échelle de la
 * journée, pas de la minute.
 *
 * LIENS SORTANTS ASSUMÉS. Ils orientent vers des lieux de transaction, ce que le §8
 * prévoit explicitement (« liens sortants vers des exchanges tiers — jamais de
 * widget de trading intégré »). La distinction tient : ZENITH n'exécute rien, ne
 * détient rien et n'intègre aucun tunnel d'achat ; il cite où un actif se négocie.
 * `nofollow` marque l'absence de caution éditoriale, `noopener` empêche la page
 * ouverte d'accéder à `window.opener`.
 *
 * Les cotations périmées ou aberrantes sont écartées EN AMONT, dans l'adaptateur :
 * la source les signale elle-même, et un prix faux à côté de prix justes est pire
 * que pas de prix du tout — le lecteur n'a aucun moyen de les distinguer.
 *
 * ── CE QUI A ÉTÉ AJOUTÉ, ET CE QUI NE PEUT PAS L'ÊTRE ──────────────────────────
 *
 * Ajouté : la PROFONDEUR à ±2 %, la note de confiance par paire, la fraîcheur de la
 * cotation, le filtre par devise de cotation et la pagination. Les deux premiers
 * voyageaient déjà dans la réponse et étaient jetés.
 *
 * La profondeur mérite un mot : c'est la mesure de liquidité qui manquait. L'écart
 * acheteur-vendeur dit ce que coûte une petite transaction ; la profondeur dit ce que
 * le carnet absorbe. Deux places au même écart peuvent différer d'un facteur cent.
 *
 * NON REPRIS, faute de donnée : la distinction plateforme centralisée / décentralisée.
 * La source ne publie aucun indicateur du genre sur cet endpoint, et la déduire du nom
 * de la place serait une classification inventée (§5). Le filtre porte donc sur la
 * DEVISE DE COTATION, qui est, elle, réellement publiée — et qui répond à la même
 * question pratique : « à quel prix, dans quelle monnaie ».
 */

const PAGE_SIZES = [10, 25, 50] as const

/** Pourcentage SANS signe, pour les grandeurs qui n'ont pas de direction. */
function unsigned(formatted: string | null): string {
  return formatted?.replace('+', '') ?? '—'
}

/** Fraîcheur de la cotation, en clair. */
function freshness(iso: string | undefined): string {
  if (!iso) return '—'
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  if (minutes < 2) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.round(hours / 24)} j`
}

const TRUST_LABEL: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Volume jugé crédible par la source',
  yellow: 'Volume à considérer avec prudence',
  red: 'Volume jugé douteux par la source',
}

const TRUST_CLASS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-up',
  yellow: 'bg-accent',
  red: 'bg-down',
}

export function AssetTickers({
  tickers,
  assetName,
}: {
  tickers: AssetTicker[]
  assetName: string
}) {
  const [target, setTarget] = useState<string>('toutes')
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState(1)

  // Devises de cotation réellement présentes, classées par nombre de paires : le
  // filtre ne propose que ce qui existe, jamais une liste théorique qui renverrait
  // un tableau vide.
  const targets = useMemo(() => {
    const counts = new Map<string, number>()
    for (const ticker of tickers) {
      counts.set(ticker.target, (counts.get(ticker.target) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([code]) => code)
  }, [tickers])

  const filtered = useMemo(
    () => (target === 'toutes' ? tickers : tickers.filter((ticker) => ticker.target === target)),
    [tickers, target],
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  // Le changement de filtre peut rendre la page courante inexistante : on la borne
  // au rendu plutôt qu'en effet de bord, ce qui évite un rendu intermédiaire vide.
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (tickers.length === 0) return null

  const hasSpread = tickers.some((ticker) => ticker.spreadPercent !== undefined)
  const hasDepth = tickers.some((ticker) => ticker.depthUpUsd !== undefined)
  const hasTrust = tickers.some((ticker) => ticker.trust !== undefined)

  return (
    <section aria-labelledby="places-titre" className="space-y-3">
      <div className="space-y-1">
        <h2 id="places-titre" className="display-sm text-ink">
          Où se négocie {assetName}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Les {tickers.length} places les plus actives, classées par volume. Les parts
          affichées se rapportent à ces {tickers.length} places seulement, pas à
          l’ensemble du marché.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Devise de cotation">
          <FilterChip
            active={target === 'toutes'}
            onClick={() => {
              setTarget('toutes')
              setPage(1)
            }}
            label="Toutes"
          />
          {targets.map((code) => (
            <FilterChip
              key={code}
              active={target === code}
              onClick={() => {
                setTarget(code)
                setPage(1)
              }}
              label={code}
            />
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-ink-muted">
          Lignes
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
            className="border border-border-subtle bg-surface px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">Places de cotation de {assetName}</caption>
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
              <th scope="col" className="px-3 py-2.5 font-medium">Place</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Paire</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Prix</th>
              {hasSpread ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                  Écart
                </th>
              ) : null}
              {hasDepth ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">
                  Profondeur ±2 %
                </th>
              ) : null}
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Volume 24 h</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                Part
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium xl:table-cell">
                Cotée
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {rows.map((ticker, index) => (
              <tr
                /*
                 * L'INDEX fait partie de la clé, et il le faut.
                 *
                 * `place + paire` n'est pas unique : une place décentralisée cote la
                 * même paire sur plusieurs pools, et la source les publie comme
                 * autant de lignes distinctes. Vu à l'écran dès le passage de dix à
                 * cent lignes — React signalait deux enfants de même clé, ce qui
                 * l'autorise à dupliquer ou à omettre des lignes silencieusement.
                 *
                 * L'index est stable ici parce que l'ordre l'est : la liste est triée
                 * par volume côté serveur, et le filtre ne fait que retrancher.
                 */
                key={`${ticker.exchange}-${ticker.base}-${ticker.target}-${index}`}
                className="transition-colors duration-150 hover:bg-surface-muted/60"
              >
                <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    {hasTrust && ticker.trust ? (
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-pill ${TRUST_CLASS[ticker.trust]}`}
                        title={TRUST_LABEL[ticker.trust]}
                        role="img"
                        aria-label={TRUST_LABEL[ticker.trust]}
                      />
                    ) : null}

                    {ticker.tradeUrl ? (
                      <a
                        href={ticker.tradeUrl}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-brand-strong"
                      >
                        {ticker.exchange}
                        <ExternalLink
                          className="h-3 w-3 shrink-0 text-ink-muted"
                          aria-hidden="true"
                        />
                        <span className="sr-only">(nouvelle fenêtre)</span>
                      </a>
                    ) : (
                      ticker.exchange
                    )}
                  </span>
                </th>

                <td className="px-3 py-2.5 text-xs text-ink-muted">
                  <span className="whitespace-nowrap">
                    {ticker.base}/{ticker.target}
                  </span>
                </td>

                <td className="tabular px-3 py-2.5 text-right text-ink">
                  <Money value={ticker.price} from={ticker.currency} />
                </td>

                {hasSpread ? (
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                    {/* Signe retiré : `formatPercent` préfixe « + » parce qu'il sert
                        d'abord aux VARIATIONS, où le sens compte. Un écart
                        acheteur-vendeur est une largeur, toujours positive — « +0,01 % »
                        laisserait croire à une hausse de l'écart. */}
                    {unsigned(formatPercent(ticker.spreadPercent))}
                  </td>
                ) : null}

                {hasDepth ? (
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                    {/* Les deux sens sont montrés séparément : un carnet asymétrique —
                        beaucoup d'acheteurs, peu de vendeurs — est une information que
                        la moyenne des deux effacerait. En dollars, unité de la source. */}
                    <span className="whitespace-nowrap">
                      {formatCurrency(ticker.depthUpUsd, 'USD', { compact: true }) ?? '—'}
                      <span className="mx-1 text-ink-muted/60">/</span>
                      {formatCurrency(ticker.depthDownUsd, 'USD', { compact: true }) ?? '—'}
                    </span>
                  </td>
                ) : null}

                <td className="tabular px-3 py-2.5 text-right text-ink-muted">
                  <Money value={ticker.volume24h} from={ticker.currency} compact />
                </td>

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                  {unsigned(formatPercent(ticker.volumePercent))}
                </td>

                <td className="hidden px-3 py-2.5 text-right text-xs text-ink-muted xl:table-cell">
                  {freshness(ticker.lastTraded)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="tabular text-xs text-ink-muted" aria-live="polite">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}{' '}
            sur {filtered.length} paires
          </p>

          <div className="flex items-center gap-1">
            <PageButton
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              label="Page précédente"
            >
              Précédent
            </PageButton>
            <span className="tabular px-2 text-xs text-ink-muted">
              {currentPage} / {pageCount}
            </span>
            <PageButton
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              label="Page suivante"
            >
              Suivant
            </PageButton>
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-ink-muted">
        La pastille de couleur reprend le jugement de la source sur la crédibilité du
        volume annoncé — ce n’est pas un avis de ZENITH. La profondeur ±2 % est le
        montant qu’il faudrait exécuter pour déplacer le cours de deux pour cent, à
        l’achat puis à la vente, en dollars.
      </p>

      <p className="text-xs text-ink-muted">
        ZENITH n’exécute aucun ordre et ne détient aucun fonds. Ces liens mènent à des
        plateformes tierces, citées sans recommandation.
      </p>
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors duration-150 hover:border-brand hover:text-brand-strong disabled:cursor-not-allowed disabled:text-ink-muted/50 disabled:hover:border-border-subtle disabled:hover:text-ink-muted/50"
    >
      {children}
    </button>
  )
}
