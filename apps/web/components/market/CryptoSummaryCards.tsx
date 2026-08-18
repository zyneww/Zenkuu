import { Link } from '@/i18n/navigation'

import type {
  DataResult,
  GlobalMarketStats,
  MarketAsset,
  SentimentIndex,
  TrendingAsset,
} from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { classify } from '@/components/home/SidePanels'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'
import { getContent } from '@/lib/content'
import { getPhrase } from '@/lib/content'

/**
 * Bandeau de trois cartes au-dessus du classement.
 *
 * Disposition reprise de la référence : une colonne « état du marché » à gauche
 * (deux cartes empilées), les tendances au centre, les meilleures performances à
 * droite. Le lecteur situe le marché avant de lire une seule ligne du tableau.
 *
 * CHAQUE CARTE DISPARAÎT INDÉPENDAMMENT si sa source échoue. C'est la traduction du
 * §5 en mise en page : une carte vide ou remplie de tirets occuperait la place sans
 * rien dire, alors qu'une grille à deux colonnes reste parfaitement lisible.
 */
export function CryptoSummaryCards({
  stats,
  sentiment,
  trending,
  gainers,
}: {
  stats: DataResult<GlobalMarketStats>
  sentiment: DataResult<SentimentIndex>
  trending: DataResult<TrendingAsset[]>
  gainers: MarketAsset[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4">
        {stats.ok ? <GlobalCapCard stats={stats.data} /> : null}
        {sentiment.ok ? <SentimentCard sentiment={sentiment.data} /> : null}
      </div>

      {trending.ok && trending.data.length > 0 ? (
        <TrendingCard assets={trending.data.slice(0, 3)} />
      ) : null}

      {gainers.length > 0 ? <GainersCard assets={gainers.slice(0, 3)} /> : null}
    </div>
  )
}

function CardShell({
  title,
  badge,
  href,
  children,
}: {
  title: string
  badge?: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-border-subtle bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          {href ? (
            /* `inline-flex` pour que le plancher tactile de globals.css s'applique :
               `min-height` n'a aucun effet sur une boîte en ligne. L'alignement sur la
               ligne de base du bandeau est préservé — une boîte flexible en ligne expose
               la ligne de base de son premier élément, ici le titre lui-même. */
            <Link href={href} className="inline-flex items-center transition-colors hover:text-brand">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {badge ? <span className="text-xs text-ink-muted">{badge}</span> : null}
      </header>
      {children}
    </section>
  )
}

async function GlobalCapCard({ stats }: { stats: GlobalMarketStats }) {
  const t = await getPhrase()
  return (
    <CardShell title={t('Capitalisation boursière mondiale')} badge="24 h">
      <div className="flex items-end justify-between gap-3">
        <p className="tabular text-2xl font-semibold text-ink">
          <Money value={stats.totalMarketCap} from={stats.currency} compact />
        </p>
        <ChangeBadge value={stats.marketCapChange24h} size="sm" />
      </div>
    </CardShell>
  )
}

/**
 * Sentiment de marché, en barre plutôt qu'en cadran.
 *
 * La référence occupe cette place avec un « biais de trading » — une répartition
 * acheteurs/vendeurs qu'une place de marché lit dans son propre carnet d'ordres.
 * ZENKUU n'en a pas, et aucune source gratuite ne la publie : l'afficher
 * supposerait de l'inventer (§5). L'indice Fear & Greed occupe le même rôle — le
 * climat du marché en une jauge — avec une source réelle et citée.
 *
 * La valeur est répétée EN TEXTE sous la barre : une largeur ne se lit pas au
 * lecteur d'écran, et la couleur seule ne porte jamais l'information (§9).
 */
async function SentimentCard({ sentiment }: { sentiment: SentimentIndex }) {
  const t = await getPhrase()
  const fr = await getContent()
  const label = classify(sentiment.value, fr.sentiment.scale)
  const tone = sentiment.value < 45 ? 'text-down' : sentiment.value > 55 ? 'text-up' : 'text-ink'

  return (
    <CardShell title={t('Sentiment du marché')} badge="Fear &amp; Greed" href="/sentiment">
      <div
        className="h-2 overflow-hidden rounded-pill bg-surface-muted"
        role="img"
        aria-label={`${sentiment.value} sur 100 — ${label}`}
      >
        <div
          className="h-full rounded-pill bg-brand"
          style={{ width: `${Math.min(Math.max(sentiment.value, 0), 100)}%` }}
        />
      </div>

      <p className="mt-2 flex items-baseline gap-2">
        <span className="tabular text-lg font-semibold text-ink">{sentiment.value}</span>
        <span className={`text-sm font-medium ${tone}`}>{label}</span>
      </p>
    </CardShell>
  )
}

/**
 * Tendances — SANS PRIX, et c'est une contrainte de source assumée.
 *
 * L'endpoint des tendances ne cote qu'en dollars et ne publie ni capitalisation ni
 * volume. Recharger ces actifs par identifiant pour obtenir un prix coûterait un
 * appel réseau supplémentaire, dépensé ici pour trois lignes décoratives — on le
 * réserve à l'onglet « Tendance », où le tableau entier en dépend. La carte affiche
 * donc ce qui est réellement sourcé : le nom, le rang et la variation.
 */
function TrendingCard({ assets }: { assets: TrendingAsset[] }) {
  return (
    <CardShell title="Tendance" badge="24 h" href="/crypto?vue=tendance">
      <ul className="space-y-2.5">
        {assets.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between gap-3">
            <Link
              href={assetHref(asset.assetClass, asset.id)}
              className="flex min-w-0 items-center gap-2 hover:text-brand"
            >
              <AssetLogo asset={asset} size={20} />
              <span className="truncate text-sm text-ink">{asset.name}</span>
            </Link>
            <ChangeBadge value={asset.change24h} size="sm" />
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

async function GainersCard({ assets }: { assets: MarketAsset[] }) {
  const t = await getPhrase()
  return (
    <CardShell title={t('Les meilleures performances')} badge="24 h" href="/crypto?vue=gagnants">
      <ul className="space-y-2.5">
        {assets.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between gap-3">
            <Link
              href={assetHref(asset.assetClass, asset.id)}
              className="flex min-w-0 items-center gap-2 hover:text-brand"
            >
              <AssetLogo asset={asset} size={20} />
              <span className="truncate text-sm text-ink">{asset.name}</span>
            </Link>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="tabular text-xs text-ink-muted">
                <Money value={asset.price} from={asset.currency} />
              </span>
              <ChangeBadge value={asset.change24h} size="sm" />
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
