import { formatCurrency } from '@zenith/ui'

/**
 * Cours dans les autres devises.
 *
 * Ce sont des COTATIONS RÉELLES et non des conversions : la source publie le prix
 * devise par devise dans la même réponse. Les afficher revient donc à montrer une
 * donnée sourcée, pas un produit par un taux de change — d'où l'absence de mention
 * « taux du … », qui n'aurait aucun sens ici.
 *
 * La liste est bornée aux devises du sélecteur du site : la source en publie une
 * soixantaine, dont des dizaines qu'aucun visiteur francophone ne cherche, et une
 * grille de soixante lignes noierait les quelques-unes qui comptent.
 */
const DISPLAY_CURRENCIES: { code: string; label: string }[] = [
  { code: 'usd', label: 'Dollar américain' },
  { code: 'eur', label: 'Euro' },
  { code: 'gbp', label: 'Livre sterling' },
  { code: 'chf', label: 'Franc suisse' },
  { code: 'jpy', label: 'Yen japonais' },
  { code: 'cad', label: 'Dollar canadien' },
]

export function AssetGlobalPrices({
  symbol,
  pricesByCurrency,
}: {
  symbol: string
  pricesByCurrency: Record<string, number>
}) {
  const rows = DISPLAY_CURRENCIES.filter(
    (entry) => typeof pricesByCurrency[entry.code] === 'number',
  )
  if (rows.length < 2) return null

  return (
    <section aria-labelledby="prix-mondiaux" className="space-y-2">
      <h2 id="prix-mondiaux" className="text-sm font-semibold text-ink">
        Cours dans d’autres devises
      </h2>

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((entry) => (
          <div
            key={entry.code}
            className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-1.5"
          >
            <dt className="text-xs text-ink-muted">
              <span className="font-medium uppercase text-ink">
                {symbol}/{entry.code.toUpperCase()}
              </span>{' '}
              {entry.label}
            </dt>
            <dd className="tabular shrink-0 text-sm text-ink">
              {formatCurrency(pricesByCurrency[entry.code], entry.code.toUpperCase())}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
