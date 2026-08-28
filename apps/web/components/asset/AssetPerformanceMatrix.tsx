import type { AssetDetail, MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PERFORMANCE PAR PAIRE ET PAR PÉRIODE — UNE MATRICE, ET ELLE EST DÉRIVÉE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LA QUESTION À LAQUELLE ELLE RÉPOND ──────────────────────────────────────
 *
 * « +35 % sur sept jours » ne dit pas si c'est bien. Si le marché entier a pris 40 %
 * sur la même semaine, l'actif a en réalité PERDU du terrain — et c'est cette lecture
 * que le pourcentage en euros ne donne jamais. La matrice met la même période en
 * regard de plusieurs dénominateurs : contre la monnaie, contre le bitcoin, contre
 * l'ether. Trois réponses à « a-t-il monté », dont deux seulement disent « a-t-il fait
 * mieux ».
 *
 * ── ⚠️ TOUT SAUF LA PREMIÈRE LIGNE EST CALCULÉ, ET LA FORMULE COMPTE ────────
 *
 * La source ne publie la variation en bitcoin que sur VINGT-QUATRE HEURES
 * (`changesByCurrency`). Les autres cases viennent d'une composition :
 *
 *     variation relative = (1 + a) / (1 + b) − 1
 *
 * où `a` est la variation de l'actif sur la période et `b` celle du repère sur la
 * MÊME période. Ce n'est pas une approximation : c'est l'identité exacte entre deux
 * rapports de prix, et elle est vraie quelle que soit l'amplitude.
 *
 * Ce n'est PAS `a − b`, la soustraction naïve. L'écart entre les deux est négligeable
 * sur des variations de quelques pour cent et devient grossier sur les grandes : un
 * actif à +180 % contre un repère à +60 % donne +75 % par la formule juste, +120 % par
 * la soustraction. Sur un marché où les +180 % existent, la différence n'est pas
 * théorique.
 *
 * ── CE QUI EST ABSENT RESTE ABSENT ──────────────────────────────────────────
 *
 * Une case vide signifie qu'une des deux variations manque — l'actif ou le repère.
 * Elle affiche un tiret et n'est jamais comblée par la période voisine (§5). C'est
 * fréquent hors crypto : Yahoo ne publie que le jour et la semaine.
 */

/** Les périodes, dans l'ordre où on les lit — de la plus courte à la plus longue. */
const PERIODS = [
  { key: 'change1h', label: '1 h' },
  { key: 'change24h', label: '24 h' },
  { key: 'change7d', label: '7 j' },
  { key: 'change14d', label: '14 j' },
  { key: 'change30d', label: '30 j' },
  { key: 'change1y', label: '1 an' },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

/**
 * Variation de `asset` exprimée dans l'unité de `benchmark`, sur la même période.
 *
 * `null` dès qu'une des deux manque : voir la note en tête sur les cases vides.
 */
function relative(asset: number | undefined, benchmark: number | undefined): number | null {
  if (asset === undefined || benchmark === undefined) return null
  if (!Number.isFinite(asset) || !Number.isFinite(benchmark)) return null

  /* Un repère qui aurait perdu 100 % rendrait le dénominateur nul. Le cas ne se
     produit pas sur un actif coté, mais une division par zéro rendrait `Infinity`,
     qui s'afficherait comme un pourcentage géant plutôt que comme une absence. */
  const divisor = 1 + benchmark / 100
  if (divisor <= 0) return null

  return ((1 + asset / 100) / divisor - 1) * 100
}

export async function AssetPerformanceMatrix({
  asset,
  benchmarks,
}: {
  asset: AssetDetail
  /**
   * Repères contre lesquels exprimer la performance.
   *
   * Fournis par l'appelant plutôt que chargés ici : ce sont des lignes du classement
   * que la page a DÉJÀ en main, et les redemander doublerait un appel réseau pour la
   * même donnée. Une liste vide retire le composant.
   */
  benchmarks: MarketAsset[]
}) {
  const t = await getPhrase()

  const usable = benchmarks.filter((entry) => entry.id !== asset.id)
  if (usable.length === 0) return null

  /* La première ligne est l'actif contre la MONNAIE : ses variations telles que la
     source les publie, sans aucun calcul. C'est la ligne de référence, et c'est
     pourquoi elle ouvre la table — tout ce qui suit s'en déduit. */
  const rows = [
    {
      label: `${asset.symbol.toUpperCase()}/${asset.currency.toUpperCase()}`,
      derived: false,
      values: Object.fromEntries(
        PERIODS.map((period) => [period.key, asset[period.key] ?? null]),
      ) as Record<PeriodKey, number | null>,
    },
    ...usable.map((benchmark) => ({
      label: `${asset.symbol.toUpperCase()}/${benchmark.symbol.toUpperCase()}`,
      derived: true,
      values: Object.fromEntries(
        PERIODS.map((period) => [period.key, relative(asset[period.key], benchmark[period.key])]),
      ) as Record<PeriodKey, number | null>,
    })),
  ]

  return (
    <section aria-labelledby="matrice-titre" className="space-y-3">
      <div className="space-y-1">
        <h2 id="matrice-titre" className="display-sm text-ink">
          {t('Performance par paire')}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          {t(
            'La même période, comptée dans plusieurs unités. Une hausse en monnaie peut être une baisse en bitcoin : c’est ce que la première ligne ne dit pas et que les suivantes montrent.',
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <caption className="sr-only">
            {t('Performance de')} {asset.name} {t('par paire et par période')}
          </caption>
          <thead>
            <tr className="border-b border-border-subtle bg-surface-muted/35 text-left text-xs text-ink-muted">
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('Paire')}</th>
              {PERIODS.map((period) => (
                <th
                  key={period.key}
                  scope="col"
                  className="border-l border-border-subtle/60 px-4 py-2.5 text-right font-semibold"
                >
                  {period.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <tr key={row.label} className="transition-colors hover:bg-surface-muted/30">
                <th scope="row" className="px-4 py-2.5 text-left font-medium text-ink">
                  <span className="tabular">{row.label}</span>
                </th>

                {PERIODS.map((period) => {
                  const value = row.values[period.key]

                  return (
                    <td
                      key={period.key}
                      className="border-l border-border-subtle/60 px-4 py-2.5 text-right"
                    >
                      {value === null ? (
                        <span className="text-ink-muted/60">—</span>
                      ) : (
                        <ChangeBadge value={value} size="sm" periodLabel={period.label} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        {t(
          'La première ligne est publiée par la source. Les suivantes sont calculées en rapportant la variation de l’actif à celle du repère sur la même période — un rapport de rapports, non une soustraction. Une case vide signifie que l’une des deux variations n’est pas publiée.',
        )}
      </p>
    </section>
  )
}
