'use client'

import { TrendingUp } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { monogram } from '@/components/asset/monogram'
import { useContent } from '@/components/locale/ContentProvider'
import { assetHref } from '@/lib/asset-routes'
import type { useAssetSearch } from '@/components/search/useAssetSearch'

/**
 * Corps de résultats, PARTAGÉ par le champ de l'en-tête et la fenêtre de recherche.
 *
 * Il ne porte aucune décision : ni l'ouverture, ni la position, ni le cadre. Il reçoit
 * l'état renvoyé par `useAssetSearch` et le met en forme. C'est ce qui permet aux deux
 * surfaces d'afficher exactement la même chose — y compris les cas que l'on oublie
 * toujours dans une copie : recherche en cours, aucun résultat, source crypto saturée.
 *
 * ── LES QUATRE ÉTATS, DANS L'ORDRE OÙ ILS SE PRÉSENTENT ───────────────────────
 *
 *   1. saisie trop courte  → tendances
 *   2. requête en vol      → « recherche en cours »
 *   3. résultats           → crypto d'abord, puis les autres classes
 *   4. rien                → message nommant la requête, ou panne de la source
 *
 * L'ordre compte : tester « aucun résultat » avant « en cours » ferait clignoter le
 * message d'absence à chaque frappe.
 */
export function SearchResults({
  search,
  onNavigate,
}: {
  search: ReturnType<typeof useAssetSearch>
  onNavigate: () => void
}) {
  const fr = useContent()
  const { results, loading, trending, showTrending, found, query } = search

  if (showTrending) {
    return (
      <Section
        title={fr.search.trendingTitle}
        hint={fr.search.trendingHint}
        icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
      >
        {trending.length > 0 ? (
          trending.map((asset) => (
            <ResultRow
              key={asset.id}
              href={assetHref(asset.assetClass, asset.id)}
              name={asset.name}
              symbol={asset.symbol}
              image={asset.image}
              rank={asset.rank}
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <p className="px-3 py-4 text-xs text-ink-muted">{fr.search.trendingEmpty}</p>
        )}
      </Section>
    )
  }

  if (loading && !results) {
    return <p className="px-3 py-6 text-center text-xs text-ink-muted">{fr.search.loading}</p>
  }

  if (found.length > 0 && results) {
    return (
      <>
        {results.crypto.length > 0 ? (
          <Section title={fr.assetClass.crypto}>
            {results.crypto.map((item) => (
              <ResultRow
                key={`c-${item.id}`}
                href={assetHref(item.assetClass, item.id)}
                name={item.name}
                symbol={item.symbol}
                image={item.image}
                rank={item.rank}
                onNavigate={onNavigate}
              />
            ))}
          </Section>
        ) : null}

        {results.autres.length > 0 ? (
          <Section title={fr.search.otherAssets}>
            {results.autres.map((item) => (
              <ResultRow
                key={`a-${item.id}`}
                href={assetHref(item.assetClass, item.id)}
                name={item.name}
                symbol={item.symbol}
                badge={fr.assetClass[item.assetClass]}
                onNavigate={onNavigate}
              />
            ))}
          </Section>
        ) : null}

        {/* Panne de la source crypto : on le dit au lieu de laisser croire qu'aucune
            cryptomonnaie ne correspond à la recherche (§5). */}
        {results.cryptoIndisponible ? (
          <p className="px-3 py-2 text-[0.6875rem] text-ink-muted">{fr.search.cryptoUnavailable}</p>
        ) : null}
      </>
    )
  }

  return (
    <p className="px-3 py-6 text-center text-xs text-ink-muted">
      {results?.cryptoIndisponible ? fr.search.cryptoUnavailable : fr.search.noResult(query)}
    </p>
  )
}

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string
  hint?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mb-1 last:mb-0">
      <h2 className="flex items-center gap-1.5 px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {title}
        {hint ? <span className="font-normal normal-case tracking-normal">· {hint}</span> : null}
      </h2>
      <ul>{children}</ul>
    </section>
  )
}

function ResultRow({
  href,
  name,
  symbol,
  image,
  rank,
  badge,
  onNavigate,
}: {
  href: string
  name: string
  symbol: string
  image?: string
  rank?: number
  badge?: string
  onNavigate: () => void
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        /* `rounded-control` et non `rounded-card` : ces lignes s'aboutent et se
           parcourent, elles ne se prennent pas une par une. Voir la doctrine des deux
           familles de rayons dans globals.css. */
        className="flex items-center gap-3 rounded-control px-3 py-2 transition-colors hover:bg-surface-muted"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- vignettes 22px hors domaines optimisés
          <img
            src={image}
            alt=""
            width={22}
            height={22}
            className="shrink-0 rounded-pill"
            loading="lazy"
          />
        ) : (
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-pill bg-brand-soft text-[0.5625rem] font-bold text-brand-strong"
            aria-hidden="true"
          >
            {monogram(name, symbol)}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
        <span className="shrink-0 text-xs uppercase text-ink-muted">{symbol}</span>

        {rank !== undefined ? (
          <span className="tabular shrink-0 text-[0.6875rem] text-ink-muted">#{rank}</span>
        ) : badge ? (
          <span className="shrink-0 rounded-control bg-surface-muted px-1.5 py-0.5 text-[0.625rem] text-ink-muted">
            {badge}
          </span>
        ) : null}
      </Link>
    </li>
  )
}
