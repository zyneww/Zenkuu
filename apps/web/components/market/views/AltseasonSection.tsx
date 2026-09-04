import { getMoversUniverse } from '@zenkuu/data'
import { EmptyState, SourceNote, formatPercent } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { AltcoinSeasonGauge } from '@/components/market/AltcoinSeasonGauge'
import { computeAltcoinSeason } from '@/lib/altcoin-season'
import { getPhrase } from '@/lib/content'

/**
 * La carte compacte de la vue d'ensemble.
 *
 * Elle ne rend RIEN si l'indice n'est pas calculable, là où la vue complète affiche
 * un état vide expliqué. La différence est voulue : sur la page dédiée, l'absence est
 * le sujet — on est venu pour cet indice — alors qu'ici c'est une carte parmi
 * d'autres, et un encadré d'échec dans une colonne d'indicateurs occupe la place
 * d'une information au lieu d'en apporter une.
 */
export async function AltseasonCard() {
  const t = await getPhrase()
  const universe = await getMoversUniverse(100, 'eur')
  if (!universe.ok) return null

  const season = computeAltcoinSeason(universe.data)
  if (!season) return null

  return (
    <section className="rounded-card border border-border-subtle bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{t('Saison des altcoins')}</h2>

      <p className="tabular display-sm mt-3 leading-none text-ink">
        {Math.round(season.value)}
        <span className="text-base font-normal text-ink-muted"> /100</span>
      </p>

      <div className="mt-4 h-1.5 rounded-pill bg-gradient-to-r from-down via-ink-muted/40 to-brand">
        <div className="relative h-full">
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-canvas bg-ink"
            style={{ left: `${Math.min(100, Math.max(0, season.value))}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-between text-micro text-ink-muted">
        <span>{t('Saison de Bitcoin')}</span>
        <span>{t('Saison des altcoins')}</span>
      </div>

      <p className="mt-4 border-t border-border-subtle pt-3 text-xs leading-relaxed text-ink-muted">
        {t('Part des cent premières capitalisations qui font mieux que Bitcoin sur trente jours.')}{' '}
        <Link
          href="/graphiques/saison-altcoins"
          className="underline underline-offset-2 hover:text-ink"
        >
          {t('Voir le détail')}
        </Link>
      </p>
    </section>
  )
}

export async function AltseasonSection() {
  const t = await getPhrase()
  /* AUCUN APPEL SUPPLÉMENTAIRE : `getMoversUniverse(100)` alimente déjà la carte
     thermique et les classements, et sa clé de cache ne dépend d'aucun actif. La
     « saison des altcoins » est un comptage sur une donnée que le site a déjà —
     c'est précisément ce qui la rend calculable ici. */
  const universe = await getMoversUniverse(100, 'eur')

  if (!universe.ok || universe.data.length === 0) {
    return (
      <EmptyState
        title={t('Classement indisponible')}
        description={universe.ok ? null : universe.reason}
        source={universe.source?.label ?? null}
        tone={universe.ok ? 'neutral' : 'warning'}
      />
    )
  }

  const season = computeAltcoinSeason(universe.data)

  if (!season) {
    return (
      <EmptyState
        title={t('Indice incalculable')}
        description={t(
          'La source ne publie pas la variation de Bitcoin sur trente jours pour le moment. L’indice compte les actifs qui font mieux que lui : sans cette valeur, il n’a pas de point de comparaison.',
        )}
        tone="warning"
      />
    )
  }

  const { value, ahead, contenders, reference } = season

  /* Les dix plus gros écarts À BITCOIN, et non les dix plus fortes hausses : c'est
     l'écart qui fait l'indice, et un actif en baisse de 2 % pendant que Bitcoin perd
     20 % est en tête du comptage sans figurer nulle part dans un classement de
     hausses. */
  const ranked = [...contenders].sort(
    (left, right) => (right.change30d as number) - (left.change30d as number),
  )

  return (
    <div className="space-y-6">
      <AltcoinSeasonGauge
        value={value}
        outperformers={ahead.length}
        universe={contenders.length}
        windowDays={30}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpreadList
          title={t('Les dix plus gros écarts en tête')}
          rows={ranked.slice(0, 10)}
          reference={reference}
        />
        <SpreadList
          title={t('Les dix plus gros écarts en queue')}
          rows={ranked.slice(-10).reverse()}
          reference={reference}
        />
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        {t('Variation de Bitcoin sur la même fenêtre :')}{' '}
        <span className={reference >= 0 ? 'text-up' : 'text-down'}>
          {formatPercent(reference) ?? '—'}
        </span>
        {'. '}
        <SourceNote
          label={universe.source.label}
          href={universe.source.attributionUrl}
          strings={{ source: t('Source :'), dated: t('données du {date}') }}
        />
      </p>
    </div>
  )
}

/**
 * Une colonne d'actifs et leur écart à Bitcoin.
 *
 * L'ÉCART est la colonne principale, la variation brute la seconde : c'est l'écart
 * qui décide de l'indice, et le lire à côté de la variation évite d'avoir à faire la
 * soustraction de tête pour comprendre pourquoi une ligne est là.
 */
function SpreadList({
  title,
  rows,
  reference,
}: {
  title: string
  rows: { id: string; name: string; symbol: string; change30d?: number }[]
  reference: number
}) {
  return (
    <section className="rounded-card border border-border-subtle bg-surface">
      <h2 className="border-b border-border-subtle px-4 py-2.5 text-xs font-semibold text-ink">
        {title}
      </h2>
      <ul>
        {rows.map((asset) => {
          const change = asset.change30d as number
          const spread = change - reference
          return (
            <li
              key={asset.id}
              className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2 last:border-b-0"
            >
              <Link
                href={{ pathname: '/crypto/[id]', params: { id: asset.id } }}
                className="min-w-0 flex-1 truncate text-sm text-ink hover:text-brand"
              >
                {asset.name} <span className="text-xs uppercase text-ink-muted">{asset.symbol}</span>
              </Link>

              <span
                className={`tabular text-sm font-medium ${spread >= 0 ? 'text-up' : 'text-down'}`}
              >
                {spread >= 0 ? '+' : '−'}
                {Math.abs(spread).toFixed(1).replace('.', ',')} pts
              </span>
              <span className="tabular w-16 text-right text-xs text-ink-muted">
                {formatPercent(change) ?? '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
