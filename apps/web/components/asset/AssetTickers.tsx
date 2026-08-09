import { ExternalLink } from 'lucide-react'

import type { AssetTicker } from '@zenith/data'
import { formatPercent } from '@zenith/ui'

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
 */
/**
 * Pourcentage SANS signe, pour les grandeurs qui n'ont pas de direction.
 *
 * `formatPercent` sert d'abord aux variations, où « + » et « − » portent le sens.
 * Un écart acheteur-vendeur et une part de volume sont des grandeurs toujours
 * positives : le signe y serait au mieux du bruit, au pire trompeur.
 */
function unsigned(formatted: string | null): string {
  return formatted?.replace('+', '') ?? '—'
}

export function AssetTickers({
  tickers,
  assetName,
}: {
  tickers: AssetTicker[]
  assetName: string
}) {
  if (tickers.length === 0) return null

  const hasSpread = tickers.some((ticker) => ticker.spreadPercent !== undefined)

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

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[560px] border-collapse text-sm">
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
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Volume 24 h</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                Part
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {tickers.map((ticker) => (
              <tr
                key={`${ticker.exchange}-${ticker.base}-${ticker.target}`}
                className="transition-colors hover:bg-surface-muted/60"
              >
                <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                  {ticker.tradeUrl ? (
                    <a
                      href={ticker.tradeUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-brand-strong"
                    >
                      {ticker.exchange}
                      <ExternalLink className="h-3 w-3 shrink-0 text-ink-muted" aria-hidden="true" />
                      <span className="sr-only">(nouvelle fenêtre)</span>
                    </a>
                  ) : (
                    ticker.exchange
                  )}
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

                <td className="tabular px-3 py-2.5 text-right text-ink-muted">
                  <Money value={ticker.volume24h} from={ticker.currency} compact />
                </td>

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                  {unsigned(formatPercent(ticker.volumePercent))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-muted">
        ZENITH n’exécute aucun ordre et ne détient aucun fonds. Ces liens mènent à des
        plateformes tierces, citées sans recommandation.
      </p>
    </section>
  )
}
