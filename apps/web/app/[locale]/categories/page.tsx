import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import {
  CACHE_TTL_SECONDS,
  CATEGORY_RANKING_FLOOR_USD,
  getCategories,
  getCryptoGlobalStats,
  type MarketCategory,
} from '@zenkuu/data'
import { ChangeBadge, EmptyState, SourceNote } from '@zenkuu/ui'

import { CategoryExplorer } from '@/components/categories/CategoryExplorer'
import { CategorySpotlight } from '@/components/categories/CategorySpotlight'
import { Money } from '@/components/locale/Money'
import { SectorHighlights } from '@/components/categories/SectorHighlights'
import { getContent } from '@/lib/content'
import { getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  title: fr.pages.categories,
  description: fr.categories.subtitle,
  alternates: { canonical: '/categories' },
  }
}

/**
 * Secteurs et narratifs de marché.
 *
 * TOUTES les catégories publiées par la source — environ 750, contre douze
 * auparavant. Ce n'est pas un changement de volume mais de nature : la source les
 * livre dans un SEUL appel sans pagination, si bien que la limite précédente coûtait
 * exactement le même appel réseau tout en jetant 98 % du contenu.
 *
 * Disposition VOLONTAIREMENT DIFFÉRENTE de la référence du secteur, qui empile un
 * titre centré, trois onglets, quatre cartes à courbes, puis un tableau. Ici les
 * quatre cartes deviennent une bande de mise en avant NOMMÉE (« plus fortes hausses »
 * plutôt qu'un palmarès sans règle énoncée), les onglets disparaissent au profit d'un
 * tri réversible sur le tableau lui-même, et le tableau porte les logos des
 * principaux actifs en LIENS vers leurs fiches.
 *
 * ⚠️ LA CAPITALISATION TOTALE N'EST PAS UNE SOMME. La référence affiche « la
 * capitalisation des catégories est de 6,26 T$ », obtenue en additionnant ses
 * secteurs. C'est un double comptage : un actif appartient à plusieurs catégories à
 * la fois — Bitcoin relève de « Layer 1 » comme de « Proof of Work ». On affiche donc
 * la capitalisation mondiale réelle, publiée par la source et dédupliquée par
 * construction, plutôt qu'un total gonflé (§5).
 */
export default async function CategoriesPage() {
  const t = await getPhrase()
  const fr = await getContent()
  const [categories, globalStats] = await Promise.all([
    getCategories(),
    getCryptoGlobalStats('eur'),
  ])

  if (!categories.ok || categories.data.length === 0) {
    return (
      <div className="space-y-10">
        <CategoriesHero categories={null} globalStats={null} />
        <EmptyState
          title={fr.states.unavailableTitle}
          description={categories.ok ? null : categories.reason}
          source={categories.source?.label ?? null}
        />
      </div>
    )
  }

  // Palmarès filtrés par le PLANCHER de capitalisation : sur une base de quelques
  // milliers de dollars, un seul échange déplace le pourcentage de dizaines de
  // points, et la tête du classement se remplit de bruit. Le tableau complet, lui,
  // n'est pas filtré — un annuaire doit être exhaustif.
  const rankable = categories.data.filter(
    (category) =>
      category.marketCapChange24h !== undefined &&
      (category.marketCap ?? 0) >= CATEGORY_RANKING_FLOOR_USD,
  )

  const gainers = [...rankable]
    .filter((category) => (category.marketCapChange24h ?? 0) > 0)
    .sort((a, b) => (b.marketCapChange24h ?? 0) - (a.marketCapChange24h ?? 0))
    .slice(0, 4)

  return (
    <div className="space-y-12 sm:space-y-16">
      <CategoriesHero
        categories={categories.data}
        globalStats={globalStats.ok ? globalStats.data : null}
      />

      <CategorySpotlight
        title={t('Secteurs en forte hausse')}
        hint={t('Les quatre plus fortes progressions sur 24 heures, parmi les secteurs pesant au moins 10 M$.')}
        categories={gainers}
      />

      <SectorHighlights categories={rankable} />

      <CategoryExplorer categories={categories.data} />

      <MethodologyBand />

      {/* La source ne publie ces agrégats qu'en dollars : on l'écrit plutôt que
          de convertir nous-mêmes vers l'euro (§5). */}
      <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={`${categories.source.label} · montants en USD`}
        href={categories.source.attributionUrl}
      />
    </div>
  )
}

/**
 * Bande de tête.
 *
 * Les repères sont des DÉNOMBREMENTS, jamais des sommes — un même actif appartient à
 * plusieurs secteurs, et additionner leurs capitalisations le compterait deux fois.
 * Seule exception : la capitalisation mondiale, qui ne vient PAS des catégories mais
 * de l'agrégat global de la source, dédupliqué par construction. Elle est donc juste,
 * et c'est pourquoi elle est la seule valeur monétaire de ce bandeau.
 */
async function CategoriesHero({
  categories,
  globalStats,
}: {
  categories: MarketCategory[] | null
  globalStats: { totalMarketCap: number; marketCapChange24h: number; currency: string } | null
}) {
  const t = await getPhrase()
  const fr = await getContent()
  const rated = (categories ?? []).filter((category) => category.marketCapChange24h !== undefined)
  const rising = rated.filter((category) => (category.marketCapChange24h ?? 0) > 0).length

  return (
    <header className="border-b border-border-subtle pb-10">
      <div className="max-w-3xl space-y-4">
        <h1 className="display-mega text-ink">{fr.categories.title}</h1>
        <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
          {fr.categories.subtitle}
        </p>
      </div>

      {categories && rated.length > 0 ? (
        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-5">
          <HeroStat label={t('Secteurs suivis')} value={String(categories.length)} />
          <HeroStat label={t('En hausse sur 24 h')} value={String(rising)} tone="up" />
          <HeroStat label={t('En repli sur 24 h')} value={String(rated.length - rising)} tone="down" />

          {globalStats ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                {t('Capitalisation mondiale')}
              </dt>
              <dd className="mt-1 flex items-baseline gap-2">
                <span className="tabular text-3xl font-semibold text-ink">
                  <Money
                    value={globalStats.totalMarketCap}
                    from={globalStats.currency}
                    compact
                  />
                </span>
                <ChangeBadge value={globalStats.marketCapChange24h} size="sm" />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </header>
  )
}

async function HeroStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'up' | 'down'
}) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'

  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className={`tabular mt-1 text-3xl font-semibold ${color}`}>{value}</dd>
    </div>
  )
}

/**
 * Bande de clôture : renvoi méthodologique.
 *
 * Elle occupe la place qu'une bande promotionnelle tiendrait sur une page de
 * plateforme d'échange. Le rythme visuel est le même — fond contrasté, titre de
 * bande, deux actions — mais le contenu renvoie à ce qui engage ZENKUU plutôt
 * qu'à une inscription.
 */
async function MethodologyBand() {
  const t = await getPhrase()
  return (
    <section
      className="rounded-lg bg-surface-muted p-6 sm:p-10"
      aria-labelledby="categories-methodologie"
    >
      <div className="max-w-2xl space-y-3">
        <h2 id="categories-methodologie" className="display-md text-ink">{t('D’où viennent ces secteurs ?')}</h2>
        <p className="text-sm leading-relaxed text-ink-muted">{t('Les catégories ne sont pas définies par ZENKUU : elles proviennent telles quelles de la source de données, qui décide seule du rattachement d’un actif à un secteur. Un même actif peut relever de plusieurs d’entre eux, si bien que les capitalisations par secteur ne s’additionnent pas — la capitalisation mondiale affichée plus haut est celle que publie la source, et non la somme de ce tableau.')}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/methodologie"
          className="rounded-control bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
        >{t('Méthodologie & sources')}</Link>
        <Link
          href="/apprendre"
          className="rounded-control border border-border-subtle bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand"
        >{t('Apprendre à lire ces chiffres')}</Link>
      </div>
    </section>
  )
}
