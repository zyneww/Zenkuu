'use client'

import { useEffect, useState } from 'react'

import type { AssetTicker, TokenizedStock } from '@zenkuu/data'
import { formatCompact, formatCurrency, formatPercent } from '@zenkuu/ui'

import { AssetTickers } from '@/components/asset/AssetTickers'
import { usePanelVisible } from '@/components/asset/panel-visibility'
import { usePhrase } from '@/components/locale/ContentProvider'
import { Table, TableBody, TableHeader } from '@/components/ui/table'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES JETONS QUI RÉPLIQUENT UNE ACTION, ET LES PLACES QUI LES COTENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── DEUX TABLES, ET ELLES ARRIVENT ENSEMBLE ─────────────────────────────────
 *
 * « Marchés » liste les paires sur lesquelles ces jetons s'échangent ; « Jetons » liste
 * les jetons eux-mêmes. La première se DÉDUIT de la seconde — on ne sait quelles places
 * interroger qu'une fois les jetons connus — d'où une seule requête pour les deux.
 *
 * ── L'ÉCART EST LA COLONNE QUI JUSTIFIE LA TABLE ────────────────────────────
 *
 * Un jeton adossé à NVIDIA devrait valoir exactement l'action. Ce qu'on vient vérifier,
 * c'est de COMBIEN il s'en écarte : c'est la mesure de la qualité de l'adossement et de
 * la liquidité du jeton. La colonne est calculée ici, contre le cours de l'action rendu
 * par la fiche — pas reprise d'une source, parce qu'aucune ne la publie.
 *
 * ⚠️ LA CHAÎNE N'EST PAS AFFICHÉE, ET LA RÉFÉRENCE L'AFFICHE. `/coins/markets` ne
 * publie pas la plateforme de chaque jeton ; l'obtenir demanderait un appel par jeton,
 * soit six pour une seule fiche sur un quota mesuré à huit par minute. Une colonne
 * manquante vaut mieux qu'une chaîne devinée d'après le nom de l'émetteur (§5).
 *
 * ── ELLES SE CHARGENT QUAND LA SECTION APPROCHE ─────────────────────────────
 *
 * Quatre appels externes au pire. Les mettre dans le rendu les ferait payer à chaque
 * affichage d'une fiche d'action, pour une table que la plupart ne verront jamais.
 */
export function AssetTokenizedStocks({
  symbol,
  assetName,
  /** Cours de l'ACTION, dans sa devise — la référence contre laquelle l'écart se lit. */
  referencePrice,
  referenceCurrency,
}: {
  symbol: string
  assetName: string
  referencePrice?: number
  referenceCurrency?: string
}) {
  const t = usePhrase()
  const visible = usePanelVisible()
  const [data, setData] = useState<{
    tokens: TokenizedStock[]
    markets: AssetTicker[]
    marketsOmitted: number
  } | null>(null)

  useEffect(() => {
    if (!visible) return

    let cancelled = false
    const query = `symbole=${encodeURIComponent(symbol)}&nom=${encodeURIComponent(assetName)}`

    void fetch(`/api/actions-tokenisees?${query}`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !payload?.ok) return
        setData({
          tokens: payload.tokens as TokenizedStock[],
          markets: payload.markets as AssetTicker[],
          marketsOmitted: Number(payload.marketsOmitted) || 0,
        })
      })
      /* Échec silencieux : les deux sections disparaissent. Une action sans version
         tokenisée est le cas NORMAL, pas une panne — la majorité des titres cotés n'en
         ont aucune. */
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [visible, symbol, assetName])

  if (!data || data.tokens.length === 0) return null

  /*
   * Le cours de référence n'est utilisable que s'il est libellé en DOLLARS : les jetons
   * sont cotés ainsi par la source, et comparer un cours en euros à un cours en dollars
   * produirait un écart de dix pour cent qui ne décrirait que le taux de change. Sans
   * dollar, la colonne disparaît plutôt que de mentir (§5).
   */
  const reference =
    referencePrice !== undefined && referenceCurrency?.toUpperCase() === 'USD'
      ? referencePrice
      : undefined

  return (
    <>
      {data.markets.length > 0 ? (
        <AssetTickers
          tickers={data.markets}
          assetName={assetName}
          title={`${t('Marchés')} ${assetName}`}
          description={
            `Les places qui cotent les versions tokenisées de ${assetName}, toutes ` +
            `émissions confondues, classées par volume.` +
            (data.marketsOmitted > 0
              ? ` ${data.marketsOmitted} émission${data.marketsOmitted > 1 ? 's' : ''} de plus ` +
                `existe${data.marketsOmitted > 1 ? 'nt' : ''} et ne ${
                  data.marketsOmitted > 1 ? 'sont' : 'est'
                } pas interrogée${data.marketsOmitted > 1 ? 's' : ''} ici.`
              : '')
          }
        />
      ) : null}

      <section aria-labelledby="jetons-titre" className="space-y-3">
        <div className="space-y-1">
          <h2 id="jetons-titre" className="display-sm text-ink">
            {t('Jetons')} {assetName}
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Les jetons adossés à {assetName}, un par émetteur. Chacun a son cours et sa
            liquidité propres&nbsp;: l’écart au cours de l’action mesure la qualité de
            l’adossement.
          </p>
        </div>

        <div className="rounded-card">
          <Table className="border-collapse sm:min-w-[640px]">
            <caption className="sr-only">Versions tokenisées de {assetName}</caption>
            <TableHeader className="[&_tr]:border-b-0">
              <tr className="border-b border-border-subtle bg-surface-muted/35 text-left text-xs text-ink-muted">
                <th scope="col" className="w-10 px-3 py-2.5 text-right font-semibold">#</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">{t('Jeton')}</th>
                <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">
                  Émetteur
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t('Prix')}</th>
                {reference !== undefined ? (
                  <th
                    scope="col"
                    className="hidden px-3 py-2.5 text-right font-semibold md:table-cell"
                  >
                    Écart
                  </th>
                ) : null}
                <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">
                  {t('Capitalisation')}
                </th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">
                  Volume 24 h
                </th>
              </tr>
            </TableHeader>

            <TableBody className="divide-y divide-border-subtle">
              {data.tokens.map((token, index) => (
                <tr
                  key={token.id}
                  className="transition-colors duration-150 hover:bg-surface-muted/60"
                >
                  <td className="tabular px-3 py-2.5 text-right text-xs text-ink-muted/70">
                    {index + 1}
                  </td>

                  <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                    <span className="inline-flex items-center gap-2">
                      {token.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- vignettes de fournisseurs non déclarés
                        <img
                          src={token.image}
                          alt=""
                          loading="lazy"
                          className="h-5 w-5 shrink-0 rounded-pill"
                        />
                      ) : (
                        /* Place RÉSERVÉE même sans vignette : sans elle, une ligne sans
                           logo décalerait son symbole de vingt-huit pixels et la colonne
                           cesserait de s'aligner. */
                        <span
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0 rounded-pill bg-surface-muted"
                        />
                      )}
                      <span className="uppercase">{token.symbol}</span>
                    </span>
                  </th>

                  <td className="hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                    {token.issuer ?? '—'}
                  </td>

                  <td className="tabular px-3 py-2.5 text-right text-ink">
                    {formatCurrency(token.priceUsd, 'USD') ?? '—'}
                  </td>

                  {reference !== undefined ? (
                    <td className="tabular hidden px-3 py-2.5 text-right md:table-cell">
                      <Spread price={token.priceUsd} reference={reference} />
                    </td>
                  ) : null}

                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                    {formatCurrency(token.marketCapUsd, 'USD', { compact: true }) ?? '—'}
                  </td>

                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                    {token.volume24hUsd !== undefined
                      ? (formatCompact(token.volume24hUsd) ?? '—')
                      : '—'}
                  </td>
                </tr>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs leading-relaxed text-ink-muted">
          {t('Un jeton adossé à une action n’EST pas cette action&nbsp;: il en réplique le cours par un mécanisme propre à son émetteur, avec ses propres risques de contrepartie et de liquidité. Les montants sont publiés en dollars par la source.')}
        </p>
      </section>
    </>
  )
}

/** L'écart au cours de l'action, teinté comme une variation. */
function Spread({ price, reference }: { price?: number; reference: number }) {
  if (price === undefined || reference <= 0) return <span className="text-ink-muted">—</span>

  const gap = ((price - reference) / reference) * 100
  /* Le seuil de teinte est à un dixième de pour cent : en dessous, l'écart relève du
     bruit de cotation entre deux instantanés, et le colorer ferait lire une dérive là
     où il n'y a qu'un décalage d'horodatage. */
  const tone = gap > 0.1 ? 'text-up' : gap < -0.1 ? 'text-down' : 'text-ink-muted'

  return <span className={tone}>{formatPercent(gap)}</span>
}
