import type { DerivativeMarket } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'
import { getPhrase } from '@/lib/content'
import { getFormatters } from '@/lib/formatters'

/**
 * Panneau des produits dérivés — intérêt ouvert et taux de financement.
 *
 * C'est ce que la référence appelle ses « données de trading », dans la mesure où
 * une source gratuite le permet. Trois de ses modules restent HORS D'ATTEINTE et le
 * resteront tant qu'aucune source publique ne les expose : les flux d'ETF Bitcoin,
 * le calendrier économique et le ratio long/short. Aucun n'est remplacé par une
 * approximation (§5).
 *
 * L'agrégation par place est faite ICI plutôt que dans l'adaptateur : la source
 * publie contrat par contrat, et regrouper est une décision d'affichage — un autre
 * écran pourrait vouloir le détail par contrat sans avoir à défaire le regroupement.
 */

/** Regroupe les contrats par place et somme leur intérêt ouvert. */
function byExchange(markets: DerivativeMarket[]) {
  const grouped = new Map<string, { market: string; openInterest: number; volume24h: number; contracts: number }>()

  for (const entry of markets) {
    const current = grouped.get(entry.market) ?? {
      market: entry.market,
      openInterest: 0,
      volume24h: 0,
      contracts: 0,
    }
    current.openInterest += entry.openInterest ?? 0
    current.volume24h += entry.volume24h ?? 0
    current.contracts += 1
    grouped.set(entry.market, current)
  }

  return [...grouped.values()].sort((a, b) => b.openInterest - a.openInterest)
}

export async function DerivativesPanel({ markets }: { markets: DerivativeMarket[] }) {
  const nombres = await getFormatters()

  const t = await getPhrase()
  if (markets.length === 0) return null

  const exchanges = byExchange(markets).slice(0, 8)
  const totalOpenInterest = exchanges.reduce((sum, entry) => sum + entry.openInterest, 0)

  // Taux de financement extrêmes : seuls les contrats PERPÉTUELS en ont un — un
  // contrat à échéance se règle à terme, sans financement périodique.
  const funded = markets
    .filter((entry) => entry.fundingRate !== undefined && entry.contractType === 'perpetual')
    .sort((a, b) => (b.fundingRate ?? 0) - (a.fundingRate ?? 0))

  const highest = funded.slice(0, 3)
  const lowest = funded.slice(-3).reverse()

  return (
    <section className="space-y-8" aria-labelledby="derives-titre">
      <div className="space-y-1">
        <h2 id="derives-titre" className="display-md text-ink">{t('Produits dérivés')}</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{t('Intérêt ouvert et taux de financement des contrats à terme, place par place. L’intérêt ouvert mesure la valeur des positions encore ouvertes — il dit l’exposition du marché, pas sa direction.')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">
            {t('Intérêt ouvert par place')}
            <span className="ml-2 font-normal text-ink-muted">
              {nombres.currency(totalOpenInterest, 'USD', { compact: true })} sur les{' '}
              {exchanges.length} premières
            </span>
          </h3>

          <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
            {exchanges.map((entry) => {
              const share = totalOpenInterest > 0 ? (entry.openInterest / totalOpenInterest) * 100 : 0

              return (
                <li key={entry.market} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-ink">{entry.market}</span>
                    <span className="tabular shrink-0 text-sm text-ink">
                      {nombres.currency(entry.openInterest, 'USD', { compact: true })}
                    </span>
                  </div>

                  {/* La barre est REDONDANTE avec le nombre, et c'est voulu : elle
                      donne l'ordre de grandeur d'un coup d'œil, le nombre donne la
                      valeur. Elle n'est pas la seule porteuse de l'information (§9). */}
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-pill bg-surface-muted">
                      <div className="h-full rounded-pill bg-brand" style={{ width: `${share}%` }} />
                    </div>
                    <span className="tabular w-20 shrink-0 text-right text-[0.6875rem] text-ink-muted">
                      {entry.contracts} contrat{entry.contracts > 1 ? 's' : ''}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">{t('Taux de financement extrêmes')}</h3>

          {funded.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('Aucun contrat perpétuel avec taux de financement publié pour l’instant.')}</p>
          ) : (
            <>
              <FundingGroup title={t('Les plus élevés')} rows={highest} />
              <FundingGroup title={t('Les plus bas')} rows={lowest} />
              <p className="text-xs leading-relaxed text-ink-muted">{t('Taux par période de financement — le plus souvent huit heures, jamais annualisé ici. Un taux positif signifie que les positions acheteuses paient les vendeuses.')}</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

async function FundingGroup({ title, rows }: { title: string; rows: DerivativeMarket[] }) {
  const nombres = await getFormatters()

  if (rows.length === 0) return null

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-ink-muted">{title}</h4>
      <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
        {rows.map((entry) => (
          <li
            key={`${entry.market}-${entry.symbol}`}
            className="flex items-baseline justify-between gap-3 px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-xs text-ink">
              <span className="font-medium">{entry.symbol}</span>
              <span className="ml-1.5 text-ink-muted">{entry.market}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-3">
              <ChangeBadge value={entry.change24h} size="sm" />
              <span
                className={`tabular w-16 text-right text-xs font-medium ${
                  (entry.fundingRate ?? 0) >= 0 ? 'text-up' : 'text-down'
                }`}
              >
                {nombres.percent(entry.fundingRate)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
