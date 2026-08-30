'use client'

import { useMemo, useState } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import { Link } from '@/i18n/navigation'
import { RankingDetailLink } from '@/components/market/RankingDetailLink'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, EmptyState, Sparkline } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Tableau de classements — plusieurs palmarès CÔTE À CÔTE.
 *
 * C'est ce qui distingue cette page de `/crypto` : là-bas un tableau unique que l'on
 * trie, ici plusieurs classements simultanés que l'on compare. Voir les hausses, les
 * baisses et les volumes du même coup d'œil dit quelque chose qu'aucun des trois ne
 * dit isolément — par exemple qu'une forte hausse se fait sans volume.
 *
 * La période s'applique à TOUS les classements en même temps, et c'est délibéré :
 * comparer des hausses sur 1 h à des baisses sur 7 j n'aurait aucun sens, et laisser
 * une période par colonne rendrait l'erreur facile.
 */

type Period = '1h' | '24h' | '7d' | '30d'

const PERIODS: { key: Period; label: string; field: keyof MarketAsset; long: string }[] = [
  { key: '1h', label: '1 h', field: 'change1h', long: 'sur 1 heure' },
  { key: '24h', label: '24 h', field: 'change24h', long: 'sur 24 heures' },
  { key: '7d', label: '7 j', field: 'change7d', long: 'sur 7 jours' },
  { key: '30d', label: '30 j', field: 'change30d', long: 'sur 30 jours' },
]

const ROWS = 10

export function RankingBoard({
  assets,
  scopeLabel,
}: {
  assets: MarketAsset[]
  /**
   * Phrase de périmètre. Absente, le défaut parle de CAPITALISATIONS.
   *
   * ── POURQUOI CE DÉFAUT NE PEUT PLUS ÊTRE LE SEUL TEXTE POSSIBLE ────────────
   *
   * Il était écrit en dur : « Classements calculés sur les N plus grandes
   * capitalisations ». Vrai tant que ce tableau ne servait que la crypto, faux dès
   * qu'il en sert d'autres — et faux d'une manière qui ne se voit pas, puisque la
   * phrase reste grammaticalement impeccable.
   *
   * Relevé sur `/classements?classe=devises` : « Classements calculés sur les 8 plus
   * grandes capitalisations », alors qu'une paire de change n'a AUCUNE
   * capitalisation. Même défaut sur les matières premières. La page affirmait un
   * critère de tri qui n'existe pas pour ces classes.
   *
   * L'appelant, lui, sait de quelle classe il parle : c'est donc à lui de fournir la
   * phrase juste quand le défaut ne l'est pas.
   */
  scopeLabel?: string
}) {
  const t = usePhrase()
  const [period, setPeriod] = useState<Period>('24h')

  const meta = PERIODS.find((entry) => entry.key === period) ?? PERIODS[1]!
  const field = meta.field

  const boards = useMemo(() => {
    const rated = assets.filter((asset) => typeof asset[field] === 'number')
    const sorted = [...rated].sort((a, b) => (b[field] as number) - (a[field] as number))

    // Filtrage PAR SIGNE, comme partout ailleurs sur le site : sans lui, « plus
    // fortes baisses » se remplirait d'actifs en hausse les jours où tout monte.
    const gainers = sorted.filter((asset) => (asset[field] as number) > 0).slice(0, ROWS)
    const losers = sorted
      .filter((asset) => (asset[field] as number) < 0)
      .slice(-ROWS)
      .reverse()

    const byVolume = [...assets]
      .filter((asset) => typeof asset.volume24h === 'number')
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, ROWS)

    /**
     * Rotation : volume rapporté à la capitalisation.
     *
     * Ce n'est pas une donnée de la source mais un RAPPORT de deux valeurs qu'elle
     * publie — ce qui est légitime, contrairement à une estimation. Il révèle les
     * actifs qui s'échangent beaucoup au regard de leur taille, information qu'aucun
     * des deux nombres ne donne seul.
     */
    const byTurnover = [...assets]
      .filter((asset) => (asset.marketCap ?? 0) > 0 && (asset.volume24h ?? 0) > 0)
      .map((asset) => ({
        asset,
        ratio: ((asset.volume24h as number) / (asset.marketCap as number)) * 100,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, ROWS)

    return { gainers, losers, byVolume, byTurnover }
  }, [assets, field])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {scopeLabel ?? `Classements calculés sur les ${assets.length} plus grandes capitalisations.`}
        </p>

        {/* `ToggleGroup` de shadcn/ui — le contrôle segmenté du système, monté sur celui
            `ToggleGroup` de Radix. Il remplace quatre `<button aria-pressed>` que rien
            ne reliait entre eux : le groupe apporte les flèches directionnelles et
            l'annonce « option 2 sur 4 » à la synthèse vocale. */}
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          aria-label={t('Période des classements')}
          value={String(period)}
          onValueChange={(next) => {
            /* Radix n'a pas de `disallowEmptySelection` : recliquer l'option
               active rappelle avec la CHAÎNE VIDE. Ce réglage n'a pas d'état
               « aucun » — on ignore donc ce cas plutôt que de laisser le
               contrôle devenir muet sur une valeur qui, elle, n'a pas bougé. */
            if (next) setPeriod(next as Period)
          }}
        >
          {PERIODS.map((entry) => (
            <ToggleGroupItem key={entry.key} value={String(entry.key)} className="tabular">
              {entry.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Board
          title="Plus fortes hausses"
          hint={meta.long}
          assets={boards.gainers}
          field={field}
          periodLabel={meta.long}
          detail={{ type: 'hausses', period }}
        />
        <Board
          title="Plus fortes baisses"
          hint={meta.long}
          assets={boards.losers}
          field={field}
          periodLabel={meta.long}
          detail={{ type: 'baisses', period }}
        />
        <Board
          title={t('Volumes les plus élevés')}
          hint={t('sur 24 heures')}
          assets={boards.byVolume}
          field={field}
          periodLabel={meta.long}
          showVolume
          detail={{ type: 'volumes', period }}
        />
        <TurnoverBoard
          rows={boards.byTurnover}
          field={field}
          periodLabel={meta.long}
          period={period}
        />
      </div>
    </div>
  )
}

function Board({
  title,
  hint,
  assets,
  field,
  periodLabel,
  showVolume = false,
  detail,
}: {
  title: string
  hint: string
  assets: MarketAsset[]
  field: keyof MarketAsset
  periodLabel: string
  showVolume?: boolean
  /** Palmarès complet correspondant — omis, aucun lien n'est rendu. */
  detail?: { type: string; period: Period }
}) {
  const t = usePhrase()
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 truncate text-xl font-bold text-ink">{title}</h3>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-ink-muted">{hint}</span>
          {detail ? <RankingDetailLink type={detail.type} period={detail.period} /> : null}
        </span>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          title={t('Rien à classer')}
          description={t('Aucun actif ne remplit ce critère sur la période choisie.')}
          compact
        />
      ) : (
        <ol className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
          {assets.map((asset, index) => (
            <li key={asset.id}>
              <Link
                href={assetHref(asset.assetClass, asset.id)}
                /* `prefetch={false}` — liste dense : chaque ligne mène à un rendu serveur qui
                   interroge la source, sur le limiteur de la page en cours. Un clic au plus
                   sera fait. Voir OPTIMISATION.md, section « Réseau ». */
                prefetch={false}
                className="group flex items-center gap-2.5 rounded-sm px-3 py-2.5 transition-colors hover:bg-surface-muted/60"
              >
                <span className="tabular w-4 shrink-0 text-xs text-ink-muted">{index + 1}</span>
                <AssetLogo asset={asset} size={22} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-brand">
                  {asset.name}
                  <span className="ml-1.5 text-xs uppercase text-ink-muted">{asset.symbol}</span>
                </span>

                {asset.sparkline7d ? (
                  <span className="hidden shrink-0 sm:block">
                    <Sparkline values={asset.sparkline7d} label={`Évolution de ${asset.name}`} />
                  </span>
                ) : null}

                <span className="tabular w-24 shrink-0 text-right text-xs text-ink">
                  {showVolume ? (
                    <Money value={asset.volume24h} from={asset.currency} compact />
                  ) : (
                    /*
                      `asRate` SUR LES DEVISES, sinon la colonne entière affiche « 1,00 € ».

                      Le « prix » d'une paire de change est un TAUX — combien d'unités de
                      la contrepartie pour une unité de base — et non un montant dans une
                      devise. Formaté comme un montant, EUR/CHF vaut donc un euro, EUR/USD
                      aussi, et les huit lignes du classement affichent le même nombre.

                      Le défaut ne pouvait pas se voir tant que ce tableau ne servait que
                      la crypto. Il est apparu au premier classement de devises, et de la
                      pire manière : une colonne parfaitement formatée, parfaitement
                      alignée, et vide de sens. `AssetRow` fait déjà ce test — c'est le
                      même, écrit au même endroit du rendu.
                    */
                    <Money
                      value={asset.price}
                      from={asset.currency}
                      asRate={asset.assetClass === 'forex'}
                    />
                  )}
                </span>

                <span className="w-20 shrink-0 text-right">
                  <ChangeBadge
                    value={asset[field] as number | undefined}
                    periodLabel={periodLabel}
                    size="sm"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function TurnoverBoard({
  rows,
  field,
  periodLabel,
  period,
}: {
  rows: { asset: MarketAsset; ratio: number }[]
  field: keyof MarketAsset
  periodLabel: string
  period: Period
}) {
  const t = usePhrase()
  return (
    <section className="space-y-3" aria-label={t('Rotation la plus forte')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 truncate text-xl font-bold text-ink">{t('Rotation la plus forte')}</h3>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-ink-muted">volume / capitalisation</span>
          <RankingDetailLink type="rotation" period={period} />
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('Rien à classer')} compact />
      ) : (
        <ol className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
          {rows.map((row, index) => (
            <li key={row.asset.id}>
              <Link
                href={assetHref(row.asset.assetClass, row.asset.id)}
                className="group flex items-center gap-2.5 rounded-sm px-3 py-2.5 transition-colors hover:bg-surface-muted/60"
              >
                <span className="tabular w-4 shrink-0 text-xs text-ink-muted">{index + 1}</span>
                <AssetLogo asset={row.asset} size={22} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-brand">
                  {row.asset.name}
                </span>
                <span className="tabular w-16 shrink-0 text-right text-xs font-medium text-ink">
                  {row.ratio.toFixed(0)} %
                </span>
                <span className="w-20 shrink-0 text-right">
                  <ChangeBadge
                    value={row.asset[field] as number | undefined}
                    periodLabel={periodLabel}
                    size="sm"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
