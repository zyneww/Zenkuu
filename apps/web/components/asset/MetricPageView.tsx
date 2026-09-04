import { getPhrase } from '@/lib/content'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import type { AssetClass } from '@zenkuu/data'
import { getAsset, getAssetHistory } from '@zenkuu/data'
import {
  ChangeBadge,
  EmptyState,
  PriceChart,
  SourceNote,
  formatCompact,
  formatCurrency,
  formatDateTime,
  formatShare,
} from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { InfoTip } from '@/components/ui/InfoTip'
import { assetHref, marketHref } from '@/lib/asset-routes'
import {
  availableMetrics,
  extremeMessage,
  getMetric,
  metricHref,
  type MetricDef,
} from '@/lib/asset-metrics'
import { fr } from '@/content/fr'

/**
 * Page dédiée à UNE métrique d'UN actif.
 *
 * ── POURQUOI CES PAGES EXISTENT ───────────────────────────────────────────────
 *
 * Deux raisons, et la seconde compte autant que la première.
 *
 * D'usage : le rail donne un nombre, l'infobulle donne une phrase, mais « pourquoi
 * la valorisation diluée de cet actif vaut-elle quatre fois sa capitalisation »
 * demande une page — la définition complète, la série dans le temps, et les mesures
 * voisines qui l'éclairent.
 *
 * De référencement : ce sont des milliers de pages de texte UNIQUE et durable, là où
 * une fiche d'actif est surtout faite de nombres qui changent toutes les heures. Sur
 * un site dont l'acquisition passe d'abord par la recherche (§9), une page qui
 * répond à « capitalisation Bitcoin » vaut mieux qu'une section noyée dans une fiche.
 *
 * ── LA FENÊTRE EST D'UN AN, PAS DE SEPT JOURS ─────────────────────────────────
 *
 * La fiche sert sept jours au premier rendu, pour le LCP. Ici c'est l'inverse : on
 * vient VOIR l'évolution, une semaine ne montrerait rien. L'appel est le même et son
 * cache aussi ; seule la fenêtre change.
 *
 * ── AUCUN GRAPHIQUE INVENTÉ ───────────────────────────────────────────────────
 *
 * Trois métriques seulement ont une série réelle : le cours, la capitalisation et le
 * volume — toutes trois transportées par la MÊME réponse `market_chart`, donc sans
 * appel supplémentaire. Les autres (offre, extrêmes, rang) n'existent qu'à l'instant
 * présent chez la source. Leur page l'annonce explicitement au lieu de tracer une
 * ligne plate qui aurait l'air d'une donnée (§5).
 */

/** Un an : c'est la fenêtre qui rend une évolution lisible sans coûter un second appel. */
const RANGE_DAYS = 365

export interface MetricPageViewProps {
  assetClass: AssetClass
  id: string
  /** Segment d'URL de la métrique — `capitalisation`, `volume-24h`… */
  slug: string
}

export async function MetricPageView({ assetClass, id, slug }: MetricPageViewProps) {
  const metric = getMetric(slug)

  // Slug inconnu : c'est un 404 au sens propre. La liste des métriques est fermée et
  // connue à la compilation — une URL hors liste n'a jamais désigné de ressource, et
  // la laisser répondre 200 la rendrait indexable pour rien.
  if (!metric) notFound()

  const t = await getTranslations('metric')
  const tp = await getTranslations('metricPage')

  const [asset, history] = await Promise.all([
    getAsset(id, assetClass, 'eur'),
    // Chargé même pour une métrique sans série : la réponse est mise en cache et
    // sert la note de source et la fraîcheur, que toutes les pages affichent.
    getAssetHistory(id, assetClass, RANGE_DAYS, 'eur'),
  ])

  if (!asset.ok && asset.kind === 'notFound') notFound()

  if (!asset.ok) {
    return (
      <EmptyState
        title={fr.asset.notFoundTitle}
        description={asset.reason}
        source={asset.source?.label ?? null}
        tone="warning"
      />
    )
  }

  const data = asset.data
  const value = metric.read(data)

  // La métrique existe dans le registre mais pas pour CET actif — une paire de
  // devises n'a pas d'offre en circulation. C'est un 404 également : l'URL décrit
  // une mesure qui n'existe pas ici, et rien ne justifie de l'indexer.
  if (value === undefined) notFound()

  const message =
    metric.message === 'ath' || metric.message === 'atl'
      ? extremeMessage(metric.message, assetClass)
      : metric.message

  const label = t(`${message}.label`)
  const help = t(`${message}.help`)
  const isForex = assetClass === 'forex'

  // Points de la série demandée. `filter` et non `map` avec zéro : un point dont la
  // source n'a pas publié le volume est un TROU, pas un volume nul — le tracer à
  // zéro dessinerait un effondrement qui n'a pas eu lieu.
  const points =
    metric.series && history.ok
      ? history.data.points
          .map((point) => ({
            timestamp: point.timestamp,
            price:
              metric.series === 'price'
                ? point.price
                : metric.series === 'volume'
                  ? point.volume
                  : point.marketCap,
          }))
          .filter((point): point is { timestamp: number; price: number } => point.price !== undefined)
      : []

  const siblings = availableMetrics(data).filter((entry) => entry.slug !== metric.slug)

  /* ⚠️ PAS `t` : CE FICHIER EN A DÉJÀ UN, ET D'UN AUTRE SYSTÈME.
     `t` y vaut `getTranslations('metric')` et `tp` `getTranslations('metricPage')` —
     next-intl, dont les clés vivent dans `messages/*.json`. La table de phrases est
     une seconde voie, dont le nom doit donc différer. */
  const phrase = await getPhrase()

  return (
    <div className="space-y-6">
      <nav aria-label={phrase('Fil d’Ariane')} className="text-xs text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand">
              {fr.nav.home}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={marketHref(assetClass)} className="hover:text-brand">
              {fr.assetClass[assetClass]}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={assetHref(assetClass, data.id)} className="hover:text-brand">
              {data.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-ink" aria-current="page">
            {label}
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <AssetLogo asset={data} size={40} />
          <div>
            <p className="text-xs text-ink-muted">
              <Link href={assetHref(assetClass, data.id)} className="hover:text-brand">
                {data.name} <span className="uppercase">{data.symbol}</span>
              </Link>
            </p>
            <h1 className="flex items-center gap-2 display-xl text-ink">
              {label}
              {/* ⚠️ LE LIBELLÉ PASSE PAR LA TABLE, ET IL NE LE FAISAIT PAS.

              Il s'écrivait `` `À propos de : ${label}` `` — un gabarit français dans un
              `aria-label`, donc invisible à l'œil et lu tel quel par toute synthèse
              vocale, quelle que soit la langue du site. Relevé sur la page anglaise :
              quinze occurrences de « À propos de : Market cap » sur la seule fiche
              d'actif.

              C'est exactement la famille de défauts que le projet dit avoir éliminée —
              « les libellés passés en attribut ou en ternaire rejoignent la table » —
              et elle avait survécu ici parce qu'un attribut ne se relit jamais. */}
          <InfoTip content={help} label={phrase('À propos de : {nom}').replace('{nom}', label)} />
            </h1>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[0.6875rem] uppercase tracking-wide text-ink-muted">
            {tp('currentValue')}
          </p>
          <p className="figure text-3xl font-bold text-ink">
            <MetricValue metric={metric} value={value} asset={data} isForex={isForex} />
          </p>
          {metric.readChange?.(data) !== undefined ? (
            <ChangeBadge value={metric.readChange(data)} size="sm" />
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {metric.series ? (
            points.length > 1 ? (
              <section className="space-y-3">
                {/*
                  Les formateurs sont INJECTÉS : `PriceChart` ne décide pas comment
                  lire un nombre, c'est l'appelant qui sait s'il trace des euros, des
                  jetons ou un pourcentage. Une capitalisation en axe complet
                  (« 12 284 913 004 ») rendrait l'axe illisible, d'où le compact.

                  Le graphique est rendu côté serveur, donc dans la devise de la
                  SOURCE et non dans celle choisie par le lecteur — comme celui de la
                  fiche. La note de source juste dessous le dit.
                */}
                <PriceChart
                  points={points}
                  currency={data.currency}
                  label={`${label} · ${data.name}`}
                  formatPrice={(value) =>
                    metric.kind === 'quantity'
                      ? `${formatCompact(value)} ${data.symbol.toUpperCase()}`
                      : formatCurrency(value, data.currency, { compact: true })
                  }
                  formatDate={(timestamp) => formatDateTime(new Date(timestamp).toISOString()) ?? ''}
                />
                {history.ok ? (
                  <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
                    label={history.source.label}
                    href={history.source.attributionUrl}
                    updatedAt={data.lastUpdated}
                  />
                ) : null}
              </section>
            ) : (
              <EmptyState
                title={fr.states.unavailableTitle}
                description={tp('noSeriesBody')}
                compact
              />
            )
          ) : (
            /* Absence ASSUMÉE et expliquée. Une page sans graphique là où les
               voisines en ont une passerait pour un défaut si elle ne disait pas
               pourquoi. */
            <section className="rounded-card border border-border-subtle bg-surface-muted px-4 py-4">
              <h2 className="text-sm font-semibold text-ink">{tp('noSeriesTitle')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{tp('noSeriesBody')}</p>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">{tp('definitionTitle')}</h2>
            <p className="max-w-2xl text-base leading-relaxed text-ink-muted">{help}</p>
          </section>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">
            {tp('otherMetrics', { name: data.name })}
          </h2>
          <ul className="divide-y divide-border-subtle">
            {siblings.map((entry) => {
              const siblingMessage =
                entry.message === 'ath' || entry.message === 'atl'
                  ? extremeMessage(entry.message, assetClass)
                  : entry.message
              const siblingValue = entry.read(data)

              return (
                <li key={entry.slug}>
                  <Link
                    href={metricHref(assetClass, data.id, entry.slug)}
                    className="flex items-baseline justify-between gap-2 py-2 transition-opacity hover:opacity-75"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                      {t(`${siblingMessage}.label`)}
                    </span>
                    <span className="tabular shrink-0 text-xs font-medium text-ink">
                      {siblingValue !== undefined ? (
                        <MetricValue
                          metric={entry}
                          value={siblingValue}
                          asset={data}
                          isForex={isForex}
                        />
                      ) : null}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <Link
            href={assetHref(assetClass, data.id)}
            className="inline-block text-xs font-medium text-ink hover:underline"
          >
            {tp('backToAsset')}
          </Link>
        </aside>
      </div>
    </div>
  )
}

/**
 * Valeur d'une métrique, formatée selon sa NATURE et non selon l'endroit où elle
 * s'affiche.
 *
 * Extrait du rail et de la page pour qu'un montant compact reste compact aux deux
 * endroits : deux implémentations divergeraient au premier ajout de métrique.
 */
function MetricValue({
  metric,
  value,
  asset,
  isForex,
}: {
  metric: MetricDef
  value: number | string
  asset: { currency: string; symbol: string }
  isForex: boolean
}) {
  switch (metric.kind) {
    case 'money':
      return metric.group === 'market' ? (
        <Money value={Number(value)} from={asset.currency} compact />
      ) : (
        <Money value={Number(value)} from={asset.currency} asRate={isForex} />
      )
    case 'quantity':
      return <>{`${formatCompact(Number(value))} ${asset.symbol.toUpperCase()}`}</>
    case 'percent':
      return <>{formatShare(Number(value))}</>
    case 'rank':
      return <>{`#${value}`}</>
    case 'change':
      return <ChangeBadge value={Number(value)} size="sm" />
    default:
      return <>{String(value)}</>
  }
}
