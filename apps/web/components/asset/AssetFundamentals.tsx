import type { AssetProfile } from '@zenkuu/data'
import { formatCompact, formatNumber, formatPercent, formatShare } from '@zenkuu/ui'

import { Panel } from '@/components/ui/Panel'
import { getPhrase } from '@/lib/content'

/**
 * COMPTES D'UNE VALEUR BOURSIÈRE — valorisation, résultats, dividende.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUE LA FICHE D'UNE ACTION N'AVAIT PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elle portait un cours, une courbe, quelques ratios dans le rail et un consensus
 * d'analystes. C'est-à-dire tout ce qui décrit le TITRE, et rien de ce qui décrit
 * l'ENTREPRISE — ce qu'elle encaisse, ce qu'elle en garde, ce qu'elle doit, ce
 * qu'elle a publié le trimestre dernier et quand elle publiera le prochain.
 *
 * L'écart se voit sur une valeur de croissance. Un cours/bénéfice de 55 se lit comme
 * cher ; le même titre affichant 74 % de marge brute et 85 % de croissance du chiffre
 * d'affaires ne raconte plus la même histoire. Publier le premier sans les seconds,
 * c'est publier la moitié qui inquiète.
 *
 * Tout arrive dans LA MÊME requête que les ratios déjà chargés — voir `modulesFor`
 * dans le fournisseur. Cette section ne coûte aucun appel réseau supplémentaire.
 *
 * ── TROIS PANNEAUX, ET CHACUN DISPARAÎT SEUL ─────────────────────────────────
 *
 * Une société qui ne verse rien n'a pas de panneau « Dividende » vide : elle n'en a
 * pas du tout. Une société non couverte par les analystes n'a pas de calendrier de
 * résultats. C'est la règle du §5 appliquée au niveau du bloc et non du champ — un
 * panneau de six tirets apprend moins que son absence.
 *
 * ── POURQUOI CETTE SECTION EST DANS « ANALYSE » ──────────────────────────────
 *
 * Elle aurait pu ouvrir l'Aperçu, à côté de la courbe. Elle est rangée avec les
 * indicateurs techniques et les mesures de risque parce qu'elle répond à la même
 * intention : regarder l'actif DE PRÈS, après avoir vu son cours. L'Aperçu répond à
 * « combien », l'Analyse à « pourquoi ».
 */
export async function AssetFundamentals({
  profile,
  currency,
  assetName,
}: {
  profile: AssetProfile
  /** Devise de COTATION, dans laquelle la source publie ces montants. */
  currency: string
  assetName: string
}) {
  const t = await getPhrase()
  const valuation = profile.valuation
  const earnings = profile.earnings
  const dividend = profile.dividend

  if (!valuation && !earnings && !dividend) return null

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        {/* « Comptes de l'entreprise » et non « Fondamentaux » : le rail ouvre déjà par
            une carte de ce nom, et deux titres homonymes sur la même page laissent le
            lecteur chercher lequel porte quoi. Celui-ci décrit d'ailleurs mieux ce qu'il
            coiffe — ce sont les comptes publiés de la société, pas des repères de
            marché. Même arbitrage que pour « Valorisation » dans `AssetProfileRail`. */}
        <h2 className="display-sm text-ink">{t('Comptes de l’entreprise')}</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Ce que {assetName} gagne et ce qu’elle doit, tel que la société le publie. Les
          montants sont en {currency.toUpperCase()}, devise de cotation — ils ne suivent pas
          la devise d’affichage, parce qu’un chiffre d’affaires converti au taux du jour
          n’est comparable à rien.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {valuation ? <ValuationPanel valuation={valuation} currency={currency} /> : null}
        {earnings ? <EarningsPanel earnings={earnings} /> : null}
        {dividend ? <DividendPanel dividend={dividend} currency={currency} /> : null}
      </div>
    </section>
  )
}

/* ── Valorisation et rentabilité ──────────────────────────────────────────── */

/**
 * Trois familles dans un seul panneau, séparées par des filets.
 *
 * L'ordre suit une question qui se déroule : combien vaut l'ensemble (valeur
 * d'entreprise et ses multiples), combien il gagne sur ce qu'il vend (marges), et
 * avec quel argent il fonctionne (trésorerie, dette). Les éclater en trois panneaux
 * distincts ferait trois cartes de quatre lignes, et perdrait l'enchaînement.
 */
async function ValuationPanel({
  valuation,
  currency,
}: {
  valuation: NonNullable<AssetProfile['valuation']>
  currency: string
}) {
  const t = await getPhrase()
  const money = (value: number | undefined) =>
    value === undefined ? null : `${formatCompact(value)} ${currency.toUpperCase()}`

  const multiple = (value: number | undefined) =>
    value === undefined ? null : formatNumber(value, 1)

  const size: Row[] = [
    { label: 'Valeur d’entreprise', value: money(valuation.enterpriseValue), hint: 'capitalisation + dette − trésorerie' },
    { label: 'Chiffre d’affaires', value: money(valuation.revenue), hint: 'sur douze mois glissants' },
    { label: 'VE / EBITDA', value: multiple(valuation.evToEbitda) },
    { label: 'VE / chiffre d’affaires', value: multiple(valuation.evToRevenue) },
    { label: 'Cours / chiffre d’affaires', value: multiple(valuation.priceToSales) },
    { label: 'PEG', value: multiple(valuation.pegRatio), hint: 'C/B rapporté à la croissance attendue' },
  ]

  const margins: Row[] = [
    { label: 'Marge brute', value: formatShare(valuation.grossMargin) },
    { label: 'Marge d’exploitation', value: formatShare(valuation.operatingMargin) },
    { label: 'Marge nette', value: formatShare(valuation.profitMargin) },
    { label: 'Rentabilité des capitaux', value: formatShare(valuation.returnOnEquity), hint: 'ROE' },
    { label: 'Rentabilité de l’actif', value: formatShare(valuation.returnOnAssets), hint: 'ROA' },
    /* Les croissances portent un SIGNE — d'où `formatPercent` et non `formatShare` :
       un chiffre d'affaires en recul de 12 % affiché « 12 % » dirait l'inverse. */
    { label: 'Croissance du chiffre d’affaires', value: formatPercent(valuation.revenueGrowth), hint: 'sur un an' },
    { label: 'Croissance du bénéfice', value: formatPercent(valuation.earningsGrowth), hint: 'sur un an' },
  ]

  const balance: Row[] = [
    { label: 'Trésorerie', value: money(valuation.totalCash) },
    { label: 'Dette totale', value: money(valuation.totalDebt) },
    { label: 'Dette / capitaux propres', value: formatShare(valuation.debtToEquity) },
    { label: 'Flux de trésorerie libre', value: money(valuation.freeCashflow) },
    { label: 'Actions en circulation', value: formatCompact(valuation.sharesOutstanding) },
    { label: 'Flottant', value: formatCompact(valuation.floatShares), hint: 'part réellement échangeable' },
  ]

  const groups = [size, margins, balance].map(keepFilled).filter((rows) => rows.length > 0)
  if (groups.length === 0) return null

  return (
    <Panel title={t('Valorisation et rentabilité')} subtitle={t('Yahoo Finance, derniers comptes publiés')}>
      <div className="space-y-3">
        {groups.map((rows, index) => (
          <dl
            key={rows[0]?.label ?? index}
            className={index > 0 ? 'border-t border-border-subtle pt-3' : undefined}
          >
            {rows.map((row) => (
              <RowLine key={row.label} row={row} />
            ))}
          </dl>
        ))}
      </div>
    </Panel>
  )
}

/* ── Résultats ────────────────────────────────────────────────────────────── */

/**
 * Les quatre derniers trimestres, en COUPLE publié / attendu.
 *
 * ── POURQUOI L'ÉCART EST CALCULÉ ET AFFICHÉ ──────────────────────────────────
 *
 * Un bénéfice par action de 1,87 ne dit rien seul. Rapporté aux 1,77 qu'attendait le
 * consensus, il dit que la société a dépassé les attentes de 5,5 % — et c'est CET
 * écart, pas le niveau absolu, qui fait bouger un cours le lendemain d'une
 * publication. Laisser le lecteur faire la division à la main reviendrait à publier
 * la matière première sans l'information.
 *
 * ── LA PROCHAINE DATE EST EN TÊTE, ET C'EST VOULU ────────────────────────────
 *
 * C'est le seul mouvement de cours de la fiche dont on connaisse la date à l'avance.
 * L'enterrer sous quatre lignes d'historique inverserait l'ordre d'importance.
 */
async function EarningsPanel({ earnings }: { earnings: NonNullable<AssetProfile['earnings']> }) {
  const t = await getPhrase()
  const quarters = earnings.quarters ?? []
  const years = earnings.years ?? []
  const next = earnings.nextDate ? formatDay(earnings.nextDate) : null

  if (quarters.length === 0 && years.length === 0 && !next) return null

  return (
    <Panel title={t('Résultats')} subtitle={t('Bénéfice par action, publié contre attendu')}>
      <div className="space-y-3">
        {next ? (
          <p className="rounded-card bg-surface-muted px-3 py-2 text-xs leading-relaxed text-ink">
            Prochaine publication annoncée le{' '}
            <span className="font-semibold">{next}</span>
            {earnings.nextEstimate !== undefined ? (
              <>
                {' '}· consensus {formatNumber(earnings.nextEstimate, 2)} par action
              </>
            ) : null}
            .
          </p>
        ) : null}

        {quarters.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-muted">
                <th scope="col" className="pb-1.5 text-left font-medium">Trimestre</th>
                <th scope="col" className="pb-1.5 text-right font-medium">Attendu</th>
                <th scope="col" className="pb-1.5 text-right font-medium">{t('Publié')}</th>
                <th scope="col" className="pb-1.5 text-right font-medium">Écart</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((quarter) => {
                const surprise =
                  quarter.actual !== undefined &&
                  quarter.estimate !== undefined &&
                  quarter.estimate !== 0
                    ? ((quarter.actual - quarter.estimate) / Math.abs(quarter.estimate)) * 100
                    : undefined

                return (
                  <tr key={quarter.period} className="border-t border-border-subtle/60">
                    <td className="py-1.5 text-ink">{frenchQuarter(quarter.period)}</td>
                    <td className="tabular py-1.5 text-right text-ink-muted">
                      {formatNumber(quarter.estimate, 2) ?? '—'}
                    </td>
                    <td className="tabular py-1.5 text-right font-medium text-ink">
                      {formatNumber(quarter.actual, 2) ?? '—'}
                    </td>
                    <td
                      className={`tabular py-1.5 text-right font-medium ${
                        surprise === undefined
                          ? 'text-ink-muted'
                          : surprise >= 0
                            ? 'text-up'
                            : 'text-down'
                      }`}
                    >
                      {formatPercent(surprise) ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : null}

        {years.length > 0 ? (
          <div className="border-t border-border-subtle pt-3">
            <p className="mb-1.5 text-micro font-medium uppercase tracking-wide text-ink-muted">{t('Par exercice')}</p>
            <dl>
              {years.map((year) => (
                <div
                  key={year.year}
                  className="flex items-baseline justify-between gap-3 border-b border-border-subtle/60 py-1.5 last:border-0"
                >
                  <dt className="tabular text-xs text-ink-muted">{year.year}</dt>
                  <dd className="tabular text-xs text-ink">
                    {formatCompact(year.revenue) ?? '—'}
                    {year.earnings !== undefined ? (
                      <span className="ml-2 text-ink-muted">
                        dont {formatCompact(year.earnings)} de résultat
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

/* ── Dividende ────────────────────────────────────────────────────────────── */

/**
 * Le rendement, et ce qui le rend soutenable.
 *
 * Le taux de distribution accompagne TOUJOURS le rendement, et l'ordre des lignes le
 * dit : un rendement de 9 % adossé à une distribution de 180 % signale une société
 * qui verse plus qu'elle ne gagne, ce qui ne dure pas. Afficher le premier seul
 * reviendrait à mettre en avant le chiffre qui attire sans celui qui prévient.
 */
function DividendPanel({
  dividend,
  currency,
}: {
  dividend: NonNullable<AssetProfile['dividend']>
  currency: string
}) {
  const rows = keepFilled([
    {
      label: 'Rendement',
      value: formatShare(dividend.yieldPercent),
      hint: 'sur le cours actuel',
    },
    {
      label: 'Montant annuel',
      value:
        dividend.rate === undefined
          ? null
          : `${formatNumber(dividend.rate, 2)} ${currency.toUpperCase()} / action`,
    },
    {
      label: 'Taux de distribution',
      value: formatShare(dividend.payoutRatio),
      hint: 'part du bénéfice reversée',
    },
    {
      label: 'Moyenne sur cinq ans',
      value: formatShare(dividend.fiveYearAverageYield),
      hint: 'rendement moyen, pour situer celui d’aujourd’hui',
    },
    { label: 'Détachement', value: dividend.exDate ? formatDay(dividend.exDate) : null },
    { label: 'Versement', value: dividend.payDate ? formatDay(dividend.payDate) : null },
  ])

  if (rows.length === 0) return null

  return (
    <Panel title="Dividende">
      <dl>
        {rows.map((row) => (
          <RowLine key={row.label} row={row} />
        ))}
      </dl>
    </Panel>
  )
}

/* ── Pièces communes ──────────────────────────────────────────────────────── */

interface Row {
  label: string
  value: string | null
  hint?: string
}

/** Écarte les lignes sans valeur — un champ absent reste absent (§5). */
function keepFilled(rows: Row[]): Row[] {
  return rows.filter((row): row is Row & { value: string } => row.value !== null)
}

function RowLine({ row }: { row: Row }) {
  return (
    <div className="border-b border-border-subtle/60 py-1.5 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <dt className="min-w-0 flex-1 text-xs text-ink-muted">{row.label}</dt>
        <dd className="tabular shrink-0 text-xs font-medium text-ink">{row.value}</dd>
      </div>
      {/* L'explication sous la ligne plutôt qu'en infobulle : ces notions ne sont pas
          connues du lecteur qui arrive d'un moteur de recherche, et une aide qu'il faut
          découvrir au survol n'aide que ceux qui savent déjà qu'elle existe. */}
      {row.hint ? (
        <p className="text-micro leading-snug text-ink-muted opacity-80">{row.hint}</p>
      ) : null}
    </div>
  )
}

/**
 * « 3Q2025 » → « T3 2025 ».
 *
 * La source publie ses trimestres à l'américaine. Les laisser tels quels sur un site
 * francophone ferait le seul libellé anglais d'un tableau par ailleurs traduit — et
 * « Q » ne veut rien dire pour un lecteur qui n'a pas l'habitude des rapports
 * financiers. Une chaîne non reconnue est rendue INCHANGÉE plutôt que déformée : la
 * source pourrait changer de convention sans prévenir.
 */
function frenchQuarter(period: string): string {
  const match = /^(\d)Q(\d{4})$/.exec(period)
  return match ? `T${match[1]} ${match[2]}` : period
}

/** Date seule, sans heure : ces événements sont datés au jour, jamais à la minute. */
function formatDay(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
