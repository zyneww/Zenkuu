import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  CACHE_TTL_SECONDS,
  MOVERS_PERIODS,
  getMoversUniverse,
  type MarketAsset,
  type MoversPeriod,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { RankingDetailTable } from '@/components/market/RankingDetailTable'
import { PERIOD_LABELS } from '@/content/movers'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * CLASSEMENT COMPLET — la page derrière « Voir en détail ».
 *
 * ── QUATRE PALMARÈS, UNE SEULE ROUTE ─────────────────────────────────────────
 *
 * Hausses, baisses, volumes et rotation partagent tout : la même source, le même
 * univers, le même tableau, la même pagination. Seuls changent le tri et le titre.
 * Écrire quatre pages garantirait qu'elles divergent au premier correctif — c'est
 * exactement le raisonnement qui a produit `MarketPageView` pour les six classes.
 *
 * ── LA PÉRIODE EST DANS L'URL, LE DÉCOUPAGE NE L'EST PAS ─────────────────────
 *
 * `?periode=` change ce qu'on trie, donc ce que la page CONTIENT : elle doit voyager
 * dans l'adresse, être partageable et indexable. Le numéro de page, lui, ne change que
 * ce qu'on regarde d'un contenu déjà chargé — le faire voyager coûterait un
 * aller-retour serveur pour découper un tableau qu'on a déjà en main.
 */

type RankingType = 'hausses' | 'baisses' | 'volumes' | 'rotation'

/*
 * LES PÉRIODES VIENNENT DE `MOVERS_PERIODS`, ET NE SONT PAS RÉÉCRITES ICI.
 *
 * Une première version en déclarait quatre — 1 h, 24 h, 7 j, 30 j — alors que la
 * source et les filtres de `/crypto/mouvements` en proposent six. Le défaut n'aurait
 * pas planté : un lien « Voir en détail » parti d'un classement sur 14 jours serait
 * simplement retombé sur 24 heures, en silence, avec un titre qui affirme la mauvaise
 * période. C'est exactement le genre d'écart qu'une liste parallèle finit toujours
 * par produire.
 *
 * `PERIOD_LABELS` vient de `content/movers.ts`, où vivent déjà les libellés des
 * filtres : une seconde traduction des mêmes six clés divergerait de la même façon.
 */
const PERIOD_FIELD: Record<MoversPeriod, keyof MarketAsset> = {
  '1h': 'change1h',
  '24h': 'change24h',
  '7d': 'change7d',
  '14d': 'change14d',
  '30d': 'change30d',
  '1y': 'change1y',
}

const RANKINGS: Record<
  RankingType,
  { title: string; lead: string; metric: 'price' | 'volume' | 'turnover' }
> = {
  hausses: {
    title: 'Plus fortes hausses',
    lead: 'Les actifs qui progressent le plus sur la période, du plus fort au moins fort.',
    metric: 'volume',
  },
  baisses: {
    title: 'Plus fortes baisses',
    lead: 'Les actifs qui reculent le plus sur la période, du plus fort recul au moins fort.',
    metric: 'volume',
  },
  volumes: {
    title: 'Volumes les plus élevés',
    lead: 'Ce qui s’échange le plus sur 24 heures, quelle que soit la direction du cours.',
    metric: 'volume',
  },
  rotation: {
    title: 'Rotation la plus forte',
    lead: 'Le volume rapporté à la capitalisation — ce qui tourne vite au regard de sa taille.',
    metric: 'turnover',
  },
}

function isRankingType(value: string): value is RankingType {
  return value in RANKINGS
}

function readPeriod(raw: string | string[] | undefined): MoversPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw
  return MOVERS_PERIODS.includes(value as MoversPeriod) ? (value as MoversPeriod) : '24h'
}

interface RouteParams {
  params: Promise<{ type: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { type } = await params
  if (!isRankingType(type)) return { title: 'Classement introuvable' }

  const entry = RANKINGS[type]
  return {
    title: `${entry.title} — classement complet`,
    description: entry.lead,
    alternates: { canonical: `/crypto/classement/${type}` },
  }
}

/**
 * Pré-rend les quatre classements.
 *
 * Sans cette fonction, `[type]` reste un segment dynamique et chaque ouverture rend la
 * page à la demande — pour quatre variantes connues d'avance, dont trois lisent
 * exactement la même réponse en cache.
 */
export function generateStaticParams() {
  return Object.keys(RANKINGS).map((type) => ({ type }))
}

export default async function Page({ params, searchParams }: RouteParams) {
  const { type } = await params

  // Un type inconnu vient de l'URL, saisissable à la main : c'est un 404 franc et non
  // un encadré d'erreur — rien ne justifie de garder l'adresse dans un index.
  if (!isRankingType(type)) notFound()

  const period = readPeriod((await searchParams)['periode'])
  const field = PERIOD_FIELD[period]
  const label = `sur ${PERIOD_LABELS[period]}`
  const entry = RANKINGS[type]

  const result = await getMoversUniverse(250, 'eur')
  const universe = result.ok ? result.data : []

  const rows = rank(universe, type, field)

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-xs text-ink-muted">
        <Link href="/crypto/all-coins" className="transition-colors hover:text-ink">
          Classements crypto
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{entry.title}</span>
      </nav>

      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{entry.title}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{entry.lead}</p>
      </header>

      {/* Le sélecteur de période est fait de LIENS, pas de boutons : chaque période
          est une URL à part entière, et le classement sur 7 jours mérite d'être
          partageable sans que le destinataire ait à re-cliquer. La rotation et les
          volumes ne s'en servent pas — ils ne trient pas sur une variation. */}
      {type === 'hausses' || type === 'baisses' ? (
        <nav aria-label="Période" className="flex flex-wrap items-center gap-1">
          {MOVERS_PERIODS.map((key) => (
            <Link
              key={key}
              href={`/crypto/classement/${type}?periode=${key}`}
              aria-current={key === period ? 'page' : undefined}
              className={`tabular rounded-control px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                key === period
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {PERIOD_LABELS[key]}
            </Link>
          ))}
        </nav>
      ) : null}

      {rows.length > 0 ? (
        <>
          <RankingDetailTable
            assets={rows}
            field={field}
            periodLabel={label}
            metric={entry.metric}
          />

          <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
            Périmètre borné aux 250 plus grandes capitalisations, et ce n’est pas une limite
            technique : sur un jeton minuscule, un seul échange déplace le cours de dizaines
            de points. Un classement non borné ne remonterait que ce bruit.
          </p>

          {result.ok ? (
            <SourceNote
              label={result.source.label}
              href={result.source.attributionUrl}
              updatedAt={rows[0]?.lastUpdated}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          title="Rien à classer"
          description={
            result.ok
              ? `Aucun actif ne remplit ce critère ${label}.`
              : result.reason
          }
          source={result.source?.label ?? null}
          tone={result.ok ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}

/**
 * Tri du palmarès demandé.
 *
 * Le FILTRAGE PAR SIGNE des hausses et des baisses n'est pas cosmétique : sans lui,
 * « plus fortes baisses » se remplirait d'actifs en hausse les jours où tout monte —
 * les moins bons d'un marché haussier ne sont pas des baisses. C'est la même règle que
 * partout ailleurs sur le site.
 */
function rank(universe: MarketAsset[], type: RankingType, field: keyof MarketAsset): MarketAsset[] {
  if (type === 'volumes') {
    return [...universe]
      .filter((asset) => (asset.volume24h ?? 0) > 0)
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
  }

  if (type === 'rotation') {
    return [...universe]
      .filter((asset) => (asset.marketCap ?? 0) > 0 && (asset.volume24h ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.volume24h as number) / (b.marketCap as number) -
          (a.volume24h as number) / (a.marketCap as number),
      )
  }

  const rated = universe.filter((asset) => typeof asset[field] === 'number')

  if (type === 'hausses') {
    return rated
      .filter((asset) => (asset[field] as number) > 0)
      .sort((a, b) => (b[field] as number) - (a[field] as number))
  }

  return rated
    .filter((asset) => (asset[field] as number) < 0)
    .sort((a, b) => (a[field] as number) - (b[field] as number))
}
