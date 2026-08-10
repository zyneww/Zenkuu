import type { SpotExchange } from '@zenith/data'

/**
 * Répartition du volume au comptant entre les places de marché.
 *
 * ⚠️ LE POINT DÉLICAT EST LE DÉNOMINATEUR. Le pourcentage affiché est la part de
 * chaque place dans le total des places AFFICHÉES, pas dans le marché mondial : la
 * source classe des centaines de plateformes, on en montre quelques dizaines. Écrire
 * « part de marché » serait faux d'un facteur inconnu. La colonne s'intitule donc
 * « part du volume affiché », et l'en-tête rappelle sur combien de places.
 *
 * Le volume est en BITCOIN parce que c'est l'unité dans laquelle la source le publie.
 * Le convertir en euros supposerait de choisir un cours et un instant — une mesure
 * deviendrait une estimation (§5).
 *
 * La note de confiance est reprise telle quelle, attribuée. C'est un jugement de la
 * source sur la qualité de la liquidité annoncée, pas une mesure : la présenter comme
 * un chiffre neutre au milieu des volumes serait la faire passer pour ce qu'elle
 * n'est pas, d'où la mention explicite sous le tableau.
 */
export function SpotExchangesPanel({ exchanges }: { exchanges: SpotExchange[] }) {
  const total = exchanges.reduce((sum, exchange) => sum + exchange.volume24hBtc, 0)
  if (total <= 0) return null

  return (
    <section className="space-y-4" aria-labelledby="places-titre">
      <div className="space-y-1">
        <h2 id="places-titre" className="display-md text-ink">
          Où s’échange le marché au comptant
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Les {exchanges.length} premières places par note de confiance, et le volume
          qu’elles déclarent sur 24 heures. ZENITH ne référence aucun carnet d’ordres et
          ne permet aucune transaction : ce tableau situe l’activité, il n’y donne pas accès.
        </p>
      </div>

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full min-w-[38rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-ink-muted">
                Place
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-ink-muted">
                Volume 24 h (BTC)
              </th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-ink-muted">
                Part du volume affiché
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-right text-xs font-medium text-ink-muted sm:table-cell"
              >
                Confiance
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-right text-xs font-medium text-ink-muted lg:table-cell"
              >
                Pays
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {exchanges.map((exchange, index) => {
              const share = (exchange.volume24hBtc / total) * 100

              return (
                <tr key={exchange.id} className="transition-colors duration-150 hover:bg-surface-muted">
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="tabular w-5 shrink-0 text-xs text-ink-muted">
                        {index + 1}
                      </span>
                      {exchange.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- vignettes servies par la source, hors domaines optimisés
                        <img
                          src={exchange.image}
                          alt=""
                          width={20}
                          height={20}
                          loading="lazy"
                          className="shrink-0 rounded-full"
                        />
                      ) : null}
                      <span className="truncate font-medium text-ink">{exchange.name}</span>
                    </span>
                  </td>

                  <td className="tabular px-3 py-2.5 text-right text-ink">
                    {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                      exchange.volume24hBtc,
                    )}
                  </td>

                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      {/* La barre est le vrai support de lecture : elle rend la
                          concentration du marché immédiate là où une colonne de
                          pourcentages demande de comparer chiffre à chiffre. */}
                      <span
                        className="h-1.5 flex-1 bg-surface-muted"
                        role="img"
                        aria-label={`${share.toFixed(1)} % du volume affiché`}
                      >
                        <span
                          className="block h-full bg-brand"
                          style={{ width: `${Math.min(100, share).toFixed(2)}%` }}
                        />
                      </span>
                      <span className="tabular w-12 shrink-0 text-right text-xs text-ink-muted">
                        {share.toFixed(1)}&#8239;%
                      </span>
                    </span>
                  </td>

                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                    {exchange.trustScore !== undefined ? `${exchange.trustScore}/10` : '—'}
                  </td>

                  <td className="hidden px-3 py-2.5 text-right text-xs text-ink-muted lg:table-cell">
                    {exchange.country ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        La note de confiance est un jugement publié par la source sur la qualité de la
        liquidité déclarée — pas une mesure, et pas un avis de ZENITH. Les volumes sont
        ceux annoncés par les places elles-mêmes.
      </p>
    </section>
  )
}
